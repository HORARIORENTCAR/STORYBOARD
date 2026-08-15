"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Globe, CalendarDays, Calendar, MoreHorizontal,
  History, UserCog, Eye, Users, Settings, LogOut, X, ClipboardList,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { cx } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

/** Barra inferior + hoja "Más". Sin esto la app es inusable en un celular. */
export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAdmin, events, logout } = useApp();
  const [sheet, setSheet] = useState(false);

  /* Los mismos cuatro destinos que en la computadora, con los mismos nombres.
     Antes esta barra llamaba "Agenda" al calendario, que en el menú de
     escritorio se llamaba "Calendario": dos nombres para el mismo sitio. */
  const secondary = ["/historial", "/perfil", "/todos", "/equipo", "/configuracion"];
  const tabs = [
    { href: "/", label: "Muro", icon: Globe },
    { href: "/eventos", label: "Eventos", icon: CalendarDays, count: events.filter((e) => e.status === "publicado").length },
    { href: "/calendario", label: "Calendario", icon: Calendar },
    { href: "/pizarra", label: "La Pizarra", icon: ClipboardList },
  ];

  const sheetItem = (href: string, Icon: React.ComponentType<{ className?: string }>, label: string) => (
    <button
      key={href}
      onClick={() => { setSheet(false); router.push(href); }}
      className={cx(
        "flex w-full items-center gap-3.5 rounded-xl px-3 py-3.5 text-left text-[15px] font-medium",
        pathname === href ? "bg-brand-50 text-brand-800" : "text-ink-800 active:bg-ink-50"
      )}
    >
      <Icon className={cx("h-5 w-5", pathname === href ? "text-brand-700" : "text-ink-500")} />
      {label}
    </button>
  );

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto flex max-w-2xl items-stretch justify-around">
          {tabs.map((t) => {
            const active = pathname === t.href;
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cx(
                  "relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 pb-1 pt-2 text-[10px] font-semibold",
                  active ? "text-brand-700" : "text-ink-400"
                )}
              >
                {active && <span className="absolute top-0 h-[3px] w-6 rounded-b bg-brand-600" />}
                <span className="relative">
                  <Icon className="h-[21px] w-[21px]" />
                  {!!t.count && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                      {t.count > 9 ? "9+" : t.count}
                    </span>
                  )}
                </span>
                {t.label}
              </Link>
            );
          })}
          <button
            onClick={() => setSheet(true)}
            className={cx(
              "relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 pb-1 pt-2 text-[10px] font-semibold",
              secondary.includes(pathname) ? "text-brand-700" : "text-ink-400"
            )}
          >
            {secondary.includes(pathname) && <span className="absolute top-0 h-[3px] w-6 rounded-b bg-brand-600" />}
            <MoreHorizontal className="h-[21px] w-[21px]" />
            Más
          </button>
        </div>
      </nav>

      {sheet && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-ink-950/50 backdrop-blur-sm lg:hidden"
          onClick={(e) => { if (e.target === e.currentTarget) setSheet(false); }}
        >
          <div
            className="max-h-[82vh] w-full overflow-y-auto rounded-t-3xl bg-white px-3 pt-2"
            style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mx-auto mb-3 mt-2 h-1 w-9 rounded-full bg-ink-200" />
            <div className="flex items-center gap-3 px-3 pb-3.5">
              <Avatar name={currentUser?.name ?? ""} color={currentUser?.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink-900">{currentUser?.name}</p>
                <p className="truncate text-xs text-ink-500">
                  {isAdmin ? "Administrador" : currentUser?.title}
                </p>
              </div>
              <button onClick={() => setSheet(false)} className="rounded-xl border border-ink-200 p-2 text-ink-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-2 h-px bg-ink-100" />
            {sheetItem("/perfil", UserCog, "Mi perfil")}
            {sheetItem("/historial", History, "Historial de actividad")}

            {isAdmin && (
              <>
                <div className="my-2 h-px bg-ink-100" />
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                  Administración
                </p>
                {sheetItem("/todos", Eye, "Todos los eventos")}
                {sheetItem("/equipo", Users, "Equipo")}
                {sheetItem("/configuracion", Settings, "Configuración")}
              </>
            )}

            <div className="my-2 h-px bg-ink-100" />
            <button
              onClick={async () => {
                setSheet(false);
                await logout();
                router.replace("/login");
              }}
              className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3.5 text-left text-[15px] font-medium text-rose-600 active:bg-rose-50"
            >
              <LogOut className="h-5 w-5" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  );
}
