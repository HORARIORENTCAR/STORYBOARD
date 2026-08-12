/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },

  /* Cabeceras necesarias para que el navegador acepte instalar la app.
     Sin el tipo correcto en el manifiesto, Chrome lo ignora en silencio y
     nunca ofrece el botón "Instalar". Y si el service worker se queda
     cacheado, el celular sigue con la versión vieja para siempre. */
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};
export default nextConfig;
