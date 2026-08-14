-- ============================================================================
-- ARREGLO: no se podían eliminar personas del equipo
-- Causa: si alguien tenía mensajes de chat, historial o era líder de una tarea,
-- la base de datos bloqueaba el borrado sin avisar con claridad.
-- Al eliminar, esas referencias quedan sin dueño: el mensaje y el historial se
-- conservan, y la tarea simplemente se queda sin líder.
-- ============================================================================

alter table public.event_tasks drop constraint if exists event_tasks_leader_id_fkey;
alter table public.event_tasks
  add constraint event_tasks_leader_id_fkey
  foreign key (leader_id) references public.profiles(id) on delete set null;

alter table public.task_chat_messages alter column author_id drop not null;
alter table public.task_chat_messages drop constraint if exists task_chat_messages_author_id_fkey;
alter table public.task_chat_messages
  add constraint task_chat_messages_author_id_fkey
  foreign key (author_id) references public.profiles(id) on delete set null;

alter table public.history_log drop constraint if exists history_log_user_id_fkey;
alter table public.history_log
  add constraint history_log_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

-- ============================================================================
-- Elimina a una persona dejando todo limpio.
-- Los permisos ya se validan en el servidor, por eso recibe quién lo pide.
-- ============================================================================
create or replace function public.eliminar_persona(p_user_id uuid, p_solicitante uuid)
returns void language plpgsql security definer set search_path = public as $$
declare admins_restantes int; objetivo record; solicitante record;
begin
  select * into solicitante from public.profiles where id = p_solicitante;
  if not found or solicitante.role <> 'admin' then
    raise exception 'Solo un administrador puede eliminar personas';
  end if;
  if p_user_id = p_solicitante then
    raise exception 'No puedes eliminar tu propia cuenta';
  end if;

  select * into objetivo from public.profiles where id = p_user_id;
  if not found then raise exception 'Esa persona ya no existe'; end if;

  if objetivo.role = 'admin' then
    select count(*) into admins_restantes from public.profiles where role = 'admin' and id <> p_user_id;
    if admins_restantes = 0 then
      raise exception 'Debe quedar al menos un administrador en la institución';
    end if;
  end if;

  -- Sus eventos pasan a quien ejecuta la acción.
  update public.events set created_by = p_solicitante where created_by = p_user_id;

  -- Liberar los lugares que ocupaba en las tareas.
  update public.event_tasks t
     set slots = (
       select coalesce(jsonb_agg(
                case when (s->>'userId') = p_user_id::text
                     then jsonb_build_object('userId', null, 'claimedAt', null)
                     else s end), '[]'::jsonb)
       from jsonb_array_elements(t.slots) s)
   where t.slots::text like '%' || p_user_id::text || '%';

  -- Sacarlo de las listas de espera.
  update public.event_tasks t
     set waitlist = (
       select coalesce(jsonb_agg(w), '[]'::jsonb)
       from jsonb_array_elements_text(coalesce(t.waitlist, '[]'::jsonb)) w
       where w <> p_user_id::text)
   where t.waitlist::text like '%' || p_user_id::text || '%';

  -- Quitarlo de las notificaciones dirigidas.
  update public.notifications n
     set audience_users = (
       select coalesce(jsonb_agg(a), '[]'::jsonb)
       from jsonb_array_elements_text(coalesce(n.audience_users, '[]'::jsonb)) a
       where a <> p_user_id::text)
   where n.audience_users::text like '%' || p_user_id::text || '%';

  delete from public.profiles where id = p_user_id;

  insert into public.history_log (user_id, action, detail, type)
    values (p_solicitante, 'eliminó del equipo a', objetivo.name, 'Equipo');
end;
$$;
