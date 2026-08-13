"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, Sparkles } from "lucide-react";
import {
  lanzarInstalacion,
  navegadorIncrustado,
  promptDisponible,
  yaEstaInstalada,
  VERSION_APP,
} from "@/lib/instalacion";

/* Página de instalación: un botón y nada más.
   Sin manuales, sin pasos numerados, sin diagnóstico. Si el navegador no puede
   instalar, se dice en una línea y ya. */

export default function InstalarPage() {
  const [hayPrompt, setHayPrompt] = useState(false);
  const [instalada, setInstalada] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [incrustado, setIncrustado] = useState({ dentro: false, app: "" });

  const revisar = useCallback(() => {
    setHayPrompt(Boolean(promptDisponible()));
    setInstalada(yaEstaInstalada());
  }, []);

  useEffect(() => {
    setIncrustado(navegadorIncrustado());
    revisar();
    window.addEventListener("sb-install-listo", revisar);
    window.addEventListener("sb-install-hecha", revisar);
    const reloj = window.setInterval(revisar, 1500);
    return () => {
      window.removeEventListener("sb-install-listo", revisar);
      window.removeEventListener("sb-install-hecha", revisar);
      window.clearInterval(reloj);
    };
  }, [revisar]);

  async function instalar() {
    setAviso("");
    if (!promptDisponible()) {
      setAviso("Tu navegador no la ofreció esta vez. Abre su menú ⋮ y elige «Instalar aplicación».");
      return;
    }
    setInstalando(true);
    const ok = await lanzarInstalacion();
    setInstalando(false);
    if (ok) {
      setInstalada(true);
      return;
    }
    revisar();
    setAviso("No se completó. Abre el menú ⋮ del navegador y elige «Instalar aplicación».");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink-950 via-brand-950 to-brand-900 px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-brand-100/80 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a Staff Board
        </Link>

        <div className="rounded-2xl bg-white p-8 text-center shadow-pop">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white">
            <Sparkles className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-bold text-ink-900">Instala Staff Board</h1>
          <p className="mt-2 text-sm text-ink-500">
            Queda como una app más en tu pantalla de inicio.
          </p>

          {incrustado.dentro && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-left">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-xs leading-relaxed text-rose-800">
                Abriste esto dentro de {incrustado.app}. Ábrelo en Chrome o Safari para poder
                instalarlo.
              </p>
            </div>
          )}

          {instalada ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-700" />
              <p className="text-sm font-bold text-brand-900">Ya está instalada</p>
            </div>
          ) : (
            <button
              onClick={instalar}
              disabled={instalando}
              className="btn-primary mt-6 w-full !py-4 !text-base"
            >
              <Download className="h-5 w-5" />
              {instalando ? "Instalando..." : "Instalar Staff Board"}
            </button>
          )}

          {aviso && <p className="mt-3 text-xs font-medium text-rose-600">{aviso}</p>}

          <Link
            href="/login"
            className="mt-5 inline-block text-sm font-medium text-brand-700 hover:underline"
          >
            Ir a iniciar sesión
          </Link>

          <p className="mt-6 font-mono text-[11px] text-ink-300">{VERSION_APP}</p>
        </div>
      </div>
    </div>
  );
}
