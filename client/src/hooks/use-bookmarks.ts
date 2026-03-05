import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "sd_dispatch_bookmarks";

function load(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function save(ids: number[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch {}
}

let globalBookmarks: number[] = load();
const listeners: Array<(ids: number[]) => void> = [];

function broadcast(ids: number[]) {
  globalBookmarks = ids;
  save(ids);
  listeners.forEach(fn => fn([...ids]));
}

export function useBookmarks() {
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(globalBookmarks);

  useEffect(() => {
    const handler = (ids: number[]) => setBookmarkedIds([...ids]);
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  const toggleBookmark = useCallback((id: number) => {
    const current = [...globalBookmarks];
    const idx = current.indexOf(id);
    if (idx === -1) broadcast([...current, id]);
    else { current.splice(idx, 1); broadcast(current); }
  }, []);

  const isBookmarked = useCallback((id: number) => bookmarkedIds.includes(id), [bookmarkedIds]);

  return { bookmarkedIds, toggleBookmark, isBookmarked };
}
