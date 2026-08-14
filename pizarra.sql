-- ============================================================================
-- PIZARRA DE ASIGNACIONES
--
-- Es la versión digital de la hoja de papel: una pizarra por actividad, con
-- una fila por cada curso del colegio y lo que le toca a cada uno.
--
--   Pizarra: "Acto de Navidad", 12 de diciembre, sesión de la mañana
--     ├─ Párvulo      → comprar refresco   · cuenta 0229.23 · ayudante Ana   [hecho]
--     ├─ PreKinder    → ...
--     └─ (los quince cursos)
--
-- El nombre del curso se guarda EN la fila, no en una tabla aparte, para que
-- si mañana el colegio cambia los cursos, las pizarras viejas sigan contando
-- la verdad de lo que pasó ese día.
--
-- Ejecutar una sola vez en Supabase → SQL Editor.
-- ============================================================================

create table if not exists public.pizarras (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        date,
  session     text,                      -- "Mañana", "Tarde", "Sesión 2"...
  notes       text,
  status      text not null default 'abierta' check (status in ('abierta','cerrada')),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.pizarra_filas (
  id          uuid primary key default gen_random_uuid(),
  pizarra_id  uuid not null references public.pizarras(id) on delete cascade,
  curso       text not null,
  orden       int not null default 0,
  asignacion  text,
  presupuesto text,                      -- "Cuenta / presupuesto" de la hoja
  ayudante    text,                      -- "Ayudante / colaborador"
  hecho       boolean not null default false,
  hecho_por   uuid references public.profiles(id) on delete set null,
  hecho_at    timestamptz
);

create index if not exists pizarra_filas_pizarra on public.pizarra_filas(pizarra_id);

alter table public.pizarras enable row level security;
alter table public.pizarra_filas enable row level security;

-- Ver: todo el personal. Una pizarra es información común, como la de la pared.
drop policy if exists "pizarras_ver" on public.pizarras;
create policy "pizarras_ver" on public.pizarras for select using (true);

drop policy if exists "pizarra_filas_ver" on public.pizarra_filas;
create policy "pizarra_filas_ver" on public.pizarra_filas for select using (true);

-- Crear y administrar la pizarra: administración y quien la creó.
drop policy if exists "pizarras_crear" on public.pizarras;
create policy "pizarras_crear" on public.pizarras for insert to authenticated
  with check (created_by = auth.uid() and public.is_admin());

drop policy if exists "pizarras_editar" on public.pizarras;
create policy "pizarras_editar" on public.pizarras for update to authenticated
  using (created_by = auth.uid() or public.is_admin());

drop policy if exists "pizarras_borrar" on public.pizarras;
create policy "pizarras_borrar" on public.pizarras for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- Las filas se crean junto con la pizarra, por quien puede administrarla.
drop policy if exists "pizarra_filas_crear" on public.pizarra_filas;
create policy "pizarra_filas_crear" on public.pizarra_filas for insert to authenticated
  with check (exists (
    select 1 from public.pizarras p
     where p.id = pizarra_id and (p.created_by = auth.uid() or public.is_admin())
  ));

-- ----------------------------------------------------------------------------
-- Quién puede escribir qué, dentro de una fila.
--
-- Escribir la asignación, la cuenta y el ayudante: solo quien administra.
-- Marcarla como hecha: cualquiera del personal, porque quien la ejecuta es
-- quien sabe que ya está lista. Igual que en la hoja de papel, donde escribe
-- la coordinación pero el tache lo pone quien hizo el mandado.
-- ----------------------------------------------------------------------------

drop function if exists public.pizarra_guardar_fila(uuid, text, text, text);
create function public.pizarra_guardar_fila(
  p_fila uuid,
  p_asignacion text,
  p_presupuesto text,
  p_ayudante text
) returns public.pizarra_filas language plpgsql security definer set search_path = public as $$
declare fila public.pizarra_filas; puede boolean;
begin
  select exists (
    select 1 from public.pizarra_filas f
      join public.pizarras p on p.id = f.pizarra_id
     where f.id = p_fila and (p.created_by = auth.uid() or public.is_admin())
  ) into puede;
  if not puede then
    raise exception 'Solo quien creó la pizarra o la administración pueden escribir en ella';
  end if;

  update public.pizarra_filas
     set asignacion = p_asignacion,
         presupuesto = p_presupuesto,
         ayudante = p_ayudante
   where id = p_fila
   returning * into fila;
  return fila;
end;
$$;

drop function if exists public.pizarra_marcar(uuid, boolean);
create function public.pizarra_marcar(p_fila uuid, p_hecho boolean)
returns public.pizarra_filas language plpgsql security definer set search_path = public as $$
declare fila public.pizarra_filas; cerrada boolean;
begin
  select p.status = 'cerrada' into cerrada
    from public.pizarra_filas f join public.pizarras p on p.id = f.pizarra_id
   where f.id = p_fila;

  if cerrada then
    raise exception 'Esta pizarra ya está cerrada';
  end if;

  update public.pizarra_filas
     set hecho = p_hecho,
         hecho_por = case when p_hecho then auth.uid() else null end,
         hecho_at  = case when p_hecho then now() else null end
   where id = p_fila
   returning * into fila;
  return fila;
end;
$$;

-- Avisos en tiempo real, para que la pizarra se actualice sola en todas las pantallas.
alter publication supabase_realtime add table public.pizarras;
alter publication supabase_realtime add table public.pizarra_filas;
