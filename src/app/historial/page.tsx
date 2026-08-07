"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";
import { cx } from "@/lib/utils";
import { HistoryEntry } from "@/lib/types";

const typeColors: Record<HistoryEntry["type"], string> = {
  Evento: "bg-brand-100 text-brand-800",
  Tarea: "bg-sky-100 text-sky-800",
  Configuración: "bg-amber-100 text-amber-800",
  Calendario: "bg-violet-100 text-violet-800",
  Equipo: "bg-rose-100 text-rose-800",
};

export default function HistorialPage() {
  const { history, userById } = useApp();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("todas");

  const filtered = useMemo(() => {
    return history.filter((h) => {
      const user = userById(h.userId);
      const text = `${user?.name ?? ""} ${h.action} ${h.detail}`.toLowerCase();
      const matchesQuery = text.includes(query.toLowerCase());
      const matchesType = typeFilter === "todas" || h.type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [history, query, typeFilter, userById]);

  function exportCsv() {
    const rows = [
      ["Persona", "Acción", "Detalle", "Tipo", "Fecha"],
      ...filtered.map((h) => [userById(h.userId)?.name ?? "", h.action, h.detail, h.type, h.createdAt]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "historial-staff-board.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="Transparencia"
        title="Historial de actividad"
        description="Consulta los cambios y acciones realizadas por el equipo."
        actions={
          <button onClick={exportCsv} className="btn-secondary">
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-10"
            placeholder="Buscar persona, acción o detalle..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="todas">Todas las acciones</option>
          <option value="Evento">Evento</option>
          <option value="Tarea">Tarea</option>
          <option value="Configuración">Configuración</option>
          <option value="Calendario">Calendario</option>
          <option value="Equipo">Equipo</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-100 bg-ink-50/50 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-5 py-3">Persona</th>
              <th className="px-5 py-3">Acción</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Fecha y hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {filtered.map((h) => {
              const user = userById(h.userId);
              return (
                <tr key={h.id} className="hover:bg-ink-50/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={user?.name ?? "?"} color={user?.color} size="xs" />
                      <span className="font-medium text-ink-900">{user?.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-600">
                    {h.action} <span className="font-semibold text-ink-900">{h.detail}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cx("badge", typeColors[h.type])}>{h.type}</span>
                  </td>
                  <td className="px-5 py-3.5 text-ink-500">
                    {new Date(h.createdAt).toLocaleString("es-DO", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-ink-400">
                  No se encontraron registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
