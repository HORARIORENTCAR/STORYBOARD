/**
 * CORRECCIÓN ORTOGRÁFICA EN ESPAÑOL
 *
 * Tres capas, de la más segura a la más amplia:
 *   1. Diccionario de palabras concretas (tildes y eñes).
 *   2. Reglas de terminación, que cubren miles de palabras
 *      ("planificacion" -> "planificación" sin tenerla en la lista).
 *   3. Memoria de rechazos: si corrige mal una palabra y la persona la
 *      vuelve a escribir igual, se rinde con esa palabra para siempre.
 *
 * Nunca se toca la palabra que se está escribiendo, solo las ya terminadas,
 * ni las palabras que sin tilde también existen ("mas", "esta", "solo"...).
 */

const CORRECCIONES: Record<string, string> = {
  accion: "acción",
  ademas: "además",
  adios: "adiós",
  adonde: "adónde",
  ambiguedad: "ambigüedad",
  ambito: "ámbito",
  analisis: "análisis",
  angel: "ángel",
  animo: "ánimo",
  anio: "año",
  anios: "años",
  aqui: "aquí",
  arbol: "árbol",
  articulo: "artículo",
  asi: "así",
  atencion: "atención",
  autobus: "autobús",
  avion: "avión",
  banio: "baño",
  buenisimo: "buenísimo",
  cafe: "café",
  calificacion: "calificación",
  camara: "cámara",
  cancion: "canción",
  capitan: "capitán",
  caracter: "carácter",
  celebracion: "celebración",
  clasico: "clásico",
  codigo: "código",
  comite: "comité",
  companera: "compañera",
  companeras: "compañeras",
  companero: "compañero",
  companeros: "compañeros",
  compania: "compañía",
  comun: "común",
  comunicacion: "comunicación",
  condicion: "condición",
  conexion: "conexión",
  consideracion: "consideración",
  construccion: "construcción",
  cortesia: "cortesía",
  credito: "crédito",
  cumpleanos: "cumpleaños",
  danio: "daño",
  decision: "decisión",
  demas: "demás",
  democratico: "democrático",
  descripcion: "descripción",
  despues: "después",
  dia: "día",
  diagnostico: "diagnóstico",
  dificil: "difícil",
  direccion: "dirección",
  disenar: "diseñar",
  diseno: "diseño",
  distribucion: "distribución",
  division: "división",
  documentacion: "documentación",
  economia: "economía",
  edicion: "edición",
  educacion: "educación",
  ejercito: "ejército",
  eleccion: "elección",
  electronico: "electrónico",
  energia: "energía",
  enfasis: "énfasis",
  ensenanza: "enseñanza",
  ensenar: "enseñar",
  epoca: "época",
  espanol: "español",
  espanola: "española",
  espectaculo: "espectáculo",
  estara: "estará",
  esten: "estén",
  estimulo: "estímulo",
  evaluacion: "evaluación",
  examenes: "exámenes",
  exito: "éxito",
  explicacion: "explicación",
  exposicion: "exposición",
  extranio: "extraño",
  fabrica: "fábrica",
  facil: "fácil",
  fantastico: "fantástico",
  fisica: "física",
  formacion: "formación",
  fotografia: "fotografía",
  funcion: "función",
  geografia: "geografía",
  gestion: "gestión",
  grafico: "gráfico",
  guia: "guía",
  habia: "había",
  habil: "hábil",
  identificacion: "identificación",
  imagenes: "imágenes",
  importantisimo: "importantísimo",
  impresion: "impresión",
  informacion: "información",
  informatica: "informática",
  ingles: "inglés",
  institucion: "institución",
  instruccion: "instrucción",
  interes: "interés",
  invitacion: "invitación",
  jardin: "jardín",
  jovenes: "jóvenes",
  lapiz: "lápiz",
  lider: "líder",
  limite: "límite",
  linea: "línea",
  logica: "lógica",
  maestria: "maestría",
  manana: "mañana",
  maniana: "mañana",
  maquina: "máquina",
  matematica: "matemática",
  matematicas: "matemáticas",
  maximo: "máximo",
  medico: "médico",
  metodo: "método",
  minimo: "mínimo",
  modulo: "módulo",
  motivacion: "motivación",
  munieco: "muñeco",
  musica: "música",
  nacion: "nación",
  nina: "niña",
  ninas: "niñas",
  nino: "niño",
  ninos: "niños",
  numero: "número",
  observacion: "observación",
  obtencion: "obtención",
  ocasion: "ocasión",
  opcion: "opción",
  operacion: "operación",
  organizacion: "organización",
  otono: "otoño",
  oxigeno: "oxígeno",
  pagina: "página",
  parrafo: "párrafo",
  participacion: "participación",
  pedagogia: "pedagogía",
  peliculas: "películas",
  pequena: "pequeña",
  pequenas: "pequeñas",
  pequeno: "pequeño",
  pequenos: "pequeños",
  periodico: "periódico",
  platica: "plática",
  poesia: "poesía",
  politica: "política",
  practica: "práctica",
  preparacion: "preparación",
  presentacion: "presentación",
  problematica: "problemática",
  produccion: "producción",
  programacion: "programación",
  proposito: "propósito",
  proximo: "próximo",
  publico: "público",
  quimica: "química",
  rapido: "rápido",
  razon: "razón",
  recepcion: "recepción",
  reflexion: "reflexión",
  region: "región",
  relacion: "relación",
  religion: "religión",
  reunion: "reunión",
  revision: "revisión",
  sabado: "sábado",
  salon: "salón",
  sancion: "sanción",
  seccion: "sección",
  segun: "según",
  seleccion: "selección",
  senor: "señor",
  senora: "señora",
  senores: "señores",
  senorita: "señorita",
  sesion: "sesión",
  simbolo: "símbolo",
  sintesis: "síntesis",
  situacion: "situación",
  sueno: "sueño",
  suenos: "sueños",
  supervision: "supervisión",
  tambien: "también",
  tecnica: "técnica",
  tecnico: "técnico",
  telefono: "teléfono",
  television: "televisión",
  tematica: "temática",
  teoria: "teoría",
  termino: "término",
  titulo: "título",
  tradicion: "tradición",
  traves: "través",
  ultimo: "último",
  unico: "único",
  union: "unión",
  utiles: "útiles",
  valoracion: "valoración",
  version: "versión",
};

