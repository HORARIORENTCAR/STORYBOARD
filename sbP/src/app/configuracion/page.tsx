"use client";

import { useState } from "react";
import { Settings, ShieldCheck, Bell, Archive, Building2, Check } from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { useApp } from "@/lib/store";
import { cx, textoDominios } from "@/lib/utils";

const tabs = [
  { key: "general", label: "General", icon: Building2 },
  { key: "roles", label: "Roles y permisos", icon: ShieldCheck },
  { key: "notificaciones", label: "Notificaciones", icon: Bell },
  { key: "datos", label: "Datos y archivo", icon: Archive },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function ConfiguracionPage() {
  const { settings, updateSettings, runArchiveSweep, runDeadlineAlerts, currentUser } = useApp();
  const [tab, setTab] = useState<TabKey>("general");
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);

  if (currentUser?.role !== "admin") {
    return (
      <Shell>
        <div className="card p-10 text-center text-sm text-ink-500">Solo los administradores pueden editar la configuración.</div>
      </Shell>
    );
  }

  function handleSave() {
    updateSettings(draft);
    // Los ajustes se APLICAN, no solo se guardan.
    runArchiveSweep();
    runDeadlineAlerts();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Shell>
      <PageHeader eyebrow="Administración" title="Configuración" description="Controla las reglas, permisos y datos generales de Staff Board." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <div className="card h-fit p-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cx(
                  "flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors",
                  tab === t.key ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-50"
                )}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="card p-6">
          {tab === "general" && (
            <div className="space-y-7">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-xl">🏫</div>
                  <div>
                    <p className="font-semibold text-ink-900">Información institucional</p>
                    <p className="text-sm text-ink-500">Estos datos identifican el espacio de trabajo del colegio.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="label">Nombre de la institución</label>
                    <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Dominios institucionales</label>
                      <input
                        className="input"
                        placeholder="colegio.edu.do, docentes.colegio.edu.do"
                        value={draft.domain}
                        onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
                      />
                      <p className="mt-1 text-xs text-ink-400">
                        Puedes poner varios separados por comas. Si lo dejas vacío, se acepta cualquier correo.
                      </p>
                      <p className="mt-1 text-xs font-medium text-ink-500">
                        Ahora mismo se acepta: {textoDominios(draft.domain)}
                      </p>
                    </div>
                    <div>
                      <label className="label">Año escolar</label>
                      <input className="input" value={draft.schoolYear} onChange={(e) => setDraft({ ...draft, schoolYear: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Zona horaria</label>
                    <select className="input" value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}>
                      <option>Santo Domingo (UTC-4)</option>
                      <option>Ciudad de México (UTC-6)</option>
                      <option>Bogotá (UTC-5)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-ink-100 pt-6">
                <p className="font-semibold text-ink-900">Reglas de inscripción</p>
                <p className="mb-4 text-sm text-ink-500">Define cuánto tiempo puede cambiarse una inscripción.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Tiempo para cancelar</label>
                    <select
                      className="input"
                      value={draft.cancelWindowMinutes}
                      onChange={(e) => setDraft({ ...draft, cancelWindowMinutes: Number(e.target.value) })}
                    >
                      <option value={1}>1 minuto</option>
                      <option value={3}>3 minutos</option>
                      <option value={5}>5 minutos</option>
                      <option value={10}>10 minutos</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Archivar tareas después de</label>
                    <input
                      type="number"
                      className="input"
                      value={draft.archiveAfterDays}
                      onChange={(e) => setDraft({ ...draft, archiveAfterDays: Number(e.target.value) })}
                    />
                    <p className="mt-1 text-xs text-ink-400">Días después del vencimiento. Usa 0 para desactivar.</p>
                  </div>
                </div>
              </div>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-ink-100 px-4 py-3.5">
                <span>
                  <span className="block text-sm font-medium text-ink-800">Exigir evidencia para cerrar una tarea</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                    Nadie podrá marcar una tarea como terminada sin subir una foto o documento del trabajo.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={draft.requireEvidence}
                  onChange={(e) => setDraft({ ...draft, requireEvidence: e.target.checked })}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
                />
              </label>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-ink-100 px-4 py-3.5">
                <span>
                  <span className="block text-sm font-medium text-ink-800">Avisar cuando una fecha límite se acerque</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                    Se notifica al equipo de la tarea cuando faltan 3 días o menos.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={draft.notifyDeadline}
                  onChange={(e) => setDraft({ ...draft, notifyDeadline: e.target.checked })}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
                />
              </label>

              <div className="flex items-center justify-between border-t border-ink-100 pt-5">
                <p className="text-sm text-ink-500">Los cambios se aplicarán a toda la institución.</p>
                <button onClick={handleSave} className="btn-primary">
                  {saved ? <Check className="h-4 w-4" /> : null} Guardar configuración
                </button>
              </div>
            </div>
          )}

          {tab === "roles" && (
            <div className="space-y-4">
              <p className="font-semibold text-ink-900">Permisos por rol</p>
              <RoleRow role="Administrador" perms={["Gestionar usuarios", "Editar y eliminar cualquier evento o tarea", "Configurar el colegio", "Ver historial completo"]} />
              <RoleRow role="Miembro del equipo" perms={["Crear y liderar eventos propios", "Crear tareas en sus eventos", "Inscribirse y colaborar en tareas", "Participar en el chat y subir evidencias"]} />
            </div>
          )}

          {tab === "notificaciones" && (
            <div className="space-y-4">
              <p className="font-semibold text-ink-900">Notificaciones automáticas</p>
              {[
                "Nuevo evento publicado",
                "Cambio en fecha importante",
                "Fecha límite próxima a vencer",
                "Cambio de estado de una tarea",
                "Modificación del calendario institucional",
              ].map((n) => (
                <label key={n} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3">
                  <span className="text-sm text-ink-700">{n}</span>
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500" />
                </label>
              ))}
            </div>
          )}

          {tab === "datos" && (
            <div className="space-y-4">
              <p className="font-semibold text-ink-900">Datos y archivo</p>
              <p className="text-sm text-ink-500">
                Las tareas vencidas se archivan automáticamente después de {draft.archiveAfterDays} días. Puedes exportar el
                historial completo desde la sección Historial.
              </p>
              <div className="rounded-xl border border-dashed border-ink-300 p-6 text-center text-sm text-ink-400">
                <Settings className="mx-auto mb-2 h-6 w-6" />
                Próximamente: exportación completa de datos institucionales.
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function RoleRow({ role, perms }: { role: string; perms: string[] }) {
  return (
    <div className="rounded-xl border border-ink-100 p-4">
      <p className="mb-2 text-sm font-semibold text-ink-900">{role}</p>
      <ul className="space-y-1.5 text-sm text-ink-600">
        {perms.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-brand-600" /> {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
