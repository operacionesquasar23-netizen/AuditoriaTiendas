-- Habilitar RLS explícitamente (si no lo estaba ya) y agregar políticas
-- para el rol `anon`, que es el que usa la app a través de la
-- publishable/anon key. El control de acceso real de "quién puede subir
-- catálogos" lo da el PIN del panel admin (a nivel de app), no RLS —
-- por eso aquí permitimos select/insert/update abiertos a anon.

alter table catalogos enable row level security;
alter table elementos_catalogo enable row level security;
alter table auditorias enable row level security;

-- catalogos: leer todos, insertar (carga de Excel), actualizar (archivar el anterior)
create policy "anon puede leer catalogos"
  on catalogos for select
  to anon
  using (true);

create policy "anon puede crear catalogos"
  on catalogos for insert
  to anon
  with check (true);

create policy "anon puede archivar catalogos"
  on catalogos for update
  to anon
  using (true)
  with check (true);

-- elementos_catalogo: leer todos, insertar (carga de Excel)
create policy "anon puede leer elementos_catalogo"
  on elementos_catalogo for select
  to anon
  using (true);

create policy "anon puede crear elementos_catalogo"
  on elementos_catalogo for insert
  to anon
  with check (true);

-- auditorias: leer todas, insertar (el auditor registra su checklist).
-- No hay policy de update/delete a propósito: las auditorías son
-- append-only, nunca se modifican ni se borran.
create policy "anon puede leer auditorias"
  on auditorias for select
  to anon
  using (true);

create policy "anon puede crear auditorias"
  on auditorias for insert
  to anon
  with check (true);

-- Storage: el bucket `auditoria-fotos` debe existir y estar marcado como
-- público (para que las fotos se puedan ver con getPublicUrl). Estas
-- políticas permiten que el rol anon (la app) suba y lea archivos en él.
create policy "anon puede subir fotos de auditoria"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'auditoria-fotos');

create policy "anon puede leer fotos de auditoria"
  on storage.objects for select
  to anon
  using (bucket_id = 'auditoria-fotos');
