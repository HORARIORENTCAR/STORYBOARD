-- ============================================================================
-- CHAT DE TAREAS: acceso confirmado y mensajes privados entre miembros
-- ============================================================================

-- 1. Destinatario opcional: si está puesto, el mensaje es privado.
alter table public.task_chat_messages
  add column if not exists recipient_id uuid references public.profiles(id) on delete set null;

-- ============================================================================
-- 2. Pertenecer a la tarea ahora exige inscripción CONFIRMADA:
--    quien acaba de inscribirse y aún puede deshacerlo no entra al chat.
--    El líder, el dueño del evento y los administradores siempre entran.
-- ============================================================================
create or replace function public.is_task_member(p_task_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  t record;
  e record;
  ventana int;
  cupo jsonb;
begin
  select * into t from public.event_tasks where id = p_task_id;
  if not found then return false; end if;

  if public.is_admin() then return true; end if;

  select * into e from public.events where id = t.event_id;
  if e.created_by = auth.uid() then return true; end if;
  if t.leader_id = auth.uid() then return true; end if;

  select el into cupo
    from jsonb_array_elements(t.slots) el
   where (el->>'userId') = auth.uid()::text
   limit 1;

  if cupo is null then return false; end if;
  if (cupo->>'claimedAt') is null then return true; end if;

  select cancel_window_minutes into ventana from public.institution_settings;
  ventana := coalesce(ventana, 1);

  return (now() - ((cupo->>'claimedAt')::timestamptz)) > make_interval(mins => ventana);
end;
$$;

-- ============================================================================
-- 3. Los mensajes privados solo los ve quien los escribe, quien los recibe
--    y los administradores (que supervisan).
-- ============================================================================
drop policy if exists "chat_select_team" on public.task_chat_messages;
create policy "chat_select_team" on public.task_chat_messages
  for select using (
    public.is_task_member(task_id)
    and (
      recipient_id is null
      or recipient_id = auth.uid()
      or author_id = auth.uid()
      or public.is_admin()
    )
  );

-- ============================================================================
-- 4. Enviar mensaje, con destinatario opcional
-- ============================================================================
create or replace function public.add_chat_message(
  p_task_id uuid,
  p_text text,
  p_attachments jsonb default '[]',
  p_recipient uuid default null
)
returns public.task_chat_messages language plpgsql security definer set search_path = public as $$
declare row_out public.task_chat_messages; destinatario_ok boolean;
begin
  if not public.is_task_member(p_task_id) then
    raise exception 'Solo el equipo confirmado de esta tarea puede escribir en el chat';
  end if;

  if coalesce(trim(p_text), '') = '' and jsonb_array_length(coalesce(p_attachments, '[]'::jsonb)) = 0 then
    raise exception 'El mensaje está vacío';
  end if;

  -- Un mensaje privado solo puede dirigirse a alguien del mismo equipo.
  if p_recipient is not null then
    select exists (
      select 1 from public.event_tasks t
       where t.id = p_task_id
         and (
           t.leader_id = p_recipient
           or exists (select 1 from jsonb_array_elements(t.slots) s where (s->>'userId') = p_recipient::text)
           or exists (select 1 from public.events e where e.id = t.event_id and e.created_by = p_recipient)
         )
    ) into destinatario_ok;
    if not destinatario_ok then
      raise exception 'Esa persona no forma parte de esta tarea';
    end if;
  end if;

  insert into public.task_chat_messages (task_id, author_id, text, attachments, recipient_id)
    values (p_task_id, auth.uid(), coalesce(p_text, ''), coalesce(p_attachments, '[]'::jsonb), p_recipient)
    returning * into row_out;
  return row_out;
end;
$$;
