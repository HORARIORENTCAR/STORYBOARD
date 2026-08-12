import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { PwaSetup } from "@/components/pwa/pwa-setup";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Staff Board · Caracoli Global School",
  description: "La pizarra digital del colegio: eventos, tareas y colaboración del equipo.",
  manifest: "/manifest.json",
  applicationName: "Staff Board",
  appleWebApp: {
    capable: true,
    title: "Staff Board",
    // "default" deja la barra de estado del iPhone visible y con el contenido
    // debajo. Con "black-translucent" el encabezado quedaba tapado por el reloj
    // y la app instalada parecía rota.
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0d1712",
};

/* Chrome dispara `beforeinstallprompt` en cuanto la página cumple los requisitos
   de instalación, y eso ocurre normalmente ANTES de que React termine de montar.
   Si nadie lo escucha en ese instante, el evento se pierde para siempre y el
   botón "Instalar" nunca aparece: esa era la razón por la que no se podía
   instalar la app. Este script corre en el `head`, antes que todo lo demás,
   guarda el evento en `window` y avisa a la app cuando ya esté lista. */
const CAPTURA_INSTALACION = `
(function () {
  window.__sbInstall = window.__sbInstall || null;
  window.__sbInstalada = false;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__sbInstall = e;
    window.dispatchEvent(new Event('sb-install-listo'));
  });
  window.addEventListener('appinstalled', function () {
    window.__sbInstall = null;
    window.__sbInstalada = true;
    try { localStorage.setItem('staff-board-instalada', '1'); } catch (err) {}
    window.dispatchEvent(new Event('sb-install-hecha'));
  });
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: CAPTURA_INSTALACION }} />
      </head>
      <body className="font-sans antialiased">
        <AppProviders>{children}</AppProviders>
        <PwaSetup />
      </body>
    </html>
  );
}
