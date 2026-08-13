"use client";

import { useMemo, useRef, useState } from "react";
import { autocorregir } from "@/lib/ortografia";
import { ChevronLeft, ChevronRight, Plus, Download, Sprout, Trash2, Upload, FileText, X, Pencil, StickyNote } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/store";
import { Modal } from "@/components/ui/modal";
import { CalendarEntry } from "@/lib/types";
import { cx, formatDay, formatMonthShort } from "@/lib/utils";

const kindLabel: Record<CalendarEntry["kind"], string> = {
  evento: "Evento",
  fecha: "Fecha importante",
  valor: "Valor del mes",
  reunion: "Reunión",
  capacitacion: "Capacitación",
  informe: "Entrega de informes",
  otro: "Otros",
};

/** Nombre visible de la categoría: el propio si es "otro", si no el estándar. */
function nombreTipo(entry: CalendarEntry) {
  return entry.kind === "otro" && entry.customKind ? entry.customKind : kindLabel[entry.kind];
}

const kindStyles: Record<CalendarEntry["kind"], string> = {
  evento: "bg-brand-100 text-brand-800",
  fecha: "bg-sky-100 text-sky-800",
  valor: "bg-amber-100 text-amber-800",
  reunion: "bg-rose-100 text-rose-800",
  capacitacion: "bg-violet-100 text-violet-800",
  informe: "bg-ink-100 text-ink-700",
  otro: "bg-teal-100 text-teal-800",
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
  const { calendar, addCalendarEntry, removeCalendarEntry, isAdmin, settings, updateSettings, uploadFile, updateCalendarEntry, monthNote, saveMonthNote, userById } = useApp();
  const ahora = new Date();
  const [cursor, setCursor] = useState(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
  const [createOpen, setCreateOpen] = useState(false);
  const [detalle, setDetalle] = useState<CalendarEntry | null>(null);
  const [muralAbierto, setMuralAbierto] = useState(false);
  const [muralTexto, setMuralTexto] = useState("");
  const [muralEditando, setMuralEditando] = useState(false);
  const [muralAviso, setMuralAviso] = useState("");
  const [editandoValor, setEditandoValor] = useState(false);
  const [editandoFecha, setEditandoFecha] = useState(false);
  const [borrador, setBorrador] = useState({
    title: "",
    date: "",
    kind: "fecha" as CalendarEntry["kind"],
    customKind: "",
    location: "",
    time: "",
    responsibles: "",
    description: "",
    motto: "",
  });
  const [valorTitulo, setValorTitulo] = useState("");
  const [valorLema, setValorLema] = useState("");
  const [subiendoOficial, setSubiendoOficial] = useState(false);
  const [avisoOficial, setAvisoOficial] = useState("");
  const oficialRef = useRef<HTMLInputElement>(null);
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
        .filter((c) => new Date(c.date + "T00:00:00").getTime() >= new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5),
    [calendar]
  );

  const prefijoMes = `${year}-${String(month + 1).padStart(2, "0")}`;
  const valorDelMes = calendar.find((c) => c.kind === "valor" && c.date.startsWith(prefijoMes));
  const mural = monthNote(prefijoMes);

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
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => oficialRef.current?.click()}
                disabled={subiendoOficial}
                className="btn-secondary"
              >
                <Upload className="h-4 w-4" />
                {subiendoOficial ? "Subiendo..." : "Subir calendario oficial"}
              </button>
            )}
            <button onClick={exportarCalendario} className="btn-secondary">
              <Download className="h-4 w-4" /> Exportar calendario
            </button>
          </div>
        }
      />

      <input
        ref={oficialRef}
        type="file"
        accept=".pdf,image/*,.xls,.xlsx,.csv"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setSubiendoOficial(true);
          setAvisoOficial("");
          const r = await uploadFile(f, "calendario-oficial");
          if (typeof r === "string") {
            setAvisoOficial(r);
          } else {
            await updateSettings({ officialCalendarUrl: r.url, officialCalendarName: r.name });
          }
          setSubiendoOficial(false);
        }}
      />

      {avisoOficial && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{avisoOficial}</div>
      )}

      {settings.officialCalendarUrl && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
          <FileText className="h-5 w-5 shrink-0 text-brand-700" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-brand-900">Calendario oficial del colegio</p>
            <a
              href={settings.officialCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-xs text-brand-700 hover:underline"
            >
              {settings.officialCalendarName ?? "Abrir documento"}
            </a>
          </div>
          <a href={settings.officialCalendarUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-1.5 !text-xs">
            <Download className="h-3.5 w-3.5" /> Abrir
          </a>
          {isAdmin && (
            <button
              onClick={() => updateSettings({ officialCalendarUrl: "", officialCalendarName: "" })}
              aria-label="Quitar calendario oficial"
              className="text-ink-400 hover:text-rose-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card p-5">
          {/* En el celular esta cabecera se parte en dos filas: arriba el mes y el
              botón de nueva fecha, y debajo el mural a todo lo ancho. Antes el
              mural llevaba "hidden sm:flex" y sencillamente no existía en el
              teléfono. */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 hover:bg-ink-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="w-36 text-center text-lg font-bold capitalize text-ink-900 sm:w-52">{monthLabel}</h2>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 hover:bg-ink-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {/* Mural del mes: cada mes conserva sus propias notas */}
            <button
              onClick={() => {
                setMuralTexto(mural?.content ?? "");
                setMuralEditando(false);
                setMuralAviso("");
                setMuralAbierto(true);
              }}
              title={mural?.content || "Notas de este mes"}
              className={cx(
                "order-last flex w-full min-w-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-left transition-colors",
                "sm:order-none sm:mx-3 sm:w-auto sm:flex-1",
                mural?.content
                  ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                  : "border-dashed border-ink-300 hover:border-brand-400 hover:bg-brand-50/40"
              )}
            >
              <StickyNote className={cx("h-4 w-4 shrink-0", mural?.content ? "text-amber-700" : "text-ink-400")} />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  Mural de {monthLabel}
                </span>
                <span
                  className={cx(
                    "block truncate text-sm",
                    mural?.content ? "text-amber-900" : "text-ink-400"
                  )}
                >
                  {mural?.content
                    ? mural.content.replace(/\s+/g, " ")
                    : isAdmin
                    ? "Escribe aquí lo importante de este mes"
                    : "Sin notas este mes"}
                </span>
              </span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setCreateOpen(true);
                }}
                className="btn-primary shrink-0"
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
              const isToday = year === ahora.getFullYear() && month === ahora.getMonth() && day === ahora.getDate();
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
                      <span
                        key={entry.id}
                        role="button"
                        tabIndex={0}
                        title={`${nombreTipo(entry)}: ${entry.title}${entry.description ? " — " + entry.description : ""}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setDetalle(entry);
                        }}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.stopPropagation();
                            setDetalle(entry);
                          }
                        }}
                        className={cx("block cursor-pointer truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium hover:brightness-95", kindStyles[entry.kind])}
                      >
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
          <div className="card p-5 text-center">
            <p className="section-eyebrow">Valor del mes</p>
            <div className="my-3 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
                <Sprout className="h-6 w-6 text-brand-700" />
              </div>
            </div>

            {editandoValor ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const titulo = valorTitulo.trim();
                  if (!titulo) return;
                  if (valorDelMes) {
                    await updateCalendarEntry(valorDelMes.id, { title: titulo, motto: valorLema.trim() });
                  } else {
                    await addCalendarEntry({
                      date: `${year}-${String(month + 1).padStart(2, "0")}-01`,
                      title: titulo,
                      kind: "valor",
                      motto: valorLema.trim(),
                    });
                  }
                  setEditandoValor(false);
                }}
                className="space-y-2 text-left"
              >
                <input
                  className="input !text-center"
                  placeholder="Ej. Valor del mes: la Responsabilidad"
                  value={valorTitulo}
                  onChange={(e) => setValorTitulo(autocorregir(e.target.value))}
                  autoFocus
                  required
                />
                <textarea lang="es" spellCheck autoCapitalize="sentences" autoCorrect="on"
                  className="input min-h-[70px] resize-y !text-center !text-sm"
                  placeholder="Frase o lema del mes (opcional)"
                  value={valorLema}
                  onChange={(e) => setValorLema(autocorregir(e.target.value))}
                />
                <div className="flex justify-center gap-2 pt-1">
                  <button type="button" onClick={() => setEditandoValor(false)} className="btn-secondary !py-1.5 !text-xs">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary !py-1.5 !text-xs">
                    Guardar
                  </button>
                </div>
              </form>
            ) : valorDelMes ? (
              <>
                <h3 className="text-lg font-bold text-ink-900">{valorDelMes.title}</h3>
                {valorDelMes.motto && (
                  <p className="mt-1 text-sm italic text-ink-500">&ldquo;{valorDelMes.motto}&rdquo;</p>
                )}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setValorTitulo(valorDelMes.title);
                      setValorLema(valorDelMes.motto ?? "");
                      setEditandoValor(true);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Cambiar el valor de este mes
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-ink-400">
                  Aún no se ha definido el valor de {formatMonthShort(`${year}-${String(month + 1).padStart(2, "0")}-01`)}.
                </p>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setValorTitulo("");
                      setValorLema("");
                      setEditandoValor(true);
                    }}
                    className="btn-secondary mt-3 !py-1.5 !text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Definir el valor del mes
                  </button>
                )}
              </>
            )}
          </div>

          <div className="card p-5">
            <p className="mb-3 text-sm font-bold text-ink-900">Próximas fechas</p>
            <div className="space-y-3">
              {upcoming.map((entry) => (
                <div key={entry.id} className="group flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-ink-100 text-center leading-none">
                    <span className="text-sm font-bold text-ink-900">{formatDay(entry.date)}</span>
                    <span className="text-[9px] font-semibold uppercase text-ink-400">{formatMonthShort(entry.date)}</span>
                  </div>
                  <button onClick={() => setDetalle(entry)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium text-ink-900 hover:text-brand-700">{entry.title}</p>
                    <span className={cx("mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium", kindStyles[entry.kind])}>
                      {nombreTipo(entry)}
                    </span>
                    <p className="text-xs text-ink-500">
                      {entry.location ?? "—"} {entry.time ? `· ${entry.time}` : ""}
                    </p>
                    {entry.responsibles && (
                      <p className="mt-0.5 truncate text-xs font-medium text-brand-700">{entry.responsibles}</p>
                    )}
                    {entry.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-400">{entry.description}</p>
                    )}
                  </button>
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

      <Modal
        open={!!detalle}
        onClose={() => {
          setDetalle(null);
          setEditandoFecha(false);
        }}
        eyebrow={detalle ? nombreTipo(detalle) : "Calendario"}
        title={editandoFecha ? "Editar fecha" : detalle?.title ?? ""}
        size="sm"
      >
        {detalle && editandoFecha && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!borrador.title.trim()) return;
              await updateCalendarEntry(detalle.id, {
                title: borrador.title.trim(),
                date: borrador.date,
                kind: borrador.kind,
                customKind: borrador.kind === "otro" ? borrador.customKind.trim() : "",
                location: borrador.location.trim(),
                time: borrador.time.trim(),
                responsibles: borrador.responsibles.trim(),
                description: borrador.description.trim(),
                motto: borrador.motto.trim(),
              });
              setEditandoFecha(false);
              setDetalle(null);
            }}
            className="space-y-4"
          >
            <div>
              <label className="label">Título</label>
              <input
                className="input"
                value={borrador.title}
                onChange={(e) => setBorrador({ ...borrador, title: autocorregir(e.target.value) })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Fecha</label>
                <input
                  type="date"
                  className="input"
                  value={borrador.date}
                  onChange={(e) => setBorrador({ ...borrador, date: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select
                  className="input"
                  value={borrador.kind}
                  onChange={(e) => setBorrador({ ...borrador, kind: e.target.value as CalendarEntry["kind"] })}
                >
                  <option value="evento">Evento</option>
                  <option value="fecha">Fecha importante</option>
                  <option value="valor">Valor del mes</option>
                  <option value="reunion">Reunión</option>
                  <option value="capacitacion">Capacitación</option>
                  <option value="informe">Entrega de informes</option>
                  <option value="otro">Otros...</option>
                </select>
              </div>
            </div>

            {borrador.kind === "otro" && (
              <div>
                <label className="label">Nombre de la categoría</label>
                <input
                  className="input"
                  value={borrador.customKind}
                  onChange={(e) => setBorrador({ ...borrador, customKind: e.target.value })}
                  placeholder="Ej. Retiro espiritual, Jornada deportiva..."
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Lugar (opcional)</label>
                <input
                  className="input"
                  value={borrador.location}
                  onChange={(e) => setBorrador({ ...borrador, location: autocorregir(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Hora (opcional)</label>
                <input
                  className="input"
                  value={borrador.time}
                  onChange={(e) => setBorrador({ ...borrador, time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label">Responsables (opcional)</label>
              <input
                className="input"
                value={borrador.responsibles}
                onChange={(e) => setBorrador({ ...borrador, responsibles: autocorregir(e.target.value) })}
              />
            </div>

            {borrador.kind === "valor" && (
              <div>
                <label className="label">Lema del mes (opcional)</label>
                <input
                  className="input"
                  value={borrador.motto}
                  onChange={(e) => setBorrador({ ...borrador, motto: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="label">Descripción (opcional)</label>
              <textarea lang="es" spellCheck autoCapitalize="sentences" autoCorrect="on"
                rows={5}
                className="input min-h-[120px] resize-y"
                value={borrador.description}
                onChange={(e) => setBorrador({ ...borrador, description: autocorregir(e.target.value) })}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
              <button type="button" onClick={() => setEditandoFecha(false)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Guardar cambios
              </button>
            </div>
          </form>
        )}

        {detalle && !editandoFecha && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
              <span>
                <span className="text-ink-400">Fecha: </span>
                {formatDay(detalle.date)} de {formatMonthShort(detalle.date)}
              </span>
              {detalle.time && (
                <span>
                  <span className="text-ink-400">Hora: </span>
                  {detalle.time}
                </span>
              )}
              {detalle.location && (
                <span>
                  <span className="text-ink-400">Lugar: </span>
                  {detalle.location}
                </span>
              )}
            </div>

            {detalle.responsibles && (
              <div className="rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Responsables</p>
                <p className="mt-0.5 text-sm text-brand-900">{detalle.responsibles}</p>
              </div>
            )}

            {detalle.motto && (
              <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm italic text-amber-800">“{detalle.motto}”</p>
            )}

            {detalle.description ? (
              <div>
                <p className="label">Descripción</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-600">{detalle.description}</p>
              </div>
            ) : (
              <p className="text-sm text-ink-400">Esta fecha no tiene descripción.</p>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 pt-4">
              {isAdmin && (
                <button
                  onClick={() => {
                    setBorrador({
                      title: detalle.title,
                      date: detalle.date,
                      kind: detalle.kind,
                      customKind: detalle.customKind ?? "",
                      location: detalle.location ?? "",
                      time: detalle.time ?? "",
                      responsibles: detalle.responsibles ?? "",
                      description: detalle.description ?? "",
                      motto: detalle.motto ?? "",
                    });
                    setEditandoFecha(true);
                  }}
                  className="btn-secondary"
                >
                  <Pencil className="h-4 w-4" /> Editar
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    if (!window.confirm(`¿Eliminar "${detalle.title}" del calendario?`)) return;
                    removeCalendarEntry(detalle.id);
                    setDetalle(null);
                  }}
                  className="btn-secondary text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" /> Eliminar
                </button>
              )}
              <button onClick={() => setDetalle(null)} className="btn-primary">
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={muralAbierto}
        onClose={() => {
          setMuralAbierto(false);
          setMuralEditando(false);
        }}
        eyebrow="Calendario institucional"
        title={`Mural de ${monthLabel}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="-mt-2 text-xs text-ink-400">
            Lo que escribas aquí queda guardado solo para este mes. Al cambiar de mes verás el mural
            correspondiente, y los anteriores se conservan para consulta.
          </p>

          {muralEditando ? (
            <>
              <textarea lang="es" spellCheck autoCapitalize="sentences" autoCorrect="on"
                rows={10}
                autoFocus
                className="input min-h-[220px] resize-y"
                placeholder="Recordatorios, acuerdos de la reunión, pendientes del mes, avisos para todo el personal..."
                value={muralTexto}
                onChange={(e) => setMuralTexto(autocorregir(e.target.value))}
              />
              {muralAviso && <p className="text-xs font-medium text-rose-600">{muralAviso}</p>}
              <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
                <button
                  onClick={() => {
                    setMuralTexto(mural?.content ?? "");
                    setMuralEditando(false);
                    setMuralAviso("");
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const err = await saveMonthNote(prefijoMes, muralTexto);
                    if (err) {
                      setMuralAviso(err);
                      return;
                    }
                    setMuralEditando(false);
                  }}
                  className="btn-primary"
                >
                  Guardar
                </button>
              </div>
            </>
          ) : (
            <>
              {mural?.content ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900">{mural.content}</p>
                  {mural.updatedBy && (
                    <p className="mt-3 border-t border-amber-200 pt-2 text-xs text-amber-700">
                      Última actualización: {userById(mural.updatedBy)?.name ?? "alguien del equipo"}
                    </p>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-ink-300 px-4 py-8 text-center text-sm text-ink-400">
                  Este mes todavía no tiene notas.
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setMuralTexto(mural?.content ?? "");
                      setMuralEditando(true);
                    }}
                    className="btn-secondary"
                  >
                    <Pencil className="h-4 w-4" /> {mural?.content ? "Editar" : "Escribir"}
                  </button>
                )}
                <button onClick={() => setMuralAbierto(false)} className="btn-primary">
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

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
  const [tipo, setTipo] = useState<CalendarEntry["kind"]>("fecha");
  return (
    <Modal open={open} onClose={onClose} eyebrow="Calendario institucional" title="Nueva fecha" size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const data = new FormData(form);
          onSave({
            date: String(data.get("date") || defaultDate || new Date().toISOString().slice(0, 10)),
            title: String(data.get("title") || "Nueva actividad"),
            kind: data.get("kind") as CalendarEntry["kind"],
            location: String(data.get("location") || ""),
            time: String(data.get("time") || ""),
            description: String(data.get("description") || ""),
            responsibles: String(data.get("responsibles") || ""),
            customKind: String(data.get("customKind") || ""),
          });
          setTipo("fecha");
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
            <input name="date" type="date" className="input" defaultValue={defaultDate ?? new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select
              name="kind"
              className="input"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as CalendarEntry["kind"])}
            >
              <option value="evento">Evento</option>
              <option value="fecha">Fecha importante</option>
              <option value="valor">Valor del mes</option>
              <option value="reunion">Reunión</option>
              <option value="capacitacion">Capacitación</option>
              <option value="informe">Entrega de informes</option>
              <option value="otro">Otros...</option>
            </select>
          </div>
        </div>
        {tipo === "otro" && (
          <div>
            <label className="label">Nombre de la categoría</label>
            <input
              name="customKind"
              className="input"
              placeholder="Ej. Retiro espiritual, Jornada deportiva, Visita pedagógica..."
              required
            />
            <p className="mt-1 text-xs text-ink-400">Así aparecerá etiquetada esta actividad en el calendario.</p>
          </div>
        )}

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
        <div>
          <label className="label">Responsables (opcional)</label>
          <input
            name="responsibles"
            className="input"
            placeholder="Ej. Comisión de Cultura · Daniela Fermín y 5to grado"
          />
          <p className="mt-1 text-xs text-ink-400">Quién debe hacerla cumplir. Escríbelo libremente.</p>
        </div>
        <div>
          <label className="label">Descripción (opcional)</label>
          <textarea lang="es" spellCheck autoCapitalize="sentences" autoCorrect="on"
            name="description"
            rows={5}
            className="input min-h-[120px] resize-y"
            placeholder="Explica de qué se trata: objetivo, quiénes participan, qué deben llevar, acuerdos previos..."
          />
          <p className="mt-1 text-xs text-ink-400">Escribe todo lo que haga falta, no hay límite de texto.</p>
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
