"use client";

import { useEffect, useState } from "react";
import { Clock, Users, AlertTriangle, Hourglass, UserPlus, CheckCircle2, RotateCcw } from "lucide-react";
import { EventTask } from "@/lib/types";
import { useApp } from "@/lib/store";
import { colorTokens, cx, formatFullDate } from "@/lib/utils";
import { cancelRemainingSeconds, dueLabel, isDueSoon, isOverdue, isTaskFull, slotProgress } from "@/lib/task-helpers";
import { PriorityPill } from "@/components/ui/pills";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress";
import { TaskDetailModal } from "./task-detail-modal";

export function TaskCard({ task, showEventName = false }: { task: EventTask; showEventName?: boolean }) {
  const { userById, eventById, claimSlot, cancelSlot, joinWaitlist, leaveWaitlist, settings, currentUser } = useApp();
  const [open, setOpen] = useState(false);
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const event = eventById(task.eventId);
  /** En un evento finalizado o archivado ya no se entra ni se sale. */
  const eventoCerrado = event?.status === "finalizado" || event?.status === "archivado";
  const tokens = colorTokens[task.color];
  const { filled, total, pct } = slotProgress(task);
  const full = isTaskFull(task);
  const alreadyIn = task.slots.some((s) => s.userId === currentUser?.id);
  const inWaitlist = task.waitlist.includes(currentUser?.id ?? "");
  const waitPos = task.waitlist.indexOf(currentUser?.id ?? "") + 1;

  // Cuenta regresiva viva para deshacer la inscripción recién hecha.
  const mySlot = task.slots.find((s) => s.userId === currentUser?.id);
  const [secsLeft, setSecsLeft] = useState(() => cancelRemainingSeconds(mySlot?.claimedAt ?? null, settings.cancelWindowMinutes));
  useEffect(() => {
    setSecsLeft(cancelRemainingSeconds(mySlot?.claimedAt ?? null, settings.cancelWindowMinutes));
    if (!mySlot?.claimedAt) return;
    const id = setInterval(() => {
      setSecsLeft(cancelRemainingSeconds(mySlot.claimedAt, settings.cancelWindowMinutes));
    }, 1000);
    return () => clearInterval(id);
  }, [mySlot?.claimedAt, settings.cancelWindowMinutes]);
  const fmtCd = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const leader = task.leaderId ? userById(task.leaderId) : null;
  const collaborators = task.slots.filter((s) => s.userId).map((s) => userById(s.userId!)).filter(Boolean);

  /** Ejecuta una acción y muestra el motivo si el servidor la rechaza. */
  async function ejecutar(accion: () => Promise<string | void>) {
    setAviso("");
    setOcupado(true);
    const err = await accion();
    setOcupado(false);
    if (err) setAviso(err);
  }

  function handleJoin() {
    const idx = task.slots.findIndex((s) => !s.userId);
    ejecutar(() => (idx >= 0 ? claimSlot(task.id, idx) : joinWaitlist(task.id)));
  }

  return (
    <>
      <div className={cx("card overflow-hidden border-t-4", isOverdue(task) ? "border-t-rose-500" : tokens.border)}>
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            {showEventName && event ? (
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-400">{event.name}</p>
            ) : (
              <span />
            )}
            <PriorityPill priority={task.priority} />
          </div>
          <button onClick={() => setOpen(true)} className="text-left">
            <h3 className="text-[15px] font-semibold text-ink-900 hover:text-brand-700">{task.name}</h3>
          </button>
          {leader && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
              <Avatar name={leader.name} color={leader.color} size="xs" /> Líder: <span className="font-medium text-ink-700">{leader.name}</span>
            </p>
          )}
          <p
            className={cx(
              "mt-2 flex items-center gap-1.5 text-xs",
              isOverdue(task) ? "font-semibold text-rose-600" : isDueSoon(task) ? "font-semibold text-amber-700" : "text-ink-500"
            )}
          >
            {isOverdue(task) ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            {dueLabel(task)} <span className="font-normal text-ink-400">· {formatFullDate(task.dueDate)}</span>
          </p>

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs text-ink-500">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Colaboradores</span>
              <span className="font-semibold text-ink-800">
                {filled} de {total}
              </span>
            </div>
            <ProgressBar value={pct} colorClass={full ? "bg-ink-400" : tokens.solid} />
          </div>

          {task.waitlist.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-400">
              <Hourglass className="h-3.5 w-3.5" /> {task.waitlist.length} en lista de espera
            </p>
          )}

          {collaborators.length > 0 && (
            <div className="mt-3 flex -space-x-2">
              {collaborators.slice(0, 4).map((c) => (
                <Avatar key={c!.id} name={c!.name} color={c!.color} size="xs" />
              ))}
              {collaborators.length > 4 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-100 text-[10px] font-semibold text-ink-600 ring-2 ring-white">
                  +{collaborators.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-ink-100 px-4 py-3">
          {eventoCerrado ? (
            <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-ink-500 hover:underline">
              <CheckCircle2 className="h-3.5 w-3.5" /> Evento cerrado — ver detalle
            </button>
          ) : alreadyIn && secsLeft > 0 ? (
            <div className="-m-0.5 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="flex items-start gap-1.5 text-left text-xs leading-relaxed text-amber-800">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>
                  Inscrito. Puedes deshacerlo durante{" "}
                  <b className="rounded bg-amber-100 px-1.5 font-bold tabular-nums">{fmtCd(secsLeft)}</b>
                </span>
              </p>
              <button
                onClick={() => ejecutar(() => cancelSlot(task.id))}
                disabled={ocupado}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Deshacer inscripción
              </button>
            </div>
          ) : alreadyIn ? (
            <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ver detalle de mi tarea
            </button>
          ) : inWaitlist ? (
            <button onClick={() => ejecutar(() => leaveWaitlist(task.id))} disabled={ocupado} className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-amber-700 hover:underline disabled:opacity-60">
              <Hourglass className="h-3.5 w-3.5" /> En espera · puesto {waitPos} — salir
            </button>
          ) : full ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => setOpen(true)} className="text-sm font-medium text-ink-500 hover:underline">
                Ver detalle
              </button>
              <span className="h-4 w-px bg-ink-200" />
              <button onClick={() => ejecutar(() => joinWaitlist(task.id))} disabled={ocupado} className="flex items-center justify-center gap-1.5 text-sm font-medium text-ink-500 hover:underline disabled:opacity-60">
                <Hourglass className="h-3.5 w-3.5" /> Lista de espera
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setOpen(true)} className="text-sm font-medium text-ink-500 hover:underline">
                Ver detalle
              </button>
              <span className="h-4 w-px bg-ink-200" />
              <button onClick={handleJoin} disabled={ocupado} className="flex items-center justify-center gap-1.5 text-sm font-medium text-brand-700 hover:underline disabled:opacity-60">
                <UserPlus className="h-3.5 w-3.5" /> {ocupado ? "Inscribiendo..." : "Inscribirme"}
              </button>
            </div>
          )}
          {aviso && (
            <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-center text-xs font-medium text-rose-700">{aviso}</p>
          )}
        </div>
      </div>
      <TaskDetailModal open={open} onClose={() => setOpen(false)} task={task} />
    </>
  );
}
