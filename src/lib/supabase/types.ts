// Tipos generados a mano a partir del esquema SQL de la Auditoría de Tienda.
// Si más adelante corren `supabase gen types typescript`, este archivo se
// puede reemplazar por el generado automáticamente sin tocar el resto del código.

export type EstadoActual =
  | "Instalado-OK"
  | "Instalado-Dañado"
  | "Faltante"
  | "Retirado"
  | "Ubicación incorrecta"
  | "Otro"
  // Se asigna automáticamente (no es un botón del checklist normal) a
  // elementos vencidos: la campaña ya no está "Instalada" pero el elemento
  // sigue físicamente en tienda a la espera de que lo desinstalen.
  | "Vencido - Pendiente de Desinstalación";

export type EstadoHook = "Bueno" | "Dañado" | "Faltante" | "No aplica";

export interface Catalogo {
  id: string;
  nombre: string;
  fecha_carga: string;
  subido_por: string | null;
  activo: boolean;
}

export interface ElementoCatalogo {
  id: string;
  catalogo_id: string;
  tienda: string;
  cadena: string | null;
  ciudad: string | null;
  region: string | null;
  cliente: string | null;
  marca: string | null;
  campana: string | null;
  cod_campana: string | null;
  elemento: string | null;
  tipo_elemento: string | null;
  clasificacion: string | null;
  ubicacion: string | null;
  categoria: string | null;
  foto_instalacion: string | null;
  es_vencido: boolean;
  submotivo_desinstalacion: string | null;
}

export interface Auditoria {
  id: string;
  elemento_id: string;
  catalogo_id: string;
  estado_actual: EstadoActual;
  estado_hook: EstadoHook;
  observaciones: string | null;
  foto_url: string | null;
  foto_url_2: string | null;
  foto_url_3: string | null;
  auditor_nombre: string | null;
  fecha_auditoria: string;
}

// Estructura mínima esperada por el cliente de Supabase (createClient<Database>).
// No es el formato completo generado por la CLI, pero es suficiente para
// tener autocompletado y chequeo de tipos en las consultas .from(...).
export interface Database {
  public: {
    Tables: {
      catalogos: {
        Row: Catalogo;
        Insert: Omit<Catalogo, "id" | "fecha_carga"> & {
          id?: string;
          fecha_carga?: string;
        };
        Update: Partial<Catalogo>;
      };
      elementos_catalogo: {
        Row: ElementoCatalogo;
        Insert: Omit<ElementoCatalogo, "id"> & { id?: string };
        Update: Partial<ElementoCatalogo>;
      };
      auditorias: {
        Row: Auditoria;
        Insert: Omit<Auditoria, "id" | "fecha_auditoria"> & {
          id?: string;
          fecha_auditoria?: string;
        };
        Update: Partial<Auditoria>;
      };
    };
  };
}
