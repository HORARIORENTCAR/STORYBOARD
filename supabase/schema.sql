-- ============================================================================
-- STAFF BOARD — esquema de base de datos en Supabase (Postgres)
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- ============================================================================
create extension if not exists "pgcrypto"; -- para gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 1. PERFILES (uno por cada auth.users, creado automáticamente al invitar)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'member' check (role in ('admin','member')),
  title text,
  area text,
  status text not null default 'invited' check (status in ('active','invited')),
  initials text not null default '',
  color text not null default '#146942',
  joined_at date not null default current_date
);

-- ----------------------------------------------------------------------------
-- 2. CONFIGURACIÓN INSTITUCIONAL (una sola fila)
-- ----------------------------------------------------------------------------
create table if not exists public.institution_settings (
  id boolean primary key default true check (id),
  name text not null default 'CARACOLI GLOBAL SCHOOL',
  domain text not null default 'colegio.edu.do',
  school_year text not null default '2026-2027',
  timezone text not null default 'Santo Domingo (UTC-4)',
  cancel_window_minutes int not null default 1,
  archive_after_days int not null default 30,
  require_evidence boolean not null default true,
  notify_deadline boolean not null default true
);
insert into public.institution_settings (id) values (true) on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 3. EVENTOS
-- ----------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  cover_emoji text not null default '📌',
  color text not null default 'brand',
  created_date date not null default current_date,
  event_date date not null,
  due_date date,
  status text not null default 'borrador' check (status in ('borrador','publicado','finalizado','archivado')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. TAREAS DE UN EVENTO
-- ----------------------------------------------------------------------------
create table if not exists public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text not null default '',
  color text not null default 'brand',
  priority text not null default 'media' check (priority in ('baja','media','alta')),
  status text not null default 'sin_iniciar' check (status in ('sin_iniciar','en_proceso','terminada')),
  due_date date not null,
  max_collaborators int not null default 1,
  slots jsonb not null default '[]',       -- [{ userId, claimedAt }]
  requires_leader boolean not null default false,
  leader_id uuid references public.profiles(id),
  waitlist jsonb not null default '[]',    -- [userId, ...] en orden de llegada
  evidence jsonb not null default '[]',
  attachments jsonb not null default '[]',
  archived boolean not null default false,
  deadline_notified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. CHAT DE CADA TAREA (solo el equipo de esa tarea puede leer/escribir)
-- ----------------------------------------------------------------------------
create table if not exists public.task_chat_messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.event_tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  text text not null,
  reactions jsonb not null default '{}',   -- { "👍": [userId,...], ... }
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. NOTIFICACIONES (institucionales o dirigidas a personas específicas)
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text not null,
  audience_all boolean not null default false,
  audience_users jsonb not null default '[]', -- [userId, ...] cuando audience_all = false
  created_at timestamptz not null default now()
);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 7. CALENDARIO INSTITUCIONAL
-- ----------------------------------------------------------------------------
create table if not exists public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  kind text not null check (kind in ('evento','fecha','valor','reunion','capacitacion','informe')),
  location text,
  time text,
  motto text
);

