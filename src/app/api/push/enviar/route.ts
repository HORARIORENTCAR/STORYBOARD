import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Envía un aviso al celular de todo el equipo.
 *
 * Se llama únicamente desde las publicaciones de interés colectivo: un evento
 * que se publica, un cambio en el calendario institucional o el mural del mes.
 * Nunca desde las tareas ni desde el chat, que son conversaciones de grupos
 * pequeños y llenarían el teléfono de avisos.
 *
 * A quien publica no se le avisa de lo que acaba de hacer.
 */

export const runtime = "nodejs";

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const CLAVE_PRIVADA = process.env.VAPID_PRIVATE_KEY ?? "";
const CONTACTO = process.env.VAPID_CONTACTO ?? "mailto:admin@caracoli.edu.do";

export async function POST(req: NextRequest) {
  try {
    /* ------------------------------------------------------------------
       El entorno de pruebas NO le suena el teléfono a nadie.

       Vercel pone VERCEL_ENV en "production", "preview" o "development".
       Cualquier cosa que no sea producción se queda callada. Esto se decide
       en el servidor, así que no depende de la dirección que abra la persona
       ni de nada que el navegador pueda cambiar.

       Si VERCEL_ENV no existe (correr la app en la computadora de uno), sí
       envía: ahí es donde hace falta poder probarlo.
       ------------------------------------------------------------------ */
    const entorno = process.env.VERCEL_ENV;
    if (entorno && entorno !== "production") {
      return NextResponse.json({ ok: true, enviados: 0, omitido: "entorno de pruebas" });
    }

    if (!CLAVE_PUBLICA || !CLAVE_PRIVADA) {
      return NextResponse.json(
        { error: "Faltan las claves de aviso (VAPID) en las variables de Vercel." },
        { status: 500 }
      );
    }
    webpush.setVapidDetails(CONTACTO, CLAVE_PUBLICA, CLAVE_PRIVADA);

    const { autorId, titulo, detalle, url } = await req.json();
    if (!titulo) return NextResponse.json({ error: "Falta el título." }, { status: 400 });

    const admin = getSupabaseAdmin();

    // Quien pide el envío tiene que ser alguien del personal.
    if (autorId) {
      const { data: ficha } = await admin.from("profiles").select("id").eq("id", autorId).maybeSingle();
      if (!ficha) return NextResponse.json({ error: "Cuenta no reconocida." }, { status: 403 });
    }

    // Personas que tienen los avisos encendidos (todas menos quien publica).
    const { data: personas } = await admin.from("profiles").select("id").eq("push_activo", true);
    const permitidos = new Set((personas ?? []).map((p) => p.id).filter((id) => id !== autorId));

    const { data: dispositivos, error } = await admin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth");

    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("does not exist")) {
        return NextResponse.json({ error: "Falta ejecutar avisos-push.sql." }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const destinos = (dispositivos ?? []).filter((d) => permitidos.has(d.user_id));

    const carga = JSON.stringify({
      titulo,
      detalle: detalle ?? "",
      url: url ?? "/",
      marca: Date.now(),
    });

    let enviados = 0;
    const caducados: string[] = [];

    await Promise.all(
      destinos.map(async (d) => {
        try {
          await webpush.sendNotification(
            { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
            carga,
            { TTL: 12 * 60 * 60 } // si el teléfono está apagado, se guarda 12 horas
          );
          enviados++;
        } catch (e) {
          /* 404 y 410 significan que ese dispositivo ya no existe: se desinstaló
             la app o se borraron los datos del navegador. Lo damos de baja para
             no seguir intentándolo eternamente. */
          const codigo = (e as { statusCode?: number }).statusCode;
          if (codigo === 404 || codigo === 410) caducados.push(d.endpoint);
        }
      })
    );

    if (caducados.length > 0) {
      await admin.from("push_subscriptions").delete().in("endpoint", caducados);
    }

    return NextResponse.json({ ok: true, enviados, dadosDeBaja: caducados.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
