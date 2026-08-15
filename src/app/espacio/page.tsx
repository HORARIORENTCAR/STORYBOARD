import { redirect } from "next/navigation";

/* "Mi espacio" se retiró de la aplicación.
   La página se conserva solo para que un enlace viejo o un marcador guardado
   no acabe en un error: manda al muro y ya. */
export default function EspacioRetirado() {
  redirect("/");
}
