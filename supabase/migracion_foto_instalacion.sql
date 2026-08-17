-- Agrega la columna con el link a la foto de referencia (columna
-- "FOTO INSTALACIÓN" del Consolidado), para mostrarla al auditor como
-- referencia de cómo debería estar instalado el elemento.
alter table elementos_catalogo
  add column if not exists foto_instalacion text;
