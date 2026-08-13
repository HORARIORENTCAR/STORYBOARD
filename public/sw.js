/* Service worker de Staff Board.
   v3 — Estrategia corregida: la RED manda siempre que haya conexión.
   El problema de la v1 era que el código de la app (JS/CSS) se servía desde
   la caché para siempre, así que las correcciones publicadas nunca llegaban
   al usuario. Ahora la caché solo sirve como respaldo cuando no hay internet. */
const CACHE = "staff-board-v6";
const ESENCIALES = ["/", "/app.webmanifest"];

self.addEventListener("install", (e) => {
  // skipWaiting: la versión nueva toma el control de inmediato,
  // sin esperar a que la persona cierre todas las pestañas.
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ESENCIALES)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Permite que la página pida forzar la actualización.
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Nunca cachear llamadas a la base de datos ni al servidor.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  const esImagenOFuente = /\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/.test(url.pathname);

  // Imágenes e iconos: caché primero (no cambian y hacen la app rápida).
  if (esImagenOFuente) {
    e.respondWith(
      caches.match(request).then((hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
      )
    );
    return;
  }

  // TODO LO DEMÁS (páginas, JS, CSS): red primero.
  // Así cualquier corrección publicada se ve al instante.
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((r) => r || (request.mode === "navigate" ? caches.match("/") : undefined))
      )
  );
});
