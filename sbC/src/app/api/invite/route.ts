import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/invite
 * Solo debe llamarse desde la pantalla de Equipo (admin). Crea la cuenta de
 * autenticación de la persona invitada y su fila en profiles con status
 * "invited". Supabase le envía un correo con un enlace para poner su
 * contraseña e iniciar sesión.
 *
 * Se valida aquí (no solo en el cliente) que el correo pertenezca al dominio
 * institucional, y que quien invita sea realmente un admin.
 */
export async function POST(req: NextRequest) {
  try {
    const { name, email, role, title, area, requesterId } = await req.json();

    if (!name || !email || !requesterId) {
      return NextResponse.json({ error: "Faltan datos (nombre, correo o solicitante)." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // 1. Verificar que quien invita sea admin.
    const { data: requester, error: reqErr } = await admin
      .from("profiles")
      .select("role")
      .eq("id", requesterId)
      .single();
    if (reqErr || requester?.role !== "admin") {
      return NextResponse.json({ error: "Solo un administrador puede invitar personas." }, { status: 403 });
    }

    // 2. Verificar dominio institucional.
    const { data: settings } = await admin.from("institution_settings").select("domain").single();
    const domain = settings?.domain ?? "";
    if (domain && !email.toLowerCase().endsWith("@" + domain.toLowerCase())) {
      return NextResponse.json({ error: `El correo debe pertenecer al dominio @${domain}` }, { status: 400 });
    }

    // 3. Crear el usuario en Supabase Auth y enviarle el correo de invitación.
    const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      : undefined;
    const { data: created, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (inviteErr || !created?.user) {
      return NextResponse.json({ error: inviteErr?.message ?? "No se pudo invitar a la persona." }, { status: 400 });
    }

    // 4. Crear su perfil.
    const initials = String(name)
      .split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    const { error: profileErr } = await admin.from("profiles").insert({
      id: created.user.id,
      name,
      email,
      role: role ?? "member",
      title: title ?? null,
      area: area ?? null,
      status: "invited",
      initials,
      color: "#18854e",
    });
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, userId: created.user.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error inesperado" }, { status: 500 });
  }
}
