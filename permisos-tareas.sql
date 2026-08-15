-- ============================================================================
-- PERMISOS DE LAS EVIDENCIAS
-- Antes cualquiera podía subir o quitar archivos de una tarea aunque no
-- estuviera inscrito. Ahora la propia base de datos lo impide.
-- ============================================================================

-- Subir evidencia: solo el equipo confirmado de la tarea
-- (inscritos, líder, dueño del evento y administración).
create or replace function public.add_evidence(
  p_task_id uuid, p_name text, p_type text, p_url text default null
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

-- Quitar evidencia: quien la subió, el líder, el dueño del evento o la administración.
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

  puede := public.is_admin()
        or ev.created_by = auth.uid()
        or t.leader_id = auth.uid()
        or (item->>'uploadedBy') = auth.uid()::text;
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

-- ============================================================================
-- EDITAR Y ELIMINAR LA TAREA: solo el creador del evento y la administración.
-- (Las políticas de la tabla ya lo exigían; esto lo deja explícito.)
-- ============================================================================
drop policy if exists "tasks_update_owner_or_admin" on public.event_tasks;
create policy "tasks_update_owner_or_admin" on public.event_tasks
  for update using (
    exists (
      select 1 from public.events e
       where e.id = event_tasks.event_id
         and (e.created_by = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "tasks_delete_owner_or_admin" on public.event_tasks;
create policy "tasks_delete_owner_or_admin" on public.event_tasks
  for delete using (
    exists (
      select 1 from public.events e
       where e.id = event_tasks.event_id
         and (e.created_by = auth.uid() or public.is_admin())
    )
  );
