import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de SERVIDOR con la llave "service_role".
 * Solo debe usarse dentro de src/app/api/** (código que corre en el servidor).
 * NUNCA importar este archivo desde un componente de cliente ("use client"),
 * y nunca exponer SUPABASE_SERVICE_ROLE_KEY con el prefijo NEXT_PUBLIC_.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
