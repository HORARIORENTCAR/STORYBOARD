-- ============================================================================
-- 1. CONFIRMAR LA INSCRIPCIÓN DE INMEDIATO
--    Renuncia al tiempo de espera: la inscripción queda firme al instante
--    y se abre el acceso al chat sin esperar el minuto.
-- ============================================================================
create or replace function public.confirmar_inscripcion(p_task_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t record; v_slots jsonb; estaba boolean;
begin
  select * into t from public.event_tasks where id = p_task_id for update;
  if not found then raise exception 'Tarea no encontrada'; end if;

  estaba := exists (
    select 1 from jsonb_array_elements(t.slots) s where (s->>'userId') = auth.uid()::text
  );
  if not estaba then raise exception 'No estás inscrito en esta tarea'; end if;

  -- Sin marca de tiempo, la inscripción se considera definitiva.
  select coalesce(jsonb_agg(
           case when (s->>'userId') = auth.uid()::text
                then jsonb_build_object('userId', s->>'userId', 'claimedAt', null)
                else s end), '[]'::jsonb)
    into v_slots
    from jsonb_array_elements(t.slots) s;

  update public.event_tasks set slots = v_slots where id = p_task_id;

  insert into public.history_log (user_id, action, detail, type)
    values (auth.uid(), 'confirmó su inscripción en', t.name, 'Tarea');
end;
$$;

-- ============================================================================
-- 2. ELIMINAR UN MENSAJE DEL CHAT
--    Solo quien lo escribió, o un administrador.
-- ============================================================================
drop policy if exists "chat_delete_own" on public.task_chat_messages;
create policy "chat_delete_own" on public.task_chat_messages
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create or replace function public.borrar_mensaje(p_message_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m record;
begin
  select * into m from public.task_chat_messages where id = p_message_id;
  if not found then raise exception 'Ese mensaje ya no existe'; end if;
  if m.author_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Solo puedes eliminar tus propios mensajes';
  end if;
  delete from public.task_chat_messages where id = p_message_id;
end;
$$;
