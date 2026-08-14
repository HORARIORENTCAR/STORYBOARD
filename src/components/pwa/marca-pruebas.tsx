"use client";

import { useEffect, useState } from "react";

/**
 * Aviso visible cuando la aplicación NO es la que usa el equipo.
 *
 * Las dos direcciones se ven idénticas por dentro, así que es facilísimo creer
 * que estás probando cuando en realidad estás tocando lo que ve el colegio.
 *
 * Se dibuja como un MARCO NARANJA alrededor de toda la pantalla, con una
 * etiqueta arriba en el centro. Un distintivo pequeño en una esquina pasaba
 * desapercibido; un marco completo, no. Y como es solo un borde, no tapa
 * ningún botón ni contenido.
 */

/** La dirección de verdad, la que usa el equipo. Todo lo demás es pruebas. */
const DIRECCION_REAL = "storyboard-two-inky.vercel.app";

export function MarcaPruebas() {
  const [esPruebas, setEsPruebas] = useState(false);

  useEffect(() => {
    setEsPruebas(window.location.hostname !== DIRECCION_REAL);
  }, []);

  if (!esPruebas) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      {/* El marco: cuatro franjas naranjas pegadas a los bordes de la pantalla */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-amber-500" />
      <div className="absolute inset-x-0 bottom-0 h-1.5 bg-amber-500" />
      <div className="absolute inset-y-0 left-0 w-1.5 bg-amber-500" />
      <div className="absolute inset-y-0 right-0 w-1.5 bg-amber-500" />

      {/* La etiqueta, colgando del borde superior, en el centro */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-lg bg-amber-500 px-4 py-1 shadow-pop">
        <span className="text-[11px] font-bold uppercase tracking-widest text-white">
          Copia de pruebas
        </span>
      </div>
    </div>
  );
}
