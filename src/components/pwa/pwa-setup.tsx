"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, X, Share, Plus } from "lucide-react";
import {
  detectarPlataforma,
  lanzarInstalacion,
  promptDisponible,
  yaEstaInstalada,
} from "@/lib/instalacion";

/**
 * Dos trabajos:
 *  1. Registrar el service worker y mantener la app actualizada.
 *  2. Ofrecer instalarla, sin depender de atrapar `beforeinstallprompt` a tiempo
 *     (de eso se encarga el script del head; aquí solo leemos el resultado).
 *
 * Si la persona cierra el aviso, no desaparece para siempre: vuelve a los 7 días,
 * y siempre queda la página /instalar en el menú de perfil.
 */

const CERRADO_HASTA = "staff-board-install-oculto-hasta";
const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;

export function PwaSetup() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [hayPrompt, setHayPrompt] = useState(false);
  const [esIos, setEsIos] = useState(false);

  /* ---- Service worker: registro y actualización automática ---- */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.update().catch(() => {});
        const timer = window.setInterval(() => reg.update().catch(() => {}), 60_000);
        window.addEventListener("beforeunload", () => window.clearInterval(timer));

        reg.addEventListener("updatefound", () => {
          const nuevo = reg.installing;
          if (!nuevo) return;
          nuevo.addEventListener("statechange", () => {
            if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
              nuevo.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch(() => {
        /* sin service worker la app sigue funcionando, solo pierde el modo sin conexión */
      });

    let recargado = false;
    const alCambiar = () => {
      if (recargado) return;
      recargado = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", alCambiar);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", alCambiar);
  }, []);

  /* ---- Aviso de instalación ---- */
  const evaluar = useCallback(() => {
    if (yaEstaInstalada()) {
      setVisible(false);
      return;
    }
    let oculto = false;
    try {
      const hasta = Number(window.localStorage.getItem(CERRADO_HASTA) ?? "0");
      oculto = Date.now() < hasta;
    } catch {
      /* modo privado sin almacenamiento: mostramos el aviso igual */
    }
    if (oculto) {
      setVisible(false);
      return;
    }

    const { plataforma } = detectarPlataforma();
    const ios = plataforma === "ios-safari";
    const listo = Boolean(promptDisponible());
    setEsIos(ios);
    setHayPrompt(listo);
    setVisible(ios || listo);
  }, []);

  useEffect(() => {
    evaluar();
    window.addEventListener("sb-install-listo", evaluar);
    window.addEventListener("sb-install-hecha", evaluar);
    const reloj = window.setInterval(evaluar, 2000);
    return () => {
      window.removeEventListener("sb-install-listo", evaluar);
      window.removeEventListener("sb-install-hecha", evaluar);
      window.clearInterval(reloj);
    };
  }, [evaluar]);

  function posponer() {
    try {
      window.localStorage.setItem(CERRADO_HASTA, String(Date.now() + SIETE_DIAS));
    } catch {
      /* sin almacenamiento solo se oculta en esta sesión */
    }
    setVisible(false);
  }

  async function instalar() {
    const ok = await lanzarInstalacion();
    if (ok) setVisible(false);
    else evaluar();
  }

  // En la propia página de instalación el aviso sobra.
  if (!visible || pathname === "/instalar") return null;

  return (
    <div
      className="fixed inset-x-3 z-[60] rounded-2xl border border-ink-100 bg-white p-4 shadow-pop sm:left-auto sm:right-4 sm:w-96"
      style={{ bottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}
      role="dialog"
      aria-label="Instalar Staff Board"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">Instala Staff Board</p>
          {esIos && !hayPrompt ? (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs leading-relaxed text-ink-500">
              Pulsa <Share className="inline h-3.5 w-3.5" /> <strong>Compartir</strong> y luego
              <Plus className="inline h-3.5 w-3.5" /> <strong>Añadir a pantalla de inicio</strong>.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              Añádela a tu pantalla de inicio y ábrela como una app, sin pasar por la tienda.
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            {hayPrompt && (
              <button onClick={instalar} className="btn-primary !py-2 !text-xs">
                <Download className="h-3.5 w-3.5" /> Instalar
              </button>
            )}
            <Link href="/instalar" className="text-xs font-medium text-brand-700 hover:underline">
              Ver los pasos
            </Link>
          </div>
        </div>
        <button
          onClick={posponer}
          className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-50"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
