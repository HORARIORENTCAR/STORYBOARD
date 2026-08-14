"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Smartphone, Volume2 } from "lucide-react";
import { apagarAvisos, encenderAvisos, estadoAvisos, type EstadoAvisos } from "@/lib/push";
import { useApp } from "@/lib/store";

/**
 * Interruptor de avisos al celular, para la página Mi perfil.
 *
 * El permiso es por dispositivo, no por cuenta: si alguien entra desde su
 * celular y desde la computadora del colegio, tiene que activarlo en cada uno.
 * Por eso el texto habla siempre de "este dispositivo".
 */
export function AvisosCelular() {
  const { currentUser } = useApp();
  const [estado, setEstado] = useState<EstadoAvisos>("apagado");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  const revisar = useCallback(async () => {
    setEstado(await estadoAvisos());
    setListo(true);
  }, []);

  useEffect(() => {
    revisar();
  }, [revisar]);

  async function alternar() {
    if (!currentUser?.id) return;
    setTrabajando(true);
    setError("");
    const err =
      estado === "encendido"
        ? await apagarAvisos(currentUser.id)
        : await encenderAvisos(currentUser.id);
    if (err) setError(err);
    await revisar();
    setTrabajando(false);
  }

  /** Manda un aviso de prueba solo a este dispositivo, para comprobar el sonido. */
  async function probar() {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification("Aviso de prueba", {
        body: "Así se verá cuando se publique algo nuevo en el muro o el calendario.",
        icon: "/icon-192-v2.png",
        badge: "/icon-192-v2.png",
        vibrate: [180, 90, 180],
        tag: "staff-board-prueba",
      } as NotificationOptions);
    } catch {
      setError("No se pudo mostrar el aviso de prueba.");
    }
  }

  if (!listo) return null;

  const encendido = estado === "encendido";

  return (
    <div className="card mt-6 max-w-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div
          className={
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " +
            (encendido ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500")
          }
        >
          {encendido ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900">Avisos en este dispositivo</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
            Suena y vibra cuando se publica un evento nuevo o cambia el calendario del colegio,
            aunque tengas la aplicación cerrada. Las tareas y los chats no avisan, para no llenarte
            el teléfono.
          </p>

          {estado === "requiere-instalar" && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p className="text-xs leading-relaxed text-amber-900">
                En iPhone los avisos solo funcionan con la aplicación instalada en la pantalla de
                inicio. Instálala primero y vuelve aquí.
              </p>
            </div>
          )}

          {estado === "bloqueado" && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5">
              <p className="text-xs leading-relaxed text-rose-800">
                Rechazaste los avisos para este sitio. Para volver a activarlos hay que permitirlos
                en los ajustes del navegador, en el candado que aparece junto a la dirección.
              </p>
            </div>
          )}

          {estado === "sin-soporte" && (
            <p className="mt-3 text-xs text-ink-500">
              Este navegador no admite avisos. Prueba con Chrome, Edge o Safari.
            </p>
          )}

          {(estado === "apagado" || estado === "encendido") && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={alternar}
                disabled={trabajando}
                className={encendido ? "btn-secondary !py-2 !text-sm" : "btn-primary !py-2 !text-sm"}
              >
                {trabajando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : encendido ? (
                  <BellOff className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {trabajando ? "Un momento..." : encendido ? "Apagar los avisos aquí" : "Activar los avisos"}
              </button>

              {encendido && (
                <button onClick={probar} className="btn-ghost !py-2 !text-sm">
                  <Volume2 className="h-4 w-4" /> Probar el sonido
                </button>
              )}
            </div>
          )}

          {error && <p className="mt-2.5 text-xs font-medium text-rose-600">{error}</p>}

          {encendido && !error && (
            <p className="mt-2.5 text-xs font-medium text-brand-700">
              Activados. Recibirás los avisos en este dispositivo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
