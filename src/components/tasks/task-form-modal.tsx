"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useApp } from "@/lib/store";
import { EventColor, EventTask, TaskPriority } from "@/lib/types";
import { cx } from "@/lib/utils";

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
  const { createTask, updateTask, users } = useApp();
  const isEdit = !!task;

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
      });
    } else {
      createTask({ eventId, name, description, priority, dueDate, maxCollaborators, color, requiresLeader, leaderId: requiresLeader ? leaderId || null : null });
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
              value={maxCollaborators}
              disabled={isEdit}
              onChange={(e) => setMaxCollaborators(Number(e.target.value))}
            />
            {isEdit && <p className="mt-1 text-xs text-ink-400">No se puede cambiar una vez creada la tarea.</p>}
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
