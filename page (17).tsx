"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Check,
  Lock,
  Trash2,
  Pencil,
  X,
  ClipboardList,
  Wallet,
  UserPlus,
  RotateCcw,
} from "lucide-react";
import { Shell } from "@/components/shell/shell";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { useApp } from "@/lib/store";
import { autocorregir } from "@/lib/ortografia";
import { cx, formatFullDate } from "@/lib/utils";
import { Pizarra, PizarraFila } from "@/lib/types";
import { ProgressBar } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";

/**
 * Pizarra de asignaciones.
 *
 * Es la hoja que estaba pegada en la pared: una pizarra por actividad, con los
 * quince cursos y lo que le toca a cada uno. Se organizó así:
 *
 *  · Arriba, las pizarras abiertas. Debajo, las cerradas.
 *  · Cada curso es una tarjeta, no una fila de tabla: en el celular una tabla
 *    de cuatro columnas es ilegible, y aquí lo importante es leer de un vistazo
 *    qué le toca a cada curso.
 *  · Los cursos que ya tienen asignación se ven primero; los vacíos quedan
 *    apagados abajo, como los renglones en blanco de la hoja.
 *  · El tache lo puede poner cualquiera, porque quien hace el mandado es quien
 *    sabe que ya está hecho. Escribir la asignación, solo la administración.
 */
