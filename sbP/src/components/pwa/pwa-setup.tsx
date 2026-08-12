"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";

/**
 * Registra el service worker y ofrece instalar la app en la pantalla de inicio.
 * En Android/Chrome el navegador nos entrega el evento `beforeinstallprompt`.
 * En iPhone no existe ese evento: hay que explicar el gesto de Compartir → Añadir.
 */
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "staff-board-install-dismissed";

export function PwaSetup() {
  const [deferred, setDeferred] = useState<PromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Buscar actualizaciones al abrir y cada 60 segundos. Sin esto,
          // el celular puede quedarse con una versión vieja de la app.
          reg.update().catch(() => {});
          const timer = window.setInterval(() => reg.update().catch(() => {}), 60_000);
          window.addEventListener("beforeunload", () => window.clearInterval(timer));

          // Cuando llega una versión nueva, activarla sin esperar.
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

      // Al tomar el control la versión nueva, recargar una sola vez
      // para que la persona vea de inmediato las correcciones publicadas.
      let recargado = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (recargado) return;
        recargado = true;
        window.location.reload();
      });
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    if (standalone || dismissed) return;

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIos) {
      setShowIos(true);
      setHidden(false);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as PromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <div className="fixed inset-x-3 z-[60] rounded-2xl border border-ink-100 bg-white p-4 shadow-pop"
         style={{ bottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">Instala Staff Board</p>
          {showIos ? (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs leading-relaxed text-ink-500">
              Pulsa <Share className="inline h-3.5 w-3.5" /> <strong>Compartir</strong> y luego
              <Plus className="inline h-3.5 w-3.5" /> <strong>Añadir a pantalla de inicio</strong>.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              Añádela a tu pantalla de inicio y ábrela como una app, sin pasar por la tienda.
            </p>
          )}
          {!showIos && (
            <button onClick={install} className="btn-primary mt-2.5 !py-2 !text-xs">
              <Download className="h-3.5 w-3.5" /> Instalar
            </button>
          )}
        </div>
        <button onClick={dismiss} className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-50" aria-label="Cerrar">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