/**
 * Reglas por terminación. Solo se aplican a palabras sin tilde ni eñe.
 * Ojo: los plurales "-iones", "-ciones" ya son correctos sin tilde,
 * por eso las reglas exigen que la palabra TERMINE en la forma singular.
 */
const REGLAS: { fin: RegExp; pon: string; minimo: number }[] = [
  // Terminaciones en -ión: acción, gestión, camión, unión, reflexión...
  { fin: /cion$/, pon: "ción", minimo: 6 },
  { fin: /sion$/, pon: "sión", minimo: 6 },
  { fin: /xion$/, pon: "xión", minimo: 6 },
  { fin: /ion$/, pon: "ión", minimo: 6 },

  // Campos del saber: psicología, metodología, ortografía, economía...
  { fin: /logia$/, pon: "logía", minimo: 7 },
  { fin: /logias$/, pon: "logías", minimo: 8 },
  { fin: /grafia$/, pon: "grafía", minimo: 7 },
  { fin: /grafias$/, pon: "grafías", minimo: 8 },
  { fin: /nomia$/, pon: "nomía", minimo: 7 },
  { fin: /nomias$/, pon: "nomías", minimo: 8 },
  { fin: /metria$/, pon: "metría", minimo: 7 },
  { fin: /sofia$/, pon: "sofía", minimo: 7 },

  // Superlativos: buenísimo, grandísima, importantísimos...
  { fin: /isimo$/, pon: "ísimo", minimo: 7 },
  { fin: /isima$/, pon: "ísima", minimo: 7 },
  { fin: /isimos$/, pon: "ísimos", minimo: 8 },
  { fin: /isimas$/, pon: "ísimas", minimo: 8 },
];

