"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Info,
  Monitor,
  RefreshCw,
  Smartphone,
  Sparkles,
  Stethoscope,
  XCircle,
} from "lucide-react";
import {
  detectarPlataforma,
  diagnosticar,
  diagnosticoATexto,
  lanzarInstalacion,
  navegadorIncrustado,
  pasosManuales,
  promptDisponible,
  yaEstaInstalada,
  VERSION_APP,
  type Plataforma,
  type Revision,
  type Sistema,
} from "@/lib/instalacion";

/* Página pública: se puede abrir SIN iniciar sesión, porque la persona nueva
   recibe el enlace por WhatsApp o correo y lo primero que quiere es tener el
   ícono en su teléfono. No usa Shell a propósito (Shell obliga a iniciar sesión). */

export default function InstalarPage() {
  const [plataforma, setPlataforma] = useState<Plataforma>("otro");
  const [sistema, setSistema] = useState<Sistema>("tu dispositivo");
  const [navegador, setNavegador] = useState("tu navegador");
  const [hayPrompt, setHayPrompt] = useState(false);
  const [instalada, setInstalada] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [direccion, setDireccion] = useState("");
  const [incrustado, setIncrustado] = useState<{ dentro: boolean; app: string }>({
    dentro: false,
    app: "",
  });
  const [revisiones, setRevisiones] = useState<Revision[] | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [copiadoDiag, setCopiadoDiag] = useState(false);

  const revisar = useCallback(() => {
    setHayPrompt(Boolean(promptDisponible()));
    setInstalada(yaEstaInstalada());
  }, []);

  useEffect(() => {
    const info = detectarPlataforma();
    setPlataforma(info.plataforma);
    setSistema(info.sistema);
    setNavegador(info.navegador);
    setDireccion(window.location.origin);
    setIncrustado(navegadorIncrustado());
    revisar();

    window.addEventListener("sb-install-listo", revisar);
    window.addEventListener("sb-install-hecha", revisar);
    // Chrome a veces tarda unos segundos en decidir que la página es instalable.
    const reloj = window.setInterval(revisar, 1500);
    return () => {
      window.removeEventListener("sb-install-listo", revisar);
      window.removeEventListener("sb-install-hecha", revisar);
      window.clearInterval(reloj);
    };
  }, [revisar]);

  async function instalar() {
    setInstalando(true);
    setAviso("");
    const ok = await lanzarInstalacion();
    setInstalando(false);
    if (ok) {
      setInstalada(true);
      return;
    }
    setHayPrompt(Boolean(promptDisponible()));
    setAviso("No se completó la instalación. Puedes intentarlo de nuevo o seguir los pasos de abajo.");
  }

  async function revisarTodo() {
    setRevisando(true);
    setCopiadoDiag(false);
    try {
      setRevisiones(await diagnosticar());
    } finally {
      setRevisando(false);
    }
  }

  async function copiarDiagnostico() {
    if (!revisiones) return;
    try {
      await navigator.clipboard.writeText(diagnosticoATexto(revisiones));
      setCopiadoDiag(true);
      window.setTimeout(() => setCopiadoDiag(false), 2500);
    } catch {
      setAviso("No se pudo copiar el diagnóstico. Toma una captura de pantalla.");
    }
  }

  async function copiarDireccion() {
    try {
      await navigator.clipboard.writeText(direccion);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setAviso("No se pudo copiar. Selecciona la dirección y cópiala a mano.");
    }
  }

  const manual = pasosManuales(plataforma, navegador);
  const esMovil = plataforma === "android-chrome" || plataforma.startsWith("ios");
  const Icono = esMovil ? Smartphone : Monitor;

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-950 via-brand-950 to-brand-900 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-brand-100/80 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a Staff Board
        </Link>

        <div className="overflow-hidden rounded-2xl bg-white shadow-pop">
          <div className="flex items-start gap-4 bg-gradient-to-br from-brand-800 to-ink-950 p-6 text-white sm:p-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight sm:text-2xl">Instala Staff Board</h1>
              <p className="mt-1.5 text-sm text-brand-100/85">
                Queda como una app más en tu {esMovil ? "pantalla de inicio" : "escritorio"}: se abre
                de un toque, sin barra de navegador y sin pasar por ninguna tienda.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {incrustado.dentro && !instalada && (
              <div className="mb-6 rounded-2xl border-2 border-rose-400 bg-rose-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />
                  <div className="min-w-0">
                    <p className="text-base font-bold text-rose-900">
                      Esta página se abrió dentro de {incrustado.app}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-rose-800">
                      Cuando tocas un enlace dentro de WhatsApp, la página no se abre en Chrome ni en
                      Safari, sino en un mini navegador que vive dentro de esa aplicación.{" "}
                      <strong>Ese mini navegador no puede instalar aplicaciones.</strong> Por eso no
                      te aparece el ícono. No es culpa tuya ni del teléfono.
                    </p>
                    <p className="mt-3 text-sm font-semibold text-rose-900">Solución, en 10 segundos:</p>
                    <ol className="mt-1.5 space-y-1 text-sm leading-relaxed text-rose-800">
                      <li>
                        1. Toca los tres puntos <strong>⋮</strong> arriba a la derecha de esta
                        pantalla (o el botón <strong>Compartir</strong> si estás en iPhone).
                      </li>
                      <li>
                        2. Elige <strong>«Abrir en el navegador»</strong>, «Abrir en Chrome» o
                        «Abrir en Safari».
                      </li>
                      <li>3. Ya en el navegador de verdad, vuelve a esta página y sigue los pasos.</li>
                    </ol>
                    <button onClick={copiarDireccion} className="btn-primary mt-4 !py-2 !text-sm">
                      {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiado ? "¡Dirección copiada!" : "Copiar la dirección"}
                    </button>
                    <p className="mt-2 text-xs text-rose-700">
                      También puedes copiar la dirección y pegarla tú mismo en Chrome o Safari.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {instalada ? (
              <div className="flex items-start gap-3 rounded-2xl border-2 border-brand-500 bg-brand-50 p-5">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-brand-700" />
                <div>
                  <p className="text-base font-bold text-brand-900">Ya la tienes instalada</p>
                  <p className="mt-1 text-sm text-brand-800">
                    Busca el ícono de Staff Board entre tus aplicaciones y ábrelo desde ahí. Si no lo
                    encuentras, revisa la lista completa de apps de tu {sistema}.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-center gap-2 rounded-xl bg-ink-50 px-4 py-2.5 text-xs font-medium text-ink-600">
                  <Icono className="h-4 w-4 text-ink-500" />
                  Detectamos que estás en <strong className="text-ink-900">{sistema}</strong> con{" "}
                  <strong className="text-ink-900">{navegador}</strong>
                </div>

                {hayPrompt && (
                  <div className="mb-6 rounded-2xl border-2 border-brand-500 bg-brand-50 p-5 text-center">
                    <p className="text-sm font-semibold text-brand-900">
                      Tu navegador puede instalarla ahora mismo
                    </p>
                    <button
                      onClick={instalar}
                      disabled={instalando}
                      className="btn-primary mx-auto mt-3 !px-6 !py-3 !text-base"
                    >
                      <Download className="h-5 w-5" />
                      {instalando ? "Instalando..." : "Instalar Staff Board"}
                    </button>
                    <p className="mt-2.5 text-xs text-brand-800">
                      Se abrirá un cuadro del navegador. Pulsa «Instalar» para confirmar.
                    </p>
                  </div>
                )}

                <p className="section-eyebrow">
                  {hayPrompt ? "O hazlo a mano" : "Pasos a seguir"}
                </p>
                <h2 className="mt-1 text-lg font-bold text-ink-900">{manual.titulo}</h2>

                <ol className="mt-4 space-y-3">
                  {manual.pasos.map((paso, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <p className="pt-0.5 text-sm leading-relaxed text-ink-700">{paso}</p>
                    </li>
                  ))}
                </ol>

                {manual.nota && (
                  <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <p className="text-xs leading-relaxed text-amber-900">{manual.nota}</p>
                  </div>
                )}

                {aviso && <p className="mt-4 text-xs font-medium text-rose-600">{aviso}</p>}
              </>
            )}

            <div className="my-6 h-px bg-ink-100" />

            <p className="section-eyebrow">Para instalarla en otro equipo</p>
            <p className="mt-1 text-sm text-ink-600">
              Abre esta misma dirección en el otro teléfono o computadora y repite los pasos.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="min-w-0 flex-1 break-all rounded-xl border border-ink-100 bg-ink-50 px-3 py-2.5 font-mono text-xs text-ink-800">
                {direccion || "..."}
              </code>
              <button onClick={copiarDireccion} className="btn-secondary !py-2 !text-xs">
                {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiado ? "¡Copiada!" : "Copiar dirección"}
              </button>
            </div>

            <div className="my-6 h-px bg-ink-100" />

            <p className="section-eyebrow">¿No aparece la opción de instalar?</p>
            <p className="mt-1 text-sm text-ink-600">
              Esta revisión comprueba, aquí mismo en tu equipo, todo lo que el navegador necesita
              para poder instalar la app, y te dice en español qué falta.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button onClick={revisarTodo} disabled={revisando} className="btn-secondary !py-2 !text-sm">
                {revisando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
                {revisando ? "Revisando..." : "Revisar mi equipo"}
              </button>
              {revisiones && (
                <button onClick={copiarDiagnostico} className="btn-ghost !py-2 !text-sm">
                  {copiadoDiag ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiadoDiag ? "¡Copiado!" : "Copiar el resultado"}
                </button>
              )}
            </div>

            {revisiones && (
              <ul className="mt-4 space-y-2">
                {revisiones.map((r, i) => (
                  <li
                    key={i}
                    className={
                      "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 " +
                      (r.estado === "bien"
                        ? "border-brand-200 bg-brand-50"
                        : r.estado === "aviso"
                          ? "border-amber-200 bg-amber-50"
                          : "border-rose-200 bg-rose-50")
                    }
                  >
                    {r.estado === "bien" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                    ) : r.estado === "aviso" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink-900">{r.nombre}</p>
                      <p className="mt-0.5 break-words text-xs leading-relaxed text-ink-600">{r.detalle}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 rounded-xl bg-ink-50 px-4 py-3.5">
              <p className="text-xs font-semibold text-ink-800">Tres cosas que conviene saber</p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-600">
                <li>
                  · <strong className="text-ink-800">Instalar es opcional.</strong> Aunque no la
                  instales, puedes entrar con tu correo y contraseña desde cualquier navegador. La app
                  funciona igual; instalarla solo te ahorra escribir la dirección.
                </li>
                <li>· No está en Google Play ni en la App Store, y no hace falta: se instala desde aquí.</li>
                <li>· Puedes instalarla en el celular y en la computadora a la vez, con la misma cuenta.</li>
              </ul>
            </div>

            <Link href="/login" className="btn-primary mt-6 w-full">
              Ir a iniciar sesión
            </Link>

            <p className="mt-4 text-center font-mono text-[11px] text-ink-400">
              Versión {VERSION_APP}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
