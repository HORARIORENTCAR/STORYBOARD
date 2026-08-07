import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/remove-user
 * Elimina a una persona del equipo (cuenta de acceso + perfil).
 * Protecciones: solo un admin puede hacerlo, nadie puede eliminarse a sí
 * mismo, y nunca se puede eliminar al único administrador que queda.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, requesterId } = await req.json();
    if (!userId || !requesterId) {
      return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    }
    if (userId === requesterId) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: requester } = await admin.from("profiles").select("role").eq("id", requesterId).single();
    if (requester?.role !== "admin") {
      return NextResponse.json({ error: "Solo un administrador puede eliminar personas." }, { status: 403 });
    }

    // Nunca dejar la institución sin administradores.
    const { data: target } = await admin.from("profiles").select("role, name").eq("id", userId).single();
    if (!target) {
      return NextResponse.json({ error: "Esa persona ya no existe." }, { status: 404 });
    }
    if (target.role === "admin") {
      const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: "No puedes eliminar al único administrador." }, { status: 400 });
      }
    }

    // Sus eventos pasan a quien ejecuta la acción, para no perder el historial.
    await admin.from("events").update({ created_by: requesterId }).eq("created_by", userId);

    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error inesperado" }, { status: 500 });
  }
}
