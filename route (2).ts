import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Guarda (POST) o elimina (DELETE) el permiso de aviso de un dispositivo.
 *
 * Cada navegador entrega una dirección única. Si la persona vuelve a activar
 * los avisos en el mismo aparato, el navegador devuelve la misma dirección y
 * aquí simplemente la actualizamos, sin duplicar.
 */

export async function POST(req: NextRequest) {
  try {
    const { userId, endpoint, p256dh, auth, userAgent } = await req.json();
    if (!userId || !endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Faltan datos del dispositivo." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // La persona debe existir en el directorio del personal.
    const { data: ficha } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!ficha) {
      return NextResponse.json({ error: "Esa cuenta no existe." }, { status: 403 });
    }

    const { error } = await admin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: userAgent ?? null,
          last_used: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("push_subscriptions") && m.includes("does not exist")) {
        return NextResponse.json(
          { error: "Falta ejecutar avisos-push.sql en Supabase." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error inesperado" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, endpoint } = await req.json();
    if (!userId || !endpoint) {
      return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    }
    const admin = getSupabaseAdmin();
    await admin.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
