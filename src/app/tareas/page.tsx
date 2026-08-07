"use client";

import { useMemo } from "react";
import { CheckCircle2, Clock3, Users2 } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/store";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskExecStatus } from "@/lib/types";

const columns: { key: TaskExecStatus; label: string; dot: string }[] = [
  { key: "sin_iniciar", label: "Sin iniciar", dot: "bg-ink-400" },
  { key: "en_proceso", label: "En proceso", dot: "bg-amber-500" },
  { key: "terminada", label: "Terminada", dot: "bg-brand-600" },
];

export default function MisTareasPage() {
  const { liveTasks, wallEvents, currentUser } = useApp();
  const tasks = liveTasks; // lo archivado no estorba

  const publishedEventIds = new Set(wallEvents.map((e) => e.id));
  const visibleTasks = tasks.filter((t) => publishedEventIds.has(t.eventId));

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
