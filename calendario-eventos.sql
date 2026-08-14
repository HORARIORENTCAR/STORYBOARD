-- ============================================================================
-- LLEVAR UN EVENTO AL CALENDARIO
--
-- Añade un vínculo entre la fecha del calendario y el evento del que salió.
-- Sirve para tres cosas:
--   1. Saber si un evento ya está en el calendario (y no duplicarlo).
--   2. Poder quitarlo de un clic.
--   3. Que si el evento cambia de fecha o de nombre, su fecha del calendario
--      se actualice sola en vez de quedarse mintiendo.
--
-- Si se borra el evento, la fecha del calendario NO se borra: se queda como
-- una fecha normal. Lo que estaba anunciado al colegio no debe desaparecer sin
-- que alguien lo decida.
--
-- Ejecutar una sola vez en Supabase → SQL Editor.
-- ============================================================================

alter table public.calendar_entries
  add column if not exists event_id uuid references public.events(id) on delete set null;

create index if not exists calendar_entries_event on public.calendar_entries(event_id);
