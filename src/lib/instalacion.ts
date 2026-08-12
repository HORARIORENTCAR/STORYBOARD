/* Todo lo que la app necesita saber para instalarse en un celular o una
   computadora, en un solo lugar. Lo usan el aviso flotante y la página /instalar.

   El evento `beforeinstallprompt` lo captura un script del `head` (ver layout.tsx)
   y lo deja en `window.__sbInstall`. Aquí solo lo leemos. */

export type EventoInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __sbInstall?: EventoInstalacion | null;
    __sbInstalada?: boolean;
  }
}

export type Plataforma =
  | "android-chrome"
  | "ios-safari"
  | "ios-otro"
  | "escritorio-chromium"
  | "escritorio-safari"
  | "escritorio-firefox"
  | "otro";

export type Sistema = "Android" | "iPhone o iPad" | "Windows" | "Mac" | "tu dispositivo";

export function detectarPlataforma(): { plataforma: Plataforma; sistema: Sistema; navegador: string } {
  if (typeof window === "undefined") {
    return { plataforma: "otro", sistema: "tu dispositivo", navegador: "" };
  }
  const ua = window.navigator.userAgent;
  const bajo = ua.toLowerCase();

  // El iPad moderno se hace pasar por Mac: se delata por tener pantalla táctil.
  const esIpadDisfrazado = /macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
  const esIos = /iphone|ipad|ipod/i.test(ua) || esIpadDisfrazado;
  const esAndroid = /android/i.test(ua);

  const esFirefox = bajo.includes("firefox") || bajo.includes("fxios");
  const esEdge = bajo.includes("edg/") || bajo.includes("edgios") || bajo.includes("edga");
  const esChrome = (bajo.includes("chrome") || bajo.includes("crios")) && !bajo.includes("opr/");
  const esSamsung = bajo.includes("samsungbrowser");
  const esSafari = bajo.includes("safari") && !esChrome && !esEdge && !esFirefox && !esSamsung;

  let navegador = "tu navegador";
  if (esEdge) navegador = "Edge";
  else if (esChrome) navegador = "Chrome";
  else if (esSamsung) navegador = "Samsung Internet";
  else if (esFirefox) navegador = "Firefox";
  else if (esSafari) navegador = "Safari";

  if (esIos) {
    return {
      plataforma: esSafari ? "ios-safari" : "ios-otro",
      sistema: "iPhone o iPad",
      navegador,
    };
  }
  if (esAndroid) {
    return { plataforma: "android-chrome", sistema: "Android", navegador };
  }

  const sistema: Sistema = /mac/i.test(ua) ? "Mac" : "Windows";
  if (esFirefox) return { plataforma: "escritorio-firefox", sistema, navegador };
  if (esSafari) return { plataforma: "escritorio-safari", sistema, navegador };
  return { plataforma: "escritorio-chromium", sistema, navegador };
}

/** ¿La persona ya está usando la app instalada (no dentro del navegador)? */
export function yaEstaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  const modo =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iosStandalone = (window.navigator as any).standalone === true;
  return Boolean(modo || iosStandalone || window.__sbInstalada);
}

/** El evento guardado por el script del head, si el navegador lo ofreció. */
export function promptDisponible(): EventoInstalacion | null {
  if (typeof window === "undefined") return null;
  return window.__sbInstall ?? null;
}

/** Lanza el diálogo nativo del navegador. Devuelve true si la persona aceptó. */
export async function lanzarInstalacion(): Promise<boolean> {
  const evento = promptDisponible();
  if (!evento) return false;
  try {
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") {
      window.__sbInstall = null;
      return true;
    }
  } catch {
    /* el navegador rechazó el diálogo: caemos a las instrucciones manuales */
  }
  return false;
}

/** Pasos escritos, en español, para cada combinación de sistema y navegador. */
export function pasosManuales(plataforma: Plataforma, navegador: string): {
  titulo: string;
  pasos: string[];
  nota?: string;
} {
  switch (plataforma) {
    case "ios-safari":
      return {
        titulo: "En tu iPhone o iPad",
        pasos: [
          "Toca el botón Compartir: es el cuadrito con una flecha hacia arriba, abajo en el centro de la pantalla.",
          "Desliza la lista hacia abajo hasta ver «Añadir a pantalla de inicio».",
          "Tócalo y luego pulsa «Añadir» arriba a la derecha.",
          "Listo: el ícono de Staff Board queda junto a tus demás apps.",
        ],
        nota: "El iPhone no tiene un botón automático de instalar. Este gesto es la forma oficial de Apple y funciona igual de bien.",
      };
    case "ios-otro":
      return {
        titulo: "En tu iPhone o iPad, primero abre Safari",
        pasos: [
          `Estás usando ${navegador}. En el iPhone solo Safari puede instalar aplicaciones.`,
          "Copia la dirección de esta página y ábrela en Safari.",
          "Toca el botón Compartir (el cuadrito con la flecha hacia arriba).",
          "Elige «Añadir a pantalla de inicio» y pulsa «Añadir».",
        ],
      };
    case "android-chrome":
      return {
        titulo: "En tu Android",
        pasos: [
          "Toca los tres puntos ⋮ arriba a la derecha del navegador.",
          "Elige «Instalar aplicación» o «Añadir a pantalla de inicio».",
          "Confirma tocando «Instalar».",
          "Listo: el ícono de Staff Board queda en tu pantalla de inicio.",
        ],
        nota: "Si no ves esa opción, cierra el navegador, vuelve a abrir esta página y espera unos segundos antes de tocar los tres puntos.",
      };
    case "escritorio-chromium":
      return {
        titulo: `En tu computadora, con ${navegador}`,
        pasos: [
          "Mira el final de la barra de direcciones, arriba: aparece un ícono de una pantalla con una flecha hacia abajo.",
          "Haz clic en ese ícono y luego en «Instalar».",
          "Si no lo ves, abre el menú ⋮ (o …) arriba a la derecha y busca «Instalar Staff Board» o «Aplicaciones → Instalar esta página».",
          "La app se abre en su propia ventana, sin barra de navegador, y queda en el menú Inicio.",
        ],
      };
    case "escritorio-safari":
      return {
        titulo: "En tu Mac, con Safari",
        pasos: [
          "En la barra de menús de arriba, abre «Archivo».",
          "Elige «Añadir al Dock».",
          "Confirma pulsando «Añadir».",
        ],
        nota: "Necesitas macOS Sonoma o más reciente. Si no aparece la opción, usa Chrome o Edge.",
      };
    case "escritorio-firefox":
      return {
        titulo: "Firefox no puede instalar aplicaciones web",
        pasos: [
          "Abre esta misma dirección en Chrome, Edge o Brave.",
          "Ahí aparecerá el botón «Instalar» en la barra de direcciones.",
        ],
        nota: "Mientras tanto puedes seguir usando Staff Board normalmente en Firefox; solo no quedará como ícono aparte.",
      };
    default:
      return {
        titulo: "Instalar Staff Board",
        pasos: [
          "Abre esta dirección en Chrome, Edge o Safari.",
          "Busca en el menú del navegador la opción «Instalar» o «Añadir a pantalla de inicio».",
        ],
      };
  }
}
