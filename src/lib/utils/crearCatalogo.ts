import { supabase } from "@/lib/supabase/client";
import type { ElementoParseado } from "./parsearConsolidado";

const TAMANO_LOTE = 500; // Supabase recomienda insertar en lotes, no todo de golpe

export interface ProgresoCarga {
  etapa: "creando_catalogo" | "insertando_elementos" | "archivando_anterior" | "listo";
  elementosInsertados: number;
  totalElementos: number;
}

/**
 * Crea un catálogo nuevo y activo, inserta todos los elementos parseados
 * del Excel, y archiva (activo = false) cualquier catálogo previamente activo.
 * Las auditorías del catálogo anterior quedan intactas (append-only, nunca se borran).
 */
export async function crearCatalogoDesdeExcel(
  nombreCatalogo: string,
  subidoPor: string,
  elementos: ElementoParseado[],
  onProgreso?: (progreso: ProgresoCarga) => void
): Promise<{ catalogoId: string }> {
  onProgreso?.({
    etapa: "creando_catalogo",
    elementosInsertados: 0,
    totalElementos: elementos.length,
  });

  // 1. Crear el catálogo nuevo como activo.
  const { data: catalogo, error: errorCatalogo } = await supabase
    .from("catalogos")
    .insert({
      nombre: nombreCatalogo,
      subido_por: subidoPor,
      activo: true,
    })
    .select("id")
    .single();

  if (errorCatalogo || !catalogo) {
    throw new Error(
      `No se pudo crear el catálogo: ${errorCatalogo?.message ?? "error desconocido"}`
    );
  }

  const catalogoId = catalogo.id;

  // 2. Insertar los elementos en lotes.
  let insertados = 0;
  for (let i = 0; i < elementos.length; i += TAMANO_LOTE) {
    const lote = elementos.slice(i, i + TAMANO_LOTE).map((el) => ({
      ...el,
      catalogo_id: catalogoId,
    }));

    const { error: errorElementos } = await supabase
      .from("elementos_catalogo")
      .insert(lote);

    if (errorElementos) {
      throw new Error(
        `Error insertando elementos (lote desde fila ${i}): ${errorElementos.message}`
      );
    }

    insertados += lote.length;
    onProgreso?.({
      etapa: "insertando_elementos",
      elementosInsertados: insertados,
      totalElementos: elementos.length,
    });
  }

  // 3. Archivar cualquier otro catálogo que haya quedado activo
  //    (todo excepto el que acabamos de crear).
  onProgreso?.({
    etapa: "archivando_anterior",
    elementosInsertados: insertados,
    totalElementos: elementos.length,
  });

  const { error: errorArchivo } = await supabase
    .from("catalogos")
    .update({ activo: false })
    .eq("activo", true)
    .neq("id", catalogoId);

  if (errorArchivo) {
    // No revertimos la carga por esto: los datos ya están bien insertados,
    // solo avisamos para que se archive manualmente si hace falta.
    console.error("No se pudo archivar el catálogo anterior:", errorArchivo.message);
  }

  onProgreso?.({
    etapa: "listo",
    elementosInsertados: insertados,
    totalElementos: elementos.length,
  });

  return { catalogoId };
}
