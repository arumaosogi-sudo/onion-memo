import { useCallback, useEffect, useState } from 'react';
import { addDays, daysBetween, startOfDay, toISODate } from './date';

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
const KEY = 'stt.tasks.v1';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

/** Days until a done task is purged (counted on calendar days from the day it was done). */
export function memoryDaysLeft(doneAt: number, now = new Date()): number {
  return MEMORY_DAYS - daysBetween(startOfDay(new Date(doneAt)), startOfDay(now));
}

export function sampleTasks(now = new Date()): Task[] {
  const t = startOfDay(now);
  const d = (n: number) => toISODate(addDays(t, n));
  const c = Date.now();
  return [
    { id: uid(), title: 'ส่งการบ้านฟิสิกส์', detail: '', due: d(-2), createdAt: c, doneAt: null },
    { id: uid(), title: 'เตรียมสไลด์พรีเซนต์กลุ่ม', detail: '', due: d(0), createdAt: c, doneAt: null },
    { id: uid(), title: 'ส่งรายงานโครงงานวิทยาศาสตร์ให้คุณครู', detail: 'สรุปบทที่ 3 และ 4 ด้วย', due: d(2), createdAt: c, doneAt: null },
    { id: uid(), title: 'อ่านหนังสือสอบภาษาอังกฤษ', detail: '', due: d(4), createdAt: c, doneAt: null },
    { id: uid(), title: 'ซื้อของขวัญวันเกิดเพื่อน', detail: '', due: d(7), createdAt: c, doneAt: null },
    { id: uid(), title: 'จัดโต๊ะทำงานให้เรียบร้อย', detail: '', due: null, createdAt: c, doneAt: null },
    { id: uid(), title: 'ส่งแบบฝึกหัดคณิตศาสตร์', detail: '', due: d(-6), createdAt: c, doneAt: addDays(t, -5).getTime() + 15 * 3600_000 },
  ];
}

function load(): Task[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return sampleTasks();
    const list = JSON.parse(raw) as Task[];
    return Array.isArray(list) ? list : sampleTasks();
  } catch {
    return sampleTasks();
  }
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
  const resetSample = useCallback(() => setTasks(sampleTasks()), []);
  const clearAll = useCallback(() => setTasks([]), []);

  return { tasks, storageOk, add, update, complete, restore, remove, resetSample, clearAll };
}
