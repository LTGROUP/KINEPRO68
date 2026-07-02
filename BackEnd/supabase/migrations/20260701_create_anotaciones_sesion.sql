create table if not exists public.anotaciones_sesion (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.profiles(id) on delete cascade,
  profesional_id uuid not null references public.profiles(id) on delete restrict,
  profesional_nombre text not null,
  fecha_sesion date not null,
  actividad_realizada text not null,
  evolucion text not null,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create index if not exists idx_anotaciones_sesion_paciente_id
  on public.anotaciones_sesion (paciente_id);

create index if not exists idx_anotaciones_sesion_fecha
  on public.anotaciones_sesion (fecha_sesion desc);
