import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { generarPassword } from "@/lib/password";

/**
 * POST /api/reset-password
 * Genera una contraseña nueva para alguien del personal y la devuelve,
 * para cuando la olvidó o nunca la recibió. Solo lo puede hacer un admin.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, requesterId } = await req.json();
    if (!userId || !requesterId) {
      return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: requester } = await admin.from("profiles").select("role").eq("id", requesterId).single();
    if (requester?.role !== "admin") {
      return NextResponse.json({ error: "Solo un administrador puede hacer esto." }, { status: 403 });
    }

    const { data: persona } = await admin.from("profiles").select("name, email").eq("id", userId).single();
    if (!persona) {
      return NextResponse.json({ error: "Esa persona no existe." }, { status: 404 });
    }

    const password = generarPassword();
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await admin.from("profiles").update({ status: "active" }).eq("id", userId);

    return NextResponse.json({ ok: true, name: persona.name, email: persona.email, password });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error inesperado" }, { status: 500 });
  }
}
