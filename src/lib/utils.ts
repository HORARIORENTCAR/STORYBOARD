import { EventColor } from "./types";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const colorTokens: Record<
  EventColor,
  { bg: string; text: string; border: string; solid: string; soft: string }
> = {
  brand: { bg: "bg-brand-100", text: "text-brand-800", border: "border-brand-200", solid: "bg-brand-700", soft: "bg-brand-50" },
  amber: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200", solid: "bg-amber-500", soft: "bg-amber-50" },
  sky: { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200", solid: "bg-sky-600", soft: "bg-sky-50" },
  violet: { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-200", solid: "bg-violet-600", soft: "bg-violet-50" },
  rose: { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200", solid: "bg-rose-600", soft: "bg-rose-50" },
};

export function formatDay(dateStr: string) {
  const d = new Date(dateStr + (dateStr.length <= 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("es-DO", { day: "2-digit" });
}

export function formatMonthShort(dateStr: string) {
  const d = new Date(dateStr + (dateStr.length <= 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("es-DO", { month: "short" }).replace(".", "").toUpperCase();
}

export function formatFullDate(dateStr: string) {
  const d = new Date(dateStr + (dateStr.length <= 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" });
}

export function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "justo ahora";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d`;
  const months = Math.floor(days / 30);
  return `${months} mes${months > 1 ? "es" : ""}`;
}

export function daysUntil(dateStr: string) {
  const target = new Date(dateStr + "T00:00:00").getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

export function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ============================================================
   DOMINIOS INSTITUCIONALES
   El colegio puede tener más de uno (por ejemplo, uno para
   docentes y otro para administración). Se escriben separados
   por comas en Configuración. Si el campo queda vacío, se
   acepta cualquier correo.
   ============================================================ */
export function dominiosPermitidos(domain: string | undefined | null): string[] {
  return (domain ?? "")
    .split(/[,;\s]+/)
    .map((d) => d.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);
}

export function correoPermitido(email: string, domain: string | undefined | null): boolean {
  const lista = dominiosPermitidos(domain);
  if (lista.length === 0) return true; // sin restricción configurada
  const limpio = email.trim().toLowerCase();
  return lista.some((d) => limpio.endsWith("@" + d));
}

/** Texto legible para mostrarle al usuario qué dominios se aceptan. */
export function textoDominios(domain: string | undefined | null): string {
  const lista = dominiosPermitidos(domain);
  if (lista.length === 0) return "cualquier correo";
  if (lista.length === 1) return "@" + lista[0];
  return lista.map((d) => "@" + d).slice(0, -1).join(", ") + " o @" + lista[lista.length - 1];
}
