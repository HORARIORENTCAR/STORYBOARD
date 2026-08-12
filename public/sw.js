/* Service worker de Staff Board.
   v4 — La RED manda siempre que haya conexión; la caché es solo respaldo.
   Además guardamos /instalar y /login para que la guía de instalación se pueda
   abrir aunque la conexión esté floja: es lo primero que ve alguien nuevo. */
const CACHE = "staff-board-v4";
const ESENCIALES = ["/", "/login", "/instalar", "/manifest.json"];

self.addEventListener("install", (e) => {
  // skipWaiting: la versión nueva toma el control de inmediato,
  // sin esperar a que la persona cierre todas las pestañas.
  e.waitUntil(
    caches
      .open(CACHE)
      // addAll falla entero si un solo archivo falla; por eso vamos uno por uno.
      .then((c) => Promise.all(ESENCIALES.map((u) => c.add(u).catch(() => {}))))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
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

  // El manifiesto siempre desde la red: si se sirve una versión vieja,
  // el navegador puede negarse a instalar la app.
  if (url.pathname === "/manifest.json") {
    e.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

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
        caches
          .match(request)
          .then((r) => r || (request.mode === "navigate" ? caches.match("/") : undefined))
      )
  );
});
