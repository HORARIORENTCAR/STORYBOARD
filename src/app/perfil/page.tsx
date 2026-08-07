"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";

export default function PerfilPage() {
  const { currentUser, users, settings, logHistory } = useApp();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [title, setTitle] = useState(currentUser?.title ?? "");
  const [area, setArea] = useState(currentUser?.area ?? "");
  const [saved, setSaved] = useState(false);

  function save() {
    const u = users.find((x) => x.id === currentUser?.id);
    if (u) {
      u.name = name.trim() || u.name;
      u.title = title.trim();
      u.area = area.trim();
    }
    logHistory("actualizó su perfil", name, "Equipo");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Shell>
      <PageHeader eyebrow="Cuenta" title="Mi perfil" description="Tu información dentro del espacio de trabajo del colegio." />

      <div className="card max-w-2xl p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={currentUser?.name ?? ""} color={currentUser?.color} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight text-ink-900">{currentUser?.name}</p>
            <p className="truncate text-xs text-ink-500">{currentUser?.email}</p>
            <span className="badge mt-1.5 bg-brand-100 text-brand-800">
              <ShieldCheck className="h-3 w-3" /> {currentUser?.role === "admin" ? "Administrador" : "Colaborador"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Nombre completo</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Correo institucional</label>
            <input className="input bg-ink-50 text-ink-500" value={currentUser?.email ?? ""} disabled />
            <p className="mt-1 text-xs text-ink-400">El correo lo asigna la institución ({settings.domain}).</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Cargo</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="label">Área</label>
              <input className="input" value={area} onChange={(e) => setArea(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-ink-100 pt-5">
          <button onClick={save} className="btn-primary w-full sm:w-auto">
            {saved ? <Check className="h-4 w-4" /> : null} {saved ? "Guardado" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </Shell>
  );
}
