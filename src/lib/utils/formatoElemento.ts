import type { ElementoCatalogo } from "@/lib/supabase/types";

/**
 * Nombre principal a mostrar: prioriza TIPO DE ELEMENTO (más específico,
 * ej. "Jalavista Diferenciado") sobre ELEMENTO (ej. "Jalavista").
 */
export function nombreElemento(elemento: ElementoCatalogo): string {
  return elemento.tipo_elemento || elemento.elemento || "Elemento sin nombre";
}

/** Subtítulo: Código de Campaña · Cliente · Marca. */
export function subtituloElemento(elemento: ElementoCatalogo): string {
  const partes = [elemento.cod_campana, elemento.cliente, elemento.marca].filter(
    (parte): parte is string => Boolean(parte)
  );
  return partes.join(" · ");
}

// Orden fijo de clasificación para agrupar la lista de elementos.
const ORDEN_CLASIFICACION = ["Livianos", "Muebles", "Revestimientos"];

/** Agrupa elementos por clasificación, en el orden fijo de arriba; lo no reconocido va al final como "Otros". */
export function agruparPorClasificacion<T extends { clasificacion: string | null }>(
  elementos: T[]
): { clasificacion: string; elementos: T[] }[] {
  const grupos = new Map<string, T[]>();

  for (const elemento of elementos) {
    const clave = elemento.clasificacion || "Otros";
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave)!.push(elemento);
  }

  const clavesOrdenadas = Array.from(grupos.keys()).sort((a, b) => {
    const ia = ORDEN_CLASIFICACION.indexOf(a);
    const ib = ORDEN_CLASIFICACION.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "es");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return clavesOrdenadas.map((clasificacion) => ({
    clasificacion,
    elementos: grupos.get(clasificacion)!,
  }));
}
