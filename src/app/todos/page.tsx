"use client";

import { useMemo, useState } from "react";
import { Plus, CalendarDays, Globe, Users, Inbox, ShieldCheck, Lock } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/store";
import { EventCard } from "@/components/events/event-card";
import { EventFormModal } from "@/components/events/event-form-modal";
import { cx } from "@/lib/utils";

type TabKey = "todos" | "publicados" | "borradores" | "ajenos";

/**
 * CAPA 1 · Supervisión de administrador.
 * Única pantalla donde se ven los borradores de otras personas.
 */
export default function TodosPage() {
  const { events, currentUser, isAdmin } = useApp();
  const [tab, setTab] = useState<TabKey>("todos");
  const [createOpen, setCreateOpen] = useState(false);

  const sets = useMemo(
    () => ({
      todos: events,
      publicados: events.filter((e) => e.status === "publicado"),
      borradores: events.filter((e) => e.status === "borrador"),
      ajenos: events.filter((e) => e.createdBy !== currentUser?.id),
    }),
    [events, currentUser]
  );

  if (!isAdmin) {
    return (
      <Shell>
        <div className="card flex flex-col items-center py-16 text-center">
          <Lock className="mb-3 h-7 w-7 text-ink-300" />
          <p className="text-sm text-ink-500">Solo los administradores pueden ver esta sección.</p>
        </div>
      </Shell>
    );
  }

  const labels: Record<TabKey, string> = {
    todos: "Todos",
    publicados: "Publicados",
    borradores: "Borradores de todos",
    ajenos: "De otras personas",
  };
  const list = sets[tab];
  const autores = new Set(events.map((e) => e.createdBy)).size;

  return (
    <Shell>
      <PageHeader
        eyebrow="Administración"
        title="Todos los eventos"
        description="Supervisión completa de las iniciativas del colegio, incluidos los borradores del personal."
        actions={
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Crear evento
          </button>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>Vista de administrador.</strong> Estás viendo también borradores de otras personas. Úsalo para
          acompañar y moderar, no para editar el trabajo ajeno sin avisar.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat icon={CalendarDays} value={events.length} label="eventos en total" color="bg-violet-100 text-violet-700" />
        <MiniStat icon={Globe} value={sets.publicados.length} label="publicados en el muro" color="bg-brand-100 text-brand-700" />
        <MiniStat icon={Users} value={autores} label="personas creando eventos" color="bg-sky-100 text-sky-700" />
      </div>

      <div className="mb-6 flex flex-nowrap items-center gap-2 overflow-x-auto border-b border-ink-100 pb-4">
        {(Object.keys(sets) as TabKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cx(
              "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
              tab === k ? "bg-brand-700 text-white" : "text-ink-600 hover:bg-ink-100"
            )}
          >
            {labels[k]}
            <span className={cx("rounded-full px-1.5 py-0.5 text-[11px] font-semibold", tab === k ? "bg-white/20" : "bg-ink-100 text-ink-500")}>
              {sets[k].length}
            </span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-center">
          <Inbox className="mb-3 h-7 w-7 text-ink-300" />
          <p className="text-sm text-ink-500">No hay eventos en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      <EventFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </Shell>
  );
}

function MiniStat({
  icon: Icon, value, label, color,
}: { icon: React.ComponentType<{ className?: string }>; value: number; label: string; color: string }) {
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
