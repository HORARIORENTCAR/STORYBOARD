"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Users2, SlidersHorizontal, X } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/store";
import { TaskCard } from "@/components/tasks/task-card";
import { EventColor, TaskExecStatus } from "@/lib/types";
import { cx } from "@/lib/utils";
import { daysLeft } from "@/lib/task-helpers";

const colorFiltros: { value: EventColor; hex: string; label: string }[] = [
  { value: "brand", hex: "#18854e", label: "Verde" },
  { value: "amber", hex: "#d97706", label: "Ámbar" },
  { value: "sky", hex: "#0284c7", label: "Azul" },
  { value: "violet", hex: "#7c3aed", label: "Violeta" },
  { value: "rose", hex: "#e11d48", label: "Rosa" },
];

const columns: { key: TaskExecStatus; label: string; dot: string }[] = [
  { key: "sin_iniciar", label: "Sin iniciar", dot: "bg-ink-400" },
  { key: "en_proceso", label: "En proceso", dot: "bg-amber-500" },
  { key: "terminada", label: "Terminada", dot: "bg-brand-600" },
];

export default function MisTareasPage() {
  const { liveTasks, wallEvents, currentUser, users } = useApp();
  const tasks = liveTasks; // lo archivado no estorba

  const publishedEventIds = new Set(wallEvents.map((e) => e.id));
  const todasVisibles = useMemo(
    () => tasks.filter((t) => publishedEventIds.has(t.eventId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, wallEvents]
  );

  /* ---- Filtros que pide la especificación: estado, fecha, color, responsable y evento ---- */
  const [fEvento, setFEvento] = useState("todos");
  const [fColor, setFColor] = useState<"todos" | EventColor>("todos");
  const [fResponsable, setFResponsable] = useState("todos");
  const [fFecha, setFFecha] = useState<"todas" | "vencidas" | "7" | "30">("todas");

  const hayFiltros = fEvento !== "todos" || fColor !== "todos" || fResponsable !== "todos" || fFecha !== "todas";

  function limpiarFiltros() {
    setFEvento("todos");
    setFColor("todos");
    setFResponsable("todos");
    setFFecha("todas");
  }

  const visibleTasks = useMemo(
    () =>
      todasVisibles.filter((t) => {
        if (fEvento !== "todos" && t.eventId !== fEvento) return false;
        if (fColor !== "todos" && t.color !== fColor) return false;
        if (fResponsable !== "todos") {
          const enTarea =
            t.slots.some((sl) => sl.userId === fResponsable) || t.leaderId === fResponsable;
          if (!enTarea) return false;
        }
        if (fFecha !== "todas") {
          const d = daysLeft(t);
          if (fFecha === "vencidas" && !(d < 0 && t.status !== "terminada")) return false;
          if (fFecha === "7" && !(d >= 0 && d <= 7)) return false;
          if (fFecha === "30" && !(d >= 0 && d <= 30)) return false;
        }
        return true;
      }),
    [todasVisibles, fEvento, fColor, fResponsable, fFecha]
  );

  /** Solo las personas que realmente participan en alguna tarea visible. */
  const responsables = useMemo(() => {
    const ids = new Set<string>();
    todasVisibles.forEach((t) => {
      t.slots.forEach((sl) => sl.userId && ids.add(sl.userId));
      if (t.leaderId) ids.add(t.leaderId);
    });
    return users.filter((u) => ids.has(u.id));
  }, [todasVisibles, users]);

  const assignedCount = visibleTasks.filter((t) => t.slots.some((s) => s.userId === currentUser?.id)).length;
  const pendingCount = visibleTasks.filter((t) => t.status !== "terminada").length;
  const openSpaces = useMemo(
    () => visibleTasks.reduce((sum, t) => sum + t.slots.filter((s) => !s.userId).length, 0),
    [visibleTasks]
  );

  return (
    <Shell>
      <PageHeader
        eyebrow="Colaboración"
        title="Mis tareas"
        description="Mira tus responsabilidades y los espacios disponibles para ayudar."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={CheckCircle2} value={assignedCount} label="tareas asignadas" color="bg-brand-100 text-brand-700" />
        <StatCard icon={Clock3} value={pendingCount} label="pendientes" color="bg-amber-100 text-amber-700" />
        <StatCard icon={Users2} value={openSpaces} label="espacios disponibles" color="bg-sky-100 text-sky-700" />
      </div>

      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="flex items-center gap-1.5 self-center text-sm font-medium text-ink-600">
          <SlidersHorizontal className="h-4 w-4 text-ink-400" /> Filtrar
        </div>

        <label className="min-w-[150px] flex-1">
          <span className="mb-1 block text-xs font-medium text-ink-500">Evento</span>
          <select className="input !py-1.5 !text-sm" value={fEvento} onChange={(e) => setFEvento(e.target.value)}>
            <option value="todos">Todos los eventos</option>
            {wallEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </label>

        <label className="min-w-[140px] flex-1">
          <span className="mb-1 block text-xs font-medium text-ink-500">Responsable</span>
          <select className="input !py-1.5 !text-sm" value={fResponsable} onChange={(e) => setFResponsable(e.target.value)}>
            <option value="todos">Cualquiera</option>
            {responsables.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>

        <label className="min-w-[130px] flex-1">
          <span className="mb-1 block text-xs font-medium text-ink-500">Fecha</span>
          <select
            className="input !py-1.5 !text-sm"
            value={fFecha}
            onChange={(e) => setFFecha(e.target.value as typeof fFecha)}
          >
            <option value="todas">Cualquier fecha</option>
            <option value="vencidas">Vencidas</option>
            <option value="7">Próximos 7 días</option>
            <option value="30">Próximos 30 días</option>
          </select>
        </label>

        <div>
          <span className="mb-1 block text-xs font-medium text-ink-500">Color</span>
          <div className="flex items-center gap-1.5 pb-1">
            <button
              onClick={() => setFColor("todos")}
              title="Todos los colores"
              className={cx(
                "h-7 rounded-full border px-2 text-[11px] font-medium",
                fColor === "todos" ? "border-ink-800 text-ink-800" : "border-ink-200 text-ink-400"
              )}
            >
              Todos
            </button>
            {colorFiltros.map((c) => (
              <button
                key={c.value}
                onClick={() => setFColor(c.value)}
                title={c.label}
                aria-label={c.label}
                className={cx("h-7 w-7 rounded-full ring-offset-2", fColor === c.value && "ring-2 ring-ink-800")}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        {hayFiltros && (
          <button onClick={limpiarFiltros} className="btn-ghost self-center !py-1.5 !text-xs">
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}

        <span className="self-center text-xs text-ink-400">
          {visibleTasks.length} de {todasVisibles.length} tareas
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {columns.map((col) => {
          const colTasks = visibleTasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key}>
              <div className="mb-3 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <h3 className="text-sm font-semibold text-ink-700">{col.label}</h3>
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-500">{colTasks.length}</span>
              </div>
              <div className="space-y-4">
                {colTasks.map((task) => (
                  <TaskCard key={task.id} task={task} showEventName />
                ))}
                {colTasks.length === 0 && (
                  <div className="card border-dashed py-8 text-center text-xs text-ink-400">Sin tareas aquí.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-ink-900">{value}</p>
        <p className="text-sm text-ink-500">{label}</p>
      </div>
    </div>
  );
}
