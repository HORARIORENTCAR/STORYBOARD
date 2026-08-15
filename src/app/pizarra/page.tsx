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
  HelpCircle,
  ChevronDown,
  Circle,
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
 * La Pizarra.
 *
 * Es la hoja que estaba pegada en la pared: una pizarra por actividad, con los
 * quince cursos y lo que le toca a cada uno.
 *
 * Decisiones de diseño de esta versión:
 *
 *  · Textos más grandes. La versión anterior usaba text-sm y text-xs en todo,
 *    que en un teléfono a un brazo de distancia es incómodo de leer. Ahora el
 *    texto que importa está en 15–17px.
 *  · Ningún control mudo. El cuadrito de marcar se convirtió en un botón ancho
 *    que dice con palabras lo que hace, y el lápiz dice "Editar". Un ícono solo,
 *    sin texto, no le comunica nada a quien entra por primera vez.
 *  · Una explicación arriba. La sección se abre contando para qué sirve y qué
 *    hace cada cosa, en tres pasos. Se puede plegar cuando ya no haga falta.
 *  · Cada dato lleva su nombre: "Cuenta", "Ayuda". Antes eran íconos sueltos
 *    que había que adivinar.
 */
export default function PizarraPage() {
  const {
    pizarras,
    isAdmin,
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
  const [ayudaAbierta, setAyudaAbierta] = useState(true);
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

  const propsComunes = (p: Pizarra) => ({
    pizarra: p,
    isAdmin,
    userById,
    onEditarFila: abrirEdicion,
    onMarcar: async (fila: PizarraFila, hecho: boolean) => {
      const err = await marcarFilaPizarra(fila.id, hecho);
      if (err) setAviso(err);
    },
    onCambiarEstado: async (estado: "abierta" | "cerrada") => {
      const err = await cambiarEstadoPizarra(p.id, estado);
      if (err) setAviso(err);
    },
    onEliminar: async () => {
      if (!window.confirm(`¿Eliminar la pizarra "${p.title}"? Se borra con todos sus cursos.`)) return;
      const err = await eliminarPizarra(p.id);
      if (err) setAviso(err);
    },
  });

  return (
    <Shell>
      <PageHeader
        eyebrow="Reparto de trabajo por curso"
        title="La Pizarra"
        description="Qué le toca a cada curso en cada actividad, en un solo lugar."
        actions={
          isAdmin ? (
            <button onClick={() => setCrearAbierto(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Nueva pizarra
            </button>
          ) : null
        }
      />

      {aviso && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[15px] text-rose-700">
          <span>{aviso}</span>
          <button onClick={() => setAviso("")} aria-label="Cerrar aviso" className="shrink-0 p-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* ---- Qué es esto y cómo se usa ---- */}
      <div className="mb-5 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 sm:p-5">
        <button
          onClick={() => setAyudaAbierta((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2.5 text-[16px] font-bold text-ink-900">
            <HelpCircle className="h-5 w-5 shrink-0 text-brand-600" />
            ¿Para qué sirve La Pizarra?
          </span>
          <ChevronDown
            className={cx(
              "h-5 w-5 shrink-0 text-ink-400 transition-transform",
              ayudaAbierta && "rotate-180"
            )}
          />
        </button>

        {ayudaAbierta && (
          <div className="mt-4 space-y-3.5">
            <p className="text-[15px] leading-relaxed text-ink-700">
              Es la misma hoja de asignaciones que se pega en la pared, pero en el teléfono y al
              día. Sirve para repartir el trabajo de una actividad entre los cursos.
            </p>
            <PasoAyuda numero={1}>
              <b className="font-semibold text-ink-900">Cada tarjeta es una actividad.</b> El acto
              de Navidad, una feria, un día especial. Las crea la administración.
            </PasoAyuda>
            <PasoAyuda numero={2}>
              <b className="font-semibold text-ink-900">Dentro, cada curso tiene su encargo</b> con
              la cuenta que se usa. Eso lo puede escribir cualquiera del equipo; el ayudante lo
              asigna la administración.
            </PasoAyuda>
            <PasoAyuda numero={3}>
              <b className="font-semibold text-ink-900">Cuando algo ya esté hecho, márcalo.</b> Eso
              lo puede hacer cualquiera del equipo, porque quien cumple el encargo es quien sabe
              que ya está listo. Todos ven el avance al instante.
            </PasoAyuda>
          </div>
        )}
      </div>

      {pizarras.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-5 py-16 text-center">
          <ClipboardList className="mb-3 h-9 w-9 text-ink-300" />
          <p className="text-[17px] font-semibold text-ink-800">Todavía no hay ninguna pizarra</p>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-500">
            {isAdmin
              ? "Crea la primera con el botón «Nueva pizarra». Se armará sola con los cursos del colegio y solo tendrás que escribir qué le toca a cada uno."
              : "La administración creará la primera. Cuando exista, aquí verás qué le toca a tu curso."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {abiertas.map((p) => (
            <TarjetaPizarra key={p.id} {...propsComunes(p)} />
          ))}

          {cerradas.length > 0 && (
            <div>
              <p className="section-eyebrow mb-3">Pizarras cerradas</p>
              <div className="space-y-8">
                {cerradas.map((p) => (
                  <TarjetaPizarra key={p.id} {...propsComunes(p)} />
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
        eyebrow="La Pizarra"
        title="Nueva pizarra"
      >
        <div className="space-y-4">
          <p className="rounded-xl bg-ink-50 px-4 py-3 text-[15px] leading-relaxed text-ink-600">
            Se crearán solos los quince cursos del colegio, más cuatro renglones{" "}
            <b className="font-semibold text-ink-800">Variable</b> para lo que no le toca a un curso
            fijo: el sonido, las sillas, la comida de los invitados. Después escribes qué le toca a
            cada uno; los que dejes en blanco simplemente no participan.
          </p>
          <div>
            <label className="label">Nombre de la actividad</label>
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
              <label className="label">Horario</label>
              <input
                className="input"
                placeholder="10:00 a.m., mañana, tarde..."
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

      {/* ---- Escribir el encargo de un curso ---- */}
      <Modal
        open={!!filaEditando}
        onClose={() => setFilaEditando(null)}
        eyebrow="Encargo del curso"
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
              <label className="label">¿Quién ayuda?</label>
              <input
                className="input disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500"
                placeholder={isAdmin ? "Ana" : "Lo asigna la administración"}
                disabled={!isAdmin}
                value={edicion.ayudante}
                onChange={(e) => setEdicion({ ...edicion, ayudante: autocorregir(e.target.value) })}
              />
              {!isAdmin && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-relaxed text-ink-500">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Escribir un encargo es contar lo que hay que hacer; poner aquí el nombre de
                  alguien compromete su tiempo. Eso lo decide la administración.
                </p>
              )}
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-ink-500">
            Deja el encargo en blanco si este curso no participa en esta actividad.
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

function PasoAyuda({ numero, children }: { numero: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white">
        {numero}
      </span>
      <p className="text-[15px] leading-relaxed text-ink-700">{children}</p>
    </div>
  );
}

function TarjetaPizarra({
  pizarra,
  isAdmin,
  userById,
  onEditarFila,
  onMarcar,
  onCambiarEstado,
  onEliminar,
}: {
  pizarra: Pizarra;
  isAdmin: boolean;
  userById: (id: string) => { name: string; color?: string } | undefined;
  onEditarFila: (fila: PizarraFila) => void;
  onMarcar: (fila: PizarraFila, hecho: boolean) => void;
  onCambiarEstado: (estado: "abierta" | "cerrada") => void;
  onEliminar: () => void;
}) {
  const cerrada = pizarra.status === "cerrada";
  /* Escribir dentro de la pizarra lo puede hacer cualquiera del equipo
     mientras esté abierta. Cerrarla, reabrirla y eliminarla, solo administración. */
  const puedeEscribir = !cerrada;

  /* Los cursos con algo asignado van primero; los vacíos, apagados al final. */
  const conAsignacion = pizarra.filas.filter((f) => (f.asignacion ?? "").trim().length > 0);
  const sinAsignacion = pizarra.filas.filter((f) => !(f.asignacion ?? "").trim());
  const hechas = conAsignacion.filter((f) => f.hecho).length;
  const progreso = conAsignacion.length === 0 ? 0 : Math.round((hechas / conAsignacion.length) * 100);

  return (
    <div className={cx("card overflow-hidden", cerrada && "opacity-90")}>
      {/* ---- Encabezado de la actividad ---- */}
      <div className="border-b border-ink-100 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-bold leading-tight text-ink-900 sm:text-lg">
                {pizarra.title}
              </h2>
              {cerrada && (
                <span className="badge bg-ink-100 text-ink-600">
                  <Lock className="h-3 w-3" /> Cerrada
                </span>
              )}
            </div>
            <p className="mt-1 text-[15px] text-ink-500">
              {pizarra.date ? formatFullDate(pizarra.date) : "Sin fecha"}
              {pizarra.session ? ` · ${pizarra.session}` : ""}
            </p>
            {pizarra.notes && (
              <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-ink-600">
                {pizarra.notes}
              </p>
            )}
          </div>

          {isAdmin && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {cerrada ? (
                <button onClick={() => onCambiarEstado("abierta")} className="btn-secondary !py-2 !text-[14px]">
                  <RotateCcw className="h-4 w-4" /> Reabrir
                </button>
              ) : (
                <button onClick={() => onCambiarEstado("cerrada")} className="btn-secondary !py-2 !text-[14px]">
                  <Lock className="h-4 w-4" /> Cerrar
                </button>
              )}
              <button
                onClick={onEliminar}
                className="btn-secondary !py-2 !text-[14px] text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            </div>
          )}
        </div>

        {conAsignacion.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-[15px]">
              <span className="font-medium text-ink-700">
                {hechas} de {conAsignacion.length} {conAsignacion.length === 1 ? "curso ya cumplió" : "cursos ya cumplieron"}
              </span>
              <span className="font-bold text-ink-900">{progreso}%</span>
            </div>
            <ProgressBar value={progreso} colorClass="bg-brand-600" />
          </div>
        )}

        {cerrada && (
          <p className="mt-3 flex items-center gap-2 text-[14px] text-ink-500">
            <Lock className="h-4 w-4 shrink-0" />
            Esta pizarra está cerrada: ya no se puede marcar ni editar nada.
          </p>
        )}
      </div>

      {/* ---- Un bloque por curso ---- */}
      <div className="divide-y divide-ink-100">
        {conAsignacion.map((fila) => {
          const quien = fila.hechoPor ? userById(fila.hechoPor) : undefined;
          return (
            <div key={fila.id} className={cx("p-4 sm:px-5", fila.hecho && "bg-brand-50/40")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-bold leading-tight text-ink-900">{fila.curso}</p>
                  <p
                    className={cx(
                      "mt-1.5 text-[15px] leading-relaxed",
                      fila.hecho ? "text-ink-400 line-through" : "text-ink-700"
                    )}
                  >
                    {fila.asignacion}
                  </p>
                </div>

                {puedeEscribir && (
                  <button
                    onClick={() => onEditarFila(fila)}
                    aria-label={`Editar el encargo de ${fila.curso}`}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-ink-200 px-3 py-2 text-[14px] font-semibold text-ink-600 hover:bg-ink-50 active:bg-ink-100"
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </button>
                )}
              </div>

              {(fila.presupuesto || fila.ayudante) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {fila.presupuesto && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-1.5 text-[14px] text-ink-700">
                      <Wallet className="h-4 w-4 shrink-0 text-ink-400" />
                      <span className="text-ink-500">Cuenta</span>
                      <b className="font-semibold">{fila.presupuesto}</b>
                    </span>
                  )}
                  {fila.ayudante && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-1.5 text-[14px] text-ink-700">
                      <UserPlus className="h-4 w-4 shrink-0 text-ink-400" />
                      <span className="text-ink-500">Ayuda</span>
                      <b className="font-semibold">{fila.ayudante}</b>
                    </span>
                  )}
                </div>
              )}

              {/* El control principal: ancho, con palabras, imposible de no ver. */}
              <button
                onClick={() => onMarcar(fila, !fila.hecho)}
                disabled={cerrada}
                title={cerrada ? "La pizarra está cerrada" : undefined}
                className={cx(
                  "mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[15px] font-semibold transition-colors sm:w-auto sm:min-w-[240px]",
                  fila.hecho
                    ? "border-brand-600 bg-brand-600 text-white hover:bg-brand-700"
                    : "border-ink-300 bg-white text-ink-700 hover:border-brand-500 hover:text-brand-700 active:bg-brand-50",
                  cerrada && "cursor-not-allowed opacity-60 hover:border-ink-300 hover:bg-white hover:text-ink-700"
                )}
              >
                {fila.hecho ? (
                  <>
                    <Check className="h-5 w-5 shrink-0" />
                    Hecho{quien ? ` · lo marcó ${quien.name}` : ""}
                  </>
                ) : (
                  <>
                    <Circle className="h-5 w-5 shrink-0 text-ink-400" />
                    Marcar como hecho
                  </>
                )}
              </button>

              {fila.hecho && quien && (
                <div className="mt-2 flex items-center gap-2 text-[13px] text-ink-500 sm:hidden">
                  <Avatar name={quien.name} color={quien.color} size="xs" />
                  Toca el botón otra vez si quieres deshacerlo.
                </div>
              )}
            </div>
          );
        })}

        {/* Cursos sin encargo: presentes pero discretos, como los renglones en
            blanco de la hoja. Solo quien administra los puede rellenar. */}
        {sinAsignacion.length > 0 && (
          <div className="bg-ink-50/60 p-4 sm:px-5">
            <p className="mb-1 text-[15px] font-semibold text-ink-700">
              Sin encargo en esta actividad ({sinAsignacion.length})
            </p>
            <p className="mb-3 text-[14px] leading-relaxed text-ink-500">
              {puedeEscribir
                ? "Todavía no participan. Toca uno para darle su encargo. Los renglones «Variable» sirven para lo que no le toca a un curso fijo."
                : "No participan en esta actividad."}
            </p>
            <div className="flex flex-wrap gap-2">
              {sinAsignacion.map((fila) =>
                puedeEscribir ? (
                  <button
                    key={fila.id}
                    onClick={() => onEditarFila(fila)}
                    className="flex items-center gap-1.5 rounded-xl border border-dashed border-ink-300 bg-white px-3 py-2.5 text-[14px] font-medium text-ink-600 hover:border-brand-400 hover:text-brand-700 active:bg-brand-50"
                  >
                    <Plus className="h-4 w-4 shrink-0" /> {fila.curso}
                  </button>
                ) : (
                  <span
                    key={fila.id}
                    className="rounded-xl border border-ink-200 px-3 py-2.5 text-[14px] text-ink-400"
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
