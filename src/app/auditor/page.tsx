"use client";

import { useEffect, useMemo, useState } from "react";
import { ChecklistAuditoria } from "@/components/ChecklistAuditoria";
import { ElementoExtraForm } from "@/components/ElementoExtraForm";
import { LogoHeader } from "@/components/LogoHeader";
import {
  obtenerCatalogoActivo,
  obtenerElementosExtra,
  obtenerElementosTienda,
  obtenerOperadorTienda,
  obtenerTiendas,
  type ElementoConEstado,
  type ElementoExtra,
} from "@/lib/utils/auditor";
import {
  agruparPorClasificacion,
  nombreElemento,
  subtituloElemento,
} from "@/lib/utils/formatoElemento";
import { exportarTienda } from "@/lib/utils/exportar";

type Paso =
  | { vista: "nombre" }
  | { vista: "tienda"; catalogoId: string; catalogoNombre: string }
  | {
      vista: "elementos";
      catalogoId: string;
      tienda: string;
      elementos: ElementoConEstado[];
      elementosExtra: ElementoExtra[];
      operador: string | null;
      supervisor: string | null;
    }
  | {
      vista: "checklist";
      catalogoId: string;
      tienda: string;
      elementos: ElementoConEstado[];
      elementosExtra: ElementoExtra[];
      elementoSeleccionado: ElementoConEstado;
      operador: string | null;
      supervisor: string | null;
    }
  | {
      vista: "elemento-extra";
      catalogoId: string;
      tienda: string;
      elementos: ElementoConEstado[];
      elementosExtra: ElementoExtra[];
      operador: string | null;
      supervisor: string | null;
    };

