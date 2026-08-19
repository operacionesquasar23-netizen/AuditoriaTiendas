"use client";

import { useEffect, useState } from "react";
import { LogoHeader } from "@/components/LogoHeader";
import {
  obtenerCatalogoActivo,
} from "@/lib/utils/auditor";
import {
  obtenerMetricasDashboard,
  obtenerOpcionesFiltro,
  type FiltrosDashboard,
  type MetricasDashboard,
  type OpcionesFiltro,
} from "@/lib/utils/dashboard";

const ETIQUETAS_ESTADO: Record<string, string> = {
  "Instalado-OK": "Instalado-OK",
  "Instalado-Dañado": "Instalado-Dañado",
  "Ubicación incorrecta": "Ubicación incorrecta",
  Otro: "Otro",
};

export default function DashboardPage() {
  const [opciones, setOpciones] = useState<OpcionesFiltro | null>(null);
  const [filtros, setFiltros] = useState<FiltrosDashboard>({});
  const [metricas, setMetricas] = useState<MetricasDashboard | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarOpciones() {
      try {
        const catalogo = await obtenerCatalogoActivo();
        if (!catalogo) {
          setError("No hay ningún catálogo activo todavía.");
          setCargando(false);
          return;
        }
        const ops = await obtenerOpcionesFiltro(catalogo.id);
        setOpciones(ops);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error.");
        setCargando(false);
      }
    }
    cargarOpciones();
  }, []);

  useEffect(() => {
    async function cargarMetricas() {
      setCargando(true);
      setError(null);
      try {
        const datos = await obtenerMetricasDashboard(filtros);
        if (!datos) {
          setError("No hay ningún catálogo activo todavía.");
          return;
        }
        setMetricas(datos);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error.");
      } finally {
        setCargando(false);
      }
    }
    cargarMetricas();
  }, [filtros]);

  return (
    <main className="min-h-screen bg-gray-50">
      <LogoHeader titulo="Dashboard" subtitulo="Auditoría de Tienda" />
      <div className="px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="flex flex-wrap gap-2 mb-8">
            <select
              value={filtros.tienda ?? ""}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, tienda: e.target.value || undefined }))
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px]"
            >
              <option value="">Todas las tiendas</option>
              {opciones?.tiendas.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={filtros.cadena ?? ""}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, cadena: e.target.value || undefined }))
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[140px]"
            >
              <option value="">Todas las cadenas</option>
              {opciones?.cadenas.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={filtros.clasificacion ?? ""}
              onChange={(e) =>
                setFiltros((f) => ({
                  ...f,
                  clasificacion: e.target.value || undefined,
                }))
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px]"
            >
              <option value="">Toda clasificación</option>
              {opciones?.clasificaciones.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {cargando && !metricas && (
            <p className="text-sm text-gray-500">Cargando métricas…</p>
          )}

          {metricas && (
            <div className={cargando ? "opacity-50 transition-opacity" : ""}>
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Resumen de elementos
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                <MetricCard
                  label="Total (Reporte App)"
                  valor={metricas.total}
                />
                <MetricCard label="Auditados" valor={metricas.auditados} />
                <MetricCard
                  label="Encontrados"
                  valor={metricas.encontrados}
                  tono="verde"
                />
                <MetricCard
                  label="Faltantes"
                  valor={metricas.faltantes}
                  tono="rojo"
                />
                <MetricCard
                  label="Extras encontrados"
                  valor={metricas.extrasEncontrados}
                  tono="azul"
                />
              </div>

              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Desglose de encontrados por estado
              </h2>
              <div className="mb-8 space-y-2">
                {metricas.desgloseEstados.length === 0 && (
                  <p className="text-sm text-gray-400">Sin datos.</p>
                )}
                {metricas.desgloseEstados.map(({ estado, cantidad }) => (
                  <BarraProgreso
                    key={estado}
                    etiqueta={ETIQUETAS_ESTADO[estado] ?? estado}
                    cantidad={cantidad}
                    total={metricas.encontrados || 1}
                  />
                ))}
              </div>

              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Estado de hooks/soportes
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {metricas.desgloseHooks.length === 0 && (
                  <p className="text-sm text-gray-400 col-span-full">Sin datos.</p>
                )}
                {metricas.desgloseHooks.map(({ estado, cantidad }) => {
                  const totalHooks = metricas.desgloseHooks.reduce(
                    (acc, h) => acc + h.cantidad,
                    0
                  );
                  const pct = totalHooks > 0 ? Math.round((cantidad / totalHooks) * 100) : 0;
                  return (
                    <MetricCard
                      key={estado}
                      label={estado}
                      valor={cantidad}
                      sufijo={`(${pct}%)`}
                      tono={
                        estado === "Bueno"
                          ? "verde"
                          : estado === "Dañado"
                            ? "ambar"
                            : estado === "Faltante"
                              ? "rojo"
                              : "gris"
                      }
                    />
                  );
                })}
              </div>

              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Campañas vencidas sin desinstalar
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-500 mb-1">Total vencidas</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metricas.totalVencidos}{" "}
                  <span className="text-sm font-normal text-gray-500">
                    de {metricas.total} ({metricas.pctVencidos.toFixed(1)}%)
                  </span>
                </p>
              </div>

              {metricas.desgloseMotivosVencidos.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 text-left">
                      <th className="font-normal py-2">Motivo</th>
                      <th className="font-normal py-2 text-right">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricas.desgloseMotivosVencidos.map(({ estado, cantidad }) => (
                      <tr key={estado} className="border-b border-gray-100">
                        <td className="py-2 text-gray-800">{estado}</td>
                        <td className="py-2 text-right text-gray-800">{cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  valor,
  sufijo,
  tono = "gris",
}: {
  label: string;
  valor: number;
  sufijo?: string;
  tono?: "gris" | "verde" | "rojo" | "azul" | "ambar";
}) {
  const estilos: Record<string, string> = {
    gris: "bg-gray-50 text-gray-900",
    verde: "bg-green-50 text-green-700",
    rojo: "bg-red-50 text-red-700",
    azul: "bg-blue-50 text-blue-700",
    ambar: "bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-lg p-4 ${estilos[tono]}`}>
      <p className="text-xs opacity-80 mb-1">{label}</p>
      <p className="text-2xl font-semibold">
        {valor.toLocaleString("es-PE")}{" "}
        {sufijo && <span className="text-sm font-normal">{sufijo}</span>}
      </p>
    </div>
  );
}

function BarraProgreso({
  etiqueta,
  cantidad,
  total,
}: {
  etiqueta: string;
  cantidad: number;
  total: number;
}) {
  const pct = Math.round((cantidad / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-36 text-sm text-gray-600 shrink-0">{etiqueta}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full relative">
        <div
          className="absolute left-0 top-0 h-2 rounded-full bg-gray-900"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-20 text-sm text-right text-gray-800 shrink-0">
        {cantidad} ({pct}%)
      </span>
    </div>
  );
}
