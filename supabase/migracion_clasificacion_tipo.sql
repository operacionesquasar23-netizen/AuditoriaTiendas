-- Agrega las columnas para clasificación (Livianos/Muebles/Revestimientos)
-- y el tipo de elemento específico (ej. "Jalavista Diferenciado", más
-- específico que ELEMENTO "Jalavista").
alter table elementos_catalogo
  add column if not exists clasificacion text;

alter table elementos_catalogo
  add column if not exists tipo_elemento text;
