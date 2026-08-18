import { supabase } from "@/lib/supabase/client";
import type {
  Auditoria,
  ElementoCatalogo,
  EstadoActual,
  EstadoHook,
} from "@/lib/supabase/types";

export interface ElementoConEstado extends ElementoCatalogo {
  ultimaAuditoria: Auditoria | null;
}

const TAMANO_PAGINA = 1000; // límite por defecto de filas que devuelve Supabase/PostgREST

/**
 * Trae TODAS las filas de una consulta, paginando de a `TAMANO_PAGINA`.
 * Supabase (PostgREST) limita cada respuesta a 1000 filas por defecto;
 * sin esto, catálogos con más de 1000 elementos pierden datos silenciosamente
 * (por ejemplo, tiendas enteras desaparecen de la lista).
 */
export async function traerTodasLasFilas<T>(
  construirConsulta: (
    desde: number,
    hasta: number
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>
): Promise<T[]> {
  const resultado: T[] = [];
  let desde = 0;

  while (true) {
    const hasta = desde + TAMANO_PAGINA - 1;
    const { data, error } = await construirConsulta(desde, hasta);

    if (error) {
      throw new Error(error.message);
    }

    const pagina = data ?? [];
    resultado.push(...pagina);

    if (pagina.length < TAMANO_PAGINA) break; // última página
    desde += TAMANO_PAGINA;
  }

  return resultado;
}

/** Devuelve el id y nombre del catálogo actualmente activo (o null si no hay ninguno). */
export async function obtenerCatalogoActivo(): Promise<{
  id: string;
  nombre: string;
} | null> {
  const { data, error } = await supabase
    .from("catalogos")
    .select("id, nombre")
    .eq("activo", true)
    .maybeSingle<{ id: string; nombre: string }>();

  if (error) {
    throw new Error(`No se pudo obtener el catálogo activo: ${error.message}`);
  }

  return data;
}

/** Lista de tiendas únicas dentro del catálogo activo, ordenadas alfabéticamente. */
export async function obtenerTiendas(catalogoId: string): Promise<string[]> {
  let filas: { tienda: string }[];
  try {
    filas = await traerTodasLasFilas<{ tienda: string }>((desde, hasta) =>
      supabase
        .from("elementos_catalogo")
        .select("tienda")
        .eq("catalogo_id", catalogoId)
        .range(desde, hasta)
    );
  } catch (err) {
    throw new Error(
      `No se pudo obtener la lista de tiendas: ${err instanceof Error ? err.message : err}`
    );
  }

  const tiendas = new Set(filas.map((fila) => fila.tienda));
  return Array.from(tiendas).sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Elementos de una tienda dentro del catálogo activo, cada uno con su
 * auditoría más reciente (o null si nunca fue auditado). Como las
 * auditorías son append-only, "más reciente" define si el elemento
 * aparece como pendiente o auditado.
 */
export async function obtenerElementosTienda(
  catalogoId: string,
  tienda: string
): Promise<ElementoConEstado[]> {
  let listaElementos: ElementoCatalogo[];
  try {
    listaElementos = await traerTodasLasFilas<ElementoCatalogo>((desde, hasta) =>
      supabase
        .from("elementos_catalogo")
        .select("*")
        .eq("catalogo_id", catalogoId)
        .eq("tienda", tienda)
        .range(desde, hasta)
    );
  } catch (err) {
    throw new Error(
      `No se pudo obtener los elementos de la tienda: ${err instanceof Error ? err.message : err}`
    );
  }

  const idsElementos = listaElementos.map((el) => el.id);
  if (idsElementos.length === 0) return [];

  let auditorias: Auditoria[];
  try {
    auditorias = await traerTodasLasFilas<Auditoria>((desde, hasta) =>
      supabase
        .from("auditorias")
        .select("*")
        .in("elemento_id", idsElementos)
        .order("fecha_auditoria", { ascending: false })
        .range(desde, hasta)
    );
  } catch (err) {
    throw new Error(
      `No se pudo obtener las auditorías previas: ${err instanceof Error ? err.message : err}`
    );
  }

  // Como vienen ordenadas por fecha descendente, la primera que encontremos
  // por elemento_id es la más reciente.
  const ultimaPorElemento = new Map<string, Auditoria>();
  for (const auditoria of auditorias) {
    if (!ultimaPorElemento.has(auditoria.elemento_id)) {
      ultimaPorElemento.set(auditoria.elemento_id, auditoria);
    }
  }

  return listaElementos.map((elemento) => ({
    ...elemento,
    ultimaAuditoria: ultimaPorElemento.get(elemento.id) ?? null,
  }));
}

/** Sube la foto al bucket público `auditoria-fotos` y devuelve su URL pública. */
export async function subirFotoAuditoria(
  file: File,
  tienda: string,
  elementoId: string,
  indice: number = 1
): Promise<string> {
  const extension = file.name.split(".").pop() || "jpg";
  const ruta = `${tienda.replace(/[^a-zA-Z0-9-_]/g, "_")}/${elementoId}-${indice}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from("auditoria-fotos")
    .upload(ruta, file, { upsert: false });

  if (error) {
    throw new Error(`No se pudo subir la foto: ${error.message}`);
  }

  const { data } = supabase.storage.from("auditoria-fotos").getPublicUrl(ruta);
  return data.publicUrl;
}

export interface DatosAuditoria {
  elementoId: string;
  catalogoId: string;
  estadoActual: EstadoActual;
  estadoHook: EstadoHook;
  observaciones: string;
  fotoUrls: (string | null)[]; // hasta 3
  auditorNombre: string;
}

export async function registrarAuditoria(datos: DatosAuditoria): Promise<void> {
  const { error } = await supabase.from("auditorias").insert({
    elemento_id: datos.elementoId,
    catalogo_id: datos.catalogoId,
    estado_actual: datos.estadoActual,
    estado_hook: datos.estadoHook,
    observaciones: datos.observaciones || null,
    foto_url: datos.fotoUrls[0] ?? null,
    foto_url_2: datos.fotoUrls[1] ?? null,
    foto_url_3: datos.fotoUrls[2] ?? null,
    auditor_nombre: datos.auditorNombre,
  });

  if (error) {
    throw new Error(`No se pudo registrar la auditoría: ${error.message}`);
  }
}

export interface StaffTienda {
  operador: string | null;
  supervisor: string | null;
}

/** Operador y supervisor asignados a una tienda. */
export async function obtenerOperadorTienda(
  tienda: string
): Promise<StaffTienda | null> {
  const { data, error } = await supabase
    .from("staff_tienda")
    .select("operador, supervisor")
    .eq("tienda", tienda)
    .maybeSingle<StaffTienda>();

  if (error) {
    throw new Error(`No se pudo obtener el operador de la tienda: ${error.message}`);
  }

  return data;
}

export interface ElementoExtra {
  id: string;
  catalogo_id: string;
  tienda: string;
  nombre: string;
  foto_url: string | null;
  observaciones: string | null;
  auditor_nombre: string | null;
  fecha: string;
}

export async function obtenerElementosExtra(
  catalogoId: string,
  tienda: string
): Promise<ElementoExtra[]> {
  const { data, error } = await supabase
    .from("elementos_extra")
    .select("*")
    .eq("catalogo_id", catalogoId)
    .eq("tienda", tienda)
    .order("fecha", { ascending: false });

  if (error) {
    throw new Error(`No se pudo obtener los elementos no listados: ${error.message}`);
  }
  return data as ElementoExtra[];
}

export async function crearElementoExtra(datos: {
  catalogoId: string;
  tienda: string;
  nombre: string;
  fotoUrl: string | null;
  observaciones: string;
  auditorNombre: string;
}): Promise<void> {
  const { error } = await supabase.from("elementos_extra").insert({
    catalogo_id: datos.catalogoId,
    tienda: datos.tienda,
    nombre: datos.nombre,
    foto_url: datos.fotoUrl,
    observaciones: datos.observaciones || null,
    auditor_nombre: datos.auditorNombre,
  });

  if (error) {
    throw new Error(`No se pudo registrar el elemento: ${error.message}`);
  }
}