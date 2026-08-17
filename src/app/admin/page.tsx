"use client";

import { useState, type ChangeEvent } from "react";
import { PinGate } from "@/components/PinGate";
import { LogoHeader } from "@/components/LogoHeader";
import {
  parsearConsolidado,
  type ResultadoParseo,
} from "@/lib/utils/parsearConsolidado";
import {
  crearCatalogoDesdeExcel,
  type ProgresoCarga,
} from "@/lib/utils/crearCatalogo";

type EstadoCarga =
  | { paso: "esperando_archivo" }
  | { paso: "parseando" }
  | { paso: "preview"; resultado: ResultadoParseo; archivoNombre: string }
  | { paso: "subiendo"; progreso: ProgresoCarga }
  | { paso: "listo"; totalTiendas: number; totalElementos: number }
  | { paso: "error"; mensaje: string };

function contarTiendasUnicas(resultado: ResultadoParseo): number {
  return new Set(resultado.elementos.map((e) => e.tienda)).size;
}

export default function AdminPage() {
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [subidoPor, setSubidoPor] = useState("");
  const [nombreCatalogo, setNombreCatalogo] = useState("");
  const [estado, setEstado] = useState<EstadoCarga>({ paso: "esperando_archivo" });

  if (!desbloqueado) {
    return <PinGate onDesbloqueado={() => setDesbloqueado(true)} modulo="admin" />;
  }

  async function manejarArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setEstado({ paso: "parseando" });

    try {
      const resultado = await parsearConsolidado(archivo);

      if (resultado.elementos.length === 0) {
        const detalles: string[] = [];
        if (resultado.filasDescartadasFueraDeLima > 0) {
          detalles.push(`${resultado.filasDescartadasFueraDeLima} fuera de Lima`);
        }
        if (resultado.filasDescartadasCadenaNoPermitida > 0) {
          detalles.push(
            `${resultado.filasDescartadasCadenaNoPermitida} de cadenas distintas a Plaza Vea/Vivanda`
          );
        }
        if (resultado.filasDescartadasDesinstaladas > 0) {
          detalles.push(`${resultado.filasDescartadasDesinstaladas} ya desinstaladas`);
        }
        if (resultado.filasDescartadasSubmotivoExcluido > 0) {
          detalles.push(
            `${resultado.filasDescartadasSubmotivoExcluido} ya no están en tienda (submotivo excluido)`
          );
        }
        if (resultado.filasDescartadasNoInstalado > 0) {
          detalles.push(
            `${resultado.filasDescartadasNoInstalado} no tienen STATUS INSTALACION = Instalado`
          );
        }
        if (resultado.filasDescartadasSinTienda > 0) {
          detalles.push(`${resultado.filasDescartadasSinTienda} sin tienda`);
        }

        let mensaje = `Ninguna de las ${resultado.totalFilasExcel} fila(s) del archivo pasó los filtros: ${detalles.join(", ") || "sin detalle"}.`;

        if (resultado.filasDescartadasFueraDeLima > 0) {
          mensaje += ` Valores de REGIÓN encontrados en el archivo: ${resultado.valoresRegionEncontrados.join(", ") || "(vacío)"}.`;
        }
        if (resultado.filasDescartadasCadenaNoPermitida > 0) {
          mensaje += ` Valores de CADENA encontrados: ${resultado.valoresCadenaEncontrados.join(", ") || "(vacío)"}.`;
        }

        setEstado({ paso: "error", mensaje });
        return;
      }

      if (!nombreCatalogo) {
        setNombreCatalogo(archivo.name.replace(/\.xlsx?$/i, ""));
      }

      setEstado({ paso: "preview", resultado, archivoNombre: archivo.name });
    } catch (err) {
      setEstado({
        paso: "error",
        mensaje:
          err instanceof Error
            ? `No se pudo leer el archivo: ${err.message}`
            : "No se pudo leer el archivo.",
      });
    }
  }

  async function confirmarCarga() {
    if (estado.paso !== "preview") return;
    if (!subidoPor.trim()) {
      setEstado({
        paso: "error",
        mensaje: "Escribe tu nombre antes de confirmar la carga.",
      });
      return;
    }

    const { resultado } = estado;
    const nombreFinal = nombreCatalogo.trim() || estado.archivoNombre;

    try {
      setEstado({
        paso: "subiendo",
        progreso: {
          etapa: "creando_catalogo",
          elementosInsertados: 0,
          totalElementos: resultado.elementos.length,
        },
      });

      await crearCatalogoDesdeExcel(
        nombreFinal,
        subidoPor.trim(),
        resultado.elementos,
        (progreso) => setEstado({ paso: "subiendo", progreso })
      );

      setEstado({
        paso: "listo",
        totalTiendas: contarTiendasUnicas(resultado),
        totalElementos: resultado.elementos.length,
      });
    } catch (err) {
      setEstado({
        paso: "error",
        mensaje:
          err instanceof Error
            ? err.message
            : "Ocurrió un error inesperado al subir el catálogo.",
      });
    }
  }

  function empezarDeNuevo() {
    setNombreCatalogo("");
    setEstado({ paso: "esperando_archivo" });
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <LogoHeader titulo="PDL — Panel Admin" subtitulo="Cargar Consolidado" />
      <div className="px-4 py-10">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          Cargar Consolidado
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Sube el Excel del Consolidado de Quasar Report. Se filtrarán solo
          las filas con STATUS INSTALACION = &quot;Instalado&quot; y se
          creará un catálogo nuevo y activo. El catálogo anterior quedará
          archivado con sus auditorías intactas.
        </p>

        {(estado.paso === "esperando_archivo" || estado.paso === "parseando") && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tu nombre
              </label>
              <input
                type="text"
                value={subidoPor}
                onChange={(e) => setSubidoPor(e.target.value)}
                placeholder="Ej. PJ"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo Excel (.xlsx)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={manejarArchivo}
                disabled={estado.paso === "parseando" || !subidoPor.trim()}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {!subidoPor.trim() && (
                <p className="text-xs text-gray-400 mt-1">
                  Escribe tu nombre primero para habilitar la carga.
                </p>
              )}
            </div>

            {estado.paso === "parseando" && (
              <p className="text-sm text-gray-500">Leyendo el archivo…</p>
            )}
          </div>
        )}

        {estado.paso === "preview" && (
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-1">
              <p>
                <span className="font-medium">Archivo:</span>{" "}
                {estado.archivoNombre}
              </p>
              <p>
                <span className="font-medium">Filas totales en el Excel:</span>{" "}
                {estado.resultado.totalFilasExcel.toLocaleString("es-PE")}
              </p>
              <p>
                <span className="font-medium">Filas con &quot;Instalado&quot;:</span>{" "}
                {estado.resultado.totalFilasInstalado.toLocaleString("es-PE")}
              </p>
              <p>
                <span className="font-medium">Elementos a cargar:</span>{" "}
                {estado.resultado.elementos.length.toLocaleString("es-PE")}
              </p>
              {estado.resultado.totalElementosVencidos > 0 && (
                <p>
                  <span className="font-medium">De esos, vencidos (Vigencia = Vencido, pendientes de desinstalar):</span>{" "}
                  {estado.resultado.totalElementosVencidos.toLocaleString("es-PE")}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Valores de Vigencia encontrados:{" "}
                {estado.resultado.valoresVigenciaEncontrados.join(", ") || "(vacío)"}
              </p>
              <p>
                <span className="font-medium">Tiendas distintas:</span>{" "}
                {contarTiendasUnicas(estado.resultado).toLocaleString("es-PE")}
              </p>
              {estado.resultado.filasDescartadasFueraDeLima > 0 && (
                <p className="text-gray-500">
                  {estado.resultado.filasDescartadasFueraDeLima} fila(s)
                  descartada(s) por no ser de Lima.
                </p>
              )}
              {estado.resultado.filasDescartadasCadenaNoPermitida > 0 && (
                <p className="text-gray-500">
                  {estado.resultado.filasDescartadasCadenaNoPermitida} fila(s)
                  descartada(s) por no ser Plaza Vea o Vivanda.
                </p>
              )}
              {estado.resultado.filasDescartadasDesinstaladas > 0 && (
                <p className="text-gray-500">
                  {estado.resultado.filasDescartadasDesinstaladas} fila(s)
                  descartada(s) por estar desinstaladas.
                </p>
              )}
              {estado.resultado.filasDescartadasNoInstalado > 0 && (
                <p className="text-gray-500">
                  {estado.resultado.filasDescartadasNoInstalado} fila(s)
                  descartada(s) por no tener STATUS INSTALACION = Instalado.
                </p>
              )}
              {estado.resultado.filasDescartadasSubmotivoExcluido > 0 && (
                <p className="text-gray-500">
                  {estado.resultado.filasDescartadasSubmotivoExcluido} fila(s)
                  descartada(s) por ya no estar en tienda (extraviado/retirado
                  sin autorización).
                </p>
              )}
              {estado.resultado.filasDescartadasSinTienda > 0 && (
                <p className="text-amber-700">
                  ⚠ {estado.resultado.filasDescartadasSinTienda} fila(s)
                  descartada(s) por no tener tienda.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del catálogo
              </label>
              <input
                type="text"
                value={nombreCatalogo}
                onChange={(e) => setNombreCatalogo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmarCarga}
                className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 font-medium hover:bg-gray-800 transition-colors"
              >
                Confirmar y subir a Supabase
              </button>
              <button
                onClick={empezarDeNuevo}
                className="px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {estado.paso === "subiendo" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {estado.progreso.etapa === "creando_catalogo" &&
                "Creando catálogo…"}
              {estado.progreso.etapa === "insertando_elementos" &&
                `Insertando elementos: ${estado.progreso.elementosInsertados} / ${estado.progreso.totalElementos}`}
              {estado.progreso.etapa === "archivando_anterior" &&
                "Archivando catálogo anterior…"}
              {estado.progreso.etapa === "listo" && "Finalizando…"}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-900 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    estado.progreso.totalElementos === 0
                      ? 0
                      : (estado.progreso.elementosInsertados /
                          estado.progreso.totalElementos) *
                        100
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {estado.paso === "listo" && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
              <p className="font-medium">✅ Catálogo cargado con éxito</p>
              <p className="text-sm mt-1">
                {estado.totalElementos.toLocaleString("es-PE")} elementos en{" "}
                {estado.totalTiendas.toLocaleString("es-PE")} tiendas. El
                catálogo anterior quedó archivado.
              </p>
            </div>
            <button
              onClick={empezarDeNuevo}
              className="w-full bg-gray-900 text-white rounded-lg py-2.5 font-medium hover:bg-gray-800 transition-colors"
            >
              Cargar otro archivo
            </button>
          </div>
        )}

        {estado.paso === "error" && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              <p className="font-medium">❌ Error</p>
              <p className="text-sm mt-1">{estado.mensaje}</p>
            </div>
            <button
              onClick={empezarDeNuevo}
              className="w-full bg-gray-900 text-white rounded-lg py-2.5 font-medium hover:bg-gray-800 transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
      </div>
    </main>
  );
}
