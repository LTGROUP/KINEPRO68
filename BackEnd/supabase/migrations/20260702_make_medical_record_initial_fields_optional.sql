alter table public.fichas_medicas
  alter column motivo_consulta drop not null,
  alter column zona_afectada drop not null;
