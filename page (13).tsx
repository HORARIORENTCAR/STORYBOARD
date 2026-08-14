"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Share,
  Sparkles,
  SquarePlus,
} from "lucide-react";
import {
  detectarPlataforma,
  lanzarInstalacion,
  navegadorIncrustado,
  promptDisponible,
  yaEstaInstalada,
  VERSION_APP,
} from "@/lib/instalacion";

/* Página de instalación.
   Android y computadora: un botón y nada más.
   iPhone: Apple no permite ningún botón de instalar, así que ahí las
   instrucciones no son un adorno, son el único camino posible. */

export default function InstalarPage() {
  const [hayPrompt, setHayPrompt] = useState(false);
  const [instalada, setInstalada] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [incrustado, setIncrustado] = useState({ dentro: false, app: "" });
  const [plataforma, setPlataforma] = useState("otro");
  const [navegador, setNavegador] = useState("");

  const revisar = useCallback(() => {
    setHayPrompt(Boolean(promptDisponible()));
    setInstalada(yaEstaInstalada());
  }, []);

  useEffect(() => {
    const info = detectarPlataforma();
    setPlataforma(info.plataforma);
    setNavegador(info.navegador);
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

  const esIphone = plataforma === "ios-safari" || plataforma === "ios-otro";
  const iphoneOtroNavegador = plataforma === "ios-otro";

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
                Abriste esto dentro de {incrustado.app}. Copia la dirección y ábrela en{" "}
                {esIphone ? "Safari" : "Chrome"} para poder instalarla.
              </p>
            </div>
          )}

          {instalada ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-700" />
              <p className="text-sm font-bold text-brand-900">Ya está instalada</p>
            </div>
          ) : esIphone ? (
            /* ---------------- iPhone y iPad ---------------- */
            <div className="mt-6 text-left">
              {iphoneOtroNavegador ? (
                <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5">
                  <p className="text-sm font-bold text-amber-900">Primero abre esto en Safari</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-amber-900">
                    Estás usando {navegador}. En el iPhone, solo Safari puede instalar
                    aplicaciones: es una norma de Apple, no de Staff Board.
                  </p>
                  <p className="mt-2.5 text-sm leading-relaxed text-amber-900">
                    Copia la dirección de esta página, ábrela en Safari y vuelve aquí.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border-2 border-brand-500 bg-brand-50 p-5">
                    <p className="text-sm font-bold text-brand-900">
                      En iPhone se instala en tres toques
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-brand-800">
                      Apple no permite botones de instalar, así que se hace desde Safari.
                    </p>
                  </div>

                  {/* En iPhone no hay forma fiable de detectar el navegador interno de
                      WhatsApp: se hace pasar por Safari. Por eso lo advertimos siempre. */}
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <p className="text-xs leading-relaxed text-amber-900">
                      <strong>¿Llegaste tocando un enlace de WhatsApp?</strong> Entonces esto no es
                      Safari de verdad, sino el navegador de WhatsApp, y no tiene la opción de
                      instalar. Toca el ícono de la brújula de Safari, abajo a la derecha, para
                      abrirlo en Safari, y sigue los pasos ahí.
                    </p>
                  </div>

                  <ol className="mt-5 space-y-4">
                    <li className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-base font-bold text-white">
                        1
                      </span>
                      <p className="pt-1 text-base leading-relaxed text-ink-800">
                        Toca <Share className="mb-0.5 inline h-4 w-4" />{" "}
                        <strong>Compartir</strong>, abajo en el centro de la pantalla.
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-base font-bold text-white">
                        2
                      </span>
                      <p className="pt-1 text-base leading-relaxed text-ink-800">
                        <strong>Desliza la lista hacia abajo</strong> hasta encontrar{" "}
                        <SquarePlus className="mb-0.5 inline h-4 w-4" />{" "}
                        <strong>«Añadir a pantalla de inicio»</strong>. Está bastante abajo: es
                        donde más gente se rinde.
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-base font-bold text-white">
                        3
                      </span>
                      <p className="pt-1 text-base leading-relaxed text-ink-800">
                        Pulsa <strong>«Añadir»</strong> arriba a la derecha. El ícono aparece junto
                        a tus otras apps.
                      </p>
                    </li>
                  </ol>
                </>
              )}
            </div>
          ) : (
            /* ---------------- Android y computadora ---------------- */
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
