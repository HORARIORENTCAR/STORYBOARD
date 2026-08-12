/** @type {import('next').NextConfig} */
/* Sin cabeceras a mano. Vercel ya sirve manifest.json y sw.js con el tipo
   correcto; añadir un Content-Type propio duplicaba la cabecera y era una
   variable más que no estaba cuando la instalación funcionaba. */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
};
export default nextConfig;
