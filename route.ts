import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { generarPassword } from "@/lib/password";

/**
 * POST /api/invite
 * Crea la cuenta de una persona del personal con una contraseña generada por
 * Staff Board y la devuelve para que el administrador se la entregue.
 * No depende de que llegue ningún correo.
 */
/** Busca una cuenta de acceso por correo recorriendo el listado de Supabase. */
async function buscarUsuarioPorCorreo(
  admin: ReturnType<typeof getSupabaseAdmin>,
  correo: string
): Promise<{ id: string } | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const hallado = data.users.find((u) => (u.email ?? "").toLowerCase() === correo);
    if (hallado) return { id: hallado.id };
    if (data.users.length < 200) return null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, role, title, area, requesterId } = await req.json();

    if (!name || !email || !requesterId) {
      return NextResponse.json({ error: "Faltan datos (nombre, correo o solicitante)." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // 1. Solo un administrador puede crear cuentas.
    const { data: requester, error: reqErr } = await admin
      .from("profiles")
      .select("role")
      .eq("id", requesterId)
      .single();
    if (reqErr || requester?.role !== "admin") {
      return NextResponse.json({ error: "Solo un administrador puede agregar personas." }, { status: 403 });
    }

    // 2. El correo debe pertenecer a alguno de los dominios institucionales.
    const { data: settings } = await admin.from("institution_settings").select("domain").single();
    const dominios = String(settings?.domain ?? "")
      .split(/[,;\s]+/)
      .map((d) => d.trim().replace(/^@/, "").toLowerCase())
      .filter(Boolean);
    const correo = String(email).trim().toLowerCase();
    if (dominios.length > 0 && !dominios.some((d) => correo.endsWith("@" + d))) {
      return NextResponse.json(
        { error: `El correo debe pertenecer a: ${dominios.map((d) => "@" + d).join(", ")}` },
        { status: 400 }
      );
    }

    // 3. Crear la cuenta ya lista para usarse, con contraseña propia de Staff Board.
    const password = generarPassword();
    let userId: string | null = null;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: correo,
      password,
      email_confirm: true,
    });

    if (created?.user) {
      userId = created.user.id;
    } else {
      const yaExiste = (createErr?.message ?? "").toLowerCase().includes("already");
      if (!yaExiste) {
        return NextResponse.json({ error: createErr?.message ?? "No se pudo crear la cuenta." }, { status: 400 });
      }

      /* El correo ya tiene cuenta de acceso. Puede ser un duplicado real, o una
         cuenta huérfana que quedó de un borrado incompleto. Lo averiguamos. */
      const existente = await buscarUsuarioPorCorreo(admin, correo);
      if (!existente) {
        return NextResponse.json(
          { error: "Ese correo ya está registrado y no se pudo recuperar. Bórralo desde Supabase e inténtalo de nuevo." },
          { status: 400 }
        );
      }

      const { data: fichaExistente } = await admin.from("profiles").select("id").eq("id", existente.id).maybeSingle();
      if (fichaExistente) {
        return NextResponse.json({ error: "Ya existe una cuenta activa con ese correo." }, { status: 400 });
      }

      // Cuenta huérfana: la reutilizamos con la contraseña nueva.
      const { error: updErr } = await admin.auth.admin.updateUserById(existente.id, {
        password,
        email_confirm: true,
      });
      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 400 });
      }
      userId = existente.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 400 });
    }

    // 4. Crear su ficha en el directorio del personal.
    const initials = String(name)
      .split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    const { error: profileErr } = await admin.from("profiles").insert({
      id: userId,
      name,
      email: correo,
      role: role ?? "member",
      title: title ?? null,
      area: area ?? null,
      status: "active",
      initials,
      color: "#18854e",
    });
    if (profileErr) {
      // Si la ficha falla, no dejamos una cuenta huérfana.
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, userId, email: correo, password });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error inesperado" }, { status: 500 });
  }
}
