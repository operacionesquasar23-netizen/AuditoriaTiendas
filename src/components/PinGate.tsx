"use client";

import { useState, type FormEvent } from "react";
import { LogoHeader } from "@/components/LogoHeader";

interface PinGateProps {
  onDesbloqueado: () => void;
  modulo: "admin" | "reportes";
  titulo?: string;
  subtitulo?: string;
}

export function PinGate({
  onDesbloqueado,
  modulo,
  titulo = "Panel Admin",
  subtitulo = "Auditoría de Tienda",
}: PinGateProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [verificando, setVerificando] = useState(false);

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    setVerificando(true);
    setError(false);
    try {
      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modulo, pin }),
      });
      const data = await res.json();
      if (data.ok) {
        onDesbloqueado();
      } else {
        setError(true);
        setPin("");
      }
    } catch {
      setError(true);
    } finally {
      setVerificando(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <LogoHeader titulo={titulo} subtitulo={subtitulo} mostrarInicio={false} />
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <form
          onSubmit={manejarSubmit}
          className="max-w-sm w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8"
        >
          <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
            PIN de acceso
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
            disabled={verificando}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
          />

          {error && (
            <p className="text-sm text-red-600 mt-2 text-center">
              PIN incorrecto, intenta de nuevo.
            </p>
          )}

          <button
            type="submit"
            disabled={verificando}
            className="w-full mt-6 bg-gray-900 text-white rounded-lg py-2.5 font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {verificando ? "Verificando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}