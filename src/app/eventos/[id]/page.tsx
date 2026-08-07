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
} from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { useApp } from "@/lib/store";
import { colorTokens, cx, formatFullDate } from "@/lib/utils";
import { eventProgress } from "@/lib/task-helpers";
import { EventStatusPill } from "@/components/ui/pills";
import { ProgressBar } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
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
  const { eventById, tasksForEvent, userById, canSeeEvent, canEditEvent, updateEvent, deleteEvent, duplicateEvent, loading } = useApp();
  const [editOpen, setEditOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [aviso, setAviso] = useState("");

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

  function handleDelete() {
    if (!window.confirm(`¿Eliminar "${event!.name}"? Se borrarán también sus tareas, chats y evidencias. No se puede deshacer.`)) return;
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
                <button onClick={() => updateEvent(event.id, { status: "publicado" })} className="btn-primary">
                  <Send className="h-4 w-4" /> Publicar
                </button>
              )}

              {/* Ciclo de vida completo: borrador -> publicado -> finalizado -> archivado */}
              {event.status === "publicado" && (
                <button
                  onClick={() => {
                    if (window.confirm("¿Dar por finalizado este evento? Seguirá visible, pero se marcará como cerrado.")) {
                      updateEvent(event.id, { status: "finalizado" });
                    }
                  }}
                  className="btn-secondary"
                >
                  <CheckCircle2 className="h-4 w-4" /> Finalizar
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

      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="section-eyebrow">Colaboración</p>
          <h2 className="text-xl font-bold text-ink-900">Tareas del evento</h2>
        </div>
        {editable && (
          <button onClick={() => setCreateTaskOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Crear tarea
          </button>
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
