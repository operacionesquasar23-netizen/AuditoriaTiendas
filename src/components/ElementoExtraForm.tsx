"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { crearElementoExtra, subirFotoAuditoria } from "@/lib/utils/auditor";

interface ElementoExtraFormProps {
  catalogoId: string;
  tienda: string;
  auditorNombre: string;
  onGuardado: () => void;
  onCancelar: () => void;
}

export function ElementoExtraForm({
  catalogoId,
  tienda,
  auditorNombre,
  onGuardado,
  onCancelar,
}: ElementoExtraFormProps) {
  const [nombre, setNombre] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function manejarFoto(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setFoto(archivo);
    setPreviewFoto(URL.createObjectURL(archivo));
  }

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError("Escribe una descripción del elemento.");
      return;
    }

    setGuardando(true);
    try {
      let fotoUrl: string | null = null;
      if (foto) {
        fotoUrl = await subirFotoAuditoria(foto, tienda, `extra-${Date.now()}`);
      }

      await crearElementoExtra({
        catalogoId,
        tienda,
        nombre: nombre.trim(),
        fotoUrl,
        observaciones,
        auditorNombre,
      });

      onGuardado();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo registrar el elemento."
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
          Elemento no listado
        </h2>
        <p className="text-sm text-gray-500">
          Encontraste algo en tienda que no aparece en el catálogo.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          1. Descripción
        </label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Exhibidor de piso Coca-Cola"
          autoFocus
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          2. Foto
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={manejarFoto}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
        />
        {previewFoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewFoto}
            alt="Vista previa"
            className="mt-3 w-full max-h-64 object-cover rounded-lg border border-gray-200"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          3. Observaciones
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
        {guardando ? "Guardando…" : "Registrar elemento"}
      </button>
    </form>
  );
}
