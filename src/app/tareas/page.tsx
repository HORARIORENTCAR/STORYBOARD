import { redirect } from "next/navigation";

/* "Mis tareas" se retiró de la aplicación. Las tareas siguen existiendo dentro
   de cada evento, que es donde tienen sentido; lo que se quitó es la lista
   suelta. La página se conserva solo para que un enlace viejo o un marcador
   guardado no acabe en un error: manda al muro y ya. */
export default function TareasRetirado() {
  redirect("/");
}
