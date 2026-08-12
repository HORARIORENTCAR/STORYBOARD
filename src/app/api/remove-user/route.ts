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

    /* Limpiamos todo lo que la persona deja atrás: sus eventos pasan a quien
       ejecuta la acción, se liberan sus lugares en las tareas, sale de las
       listas de espera y de las notificaciones dirigidas. Después se borra
       la ficha. Los mensajes y el historial se conservan, sin autor. */
    const { error: limpiezaErr } = await admin.rpc("eliminar_persona", {
      p_user_id: userId,
      p_solicitante: requesterId,
    });

    if (limpiezaErr) {
      // Si aún no se ha corrido el SQL de arreglo, lo decimos con claridad.
      const falta = limpiezaErr.message.toLowerCase().includes("does not exist");
      return NextResponse.json(
        {
          error: falta
            ? "Falta aplicar el SQL 'ARREGLO-BORRAR-PERSONAS' en Supabase."
            : limpiezaErr.message,
        },
        { status: 400 }
      );
    }

    // Por último la cuenta de acceso, para que el correo quede libre.
    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr && !authErr.message.toLowerCase().includes("not found")) {
      return NextResponse.json(
        { error: `Se quitó del equipo, pero su cuenta de acceso sigue activa: ${authErr.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error inesperado" }, { status: 500 });
  }
}
