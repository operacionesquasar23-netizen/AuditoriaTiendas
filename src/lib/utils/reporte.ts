import { supabase } from "@/lib/supabase/client";
import { traerTodasLasFilas, obtenerElementosExtra, type ElementoExtra } from "./auditor";
import { nombreElemento } from "./formatoElemento";
import type { Auditoria, Catalogo, ElementoCatalogo } from "@/lib/supabase/types";

export interface ElementoReporte {
  clasificacion: string;
  tipo: string;
  cod_campana: string;
  cliente: string;
  marca: string;
  categoria: string;
  estado_actual: string;
  estado_hook: string;
  observaciones: string;
  foto_url: string | null;
  auditor_nombre: string;
  fecha_auditoria: string;
}

export interface DatosReporteTienda {
  tienda: string;
  cadena: string;
  ciudad: string;
  auditores: string[];
  fechaReporte: string;
  totalElementos: number;
  elementos: ElementoReporte[];
  elementosExtra: ElementoExtra[];
}

function construirFila(
  elemento: ElementoCatalogo,
  auditoria: Auditoria | null
): ElementoReporte {
  return {
    clasificacion: elemento.clasificacion || "Otros",
    tipo: nombreElemento(elemento),
    cod_campana: elemento.cod_campana || "",
    cliente: elemento.cliente || "",
    marca: elemento.marca || "",
    categoria: elemento.categoria || "",
    estado_actual: auditoria?.estado_actual ?? "Pendiente",
    estado_hook: auditoria?.estado_hook ?? "",
    observaciones: auditoria?.observaciones || "",
    foto_url: auditoria?.foto_url ?? null,
    auditor_nombre: auditoria?.auditor_nombre || "",
    fecha_auditoria: auditoria?.fecha_auditoria || "",
  };
}

/**
 * Trae los elementos YA AUDITADOS de una tienda (los pendientes no entran
 * al reporte), listos para armar el PDF: foto real subida por el auditor,
 * respuestas del checklist y observaciones. También trae los elementos
 * no listados (encontrados en tienda pero fuera del catálogo original).
 */
export async function obtenerDatosReporteTienda(
  catalogoId: string,
  tienda: string
): Promise<DatosReporteTienda> {
  const elementos = await traerTodasLasFilas<ElementoCatalogo>((desde, hasta) =>
    supabase
      .from("elementos_catalogo")
      .select("*")
      .eq("catalogo_id", catalogoId)
      .eq("tienda", tienda)
      .range(desde, hasta)
  );

  const idsElementos = elementos.map((el) => el.id);
  let auditorias: Auditoria[] = [];
  if (idsElementos.length > 0) {
    auditorias = await traerTodasLasFilas<Auditoria>((desde, hasta) =>
      supabase
        .from("auditorias")
        .select("*")
        .in("elemento_id", idsElementos)
        .order("fecha_auditoria", { ascending: false })
        .range(desde, hasta)
    );
  }

  const ultimaPorElemento = new Map<string, Auditoria>();
  for (const auditoria of auditorias) {
    if (!ultimaPorElemento.has(auditoria.elemento_id)) {
      ultimaPorElemento.set(auditoria.elemento_id, auditoria);
    }
  }

  const elementosReporte: ElementoReporte[] = [];
  const auditoresSet = new Set<string>();
  let fechaMasReciente = "";

  for (const elemento of elementos) {
    const auditoria = ultimaPorElemento.get(elemento.id);
    if (!auditoria) continue; // solo auditados

    if (auditoria.auditor_nombre) auditoresSet.add(auditoria.auditor_nombre);
    if (auditoria.fecha_auditoria > fechaMasReciente) {
      fechaMasReciente = auditoria.fecha_auditoria;
    }

    elementosReporte.push(construirFila(elemento, auditoria));
  }

  const elementosExtra = await obtenerElementosExtra(catalogoId, tienda);
  for (const extra of elementosExtra) {
    if (extra.auditor_nombre) auditoresSet.add(extra.auditor_nombre);
    if (extra.fecha > fechaMasReciente) {
      fechaMasReciente = extra.fecha;
    }
  }

  return {
    tienda,
    cadena: elementos[0]?.cadena || "",
    ciudad: elementos[0]?.ciudad || "",
    auditores: Array.from(auditoresSet),
    fechaReporte: fechaMasReciente,
    totalElementos: elementosReporte.length,
    elementos: elementosReporte,
    elementosExtra,
  };
}

/** Lista de tiendas únicas across TODOS los catálogos (activo y archivados). */
/**
 * Lista de tiendas únicas across TODOS los catálogos (activo y archivados),
 * filtrando solo cadenas Plaza Vea y Vivanda — algunos catálogos viejos
 * (subidos antes de que existiera este filtro) pueden tener otras cadenas
 * (ej. Makro) y no deben aparecer en el buscador de Reportes.
 */
export async function obtenerTodasLasTiendas(): Promise<string[]> {
  const filas = await traerTodasLasFilas<{ tienda: string; cadena: string | null }>(
    (desde, hasta) =>
      supabase.from("elementos_catalogo").select("tienda, cadena").range(desde, hasta)
  );
  const cadenasPermitidas = new Set(["PLAZA VEA", "VIVANDA"]);
  const tiendas = new Set(
    filas
      .filter((f) => f.cadena && cadenasPermitidas.has(f.cadena.trim().toUpperCase()))
      .map((f) => f.tienda)
  );
  return Array.from(tiendas).sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Catálogos (con fecha y estado activo/archivado) en los que aparece una
 * tienda dada, más recientes primero. Permite ver el historial completo de
 * cargas para esa tienda, no solo el catálogo activo.
 */
export async function obtenerCatalogosParaTienda(tienda: string): Promise<Catalogo[]> {
  const filas = await traerTodasLasFilas<{ catalogo_id: string }>((desde, hasta) =>
    supabase
      .from("elementos_catalogo")
      .select("catalogo_id")
      .eq("tienda", tienda)
      .range(desde, hasta)
  );
  const idsCatalogo = Array.from(new Set(filas.map((f) => f.catalogo_id)));
  if (idsCatalogo.length === 0) return [];

  const { data, error } = await supabase
    .from("catalogos")
    .select("*")
    .in("id", idsCatalogo)
    .order("fecha_carga", { ascending: false });

  if (error) {
    throw new Error(`No se pudo obtener los catálogos de la tienda: ${error.message}`);
  }

  return data as Catalogo[];
}
