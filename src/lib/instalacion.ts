/* Todo lo que la app necesita saber para instalarse en un celular o una
   computadora, en un solo lugar. Lo usan el aviso flotante y la página /instalar.

   El evento `beforeinstallprompt` lo captura un script del `head` (ver layout.tsx)
   y lo deja en `window.__sbInstall`. Aquí solo lo leemos. */

/* Marca de esta versión del código. Sirve para saber, de un vistazo, si lo que
   está publicado en internet es realmente lo último que subimos a GitHub.
   Si la página /instalar no muestra exactamente esta marca, el despliegue no llegó. */
export const VERSION_APP = "2026.08.14-SINCRONIA";

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

/* ------------------------------------------------------------------ */
/* Navegadores incrustados (WhatsApp, Facebook, Instagram...)           */
/*                                                                      */
/* Cuando alguien toca un enlace dentro de WhatsApp, la página NO se    */
/* abre en Chrome ni en Safari: se abre en un mini navegador que vive   */
/* dentro de WhatsApp. Ese mini navegador no puede instalar nada ni     */
/* añadir iconos a la pantalla de inicio. Es la causa más común de que  */
/* "la app no se instala" cuando el enlace se repartió por WhatsApp.    */
/* ------------------------------------------------------------------ */

export function navegadorIncrustado(): { dentro: boolean; app: string } {
  if (typeof window === "undefined") return { dentro: false, app: "" };
  const ua = window.navigator.userAgent;

  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return { dentro: true, app: "Facebook" };
  if (/Instagram/i.test(ua)) return { dentro: true, app: "Instagram" };
  if (/\bLine\//i.test(ua)) return { dentro: true, app: "LINE" };
  if (/Snapchat/i.test(ua)) return { dentro: true, app: "Snapchat" };
  if (/BytedanceWebview|musical_ly|TikTok/i.test(ua)) return { dentro: true, app: "TikTok" };

  /* WhatsApp en Android usa el WebView del sistema: se delata por "; wv)"
     junto con "Version/4.0". No dice su nombre, así que lo llamamos por lo
     que es: el navegador interno de otra aplicación. */
  if (/;\s*wv\)/i.test(ua) || (/Android/i.test(ua) && /Version\/\d+\.\d+/i.test(ua))) {
    return { dentro: true, app: "otra aplicación (WhatsApp, Facebook o similar)" };
  }

  return { dentro: false, app: "" };
}

/** Qué modo de presentación reporta el navegador. Solo para el diagnóstico. */
export function modoPresentacion(): string {
  if (typeof window === "undefined") return "desconocido";
  for (const m of ["standalone", "fullscreen", "minimal-ui", "browser"]) {
    if (window.matchMedia?.(`(display-mode: ${m})`).matches) return m;
  }
  return "desconocido";
}

/**
 * ¿La persona ya está usando la app instalada, en su propia ventana?
 *
 * OJO con `minimal-ui`: aquí estaba el error. Chrome en Android responde que sí
 * a `(display-mode: minimal-ui)` en una pestaña normal y corriente, así que la
 * app se creía instalada cuando no lo estaba, escondía el botón y los pasos, y
 * dejaba a la persona sin nada que pulsar.
 *
 * Nuestro manifiesto declara `standalone`, así que una app instalada SIEMPRE se
 * presenta como `standalone` (o `fullscreen`). Esos son los únicos modos válidos
 * para dar por instalada la aplicación.
 */
export function yaEstaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  const modo =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iosStandalone = (window.navigator as any).standalone === true;
  // `__sbInstalada` solo lo pone el evento `appinstalled`, que es un hecho, no una suposición.
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

/* ------------------------------------------------------------------ */
/* Diagnóstico: por qué el navegador no ofrece instalar la aplicación.  */
/* ------------------------------------------------------------------ */

export type Revision = {
  nombre: string;
  estado: "bien" | "mal" | "aviso";
  detalle: string;
};

