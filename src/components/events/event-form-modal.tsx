"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useApp } from "@/lib/store";
import { EventColor, EventStatus, SchoolEvent } from "@/lib/types";
import { X, Upload } from "lucide-react";
import { cx } from "@/lib/utils";

const colorOptions: { value: EventColor; hex: string }[] = [
  { value: "brand", hex: "#18854e" },
  { value: "amber", hex: "#d97706" },
  { value: "sky", hex: "#0284c7" },
  { value: "violet", hex: "#7c3aed" },
  { value: "rose", hex: "#e11d48" },
];

const emojiOptions = ["📌", "🎓", "🔬", "🎉", "🇩🇴", "🤝", "🎄", "🎭", "🏕️", "📚", "🏆", "🎨"];

export function EventFormModal({
  open,
  onClose,
  event,
}: {
  open: boolean;
  onClose: () => void;
  event?: SchoolEvent;
}) {
  const { createEvent, updateEvent, uploadFile } = useApp();
  const isEdit = !!event;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<EventStatus>("borrador");
  const [color, setColor] = useState<EventColor>("brand");
  const [emoji, setEmoji] = useState("📌");
  const [coverImage, setCoverImage] = useState<string>("");
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const portadaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(event?.name ?? "");
      setDescription(event?.description ?? "");
      setEventDate(event?.eventDate ?? new Date().toISOString().slice(0, 10));
      setDueDate(event?.dueDate ?? "");
      setStatus(event?.status ?? "borrador");
      setColor(event?.color ?? "brand");
      setEmoji(event?.coverEmoji ?? "📌");
      setCoverImage(event?.coverImage ?? "");
      setAviso("");
    }
  }, [open, event]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (isEdit && event) {
      updateEvent(event.id, { name, description, eventDate, dueDate: dueDate || undefined, status, color, coverEmoji: emoji, coverImage });
    } else {
      createEvent({ name, description, eventDate, dueDate: dueDate || undefined, status, color, coverEmoji: emoji, coverImage });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Nueva iniciativa"
      title={isEdit ? "Editar evento" : "Crear evento"}
      size="md"
    >
      <p className="-mt-4 mb-5 text-sm text-ink-500">La fecha límite se define individualmente dentro de cada tarea.</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Nombre del evento</label>
          <input className="input" placeholder="Ej. Semana de la Familia" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea
            className="input min-h-[90px] resize-none"
            placeholder="Explica brevemente el propósito del evento..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha del evento</label>
            <input type="date" className="input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            <p className="mt-1 text-xs text-ink-400">Día en que se realizará la actividad.</p>
          </div>
          <div>
            <label className="label">Fecha límite (opcional)</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Estado</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}>
              <option value="borrador">Borrador</option>
              <option value="publicado">Publicado</option>
              <option value="finalizado">Finalizado</option>
              <option value="archivado">Archivado</option>
            </select>
          </div>
          <div>
            <label className="label">Color identificador</label>
            <div className="flex items-center gap-2 pt-1">
              {colorOptions.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cx(
                    "h-8 w-8 rounded-full ring-offset-2 transition-all",
                    color === c.value ? "ring-2 ring-ink-800" : "ring-0"
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="label">Imagen de portada (emoji)</label>
          <div className="flex flex-wrap gap-2">
            {emojiOptions.map((em) => (
              <button
                type="button"
                key={em}
                onClick={() => setEmoji(em)}
                className={cx(
                  "flex h-10 w-10 items-center justify-center rounded-xl border text-lg",
                  emoji === em ? "border-brand-500 bg-brand-50" : "border-ink-200 bg-white hover:bg-ink-50"
                )}
              >
                {em}
              </button>
            ))}
          </div>
          <input
            ref={portadaRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setSubiendo(true);
              setAviso("");
              const r = await uploadFile(f, "portadas");
              setSubiendo(false);
              if (typeof r === "string") setAviso(r);
              else setCoverImage(r.url);
            }}
          />

          {coverImage ? (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-ink-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage} alt="Portada del evento" className="h-32 w-full object-cover" />
              <button
                type="button"
                onClick={() => setCoverImage("")}
                aria-label="Quitar imagen de portada"
                className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-rose-600 shadow"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => portadaRef.current?.click()}
              disabled={subiendo}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 px-3 py-3 text-xs text-ink-500 transition-colors hover:border-brand-400 hover:bg-brand-50/50 disabled:opacity-60"
            >
              {subiendo ? (
                <>Subiendo imagen...</>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Subir imagen de portada (opcional)
                </>
              )}
            </button>
          )}
          {aviso && <p className="mt-1.5 text-xs font-medium text-rose-600">{aviso}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-100 pt-5">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            {isEdit ? "Guardar cambios" : "+ Crear evento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
