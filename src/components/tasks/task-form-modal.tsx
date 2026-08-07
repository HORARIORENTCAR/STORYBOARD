"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useApp } from "@/lib/store";
import { EventColor, EventTask, TaskPriority } from "@/lib/types";
import { cx } from "@/lib/utils";
import { Upload, X } from "lucide-react";

const colorOptions: { value: EventColor; hex: string }[] = [
  { value: "brand", hex: "#18854e" },
  { value: "amber", hex: "#d97706" },
  { value: "sky", hex: "#0284c7" },
  { value: "violet", hex: "#7c3aed" },
  { value: "rose", hex: "#e11d48" },
];

export function TaskFormModal({
  open,
  onClose,
  eventId,
  task,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  task?: EventTask;
}) {
  const { createTask, updateTask, users, uploadFile } = useApp();
  const isEdit = !!task;
  const ocupados = task?.slots.filter((sl) => sl.userId).length ?? 0;
  const [referenceImage, setReferenceImage] = useState<string>("");
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const refImgRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [dueDate, setDueDate] = useState("");
  const [maxCollaborators, setMaxCollaborators] = useState(1);
  const [color, setColor] = useState<EventColor>("brand");
  const [requiresLeader, setRequiresLeader] = useState(false);
  const [leaderId, setLeaderId] = useState<string>("");

  useEffect(() => {
    if (open) {
      setName(task?.name ?? "");
      setDescription(task?.description ?? "");
      setPriority(task?.priority ?? "media");
      setDueDate(task?.dueDate ?? new Date().toISOString().slice(0, 10));
      setMaxCollaborators(task?.maxCollaborators ?? 1);
      setColor(task?.color ?? "brand");
      setReferenceImage(task?.referenceImage ?? "");
      setAviso("");
      setRequiresLeader(task?.requiresLeader ?? false);
      setLeaderId(task?.leaderId ?? "");
    }
  }, [open, task]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (isEdit && task) {
      updateTask(task.id, {
        name,
        description,
        priority,
        dueDate,
        color,
        requiresLeader,
        leaderId: requiresLeader ? leaderId || null : null,
        referenceImage,
        maxCollaborators,
      });
    } else {
      createTask({ eventId, name, description, priority, dueDate, maxCollaborators, color, requiresLeader, leaderId: requiresLeader ? leaderId || null : null, referenceImage });
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} eyebrow="Colaboración" title={isEdit ? "Editar tarea" : "Crear tarea"} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Nombre de la tarea</label>
          <input className="input" placeholder="Ej. Decoración del escenario" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea className="input min-h-[80px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Prioridad</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>
          <div>
            <label className="label">Fecha límite</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Máximo de colaboradores</label>
            <input
              type="number"
              min={1}
              max={30}
              className="input"
              min={Math.max(1, ocupados)}
              value={maxCollaborators}
              onChange={(e) => setMaxCollaborators(Number(e.target.value))}
            />
            {isEdit && ocupados > 0 && (
              <p className="mt-1 text-xs text-ink-400">Hay {ocupados} persona(s) inscrita(s); no puede bajar de ahí.</p>
            )}
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex items-center gap-2 pt-1">
              {colorOptions.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cx("h-8 w-8 rounded-full ring-offset-2", color === c.value ? "ring-2 ring-ink-800" : "")}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="label">Imagen de referencia (opcional)</label>
          <p className="-mt-1 mb-2 text-xs text-ink-400">Una foto de cómo debe quedar el trabajo, para orientar al equipo.</p>
          <input
            ref={refImgRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setSubiendo(true);
              setAviso("");
              const r = await uploadFile(f, "referencias");
              setSubiendo(false);
              if (typeof r === "string") setAviso(r);
              else setReferenceImage(r.url);
            }}
          />
          {referenceImage ? (
            <div className="relative overflow-hidden rounded-xl border border-ink-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={referenceImage} alt="Imagen de referencia" className="h-32 w-full object-cover" />
              <button
                type="button"
                onClick={() => setReferenceImage("")}
                aria-label="Quitar imagen de referencia"
                className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-rose-600 shadow"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => refImgRef.current?.click()}
              disabled={subiendo}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 px-3 py-3 text-xs text-ink-500 transition-colors hover:border-brand-400 hover:bg-brand-50/50 disabled:opacity-60"
            >
              {subiendo ? "Subiendo imagen..." : (<><Upload className="h-4 w-4" /> Subir imagen de referencia</>)}
            </button>
          )}
          {aviso && <p className="mt-1.5 text-xs font-medium text-rose-600">{aviso}</p>}
        </div>

        <div className="rounded-xl border border-ink-200 p-3.5">
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink-800">
            <input type="checkbox" checked={requiresLeader} onChange={(e) => setRequiresLeader(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500" />
            Esta tarea requiere un líder
          </label>
          {requiresLeader && (
            <select className="input mt-3" value={leaderId} onChange={(e) => setLeaderId(e.target.value)}>
              <option value="">Selecciona un líder...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-100 pt-5">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            {isEdit ? "Guardar cambios" : "+ Crear tarea"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