async function revisarManifiesto(): Promise<Revision[]> {
  const out: Revision[] = [];
  /* Este control tenía un punto ciego grave: buscaba el enlace en TODO el
     documento. Chrome solo lo acepta si está dentro de <head>. Si por lo que sea
     acaba en el <body>, el navegador ignora el manifiesto y la app deja de poder
     instalarse, pero el diagnóstico decía que todo estaba bien. Ahora miramos el
     head, y de paso avisamos si hay más de uno. */
  const enHead = document.head.querySelectorAll('link[rel="manifest"]');
  const enTodo = document.querySelectorAll('link[rel="manifest"]');

  if (enHead.length === 0 && enTodo.length > 0) {
    out.push({
      nombre: "Enlace al manifiesto",
      estado: "mal",
      detalle:
        "El enlace existe pero está FUERA del <head>. Chrome lo ignora en esa posición, y por eso no ofrece instalar.",
    });
    return out;
  }
  if (enHead.length === 0) {
    out.push({
      nombre: "Enlace al manifiesto",
      estado: "mal",
      detalle: "La página no declara ningún manifiesto. Sin esto ningún navegador puede instalarla.",
    });
    return out;
  }
  if (enHead.length > 1) {
    out.push({
      nombre: "Enlace al manifiesto",
      estado: "aviso",
      detalle: `Hay ${enHead.length} enlaces al manifiesto en el head. Debería haber uno solo.`,
    });
  } else {
    out.push({ nombre: "Enlace al manifiesto", estado: "bien", detalle: "Uno solo, y dentro del head." });
  }

  let datos: Record<string, unknown> | null = null;
  try {
    const r = await fetch("/app.webmanifest", { cache: "no-store" });
    if (!r.ok) {
      out.push({
        nombre: "Archivo manifest.json",
        estado: "mal",
        detalle: `El servidor responde ${r.status}. El archivo no está publicado: falta subir la carpeta public.`,
      });
      return out;
    }
    datos = await r.json();
    out.push({ nombre: "Archivo manifest.json", estado: "bien", detalle: "Se descarga y se entiende bien." });
  } catch (e) {
    out.push({
      nombre: "Archivo manifest.json",
      estado: "mal",
      detalle: "No se pudo leer. Puede estar dañado o no publicado.",
    });
    return out;
  }

  const iconos = (datos?.icons as { src: string; sizes: string }[] | undefined) ?? [];
  if (iconos.length === 0) {
    out.push({ nombre: "Iconos", estado: "mal", detalle: "El manifiesto no declara iconos." });
    return out;
  }
  const fallidos: string[] = [];
  await Promise.all(
    iconos.map(
      (ic) =>
        new Promise<void>((listo) => {
          const img = new Image();
          img.onload = () => listo();
          img.onerror = () => {
            fallidos.push(ic.src);
            listo();
          };
          img.src = ic.src;
        })
    )
  );
  out.push(
    fallidos.length === 0
      ? { nombre: "Iconos", estado: "bien", detalle: `${iconos.length} iconos cargan correctamente.` }
      : {
          nombre: "Iconos",
          estado: "mal",
          detalle: `No cargan: ${fallidos.join(", ")}. Sin iconos el navegador se niega a instalar.`,
        }
  );
  return out;
}

async function revisarServiceWorker(): Promise<Revision> {
  if (!("serviceWorker" in navigator)) {
    return {
      nombre: "Service worker",
      estado: "mal",
      detalle: "Este navegador no lo admite, así que no puede instalar aplicaciones.",
    };
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      return {
        nombre: "Service worker",
        estado: "aviso",
        detalle: "Todavía no está registrado. Recarga la página y espera unos segundos.",
      };
    }
    if (reg.active) {
      return { nombre: "Service worker", estado: "bien", detalle: "Registrado y activo." };
    }
    return {
      nombre: "Service worker",
      estado: "aviso",
      detalle: "Registrado pero aún arrancando. Recarga en unos segundos.",
    };
  } catch {
    return { nombre: "Service worker", estado: "mal", detalle: "Falló el registro." };
  }
}

