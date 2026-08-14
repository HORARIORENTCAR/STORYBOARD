"use client";

import Link from "next/link";
import { MoreHorizontal, Users, ListChecks } from "lucide-react";
import { SchoolEvent } from "@/lib/types";
import { useApp } from "@/lib/store";
import { colorTokens, formatDay, formatMonthShort } from "@/lib/utils";
import { eventProgress } from "@/lib/task-helpers";
import { EventStatusPill } from "@/components/ui/pills";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress";

/**
 * Cuánto falta para el evento, dicho como lo diría una persona.
 * Sirve para que en el muro, ya ordenado por cercanía, se vea de un golpe
 * qué corre prisa y qué ya pasó.
 */
function cuandoEs(fecha: string): { texto: string; tono: "hoy" | "pronto" | "normal" | "pasado" } | null {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const cuando = new Date(fecha + "T00:00:00");
  if (isNaN(cuando.getTime())) return null;

  const dias = Math.round((cuando.getTime() - hoy.getTime()) / 86400000);
  if (dias === 0) return { texto: "Hoy", tono: "hoy" };
  if (dias === 1) return { texto: "Mañana", tono: "hoy" };
  if (dias < 0) return { texto: dias === -1 ? "Ayer" : `Hace ${Math.abs(dias)} días`, tono: "pasado" };
  if (dias <= 7) return { texto: `En ${dias} días`, tono: "pronto" };
  return { texto: `En ${dias} días`, tono: "normal" };
}

export function EventCard({ event }: { event: SchoolEvent }) {
  const { tasksForEvent, userById } = useApp();
  const plazo = cuandoEs(event.eventDate);
  const tasks = tasksForEvent(event.id);
  const progress = eventProgress(tasks);
  const tokens = colorTokens[event.color];
  const creator = userById(event.createdBy);
  const collaboratorCount = new Set(
    tasks.flatMap((t) => t.slots.filter((s) => s.userId).map((s) => s.userId))
  ).size;

  return (
    <Link
      href={`/eventos/${event.id}`}
      className="card group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-pop"
    >
      <div className={`relative flex h-28 items-center justify-center overflow-hidden ${tokens.soft}`}>
        {event.coverImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            <span className="relative text-3xl drop-shadow">{event.coverEmoji}</span>
          </>
        ) : (
          <span className="text-4xl">{event.coverEmoji}</span>
        )}
        <span className="absolute left-3 top-3">
          <EventStatusPill status={event.status} />
        </span>
        <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white/70 text-ink-500 opacity-0 transition-opacity group-hover:opacity-100">
          <MoreHorizontal className="h-4 w-4" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-ink-100 bg-white text-center leading-none">
            <span className="text-[15px] font-bold text-ink-900">{formatDay(event.eventDate)}</span>
            <span className="text-[9px] font-semibold uppercase text-ink-400">{formatMonthShort(event.eventDate)}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15px] font-semibold text-ink-900">{event.name}</h3>
              {plazo && (
                <span
                  className={
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " +
                    (plazo.tono === "hoy"
                      ? "bg-rose-100 text-rose-700"
                      : plazo.tono === "pronto"
                        ? "bg-amber-100 text-amber-800"
                        : plazo.tono === "pasado"
                          ? "bg-ink-100 text-ink-500"
                          : "bg-ink-100 text-ink-600")
                  }
                >
                  {plazo.texto}
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-[13px] text-ink-500">{event.description}</p>
          </div>
        </div>

        {creator && (
          <div className="mb-3 flex items-center gap-2">
            <Avatar name={creator.name} color={creator.color} size="xs" />
            <p className="text-xs text-ink-500">
              Creado por <span className="font-medium text-ink-700">{creator.name}</span>
            </p>
          </div>
        )}

        <div className="mt-auto">
          <div className="mb-1.5 flex items-center justify-between text-xs text-ink-500">
            <span>Progreso general</span>
            <span className="font-semibold text-ink-800">{progress}%</span>
          </div>
          <ProgressBar value={progress} colorClass={tokens.solid} />
          <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-xs text-ink-500">
            <span className="flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" /> {tasks.length} tareas
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> {collaboratorCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
