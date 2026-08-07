"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Página a la que llega el enlace del correo de invitación (y de
 * "olvidé mi contraseña"). Supabase ya dejó la sesión activa en el
 * navegador para esta pestaña; aquí solo pedimos una contraseña nueva.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setReady(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase!.auth.updateUser({ password });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink-950 via-brand-950 to-brand-900 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-pop">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold text-ink-900">Crea tu contraseña</h1>
        <p className="mt-1.5 text-sm text-ink-500">Último paso para activar tu cuenta de Staff Board.</p>

        {!isSupabaseConfigured ? (
          <p className="mt-4 text-sm text-rose-600">Supabase no está configurado en este proyecto.</p>
        ) : !ready ? (
          <p className="mt-4 text-sm text-ink-500">Verificando tu enlace de invitación...</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Nueva contraseña</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div>
              <label className="label">Confirmar contraseña</label>
              <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
            </div>
            {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? "Guardando..." : (
                <>
                  Entrar a Staff Board <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
