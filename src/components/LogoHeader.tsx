import Image from "next/image";

interface LogoHeaderProps {
  titulo: string;
  subtitulo?: string;
  mostrarInicio?: boolean;
}

/** Barra de navegación de módulo: logo + título/subtítulo + botón volver a Inicio. */
export function LogoHeader({ titulo, subtitulo, mostrarInicio = true }: LogoHeaderProps) {
  return (
    <div className="bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 shrink-0">
            <Image src="/logo.png" alt="Quasar Logo" fill className="object-contain rounded-full" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">{titulo}</h1>
            {subtitulo && (
              <p className="text-xs text-blue-300 leading-tight">{subtitulo}</p>
            )}
          </div>
        </div>

        {mostrarInicio && (
          <a
            href="/"
            className="text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition-colors shrink-0"
          >
            ← Inicio
          </a>
        )}
      </div>
    </div>
  );
}