export default function AuditorPage() {
  const [auditorNombre, setAuditorNombre] = useState("");
  const [paso, setPaso] = useState<Paso>({ vista: "nombre" });
  const [tiendas, setTiendas] = useState<string[]>([]);
  const [busquedaTienda, setBusquedaTienda] = useState("");
  const [tab, setTab] = useState<"pendientes" | "auditados">("pendientes");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continuarConNombre() {
    if (!auditorNombre.trim()) return;

    setCargando(true);
    setError(null);
    try {
      const catalogo = await obtenerCatalogoActivo();
      if (!catalogo) {
        setError(
          "No hay ningún catálogo activo todavía. Pide al admin que suba el Consolidado."
        );
        return;
      }

      const listaTiendas = await obtenerTiendas(catalogo.id);
      setTiendas(listaTiendas);
      setPaso({
        vista: "tienda",
        catalogoId: catalogo.id,
        catalogoNombre: catalogo.nombre,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
    } finally {
      setCargando(false);
    }
  }

  async function seleccionarTienda(tienda: string, catalogoId: string) {
    setCargando(true);
    setError(null);
    try {
      const elementos = await obtenerElementosTienda(catalogoId, tienda);
      const elementosExtra = await obtenerElementosExtra(catalogoId, tienda);
      const staff = await obtenerOperadorTienda(tienda);
      setTab("pendientes");
      setPaso({
        vista: "elementos",
        catalogoId,
        tienda,
        elementos,
        elementosExtra,
        operador: staff?.operador ?? null,
        supervisor: staff?.supervisor ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
    } finally {
      setCargando(false);
    }
  }

  async function recargarElementos() {
    if (
      paso.vista !== "elementos" &&
      paso.vista !== "checklist" &&
      paso.vista !== "elemento-extra"
    )
      return;
    const { catalogoId, tienda, operador, supervisor } = paso;
    const elementos = await obtenerElementosTienda(catalogoId, tienda);
    const elementosExtra = await obtenerElementosExtra(catalogoId, tienda);
    setPaso({
      vista: "elementos",
      catalogoId,
      tienda,
      elementos,
      elementosExtra,
      operador,
      supervisor,
    });
  }

  const tiendasFiltradas = useMemo(() => {
    if (!busquedaTienda.trim()) return tiendas;
    const query = busquedaTienda.toLowerCase();
    return tiendas.filter((t) => t.toLowerCase().includes(query));
  }, [tiendas, busquedaTienda]);

  return (
    <main className="min-h-screen bg-gray-50">
      <LogoHeader titulo="Auditoría de Tienda" subtitulo="Quasar" />
      <div className="px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {paso.vista === "nombre" && (
          <VistaNombre
            auditorNombre={auditorNombre}
            setAuditorNombre={setAuditorNombre}
            cargando={cargando}
            error={error}
            onContinuar={continuarConNombre}
          />
        )}

        {paso.vista === "tienda" && (
          <VistaTienda
            catalogoNombre={paso.catalogoNombre}
            auditorNombre={auditorNombre}
            tiendas={tiendasFiltradas}
            busqueda={busquedaTienda}
            setBusqueda={setBusquedaTienda}
            cargando={cargando}
            error={error}
            onSeleccionar={(tienda) => seleccionarTienda(tienda, paso.catalogoId)}
            onCambiarNombre={() => setPaso({ vista: "nombre" })}
          />
        )}

        {paso.vista === "elementos" && (
          <VistaElementos
            tienda={paso.tienda}
            operador={paso.operador}
            supervisor={paso.supervisor}
            catalogoId={paso.catalogoId}
            elementos={paso.elementos}
            elementosExtra={paso.elementosExtra}
            tab={tab}
            setTab={setTab}
            onElegirElemento={(elemento) =>
              setPaso({ ...paso, vista: "checklist", elementoSeleccionado: elemento })
            }
            onAgregarExtra={() => setPaso({ ...paso, vista: "elemento-extra" })}
            onCambiarTienda={() =>
              setPaso({
                vista: "tienda",
                catalogoId: paso.catalogoId,
                catalogoNombre: "",
              })
            }
          />
        )}

        {paso.vista === "checklist" && (
          <ChecklistAuditoria
            elemento={paso.elementoSeleccionado}
            catalogoId={paso.catalogoId}
            tienda={paso.tienda}
            auditorNombre={auditorNombre}
            onGuardado={recargarElementos}
            onCancelar={() =>
              setPaso({
                vista: "elementos",
                catalogoId: paso.catalogoId,
                tienda: paso.tienda,
                elementos: paso.elementos,
                elementosExtra: paso.elementosExtra,
                operador: paso.operador,
                supervisor: paso.supervisor,
              })
            }
          />
        )}

        {paso.vista === "elemento-extra" && (
          <ElementoExtraForm
            catalogoId={paso.catalogoId}
            tienda={paso.tienda}
            auditorNombre={auditorNombre}
            onGuardado={recargarElementos}
            onCancelar={() =>
              setPaso({
                vista: "elementos",
                catalogoId: paso.catalogoId,
                tienda: paso.tienda,
                elementos: paso.elementos,
                elementosExtra: paso.elementosExtra,
                operador: paso.operador,
                supervisor: paso.supervisor,
              })
            }
          />
        )}
      </div>
      </div>
    </main>
  );
}

function VistaNombre({
  auditorNombre,
  setAuditorNombre,
  cargando,
  error,
  onContinuar,
}: {
  auditorNombre: string;
  setAuditorNombre: (v: string) => void;
  cargando: boolean;
  error: string | null;
  onContinuar: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Tu nombre
      </label>
      <input
        type="text"
        value={auditorNombre}
        onChange={(e) => setAuditorNombre(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onContinuar()}
        placeholder="Ej. Juan Pérez"
        autoFocus
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <button
        onClick={onContinuar}
        disabled={!auditorNombre.trim() || cargando}
        className="w-full mt-6 bg-gray-900 text-white rounded-lg py-2.5 font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {cargando ? "Cargando…" : "Continuar"}
      </button>
    </div>
  );
}

function VistaTienda({
  catalogoNombre,
  auditorNombre,
  tiendas,
  busqueda,
  setBusqueda,
  cargando,
  error,
  onSeleccionar,
  onCambiarNombre,
}: {
  catalogoNombre: string;
  auditorNombre: string;
  tiendas: string[];
  busqueda: string;
  setBusqueda: (v: string) => void;
  cargando: boolean;
  error: string | null;
  onSeleccionar: (tienda: string) => void;
  onCambiarNombre: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold text-gray-900">Hola, {auditorNombre}</h1>
        <button
          onClick={onCambiarNombre}
          className="text-xs text-gray-400 hover:text-gray-700"
        >
          Cambiar
        </button>
      </div>
      {catalogoNombre && (
        <p className="text-xs text-gray-400 mb-4">Catálogo: {catalogoNombre}</p>
      )}

      <label className="block text-sm font-medium text-gray-700 mb-2">
        Busca tu tienda
      </label>
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Escribe el nombre de la tienda…"
        autoFocus
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
        {cargando && (
          <p className="text-sm text-gray-500 px-4 py-3">Cargando…</p>
        )}
        {!cargando && tiendas.length === 0 && (
          <p className="text-sm text-gray-400 px-4 py-3">
            No se encontraron tiendas.
          </p>
        )}
        {!cargando &&
          tiendas.map((tienda) => (
            <button
              key={tienda}
              onClick={() => onSeleccionar(tienda)}
              className="w-full text-left px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
            >
              {tienda}
            </button>
          ))}
      </div>
    </div>
  );
}

function VistaElementos({
  tienda,
  operador,
  supervisor,
  catalogoId,
  elementos,
  elementosExtra,
  tab,
  setTab,
  onElegirElemento,
  onAgregarExtra,
  onCambiarTienda,
}: {
  tienda: string;
  operador: string | null;
  supervisor: string | null;
  catalogoId: string;
  elementos: ElementoConEstado[];
  elementosExtra: ElementoExtra[];
  tab: "pendientes" | "auditados";
  setTab: (v: "pendientes" | "auditados") => void;
  onElegirElemento: (elemento: ElementoConEstado) => void;
  onAgregarExtra: () => void;
  onCambiarTienda: () => void;
}) {
  const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(new Set());
  const [exportando, setExportando] = useState(false);

  async function exportar() {
    setExportando(true);
    try {
      await exportarTienda(catalogoId, tienda);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo exportar el Excel.");
    } finally {
      setExportando(false);
    }
  }

  function toggleGrupo(clasificacion: string) {
    setGruposAbiertos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(clasificacion)) nuevo.delete(clasificacion);
      else nuevo.add(clasificacion);
      return nuevo;
    });
  }
  const pendientes = elementos.filter((el) => !el.ultimaAuditoria);
  const auditados = elementos.filter((el) => el.ultimaAuditoria);
  const listaActual = tab === "pendientes" ? pendientes : auditados;

  // El grupo de "instalados" se agrupa por clasificación exactamente igual
  // que antes (Livianos/Muebles/Revestimientos). Los vencidos sin
  // desinstalar son un grupo aparte, agregado al final, no mezclado dentro
  // de esas clasificaciones. "No listados" (elementos que el auditor
  // encontró en tienda pero no venían en el catálogo) también van
  // aparte, y solo en la pestaña Auditados, ya que siempre nacen
  // completos (no existe una versión "pendiente" de ellos).
  const normales = listaActual.filter((el) => !el.es_vencido);
  const vencidos = listaActual.filter((el) => el.es_vencido);
  const gruposActuales = [
    ...agruparPorClasificacion(normales),
    ...(vencidos.length > 0
      ? [{ clasificacion: "Vencidos sin desinstalar", elementos: vencidos }]
      : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold text-gray-900">{tienda}</h1>
        <button
          onClick={onCambiarTienda}
          className="text-xs text-gray-400 hover:text-gray-700"
        >
          Cambiar tienda
        </button>
      </div>
      {(operador || supervisor) && (
        <p className="text-xs text-gray-500 mb-1">
          {[operador && `Operador: ${operador}`, supervisor && `Supervisor: ${supervisor}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      <p className="text-xs text-gray-400 mb-3">
        {elementos.length} elemento(s) en total
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={exportar}
          disabled={exportando}
          className="flex-1 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {exportando ? "Exportando…" : "📥 Excel"}
        </button>
        <a
          href={`/api/reporte-pdf?catalogoId=${encodeURIComponent(catalogoId)}&tienda=${encodeURIComponent(tienda)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-sm font-medium text-center text-gray-700 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition-colors"
        >
          📄 Reporte PDF
        </a>
      </div>

      <button
        onClick={onAgregarExtra}
        className="w-full mb-4 text-sm font-medium text-gray-700 border border-dashed border-gray-300 rounded-lg py-2.5 hover:bg-gray-50 transition-colors"
      >
        + Agregar elemento no listado
      </button>

      <div className="flex border border-gray-200 rounded-lg overflow-hidden mb-4">
        <button
          onClick={() => setTab("pendientes")}
          className={`flex-1 text-sm font-medium py-2.5 transition-colors ${
            tab === "pendientes"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Pendientes ({pendientes.length})
        </button>
        <button
          onClick={() => setTab("auditados")}
          className={`flex-1 text-sm font-medium py-2.5 transition-colors ${
            tab === "auditados"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Auditados ({auditados.length + elementosExtra.length})
        </button>
      </div>

      <div className="max-h-[28rem] overflow-y-auto border border-gray-200 rounded-lg">
        {listaActual.length === 0 && elementosExtra.length === 0 && (
          <p className="text-sm text-gray-400 px-4 py-6 text-center">
            {tab === "pendientes"
              ? "No quedan elementos pendientes 🎉"
              : "Todavía no hay elementos auditados."}
          </p>
        )}
        {gruposActuales.map((grupo, indiceGrupo) => {
          const abierto = gruposAbiertos.has(grupo.clasificacion);
          return (
            <div key={grupo.clasificacion}>
              <button
                onClick={() => toggleGrupo(grupo.clasificacion)}
                className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wide hover:bg-gray-100 transition-colors ${
                  indiceGrupo > 0 ? "border-t border-gray-200" : ""
                }`}
              >
                <span>
                  {grupo.clasificacion} ({grupo.elementos.length})
                </span>
                <span>{abierto ? "▲" : "▼"}</span>
              </button>
              {abierto && (
                <div className="divide-y divide-gray-100">
                  {grupo.elementos.map((elemento) => (
                    <button
                      key={elemento.id}
                      onClick={() => onElegirElemento(elemento)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                        {nombreElemento(elemento)}
                        {elemento.es_vencido && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
                            VENCIDO
                          </span>
                        )}
                      </p>
                      {subtituloElemento(elemento) && (
                        <p className="text-xs text-gray-400">
                          {subtituloElemento(elemento)}
                        </p>
                      )}
                      {elemento.ultimaAuditoria && (
                        <p className="text-xs text-green-600 mt-0.5">
                          ✓ {elemento.ultimaAuditoria.estado_actual}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {tab === "auditados" && elementosExtra.length > 0 && (
          <div>
            <button
              onClick={() => toggleGrupo("No listados")}
              className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wide hover:bg-gray-100 transition-colors ${
                gruposActuales.length > 0 ? "border-t border-gray-200" : ""
              }`}
            >
              <span>No listados ({elementosExtra.length})</span>
              <span>{gruposAbiertos.has("No listados") ? "▲" : "▼"}</span>
            </button>
            {gruposAbiertos.has("No listados") && (
              <div className="divide-y divide-gray-100">
                {elementosExtra.map((extra) => (
                  <div key={extra.id} className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">
                      {extra.nombre}
                    </p>
                    {extra.observaciones && (
                      <p className="text-xs text-gray-500 italic mt-0.5">
                        &ldquo;{extra.observaciones}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Registrado por {extra.auditor_nombre || "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
