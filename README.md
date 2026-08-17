# Auditoría de Tienda — Quasar BTL

App para que auditores de campo verifiquen desde su teléfono qué elementos POP
están instalados en cada tienda, registrando estado del elemento, estado del
hook/soporte, foto y observaciones.

## Estado del proyecto

- ✅ **Módulo 1** — Esqueleto Next.js + conexión a Supabase (este commit)
- ⬜ **Módulo 2** — Panel admin de carga de Excel (SheetJS → Supabase)
- ⬜ **Módulo 3** — Flujo del auditor (checklist + foto)
- ⬜ **Módulo 4** — Exportación e historial

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Storage)
- SheetJS (`xlsx`) para parsear el Consolidado en el navegador

## Setup local

```bash
npm install
npm run dev
```

La app necesita las variables de entorno de Supabase en `.env.local`
(ya incluido en este proyecto, **no se sube a Git** por el `.gitignore`):

```
NEXT_PUBLIC_SUPABASE_URL=https://kpsxzsrhrsgbslhvyvfz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Al abrir `http://localhost:3000` deberías ver una tarjeta de estado:
- ✅ verde si la conexión con Supabase funciona (aunque no haya catálogo cargado aún)
- ❌ roja con el mensaje de error si algo falla (revisar RLS, credenciales, o que el SQL se haya corrido)

## Estructura

```
src/
  app/
    page.tsx          → home / prueba de conexión (se reemplazará por routing real)
    admin/             → módulo 2: panel de carga de Excel (pendiente)
    auditor/            → módulo 3: flujo del auditor (pendiente)
    historial/          → módulo 4: historial y exportación (pendiente)
  components/          → componentes compartidos
  lib/
    supabase/
      client.ts        → cliente único de Supabase (usa la anon/publishable key)
      types.ts          → tipos TS a mano del esquema SQL (catalogos, elementos_catalogo, auditorias)
    utils/               → utilidades compartidas (pendiente)
```

## Notas de seguridad

- La `anon`/`publishable` key es pública y segura de exponer en el navegador
  siempre que las políticas de **Row Level Security (RLS)** en Supabase estén
  bien configuradas. **Pendiente**: revisar/crear políticas RLS para las tablas
  `catalogos`, `elementos_catalogo` y `auditorias` antes de pasar a producción
  (por ahora, si RLS está activo por defecto, las consultas fallarán hasta
  que se agreguen políticas de `select`/`insert`).
- El PIN del panel admin y cualquier lógica de "solo admin puede insertar
  catálogos" se resuelve en el módulo 2, junto con las políticas RLS de
  `insert` en `catalogos` y `elementos_catalogo`.
