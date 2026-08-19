import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase/client";
import {
  traerTodasLasFilas,
  obtenerElementosExtra,
  obtenerElementosExtraCatalogo,
  type ElementoExtra,
} from "./auditor";
import { nombreElemento } from "./formatoElemento";
import type { Auditoria, Catalogo, ElementoCatalogo } from "@/lib/supabase/types";

interface FilaExport {
  Tienda: string;
  Clasificación: string;
  "Tipo de Elemento": string;
  "Cod Campaña": string;
  Cliente: string;
  Marca: string;
  Categoría: string;
  "Estado Actual": string;
  "Estado Hook": string;
  Observaciones: string;
  Auditor: string;
  Fecha: string;
  Foto: string;
  "Foto 2": string;
  "Foto 3": string;
}

function construirFila(
  elemento: ElementoCatalogo,
  auditoria: Auditoria | null
): FilaExport {
  return {
    Tienda: elemento.tienda,
    Clasificación: elemento.clasificacion ?? "",
    "Tipo de Elemento": nombreElemento(elemento),
    "Cod Campaña": elemento.cod_campana ?? "",
    Cliente: elemento.cliente ?? "",
    Marca: elemento.marca ?? "",
    Categoría: elemento.categoria ?? "",
    "Estado Actual": auditoria?.estado_actual ?? "Pendiente",
    "Estado Hook": auditoria?.estado_hook ?? "",
    Observaciones: auditoria?.observaciones ?? "",
    Auditor: auditoria?.auditor_nombre ?? "",
    Fecha: auditoria
      ? new Date(auditoria.fecha_auditoria).toLocaleString("es-PE")
      : "",
    Foto: auditoria?.foto_url ?? "",
    "Foto 2": auditoria?.foto_url_2 ?? "",
    "Foto 3": auditoria?.foto_url_3 ?? "",
  };
}

/** Elementos no listados: misma forma de fila, con columnas que no
 * aplican dejadas en blanco (no tienen cliente, marca, hook, etc.). */
function construirFilaExtra(extra: ElementoExtra): FilaExport {
  return {
    Tienda: extra.tienda,
    Clasificación: "No listado",
    "Tipo de Elemento": extra.nombre,
    "Cod Campaña": "",
    Cliente: "",
    Marca: "",
    Categoría: "",
    "Estado Actual": "No listado (elemento extra)",
    "Estado Hook": "",
    Observaciones: extra.observaciones ?? "",
    Auditor: extra.auditor_nombre ?? "",
    Fecha: new Date(extra.fecha).toLocaleString("es-PE"),
    Foto: extra.foto_url ?? "",
    "Foto 2": "",
    "Foto 3": "",
  };
}

function descargarExcel(filas: FilaExport[], nombreArchivo: string) {
  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja["!cols"] = [
    { wch: 22 }, // Tienda
    { wch: 14 }, // Clasificación
    { wch: 26 }, // Tipo de Elemento
    { wch: 12 }, // Cod Campaña
    { wch: 18 }, // Cliente
    { wch: 16 }, // Marca
    { wch: 20 }, // Categoría
    { wch: 18 }, // Estado Actual
    { wch: 14 }, // Estado Hook
    { wch: 30 }, // Observaciones
    { wch: 18 }, // Auditor
    { wch: 18 }, // Fecha
    { wch: 12 }, // Foto
    { wch: 12 }, // Foto 2
    { wch: 12 }, // Foto 3
  ];

  // Columnas de fotos: convertir la URL de texto plano en un hyperlink
  // real y cliqueable, con "Ver foto" como texto visible.
  const columnasFoto = [
    { indice: 12, campo: "Foto" as const },
    { indice: 13, campo: "Foto 2" as const },
    { indice: 14, campo: "Foto 3" as const },
  ];

  filas.forEach((fila, i) => {
    columnasFoto.forEach(({ indice, campo }) => {
      const url = fila[campo];
      if (!url) return;
      const direccionCelda = XLSX.utils.encode_cell({ r: i + 1, c: indice });
      hoja[direccionCelda] = {
        t: "s",
        v: "Ver foto",
        l: { Target: url },
      };
    });
  });

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Auditoría");
  XLSX.writeFile(libro, nombreArchivo);
}

/** Trae elementos + su última auditoría (o null) para un catálogo, opcionalmente filtrado por tienda,
 * más los elementos no listados correspondientes. */
async function obtenerFilasParaExportar(
  catalogoId: string,
  tienda?: string
): Promise<FilaExport[]> {
  const elementos = await traerTodasLasFilas<ElementoCatalogo>((desde, hasta) => {
    let query = supabase
      .from("elementos_catalogo")
      .select("*")
      .eq("catalogo_id", catalogoId);
    if (tienda) query = query.eq("tienda", tienda);
    return query.order("tienda").range(desde, hasta);
  });

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

  const filas = elementos.map((el) =>
    construirFila(el, ultimaPorElemento.get(el.id) ?? null)
  );

  const elementosExtra = tienda
    ? await obtenerElementosExtra(catalogoId, tienda)
    : await obtenerElementosExtraCatalogo(catalogoId);

  return [...filas, ...elementosExtra.map(construirFilaExtra)];
}

/** Exporta el Excel de una sola tienda (lo usa el auditor al terminar). */
export async function exportarTienda(
  catalogoId: string,
  tienda: string
): Promise<void> {
  const filas = await obtenerFilasParaExportar(catalogoId, tienda);
  const nombreSeguro = tienda.replace(/[^a-zA-Z0-9-_]/g, "_");
  descargarExcel(filas, `Auditoria_${nombreSeguro}.xlsx`);
}

/** Exporta el consolidado de todas las tiendas de un catálogo (lo usa el admin). */
export async function exportarConsolidado(
  catalogoId: string,
  nombreCatalogo: string
): Promise<void> {
  const filas = await obtenerFilasParaExportar(catalogoId);
  const nombreSeguro = nombreCatalogo.replace(/[^a-zA-Z0-9-_]/g, "_");
  descargarExcel(filas, `Auditoria_Consolidado_${nombreSeguro}.xlsx`);
}

/** Lista todos los catálogos (activo y archivados) para el historial del admin. */
export async function obtenerCatalogos(): Promise<Catalogo[]> {
  const { data, error } = await supabase
    .from("catalogos")
    .select("*")
    .order("fecha_carga", { ascending: false });

  if (error) {
    throw new Error(`No se pudo obtener el historial de catálogos: ${error.message}`);
  }

  return data as Catalogo[];
}
