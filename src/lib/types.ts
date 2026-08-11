export type Role = "admin" | "member";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  title?: string;
  area?: string;
  status: "active" | "invited";
  initials: string;
  color: string;
  joinedAt: string;
}

export type EventStatus = "borrador" | "publicado" | "finalizado" | "archivado";

export type EventColor = "brand" | "amber" | "sky" | "violet" | "rose";

export interface SchoolEvent {
  id: string;
  name: string;
  description: string;
  coverEmoji: string;
  /** Imagen de portada opcional (además del emoji). */
  coverImage?: string;
  color: EventColor;
  createdAt: string;
  eventDate: string;
  dueDate?: string;
  status: EventStatus;
  createdBy: string; // user id
  taskIds: string[];
}

export type TaskExecStatus = "sin_iniciar" | "en_proceso" | "terminada";
export type TaskPriority = "baja" | "media" | "alta";

export interface TaskSlot {
  userId: string | null;
  claimedAt: string | null;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  reactions: Partial<Record<"👍" | "❤️" | "✅", string[]>>; // emoji -> userIds
  /** Fotos y documentos compartidos dentro del mensaje. */
  attachments?: EvidenceItem[];
}

export interface EvidenceItem {
  id: string;
  type: "image" | "file";
  name: string;
  /** Enlace real al archivo guardado. Ausente en datos antiguos. */
  url?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface EventTask {
  id: string;
  eventId: string;
  name: string;
  description: string;
  color: EventColor;
  priority: TaskPriority;
  status: TaskExecStatus;
  dueDate: string;
  maxCollaborators: number;
  /** Imagen de referencia de cómo debe quedar el trabajo. */
  referenceImage?: string;
  slots: TaskSlot[];
  requiresLeader: boolean;
  leaderId: string | null;
  chat: ChatMessage[];
  evidence: EvidenceItem[];
  attachments: EvidenceItem[];
  /** Cola de personas esperando que se libere un cupo, por orden de llegada. */
  waitlist: string[];
  /** Archivada automáticamente por la regla de días tras el vencimiento. */
  archived?: boolean;
  /** Evita repetir el aviso de fecha límite próxima. */
  deadlineNotified?: boolean;
}

export interface HistoryEntry {
  id: string;
  userId: string;
  action: string;
  detail: string;
  type: "Evento" | "Tarea" | "Configuración" | "Calendario" | "Equipo";
  createdAt: string;
}

export interface CalendarEntry {
  id: string;
  date: string; // yyyy-mm-dd
  title: string;
  kind: "evento" | "fecha" | "valor" | "reunion" | "capacitacion" | "informe";
  location?: string;
  time?: string;
  /** Lema o nota corta que acompaña la fecha (p. ej. el valor del mes). */
  motto?: string;
  /** Descripción larga: de qué se trata, quiénes participan, qué llevar. */
  description?: string;
  /** Quiénes deben hacerla cumplir. Texto libre: nombres, curso, comisión... */
  responsibles?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  read: boolean;
  /** "all" = toda la institución · array = solo esas personas */
  audience: "all" | string[];
}
