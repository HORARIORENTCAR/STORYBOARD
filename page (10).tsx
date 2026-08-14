"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/store";
import { EventCard } from "@/components/events/event-card";
import { EventFormModal } from "@/components/events/event-form-modal";
import { cx } from "@/lib/utils";

type TabKey = "todos" | "publicados" | "mios" | "borradores" | "finalizado";

export default function EventosPage() {
  const { visibleEvents, currentUser } = useApp();
  // Solo lo que esta persona tiene derecho a ver: publicados + los suyos (+ todo si es admin).
  const events = visibleEvents;
  const [tab, setTab] = useState<TabKey>("todos");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    switch (tab) {
      case "publicados":
        return events.filter((e) => e.status === "publicado");
      case "mios":
        return events.filter((e) => e.createdBy === currentUser?.id);
      case "borradores":
        // Los borradores son privados: solo los propios.
        return events.filter((e) => e.status === "borrador" && e.createdBy === currentUser?.id);
      case "finalizado":
        return events.filter((e) => e.status === "finalizado" || e.status === "archivado");
      default:
        return events;
    }
  }, [events, tab, currentUser]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "todos", label: "Todos", count: events.length },
    { key: "publicados", label: "Publicados", count: events.filter((e) => e.status === "publicado").length },
    { key: "mios", label: "Mis eventos", count: events.filter((e) => e.createdBy === currentUser?.id).length },
    { key: "borradores", label: "Borradores", count: events.filter((e) => e.status === "borrador" && e.createdBy === currentUser?.id).length },
    { key: "finalizado", label: "Finalizado", count: events.filter((e) => e.status === "finalizado" || e.status === "archivado").length },
  ];

  return (
    <Shell>
      <PageHeader
        eyebrow="Gestión de iniciativas"
        title="Eventos"
        description="Consulta el muro público y administra las iniciativas que has creado."
        actions={
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Crear evento
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-ink-100 pb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cx(
              "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "bg-brand-700 text-white" : "text-ink-600 hover:bg-ink-100"
            )}
          >
            {t.label}
            <span
              className={cx(
                "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                tab === t.key ? "bg-white/20" : "bg-ink-100 text-ink-500"
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-ink-500">No hay eventos en esta categoría todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      <EventFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </Shell>
  );
}
