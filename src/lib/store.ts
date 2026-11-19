import { useCallback, useEffect, useState } from 'react';
import type { CloudModule } from './account';
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
  /** Marked important (star). */
  starred?: boolean;
}

export const MEMORY_DAYS = 30;
const KEY = 'stt.tasks.v2';
/** v1 shipped with demo tasks; on first load we import it without those demo rows. */
const LEGACY_KEY = 'stt.tasks.v1';
const LEGACY_DEMO_TITLES = new Set([
  'ส่งการบ้านฟิสิกส์', 'เตรียมสไลด์พรีเซนต์กลุ่ม', 'ส่งรายงานโครงงานวิทยาศาสตร์ให้คุณครู',
  'อ่านหนังสือสอบภาษาอังกฤษ', 'ซื้อของขวัญวันเกิดเพื่อน', 'จัดโต๊ะทำงานให้เรียบร้อย', 'ส่งแบบฝึกหัดคณิตศาสตร์',
]);

const uid_ = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

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

const isExpired = (t: Task) => t.doneAt !== null && memoryDaysLeft(t.doneAt) <= 0;
function purge(list: Task[]): Task[] {
  return list.filter((t) => !isExpired(t));
}

export interface SyncInfo { cloud: CloudModule | null; uid: string | null }

/**
 * Tasks live in localStorage while signed out, and in Firestore (users/{uid}/tasks) while signed in.
 * On the first sign-in on a device, device-only tasks are uploaded into the account.
 */
export function useTasks({ cloud, uid }: SyncInfo, onEvent?: (e: { kind: 'migrated'; count: number } | { kind: 'sync-error' }) => void) {
  const [local, setLocal] = useState<Task[]>(() => purge(load()));
  const [remote, setRemote] = useState<Task[] | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const online = !!(cloud && uid);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(local));
      setStorageOk(true);
    } catch {
      setStorageOk(false);
    }
  }, [local]);

  // Keep several open tabs in sync (device mode).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setLocal(purge(parseList(e.newValue) ?? [])); };
    addEventListener('storage', onStorage);
    return () => removeEventListener('storage', onStorage);
  }, []);

  // Account mode: move device tasks into the account once, then live-subscribe.
  useEffect(() => {
    if (!cloud || !uid) { setRemote(null); return; }
    let off = () => {};
    let cancelled = false;
    (async () => {
      const pending = load().filter((t) => !isExpired(t));
      if (pending.length) {
        try {
          await cloud.importTasks(uid, pending);
          setLocal([]);
          onEvent?.({ kind: 'migrated', count: pending.length });
        } catch { onEvent?.({ kind: 'sync-error' }); }
      }
      if (cancelled) return;
      off = cloud.subscribeTasks(uid, (list) => {
        const expired = list.filter(isExpired).map((t) => t.id);
        if (expired.length) void cloud.removeAll(uid, expired);
        setRemote(list.filter((t) => !isExpired(t)).map((t) => ({ ...t, starred: !!t.starred })));
      }, () => onEvent?.({ kind: 'sync-error' }));
    })();
    return () => { cancelled = true; off(); };
  }, [cloud, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const tasks = online ? remote ?? [] : local;
  const loading = online && remote === null;

  const save = useCallback((task: Task) => {
    if (cloud && uid) {
      setRemote((l) => { const list = l ?? []; return list.some((t) => t.id === task.id) ? list.map((t) => (t.id === task.id ? task : t)) : [...list, task]; });
      cloud.putTask(uid, task).catch(() => onEvent?.({ kind: 'sync-error' }));
    } else {
      setLocal((l) => (l.some((t) => t.id === task.id) ? l.map((t) => (t.id === task.id ? task : t)) : [...l, task]));
    }
  }, [cloud, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const find = (id: string) => tasks.find((t) => t.id === id);
  const add = (t: Pick<Task, 'title' | 'detail' | 'due'> & { starred?: boolean }) => {
    const task: Task = { starred: false, ...t, id: uid_(), createdAt: Date.now(), doneAt: null };
    save(task);
    return task;
  };
  const update = (id: string, patch: Partial<Task>) => { const t = find(id); if (t) save({ ...t, ...patch }); };
  const complete = (id: string) => update(id, { doneAt: Date.now() });
  const restore = (id: string) => update(id, { doneAt: null });
  const toggleStar = (id: string) => { const t = find(id); if (t) save({ ...t, starred: !t.starred }); };
  const clearAll = () => {
    if (cloud && uid) {
      const ids = tasks.map((t) => t.id);
      setRemote([]);
      cloud.removeAll(uid, ids).catch(() => onEvent?.({ kind: 'sync-error' }));
    } else setLocal([]);
  };

  return { tasks, loading, storageOk, add, update, complete, restore, toggleStar, clearAll };
}
