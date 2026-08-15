"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Copy,
  Trash2,
  CalendarClock,
  Users,
  Send,
  CheckCircle2,
  RotateCcw,
  Archive,
  CalendarPlus,
  CalendarX,
} from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";
import { colorTokens, cx, formatFullDate } from "@/lib/utils";
import { eventProgress } from "@/lib/task-helpers";
import { EventStatusPill } from "@/components/ui/pills";
import { ProgressBar } from "@/components/ui/progress";
import { TaskCard } from "@/components/tasks/task-card";
import { EventFormModal } from "@/components/events/event-form-modal";
import { TaskFormModal } from "@/components/tasks/task-form-modal";
import { TaskExecStatus } from "@/lib/types";

const columns: { key: TaskExecStatus; label: string }[] = [
  { key: "sin_iniciar", label: "Sin iniciar" },
  { key: "en_proceso", label: "En proceso" },
  { key: "terminada", label: "Terminada" },
];

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { eventById, tasksForEvent, userById, canSeeEvent, canEditEvent, currentUser, updateEvent, deleteEvent, duplicateEvent, loading, settings, llevarEventoAlCalendario, quitarEventoDelCalendario, fechaDeEvento } = useApp();
  const [editOpen, setEditOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [aviso, setAviso] = useState("");
  const [enCalendario, setEnCalendario] = useState(false);

  const event = eventById(params.id);

  // Mientras llegan los datos de la base no podemos afirmar que el evento no exista.
  if (loading) {
    return (
      <Shell>
        <div className="card p-10 text-center text-sm text-ink-500">Cargando el evento...</div>
      </Shell>
    );
  }

  // Un borrador ajeno no debe abrirse ni siquiera conociendo la URL.
  if (event && !canSeeEvent(event)) {
    return (
      <Shell>
        <div className="card p-10 text-center">
          <p className="text-ink-500">Este evento es un borrador privado de otra persona.</p>
          <Link href="/eventos" className="btn-secondary mt-4 inline-flex">
            Volver a eventos
          </Link>
        </div>
      </Shell>
    );
  }
  if (!event) {
    return (
      <Shell>
        <div className="card p-10 text-center">
          <p className="text-ink-500">Este evento no existe o fue eliminado.</p>
          <Link href="/eventos" className="btn-secondary mt-4 inline-flex">
            Volver a eventos
          </Link>
        </div>
      </Shell>
    );
  }

  const tasks = tasksForEvent(event.id);
  const progress = eventProgress(tasks);
  const tokens = colorTokens[event.color];
  const creator = userById(event.createdBy);
  const editable = canEditEvent(event);
  const esCreador = event.createdBy === currentUser?.id;

  /* Quiénes participan en el evento: todas las personas inscritas en cualquiera
     de sus tareas, con las tareas que tomaron. Se calcula a partir de los cupos,
     que es la fuente de verdad de quién se comprometió a qué. */
  const participantes = (() => {
    const mapa = new Map<string, { id: string; tareas: string[] }>();
    tasks.forEach((t) => {
      t.slots.forEach((cupo) => {
        if (!cupo.userId) return;
        const ficha = mapa.get(cupo.userId) ?? { id: cupo.userId, tareas: [] };
        if (!ficha.tareas.includes(t.name)) ficha.tareas.push(t.name);
        mapa.set(cupo.userId, ficha);
      });
    });
    return Array.from(mapa.values());
  })();

  /** ¿Esta persona ya se comprometió con alguna tarea del evento? */
  const estoyInscrito = participantes.some((p) => p.id === currentUser?.id);
  /** ¿Este evento ya tiene su fecha puesta en el calendario del colegio? */
  const yaEnCalendario = !!fechaDeEvento(event.id);
  const eventoCerrado = event.status === "finalizado" || event.status === "archivado";

  /* ---------- Reglas del ciclo de vida del evento ---------- */
  const tareasPendientes = tasks.filter((t) => t.status !== "terminada");
  const sinEvidencia = tasks.filter(
    (t) => t.status === "terminada" && settings.requireEvidence && t.evidence.length + t.attachments.length === 0
  );

  function publicar() {
    if (tasks.length === 0) {
      setAviso("Agrega al menos una tarea antes de publicar. Un evento sin tareas no le sirve al equipo.");
      return;
    }
    updateEvent(event!.id, { status: "publicado" });
    setAviso("Evento publicado. Ya es visible para todo el personal y pueden inscribirse en sus tareas.");
  }

  function finalizar() {
    if (tasks.length === 0) {
      setAviso("Este evento no tiene ninguna tarea, así que no hay nada que dar por terminado.");
      return;
    }
    if (tareasPendientes.length > 0) {
      setAviso(
        `No se puede finalizar todavía: ${tareasPendientes.length} tarea(s) sin terminar (${tareasPendientes
          .slice(0, 3)
          .map((t) => t.name)
          .join(", ")}${tareasPendientes.length > 3 ? "..." : ""}).`
      );
      return;
    }
    if (sinEvidencia.length > 0) {
      setAviso(
        `Faltan evidencias en ${sinEvidencia.length} tarea(s) terminada(s). Sube la foto o el documento final antes de cerrar el evento.`
      );
      return;
    }
    if (!window.confirm("¿Dar por finalizado este evento? Quedará cerrado, pero podrás reabrirlo si hace falta.")) return;
    updateEvent(event!.id, { status: "finalizado" });
    setAviso("Evento finalizado. Puedes reabrirlo o archivarlo cuando quieras.");
  }

  function handleDelete() {
    /* Si el evento está anunciado en el calendario del colegio, hay que decirlo:
       la fecha NO se borra sola, se queda ahí como fecha suelta. */
    const aviso = yaEnCalendario
      ? ` Está anunciado en el calendario del colegio: esa fecha se quedará ahí como fecha normal, sin enlace al evento. Si no la quieres, quítala antes desde el botón "Quitar del calendario".`
      : "";
    if (!window.confirm(`¿Eliminar "${event!.name}"? Se borrarán también sus tareas, chats y evidencias. No se puede deshacer.${aviso}`)) return;
    deleteEvent(event!.id);
    router.push("/eventos");
  }

  return (
    <Shell>
      <button onClick={() => router.push("/eventos")} className="mb-5 flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Volver a eventos
      </button>

      {aviso && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <span>{aviso}</span>
          <button onClick={() => setAviso("")} className="shrink-0 text-brand-700 hover:underline">Cerrar</button>
        </div>
      )}

      <div className={`card mb-6 overflow-hidden`}>
        <div className={`relative flex h-32 items-center justify-between overflow-hidden px-8 ${tokens.soft}`}>
          {event.coverImage && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-0 bg-gradient-to-r from-black/50 to-black/10" />
            </>
          )}
          <span className={cx("relative text-6xl", event.coverImage && "drop-shadow-lg")}>{event.coverEmoji}</span>
          <span className="relative">
            <EventStatusPill status={event.status} />
          </span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-ink-900">{event.name}</h1>
            <p className="mt-1.5 text-[15px] text-ink-500">{event.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-ink-500">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4" /> {formatFullDate(event.eventDate)}
              </span>
              {creator && (
                <span className="flex items-center gap-1.5">
                  <Avatar name={creator.name} color={creator.color} size="xs" /> Creado por {creator.name}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {tasks.length} tareas
              </span>
            </div>
          </div>

          {editable && (
            <div className="flex flex-wrap items-center gap-2">
              {event.status === "borrador" && (
                <button onClick={publicar} className="btn-primary">
                  <Send className="h-4 w-4" /> Publicar
                </button>
              )}

              {/* Ciclo de vida completo: borrador -> publicado -> finalizado -> archivado */}
              {event.status === "publicado" && tasks.length > 0 && (
                <button
                  onClick={finalizar}
                  title={
                    tareasPendientes.length > 0
                      ? `Faltan ${tareasPendientes.length} tarea(s) por terminar`
                      : "Cerrar el evento"
                  }
                  className="btn-secondary"
                >
                  <CheckCircle2 className="h-4 w-4" /> Finalizar
                  {tareasPendientes.length > 0 && (
                    <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-800">
                      {tareasPendientes.length}
                    </span>
                  )}
                </button>
              )}

              {event.status === "finalizado" && (
                <>
                  <button onClick={() => updateEvent(event.id, { status: "publicado" })} className="btn-secondary">
                    <RotateCcw className="h-4 w-4" /> Reabrir
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("¿Archivar el evento? Dejará de aparecer en el muro, pero no se borra nada.")) {
                        updateEvent(event.id, { status: "archivado" });
                      }
                    }}
                    className="btn-secondary"
                  >
                    <Archive className="h-4 w-4" /> Archivar
                  </button>
                </>
              )}

              {event.status === "archivado" && (
                <button onClick={() => updateEvent(event.id, { status: "publicado" })} className="btn-secondary">
                  <RotateCcw className="h-4 w-4" /> Desarchivar
                </button>
              )}
              {/* Llevar al calendario: siempre a petición, nunca automático.
                  Si ya está, el mismo botón sirve para quitarlo. */}
              {yaEnCalendario && (
                <Link
                  href="/calendario"
                  title="Ver esta fecha en el calendario del colegio"
                  className="btn-secondary"
                >
                  <CalendarClock className="h-4 w-4" /> Ver en el calendario
                </Link>
              )}

              {yaEnCalendario ? (
                <button
                  onClick={async () => {
                    setAviso("");
                    setEnCalendario(true);
                    const err = await quitarEventoDelCalendario(event.id);
                    setEnCalendario(false);
                    setAviso(err ?? "Se quitó del calendario institucional.");
                  }}
                  disabled={enCalendario}
                  title="Quitar esta fecha del calendario del colegio"
                  className="btn-secondary"
                >
                  <CalendarX className="h-4 w-4" /> Quitar del calendario
                </button>
              ) : (
                <button
                  onClick={async () => {
                    setAviso("");
                    setEnCalendario(true);
                    const err = await llevarEventoAlCalendario(event.id);
                    setEnCalendario(false);
                    setAviso(
                      err ??
                        "Listo, ya aparece en el calendario del colegio y se le avisó al equipo."
                    );
                  }}
                  disabled={enCalendario || !event.eventDate}
                  title={
                    event.eventDate
                      ? "Mostrarlo también en el calendario del colegio"
                      : "El evento necesita una fecha para poder ir al calendario"
                  }
                  className="btn-secondary"
                >
                  <CalendarPlus className="h-4 w-4" /> Agregar al calendario
                </button>
              )}

              <button onClick={() => setEditOpen(true)} className="btn-secondary">
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button
                onClick={async () => {
                  await duplicateEvent(event.id);
                  setAviso("Se creó una copia como borrador, con las mismas tareas y configuración. La encontrarás en Mi espacio.");
                }}
                className="btn-secondary"
              >
                <Copy className="h-4 w-4" /> Duplicar
              </button>
              <button onClick={handleDelete} className="btn-secondary text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            </div>
          )}
        </div>
        <div className="border-t border-ink-100 px-6 py-4">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-ink-700">Progreso general</span>
            <span className="font-semibold text-ink-900">{progress}%</span>
          </div>
          <ProgressBar value={progress} colorClass={tokens.solid} />
        </div>
      </div>

      {/* Quiénes participan. Visible para todo el personal: saber quién está
          dentro es justo lo que ayuda a decidir si uno se suma. */}
      <div className="card mb-6 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="section-eyebrow">Quiénes participan</p>
            <h2 className="text-lg font-bold text-ink-900">
              {participantes.length === 0
                ? "Todavía nadie se ha inscrito"
                : `${participantes.length} ${participantes.length === 1 ? "persona inscrita" : "personas inscritas"}`}
            </h2>
          </div>
          {estoyInscrito && (
            <span className="badge shrink-0 bg-brand-100 text-brand-800">
              <CheckCircle2 className="h-3 w-3" /> Estás dentro
            </span>
          )}
        </div>

        {participantes.length === 0 ? (
          <p className="text-sm text-ink-500">
            Cuando alguien ocupe un lugar en una tarea, aparecerá aquí. Mira las tareas de abajo y
            toma la que puedas.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {participantes.map((p) => {
              const persona = userById(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-start gap-3 rounded-xl border border-ink-100 px-3.5 py-3"
                >
                  <Avatar name={persona?.name ?? "?"} color={persona?.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {persona?.name ?? "Alguien"}
                      {p.id === event.createdBy && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                          Creador
                        </span>
                      )}
                    </p>
                    {persona?.title && <p className="truncate text-xs text-ink-500">{persona.title}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {p.tareas.map((nombre) => (
                        <span
                          key={nombre}
                          className="max-w-full truncate rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600"
                        >
                          {nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Qué puede hacer quien está mirando. Las reglas invisibles confunden. */}
        <p className="mt-4 border-t border-ink-100 pt-3 text-xs leading-relaxed text-ink-500">
          {esCreador ? (
            <>
              <strong className="text-ink-700">Eres quien creó este evento.</strong> Solo tú (y la
              administración del colegio) pueden publicarlo, editarlo, llevarlo al calendario o
              eliminarlo.
            </>
          ) : editable ? (
            <>
              <strong className="text-ink-700">Estás actuando como administrador.</strong> Puedes
              gestionar este evento aunque no sea tuyo; úsalo con cuidado, porque su creador es{" "}
              {creator?.name ?? "otra persona"}.
            </>
          ) : (
            <>
              Puedes ver el evento e inscribirte en sus tareas. Publicarlo, editarlo o eliminarlo
              queda reservado a quien lo creó
              {creator ? <> ({creator.name})</> : null} y a la administración.
            </>
          )}
        </p>
      </div>

      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="section-eyebrow">Colaboración</p>
          <h2 className="text-xl font-bold text-ink-900">Tareas del evento</h2>
        </div>
        {editable && !eventoCerrado && (
          <button onClick={() => setCreateTaskOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Crear tarea
          </button>
        )}
        {editable && eventoCerrado && (
          <span className="text-xs text-ink-400">Evento cerrado: reábrelo para volver a editar sus tareas.</span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-ink-500">Este evento aún no tiene tareas. ¡Agrega la primera!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key}>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-ink-700">{col.label}</h3>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-500">{colTasks.length}</span>
                </div>
                <div className="space-y-4">
                  {colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  {colTasks.length === 0 && <p className="text-xs text-ink-400">Sin tareas en esta columna.</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EventFormModal open={editOpen} onClose={() => setEditOpen(false)} event={event} />
      <TaskFormModal open={createTaskOpen} onClose={() => setCreateTaskOpen(false)} eventId={event.id} />
    </Shell>
  );
}
