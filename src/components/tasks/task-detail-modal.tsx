"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useApp } from "@/lib/store";
import { EventTask, TaskExecStatus } from "@/lib/types";
import { colorTokens, formatFullDate, timeAgo } from "@/lib/utils";
import { cancelRemainingSeconds, canStillCancel, isTaskFull, slotProgress } from "@/lib/task-helpers";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress";
import { ExecStatusPill, PriorityPill } from "@/components/ui/pills";
import { Paperclip, ImagePlus, Send, Crown, UserPlus, X, FileText, Hourglass, AlertTriangle, Lock, Users, RotateCcw, CheckCircle2 } from "lucide-react";
import { cx } from "@/lib/utils";

const statusOrder: TaskExecStatus[] = ["sin_iniciar", "en_proceso", "terminada"];
const statusLabel: Record<TaskExecStatus, string> = {
  sin_iniciar: "Sin iniciar",
  en_proceso: "En proceso",
  terminada: "Terminada",
};

export function TaskDetailModal({ open, onClose, task }: { open: boolean; onClose: () => void; task: EventTask }) {
  const { userById, eventById, currentUser, isAdmin, canDeleteTask, claimSlot, cancelSlot, joinWaitlist, leaveWaitlist, hasEvidence, canFinishTask, setExecStatus, addChatMessage, toggleReaction, addEvidence, deleteTask, settings } =
    useApp();
  const [tab, setTab] = useState<"detalle" | "chat" | "evidencias">("detalle");
  const [message, setMessage] = useState("");
  const [, forceTick] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const event = eventById(task.eventId);
  const tokens = colorTokens[task.color];
  const { filled, total, pct } = slotProgress(task);
  const full = isTaskFull(task);
  const mySlot = task.slots.find((s) => s.userId === currentUser?.id);
  const canManage = isAdmin || canDeleteTask(task);
  const inWaitlist = task.waitlist.includes(currentUser?.id ?? "");
  const waitPos = task.waitlist.indexOf(currentUser?.id ?? "") + 1;
  const evidenceOk = canFinishTask(task);
  const mySecsLeft = cancelRemainingSeconds(mySlot?.claimedAt ?? null, settings.cancelWindowMinutes);
  // El chat es del EQUIPO de la tarea: inscritos, líder y dueño del evento.
  const team = [
    ...task.slots.map((sl) => sl.userId),
    task.leaderId,
    event?.createdBy,
  ].filter((x): x is string => !!x);
  const canWrite = team.includes(currentUser?.id ?? "") || isAdmin;

  useEffect(() => {
    const id = setInterval(() => forceTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (tab === "chat") chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tab, task.chat.length]);

  function handleJoin(idx: number) {
    claimSlot(task.id, idx);
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    if (!canWrite) return;
    addChatMessage(task.id, message.trim());
    setMessage("");
  }

  return (
    <Modal open={open} onClose={onClose} eyebrow={event?.name ?? "Tarea"} title={task.name} size="lg">
      <div className="-mt-2 mb-4 flex flex-wrap items-center gap-2">
        <ExecStatusPill status={task.status} />
        <PriorityPill priority={task.priority} />
        <span className="text-xs text-ink-400">Vence el {formatFullDate(task.dueDate)}</span>
      </div>

      {mySecsLeft > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-amber-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Quedaste inscrito. Si te equivocaste, puedes deshacerlo durante{" "}
              <b className="rounded bg-amber-100 px-1.5 font-bold tabular-nums">
                {`${Math.floor(mySecsLeft / 60)}:${String(mySecsLeft % 60).padStart(2, "0")}`}
              </b>
            </span>
          </p>
          <button
            onClick={() => cancelSlot(task.id)}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Deshacer
          </button>
        </div>
      )}

      <div className="mb-5 flex gap-1 rounded-xl bg-ink-50 p-1">
        {(["detalle", "chat", "evidencias"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors",
              tab === t ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"
            )}
          >
            {t === "detalle" ? "Detalle" : t === "chat" ? `Chat (${task.chat.length})` : `Evidencias (${task.evidence.length + task.attachments.length})`}
          </button>
        ))}
      </div>

      {tab === "detalle" && (
        <div className="space-y-6">
          <p className="text-sm leading-relaxed text-ink-600">{task.description || "Sin descripción adicional."}</p>

          {task.requiresLeader && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <Crown className="h-4 w-4" />
              {task.leaderId ? (
                <span>
                  Líder asignado: <strong>{userById(task.leaderId)?.name}</strong>
                </span>
              ) : (
                <span>Esta tarea requiere un líder (sin asignar aún).</span>
              )}
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-ink-700">Colaboradores</span>
              <span className="text-ink-500">{filled} de {total} lugares ocupados</span>
            </div>
            <ProgressBar value={pct} colorClass={full ? "bg-ink-400" : tokens.solid} className="mb-4" />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {task.slots.map((slot, idx) => {
                const user = slot.userId ? userById(slot.userId) : null;
                const isMe = slot.userId === currentUser?.id;
                const remaining = isMe ? cancelRemainingSeconds(slot.claimedAt, settings.cancelWindowMinutes) : 0;
                return (
                  <div
                    key={idx}
                    className={cx(
                      "flex items-center justify-between rounded-xl border px-3 py-2.5",
                      user ? "border-ink-100 bg-ink-50/60" : "border-dashed border-ink-200"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 text-xs font-semibold text-ink-400">#{idx + 1}</span>
                      {user ? (
                        <>
                          <Avatar name={user.name} color={user.color} size="xs" />
                          <span className="text-sm font-medium text-ink-800">{user.name}</span>
                        </>
                      ) : (
                        <span className="text-sm text-ink-400">Lugar disponible</span>
                      )}
                    </div>
                    {user ? (
                      isMe && canStillCancel(slot.claimedAt, settings.cancelWindowMinutes) ? (
                        <button
                          onClick={() => cancelSlot(task.id)}
                          className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline"
                        >
                          <RotateCcw className="h-3 w-3" /> Deshacer ·{" "}
                          <b className="tabular-nums">
                            {`${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
                          </b>
                        </button>
                      ) : isMe ? (
                        <span className="badge bg-brand-100 text-brand-800">Confirmado</span>
                      ) : null
                    ) : (
                      !mySlot && (
                        <button
                          onClick={() => handleJoin(idx)}
                          className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                        >
                          <UserPlus className="h-3 w-3" /> Ocupar
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {(full || task.waitlist.length > 0) && (
            <div className="border-t border-ink-100 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink-700">
                  <Hourglass className="h-4 w-4" /> Lista de espera
                </p>
                <span className="badge bg-ink-100 text-ink-600">
                  {task.waitlist.length} {task.waitlist.length === 1 ? "persona" : "personas"}
                </span>
              </div>
              {task.waitlist.length === 0 ? (
                <p className="text-sm text-ink-400">Nadie espera turno todavía.</p>
              ) : (
                <div className="space-y-2">
                  {task.waitlist.map((uid, idx) => {
                    const wu = userById(uid);
                    const isMe = uid === currentUser?.id;
                    return (
                      <div key={uid} className="flex items-center justify-between rounded-xl border border-dashed border-ink-200 px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 text-xs font-semibold text-ink-400">{idx + 1}º</span>
                          <Avatar name={wu?.name ?? "?"} color={wu?.color} size="xs" />
                          <span className="text-sm font-medium text-ink-800">{wu?.name}</span>
                          {isMe && <span className="badge bg-amber-100 text-amber-800">Tú</span>}
                        </div>
                        {isMe && (
                          <button onClick={() => leaveWaitlist(task.id)} className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline">
                            <X className="h-3 w-3" /> Salir
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {!mySlot && !inWaitlist && full && (
                <button onClick={() => joinWaitlist(task.id)} className="btn-secondary mt-3 w-full">
                  <Hourglass className="h-4 w-4" /> Apuntarme a la lista de espera
                </button>
              )}
              {inWaitlist && (
                <p className="mt-2 text-xs text-ink-500">
                  Eres el <strong>{waitPos}º</strong> en la fila. Si alguien cancela, entras automáticamente y te avisamos.
                </p>
              )}
            </div>
          )}

          {canManage && (
            <div>
              <p className="label">Estado de ejecución</p>
              <div className="flex gap-2">
                {statusOrder.map((s) => {
                  const blocked = s === "terminada" && !evidenceOk;
                  return (
                    <button
                      key={s}
                      onClick={() => (blocked ? setTab("evidencias") : setExecStatus(task.id, s))}
                      title={blocked ? "Sube una evidencia para poder cerrar la tarea" : undefined}
                      className={cx(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                        task.status === s ? "border-brand-600 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-500 hover:bg-ink-50",
                        blocked && "opacity-60"
                      )}
                    >
                      {blocked && <Lock className="h-3.5 w-3.5" />}
                      {statusLabel[s]}
                    </button>
                  );
                })}
              </div>
              {!evidenceOk && (
                <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Esta tarea necesita al menos una evidencia antes de darse por terminada.{" "}
                    <button onClick={() => setTab("evidencias")} className="font-semibold underline">
                      Subir evidencia
                    </button>
                  </span>
                </div>
              )}
            </div>
          )}

          {canManage && (
            <div className="flex justify-end border-t border-ink-100 pt-4">
              <button
                onClick={() => {
                  deleteTask(task.id);
                  onClose();
                }}
                className="text-sm font-medium text-rose-600 hover:underline"
              >
                Eliminar tarea
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "chat" && (
        <div className="flex h-[420px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {task.chat.length === 0 && (
              <p className="py-10 text-center text-sm text-ink-400">Aún no hay mensajes. Sé el primero en escribir.</p>
            )}
            {task.chat.map((m) => {
              const author = userById(m.authorId);
              const mine = m.authorId === currentUser?.id;
              return (
                <div key={m.id} className={cx("flex gap-2.5", mine && "flex-row-reverse")}>
                  <Avatar name={author?.name ?? "?"} color={author?.color} size="sm" />
                  <div className={cx("max-w-[75%]", mine && "items-end text-right")}>
                    <div className={cx("rounded-2xl px-3.5 py-2.5 text-sm", mine ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-800")}>
                      {!mine && <p className="mb-0.5 text-xs font-semibold text-brand-700">{author?.name}</p>}
                      {m.text}
                    </div>
                    <div className={cx("mt-1 flex items-center gap-2 text-[11px] text-ink-400", mine && "justify-end")}>
                      <span>{timeAgo(m.createdAt)}</span>
                      {(["👍", "❤️", "✅"] as const).map((emoji) => {
                        const count = m.reactions[emoji]?.length ?? 0;
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(task.id, m.id, emoji)}
                            className={cx(
                              "rounded-full border px-1.5 py-0.5",
                              count > 0 ? "border-brand-200 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-400 hover:bg-ink-50"
                            )}
                          >
                            {emoji} {count > 0 && count}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          {!canWrite ? (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-800">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Solo lectura.</strong> El chat es para quienes trabajan en esta tarea. Inscríbete y podrás
                escribir con el equipo.
              </span>
            </div>
          ) : (
          <form onSubmit={handleSend} className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-3">
            <button
              type="button"
              onClick={() => addEvidence(task.id, "foto-avance.jpg", "image")}
              className="btn-ghost !px-2.5"
              title="Adjuntar imagen"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => addEvidence(task.id, "documento.pdf", "file")}
              className="btn-ghost !px-2.5"
              title="Adjuntar archivo"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              className="input flex-1"
              placeholder="Escribe un mensaje..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button type="submit" className="btn-primary !px-3.5">
              <Send className="h-4 w-4" />
            </button>
          </form>
          )}
          {canWrite && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-400">
              <Users className="h-3.5 w-3.5" /> Este chat lo ven las {new Set(team).size} personas del equipo de la
              tarea, no todo el colegio.
            </p>
          )}
        </div>
      )}

      {tab === "evidencias" && (
        <div className="space-y-6">
          {settings.requireEvidence && (
            <div
              className={cx(
                "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed",
                hasEvidence(task) ? "border-brand-200 bg-brand-50 text-brand-800" : "border-amber-200 bg-amber-50 text-amber-800"
              )}
            >
              {hasEvidence(task) ? <ImagePlus className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>
                {hasEvidence(task)
                  ? "Esta tarea ya tiene evidencia registrada, puede darse por terminada."
                  : "Se requiere evidencia. Sube al menos una foto o documento para poder marcarla como terminada."}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink-700">Fotografías de avance</p>
            <button onClick={() => addEvidence(task.id, "evidencia.jpg", "image")} className="btn-secondary !py-1.5 !text-xs">
              <ImagePlus className="h-3.5 w-3.5" /> Subir foto
            </button>
          </div>
          {task.evidence.length === 0 ? (
            <p className="text-sm text-ink-400">No se han subido evidencias aún.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {task.evidence.map((ev) => (
                <div key={ev.id} className="aspect-square rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 p-3">
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <ImagePlus className="mb-1 h-5 w-5 text-brand-600" />
                    <p className="truncate text-[11px] font-medium text-ink-700">{ev.name}</p>
                    <p className="text-[10px] text-ink-400">{timeAgo(ev.uploadedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-ink-100 pt-5">
            <p className="text-sm font-medium text-ink-700">Documentos adjuntos</p>
            <button onClick={() => addEvidence(task.id, "informe.pdf", "file")} className="btn-secondary !py-1.5 !text-xs">
              <Paperclip className="h-3.5 w-3.5" /> Subir archivo
            </button>
          </div>
          {task.attachments.length === 0 ? (
            <p className="text-sm text-ink-400">No hay documentos adjuntos.</p>
          ) : (
            <div className="space-y-2">
              {task.attachments.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2.5">
                  <FileText className="h-4 w-4 text-ink-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">{doc.name}</p>
                    <p className="text-xs text-ink-400">{timeAgo(doc.uploadedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
