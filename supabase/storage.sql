-- ============================================================================
-- ALMACENAMIENTO DE ARCHIVOS DE STAFF BOARD
-- Habilita: evidencias reales, adjuntos del chat, portadas de eventos,
-- imágenes de referencia de tareas y el calendario oficial del colegio.
-- Ejecutar una sola vez en: Supabase -> SQL Editor -> New snippet -> Run
-- ============================================================================

-- 1. Crear el "cajón" donde viven los archivos.
--    Es público de lectura para que las imágenes se vean dentro de la app,
--    pero solo el personal autenticado puede subir o borrar.
insert into storage.buckets (id, name, public, file_size_limit)
values ('staffboard', 'staffboard', true, 26214400)  -- 25 MB por archivo
on conflict (id) do update set public = true, file_size_limit = 26214400;

-- 2. Permisos
drop policy if exists "sb_leer" on storage.objects;
create policy "sb_leer" on storage.objects
  for select using (bucket_id = 'staffboard');

drop policy if exists "sb_subir" on storage.objects;
create policy "sb_subir" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'staffboard');

drop policy if exists "sb_actualizar" on storage.objects;
create policy "sb_actualizar" on storage.objects
  for update to authenticated
  using (bucket_id = 'staffboard');

-- Solo puede borrar quien subió el archivo, o un administrador.
drop policy if exists "sb_borrar" on storage.objects;
create policy "sb_borrar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'staffboard' and (owner = auth.uid() or public.is_admin()));

-- ============================================================================
-- 3. Campos nuevos que pide la especificación
-- ============================================================================
alter table public.events        add column if not exists cover_image text;   -- portada del evento
alter table public.event_tasks   add column if not exists reference_image text; -- imagen de referencia
alter table public.task_chat_messages add column if not exists attachments jsonb not null default '[]';

-- Calendario oficial del colegio (PDF, imagen o Excel) como referencia general
alter table public.institution_settings add column if not exists official_calendar_url text;
alter table public.institution_settings add column if not exists official_calendar_name text;

-- ============================================================================
-- 4. Adjuntos en el chat: la función de enviar mensaje ahora los acepta
-- ============================================================================
create or replace function public.add_chat_message(p_task_id uuid, p_text text, p_attachments jsonb default '[]')
returns public.task_chat_messages language plpgsql security definer set search_path = public as $$
declare row_out public.task_chat_messages;
begin
  if not public.is_task_member(p_task_id) then
    raise exception 'Solo el equipo de esta tarea puede escribir en el chat';
  end if;
  if coalesce(trim(p_text), '') = '' and jsonb_array_length(coalesce(p_attachments, '[]'::jsonb)) = 0 then
    raise exception 'El mensaje está vacío';
  end if;
  insert into public.task_chat_messages (task_id, author_id, text, attachments)
    values (p_task_id, auth.uid(), coalesce(p_text, ''), coalesce(p_attachments, '[]'::jsonb))
    returning * into row_out;
  return row_out;
end;
$$;

-- ============================================================================
-- 5. Evidencias: ahora guardan también el enlace real del archivo
-- ============================================================================
create or replace function public.add_evidence(p_task_id uuid, p_name text, p_type text, p_url text default null)
returns void language plpgsql security definer set search_path = public as $$
declare t record; item jsonb;
begin
  select * into t from public.event_tasks where id = p_task_id for update;
  if not found then raise exception 'Tarea no encontrada'; end if;
  item := jsonb_build_object(
    'id', gen_random_uuid()::text, 'type', p_type, 'name', p_name, 'url', p_url,
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

-- ============================================================================
-- 6. Quitar una evidencia (solo quien la subió, el dueño del evento o un admin)
-- ============================================================================
create or replace function public.remove_evidence(p_task_id uuid, p_item_id text)
returns void language plpgsql security definer set search_path = public as $$
declare t record; ev record; puede boolean; nuevo_ev jsonb; nuevo_ad jsonb; item jsonb;
begin
  select * into t from public.event_tasks where id = p_task_id for update;
  if not found then raise exception 'Tarea no encontrada'; end if;
  select * into ev from public.events where id = t.event_id;

  select x into item from (
    select e as x from jsonb_array_elements(t.evidence) e where e->>'id' = p_item_id
    union all
    select a as x from jsonb_array_elements(t.attachments) a where a->>'id' = p_item_id
  ) q limit 1;
  if item is null then raise exception 'No se encontró ese archivo'; end if;

  puede := public.is_admin() or ev.created_by = auth.uid() or (item->>'uploadedBy') = auth.uid()::text;
  if not puede then raise exception 'No tienes permiso para eliminar este archivo'; end if;

  select coalesce(jsonb_agg(e), '[]'::jsonb) into nuevo_ev
    from jsonb_array_elements(t.evidence) e where e->>'id' <> p_item_id;
  select coalesce(jsonb_agg(a), '[]'::jsonb) into nuevo_ad
    from jsonb_array_elements(t.attachments) a where a->>'id' <> p_item_id;

  update public.event_tasks set evidence = nuevo_ev, attachments = nuevo_ad where id = p_task_id;
  insert into public.history_log (user_id, action, detail, type)
    values (auth.uid(), 'eliminó un archivo de', t.name, 'Tarea');
end;
$$;
