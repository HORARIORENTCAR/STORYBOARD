-- ============================================================================
-- NOTIFICACIONES QUE LLEVAN A ALGÚN SITIO
--
-- Ejecutar una sola vez en Supabase → SQL Editor, ANTES de subir el código.
--
-- Hasta ahora un aviso decía "Marielisa eliminó Fumigación del calendario" y
-- ahí se acababa: había que ir a buscarlo a mano. Ahora cada aviso guarda a
-- dónde lleva, y tocarlo abre directamente lo que pasó.
--
-- Se puede ejecutar con la aplicación funcionando. La función nueva deja el
-- enlace opcional, así que la versión del código que esté publicada en este
-- momento —que todavía no sabe mandar enlaces— sigue trabajando igual: sus
-- avisos simplemente se guardan sin enlace.
-- ============================================================================

-- Los avisos que ya existen se quedan con el enlace vacío: no sabemos a qué
-- apuntaban. De aquí en adelante, los nuevos sí lo traen.
alter table public.notifications add column if not exists link text;

-- Se retira la versión de cuatro parámetros para que no queden dos funciones
-- con el mismo nombre, que confundiría a la capa que las llama. La nueva tiene
-- el quinto con valor por defecto, así que las llamadas antiguas de cuatro
-- parámetros la siguen encontrando sin cambiar nada.
drop function if exists public.notify(text, text, boolean, uuid[]);

create or replace function public.notify(
  p_title          text,
  p_detail         text,
  p_audience_all   boolean,
  p_audience_users uuid[],
  p_link           text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (title, detail, audience_all, audience_users, link)
    values (
      p_title,
      p_detail,
      p_audience_all,
      coalesce((select jsonb_agg(u::text) from unnest(p_audience_users) u), '[]'::jsonb),
      nullif(btrim(p_link), '')
    );
end;
$$;
