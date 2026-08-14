/**
 * Avisos al celular (notificaciones push).
 *
 * Cómo funciona, en corto:
 *  1. La persona concede permiso en su dispositivo.
 *  2. El navegador entrega una "dirección de aviso" única para ese aparato.
 *  3. Guardamos esa dirección en el servidor.
 *  4. Cuando se publica un evento o cambia el calendario, el servidor manda el
 *     aviso a todas las direcciones guardadas, menos a la de quien lo publicó.
 *
 * El aviso llega aunque la aplicación esté cerrada, con sonido y vibración,
 * porque lo recibe el service worker, que sigue vivo aunque la app no lo esté.
 */

/** Clave pública del proyecto. No es secreta: va en el navegador a propósito. */
export const CLAVE_PUBLICA_VAPID =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type EstadoAvisos =
  | "sin-soporte"     // el navegador no admite avisos
  | "requiere-instalar" // iPhone: solo funciona con la app instalada
  | "bloqueado"       // la persona los rechazó en el navegador
  | "apagado"         // se puede activar
  | "encendido";      // ya está recibiendo avisos

function base64UrlABytes(base64: string): Uint8Array {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const crudo = window.atob(normal);
  const bytes = new Uint8Array(crudo.length);
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
  return bytes;
}

/** ¿En qué situación está este dispositivo? */
export async function estadoAvisos(): Promise<EstadoAvisos> {
  if (typeof window === "undefined") return "sin-soporte";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    /* En iPhone, Safari solo ofrece avisos cuando la app está instalada en la
       pantalla de inicio. Antes de instalarla, ni siquiera existe PushManager. */
    const esIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instalada = (window.navigator as any).standalone === true;
    if (esIos && !instalada) return "requiere-instalar";
    return "sin-soporte";
  }
  if (Notification.permission === "denied") return "bloqueado";

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") return "encendido";
  } catch {
    /* si algo falla, tratamos el dispositivo como apagado */
  }
  return "apagado";
}

/** Pide permiso, se suscribe y guarda el dispositivo en el servidor. */
export async function encenderAvisos(userId: string): Promise<string | void> {
  if (!CLAVE_PUBLICA_VAPID) {
    return "Faltan las claves de aviso en el servidor. Avísale a quien administra la plataforma.";
  }
  if (!("Notification" in window)) return "Este navegador no admite avisos.";

  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") {
    return permiso === "denied"
      ? "Bloqueaste los avisos para este sitio. Actívalos desde los ajustes del navegador."
      : "No se concedió el permiso.";
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlABytes(CLAVE_PUBLICA_VAPID),
      });
    }

    const datos = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    const r = await fetch("/api/push/registrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        endpoint: datos.endpoint,
        p256dh: datos.keys?.p256dh,
        auth: datos.keys?.auth,
        userAgent: navigator.userAgent.slice(0, 200),
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return j.error ?? "No se pudo guardar el aviso en el servidor.";
  } catch (e) {
    return e instanceof Error ? e.message : "No se pudieron activar los avisos.";
  }
}

/** Deja de recibir avisos en este dispositivo. */
export async function apagarAvisos(userId: string): Promise<string | void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await fetch("/api/push/registrar", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, endpoint }),
    });
  } catch (e) {
    return e instanceof Error ? e.message : "No se pudieron apagar los avisos.";
  }
}

/**
 * Pide al servidor que avise a todo el equipo.
 * Se llama solo desde las publicaciones de interés colectivo: eventos, calendario
 * y mural. Nunca desde las tareas ni el chat.
 */
export async function avisarAlEquipo(datos: {
  autorId: string;
  titulo: string;
  detalle: string;
  url?: string;
}): Promise<void> {
  try {
    await fetch("/api/push/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
  } catch {
    /* Que un aviso no salga nunca debe impedir que la publicación se guarde.
       El aviso dentro de la app ya quedó registrado de todos modos. */
  }
}
