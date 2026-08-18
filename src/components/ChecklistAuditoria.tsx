"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import type { ElementoConEstado } from "@/lib/utils/auditor";
import {
  registrarAuditoria,
  subirFotoAuditoria,
} from "@/lib/utils/auditor";
import { nombreElemento, subtituloElemento } from "@/lib/utils/formatoElemento";
import type { EstadoActual, EstadoHook } from "@/lib/supabase/types";

const MAX_FOTOS = 3;

const OPCIONES_ESTADO_ACTUAL: EstadoActual[] = [
  "Instalado-OK",
  "Instalado-Dañado",
  "Faltante",
  "Ubicación incorrecta",
  "Otro",
];

const OPCIONES_ESTADO_HOOK: EstadoHook[] = [
  "Bueno",
  "Dañado",
  "Faltante",
  "No aplica",
];

// Valores auto-asignados para elementos vencidos (no se le pregunta al
// auditor, ya que el checklist de estos elementos es simplificado).
const ESTADO_ACTUAL_VENCIDO: EstadoActual = "Vencido - Pendiente de Desinstalación";
const ESTADO_HOOK_VENCIDO: EstadoHook = "No aplica";

interface ChecklistAuditoriaProps {
  elemento: ElementoConEstado;
  catalogoId: string;
  tienda: string;
  auditorNombre: string;
  onGuardado: () => void;
  onCancelar: () => void;
}

export function ChecklistAuditoria({
  elemento,
  catalogoId,
  tienda,
  auditorNombre,
  onGuardado,
  onCancelar,
}: ChecklistAuditoriaProps) {
  const esVencido = elemento.es_vencido;

  const [estadoActual, setEstadoActual] = useState<EstadoActual | null>(null);
  const [estadoHook, setEstadoHook] = useState<EstadoHook | null>(null);
  const [fotos, setFotos] = useState<File[]>([]);
  const [previewsFoto, setPreviewsFoto] = useState<string[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function manejarFotos(e: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []).slice(0, MAX_FOTOS);
    if (archivos.length === 0) return;
    setFotos(archivos);
    setPreviewsFoto(archivos.map((archivo) => URL.createObjectURL(archivo)));
  }

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // En elementos vencidos no se pregunta estado/hook: se asignan fijos.
    const estadoActualFinal = esVencido ? ESTADO_ACTUAL_VENCIDO : estadoActual;
    const estadoHookFinal = esVencido ? ESTADO_HOOK_VENCIDO : estadoHook;

    if (!estadoActualFinal || !estadoHookFinal) {
      setError("Selecciona el estado actual y el estado del hook/soporte.");
      return;
    }

    setGuardando(true);
    try {
      const fotoUrls: (string | null)[] = [null, null, null];
      for (let i = 0; i < fotos.length; i++) {
        fotoUrls[i] = await subirFotoAuditoria(fotos[i], tienda, elemento.id, i + 1);
      }

      await registrarAuditoria({
        elementoId: elemento.id,
        catalogoId,
        estadoActual: estadoActualFinal,
        estadoHook: estadoHookFinal,
        observaciones,
        fotoUrls,
        auditorNombre,
      });

      onGuardado();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la auditoría."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarSubmit} className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onCancelar}
          className="text-sm text-gray-500 hover:text-gray-900 mb-3"
        >
          ← Volver a la lista
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {nombreElemento(elemento)}
        </h2>
        {subtituloElemento(elemento) && (
          <p className="text-sm text-gray-500">{subtituloElemento(elemento)}</p>
        )}
        {esVencido ? (
          elemento.submotivo_desinstalacion && (
            <p className="text-xs text-amber-600 mt-0.5">
              {elemento.submotivo_desinstalacion}
            </p>
          )
        ) : (
          elemento.categoria && (
            <p className="text-xs text-gray-400 mt-0.5">{elemento.categoria}</p>
          )
        )}
      </div>

      {esVencido && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          Este elemento está vencido y pendiente de desinstalación. Solo se
          necesita la foto y una observación.
        </p>
      )}

      {elemento.foto_instalacion && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Foto de referencia (cómo debería estar instalado)
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={elemento.foto_instalacion}
            alt="Referencia de instalación"
            className="w-full max-h-64 object-cover rounded-lg border border-gray-200"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      {!esVencido && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Estado actual
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OPCIONES_ESTADO_ACTUAL.map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => setEstadoActual(opcion)}
                  className={`text-sm rounded-lg border px-3 py-2.5 transition-colors ${
                    estadoActual === opcion
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {opcion}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Estado del hook/soporte
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OPCIONES_ESTADO_HOOK.map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => setEstadoHook(opcion)}
                  className={`text-sm rounded-lg border px-3 py-2.5 transition-colors ${
                    estadoHook === opcion
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {opcion}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {esVencido ? "1." : "3."} Foto(s) del elemento (máximo {MAX_FOTOS})
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={manejarFotos}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
        />
        {previewsFoto.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {previewsFoto.map((preview, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={preview}
                alt={`Vista previa ${i + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-gray-200"
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {esVencido ? "2." : "4."} Observaciones
        </label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          placeholder="Opcional"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="w-full bg-gray-900 text-white rounded-lg py-3 font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {guardando ? "Guardando…" : "Guardar auditoría"}
      </button>
    </form>
  );
}
