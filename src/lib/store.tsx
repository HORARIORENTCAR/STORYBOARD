"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import {
  AppNotification,
  CalendarEntry,
  ChatMessage,
  EventTask,
  HistoryEntry,
  SchoolEvent,
  StaffUser,
  TaskExecStatus,
} from "./types";
import { dueLabel, isDueSoon, shouldArchive } from "./task-helpers";

interface InstitutionSettings {
  name: string;
  /** Calendario oficial del colegio (PDF, imagen o Excel) como referencia. */
  officialCalendarUrl?: string;
  officialCalendarName?: string;
  domain: string;
  schoolYear: string;
  timezone: string;
  cancelWindowMinutes: number;
  archiveAfterDays: number;
  requireEvidence: boolean;
  notifyDeadline: boolean;
}

const defaultSettings: InstitutionSettings = {
  name: "CARACOLI GLOBAL SCHOOL",
  domain: "colegio.edu.do",
  schoolYear: "2026-2027",
  timezone: "Santo Domingo (UTC-4)",
  cancelWindowMinutes: 1,
  archiveAfterDays: 30,
  requireEvidence: true,
  notifyDeadline: true,
};

interface StoredState {
  users: StaffUser[];
  events: SchoolEvent[];
  tasks: EventTask[];
  calendar: CalendarEntry[];
  history: HistoryEntry[];
  notifications: AppNotification[];
  settings: InstitutionSettings;
  currentUserId: string;
  loggedIn: boolean;
  loading: boolean;
  /** Mensaje visible si faltan las variables de entorno de Supabase. */
  configError: string | null;
}

const emptyState: StoredState = {
  users: [],
  events: [],
  tasks: [],
  calendar: [],
  history: [],
  notifications: [],
  settings: defaultSettings,
  currentUserId: "",
  loggedIn: false,
  loading: true,
  configError: isSupabaseConfigured
    ? null
    : "Falta conectar Supabase: define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local (ver supabase/README).",
};

/* ============================================================
   MAPEO fila de la base de datos (snake_case) -> tipos de la app
   ============================================================ */
function mapProfile(r: any): StaffUser {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    title: r.title ?? undefined,
    area: r.area ?? undefined,
    status: r.status,
    initials: r.initials,
    color: r.color,
    joinedAt: r.joined_at,
  };
}
function mapEvent(r: any, taskIds: string[]): SchoolEvent {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    coverEmoji: r.cover_emoji,
    coverImage: r.cover_image ?? undefined,
    color: r.color,
    createdAt: r.created_date,
    eventDate: r.event_date,
    dueDate: r.due_date ?? undefined,
    status: r.status,
    createdBy: r.created_by,
    taskIds,
  };
}
function mapChat(r: any): ChatMessage {
  return {
    id: r.id,
    authorId: r.author_id,
    text: r.text,
    createdAt: r.created_at,
    reactions: r.reactions ?? {},
    attachments: r.attachments ?? [],
  };
}
function mapTask(r: any, chat: ChatMessage[]): EventTask {
  return {
    id: r.id,
    eventId: r.event_id,
    name: r.name,
    description: r.description,
    color: r.color,
    priority: r.priority,
    status: r.status,
    dueDate: r.due_date,
    maxCollaborators: r.max_collaborators,
    referenceImage: r.reference_image ?? undefined,
    slots: r.slots ?? [],
    requiresLeader: r.requires_leader,
    leaderId: r.leader_id,
    chat,
    evidence: r.evidence ?? [],
    attachments: r.attachments ?? [],
    waitlist: r.waitlist ?? [],
    archived: r.archived,
    deadlineNotified: r.deadline_notified,
  };
}
function mapNotification(r: any, readIds: Set<string>): AppNotification {
  return {
    id: r.id,
    title: r.title,
    detail: r.detail,
    createdAt: r.created_at,
    read: readIds.has(r.id),
    audience: r.audience_all ? "all" : (r.audience_users ?? []),
  };
}
function mapCalendar(r: any): CalendarEntry {
  return { id: r.id, date: r.date, title: r.title, kind: r.kind, location: r.location ?? undefined, time: r.time ?? undefined, motto: r.motto ?? undefined };
}
function mapHistory(r: any): HistoryEntry {
  return { id: r.id, userId: r.user_id, action: r.action, detail: r.detail, type: r.type, createdAt: r.created_at };
}
function mapSettings(r: any): InstitutionSettings {
  return {
    name: r.name,
    officialCalendarUrl: r.official_calendar_url ?? undefined,
    officialCalendarName: r.official_calendar_name ?? undefined,
    domain: r.domain,
    schoolYear: r.school_year,
    timezone: r.timezone,
    cancelWindowMinutes: r.cancel_window_minutes,
    archiveAfterDays: r.archive_after_days,
    requireEvidence: r.require_evidence,
    notifyDeadline: r.notify_deadline,
  };
}

