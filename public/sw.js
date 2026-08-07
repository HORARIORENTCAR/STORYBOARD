/* Service worker de Staff Board.
   Estrategia: red primero para las páginas (siempre datos frescos),
   caché primero para los archivos estáticos (arranque rápido y offline básico). */
const CACHE = "staff-board-v1";
const ESENCIALES = ["/", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESENCIALES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: intenta la red; si no hay, sirve lo último cacheado.
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Estáticos: caché primero.
  e.respondWith(
    caches.match(request).then((hit) =>
      hit ||
      fetch(request).then((res) => {
        if (res.ok && (url.pathname.startsWith("/_next/") || /\.(png|svg|ico|woff2?|css|js)$/.test(url.pathname))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
    )
  );
});
