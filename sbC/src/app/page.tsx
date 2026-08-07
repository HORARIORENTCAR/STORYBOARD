"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, ClipboardList, Users2, ArrowRight, Sparkles } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { useApp } from "@/lib/store";
import { EventCard } from "@/components/events/event-card";
import { EventFormModal } from "@/components/events/event-form-modal";
import { Avatar } from "@/components/ui/avatar";

export default function MuroPage() {
  const { events, wallEvents, tasks, currentUser } = useApp();
  const [createOpen, setCreateOpen] = useState(false);

  const published = wallEvents; // el muro es común: solo publicados
  const activeTasks = tasks.filter((t) => t.status !== "terminada").length;
  const collaboratorSpaces = new Set(
    events.flatMap((e) => (e.status === "publicado" ? [e.createdBy] : []))
  ).size + tasks.length;

  const firstName = currentUser?.name.split(" ")[0] ?? "";

  return (
    <Shell>
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-950 via-brand-950 to-brand-800 p-8 text-white sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-52 w-52 rounded-full bg-brand-300/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-200">
              <Users2 className="h-3.5 w-3.5" /> Muro común del colegio
            </p>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Eventos de todos, en un solo lugar.</h1>
            <p className="mt-3 text-[15px] text-brand-100/90">
              Hola, {firstName}. Aquí todo el personal ve las iniciativas publicadas, encuentra tareas disponibles y puede
              proponer nuevos eventos.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row lg:flex-col">
            <button onClick={() => setCreateOpen(true)} className="btn-primary bg-white text-brand-900 hover:bg-brand-50">
              <Sparkles className="h-4 w-4" /> Crear mi evento
            </button>
            <Link href="/eventos" className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20">
              <CalendarDays className="h-4 w-4" /> Administrar eventos
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={CalendarDays} value={published.length} label="eventos publicados" color="bg-brand-100 text-brand-700" />
        <StatCard icon={ClipboardList} value={activeTasks} label="tareas activas" color="bg-amber-100 text-amber-700" />
        <StatCard icon={Users2} value={collaboratorSpaces} label="espacios para colaborar" color="bg-sky-100 text-sky-700" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="section-eyebrow">Publicados para todo el personal</p>
              <h2 className="text-xl font-bold text-ink-900">Próximos eventos</h2>
              <p className="text-sm text-ink-500">Selecciona un evento para conocer sus tareas e inscribirte.</p>
            </div>
            <Link href="/eventos" className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {published.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-ink-500">Todavía no hay eventos publicados. ¡Sé el primero en proponer uno!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {published.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        <aside className="card h-fit p-5">
          <p className="section-eyebrow">Participación abierta</p>
          <h2 className="mb-4 text-lg font-bold text-ink-900">Esta pizarra es de todos</h2>
          <ol className="space-y-4">
            <StepItem number={1} title="Propón una iniciativa" description="Cualquier miembro puede crear y liderar un evento." />
            <StepItem number={2} title="Publícala en el muro" description="Al cambiar su estado a Publicado, todos podrán verla." />
            <StepItem number={3} title="Forma el equipo" description="Los colaboradores eligen una tarea y ocupan su propio espacio." />
          </ol>
          <button onClick={() => setCreateOpen(true)} className="btn-primary mt-5 w-full">
            + Proponer un evento
          </button>
          <div className="mt-5 border-t border-ink-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Colaboradores activos</p>
            <div className="flex -space-x-2">
              {[currentUser].filter(Boolean).map((u) => (
                <Avatar key={u!.id} name={u!.name} color={u!.color} size="sm" />
              ))}
            </div>
          </div>
        </aside>
      </div>

      <EventFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
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

function StepItem({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
        {number}
      </span>
      <div>
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="text-xs text-ink-500">{description}</p>
      </div>
    </li>
  );
}