/**
 * Palabras que encajan en una regla pero NO llevan tilde.
 * "guion" y "truhan" son monosílabas según la RAE; "ion" es demasiado corta.
 */
const INTOCABLES = new Set(["ion", "guion", "truhan", "muon", "pion"]);

const TIENE_TILDE = /[áéíóúüñÁÉÍÓÚÜÑ]/;

/** Copia el uso de mayúsculas de la palabra original. */
function conMismaForma(original: string, corregida: string): string {
  if (original === original.toUpperCase() && original.length > 1) return corregida.toUpperCase();
  if (original[0] === original[0]?.toUpperCase()) {
    return corregida[0].toUpperCase() + corregida.slice(1);
  }
  return corregida;
}

/* ------------------------------------------------------------------
   MEMORIA DE RECHAZOS
   Si corregimos una palabra y la persona la vuelve a escribir igual,
   entendemos que no quería la corrección y dejamos de tocarla.
   ------------------------------------------------------------------ */
const CLAVE = "staff-board-ortografia-rechazadas";
let rechazadas: Set<string> | null = null;
/** Última corrección aplicada, para saber si la persona la deshizo. */
let ultima: { cruda: string; arreglada: string } | null = null;

function cargarRechazadas(): Set<string> {
  if (rechazadas) return rechazadas;
  rechazadas = new Set();
  try {
    const guardado = typeof window !== "undefined" ? window.localStorage.getItem(CLAVE) : null;
    if (guardado) JSON.parse(guardado).forEach((p: string) => rechazadas!.add(p));
  } catch {
    /* si no hay almacenamiento, seguimos sin memoria */
  }
  return rechazadas;
}

function recordarRechazo(palabra: string) {
  const set = cargarRechazadas();
  set.add(palabra);
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CLAVE, JSON.stringify(Array.from(set)));
    }
  } catch {
    /* sin almacenamiento, al menos vale para esta sesión */
  }
}

/** Olvida todas las palabras rechazadas y vuelve a corregirlas. */
export function reiniciarCorrector() {
  rechazadas = new Set();
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(CLAVE);
  } catch {
    /* nada que hacer */
  }
}

/** Devuelve la forma correcta de una palabra, o null si no hay nada que cambiar. */
function corregirPalabra(palabra: string): string | null {
  const min = palabra.toLowerCase();

  if (cargarRechazadas().has(min)) return null;
  if (TIENE_TILDE.test(palabra)) return null;

  const delDiccionario = CORRECCIONES[min];
  if (delDiccionario) return delDiccionario;

  if (INTOCABLES.has(min)) return null;

  for (const regla of REGLAS) {
    if (min.length >= regla.minimo && regla.fin.test(min)) {
      const arreglada = min.replace(regla.fin, regla.pon);
      return arreglada === min ? null : arreglada;
    }
  }
  return null;
}

/**
 * Corrige las palabras ya terminadas de un texto.
 * La última palabra se deja intacta mientras se está escribiendo.
 */
export function autocorregir(texto: string): string {
  /* ¿La persona deshizo nuestra última corrección?
     Lo sabemos si la forma corregida desapareció del texto y volvió la original.
     Así no confundimos un rechazo con escribir la misma palabra dos veces. */
  if (ultima) {
    const bajo = texto.toLowerCase();
    if (!bajo.includes(ultima.arreglada.toLowerCase()) && bajo.includes(ultima.cruda)) {
      recordarRechazo(ultima.cruda);
      ultima = null;
    }
  }

  return texto.replace(
    /([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)(?=[\s.,;:!?¡¿()\[\]"'\u2013\u2014/-])/g,
    (palabra) => {
      const arreglo = corregirPalabra(palabra);
      if (!arreglo) return palabra;
      const resultado = conMismaForma(palabra, arreglo);
      ultima = { cruda: palabra.toLowerCase(), arreglada: arreglo };
      return resultado;
    }
  );
}

/** Corrige el texto completo, incluida la última palabra. Para usar al guardar. */
export function autocorregirFinal(texto: string): string {
  return autocorregir(texto + " ").slice(0, -1);
}
