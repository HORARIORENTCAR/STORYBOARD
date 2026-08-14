-- ============================================================================
-- AVISOS AL CELULAR (notificaciones push)
--
-- Guarda el "permiso de aviso" que cada persona concede desde cada uno de sus
-- dispositivos. Un mismo colaborador puede tener varios: su celular, su tablet
-- y la computadora del colegio. Cada uno se guarda por separado.
--
-- Ejecutar una sola vez en Supabase → SQL Editor.
-- ============================================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,           -- dirección única que da el navegador
  p256dh      text not null,                  -- claves de cifrado del dispositivo
  auth        text not null,
  user_agent  text,                           -- para reconocer el aparato en la lista
  created_at  timestamptz not null default now(),
  last_used   timestamptz
);

create index if not exists push_subs_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Cada quien ve y administra solo sus propios dispositivos.
drop policy if exists "push_ver_lo_mio" on public.push_subscriptions;
create policy "push_ver_lo_mio" on public.push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "push_guardar_lo_mio" on public.push_subscriptions;
create policy "push_guardar_lo_mio" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "push_borrar_lo_mio" on public.push_subscriptions;
create policy "push_borrar_lo_mio" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "push_actualizar_lo_mio" on public.push_subscriptions;
create policy "push_actualizar_lo_mio" on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid());

-- El envío lo hace el servidor con la clave de servicio, que no pasa por estas
-- reglas: necesita leer los dispositivos de TODO el equipo para poder avisar.

-- ----------------------------------------------------------------------------
-- Preferencia por persona: poder apagar los avisos sin desinstalar nada.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists push_activo boolean not null default true;
