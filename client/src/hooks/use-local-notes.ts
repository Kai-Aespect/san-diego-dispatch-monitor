import { useState, useEffect, useCallback } from "react";

export interface LocalNote {
  id: string;
  title: string;
  content: string;
  linkedIncidentNo?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  order?: number;
}

const STORAGE_KEY = "sd_dispatch_local_notes";

function load(): LocalNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function save(notes: LocalNote[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch {}
}

let globalNotes: LocalNote[] = load();
const listeners: Array<(notes: LocalNote[]) => void> = [];

function broadcast(notes: LocalNote[]) {
  globalNotes = notes;
  save(notes);
  listeners.forEach(fn => fn([...notes]));
}

const COLORS = ["blue", "purple", "green", "amber", "red", "pink", "cyan", "indigo"];

export function useLocalNotes() {
  const [notes, setNotes] = useState<LocalNote[]>(globalNotes);

  useEffect(() => {
    const handler = (n: LocalNote[]) => setNotes([...n]);
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  const createNote = useCallback((title: string = "New Note", content: string = "", linkedIncidentNo?: string) => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const now = new Date().toISOString();
    const minOrder = globalNotes.length > 0
      ? Math.min(...globalNotes.map(n => n.order ?? 0)) - 1
      : 0;
    const note: LocalNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      content,
      linkedIncidentNo,
      color,
      createdAt: now,
      updatedAt: now,
      pinned: false,
      order: minOrder,
    };
    broadcast([note, ...globalNotes]);
    return note;
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<LocalNote>) => {
    broadcast(globalNotes.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
  }, []);

  const deleteNote = useCallback((id: string) => {
    broadcast(globalNotes.filter(n => n.id !== id));
  }, []);

  const togglePin = useCallback((id: string) => {
    broadcast(globalNotes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  }, []);

  const reorderNotes = useCallback((orderedIds: string[]) => {
    const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
    broadcast(globalNotes.map(n => ({ ...n, order: orderMap.has(n.id) ? orderMap.get(n.id)! : n.order ?? 0 })));
  }, []);

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const oa = a.order ?? 0;
    const ob = b.order ?? 0;
    if (oa !== ob) return oa - ob;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return { notes: sortedNotes, createNote, updateNote, deleteNote, togglePin, reorderNotes };
}
