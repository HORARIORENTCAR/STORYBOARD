import { redirect } from "next/navigation";

/* "Mi agenda" se retiró de la aplicación. Ojo: no confundir con la pestaña
   "Agenda" que había en la barra del celular — esa era el calendario, y ahora
   se llama "Calendario", igual que en la computadora.
   La página se conserva solo para que un enlace viejo o un marcador guardado
   no acabe en un error: manda al calendario. */
export default function AgendaRetirado() {
  redirect("/calendario");
}
