"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Download, Sprout, Trash2 } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/store";
import { Modal } from "@/components/ui/modal";
import { CalendarEntry } from "@/lib/types";
import { cx, formatDay, formatMonthShort } from "@/lib/utils";

const kindStyles: Record<CalendarEntry["kind"], string> = {
  evento: "bg-brand-100 text-brand-800",
  fecha: "bg-sky-100 text-sky-800",
  valor: "bg-amber-100 text-amber-800",
  reunion: "bg-rose-100 text-rose-800",
  capacitacion: "bg-violet-100 text-violet-800",
  informe: "bg-ink-100 text-ink-700",
};

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarioPage() {
  const { calendar, addCalendarEntry, removeCalendarEntry, isAdmin } = useApp();
  const [cursor, setCursor] = useState(new Date(2026, 7, 1));
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = buildMonthGrid(year, month);

  const monthLabel = cursor.toLocaleDateString("es-DO", { month: "long", year: "numeric" });

  const entriesByDay = useMemo(() => {
    const map = new Map<number, CalendarEntry[]>();
    calendar.forEach((entry) => {
      const d = new Date(entry.date + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map.set(day, [...(map.get(day) ?? []), entry]);
      }
    });
    return map;
  }, [calendar, year, month]);

  const upcoming = useMemo(
    () =>
      calendar
        .filter((c) => new Date(c.date + "T00:00:00").getTime() >= new Date(2026, 7, 3).getTime())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5),
    [calendar]
  );

  const valorDelMes = calendar.find((c) => c.kind === "valor" && new Date(c.date).getMonth() === month);

  /** Descarga el calendario institucional como archivo CSV (se abre en Excel). */
  function exportarCalendario() {
    const filas = [...calendar].sort((a, b) => a.date.localeCompare(b.date));
    const escapar = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      ["Fecha", "Título", "Tipo", "Hora", "Lugar", "Lema"].join(","),
      ...filas.map((c) =>
        [c.date, c.title, c.kind, c.time ?? "", c.location ?? "", c.motto ?? ""].map(escapar).join(",")
      ),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calendario-institucional-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="Agenda del colegio"
        title="Calendario institucional"
        description="Fechas, reuniones y actividades importantes en un solo lugar."
        actions={
          <button onClick={exportarCalendario} className="btn-secondary">
            <Download className="h-4 w-4" /> Exportar calendario
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 hover:bg-ink-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="w-52 text-center text-lg font-bold capitalize text-ink-900">{monthLabel}</h2>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 hover:bg-ink-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setCreateOpen(true);
                }}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" /> Nueva fecha
              </button>
            )}
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-400">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d.slice(0, 3)}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-2">
            {cells.map((day, idx) => {
              if (day === null) return <div key={idx} className="min-h-[92px] rounded-xl" />;
              const dayEntries = entriesByDay.get(day) ?? [];
              const isToday = year === 2026 && month === 7 && day === 3;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isAdmin) return;
                    setSelectedDate(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
                    setCreateOpen(true);
                  }}
                  className={cx(
                    "flex min-h-[92px] flex-col rounded-xl border p-2 text-left transition-colors hover:border-brand-300",
                    isToday ? "border-brand-500 bg-brand-50" : "border-ink-100"
                  )}
                >
                  <span className={cx("text-xs font-semibold", isToday ? "text-brand-700" : "text-ink-500")}>{day}</span>
                  <div className="mt-1 space-y-1">
                    {dayEntries.slice(0, 2).map((entry) => (
                      <span key={entry.id} className={cx("block truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium", kindStyles[entry.kind])}>
                        {entry.title}
                      </span>
                    ))}
                    {dayEntries.length > 2 && <span className="text-[10px] text-ink-400">+{dayEntries.length - 2} más</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          {valorDelMes && (
            <div className="card p-5 text-center">
              <p className="section-eyebrow">Valor del mes</p>
              <div className="my-3 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
                  <Sprout className="h-6 w-6 text-brand-700" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-ink-900">{valorDelMes.title}</h3>
              <p className="mt-1 text-sm italic text-ink-500">&ldquo;Cumplimos con alegría aquello que nos corresponde.&rdquo;</p>
            </div>
          )}

          <div className="card p-5">
            <p className="mb-3 text-sm font-bold text-ink-900">Próximas fechas</p>
            <div className="space-y-3">
              {upcoming.map((entry) => (
                <div key={entry.id} className="group flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-ink-100 text-center leading-none">
                    <span className="text-sm font-bold text-ink-900">{formatDay(entry.date)}</span>
                    <span className="text-[9px] font-semibold uppercase text-ink-400">{formatMonthShort(entry.date)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{entry.title}</p>
                    <p className="text-xs text-ink-500">
                      {entry.location ?? "—"} {entry.time ? `· ${entry.time}` : ""}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => removeCalendarEntry(entry.id)}
                      aria-label={`Eliminar ${entry.title}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </button>
                  )}
                </div>
              ))}
              {upcoming.length === 0 && <p className="text-sm text-ink-400">No hay fechas próximas.</p>}
            </div>
          </div>
        </div>
      </div>

      <NewEntryModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultDate={selectedDate}
        onSave={(entry) => addCalendarEntry(entry)}
      />
    </Shell>
  );
}

function NewEntryModal({
  open,
  onClose,
  defaultDate,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string | null;
  onSave: (entry: Omit<CalendarEntry, "id">) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} eyebrow="Calendario institucional" title="Nueva fecha" size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const data = new FormData(form);
          onSave({
            date: String(data.get("date") || defaultDate || "2026-08-03"),
            title: String(data.get("title") || "Nueva actividad"),
            kind: data.get("kind") as CalendarEntry["kind"],
            location: String(data.get("location") || ""),
            time: String(data.get("time") || ""),
          });
          onClose();
        }}
        className="space-y-4"
      >
        <div>
          <label className="label">Título</label>
          <input name="title" className="input" placeholder="Ej. Capacitación docente" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha</label>
            <input name="date" type="date" className="input" defaultValue={defaultDate ?? "2026-08-03"} />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select name="kind" className="input" defaultValue="fecha">
              <option value="evento">Evento</option>
              <option value="fecha">Fecha importante</option>
              <option value="valor">Valor del mes</option>
              <option value="reunion">Reunión</option>
              <option value="capacitacion">Capacitación</option>
              <option value="informe">Entrega de informes</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Lugar (opcional)</label>
            <input name="location" className="input" placeholder="Ej. Salón multiuso" />
          </div>
          <div>
            <label className="label">Hora (opcional)</label>
            <input name="time" className="input" placeholder="Ej. 2:00 p. m." />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            + Agregar
          </button>
        </div>
      </form>
    </Modal>
  );
}
