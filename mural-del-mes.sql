-- ============================================================================
-- MURAL DEL MES
-- Un espacio de notas por cada mes. Lo que se escribe queda guardado para
-- siempre; al cambiar de mes aparece el mural de ese mes, y los anteriores
-- se conservan para consulta.
-- ============================================================================
create table if not exists public.month_notes (
  month text primary key,                 -- formato 'AAAA-MM'
  content text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.month_notes enable row level security;

drop policy if exists "mural_leer" on public.month_notes;
create policy "mural_leer" on public.month_notes for select using (true);

drop policy if exists "mural_escribir" on public.month_notes;
create policy "mural_escribir" on public.month_notes for insert to authenticated
  with check (public.is_admin());

drop policy if exists "mural_actualizar" on public.month_notes;
create policy "mural_actualizar" on public.month_notes for update to authenticated
  using (public.is_admin());

alter table public.month_notes replica identity full;
do $$
begin
  begin alter publication supabase_realtime add table public.month_notes; exception when duplicate_object then null; end;
end $$;
