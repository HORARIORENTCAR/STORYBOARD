"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus, ShieldCheck, MoreHorizontal } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { cx } from "@/lib/utils";
import { Role } from "@/lib/types";

export default function EquipoPage() {
  const { users, addUser, updateUserRole, settings, currentUser } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

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
                onChange={(e) => updateUserRole(u.id, e.target.value as Role)}
                className={cx(
                  "rounded-full border-0 px-3 py-1 text-xs font-semibold",
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
              <button className="text-ink-400 hover:text-ink-700">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AddMemberModal open={open} onClose={() => setOpen(false)} onSave={addUser} domain={settings.domain} existing={users.map((u) => u.email.toLowerCase())} />
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
  domain,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; email: string; role: Role; title?: string }) => Promise<string | void>;
  domain: string;
  existing: string[];
}) {
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  return (
    <Modal open={open} onClose={onClose} eyebrow="Equipo" title="Agregar colaborador" size="sm">
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
          if (!email.toLowerCase().endsWith("@" + domain.toLowerCase())) {
            setError(`El correo debe terminar en @${domain}.`);
            return;
          }
          if (existing.includes(email.toLowerCase())) {
            setError("Ya existe una cuenta con ese correo.");
            return;
          }
          setError("");
          setSending(true);
          const err = await onSave({
            name: String(data.get("name") || ""),
            email,
            role: (data.get("role") as Role) || "member",
            title: String(data.get("title") || ""),
          });
          setSending(false);
          if (err) {
            setError(err);
            return;
          }
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
          <input name="email" type="email" className="input" placeholder={`nombre@${domain}`} required />
          <p className="mt-1 text-xs text-ink-400">Debe pertenecer al dominio {domain}.</p>
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
            {sending ? "Enviando invitación..." : "+ Invitar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
