import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { PwaSetup } from "@/components/pwa/pwa-setup";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Staff Board · Caracoli Global School",
  description: "La pizarra digital del colegio: eventos, tareas y colaboración del equipo.",
  manifest: "/app.webmanifest",
  applicationName: "Staff Board",
  appleWebApp: {
    capable: true,
    title: "Staff Board",
    // "default" deja la barra de estado del iPhone visible y con el contenido
    // debajo. Con "black-translucent" el encabezado quedaba tapado por el reloj.
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
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

/* Chrome dispara `beforeinstallprompt` antes de que React monte, así que hay
   que escucharlo lo más temprano posible.

   MUY IMPORTANTE: esto va con <Script strategy="beforeInteractive"/>, NUNCA
   dentro de una etiqueta <head> escrita a mano. En el App Router de Next,
   escribir <head> a mano compite con el sistema de metadatos y puede acabar
   sacando el <link rel="manifest"> fuera del head. Si eso pasa, Chrome ignora
   el manifiesto por completo y la aplicación deja de poder instalarse, sin dar
   ningún error. Next inyecta este script en el head por su cuenta. */
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
      <body className="font-sans antialiased">
        <Script
          id="captura-instalacion"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: CAPTURA_INSTALACION }}
        />
        <AppProviders>{children}</AppProviders>
        <PwaSetup />
      </body>
    </html>
  );
}
