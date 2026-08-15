-- ============================================================================
-- LA PIZARRA · QUIÉN PUEDE HACER QUÉ
--
-- Ejecutar una sola vez en Supabase → SQL Editor, DESPUÉS de pizarra.sql.
-- Reemplaza los permisos que venían de aquel archivo.
--
-- La regla nueva, en una línea:
--
--   La pizarra la maneja la administración; lo que va escrito dentro lo
--   escribe el equipo, menos el ayudante.
--
--   Administración          Cualquiera del personal
--   ──────────────────      ─────────────────────────
--   Crear la pizarra        Escribir el encargo
--   Cerrarla y reabrirla    Escribir la cuenta
--   Eliminarla              Marcar como hecho
--   Asignar el ayudante
--
-- Por qué el ayudante es distinto del resto: escribir un encargo es contar lo
-- que hay que hacer, pero poner el nombre de alguien ahí es comprometer el
-- tiempo de otra persona. Eso no lo decide cualquiera.
--
-- Esto se aplica en la base de datos, no en la pantalla. Aunque alguien
-- manipule la aplicación desde su navegador, el servidor no le va a dejar.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. La pizarra en sí: solo administración.
--
-- Antes bastaba con haberla creado ("created_by = auth.uid()"). Como crearlas
-- ya era cosa de administración, en la práctica daba igual; pero si mañana
-- alguien deja de ser administrador, no debe seguir pudiendo cerrar o borrar
-- las pizarras que hizo cuando lo era. Por eso ahora se pregunta por el cargo
-- actual y no por quién la creó.
-- ----------------------------------------------------------------------------

drop policy if exists "pizarras_crear" on public.pizarras;
create policy "pizarras_crear" on public.pizarras for insert to authenticated
  with check (created_by = auth.uid() and public.is_admin());

drop policy if exists "pizarras_editar" on public.pizarras;
create policy "pizarras_editar" on public.pizarras for update to authenticated
  using (public.is_admin());

drop policy if exists "pizarras_borrar" on public.pizarras;
create policy "pizarras_borrar" on public.pizarras for delete to authenticated
  using (public.is_admin());

-- Las filas se siguen creando junto con la pizarra, por quien la crea.
drop policy if exists "pizarra_filas_crear" on public.pizarra_filas;
create policy "pizarra_filas_crear" on public.pizarra_filas for insert to authenticated
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. Lo que va escrito en cada renglón.
--
-- El encargo y la cuenta: cualquiera del personal.
-- El ayudante: solo administración.
--
-- El truco está en el "case when admin": si quien llama no es administrador,
-- la columna del ayudante se reescribe con su propio valor, es decir, se queda
-- como estaba. Así el resto del renglón se guarda igual y nadie recibe un error
-- por un campo que ni siquiera puede ver.
-- ----------------------------------------------------------------------------

drop function if exists public.pizarra_guardar_fila(uuid, text, text, text);
create function public.pizarra_guardar_fila(
  p_fila uuid,
  p_asignacion text,
  p_presupuesto text,
  p_ayudante text
) returns public.pizarra_filas
language plpgsql security definer set search_path = public as $$
declare
  fila    public.pizarra_filas;
  cerrada boolean;
  admin   boolean;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión para escribir en la pizarra';
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Esta cuenta no pertenece al personal del colegio';
  end if;

  select p.status = 'cerrada' into cerrada
    from public.pizarra_filas f
    join public.pizarras p on p.id = f.pizarra_id
   where f.id = p_fila;

  if cerrada is null then
    raise exception 'Ese renglón ya no existe';
  end if;

  if cerrada then
    raise exception 'Esta pizarra ya está cerrada';
  end if;

  admin := public.is_admin();

  update public.pizarra_filas
     set asignacion  = p_asignacion,
         presupuesto = p_presupuesto,
         ayudante    = case when admin then p_ayudante else ayudante end
   where id = p_fila
   returning * into fila;

  return fila;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Marcar como hecho: sin cambios, cualquiera del personal.
--    Quien cumple el encargo es quien sabe que ya está listo.
-- ----------------------------------------------------------------------------