-- ----------------------------------------------------------------------------
-- 8. HISTORIAL DE ACTIVIDAD
-- ----------------------------------------------------------------------------
create table if not exists public.history_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  detail text not null,
  type text not null check (type in ('Evento','Tarea','Configuración','Calendario','Equipo')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- FUNCIONES DE APOYO PARA LOS PERMISOS (RLS)
-- ============================================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_see_event(p_status text, p_created_by uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_status = 'publicado' or p_created_by = auth.uid() or public.is_admin();
$$;

create or replace function public.is_task_member(p_task_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  t record;
  e record;
begin
  select * into t from public.event_tasks where id = p_task_id;
  if not found then return false; end if;
  if public.is_admin() then return true; end if;
  select * into e from public.events where id = t.event_id;
  if e.created_by = auth.uid() then return true; end if;
  if t.leader_id = auth.uid() then return true; end if;
  return exists (
    select 1 from jsonb_array_elements(t.slots) s
    where (s->>'userId') = auth.uid()::text
  );
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.institution_settings enable row level security;
alter table public.events enable row level security;
alter table public.event_tasks enable row level security;
alter table public.task_chat_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.calendar_entries enable row level security;
alter table public.history_log enable row level security;

-- profiles: todo el personal autenticado puede ver el directorio; cada quien edita lo suyo (o el admin)
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_self_or_admin" on public.profiles for update using (auth.uid() = id or public.is_admin());
create policy "profiles_delete_admin" on public.profiles for delete using (public.is_admin());

-- institution_settings: lectura para todos, edición solo admin
create policy "settings_select_all" on public.institution_settings for select using (true);
create policy "settings_update_admin" on public.institution_settings for update using (public.is_admin());

-- events: capa Muro (publicado) + Mi espacio (propio) + Admin (todo)
create policy "events_select" on public.events for select
  using (public.can_see_event(status, created_by));
create policy "events_insert_own" on public.events for insert
  with check (created_by = auth.uid());
create policy "events_update_owner_or_admin" on public.events for update
  using (created_by = auth.uid() or public.is_admin());
create policy "events_delete_owner_or_admin" on public.events for delete
  using (created_by = auth.uid() or public.is_admin());

-- event_tasks: visibles si el evento padre es visible; CRUD de la tarea en sí, solo dueño/admin
--   (las acciones de inscribirse/chat/evidencia pasan por funciones RPC más abajo)
create policy "tasks_select" on public.event_tasks for select
  using (exists (
    select 1 from public.events e where e.id = event_tasks.event_id
    and public.can_see_event(e.status, e.created_by)
  ));
create policy "tasks_insert_owner_or_admin" on public.event_tasks for insert
  with check (exists (
    select 1 from public.events e where e.id = event_tasks.event_id
    and (e.created_by = auth.uid() or public.is_admin())
  ));
create policy "tasks_update_owner_or_admin" on public.event_tasks for update
  using (exists (
    select 1 from public.events e where e.id = event_tasks.event_id
    and (e.created_by = auth.uid() or public.is_admin())
  ));
create policy "tasks_delete_owner_or_admin" on public.event_tasks for delete
  using (exists (
    select 1 from public.events e where e.id = event_tasks.event_id
    and (e.created_by = auth.uid() or public.is_admin())
  ));

-- task_chat_messages: solo el equipo de la tarea (inscritos, líder, dueño del evento, admin)
create policy "chat_select_team" on public.task_chat_messages for select
  using (public.is_task_member(task_id));
create policy "chat_insert_team" on public.task_chat_messages for insert
  with check (public.is_task_member(task_id) and author_id = auth.uid());
create policy "chat_update_own_reaction" on public.task_chat_messages for update
  using (public.is_task_member(task_id));

-- notifications: solo ve lo que le corresponde
create policy "notif_select_mine" on public.notifications for select
  using (audience_all or (audience_users ? auth.uid()::text));
create policy "notif_insert_admin_or_system" on public.notifications for insert
  with check (true); -- el envío real ocurre dentro de funciones RPC (security definer)

create policy "notif_reads_own" on public.notification_reads for select using (user_id = auth.uid());
create policy "notif_reads_insert_own" on public.notification_reads for insert with check (user_id = auth.uid());

-- calendar_entries: lectura para todos, edición solo admin
create policy "calendar_select_all" on public.calendar_entries for select using (true);
create policy "calendar_write_admin" on public.calendar_entries for insert with check (public.is_admin());
create policy "calendar_update_admin" on public.calendar_entries for update using (public.is_admin());
create policy "calendar_delete_admin" on public.calendar_entries for delete using (public.is_admin());

-- history_log: lectura para todo el personal (transparencia institucional)
create policy "history_select_all" on public.history_log for select using (true);
create policy "history_insert_self" on public.history_log for insert with check (user_id = auth.uid());

-- ============================================================================
-- FUNCIONES RPC — todas las acciones que modifican tareas pasan por aquí
-- (evita condiciones de carrera: dos personas no pueden tomar el mismo cupo)
-- ============================================================================

create or replace function public.claim_slot(p_task_id uuid, p_slot_index int)
returns void language plpgsql security definer set search_path = public as $$
declare t record; slots jsonb; already boolean;
begin
  select * into t from public.event_tasks where id = p_task_id for update;
  if not found then raise exception 'Tarea no encontrada'; end if;
  already := exists(select 1 from jsonb_array_elements(t.slots) s where (s->>'userId') = auth.uid()::text);
  if already then raise exception 'Ya estás inscrito en esta tarea'; end if;
  if (t.slots->p_slot_index->>'userId') is not null then raise exception 'Ese cupo ya está ocupado'; end if;
  slots := jsonb_set(t.slots, array[p_slot_index::text],
             jsonb_build_object('userId', auth.uid()::text, 'claimedAt', to_jsonb(now())));
  update public.event_tasks set slots = slots where id = p_task_id;
  insert into public.history_log (user_id, action, detail, type)
    values (auth.uid(), 'se inscribió en', t.name, 'Tarea');
end;
$$;

create or replace function public.cancel_slot(p_task_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t record; slots jsonb; waitlist jsonb; promoted text; free_idx int;
begin
  select * into t from public.event_tasks where id = p_task_id for update;
  if not found then raise exception 'Tarea no encontrada'; end if;
  select jsonb_agg(case when (s->>'userId') = auth.uid()::text
                        then jsonb_build_object('userId', null, 'claimedAt', null) else s end)
    into slots
    from jsonb_array_elements(t.slots) s;
  waitlist := t.waitlist;
  promoted := waitlist->>0;
  if promoted is not null then
    select min(ord) into free_idx
      from jsonb_array_elements(slots) with ordinality as x(s, ord)
      where (x.s->>'userId') is null;
    if free_idx is not null then
      slots := jsonb_set(slots, array[(free_idx-1)::text],
                 jsonb_build_object('userId', promoted, 'claimedAt', to_jsonb(now())));
      waitlist := waitlist - 0;
    else
      promoted := null;
    end if;
  end if;
  update public.event_tasks set slots = slots, waitlist = waitlist where id = p_task_id;
  insert into public.history_log (user_id, action, detail, type)
    values (auth.uid(), 'canceló su inscripción en', t.name, 'Tarea');
  if promoted is not null then
    insert into public.notifications (title, detail, audience_all, audience_users)
      values ('Entraste desde la lista de espera',
              'Se liberó un lugar en ' || t.name || ' y ahora formas parte del equipo',
              false, jsonb_build_array(promoted));
  end if;
end;
$$;

create or replace function public.join_waitlist(p_task_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t record;
begin
  select * into t from public.event_tasks where id = p_task_id for update;
  if not found then raise exception 'Tarea no encontrada'; end if;
  if t.waitlist ? auth.uid()::text then return; end if;
  update public.event_tasks set waitlist = t.waitlist || to_jsonb(auth.uid()::text) where id = p_task_id;
  insert into public.history_log (user_id, action, detail, type)
    values (auth.uid(), 'se apuntó a la lista de espera de', t.name, 'Tarea');
end;
$$;

create or replace function public.leave_waitlist(p_task_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t record; new_wait jsonb;
begin
  select * into t from public.event_tasks where id = p_task_id for update;
  if not found then raise exception 'Tarea no encontrada'; end if;
  select coalesce(jsonb_agg(w), '[]'::jsonb) into new_wait
    from jsonb_array_elements_text(t.waitlist) w where w <> auth.uid()::text;
  update public.event_tasks set waitlist = new_wait where id = p_task_id;
end;
$$;

create or replace function public.set_exec_status(p_task_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare t record; require_evidence boolean; has_evidence boolean; ev record; audience jsonb;
begin
  select * into t from public.event_tasks where id = p_task_id for update;
  if not found then raise exception 'Tarea no encontrada'; end if;
  select institution_settings.require_evidence into require_evidence from public.institution_settings;
  has_evidence := jsonb_array_length(t.evidence) + jsonb_array_length(t.attachments) > 0;
  if p_status = 'terminada' and require_evidence and not has_evidence then
    raise exception 'Se requiere al menos una evidencia para marcar esta tarea como terminada';
  end if;
  update public.event_tasks set status = p_status where id = p_task_id;
  select * into ev from public.events where id = t.event_id;
  select coalesce(jsonb_agg(distinct v), '[]'::jsonb) into audience from (
    select (s->>'userId') as v from jsonb_array_elements(t.slots) s where (s->>'userId') is not null
    union select t.leader_id::text where t.leader_id is not null
    union select ev.created_by::text
  ) x(v);
  insert into public.history_log (user_id, action, detail, type)
    values (auth.uid(), 'cambió el estado de', t.name || ' → ' || replace(p_status, '_', ' '), 'Tarea');
  insert into public.notifications (title, detail, audience_all, audience_users)
    values ('Cambio de estado', t.name || ' pasó a ' || replace(p_status, '_', ' '), false, audience);
end;
$$;

create or replace function public.add_chat_message(p_task_id uuid, p_text text)
returns public.task_chat_messages language plpgsql security definer set search_path = public as $$
declare row_out public.task_chat_messages;
begin
  if not public.is_task_member(p_task_id) then
    raise exception 'Solo el equipo de esta tarea puede escribir en el chat';
  end if;
  insert into public.task_chat_messages (task_id, author_id, text)
    values (p_task_id, auth.uid(), p_text)
    returning * into row_out;
  return row_out;
end;
$$;

create or replace function public.toggle_reaction(p_message_id uuid, p_emoji text)
returns void language plpgsql security definer set search_path = public as $$
declare m record; current_ids jsonb; has_it boolean; next_ids jsonb;
begin
  select * into m from public.task_chat_messages where id = p_message_id for update;
  if not found then raise exception 'Mensaje no encontrado'; end if;
  if not public.is_task_member(m.task_id) then raise exception 'Sin permiso'; end if;
  current_ids := coalesce(m.reactions->p_emoji, '[]'::jsonb);
  has_it := current_ids ? auth.uid()::text;
  if has_it then
    select coalesce(jsonb_agg(v), '[]'::jsonb) into next_ids
      from jsonb_array_elements_text(current_ids) v where v <> auth.uid()::text;
  else
    next_ids := current_ids || to_jsonb(auth.uid()::text);
  end if;
  update public.task_chat_messages set reactions = jsonb_set(reactions, array[p_emoji], next_ids)
    where id = p_message_id;
end;
$$;

create or replace function public.add_evidence(p_task_id uuid, p_name text, p_type text)
returns void language plpgsql security definer set search_path = public as $$
declare t record; item jsonb;
begin
  select * into t from public.event_tasks where id = p_task_id for update;
  if not found then raise exception 'Tarea no encontrada'; end if;
  item := jsonb_build_object('id', gen_random_uuid()::text, 'type', p_type, 'name', p_name,
            'uploadedBy', auth.uid()::text, 'uploadedAt', to_jsonb(now()));
  if p_type = 'image' then
    update public.event_tasks set evidence = evidence || jsonb_build_array(item) where id = p_task_id;
  else
    update public.event_tasks set attachments = attachments || jsonb_build_array(item) where id = p_task_id;
  end if;
  insert into public.history_log (user_id, action, detail, type)
    values (auth.uid(), case when p_type = 'image' then 'agregó una fotografía en' else 'agregó un documento en' end,
            t.name, 'Tarea');
end;
$$;

-- notificación institucional (usada al publicar un evento, etc.)
create or replace function public.notify(p_title text, p_detail text, p_audience_all boolean, p_audience_users uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (title, detail, audience_all, audience_users)
    values (p_title, p_detail, p_audience_all,
            coalesce((select jsonb_agg(u::text) from unnest(p_audience_users) u), '[]'::jsonb));
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.notification_reads (notification_id, user_id)
  values (p_notification_id, auth.uid())
  on conflict do nothing;
$$;

-- ============================================================================
-- REALTIME: publicar los cambios de estas tablas a los clientes conectados
-- ============================================================================
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_tasks;
alter publication supabase_realtime add table public.task_chat_messages;
alter publication supabase_realtime add table public.notifications;

-- ============================================================================
-- Tarea automática opcional (requiere la extensión pg_cron, disponible en
-- Supabase desde Database → Extensions). Corre el barrido de archivado y
-- avisos de vencimiento cada noche a la 1:00 am.
-- ============================================================================
-- select cron.schedule('archivar-tareas-vencidas', '0 1 * * *',
--   $$ update public.event_tasks set archived = true
--      where archived = false and status <> 'terminada'
--      and (current_date - due_date) > (select archive_after_days from public.institution_settings); $$);
