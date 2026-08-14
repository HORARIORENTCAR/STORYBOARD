-- ============================================================================
-- ARREGLO: no se podían subir fotos ni archivos al chat ni a las evidencias
-- Causa: al ampliar las funciones quedaron DOS versiones de cada una con
-- distinta cantidad de parámetros. Postgres no sabía cuál usar y fallaba.
-- Aquí se eliminan las versiones viejas y se deja una sola de cada una.
-- ============================================================================

-- 1. Quitar todas las versiones antiguas
drop function if exists public.add_chat_message(uuid, text);
drop function if exists public.add_chat_message(uuid, text, jsonb);
drop function if exists public.add_chat_message(uuid, text, jsonb, uuid);
drop function if exists public.add_evidence(uuid, text, text);
drop function if exists public.add_evidence(uuid, text, text, text);

-- 2. Versión única de enviar mensaje (texto, adjuntos y destinatario privado)
create function public.add_chat_message(
  p_task_id uuid,
  p_text text,
  p_attachments jsonb default '[]'::jsonb,
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

-- 3. Versión única de agregar evidencia
create function public.add_evidence(
  p_task_id uuid,
  p_name text,
  p_type text,
  p_url text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare t record; item jsonb;
begin
  select * into t from public.event_tasks where id = p_task_id for update;
  if not found then raise exception 'Tarea no encontrada'; end if;

  if not public.is_task_member(p_task_id) then
    raise exception 'Solo quienes están inscritos en esta tarea pueden subir evidencias';
  end if;

  item := jsonb_build_object(
    'id', gen_random_uuid()::text, 'type', p_type, 'name', p_name, 'url', p_url,
    'uploadedBy', auth.uid()::text, 'uploadedAt', to_jsonb(now()));

  if p_type = 'image' then
    update public.event_tasks set evidence = evidence || jsonb_build_array(item) where id = p_task_id;
  else
    update public.event_tasks set attachments = attachments || jsonb_build_array(item) where id = p_task_id;
  end if;

  insert into public.history_log (user_id, action, detail, type)
    values (auth.uid(),
            case when p_type = 'image' then 'agregó una fotografía en' else 'agregó un documento en' end,
            t.name, 'Tarea');
end;
$$;

-- ============================================================================
-- 4. Asegurar el almacén de archivos y sus permisos (por si algo faltó)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('staffboard', 'staffboard', true, 26214400)
on conflict (id) do update set public = true, file_size_limit = 26214400;

drop policy if exists "sb_leer" on storage.objects;
create policy "sb_leer" on storage.objects for select using (bucket_id = 'staffboard');

drop policy if exists "sb_subir" on storage.objects;
create policy "sb_subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'staffboard');

drop policy if exists "sb_actualizar" on storage.objects;
create policy "sb_actualizar" on storage.objects for update to authenticated
  using (bucket_id = 'staffboard');

drop policy if exists "sb_borrar" on storage.objects;
create policy "sb_borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'staffboard' and (owner = auth.uid() or public.is_admin()));

-- 5. Comprobación: deben aparecer exactamente una fila por función
select p.proname as funcion, pg_get_function_identity_arguments(p.oid) as parametros
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('add_chat_message', 'add_evidence')
 order by 1;
