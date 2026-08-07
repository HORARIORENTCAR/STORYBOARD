"use client";

import { useMemo, useState } from "react";
import { Plus, FolderOpen, EyeOff, Users, Lock } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/store";
import { EventCard } from "@/components/events/event-card";
import { EventFormModal } from "@/components/events/event-form-modal";
import { cx } from "@/lib/utils";

type TabKey = "todos" | "borradores" | "publicados" | "cerrados";

/**
 * CAPA 3 · Mi espacio personal.
 * Solo muestra eventos creados por la persona conectada. Sus borradores
 * son privados: ningún otro miembro puede verlos hasta que se publiquen.
 */
export default function EspacioPage() {
  const { myEvents, liveTasks: tasks } = useApp();
  const [tab, setTab] = useState<TabKey>("todos");
  const [createOpen, setCreateOpen] = useState(false);

  const sets = useMemo(
    () => ({
      todos: myEvents,
      borradores: myEvents.filter((e) => e.status === "borrador"),
      publicados: myEvents.filter((e) => e.status === "publicado"),
      cerrados: myEvents.filter((e) => e.status === "finalizado" || e.status === "archivado"),
    }),
    [myEvents]
  );

  const labels: Record<TabKey, string> = {
    todos: "Todos",
    borradores: "Borradores",
    publicados: "Publicados",
    cerrados: "Finalizados",
  };

  const myEventIds = new Set(myEvents.map((e) => e.id));
  const collaborators = new Set(
    tasks.filter((t) => myEventIds.has(t.eventId)).flatMap((t) => t.slots.filter((s) => s.userId).map((s) => s.userId))
  ).size;

  const list = sets[tab];

  return (
    <Shell>
      <PageHeader
        eyebrow="Espacio personal · privado"
        title="Mi espacio"
        description="Aquí creas y preparas tus iniciativas. Nada sale al muro hasta que tú lo publicas."
        actions={
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Crear evento
          </button>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>Solo tú ves esta pantalla.</strong> Tus borradores son privados; los demás miembros no pueden verlos
          ni abrirlos. Al publicar un evento, este aparece en el muro común.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat icon={FolderOpen} value={myEvents.length} label="eventos creados por ti" color="bg-brand-100 text-brand-700" />
        <MiniStat icon={EyeOff} value={sets.borradores.length} label="borradores privados" color="bg-amber-100 text-amber-700" />
        <MiniStat icon={Users} value={collaborators} label="personas colaborando contigo" color="bg-sky-100 text-sky-700" />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-ink-100 pb-4">
        {(Object.keys(sets) as TabKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cx(
              "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
              tab === k ? "bg-brand-700 text-white" : "text-ink-600 hover:bg-ink-100"
            )}
          >
            {labels[k]}
            <span
              className={cx(
                "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                tab === k ? "bg-white/20" : "bg-ink-100 text-ink-500"
              )}
            >
              {sets[k].length}
            </span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="mb-3 h-7 w-7 text-ink-300" />
          <p className="mb-1 text-sm font-semibold text-ink-700">
            {tab === "todos" ? "Tu espacio está vacío" : "No tienes eventos en esta categoría"}
          </p>
          {tab === "todos" && (
            <>
              <p className="mb-4 text-sm text-ink-500">Crea tu primera iniciativa. Empezará como borrador privado.</p>
              <button onClick={() => setCreateOpen(true)} className="btn-primary">
                <Plus className="h-4 w-4" /> Crear mi primer evento
              </button>
            </>
          )}
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