interface AppContextValue extends StoredState {
  currentUser: StaffUser;
  isAdmin: boolean;
  eventById: (id: string) => SchoolEvent | undefined;
  tasksForEvent: (eventId: string) => EventTask[];
  userById: (id: string) => StaffUser | undefined;
  canSeeEvent: (event: SchoolEvent) => boolean;
  visibleEvents: SchoolEvent[];
  wallEvents: SchoolEvent[];
  myEvents: SchoolEvent[];
  canEditEvent: (event: SchoolEvent) => boolean;
  canDeleteTask: (task: EventTask) => boolean;
  createEvent: (data: Partial<SchoolEvent> & { name: string }) => Promise<SchoolEvent | null>;
  updateEvent: (id: string, patch: Partial<SchoolEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  duplicateEvent: (id: string) => Promise<void>;
  createTask: (data: Partial<EventTask> & { eventId: string; name: string }) => Promise<EventTask | null>;
  updateTask: (id: string, patch: Partial<EventTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  claimSlot: (taskId: string, slotIndex: number) => Promise<string | void>;
  cancelSlot: (taskId: string) => Promise<string | void>;
  joinWaitlist: (taskId: string) => Promise<string | void>;
  leaveWaitlist: (taskId: string) => Promise<string | void>;
  hasEvidence: (task: EventTask) => boolean;
  canFinishTask: (task: EventTask) => boolean;
  myNotifications: AppNotification[];
  liveTasks: EventTask[];
  runArchiveSweep: () => Promise<number>;
  runDeadlineAlerts: () => Promise<number>;
  notify: (title: string, detail: string, audience?: "all" | string[]) => Promise<void>;
  setExecStatus: (taskId: string, status: TaskExecStatus) => Promise<string | void>;
  addChatMessage: (taskId: string, text: string, adjuntos?: File[]) => Promise<string | void>;
  /** Vuelve a traer la conversación de una tarea (al abrirla o tras inscribirse). */
  refreshTaskChat: (taskId: string) => Promise<void>;
  toggleReaction: (taskId: string, messageId: string, emoji: "👍" | "❤️" | "✅") => Promise<void>;
  /** Sube un archivo real y devuelve su enlace público. */
  uploadFile: (file: File, carpeta: string) => Promise<{ url: string; name: string } | string>;
  addEvidence: (taskId: string, file: File) => Promise<string | void>;
  removeEvidence: (taskId: string, itemId: string) => Promise<string | void>;
  addCalendarEntry: (entry: Omit<CalendarEntry, "id">) => Promise<void>;
  removeCalendarEntry: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<InstitutionSettings>) => Promise<void>;
  addUser: (data: { name: string; email: string; role: "admin" | "member"; title?: string; area?: string }) => Promise<string | void>;
  updateUserRole: (id: string, role: "admin" | "member") => Promise<string | void>;
  updateProfile: (patch: { name?: string; title?: string; area?: string }) => Promise<void>;
  removeUser: (id: string) => Promise<string | void>;
  resendInvite: (email: string) => Promise<string | void>;
  searchAll: (q: string) => { events: SchoolEvent[]; tasks: EventTask[]; people: StaffUser[] };
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | void>;
  logout: () => Promise<void>;
  logHistory: (action: string, detail: string, type: HistoryEntry["type"]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoredState>(emptyState);
  const stateRef = useRef(state);
  stateRef.current = state;

  /** Carga todo lo visible para la sesión actual (RLS decide qué llega). */
  const loadAll = useCallback(async (userId: string) => {
    if (!supabase) return;
    const [profilesR, eventsR, tasksR, chatR, notifR, readsR, calR, histR, settingsR] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("events").select("*").order("created_at", { ascending: false }),
      supabase.from("event_tasks").select("*"),
      supabase.from("task_chat_messages").select("*").order("created_at", { ascending: true }),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
      supabase.from("notification_reads").select("notification_id").eq("user_id", userId),
      supabase.from("calendar_entries").select("*").order("date", { ascending: true }),
      supabase.from("history_log").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("institution_settings").select("*").single(),
    ]);

    const chatByTask = new Map<string, ChatMessage[]>();
    (chatR.data ?? []).forEach((r) => {
      const list = chatByTask.get(r.task_id) ?? [];
      list.push(mapChat(r));
      chatByTask.set(r.task_id, list);
    });
    chatByTask.forEach((lista) => lista.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    const tasks = (tasksR.data ?? []).map((r) => mapTask(r, chatByTask.get(r.id) ?? []));
    const taskIdsByEvent = new Map<string, string[]>();
    tasks.forEach((t) => {
      const list = taskIdsByEvent.get(t.eventId) ?? [];
      list.push(t.id);
      taskIdsByEvent.set(t.eventId, list);
    });
    const events = (eventsR.data ?? []).map((r) => mapEvent(r, taskIdsByEvent.get(r.id) ?? []));
    const readIds = new Set((readsR.data ?? []).map((r) => r.notification_id));

    setState((prev) => ({
      ...prev,
      users: (profilesR.data ?? []).map(mapProfile),
      events,
      tasks,
      calendar: (calR.data ?? []).map(mapCalendar),
      history: (histR.data ?? []).map(mapHistory),
      notifications: (notifR.data ?? []).map((r) => mapNotification(r, readIds)),
      settings: settingsR.data ? mapSettings(settingsR.data) : defaultSettings,
      currentUserId: userId,
      loggedIn: true,
      loading: false,
    }));
  }, []);

  /* --------------------------------------------------------
     Sesión: revisa si ya hay una, y escucha cambios (login/logout,
     además del enlace mágico que llega por correo de invitación).
     -------------------------------------------------------- */
  useEffect(() => {
    if (!supabase) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }
    let unsub = () => {};
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        loadAll(data.session.user.id);
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        loadAll(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setState((prev) => ({ ...emptyState, loading: false }));
      }
    });
    unsub = () => sub.subscription.unsubscribe();
    return unsub;
  }, [loadAll]);

  /* --------------------------------------------------------
     Tiempo real: cuando cualquier persona conectada cambia algo,
     todos los navegadores conectados se actualizan solos.
     -------------------------------------------------------- */
  useEffect(() => {
    if (!supabase || !state.loggedIn) return;

    const upsert = <T extends { id: string }>(list: T[], row: T, deleted: boolean) => {
      if (deleted) return list.filter((x) => x.id !== row.id);
      const idx = list.findIndex((x) => x.id === row.id);
      if (idx === -1) return [row, ...list];
      const next = [...list];
      next[idx] = row;
      return next;
    };

    // El tipado de los canales de Realtime es muy estricto; lo relajamos aquí
    // porque el contenido de cada fila ya se normaliza en las funciones map*.
    const channel = (supabase.channel("staff-board-realtime") as any)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, (payload: any) => {
        setState((prev) => {
          const deleted = payload.eventType === "DELETE";
          const row = deleted ? payload.old : payload.new;
          const taskIds = prev.tasks.filter((t) => t.eventId === row.id).map((t) => t.id);
          return { ...prev, events: upsert(prev.events, mapEvent(row, taskIds), deleted) };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_tasks" }, (payload: any) => {
        setState((prev) => {
          const deleted = payload.eventType === "DELETE";
          const row = deleted ? payload.old : payload.new;
          const existingChat = prev.tasks.find((t) => t.id === row.id)?.chat ?? [];
          const nextTasks = upsert(prev.tasks, mapTask(row, existingChat), deleted);
          const taskIds = nextTasks.filter((t) => t.eventId === row.event_id).map((t) => t.id);
          return {
            ...prev,
            tasks: nextTasks,
            events: prev.events.map((e) => (e.id === row.event_id ? { ...e, taskIds } : e)),
          };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_chat_messages" }, (payload: any) => {
        setState((prev) => {
          const deleted = payload.eventType === "DELETE";
          const row = deleted ? payload.old : payload.new;
          return {
            ...prev,
            tasks: prev.tasks.map((t) => {
              if (t.id !== row.task_id) return t;
              const chat = upsert(t.chat, mapChat(row), deleted).sort((a, b) =>
                a.createdAt.localeCompare(b.createdAt)
              );
              return { ...t, chat };
            }),
          };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload: any) => {
        setState((prev) => {
          const deleted = payload.eventType === "DELETE";
          const row = deleted ? payload.old : payload.new;
          const alreadyRead = prev.notifications.find((n) => n.id === row.id)?.read ?? false;
          return { ...prev, notifications: upsert(prev.notifications, mapNotification(row, alreadyRead ? new Set([row.id]) : new Set()), deleted) };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.loggedIn]);

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.currentUserId) ?? ({ id: "", name: "", email: "", role: "member", status: "active", initials: "", color: "#146942", joinedAt: "" } as StaffUser),
    [state.users, state.currentUserId]
  );
  const isAdmin = currentUser?.role === "admin";

  const logHistory = useCallback<AppContextValue["logHistory"]>((action, detail, type) => {
    if (!supabase) return;
    supabase.from("history_log").insert({ user_id: stateRef.current.currentUserId, action, detail, type }).then();
  }, []);

  const taskAudience = useCallback(
    (task: EventTask, includeWaitlist = false) => {
      const event = stateRef.current.events.find((e) => e.id === task.eventId);
      return [
        ...task.slots.map((s) => s.userId),
        task.leaderId,
        event?.createdBy,
        ...(includeWaitlist ? task.waitlist : []),
      ].filter((x): x is string => !!x);
    },
    []
  );

  const notify: AppContextValue["notify"] = useCallback(async (title, detail, audience = "all") => {
    if (!supabase) return;
    const dest = audience === "all" ? [] : Array.from(new Set(audience)).filter((id) => id && id !== stateRef.current.currentUserId);
    if (audience !== "all" && dest.length === 0) return;
    await supabase.rpc("notify", { p_title: title, p_detail: detail, p_audience_all: audience === "all", p_audience_users: dest });
  }, []);

  const liveTasks = useMemo(() => state.tasks.filter((t) => !t.archived), [state.tasks]);

  const runArchiveSweep: AppContextValue["runArchiveSweep"] = useCallback(async () => {
    if (!supabase) return 0;
    const target = state.tasks.filter((t) => shouldArchive(t, state.settings.archiveAfterDays));
    if (target.length === 0) return 0;
    await supabase.from("event_tasks").update({ archived: true }).in("id", target.map((t) => t.id));
    logHistory("archivó automáticamente", `${target.length} tarea(s) vencida(s)`, "Configuración");
    return target.length;
  }, [state.tasks, state.settings.archiveAfterDays, logHistory]);

  const runDeadlineAlerts: AppContextValue["runDeadlineAlerts"] = useCallback(async () => {
    if (!supabase || !state.settings.notifyDeadline) return 0;
    const target = state.tasks.filter((t) => !t.archived && isDueSoon(t) && !t.deadlineNotified);
    if (target.length === 0) return 0;
    await supabase.from("event_tasks").update({ deadline_notified: true }).in("id", target.map((t) => t.id));
    for (const t of target) {
      await notify("Fecha límite próxima", `${t.name} — ${dueLabel(t).toLowerCase()}`, taskAudience(t, true));
    }
    return target.length;
  }, [state.tasks, state.settings.notifyDeadline, notify, taskAudience]);

  const eventById = useCallback((id: string) => state.events.find((e) => e.id === id), [state.events]);
  const tasksForEvent = useCallback((eventId: string) => state.tasks.filter((t) => t.eventId === eventId), [state.tasks]);
  const userById = useCallback((id: string) => state.users.find((u) => u.id === id), [state.users]);

  const canSeeEvent = useCallback(
    (event: SchoolEvent) => event.status === "publicado" || event.createdBy === currentUser?.id || isAdmin,
    [isAdmin, currentUser]
  );
  const visibleEvents = useMemo(
    () => state.events.filter((e) => e.status === "publicado" || e.createdBy === currentUser?.id || isAdmin),
    [state.events, currentUser, isAdmin]
  );
  const wallEvents = useMemo(() => state.events.filter((e) => e.status === "publicado"), [state.events]);
  const myEvents = useMemo(() => state.events.filter((e) => e.createdBy === currentUser?.id), [state.events, currentUser]);

  const canEditEvent = useCallback((event: SchoolEvent) => isAdmin || event.createdBy === currentUser?.id, [isAdmin, currentUser]);
  const canDeleteTask = useCallback(
    (task: EventTask) => {
      const event = eventById(task.eventId);
      return isAdmin || (event ? event.createdBy === currentUser?.id : false);
    },
    [isAdmin, currentUser, eventById]
  );

  const createEvent: AppContextValue["createEvent"] = useCallback(
    async (data) => {
      if (!supabase || !currentUser?.id) return null;
      const { data: row, error } = await supabase
        .from("events")
        .insert({
          name: data.name,
          description: data.description ?? "",
          cover_emoji: data.coverEmoji ?? "📌",
          cover_image: data.coverImage ?? null,
          color: data.color ?? "brand",
          event_date: data.eventDate ?? new Date().toISOString().slice(0, 10),
          due_date: data.dueDate ?? null,
          status: data.status ?? "borrador",
          created_by: currentUser.id,
        })
        .select()
        .single();
      if (error || !row) return null;
      logHistory("creó el evento", row.name, "Evento");
      return mapEvent(row, []);
    },
    [currentUser, logHistory]
  );

  const updateEvent: AppContextValue["updateEvent"] = useCallback(
    async (id, patch) => {
      if (!supabase) return;
      const prevEvent = state.events.find((e) => e.id === id);
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.description !== undefined) dbPatch.description = patch.description;
      if (patch.coverEmoji !== undefined) dbPatch.cover_emoji = patch.coverEmoji;
      if (patch.coverImage !== undefined) dbPatch.cover_image = patch.coverImage || null;
      if (patch.color !== undefined) dbPatch.color = patch.color;
      if (patch.eventDate !== undefined) dbPatch.event_date = patch.eventDate;
      if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      await supabase.from("events").update(dbPatch).eq("id", id);
      if (patch.status && patch.status !== prevEvent?.status) {
        logHistory(patch.status === "publicado" ? "publicó el evento" : "cambió el estado de", prevEvent?.name ?? "", "Evento");
        if (patch.status === "publicado") await notify("Nuevo evento publicado", `${currentUser?.name ?? "Alguien"} publicó ${prevEvent?.name ?? ""}`, "all");
      } else {
        logHistory("editó el evento", prevEvent?.name ?? "", "Evento");
      }
    },
    [state.events, logHistory, notify, currentUser]
  );

  const deleteEvent: AppContextValue["deleteEvent"] = useCallback(
    async (id) => {
      if (!supabase) return;
      const event = state.events.find((e) => e.id === id);
      await supabase.from("events").delete().eq("id", id);
      if (event) logHistory("eliminó el evento", event.name, "Evento");
    },
    [state.events, logHistory]
  );

  const duplicateEvent: AppContextValue["duplicateEvent"] = useCallback(
    async (id) => {
      if (!supabase || !currentUser?.id) return;
      const event = state.events.find((e) => e.id === id);
      if (!event) return;
      const relatedTasks = state.tasks.filter((t) => t.eventId === id);
      const { data: newEventRow, error } = await supabase
        .from("events")
        .insert({
          name: `${event.name} · nueva edición`,
          description: event.description,
          cover_emoji: event.coverEmoji,
          cover_image: event.coverImage ?? null,
          color: event.color,
          event_date: event.eventDate,
          due_date: event.dueDate ?? null,
          status: "borrador",
          created_by: currentUser.id,
        })
        .select()
        .single();
      if (error || !newEventRow) return;
      if (relatedTasks.length > 0) {
        await supabase.from("event_tasks").insert(
          relatedTasks.map((t) => ({
            event_id: newEventRow.id,
            name: t.name,
            description: t.description,
            color: t.color,
            priority: t.priority,
            status: "sin_iniciar",
            due_date: t.dueDate,
            max_collaborators: t.maxCollaborators,
            reference_image: t.referenceImage ?? null,
            slots: t.slots.map(() => ({ userId: null, claimedAt: null })),
            requires_leader: t.requiresLeader,
            leader_id: t.leaderId,
            waitlist: [],
            evidence: [],
            attachments: [],
          }))
        );
      }
      logHistory("creó el evento", newEventRow.name, "Evento");
    },
    [state.events, state.tasks, currentUser, logHistory]
  );

  const createTask: AppContextValue["createTask"] = useCallback(
    async (data) => {
      if (!supabase) return null;
      const max = data.maxCollaborators ?? 1;
      const { data: row, error } = await supabase
        .from("event_tasks")
        .insert({
          event_id: data.eventId,
          name: data.name,
          description: data.description ?? "",
          color: data.color ?? "brand",
          priority: data.priority ?? "media",
          status: "sin_iniciar",
          due_date: data.dueDate ?? new Date().toISOString().slice(0, 10),
          max_collaborators: max,
          reference_image: data.referenceImage ?? null,
          requires_leader: data.requiresLeader ?? false,
          leader_id: data.leaderId ?? null,
          slots: Array.from({ length: max }, () => ({ userId: null, claimedAt: null })),
          waitlist: [],
          evidence: [],
          attachments: [],
        })
        .select()
        .single();
      if (error || !row) return null;
      logHistory("creó la tarea", row.name, "Tarea");
      return mapTask(row, []);
    },
    [logHistory]
  );

  const updateTask: AppContextValue["updateTask"] = useCallback(async (id, patch) => {
    if (!supabase) return;
    const actual = stateRef.current.tasks.find((t) => t.id === id);
    const dbPatch: Record<string, unknown> = {};

    /* Si cambia la cantidad de colaboradores hay que redimensionar los lugares
       conservando a quienes ya están inscritos. Nunca por debajo de los ocupados. */
    if (actual && patch.maxCollaborators !== undefined && patch.maxCollaborators !== actual.maxCollaborators) {
      const ocupados = actual.slots.filter((sl) => sl.userId);
      const objetivo = Math.max(patch.maxCollaborators, ocupados.length, 1);
      const nuevos = [...ocupados];
      while (nuevos.length < objetivo) nuevos.push({ userId: null, claimedAt: null });
      dbPatch.slots = nuevos;
      dbPatch.max_collaborators = objetivo;
    }

    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.description !== undefined) dbPatch.description = patch.description;
    if (patch.color !== undefined) dbPatch.color = patch.color;
    if (patch.priority !== undefined) dbPatch.priority = patch.priority;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate;
    if (patch.maxCollaborators !== undefined && dbPatch.max_collaborators === undefined)
      dbPatch.max_collaborators = patch.maxCollaborators;
    if (patch.referenceImage !== undefined) dbPatch.reference_image = patch.referenceImage || null;
    if (patch.requiresLeader !== undefined) dbPatch.requires_leader = patch.requiresLeader;
    if (patch.leaderId !== undefined) dbPatch.leader_id = patch.leaderId;
    if (patch.slots !== undefined) dbPatch.slots = patch.slots;
    await supabase.from("event_tasks").update(dbPatch).eq("id", id);
  }, []);

  const deleteTask: AppContextValue["deleteTask"] = useCallback(
    async (id) => {
      if (!supabase) return;
      const task = state.tasks.find((t) => t.id === id);
      await supabase.from("event_tasks").delete().eq("id", id);
      if (task) logHistory("eliminó la tarea", task.name, "Tarea");
    },
    [state.tasks, logHistory]
  );

  /* ----- acciones sensibles a condiciones de carrera: pasan por RPC ----- */
  const claimSlot: AppContextValue["claimSlot"] = useCallback(async (taskId, slotIndex) => {
    if (!supabase) return "Supabase no está configurado";
    const { error } = await supabase.rpc("claim_slot", { p_task_id: taskId, p_slot_index: slotIndex });
    if (error) return error.message;
  }, []);

  const cancelSlot: AppContextValue["cancelSlot"] = useCallback(async (taskId) => {
    if (!supabase) return "Supabase no está configurado";
    const { error } = await supabase.rpc("cancel_slot", { p_task_id: taskId });
    if (error) return error.message;
  }, []);

  const joinWaitlist: AppContextValue["joinWaitlist"] = useCallback(async (taskId) => {
    if (!supabase) return "Supabase no está configurado";
    const { error } = await supabase.rpc("join_waitlist", { p_task_id: taskId });
    if (error) return error.message;
  }, []);

  const leaveWaitlist: AppContextValue["leaveWaitlist"] = useCallback(async (taskId) => {
    if (!supabase) return "Supabase no está configurado";
    const { error } = await supabase.rpc("leave_waitlist", { p_task_id: taskId });
    if (error) return error.message;
  }, []);

  const setExecStatus: AppContextValue["setExecStatus"] = useCallback(async (taskId, status) => {
    if (!supabase) return "Supabase no está configurado";
    const { error } = await supabase.rpc("set_exec_status", { p_task_id: taskId, p_status: status });
    if (error) return error.message;
  }, []);

  /**
   * Sube un archivo al almacenamiento del colegio y devuelve su enlace.
   * Si algo falla devuelve un texto con el motivo, para mostrarlo en pantalla.
   */
  const uploadFile: AppContextValue["uploadFile"] = useCallback(async (file, carpeta) => {
    if (!supabase) return "Supabase no está configurado";
    const LIMITE = 25 * 1024 * 1024;
    if (file.size > LIMITE) return "El archivo supera el límite de 25 MB.";
    const limpio = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    const ruta = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${limpio}`;
    const { error } = await supabase.storage.from("staffboard").upload(ruta, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) {
      return error.message.toLowerCase().includes("bucket")
        ? "Falta crear el almacenamiento en Supabase (ejecuta storage-archivos.sql)."
        : error.message;
    }
    const { data } = supabase.storage.from("staffboard").getPublicUrl(ruta);
    return { url: data.publicUrl, name: file.name };
  }, []);

  const esImagen = (f: File) => f.type.startsWith("image/");

  const addChatMessage: AppContextValue["addChatMessage"] = useCallback(
    async (taskId, text, adjuntos = []) => {
      if (!supabase) return "Supabase no está configurado";
      const subidos: {
        id: string; type: "image" | "file"; name: string; url: string; uploadedBy: string; uploadedAt: string;
      }[] = [];
      for (const f of adjuntos) {
        const r = await uploadFile(f, `chat/${taskId}`);
        if (typeof r === "string") return r;
        subidos.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: f.type.startsWith("image/") ? "image" : "file",
          name: r.name,
          url: r.url,
          uploadedBy: stateRef.current.currentUserId,
          uploadedAt: new Date().toISOString(),
        });
      }
      const { data, error } = await supabase.rpc("add_chat_message", {
        p_task_id: taskId,
        p_text: text,
        p_attachments: subidos,
      });
      if (error) return error.message;

      // Mostrarlo de inmediato sin esperar al aviso en tiempo real.
      // Si el aviso llega después, el mismo id evita que se duplique.
      const fila = Array.isArray(data) ? data[0] : data;
      if (fila?.id) {
        const nuevo = mapChat(fila);
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id !== taskId
              ? t
              : {
                  ...t,
                  chat: [...t.chat.filter((m) => m.id !== nuevo.id), nuevo].sort((a, b) =>
                    a.createdAt.localeCompare(b.createdAt)
                  ),
                }
          ),
        }));
      }
    },
    [uploadFile]
  );

  const refreshTaskChat: AppContextValue["refreshTaskChat"] = useCallback(async (taskId) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("task_chat_messages")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (error || !data) return;
    const chat = data.map(mapChat);
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, chat } : t)),
    }));
  }, []);

  const toggleReaction: AppContextValue["toggleReaction"] = useCallback(async (_taskId, messageId, emoji) => {
    if (!supabase) return;
    await supabase.rpc("toggle_reaction", { p_message_id: messageId, p_emoji: emoji });
  }, []);


  /** Sube una evidencia real (foto o documento) a la tarea. */
  const addEvidence: AppContextValue["addEvidence"] = useCallback(
    async (taskId, file) => {
      if (!supabase) return "Supabase no está configurado";
      const subido = await uploadFile(file, `tareas/${taskId}`);
      if (typeof subido === "string") return subido;
      const { error } = await supabase.rpc("add_evidence", {
        p_task_id: taskId,
        p_name: subido.name,
        p_type: esImagen(file) ? "image" : "file",
        p_url: subido.url,
      });
      if (error) return error.message;
    },
    [uploadFile]
  );

  const removeEvidence: AppContextValue["removeEvidence"] = useCallback(async (taskId, itemId) => {
    if (!supabase) return "Supabase no está configurado";
    const { error } = await supabase.rpc("remove_evidence", { p_task_id: taskId, p_item_id: itemId });
    if (error) return error.message;
  }, []);

  const addCalendarEntry: AppContextValue["addCalendarEntry"] = useCallback(
    async (entry) => {
      if (!supabase) return;
      await supabase.from("calendar_entries").insert({
        date: entry.date,
        title: entry.title,
        kind: entry.kind,
        location: entry.location ?? null,
        time: entry.time ?? null,
        motto: entry.motto ?? null,
      });
      logHistory("agregó al calendario institucional", entry.title, "Calendario");
      // La especificación pide avisar a todo el personal de cualquier cambio del calendario.
      await notify(
        "Calendario institucional actualizado",
        `${currentUser?.name ?? "Alguien"} agregó "${entry.title}" el ${entry.date}`,
        "all"
      );
      // Recargar calendario (no está en el canal de tiempo real por simplicidad)
      const { data } = await supabase.from("calendar_entries").select("*").order("date", { ascending: true });
      if (data) setState((prev) => ({ ...prev, calendar: data.map(mapCalendar) }));
    },
    [logHistory, notify, currentUser]
  );

  const removeCalendarEntry: AppContextValue["removeCalendarEntry"] = useCallback(
    async (id) => {
      if (!supabase) return;
      const entry = state.calendar.find((c) => c.id === id);
      await supabase.from("calendar_entries").delete().eq("id", id);
      setState((prev) => ({ ...prev, calendar: prev.calendar.filter((c) => c.id !== id) }));
      if (entry) {
        logHistory("eliminó del calendario institucional", entry.title, "Calendario");
        await notify(
          "Calendario institucional actualizado",
          `${currentUser?.name ?? "Alguien"} eliminó "${entry.title}" del ${entry.date}`,
          "all"
        );
      }
    },
    [state.calendar, logHistory, notify, currentUser]
  );

  const updateSettings: AppContextValue["updateSettings"] = useCallback(
    async (patch) => {
      if (!supabase) return;
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.officialCalendarUrl !== undefined) dbPatch.official_calendar_url = patch.officialCalendarUrl || null;
      if (patch.officialCalendarName !== undefined) dbPatch.official_calendar_name = patch.officialCalendarName || null;
      if (patch.domain !== undefined) dbPatch.domain = patch.domain;
      if (patch.schoolYear !== undefined) dbPatch.school_year = patch.schoolYear;
      if (patch.timezone !== undefined) dbPatch.timezone = patch.timezone;
      if (patch.cancelWindowMinutes !== undefined) dbPatch.cancel_window_minutes = patch.cancelWindowMinutes;
      if (patch.archiveAfterDays !== undefined) dbPatch.archive_after_days = patch.archiveAfterDays;
      if (patch.requireEvidence !== undefined) dbPatch.require_evidence = patch.requireEvidence;
      if (patch.notifyDeadline !== undefined) dbPatch.notify_deadline = patch.notifyDeadline;
      await supabase.from("institution_settings").update(dbPatch).eq("id", true);
      setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
      logHistory("actualizó la configuración institucional", state.settings.name, "Configuración");
    },
    [state.settings, logHistory]
  );

  /** Invita a alguien nuevo: pasa por /api/invite (usa la llave de servicio). */
  const addUser: AppContextValue["addUser"] = useCallback(
    async (data) => {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, requesterId: stateRef.current.currentUserId }),
      });
      const body = await res.json();
      if (!res.ok) return body.error ?? "No se pudo invitar a la persona.";
      logHistory("agregó al colaborador", data.name, "Equipo");
      if (supabase) {
        const { data: profiles } = await supabase.from("profiles").select("*");
        if (profiles) setState((prev) => ({ ...prev, users: profiles.map(mapProfile) }));
      }
    },
    [logHistory]
  );

  /**
   * Cambia el rol de una persona con dos candados:
   *  - Nadie puede quitarse a sí mismo el rol de administrador (evita quedarse fuera).
   *  - La institución nunca puede quedarse sin ningún administrador.
   */
  const updateUserRole: AppContextValue["updateUserRole"] = useCallback(async (id, role) => {
    if (!supabase) return "Supabase no está configurado";
    const prev = stateRef.current;
    const objetivo = prev.users.find((u) => u.id === id);
    if (!objetivo) return "No se encontró a esa persona.";
    if (objetivo.role === role) return;

    if (role === "member" && objetivo.role === "admin") {
      if (id === prev.currentUserId) {
        return "No puedes quitarte a ti mismo el rol de administrador. Pídeselo a otro administrador.";
      }
      const admins = prev.users.filter((u) => u.role === "admin").length;
      if (admins <= 1) {
        return "Debe quedar al menos un administrador en la institución.";
      }
    }

    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) return error.message;
    setState((p) => ({ ...p, users: p.users.map((u) => (u.id === id ? { ...u, role } : u)) }));
    logHistory(
      role === "admin" ? "nombró administrador a" : "cambió a miembro del equipo a",
      objetivo.name,
      "Equipo"
    );
  }, [logHistory]);

  /** Cada quien edita su propia ficha; se guarda de verdad en la base de datos. */
  const updateProfile: AppContextValue["updateProfile"] = useCallback(
    async (patch) => {
      if (!supabase) return;
      const id = stateRef.current.currentUserId;
      if (!id) return;
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) {
        dbPatch.name = patch.name;
        dbPatch.initials = patch.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
      }
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.area !== undefined) dbPatch.area = patch.area;
      await supabase.from("profiles").update(dbPatch).eq("id", id);
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      }));
      logHistory("actualizó su perfil", patch.name ?? "", "Equipo");
    },
    [logHistory]
  );

  /** Saca a alguien del equipo. Las protecciones reales viven en /api/remove-user. */
  const removeUser: AppContextValue["removeUser"] = useCallback(
    async (id) => {
      const person = stateRef.current.users.find((u) => u.id === id);
      const res = await fetch("/api/remove-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, requesterId: stateRef.current.currentUserId }),
      });
      const body = await res.json();
      if (!res.ok) return body.error ?? "No se pudo eliminar a esa persona.";
      setState((prev) => ({ ...prev, users: prev.users.filter((u) => u.id !== id) }));
      logHistory("eliminó del equipo a", person?.name ?? "", "Equipo");
    },
    [logHistory]
  );

  /** Reenvía el correo para que la persona cree (o recupere) su contraseña. */
  const resendInvite: AppContextValue["resendInvite"] = useCallback(async (email) => {
    if (!supabase) return "Supabase no está configurado";
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return error.message;
  }, []);

  const myNotifications = useMemo(
    () => state.notifications.filter((n) => n.audience === "all" || (Array.isArray(n.audience) && n.audience.includes(currentUser?.id ?? ""))),
    [state.notifications, currentUser]
  );

  /** Búsqueda global de la barra superior. Respeta lo que cada quien puede ver. */
  const searchAll: AppContextValue["searchAll"] = useCallback(
    (q) => {
      const term = q.trim().toLowerCase();
      if (term.length < 2) return { events: [], tasks: [], people: [] };
      const visible = state.events.filter(
        (e) => e.status === "publicado" || e.createdBy === currentUser?.id || isAdmin
      );
      const visibleIds = new Set(visible.map((e) => e.id));
      return {
        events: visible.filter((e) => `${e.name} ${e.description}`.toLowerCase().includes(term)).slice(0, 5),
        tasks: state.tasks
          .filter((t) => !t.archived && visibleIds.has(t.eventId) && `${t.name} ${t.description}`.toLowerCase().includes(term))
          .slice(0, 5),
        people: state.users
          .filter((u) => `${u.name} ${u.email} ${u.title ?? ""} ${u.area ?? ""}`.toLowerCase().includes(term))
          .slice(0, 5),
      };
    },
    [state.events, state.tasks, state.users, currentUser, isAdmin]
  );

  const hasEvidence: AppContextValue["hasEvidence"] = useCallback((task) => task.evidence.length + task.attachments.length > 0, []);
  const canFinishTask: AppContextValue["canFinishTask"] = useCallback(
    (task) => !state.settings.requireEvidence || hasEvidence(task),
    [state.settings.requireEvidence, hasEvidence]
  );

  /** Marca una sola notificación como leída (al tocarla en la campana). */
  const markNotificationRead: AppContextValue["markNotificationRead"] = useCallback(async (id) => {
    if (!supabase) return;
    const actual = stateRef.current.notifications.find((n) => n.id === id);
    if (!actual || actual.read) return;
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
    await supabase.rpc("mark_notification_read", { p_notification_id: id });
  }, []);

  const markAllNotificationsRead: AppContextValue["markAllNotificationsRead"] = useCallback(async () => {
    if (!supabase) return;
    const unread = stateRef.current.notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => supabase!.rpc("mark_notification_read", { p_notification_id: n.id })));
    setState((prev) => ({ ...prev, notifications: prev.notifications.map((n) => ({ ...n, read: true })) }));
  }, []);

  const login: AppContextValue["login"] = useCallback(async (email, password) => {
    if (!supabase) return "Falta conectar Supabase (revisa .env.local).";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return "Correo o contraseña incorrectos.";
  }, []);

  const logout: AppContextValue["logout"] = useCallback(async () => {
    // Limpiamos el estado local aunque la llamada a la red falle, para que
    // "Cerrar sesión" nunca deje a la persona atrapada dentro de la app.
    try {
      if (supabase) await supabase.auth.signOut();
    } catch {
      // sin conexión: igual cerramos la sesión de este dispositivo
    }
    setState({ ...emptyState, loading: false });
  }, []);

  /**
   * Mantenimiento automático: archiva lo vencido y avisa de fechas próximas.
   * Antes solo ocurría si alguien entraba a Configuración y guardaba, así que
   * en la práctica nunca pasaba. Lo corre un administrador, una vez por sesión,
   * porque es quien tiene permiso para modificar las tareas.
   */
  const mantenimientoHecho = useRef(false);
  useEffect(() => {
    if (!state.loggedIn || state.loading || mantenimientoHecho.current) return;
    if (currentUser?.role !== "admin") return;
    if (state.tasks.length === 0) return;
    mantenimientoHecho.current = true;
    const t = window.setTimeout(() => {
      runArchiveSweep();
      runDeadlineAlerts();
    }, 1500);
    return () => window.clearTimeout(t);
  }, [state.loggedIn, state.loading, state.tasks.length, currentUser, runArchiveSweep, runDeadlineAlerts]);

  const value: AppContextValue = {
    ...state,
    currentUser,
    isAdmin,
    eventById,
    tasksForEvent,
    userById,
    canSeeEvent,
    visibleEvents,
    wallEvents,
    myEvents,
    canEditEvent,
    canDeleteTask,
    createEvent,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    createTask,
    updateTask,
    deleteTask,
    claimSlot,
    cancelSlot,
    joinWaitlist,
    leaveWaitlist,
    hasEvidence,
    canFinishTask,
    myNotifications,
    notify,
    liveTasks,
    runArchiveSweep,
    runDeadlineAlerts,
    setExecStatus,
    addChatMessage,
    refreshTaskChat,
    toggleReaction,
    uploadFile,
    addEvidence,
    removeEvidence,
    addCalendarEntry,
    removeCalendarEntry,
    updateSettings,
    addUser,
    updateUserRole,
    updateProfile,
    removeUser,
    resendInvite,
    searchAll,
    markNotificationRead,
    markAllNotificationsRead,
    login,
    logout,
    logHistory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export type { InstitutionSettings };
