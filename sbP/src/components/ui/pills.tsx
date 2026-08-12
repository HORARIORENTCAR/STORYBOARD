import { cx } from "@/lib/utils";
import { EventStatus, TaskExecStatus, TaskPriority } from "@/lib/types";

const eventStatusMap: Record<EventStatus, { label: string; classes: string }> = {
  borrador: { label: "Borrador", classes: "bg-ink-100 text-ink-600" },
  publicado: { label: "Publicado", classes: "bg-brand-100 text-brand-800" },
  finalizado: { label: "Finalizado", classes: "bg-sky-100 text-sky-800" },
  archivado: { label: "Archivado", classes: "bg-amber-100 text-amber-800" },
};

export function EventStatusPill({ status }: { status: EventStatus }) {
  const cfg = eventStatusMap[status];
  return <span className={cx("badge", cfg.classes)}>{cfg.label}</span>;
}

const execStatusMap: Record<TaskExecStatus, { label: string; dot: string; classes: string }> = {
  sin_iniciar: { label: "Sin iniciar", dot: "bg-ink-400", classes: "bg-ink-100 text-ink-600" },
  en_proceso: { label: "En proceso", dot: "bg-amber-500", classes: "bg-amber-100 text-amber-800" },
  terminada: { label: "Terminada", dot: "bg-brand-600", classes: "bg-brand-100 text-brand-800" },
};

export function ExecStatusPill({ status }: { status: TaskExecStatus }) {
  const cfg = execStatusMap[status];
  return (
    <span className={cx("badge", cfg.classes)}>
      <span className={cx("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

const priorityMap: Record<TaskPriority, { label: string; classes: string }> = {
  baja: { label: "Baja", classes: "bg-sky-100 text-sky-800" },
  media: { label: "Media", classes: "bg-amber-100 text-amber-800" },
  alta: { label: "Alta", classes: "bg-rose-100 text-rose-800" },
};

export function PriorityPill({ priority }: { priority: TaskPriority }) {
  const cfg = priorityMap[priority];
  return <span className={cx("badge", cfg.classes)}>⚑ {cfg.label}</span>;
}
