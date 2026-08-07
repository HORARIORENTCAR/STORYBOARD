"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  CalendarDays,
  FolderOpen,
  ListChecks,
  Calendar,
  ClipboardCheck,
  History,
  Users,
  Settings,
  Sparkles,
  Lightbulb,
  Eye,, ChevronRight } from "lucide-react";
import { cx } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";

const workspaceNav = [
  { href: "/", label: "Muro", icon: LayoutGrid },
  { href: "/eventos", label: "Eventos", icon: CalendarDays, countKey: "events" as const },
  { href: "/espacio", label: "Mi espacio", icon: FolderOpen },
  { href: "/tareas", label: "Mis tareas", icon: ListChecks, countKey: "tasks" as const },
  { href: "/calendario", label: "Calendario", icon: Calendar },
  { href: "/agenda", label: "Mi agenda", icon: ClipboardCheck },
  { href: "/historial", label: "Historial", icon: History },
];

const adminNav = [
  { href: "/todos", label: "Todos los eventos", icon: Eye },
  { href: "/equipo", label: "Equipo", icon: Users },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { events, tasks, currentUser, settings } = useApp();

  const publishedEvents = events.filter((e) => e.status === "publicado").length;
  const pendingTasks = tasks.filter((t) => t.status !== "terminada").length;

  const counts: Record<string, number> = {
    events: publishedEvents,
    tasks: pendingTasks,
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col bg-ink-950 text-white lg:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-pop">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold">Staff Board</p>
          <p className="text-[11px] uppercase tracking-wide text-ink-400">{settings.name}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
        <div>
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Espacio de trabajo
          </p>
          <ul className="space-y-1">
            {workspaceNav.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              const count = item.countKey ? counts[item.countKey] : undefined;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cx(
                      "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "bg-brand-700/90 text-white shadow-sm" : "text-ink-200 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                      {item.label}
                    </span>
                    {typeof count === "number" && count > 0 && (
                      <span
                        className={cx(
                          "min-w-[22px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold",
                          active ? "bg-white/20 text-white" : "bg-white/10 text-ink-200"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {currentUser?.role === "admin" && (
          <div>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Administración
            </p>
            <ul className="space-y-1">
              {adminNav.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cx(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        active ? "bg-brand-700/90 text-white shadow-sm" : "text-ink-200 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.03] p-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/20">
            <Lightbulb className="h-4 w-4 text-amber-300" />
          </div>
          <p className="text-sm font-semibold text-white">La pizarra es de todos</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-300">
            Propón ideas, toma una tarea y hagamos equipo.
          </p>
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <Link
          href="/perfil"
          title="Ver y editar mi perfil"
          className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
        >
          <Avatar name={currentUser?.name ?? ""} color={currentUser?.color} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{currentUser?.name}</p>
            <p className="truncate text-xs text-ink-400">
              {currentUser?.role === "admin" ? "Administrador" : currentUser?.title ?? "Colaborador"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" />
        </Link>
      </div>
    </aside>
  );
}