export default function PizarraPage() {
  const {
    pizarras,
    isAdmin,
    currentUser,
    userById,
    crearPizarra,
    guardarFilaPizarra,
    marcarFilaPizarra,
    cambiarEstadoPizarra,
    eliminarPizarra,
  } = useApp();

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [filaEditando, setFilaEditando] = useState<PizarraFila | null>(null);
  const [borrador, setBorrador] = useState({ title: "", date: "", session: "", notes: "" });
  const [edicion, setEdicion] = useState({ asignacion: "", presupuesto: "", ayudante: "" });

  const abiertas = useMemo(() => pizarras.filter((p) => p.status === "abierta"), [pizarras]);
  const cerradas = useMemo(() => pizarras.filter((p) => p.status === "cerrada"), [pizarras]);

  async function crear() {
    setGuardando(true);
    setAviso("");
    const err = await crearPizarra(borrador);
    setGuardando(false);
    if (err) {
      setAviso(err);
      return;
    }
    setBorrador({ title: "", date: "", session: "", notes: "" });
    setCrearAbierto(false);
  }

  function abrirEdicion(fila: PizarraFila) {
    setFilaEditando(fila);
    setEdicion({
      asignacion: fila.asignacion ?? "",
      presupuesto: fila.presupuesto ?? "",
      ayudante: fila.ayudante ?? "",
    });
  }

  async function guardarEdicion() {
    if (!filaEditando) return;
    setGuardando(true);
    setAviso("");
    const err = await guardarFilaPizarra(filaEditando.id, edicion);
    setGuardando(false);
    if (err) {
      setAviso(err);
      return;
    }
    setFilaEditando(null);
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="Asignaciones por curso"
        title="Pizarra"
        description="Lo que le toca a cada curso en cada actividad, en un solo lugar."
        actions={
          isAdmin ? (
            <button onClick={() => setCrearAbierto(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Nueva pizarra
            </button>
          ) : null
        }
      />

      {aviso && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{aviso}</span>
          <button onClick={() => setAviso("")} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {pizarras.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="mb-3 h-8 w-8 text-ink-300" />
          <p className="text-sm font-medium text-ink-700">Todavía no hay ninguna pizarra</p>
          <p className="mt-1 max-w-md text-sm text-ink-500">
            Una pizarra es una actividad con lo que le toca a cada curso: quién compra qué, con
            cuál cuenta y quién ayuda.
            {isAdmin ? " Créala con el botón de arriba." : " La administración creará la primera."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {abiertas.map((p) => (
            <TarjetaPizarra
              key={p.id}
              pizarra={p}
              isAdmin={isAdmin}
              esMia={p.createdBy === currentUser?.id}
              userById={userById}
              onEditarFila={abrirEdicion}
              onMarcar={async (fila, hecho) => {
                const err = await marcarFilaPizarra(fila.id, hecho);
                if (err) setAviso(err);
              }}
              onCambiarEstado={async (estado) => {
                const err = await cambiarEstadoPizarra(p.id, estado);
                if (err) setAviso(err);
              }}
              onEliminar={async () => {
                if (!window.confirm(`¿Eliminar la pizarra "${p.title}"? Se borra con todos sus cursos.`)) return;
                const err = await eliminarPizarra(p.id);
                if (err) setAviso(err);
              }}
            />
          ))}

          {cerradas.length > 0 && (
            <div>
              <p className="section-eyebrow mb-3">Pizarras cerradas</p>
              <div className="space-y-8">
                {cerradas.map((p) => (
                  <TarjetaPizarra
                    key={p.id}
                    pizarra={p}
                    isAdmin={isAdmin}
                    esMia={p.createdBy === currentUser?.id}
                    userById={userById}
                    onEditarFila={abrirEdicion}
                    onMarcar={async (fila, hecho) => {
                      const err = await marcarFilaPizarra(fila.id, hecho);
                      if (err) setAviso(err);
                    }}
                    onCambiarEstado={async (estado) => {
                      const err = await cambiarEstadoPizarra(p.id, estado);
                      if (err) setAviso(err);
                    }}
                    onEliminar={async () => {
                      if (!window.confirm(`¿Eliminar la pizarra "${p.title}"?`)) return;
                      const err = await eliminarPizarra(p.id);
                      if (err) setAviso(err);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Crear una pizarra nueva ---- */}
      <Modal
        open={crearAbierto}
        onClose={() => setCrearAbierto(false)}
        eyebrow="Pizarra"
        title="Nueva pizarra de asignaciones"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-500">
            Se crearán automáticamente los quince cursos del colegio. Después escribes lo que le
            toca a cada uno; los que dejes en blanco simplemente no participan.
          </p>
          <div>
            <label className="label">Nombre de la asignación</label>
            <input
              className="input"
              placeholder="Acto de Navidad, Feria de ciencias, Día del maestro..."
              value={borrador.title}
              onChange={(e) => setBorrador({ ...borrador, title: autocorregir(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Fecha</label>
              <input
                type="date"
                className="input"
                value={borrador.date}
                onChange={(e) => setBorrador({ ...borrador, date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Sesión</label>
              <input
                className="input"
                placeholder="Mañana, tarde, primera sesión..."
                value={borrador.session}
                onChange={(e) => setBorrador({ ...borrador, session: autocorregir(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="label">Notas para todo el equipo (opcional)</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="Instrucciones generales, hora de entrega, dónde llevar las cosas..."
              value={borrador.notes}
              onChange={(e) => setBorrador({ ...borrador, notes: autocorregir(e.target.value) })}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
            <button onClick={() => setCrearAbierto(false)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={crear} disabled={guardando || !borrador.title.trim()} className="btn-primary">
              {guardando ? "Creando..." : "Crear pizarra"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ---- Escribir la asignación de un curso ---- */}
      <Modal
        open={!!filaEditando}
        onClose={() => setFilaEditando(null)}
        eyebrow="Asignación"
        title={filaEditando?.curso ?? ""}
      >
        <div className="space-y-4">
          <div>
            <label className="label">¿Qué le toca a este curso?</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="Comprar refresco, decorar el pasillo, traer el sonido..."
              value={edicion.asignacion}
              onChange={(e) => setEdicion({ ...edicion, asignacion: autocorregir(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Cuenta o presupuesto</label>
              <input
                className="input"
                placeholder="0229.23"
                value={edicion.presupuesto}
                onChange={(e) => setEdicion({ ...edicion, presupuesto: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Ayudante o colaborador</label>
              <input
                className="input"
                placeholder="Ana"
                value={edicion.ayudante}
                onChange={(e) => setEdicion({ ...edicion, ayudante: autocorregir(e.target.value) })}
              />
            </div>
          </div>
          <p className="text-xs text-ink-400">
            Deja la asignación en blanco si este curso no participa en esta actividad.
          </p>
          <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
            <button onClick={() => setFilaEditando(null)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={guardarEdicion} disabled={guardando} className="btn-primary">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}

/* ====================================================================== */

function TarjetaPizarra({
  pizarra,
  isAdmin,
  esMia,
  userById,
  onEditarFila,
  onMarcar,
  onCambiarEstado,
  onEliminar,
}: {
  pizarra: Pizarra;
  isAdmin: boolean;
  esMia: boolean;
  userById: (id: string) => { name: string; color?: string } | undefined;
  onEditarFila: (fila: PizarraFila) => void;
  onMarcar: (fila: PizarraFila, hecho: boolean) => void;
  onCambiarEstado: (estado: "abierta" | "cerrada") => void;
  onEliminar: () => void;
}) {
  const puedeEscribir = (isAdmin || esMia) && pizarra.status === "abierta";
  const cerrada = pizarra.status === "cerrada";

  /* Los cursos con algo asignado van primero; los vacíos, apagados al final. */
  const conAsignacion = pizarra.filas.filter((f) => (f.asignacion ?? "").trim().length > 0);
  const sinAsignacion = pizarra.filas.filter((f) => !(f.asignacion ?? "").trim());
  const hechas = conAsignacion.filter((f) => f.hecho).length;
  const progreso = conAsignacion.length === 0 ? 0 : Math.round((hechas / conAsignacion.length) * 100);

  return (
    <div className={cx("card overflow-hidden", cerrada && "opacity-90")}>
      <div className="border-b border-ink-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-ink-900">{pizarra.title}</h2>
              {cerrada && (
                <span className="badge bg-ink-100 text-ink-600">
                  <Lock className="h-3 w-3" /> Cerrada
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-ink-500">
              {pizarra.date ? formatFullDate(pizarra.date) : "Sin fecha"}
              {pizarra.session ? ` · ${pizarra.session}` : ""}
            </p>
            {pizarra.notes && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">{pizarra.notes}</p>
            )}
          </div>

          {(isAdmin || esMia) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {cerrada ? (
                <button onClick={() => onCambiarEstado("abierta")} className="btn-secondary !py-2 !text-sm">
                  <RotateCcw className="h-4 w-4" /> Reabrir
                </button>
              ) : (
                <button onClick={() => onCambiarEstado("cerrada")} className="btn-secondary !py-2 !text-sm">
                  <Lock className="h-4 w-4" /> Cerrar
                </button>
              )}
              <button onClick={onEliminar} className="btn-secondary !py-2 !text-sm text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {conAsignacion.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-ink-700">
                {hechas} de {conAsignacion.length} {conAsignacion.length === 1 ? "curso listo" : "cursos listos"}
              </span>
              <span className="font-semibold text-ink-900">{progreso}%</span>
            </div>
            <ProgressBar value={progreso} colorClass="bg-brand-600" />
          </div>
        )}
      </div>

      <div className="divide-y divide-ink-100">
        {conAsignacion.map((fila) => {
          const quien = fila.hechoPor ? userById(fila.hechoPor) : undefined;
          return (
            <div key={fila.id} className="flex items-start gap-3 px-5 py-4">
              <button
                onClick={() => onMarcar(fila, !fila.hecho)}
                disabled={cerrada}
                aria-label={fila.hecho ? "Marcar como pendiente" : "Marcar como hecho"}
                title={cerrada ? "La pizarra está cerrada" : fila.hecho ? "Marcar como pendiente" : "Marcar como hecho"}
                className={cx(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                  fila.hecho
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-ink-300 hover:border-brand-500",
                  cerrada && "cursor-not-allowed opacity-60"
                )}
              >
                {fila.hecho && <Check className="h-4 w-4" />}
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-900">{fila.curso}</p>
                <p className={cx("mt-0.5 text-sm", fila.hecho ? "text-ink-400 line-through" : "text-ink-700")}>
                  {fila.asignacion}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                  {fila.presupuesto && (
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" /> {fila.presupuesto}
                    </span>
                  )}
                  {fila.ayudante && (
                    <span className="flex items-center gap-1">
                      <UserPlus className="h-3.5 w-3.5" /> {fila.ayudante}
                    </span>
                  )}
                  {fila.hecho && quien && (
                    <span className="flex items-center gap-1 font-medium text-brand-700">
                      <Avatar name={quien.name} color={quien.color} size="xs" /> Lo marcó {quien.name}
                    </span>
                  )}
                </div>
              </div>

              {puedeEscribir && (
                <button
                  onClick={() => onEditarFila(fila)}
                  aria-label={`Editar la asignación de ${fila.curso}`}
                  className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}

        {/* Cursos sin asignación: presentes pero discretos, como los renglones
            en blanco de la hoja. Solo quien administra los puede rellenar. */}
        {sinAsignacion.length > 0 && (
          <div className="bg-ink-50/60 px-5 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Sin asignación en esta pizarra ({sinAsignacion.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {sinAsignacion.map((fila) =>
                puedeEscribir ? (
                  <button
                    key={fila.id}
                    onClick={() => onEditarFila(fila)}
                    className="rounded-lg border border-dashed border-ink-300 px-2.5 py-1 text-xs text-ink-500 hover:border-brand-400 hover:text-brand-700"
                  >
                    + {fila.curso}
                  </button>
                ) : (
                  <span
                    key={fila.id}
                    className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs text-ink-400"
                  >
                    {fila.curso}
                  </span>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
