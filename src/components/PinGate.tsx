"use client";

import { useState, type FormEvent } from "react";
import { LogoHeader } from "@/components/LogoHeader";

interface PinGateProps {
  onDesbloqueado: () => void;
  pinEsperado?: string;
  titulo?: string;
  subtitulo?: string;
}

// El PIN por defecto (panel admin) vive en una variable de entorno.
// Otros módulos (ej. Reportes) pueden pasar su propio pinEsperado por prop.
const PIN_ADMIN_ENV = process.env.NEXT_PUBLIC_ADMIN_PIN ?? "";

export function PinGate({
  onDesbloqueado,
  pinEsperado,
  titulo = "Panel Admin",
  subtitulo = "Auditoría de Tienda",
}: PinGateProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const pinCorrecto = pinEsperado ?? PIN_ADMIN_ENV;

  function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    if (pin === pinCorrecto && pinCorrecto.length > 0) {
      setError(false);
      onDesbloqueado();
    } else {
      setError(true);
      setPin("");
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
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900"
        />

        {error && (
          <p className="text-sm text-red-600 mt-2 text-center">
            PIN incorrecto, intenta de nuevo.
          </p>
        )}

        <button
          type="submit"
          className="w-full mt-6 bg-gray-900 text-white rounded-lg py-2.5 font-medium hover:bg-gray-800 transition-colors"
        >
          Entrar
        </button>
        </form>
      </div>
    </main>
  );
}
