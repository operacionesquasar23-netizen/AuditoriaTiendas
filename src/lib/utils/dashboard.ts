import { supabase } from "@/lib/supabase/client";
import { traerTodasLasFilas, obtenerCatalogoActivo } from "./auditor";
import type { Auditoria, ElementoCatalogo, EstadoActual, EstadoHook } from "@/lib/supabase/types";

export interface FiltrosDashboard {
  tienda?: string;
  cadena?: string;
  clasificacion?: string;
}

export interface OpcionesFiltro {
  tiendas: string[];
  cadenas: string[];
  clasificaciones: string[];
}

export interface MetricasDashboard {
  total: number;
  auditados: number;
  encontrados: number;
  faltantes: number;
  extrasEncontrados: number;
  desgloseEstados: { estado: string; cantidad: number }[];
  desgloseHooks: { estado: string; cantidad: number }[];
  totalVencidos: number;
  pctVencidos: number;
  desgloseMotivosVencidos: { motivo: string; cantidad: number }[];
}

/** Opciones disponibles para los selectores de filtro, según el catálogo activo. */
export async function obtenerOpcionesFiltro(
  catalogoId: string
): Promise<OpcionesFiltro> {
  const filas = await traerTodasLasFilas<{
    tienda: string;
    cadena: string | null;
    clasificacion: string | null;
  }>((desde, hasta) =>
    supabase
      .from("elementos_catalogo")
      .select("tienda, cadena, clasificacion")
      .eq("catalogo_id", catalogoId)
      .range(desde, hasta)
  );

  const tiendas = new Set<string>();
  const cadenas = new Set<string>();
  const clasificaciones = new Set<string>();
  for (const f of filas) {
    tiendas.add(f.tienda);
    if (f.cadena) cadenas.add(f.cadena);
    if (f.clasificacion) clasificaciones.add(f.clasificacion);
  }

  return {
    tiendas: Array.from(tiendas).sort((a, b) => a.localeCompare(b, "es")),
    cadenas: Array.from(cadenas).sort((a, b) => a.localeCompare(b, "es")),
    clasificaciones: Array.from(clasificaciones).sort((a, b) => a.localeCompare(b, "es")),
  };
}

function contarPorClave<T>(items: T[], obtenerClave: (item: T) => string) {
  const conteo = new Map<string, number>();
  for (const item of items) {
    const clave = obtenerClave(item);
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }
  return Array.from(conteo.entries())
    .map(([estado, cantidad]) => ({ estado, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

/**
 * Calcula todas las métricas del dashboard para el catálogo activo,
 * aplicando los filtros de tienda/cadena/clasificación si se especifican.
 * Los elementos vencidos (checklist simplificado, estado_actual siempre
 * fijo) se excluyen del desglose por estado y de hooks: se reportan
 * aparte en su propia sección.
 */
export async function obtenerMetricasDashboard(
  filtros: FiltrosDashboard
): Promise<MetricasDashboard | null> {
  const catalogo = await obtenerCatalogoActivo();
  if (!catalogo) return null;

  const elementos = await traerTodasLasFilas<ElementoCatalogo>((desde, hasta) => {
    let query = supabase
      .from("elementos_catalogo")
      .select("*")
      .eq("catalogo_id", catalogo.id);
    if (filtros.tienda) query = query.eq("tienda", filtros.tienda);
    if (filtros.cadena) query = query.eq("cadena", filtros.cadena);
    if (filtros.clasificacion) query = query.eq("clasificacion", filtros.clasificacion);
    return query.range(desde, hasta);
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

  const total = elementos.length;
  const vencidos = elementos.filter((el) => el.es_vencido);
  const auditadosTodos = elementos.filter((el) => ultimaPorElemento.has(el.id));

  // Solo elementos normales (no vencidos) tienen un estado_actual real del
  // checklist completo — los vencidos siempre tienen el mismo valor fijo,
  // así que no aportan al desglose por estado ni al de hooks.
  const auditadosNormales = auditadosTodos.filter((el) => !el.es_vencido);
  const estadosNormales = auditadosNormales.map(
    (el) => ultimaPorElemento.get(el.id)!.estado_actual
  );
  const hooksNormales = auditadosNormales.map(
    (el) => ultimaPorElemento.get(el.id)!.estado_hook
  );

  const faltantes = estadosNormales.filter((e) => e === "Faltante").length;
  const encontrados = estadosNormales.length - faltantes;
  const desgloseEstados = contarPorClave(
    estadosNormales.filter((e) => e !== "Faltante"),
    (e) => e
  );
  const desgloseHooks = contarPorClave(hooksNormales, (h) => h);

  // Elementos extra (no listados): la tabla no tiene columna de
  // clasificación, así que si ese filtro está activo no aplican.
  let extrasEncontrados = 0;
  if (!filtros.clasificacion) {
    const tiendasEnFiltro = filtros.tienda
      ? [filtros.tienda]
      : Array.from(new Set(elementos.map((el) => el.tienda)));

    if (tiendasEnFiltro.length > 0) {
      const { count, error } = await supabase
        .from("elementos_extra")
        .select("id", { count: "exact", head: true })
        .eq("catalogo_id", catalogo.id)
        .in("tienda", tiendasEnFiltro);

      if (!error) extrasEncontrados = count ?? 0;
    }
  }

  const desgloseMotivosVencidos = contarPorClave(
    vencidos,
    (el) => el.submotivo_desinstalacion || "Sin motivo registrado"
  );

  return {
    total,
    auditados: auditadosTodos.length,
    encontrados,
    faltantes,
    extrasEncontrados,
    desgloseEstados,
    desgloseHooks,
    totalVencidos: vencidos.length,
    pctVencidos: total > 0 ? (vencidos.length / total) * 100 : 0,
    desgloseMotivosVencidos,
  };
}
