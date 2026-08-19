"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

type EstadoConexion = "cargando" | "ok" | "error";

export default function Home() {
  const [estado, setEstado] = useState<EstadoConexion>("cargando");
  const [catalogoActivo, setCatalogoActivo] = useState<string | null>(null);

  useEffect(() => {
    async function probarConexion() {
      const { data, error } = await supabase
        .from("catalogos")
        .select("nombre")
        .eq("activo", true)
        .limit(1)
        .maybeSingle<{ nombre: string }>();

      if (error) {
        setEstado("error");
        return;
      }
      setEstado("ok");
      setCatalogoActivo(data?.nombre ?? null);
    }
    probarConexion();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header + Hero unificado */}
      <div
        className="relative overflow-hidden text-white"
        style={{
          backgroundImage: "url('/mao-header.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative z-10 px-6 py-5">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <div className="relative w-14 h-14 shrink-0">
              <Image src="/logo.png" alt="Quasar Logo" fill className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Quasar</h1>
              <p className="text-blue-200 text-sm">Sistema de Auditoría de Tienda</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-6 pt-4 pb-16">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-3">AUDITORÍA</h1>
            <p className="text-blue-200 text-lg">
              Verifica los elementos POP instalados en tienda
            </p>
            <p className="text-blue-300/70 text-xs mt-4">
              {estado === "cargando" && "Conectando…"}
              {estado === "ok" &&
                (catalogoActivo
                  ? `Catálogo activo: ${catalogoActivo}`
                  : "Sin catálogo activo")}
              {estado === "error" && "⚠ Sin conexión a la base de datos"}
            </p>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 -mt-8 pb-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a
            href="/auditor"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-100 transition-colors">
              📋
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Iniciar Auditoría
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Verifica los elementos POP instalados en tu tienda.
            </p>
            <span className="text-xs font-semibold text-blue-700 group-hover:text-blue-800">
              Ir al formulario →
            </span>
          </a>

          <a
            href="/reportes"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group"
          >
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-amber-100 transition-colors">
              📑
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Reportes
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Busca una tienda y descarga su Excel o PDF de auditoría.
            </p>
            <span className="text-xs font-semibold text-amber-700 group-hover:text-amber-800">
              Ver reportes →
            </span>
          </a>

          <a
            href="/dashboard"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group"
          >
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-green-100 transition-colors">
              📊
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Dashboard
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Métricas de avance y cumplimiento de la auditoría.
            </p>
            <span className="text-xs font-semibold text-green-700 group-hover:text-green-800">
              Ver métricas →
            </span>
          </a>

          <a
            href="/admin"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group"
          >
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-purple-100 transition-colors">
              ⚙️
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Panel Admin
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Carga el Consolidado y administra los catálogos.
            </p>
            <span className="text-xs font-semibold text-purple-700 group-hover:text-purple-800">
              Acceder al panel →
            </span>
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto bg-white border-t border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-400">© 2026 Quasar · Auditoría de Tienda</p>
          <div className="flex items-center gap-4">
            <a href="/auditor" className="text-xs text-gray-400 hover:text-blue-700">
              Auditor
            </a>
            <a href="/admin" className="text-xs text-gray-400 hover:text-blue-700">
              Admin
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
