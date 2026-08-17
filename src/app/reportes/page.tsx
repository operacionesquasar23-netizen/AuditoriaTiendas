"use client";

import { useEffect, useState } from "react";
import { PinGate } from "@/components/PinGate";
import { LogoHeader } from "@/components/LogoHeader";
import {
  exportarConsolidado,
  exportarTienda,
  obtenerCatalogos,
} from "@/lib/utils/exportar";
import {
  obtenerCatalogosParaTienda,
  obtenerTodasLasTiendas,
} from "@/lib/utils/reporte";
import type { Catalogo } from "@/lib/supabase/types";

const PIN_REPORTES = "Quasar2026";

export default function ReportesPage() {
  const [desbloqueado, setDesbloqueado] = useState(false);

  if (!desbloqueado) {
    return (
      <PinGate
        onDesbloqueado={() => setDesbloqueado(true)}
        pinEsperado={PIN_REPORTES}
        titulo="Reportes"
        subtitulo="Auditoría de Tienda"
      />
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <LogoHeader titulo="Reportes" subtitulo="Auditoría de Tienda" />
      <div className="px-4 py-10 space-y-4">
        <BuscadorTiendaGlobal />
        <HistorialCatalogos />
      </div>
    </main>
  );
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function BuscadorTiendaGlobal() {
  const [tiendas, setTiendas] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState<string | null>(null);
  const [catalogosTienda, setCatalogosTienda] = useState<Catalogo[]>([]);
  const [cargandoTiendas, setCargandoTiendas] = useState(true);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportandoId, setExportandoId] = useState<string | null>(null);

  useEffect(() => {
    obtenerTodasLasTiendas()
      .then(setTiendas)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "No se pudo cargar las tiendas.")
      )
      .finally(() => setCargandoTiendas(false));
  }, []);

  const filtradas =
    !tiendaSeleccionada && busqueda.trim()
      ? tiendas.filter((t) => t.toLowerCase().includes(busqueda.toLowerCase()))
      : [];

  async function seleccionarTienda(tienda: string) {
    setTiendaSeleccionada(tienda);
    setBusqueda(tienda);
    setCargandoCatalogos(true);
    setError(null);
    try {
      setCatalogosTienda(await obtenerCatalogosParaTienda(tienda));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar los catálogos.");
    } finally {
      setCargandoCatalogos(false);
    }
  }

  function limpiarSeleccion() {
    setTiendaSeleccionada(null);
    setCatalogosTienda([]);
    setBusqueda("");
  }

  async function exportarExcel(catalogoId: string) {
    if (!tiendaSeleccionada) return;
    setExportandoId(catalogoId);
    try {
      await exportarTienda(catalogoId, tiendaSeleccionada);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo exportar el Excel.");
    } finally {
      setExportandoId(null);
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Buscar tienda</h2>
      <p className="text-sm text-gray-500 mb-4">
        Busca una tienda y elige de qué auditoría (catálogo) quieres el reporte.
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-4">
          {error}
        </p>
      )}

      <div className="relative mb-2">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            if (tiendaSeleccionada) {
              setTiendaSeleccionada(null);
              setCatalogosTienda([]);
            }
          }}
          placeholder={cargandoTiendas ? "Cargando tiendas…" : "Escribe el nombre de la tienda…"}
          disabled={cargandoTiendas}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
        />

        {filtradas.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg divide-y divide-gray-100">
            {filtradas.slice(0, 20).map((tienda) => (
              <button
                key={tienda}
                onClick={() => seleccionarTienda(tienda)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
              >
                {tienda}
              </button>
            ))}
          </div>
        )}
      </div>

      {tiendaSeleccionada && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">{tiendaSeleccionada}</p>
            <button
              onClick={limpiarSeleccion}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              Cambiar tienda
            </button>
          </div>

          {cargandoCatalogos && (
            <p className="text-sm text-gray-500">Cargando catálogos…</p>
          )}

          {!cargandoCatalogos && catalogosTienda.length === 0 && (
            <p className="text-sm text-gray-400">
              Esta tienda no aparece en ningún catálogo.
            </p>
          )}

          <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {catalogosTienda.map((catalogo) => (
              <div
                key={catalogo.id}
                className="flex items-center justify-between px-4 py-3 gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {catalogo.nombre}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatearFecha(catalogo.fecha_carga)} ·{" "}
                    {catalogo.activo ? (
                      <span className="text-green-600">Activo</span>
                    ) : (
                      <span className="text-gray-400">Archivado</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => exportarExcel(catalogo.id)}
                    disabled={exportandoId === catalogo.id}
                    className="text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {exportandoId === catalogo.id ? "…" : "📥 Excel"}
                  </button>
                  <a
                    href={`/api/reporte-pdf?catalogoId=${encodeURIComponent(catalogo.id)}&tienda=${encodeURIComponent(tiendaSeleccionada)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-center border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    📄 PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistorialCatalogos() {
  const [catalogos, setCatalogos] = useState<Catalogo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportandoId, setExportandoId] = useState<string | null>(null);

  useEffect(() => {
    obtenerCatalogos()
      .then(setCatalogos)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "No se pudo cargar el historial.")
      );
  }, []);

  async function exportar(catalogo: Catalogo) {
    setExportandoId(catalogo.id);
    try {
      await exportarConsolidado(catalogo.id, catalogo.nombre);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo exportar el consolidado.");
    } finally {
      setExportandoId(null);
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Historial de catálogos
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Exporta el consolidado de auditorías de cualquier catálogo, activo o
        archivado (todas las tiendas juntas).
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-4">
          {error}
        </p>
      )}

      {!catalogos && !error && (
        <p className="text-sm text-gray-500">Cargando…</p>
      )}

      {catalogos && catalogos.length === 0 && (
        <p className="text-sm text-gray-400">Todavía no hay ningún catálogo cargado.</p>
      )}

      <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
        {catalogos?.map((catalogo) => (
          <div
            key={catalogo.id}
            className="flex items-center justify-between px-4 py-3 gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {catalogo.nombre}
              </p>
              <p className="text-xs text-gray-400">
                {formatearFecha(catalogo.fecha_carga)} ·{" "}
                {catalogo.activo ? (
                  <span className="text-green-600">Activo</span>
                ) : (
                  <span className="text-gray-400">Archivado</span>
                )}
              </p>
            </div>
            <button
              onClick={() => exportar(catalogo)}
              disabled={exportandoId === catalogo.id}
              className="shrink-0 text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {exportandoId === catalogo.id ? "Exportando…" : "📥 Exportar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
