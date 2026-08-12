"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function LoginPage() {
  const { login, sendPasswordLink, settings, configError, loggedIn, loading } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!loading && loggedIn) router.replace("/");
  }, [loading, loggedIn, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    const err = await login(email.trim(), password);
    setSending(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink-950 via-brand-950 to-brand-900 px-4 py-10">
      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-pop lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-800 to-ink-950 p-10 text-white lg:flex">
          <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-brand-400/20 blur-3xl" />
          <div>
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold leading-tight">Staff Board</h1>
            <p className="mt-2 text-sm text-brand-100/80">{settings.name}</p>
          </div>
          <div className="space-y-4 text-sm text-brand-100/90">
            <p>La pizarra digital del colegio: organiza eventos, distribuye tareas y da seguimiento al trabajo de todo el equipo, en tiempo real.</p>
            <div className="flex items-center gap-2 text-xs text-brand-200">
              <ShieldCheck className="h-4 w-4" /> Acceso exclusivo con correo institucional
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <p className="section-eyebrow">Bienvenido de nuevo</p>
          <h2 className="mt-1 text-2xl font-bold text-ink-900">Inicia sesión</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            Usa el correo y la contraseña que definiste al aceptar tu invitación.
          </p>

          {!isSupabaseConfigured && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              {configError ?? "Falta conectar Supabase en este proyecto (ver supabase/README dentro del código)."}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="label">Correo institucional</label>
              <input
                type="email"
                className="input"
                placeholder="nombre@colegio.edu.do"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
            {aviso && <p className="text-xs font-medium text-brand-700">{aviso}</p>}
            <button type="submit" className="btn-primary w-full" disabled={sending || !isSupabaseConfigured}>
              {sending ? "Entrando..." : (
                <>
                  Entrar a Staff Board <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={async () => {
                setError("");
                setAviso("");
                if (!email.trim()) {
                  setError("Escribe primero tu correo institucional.");
                  return;
                }
                setSending(true);
                const err = await sendPasswordLink(email);
                setSending(false);
                if (err) setError(err);
                else setAviso("Te enviamos un correo con un enlace para crear tu contraseña. Revisa tu bandeja y la carpeta de spam.");
              }}
              className="w-full text-center text-xs font-medium text-brand-700 hover:underline"
            >
              Olvidé mi contraseña / aún no la he creado
            </button>

            <p className="text-center text-xs text-ink-400">
              Tu contraseña es exclusiva de Staff Board: no es la de tu correo. ¿No tienes cuenta todavía?
              Pídele a un administrador que te invite desde la sección Equipo.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
