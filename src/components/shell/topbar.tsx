"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, ChevronDown, ChevronRight, UserCog, History, LogOut, Users2, Building2, ShieldCheck, X, ListChecks, Smartphone } from "lucide-react";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";
import { ChipPruebas } from "@/components/pwa/marca-pruebas";
import { timeAgo, cx } from "@/lib/utils";

export function Topbar() {
  const { currentUser, myNotifications, markAllNotificationsRead, markNotificationRead, logout, searchAll } = useApp();
  const router = useRouter();
  const notifications = myNotifications; // cada quien ve solo lo suyo
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const results = searchAll(query);
  const hasResults = results.events.length + results.tasks.length + results.people.length > 0;

  const cajaNotif = useRef<HTMLDivElement>(null);
  const cajaMenu = useRef<HTMLDivElement>(null);
  const cajaBusca = useRef<HTMLDivElement>(null);

  /* Cerrar los paneles al tocar en cualquier otro sitio, o con Escape.
   *
   * Antes esto lo intentaba una capa invisible a pantalla completa dentro de
   * cada panel, y no funcionaba. El motivo: esta barra lleva un desenfoque de
   * fondo, y en CSS un elemento con desenfoque se convierte en el marco de
   * referencia de sus hijos posicionados. Aquella capa, que se creía del
   * tamaño de la pantalla, en realidad solo cubría la franja de la barra, así
   * que tocar el resto de la aplicación no cerraba nada.
   *
   * Escuchando el toque en el documento entero el problema desaparece, y de
   * paso vale igual para el menú del perfil y el desplegable del buscador.  */
  useEffect(() => {
    if (!notifOpen && !menuOpen && !searchOpen) return;

    const tocoFuera = (caja: React.RefObject<HTMLDivElement>, destino: EventTarget | null) =>
      caja.current !== null && (!(destino instanceof Node) || !caja.current.contains(destino));

    const alTocar = (e: PointerEvent) => {
      if (notifOpen && tocoFuera(cajaNotif, e.target)) setNotifOpen(false);
      if (menuOpen && tocoFuera(cajaMenu, e.target)) setMenuOpen(false);
      if (searchOpen && tocoFuera(cajaBusca, e.target)) setSearchOpen(false);
    };
    const alSoltar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setNotifOpen(false);
      setMenuOpen(false);
      setSearchOpen(false);
    };

    document.addEventListener("pointerdown", alTocar);
    window.addEventListener("keydown", alSoltar);
    return () => {
      document.removeEventListener("pointerdown", alTocar);
      window.removeEventListener("keydown", alSoltar);
    };
  }, [notifOpen, menuOpen, searchOpen]);

  function goTo(href: string) {
    setQuery("");
    setSearchOpen(false);
    router.push(href);
  }
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-ink-100 bg-white/80 px-6 py-3.5 backdrop-blur">
      {/* Solo aparece en la copia de pruebas. Va aquí dentro, ocupando su propio
          hueco, para no taparle el paso a ningún botón. */}
      <ChipPruebas />
      <div ref={cajaBusca} className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          className="input pl-10 pr-9"
          placeholder="Buscar eventos, tareas o personas..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              setSearchOpen(false);
            }
          }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setSearchOpen(false);
            }}
            aria-label="Limpiar búsqueda"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {searchOpen && query.trim().length >= 2 && (
          <>
            <div className="absolute left-0 right-0 z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-ink-100 bg-white p-2 shadow-pop">
              {!hasResults && (
                <p className="px-2 py-6 text-center text-sm text-ink-400">Sin resultados para “{query}”.</p>
              )}

              {results.events.length > 0 && (
                <>
                  <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Eventos</p>
                  {results.events.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => goTo(`/eventos/${e.id}`)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-ink-50"
                    >
                      <span className="text-base">{e.coverEmoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-900">{e.name}</span>
                        <span className="block truncate text-xs text-ink-500">{e.status}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}

              {results.tasks.length > 0 && (
                <>
                  <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Tareas</p>
                  {results.tasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => goTo(`/eventos/${t.eventId}`)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-ink-50"
                    >
                      <ListChecks className="h-4 w-4 shrink-0 text-ink-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-900">{t.name}</span>
                        <span className="block truncate text-xs text-ink-500">Vence {t.dueDate}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}

              {results.people.length > 0 && (
                <>
                  <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Personas</p>
                  {results.people.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => goTo(currentUser?.role === "admin" ? "/equipo" : "/perfil")}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-ink-50"
                    >
                      <Avatar name={u.name} color={u.color} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-900">{u.name}</span>
                        <span className="block truncate text-xs text-ink-500">{u.title ?? u.email}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div ref={cajaNotif} className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setMenuOpen(false);
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600 transition-colors hover:bg-ink-50"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span
                aria-label={`${unread} notificaciones sin leer`}
                className="absolute -right-1.5 -top-1.5 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[12px] font-bold leading-none text-white shadow-md ring-2 ring-white"
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
          {notifOpen && (
            /* En el celular el panel se despega de la campana y se coloca a lo
               ancho con el mismo margen a los dos lados. Anclado a la campana,
               que está pegada al borde derecho, se salía por la izquierda.
               De 640px en adelante vuelve a colgar de la campana. */
            <div className="fixed inset-x-3 top-[76px] z-30 rounded-2xl border border-ink-100 bg-white p-2 shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="text-sm font-semibold text-ink-900">Notificaciones</p>
                <button onClick={markAllNotificationsRead} className="text-xs font-medium text-brand-700 hover:underline">
                  Marcar todo leído
                </button>
              </div>
              <div className="max-h-[60vh] space-y-1 overflow-y-auto sm:max-h-80">
                {notifications.length === 0 && (
                  <p className="px-2 py-6 text-center text-sm text-ink-400">No tienes notificaciones.</p>
                )}
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markNotificationRead(n.id);
                      /* Si el aviso sabe a dónde lleva, se cierra el panel y se
                         va allí. Si no lo sabe —los avisos anteriores a este
                         cambio, o el de algo que se eliminó— solo se marca como
                         leído y el panel se queda abierto. */
                      if (n.link) {
                        setNotifOpen(false);
                        router.push(n.link);
                      }
                    }}
                    title={n.link ? "Ver lo que pasó" : n.read ? "Ya leída" : "Marcar como leída"}
                    className={cx(
                      "w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ink-50",
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
                      {n.link && (
                        <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-brand-700">
                          Ver <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={cajaMenu} className="relative">
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
            <div className="fixed inset-x-3 top-[76px] z-30 max-h-[70vh] overflow-y-auto rounded-2xl border border-ink-100 bg-white p-2 shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-72">
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
              <MenuLink href="/perfil" icon={UserCog} title="Mi perfil" subtitle="Nombre, cargo y área" />
              <MenuLink href="/historial" icon={History} title="Historial de actividad" subtitle="Todo lo que ha pasado en la plataforma" />
              <MenuLink href="/instalar" icon={Smartphone} title="Instalar la app" subtitle="En tu celular o computadora" />
              {currentUser?.role === "admin" && (
                <>
                  <div className="my-2 h-px bg-ink-100" />
                  <MenuLink href="/equipo" icon={Users2} title="Gestionar equipo" subtitle="" />
                  <MenuLink href="/configuracion" icon={Building2} title="Configurar colegio" subtitle="" />
                </>
              )}
              <div className="my-2 h-px bg-ink-100" />
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await logout();
                  router.replace("/login");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
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