/** Corre todas las comprobaciones y devuelve una lista lista para mostrar. */
export async function diagnosticar(): Promise<Revision[]> {
  const out: Revision[] = [];
  const { plataforma, sistema, navegador } = detectarPlataforma();

  out.push({
    nombre: "Versión publicada",
    estado: "bien",
    detalle: VERSION_APP,
  });
  out.push({
    nombre: "Equipo detectado",
    estado: "bien",
    detalle: `${sistema} · ${navegador} · modo "${modoPresentacion()}"`,
  });

  const incrustado = navegadorIncrustado();
  out.push({
    nombre: "¿Navegador real o interno?",
    estado: incrustado.dentro ? "mal" : "bien",
    detalle: incrustado.dentro
      ? `Estás dentro del navegador interno de ${incrustado.app}. Ese mini navegador no puede instalar aplicaciones. Abre esta dirección en Chrome o Safari.`
      : "Estás en un navegador de verdad, que sí puede instalar.",
  });

  const seguro = window.isSecureContext || window.location.hostname === "localhost";
  out.push({
    nombre: "Conexión segura (HTTPS)",
    estado: seguro ? "bien" : "mal",
    detalle: seguro
      ? "La dirección usa https, como debe ser."
      : "Sin https ningún navegador permite instalar. Usa la dirección que empieza por https://",
  });

  if (yaEstaInstalada()) {
    out.push({
      nombre: "¿Ya está instalada?",
      estado: "aviso",
      detalle:
        "Sí. Por eso el navegador no vuelve a ofrecerla. Búscala entre tus aplicaciones; si quieres reinstalarla, desinstálala primero.",
    });
  } else {
    out.push({ nombre: "¿Ya está instalada?", estado: "bien", detalle: "No, se puede instalar." });
  }

  /* Cuando Android TERMINA de instalar la app, el navegador avisa con el evento
     `appinstalled` y lo dejamos apuntado. Si está apuntado pero no ves el ícono,
     la instalación sí funcionó y el ícono está en el cajón de aplicaciones, no en
     la pantalla de inicio. Distinguir estos dos casos es lo que más cuesta
     averiguar a ojo, y aquí lo sabemos con certeza. */
  let confirmada = false;
  try {
    confirmada = window.localStorage.getItem("staff-board-instalada") === "1";
  } catch {
    /* sin almacenamiento no podemos saberlo */
  }
  if (confirmada && !yaEstaInstalada()) {
    out.push({
      nombre: "Instalación anterior",
      estado: "aviso",
      detalle:
        "Este navegador YA completó la instalación una vez. Si no ves el ícono en la pantalla de inicio, está en el cajón de aplicaciones: desliza hacia arriba, busca «Staff Board» y arrástralo a la pantalla.",
    });
  } else if (!confirmada) {
    out.push({
      nombre: "Instalación anterior",
      estado: "bien",
      detalle: "Este navegador nunca ha llegado a completar una instalación aquí.",
    });
  }

  const soporta = "onbeforeinstallprompt" in window;
  if (plataforma === "ios-safari") {
    out.push({
      nombre: "Instalación automática",
      estado: "aviso",
      detalle:
        "Safari en iPhone nunca ofrece botón automático. Es normal: hay que usar Compartir → Añadir a pantalla de inicio.",
    });
  } else if (plataforma === "ios-otro") {
    out.push({
      nombre: "Instalación automática",
      estado: "mal",
      detalle: `En iPhone solo Safari puede instalar. Estás usando ${navegador}.`,
    });
  } else if (!soporta) {
    out.push({
      nombre: "Instalación automática",
      estado: "mal",
      detalle: `${navegador} no admite instalar aplicaciones web. Usa Chrome, Edge o Brave.`,
    });
  } else {
    const hay = Boolean(promptDisponible());
    out.push({
      nombre: "Instalación automática",
      estado: hay ? "bien" : "aviso",
      detalle: hay
        ? "El navegador ya ofreció instalarla: el botón de arriba funciona."
        : "El navegador aún no la ha ofrecido. Suele resolverse recargando la página; si no, instálala desde el menú del navegador.",
    });
  }

  out.push(...(await revisarManifiesto()));
  out.push(await revisarServiceWorker());
  return out;
}

/** Convierte el diagnóstico en texto plano para pegarlo en un mensaje. */
export function diagnosticoATexto(revisiones: Revision[]): string {
  const simbolo = { bien: "[OK]", aviso: "[!]", mal: "[X]" } as const;
  return [
    "Diagnóstico de instalación de Staff Board",
    typeof window !== "undefined" ? window.location.href : "",
    typeof navigator !== "undefined" ? navigator.userAgent : "",
    "",
    ...revisiones.map((r) => `${simbolo[r.estado]} ${r.nombre}: ${r.detalle}`),
  ].join("\n");
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
        titulo: "En tu Android, desde el menú del navegador",
        pasos: [
          "Busca los tres puntitos ⋮ del navegador. Están en una esquina: arriba a la derecha, o abajo a la derecha junto a la barra de la dirección. Tócalos.",
          "Se abre una lista. Bájala hasta encontrar «Instalar aplicación» o «Añadir a pantalla de inicio». Suele estar por la mitad.",
          "Tócala. Sale un cuadro con el nombre Staff Board y su ícono.",
          "Pulsa «Instalar» o «Añadir». El ícono queda en tu pantalla de inicio, junto a tus otras apps.",
        ],
        nota: "¿No encuentras esa opción en la lista? Casi siempre es porque ya tienes la app instalada: el navegador deja de ofrecerla. Búscala primero entre tus aplicaciones deslizando hacia arriba en la pantalla de inicio.",
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
