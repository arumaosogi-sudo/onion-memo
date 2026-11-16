import { useCallback, useEffect, useState } from 'react';
import { daysBetween, startOfDay } from './date';

export interface Task {
  id: string;
  title: string;
  detail: string;
  /** Local calendar date "YYYY-MM-DD", or null = no due date. */
  due: string | null;
  createdAt: number;
  /** Timestamp when marked done; done tasks live in Memory Box for 30 days. */
  doneAt: number | null;
}

export const MEMORY_DAYS = 30;
const KEY = 'stt.tasks.v2';
/** v1 shipped with demo tasks; on first load we import it without those demo rows. */
const LEGACY_KEY = 'stt.tasks.v1';
const LEGACY_DEMO_TITLES = new Set([
  'ส่งการบ้านฟิสิกส์', 'เตรียมสไลด์พรีเซนต์กลุ่ม', 'ส่งรายงานโครงงานวิทยาศาสตร์ให้คุณครู',
  'อ่านหนังสือสอบภาษาอังกฤษ', 'ซื้อของขวัญวันเกิดเพื่อน', 'จัดโต๊ะทำงานให้เรียบร้อย', 'ส่งแบบฝึกหัดคณิตศาสตร์',
]);

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Days until a done task is purged (counted on calendar days from the day it was done). */
export function memoryDaysLeft(doneAt: number, now = new Date()): number {
  return MEMORY_DAYS - daysBetween(startOfDay(new Date(doneAt)), startOfDay(now));
}

function isTask(x: unknown): x is Task {
  const t = x as Task;
  return !!t && typeof t.id === 'string' && typeof t.title === 'string' && (t.due === null || typeof t.due === 'string');
}

function parseList(raw: string | null): Task[] | null {
  if (raw === null) return null;
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(isTask).map((t) => ({ ...t, detail: t.detail ?? '', doneAt: t.doneAt ?? null })) : [];
  } catch {
    return [];
  }
}

function load(): Task[] {
  try {
    const current = parseList(localStorage.getItem(KEY));
    if (current) return current;
    const legacy = parseList(localStorage.getItem(LEGACY_KEY));
    if (legacy) {
      localStorage.removeItem(LEGACY_KEY);
      return legacy.filter((t) => !LEGACY_DEMO_TITLES.has(t.title));
    }
  } catch {
    /* storage blocked: start empty, the UI warns that saving failed */
  }
  return [];
}

function purge(list: Task[]): Task[] {
  return list.filter((t) => t.doneAt === null || memoryDaysLeft(t.doneAt) > 0);
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => purge(load()));
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(tasks));
      setStorageOk(true);
    } catch {
      setStorageOk(false);
    }
  }, [tasks]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setTasks(purge(parseList(e.newValue) ?? [])); };
    addEventListener('storage', onStorage);
    return () => removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((t: Pick<Task, 'title' | 'detail' | 'due'>) => {
    const task: Task = { ...t, id: uid(), createdAt: Date.now(), doneAt: null };
    setTasks((l) => [...l, task]);
    return task;
  }, []);
  const update = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);
  const complete = useCallback((id: string) => update(id, { doneAt: Date.now() }), [update]);
  const restore = useCallback((id: string) => update(id, { doneAt: null }), [update]);
  const remove = useCallback((id: string) => setTasks((l) => l.filter((t) => t.id !== id)), []);
  const clearAll = useCallback(() => setTasks([]), []);

  return { tasks, storageOk, add, update, complete, restore, remove, clearAll };
}
