import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de SERVIDOR con la llave "service_role".
 * NUNCA importar este archivo desde un componente de cliente ("use client")
 * ni exponer SUPABASE_SERVICE_ROLE_KEY con el prefijo NEXT_PUBLIC_.
 * Solo se usa dentro de src/app/api/** (rutas que corren en el servidor).
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del servidor.");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
