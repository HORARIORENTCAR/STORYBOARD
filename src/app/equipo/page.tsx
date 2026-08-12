"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus, ShieldCheck, MoreHorizontal, KeyRound, Trash2, X, Copy } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { Credenciales, useApp } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { correoPermitido, cx, textoDominios } from "@/lib/utils";
import { Role } from "@/lib/types";

export default function EquipoPage() {
  const { users, addUser, updateUserRole, settings, currentUser, removeUser, resetUserPassword } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [credenciales, setCredenciales] = useState<Credenciales | null>(null);
  const [copiado, setCopiado] = useState(false);

  const filtered = useMemo(
    () => users.filter((u) => `${u.name} ${u.email} ${u.title ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    [users, query]
  );

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
                const texto = `Acceso a Staff Board\nSitio: ${typeof window !== "undefined" ? window.location.origin : ""}\nCorreo: ${credenciales.email}\nContraseña: ${credenciales.password}`;
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
              <Copy className="h-4 w-4" /> {copiado ? "¡Copiado!" : "Copiar para enviar por WhatsApp"}
            </button>
            <p className="text-xs font-medium text-rose-700">
              Guarda o envía esto ahora. Por seguridad no se vuelve a mostrar.
            </p>
          </div>
        </div>
      )}

      {notice && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} className="text-brand-700 hover:underline">Cerrar</button>
        </div>
      )}

      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input className="input pl-10" placeholder="Buscar por nombre, correo, cargo o área..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="card divide-y divide-ink-100">
        {filtered.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <Avatar name={u.name} color={u.color} />
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  {u.name}
                  {u.id === currentUser?.id && <span className="badge bg-ink-100 text-ink-500">Tu cuenta</span>}
                </p>
                <p className="text-xs text-ink-500">{u.email}</p>
                <p className="text-xs text-ink-400">
                  {u.title ?? "Colaborador"} {u.area ? `· ${u.area}` : ""}
                </p>
              </div>
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
              <span className="badge bg-brand-100 text-brand-800">
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
