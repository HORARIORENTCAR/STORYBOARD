"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Cliente de navegador. Usa la llave "anon" (pública, segura de exponer:
 * todo el acceso real lo controla RLS + las funciones RPC en supabase/schema.sql).
 *
 * Si las variables de entorno no están configuradas todavía, exportamos null
 * para que el resto de la app pueda mostrar un aviso claro en vez de romperse.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const isSupabaseConfigured = !!supabase;
