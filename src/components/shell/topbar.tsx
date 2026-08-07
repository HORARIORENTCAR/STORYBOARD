"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Search, ChevronDown, UserCog, SlidersHorizontal, History, LogOut, Users2, Building2, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";
import { timeAgo, cx } from "@/lib/utils";

export function Topbar() {
  const { currentUser, myNotifications, markAllNotificationsRead } = useApp();
  const notifications = myNotifications; // cada quien ve solo lo suyo
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-ink-100 bg-white/80 px-6 py-3.5 backdrop-blur">
      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          className="input pl-10 pr-16"
          placeholder="Buscar eventos, tareas o personas..."
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-500">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setMenuOpen(false);
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600 transition-colors hover:bg-ink-50"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-ink-100 bg-white p-2 shadow-pop">
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="text-sm font-semibold text-ink-900">Notificaciones</p>
                <button onClick={markAllNotificationsRead} className="text-xs font-medium text-brand-700 hover:underline">
                  Marcar todo leído
                </button>
              </div>
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {notifications.length === 0 && (
                  <p className="px-2 py-6 text-center text-sm text-ink-400">No tienes notificaciones.</p>
                )}
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cx(
                      "rounded-xl px-3 py-2.5 transition-colors hover:bg-ink-50",
                      !n.read && "bg-brand-50/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink-900">{n.title}</p>
                      {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500">{n.detail}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[11px] text-ink-400">{timeAgo(n.createdAt)}</span>
                      <span
                        className={cx(
                          "badge text-[9.5px]",
                          n.audience === "all" ? "bg-ink-100 text-ink-500" : "bg-brand-100 text-brand-700"
                        )}
                      >
                        {n.audience === "all" ? "Todo el personal" : "Para ti"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setMenuOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-ink-50"
          >
            <Avatar name={currentUser?.name ?? ""} color={currentUser?.color} size="sm" />
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-sm font-medium text-ink-900">{currentUser?.name}</p>
              <p className="text-xs text-ink-400">{currentUser?.email}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-ink-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-ink-100 bg-white p-2 shadow-pop">
              <div className="flex items-center gap-3 rounded-xl bg-ink-50 px-3 py-3">
                <Avatar name={currentUser?.name ?? ""} color={currentUser?.color} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">{currentUser?.name}</p>
                  <p className="truncate text-xs text-ink-500">{currentUser?.email}</p>
                  <span className="badge mt-1 bg-brand-100 text-brand-800">
                    <ShieldCheck className="h-3 w-3" /> {currentUser?.role === "admin" ? "Administrador" : "Colaborador"}
                  </span>
                </div>
              </div>
              <div className="my-2 h-px bg-ink-100" />
              <MenuLink href="/perfil" icon={UserCog} title="Mi perfil" subtitle="Nombre, cargo y datos de contacto" />
              <MenuLink href="/configuracion" icon={SlidersHorizontal} title="Preferencias" subtitle="Vista inicial, idioma y apariencia" />
              <MenuLink href="/historial" icon={History} title="Mis notificaciones" subtitle="Alertas por correo y resumen semanal" />
              {currentUser?.role === "admin" && (
                <>
                  <div className="my-2 h-px bg-ink-100" />
                  <MenuLink href="/equipo" icon={Users2} title="Gestionar equipo" subtitle="" />
                  <MenuLink href="/configuracion" icon={Building2} title="Configurar colegio" subtitle="" />
                </>
              )}
              <div className="my-2 h-px bg-ink-100" />
              <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuLink({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <Link href={href} className="flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-ink-50">
      <Icon className="mt-0.5 h-4 w-4 text-ink-500" />
      <div>
        <p className="text-sm font-medium text-ink-900">{title}</p>
        {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
      </div>
    </Link>
  );
}
