"use client";

import { useMemo } from "react";
import { ChevronRight, CalendarDays, ListChecks, CheckCircle2 } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/store";
import { formatDay, formatMonthShort, daysUntil } from "@/lib/utils";

export default function AgendaPage() {
  const { events, liveTasks, currentUser, history } = useApp();

  const myEvents = events.filter((e) => e.createdBy === currentUser?.id);
  const activeEvents = events.filter((e) => e.status === "publicado");

  /* Solo cuentan las tareas vivas: nada de eventos finalizados o archivados. */
  const eventosAbiertos = useMemo(
    () => new Set(events.filter((e) => e.status === "publicado" || e.status === "borrador").map((e) => e.id)),
    [events]
  );
  const myTasks = useMemo(
    () => liveTasks.filter((t) => eventosAbiertos.has(t.eventId) && t.slots.some((s) => s.userId === currentUser?.id)),
    [liveTasks, eventosAbiertos, currentUser]
  );
  const pendingMyTasks = myTasks.filter((t) => t.status !== "terminada");
  const completedMyTasks = myTasks.filter((t) => t.status === "terminada");

  /* Próximas fechas: solo lo que sigue pendiente, lo más cercano primero. */
  const weekItems = useMemo(
    () =>
      pendingMyTasks
        .map((t) => ({
          id: t.id,
          label: daysUntil(t.dueDate) < 0 ? "Vencida" : "Fecha límite",
          title: t.name,
          date: t.dueDate,
          eventName: events.find((e) => e.id === t.eventId)?.name ?? "",
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingMyTasks, events]
  );

  const nextDeadlineDays = weekItems.length > 0 ? Math.max(0, daysUntil(weekItems[0].date)) : null;
  const monthTotal = myTasks.length || 1;
  const monthPct = Math.round((completedMyTasks.length / monthTotal) * 100);

  const myHistory = history.filter((h) => h.userId === currentUser?.id).slice(0, 6);

  return (
    <Shell>
      <PageHeader eyebrow="Resumen personal" title="Mi agenda" description="Todas tus responsabilidades, fechas y participaciones organizadas para ti." />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr]">
        <div className="card col-span-1 flex flex-col justify-between bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white lg:col-span-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-200">Esta semana</p>
            <p className="mt-2 text-2xl font-bold">{weekItems.length} compromisos próximos</p>
            <p className="mt-1 text-sm text-brand-100/90">
              {nextDeadlineDays === null ? "No tienes fechas próximas." : `Tu siguiente fecha límite es dentro de ${nextDeadlineDays} días.`}
            </p>
          </div>
          <div className="mt-5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${monthPct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-brand-100">
              {completedMyTasks.length} de {myTasks.length} tareas activas completadas ({monthPct}%)
            </p>
          </div>
        </div>
        <StatCard icon={CalendarDays} value={activeEvents.length} label="Eventos activos" />
        <StatCard icon={ListChecks} value={pendingMyTasks.length} label="Tareas pendientes" />
        <StatCard icon={CheckCircle2} value={myHistory.length + completedMyTasks.length} label="Participaciones" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <p className="section-eyebrow">Próximamente</p>
          <h2 className="mb-4 text-lg font-bold text-ink-900">Tu semana</h2>
          <div className="divide-y divide-ink-100">
            {weekItems.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No tienes tareas asignadas todavía.</p>}
            {weekItems.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-3.5">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-ink-100 text-center leading-none">
                  <span className="text-sm font-bold text-ink-900">{formatDay(item.date)}</span>
                  <span className="text-[9px] font-semibold uppercase text-ink-400">{formatMonthShort(item.date)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">{item.label}</p>
                  <p className="truncate text-sm font-semibold text-ink-900">{item.title}</p>
                  <p className="truncate text-xs text-ink-500">{item.eventName}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="section-eyebrow">Mi participación</p>
          <h2 className="mb-4 text-lg font-bold text-ink-900">Historial reciente</h2>
          <div className="space-y-4">
            {myHistory.length === 0 && <p className="text-sm text-ink-400">Aún no tienes actividad registrada.</p>}
            {myHistory.map((h) => (
              <div key={h.id} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-900">{h.detail}</p>
                  <p className="text-xs text-ink-500">
                    {h.action} · {new Date(h.createdAt).toLocaleString("es-DO")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <p className="section-eyebrow">Liderazgo</p>
          <h2 className="mb-4 text-lg font-bold text-ink-900">Eventos que has creado</h2>
          {myEvents.length === 0 ? (
            <p className="text-sm text-ink-400">Aún no has creado ningún evento. Propón el primero desde el Muro.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myEvents.map((e) => (
                <div key={e.id} className="rounded-xl border border-ink-100 p-3.5">
                  <p className="text-sm font-semibold text-ink-900">{e.name}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{formatDay(e.eventDate)} {formatMonthShort(e.eventDate)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function StatCard({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string }) {
  return (
    <div className="card flex flex-col justify-between p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-600">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-ink-900">{value}</p>
      <p className="text-sm text-ink-500">{label}</p>
    </div>
  );
}
