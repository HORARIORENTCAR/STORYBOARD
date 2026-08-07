import { EventTask, SchoolEvent } from "./types";

export function slotProgress(task: EventTask) {
  const filled = task.slots.filter((s) => s.userId).length;
  const total = task.slots.length;
  return { filled, total, pct: total === 0 ? 0 : Math.round((filled / total) * 100) };
}

export function isTaskFull(task: EventTask) {
  return task.slots.every((s) => !!s.userId);
}

const execWeight: Record<EventTask["status"], number> = {
  sin_iniciar: 0,
  en_proceso: 55,
  terminada: 100,
};

export function eventProgress(tasks: EventTask[]) {
  if (tasks.length === 0) return 0;
  const total = tasks.reduce((sum, t) => sum + execWeight[t.status], 0);
  return Math.round(total / tasks.length);
}

export function canStillCancel(claimedAt: string | null, windowMinutes: number) {
  if (!claimedAt) return false;
  const diffMs = Date.now() - new Date(claimedAt).getTime();
  return diffMs < windowMinutes * 60_000;
}

export function cancelRemainingSeconds(claimedAt: string | null, windowMinutes: number) {
  if (!claimedAt) return 0;
  const diffMs = Date.now() - new Date(claimedAt).getTime();
  const remaining = windowMinutes * 60_000 - diffMs;
  return Math.max(0, Math.round(remaining / 1000));
}


/* ============================================================
   FECHAS: vencimiento, aviso previo y archivado automático
   ============================================================ */
/** "Hoy" del colegio. La demostración vive en agosto de 2026. */
export const HOY = "2026-08-03";

export function dayDiff(a: string, b: string) {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
}
export const daysLeft = (task: EventTask) => dayDiff(HOY, task.dueDate);
export const isOverdue = (task: EventTask) => task.status !== "terminada" && daysLeft(task) < 0;
export const isDueSoon = (task: EventTask) => {
  const d = daysLeft(task);
  return task.status !== "terminada" && d >= 0 && d <= 3;
};
export function dueLabel(task: EventTask) {
  const d = daysLeft(task);
  if (task.status === "terminada") return "Terminada";
  if (d < 0) return `Vencida hace ${-d} día${d === -1 ? "" : "s"}`;
  if (d === 0) return "Vence hoy";
  if (d === 1) return "Vence mañana";
  return `Faltan ${d} días`;
}
/** ¿Debe archivarse según la regla de la institución? */
export function shouldArchive(task: EventTask, archiveAfterDays: number) {
  return archiveAfterDays > 0 && task.status !== "terminada" && !task.archived && -daysLeft(task) > archiveAfterDays;
}
