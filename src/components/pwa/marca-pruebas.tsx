"use client";

import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";

/**
 * Señal de que esta NO es la aplicación que usa el equipo.
 *
 * Historia de dos intentos fallidos, para que no se repitan:
 *  1. Un distintivo pequeño en una esquina: pasaba desapercibido.
 *  2. Un marco naranja flotando sobre toda la pantalla: se veía perfectamente,
 *     pero cualquier capa por encima acaba estorbando algún botón.
 *
 * La solución buena es esta: la marca va DENTRO de la barra superior, como un
 * elemento más de la página. Se ve siempre, en todas las pantallas, y no puede
 * taparle el paso a nada porque ocupa su propio sitio.
 */

/** La dirección de verdad, la que usa el equipo. Todo lo demás es pruebas. */
const DIRECCION_REAL = "storyboard-two-inky.vercel.app";

export function useEsPruebas(): boolean {
  const [esPruebas, setEsPruebas] = useState(false);
  useEffect(() => {
    setEsPruebas(window.location.hostname !== DIRECCION_REAL);
  }, []);
  return esPruebas;
}

/** Etiqueta naranja para colocar dentro de la barra superior. */
export function ChipPruebas() {
  const esPruebas = useEsPruebas();
  if (!esPruebas) return null;

  return (
    <span
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-1"
      title="Esta es la copia de pruebas. Lo que ves aquí todavía no lo tiene el equipo."
    >
      <FlaskConical className="h-3.5 w-3.5 text-white" />
      <span className="text-[11px] font-bold uppercase tracking-wide text-white">Pruebas</span>
    </span>
  );
}
