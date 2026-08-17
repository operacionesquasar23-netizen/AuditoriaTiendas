-- es_vencido: true cuando el elemento no tiene STATUS INSTALACION = "Instalado"
-- pero sigue físicamente en tienda (OUT 2 vacío). Estos usan un checklist
-- simplificado (solo foto + observaciones).
alter table elementos_catalogo
  add column if not exists es_vencido boolean not null default false;

-- Motivo del último incidente de desinstalación (columna "Submotivo Ult
-- Inciden Desinstal" del Excel). Se muestra en vez de la categoría cuando
-- el elemento está vencido.
alter table elementos_catalogo
  add column if not exists submotivo_desinstalacion text;
