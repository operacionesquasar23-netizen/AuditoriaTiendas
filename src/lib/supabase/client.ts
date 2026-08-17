import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// Cliente único para usar en componentes de cliente ("use client").
// Esta es la clave "publishable"/"anon": es pública y segura de exponer
// en el navegador porque las políticas de RLS en Supabase controlan el acceso real.
//
// Nota: no se usa el genérico `Database` de supabase-js aquí porque la forma
// estricta que exige esta versión (Relationships, schemas anidados, etc.)
// no vale la pena mantener a mano para 3 tablas. Los tipos de dominio en
// `./types` (Catalogo, ElementoCatalogo, Auditoria) se usan igual para tipar
// los datos que entran y salen de cada consulta.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
