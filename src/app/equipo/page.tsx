"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { autocorregir } from "@/lib/ortografia";
import { Search, UserPlus, ShieldCheck, MoreHorizontal, KeyRound, Trash2, X, Copy, Download, Pencil, ListChecks, Check, Smartphone } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { Credenciales, useApp } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { correoPermitido, cx, textoDominios } from "@/lib/utils";
import { Role } from "@/lib/types";

export default function EquipoPage() {
  const { users, addUser, updateUserRole, updateUserInfo, settings, currentUser, removeUser, resetUserPassword, liveTasks } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [credenciales, setCredenciales] = useState<Credenciales | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [filtroRol, setFiltroRol] = useState<"todos" | Role>("todos");
  const [filtroArea, setFiltroArea] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "active" | "invited">("todos");
  const [editando, setEditando] = useState<string | null>(null);
  const [edit, setEdit] = useState({ name: "", title: "", area: "" });

  const areas = useMemo(
    () => Array.from(new Set(users.map((u) => u.area).filter(Boolean))).sort() as string[],
    [users]
  );

  /** Cuántas tareas activas lleva cada persona ahora mismo. */
  const cargaPorPersona = useMemo(() => {
    const mapa = new Map<string, number>();
    liveTasks
      .filter((t) => t.status !== "terminada")
      .forEach((t) => {
        t.slots.forEach((sl) => {
          if (sl.userId) mapa.set(sl.userId, (mapa.get(sl.userId) ?? 0) + 1);
        });
      });
    return mapa;
  }, [liveTasks]);

  const filtered = useMemo(
    () =>
      users
        .filter((u) => `${u.name} ${u.email} ${u.title ?? ""} ${u.area ?? ""}`.toLowerCase().includes(query.toLowerCase()))
        .filter((u) => filtroRol === "todos" || u.role === filtroRol)
        .filter((u) => filtroArea === "todas" || u.area === filtroArea)
        .filter((u) => filtroEstado === "todos" || u.status === filtroEstado)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users, query, filtroRol, filtroArea, filtroEstado]
  );

  function exportarCsv() {
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      ["Nombre", "Correo", "Rol", "Cargo", "Área", "Estado", "Tareas activas", "Desde"].join(","),
      ...filtered.map((u) =>
        [
          u.name,
          u.email,
          u.role === "admin" ? "Administrador" : "Miembro",
          u.title ?? "",
          u.area ?? "",
          u.status === "active" ? "Activa" : "Invitada",
          String(cargaPorPersona.get(u.id) ?? 0),
          u.joinedAt,
        ].map(esc).join(",")
      ),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `equipo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const admins = users.filter((u) => u.role === "admin").length;
  const active = users.filter((u) => u.status === "active").length;

  if (currentUser?.role !== "admin") {
    return (
      <Shell>
        <div className="card p-10 text-center text-sm text-ink-500">Solo los administradores pueden gestionar el equipo.</div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="Administración"
        title="Equipo"
        description="Administra cuentas, roles, cargos y acceso del personal."
        actions={
          <button onClick={() => setOpen(true)} className="btn-primary">
            <UserPlus className="h-4 w-4" /> Agregar colaborador
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat label="colaboradores" value={users.length} />
        <MiniStat label="cuentas activas" value={active} />
        <MiniStat label="administradores" value={admins} />
      </div>

      {credenciales && (
        <div className="mb-6 rounded-2xl border-2 border-brand-500 bg-brand-50 p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Datos de acceso</p>
              <p className="text-lg font-bold text-brand-900">Entrégale esto a {credenciales.nombre}</p>
            </div>
            <button
              onClick={() => {
                setCredenciales(null);
                setCopiado(false);
              }}
              aria-label="Cerrar"
              className="rounded-lg p-1 text-brand-700 hover:bg-brand-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-brand-200 bg-white px-4 py-3">
              <p className="text-xs font-medium text-ink-400">Correo</p>
              <p className="mt-0.5 break-all font-mono text-base font-semibold text-ink-900">{credenciales.email}</p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-white px-4 py-3">
              <p className="text-xs font-medium text-ink-400">Contraseña</p>
              <p className="mt-0.5 select-all font-mono text-2xl font-bold tracking-wide text-brand-800">
                {credenciales.password}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={async () => {
                const sitio = typeof window !== "undefined" ? window.location.origin : "";
                const texto = [
                  `Hola ${credenciales.nombre}, ya tienes tu acceso a Staff Board.`,
                  ``,
                  `1) Abre este enlace: ${sitio}/instalar`,
                  `   Ahí te dice, paso a paso, cómo dejar la app instalada en tu`,
                  `   celular y en tu computadora. No se descarga de Google Play`,
                  `   ni de la App Store: se instala desde ese mismo enlace.`,
                  ``,
                  `2) Entra con estos datos:`,
                  `   Correo: ${credenciales.email}`,
                  `   Contraseña: ${credenciales.password}`,
                  ``,
                  `Guarda esta contraseña. Es solo de Staff Board, NO es la de tu`,
                  `correo institucional. Puedes cambiarla luego desde Mi perfil.`,
                ].join("\n");
                try {
                  await navigator.clipboard.writeText(texto);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2500);
                } catch {
                  setNotice("No se pudo copiar. Selecciona el texto y cópialo a mano.");
                }
              }}
              className="btn-primary !py-2 !text-sm"
            >
              <Copy className="h-4 w-4" /> {copiado ? "¡Copiado!" : "Copiar mensaje completo para WhatsApp"}
            </button>
            <Link href="/instalar" className="btn-secondary !py-2 !text-sm">
              <Smartphone className="h-4 w-4" /> Ver la guía de instalación
            </Link>
            <p className="text-xs font-medium text-rose-700">
              Guarda o envía esto ahora. Por seguridad no se vuelve a mostrar.
            </p>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-brand-800">
            El mensaje que se copia ya incluye el enlace de instalación y las instrucciones,
            para que la persona pueda dejar el ícono en su celular sin que tengas que explicárselo.
          </p>
        </div>
      )}

      {notice && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} className="text-brand-700 hover:underline">Cerrar</button>
        </div>
      )}

      <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <span className="mb-1 block text-xs font-medium text-ink-500">Buscar</span>
          <Search className="pointer-events-none absolute left-3.5 top-[34px] h-4 w-4 text-ink-400" />
          <input
            className="input pl-10 !py-1.5 !text-sm"
            placeholder="Nombre, correo, cargo o área..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <label className="min-w-[130px]">
          <span className="mb-1 block text-xs font-medium text-ink-500">Rol</span>
          <select className="input !py-1.5 !text-sm" value={filtroRol} onChange={(e) => setFiltroRol(e.target.value as typeof filtroRol)}>
            <option value="todos">Todos</option>
            <option value="admin">Administradores</option>
            <option value="member">Miembros</option>
          </select>
        </label>

        <label className="min-w-[130px]">
          <span className="mb-1 block text-xs font-medium text-ink-500">Área</span>
          <select className="input !py-1.5 !text-sm" value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
            <option value="todas">Todas</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        <label className="min-w-[130px]">
          <span className="mb-1 block text-xs font-medium text-ink-500">Estado</span>
          <select className="input !py-1.5 !text-sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}>
            <option value="todos">Todos</option>
            <option value="active">Cuentas activas</option>
            <option value="invited">Invitadas</option>
          </select>
        </label>

        <button onClick={exportarCsv} className="btn-secondary self-center !py-1.5 !text-xs">
          <Download className="h-3.5 w-3.5" /> Exportar
        </button>

        <span className="self-center text-xs text-ink-400">
          {filtered.length} de {users.length}
        </span>
      </div>

      <div className="card divide-y divide-ink-100">
        {filtered.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-ink-400">
            Nadie coincide con la búsqueda o los filtros aplicados.
          </p>
        )}
        {filtered.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex min-w-[260px] flex-1 items-center gap-3">
              <Avatar name={u.name} color={u.color} />
              {editando === u.id ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const err = await updateUserInfo(u.id, {
                      name: edit.name.trim() || u.name,
                      title: edit.title.trim(),
                      area: edit.area.trim(),
                    });
                    if (err) setNotice(err);
                    setEditando(null);
                  }}
                  className="flex flex-1 flex-wrap items-center gap-2"
                >
                  <input
                    className="input !w-40 !py-1 !text-sm"
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: autocorregir(e.target.value) })}
                    placeholder="Nombre"
                  />
                  <input
                    className="input !w-44 !py-1 !text-sm"
                    value={edit.title}
                    onChange={(e) => setEdit({ ...edit, title: autocorregir(e.target.value) })}
                    placeholder="Cargo"
                  />
                  <input
                    className="input !w-36 !py-1 !text-sm"
                    value={edit.area}
                    onChange={(e) => setEdit({ ...edit, area: autocorregir(e.target.value) })}
                    placeholder="Área"
                  />
                  <button type="submit" className="btn-primary !px-2.5 !py-1 !text-xs" title="Guardar">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => setEditando(null)} className="btn-secondary !px-2.5 !py-1 !text-xs">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </form>
              ) : (
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
                    {u.name}
                    {u.id === currentUser?.id && <span className="badge bg-ink-100 text-ink-500">Tu cuenta</span>}
                    <button
                      onClick={() => {
                        setEdit({ name: u.name, title: u.title ?? "", area: u.area ?? "" });
                        setEditando(u.id);
                      }}
                      title="Editar nombre, cargo y área"
                      className="text-ink-300 hover:text-brand-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </p>
                  <p className="truncate text-xs text-ink-500">{u.email}</p>
                  <p className="truncate text-xs text-ink-400">
                    {u.title ?? "Colaborador"} {u.area ? `· ${u.area}` : ""}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <select
                value={u.role}
                disabled={u.role === "admin" && (u.id === currentUser?.id || admins <= 1)}
                title={
                  u.role === "admin" && u.id === currentUser?.id
                    ? "No puedes quitarte a ti mismo el rol de administrador"
                    : u.role === "admin" && admins <= 1
                    ? "Debe quedar al menos un administrador"
                    : "Cambiar rol"
                }
                onChange={async (e) => {
                  const err = await updateUserRole(u.id, e.target.value as Role);
                  if (err) setNotice(err);
                }}
                className={cx(
                  "rounded-full border-0 px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60",
                  u.role === "admin" ? "bg-violet-100 text-violet-800" : "bg-ink-100 text-ink-700"
                )}
              >
                <option value="admin">Administrador</option>
                <option value="member">Miembro</option>
              </select>
              <span
                title="Tareas activas asignadas"
                className={cx(
                  "badge",
                  (cargaPorPersona.get(u.id) ?? 0) === 0
                    ? "bg-ink-100 text-ink-500"
                    : (cargaPorPersona.get(u.id) ?? 0) >= 4
                    ? "bg-amber-100 text-amber-800"
                    : "bg-sky-100 text-sky-800"
                )}
              >
                <ListChecks className="h-3 w-3" /> {cargaPorPersona.get(u.id) ?? 0} tareas
              </span>
              <span
                className={cx(
                  "badge",
                  u.status === "active" ? "bg-brand-100 text-brand-800" : "bg-amber-100 text-amber-800"
                )}
              >
                <ShieldCheck className="h-3 w-3" /> {u.status === "active" ? "Activa" : "Invitada"}
              </span>
              <span className="text-xs text-ink-400">{u.joinedAt}</span>
              <div className="relative">
                <button
                  onClick={() => setMenuFor(menuFor === u.id ? null : u.id)}
                  aria-label={`Acciones para ${u.name}`}
                  className="text-ink-400 hover:text-ink-700"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menuFor === u.id && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} />
                    <div className="absolute right-0 z-30 mt-2 w-60 rounded-2xl border border-ink-100 bg-white p-2 shadow-pop">
                      <button
                        onClick={async () => {
                          setMenuFor(null);
                          if (!window.confirm(`¿Generar una contraseña nueva para ${u.name}? La anterior dejará de servir.`)) return;
                          const r = await resetUserPassword(u.id);
                          if (r.error) setNotice(r.error);
                          else if (r.credenciales) setCredenciales(r.credenciales);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                      >
                        <KeyRound className="h-4 w-4 text-ink-400" />
                        Generar contraseña nueva
                      </button>
                      <div className="my-1 h-px bg-ink-100" />
                      <button
                        disabled={u.id === currentUser?.id || (u.role === "admin" && admins <= 1)}
                        onClick={async () => {
                          setMenuFor(null);
                          if (!window.confirm(`¿Eliminar a ${u.name} del equipo? Sus eventos pasarán a tu cuenta.`)) return;
                          const err = await removeUser(u.id);
                          setNotice(err ? err : `${u.name} fue eliminado del equipo.`);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-ink-300 disabled:hover:bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar del equipo
                      </button>
                      {u.id === currentUser?.id && (
                        <p className="px-3 pb-1 pt-0.5 text-[11px] text-ink-400">No puedes eliminarte a ti mismo.</p>
                      )}
                      {u.role === "admin" && admins <= 1 && u.id !== currentUser?.id && (
                        <p className="px-3 pb-1 pt-0.5 text-[11px] text-ink-400">Es el único administrador.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddMemberModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={addUser}
        onCreada={(c) => setCredenciales(c)}
        domain={settings.domain}
        existing={users.map((u) => u.email.toLowerCase())}
      />
    </Shell>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card flex items-center gap-3 px-5 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xl font-bold text-ink-900">{value}</p>
        <p className="text-xs text-ink-500">{label}</p>
      </div>
    </div>
  );
}

function AddMemberModal({
  open,
  onClose,
  onSave,
  onCreada,
  domain,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; email: string; role: Role; title?: string }) => Promise<{ error?: string; credenciales?: Credenciales }>;
  onCreada: (c: Credenciales) => void;
  domain: string;
  existing: string[];
}) {
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  return (
    <Modal open={open} onClose={onClose} eyebrow="Equipo" title="Agregar colaborador" size="sm">
      <div className="-mt-3 mb-4 rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-2.5 text-xs leading-relaxed text-ink-600">
        Staff Board le creará una contraseña propia y te la mostrará en pantalla para que se la
        entregues. <strong>No usa la contraseña de su correo institucional.</strong>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.target as HTMLFormElement);
          const email = String(data.get("email") || "").trim();
          // El acceso es exclusivamente con correo institucional.
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            setError("Escribe un correo válido.");
            return;
          }
          if (!correoPermitido(email, domain)) {
            setError(`El correo debe pertenecer a ${textoDominios(domain)}.`);
            return;
          }
          if (existing.includes(email.toLowerCase())) {
            setError("Ya existe una cuenta con ese correo.");
            return;
          }
          setError("");
          setSending(true);
          const r = await onSave({
            name: String(data.get("name") || ""),
            email,
            role: (data.get("role") as Role) || "member",
            title: String(data.get("title") || ""),
          });
          setSending(false);
          if (r.error) {
            setError(r.error);
            return;
          }
          if (r.credenciales) onCreada(r.credenciales);
          (e.target as HTMLFormElement).reset();
          onClose();
        }}
        className="space-y-4"
      >
        <div>
          <label className="label">Nombre completo</label>
          <input name="name" className="input" required />
        </div>
        <div>
          <label className="label">Correo institucional</label>
          <input name="email" type="email" className="input" placeholder={`nombre@${(domain || "correo.com").split(/[,;\s]+/)[0].replace(/^@/, "")}`} required />
          <p className="mt-1 text-xs text-ink-400">Se acepta {textoDominios(domain)}.</p>
          {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Cargo</label>
            <input name="title" className="input" placeholder="Ej. Docente de Música" />
          </div>
          <div>
            <label className="label">Rol</label>
            <select name="role" className="input" defaultValue="member">
              <option value="member">Miembro del equipo</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? "Creando cuenta..." : "+ Crear cuenta"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
