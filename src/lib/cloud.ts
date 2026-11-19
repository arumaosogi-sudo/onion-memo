// Firebase Auth (Google) + Firestore sync. Loaded lazily so device-only users don't download it.
// Data layout: users/{uid}/tasks/{taskId}, users/{uid}/private/settings { geminiKey }.
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider, browserLocalPersistence, getAuth, onAuthStateChanged, setPersistence,
  signInWithPopup, signInWithRedirect, signOut, type User,
} from 'firebase/auth';
import {
  clearIndexedDbPersistence, collection, deleteDoc, doc, getDoc, initializeFirestore, terminate, onSnapshot, persistentLocalCache,
  persistentMultipleTabManager, setDoc, writeBatch,
} from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';
import type { Task } from './store';

const app = initializeApp(firebaseConfig!);
const auth = getAuth(app);
// Offline-first: reads/writes work without network and sync when back online.
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
void setPersistence(auth, browserLocalPersistence);

export interface CloudUser { uid: string; name: string; email: string; photo: string | null }
const toUser = (u: User): CloudUser => ({ uid: u.uid, name: u.displayName ?? u.email ?? 'ผู้ใช้', email: u.email ?? '', photo: u.photoURL });

export function watchAuth(cb: (u: CloudUser | null) => void): () => void {
  return onAuthStateChanged(auth, (u) => cb(u ? toUser(u) : null));
}

export async function signInGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    const code = (e as { code?: string }).code ?? '';
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

/** Sign out and wipe the offline cache so the next person on this device can't read the data. */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
  try { await terminate(db); await clearIndexedDbPersistence(db); } catch { /* best effort */ }
}

const tasksCol = (uid: string) => collection(db, 'users', uid, 'tasks');
const clean = (t: Task) => ({ ...t, detail: t.detail ?? '', due: t.due ?? null, doneAt: t.doneAt ?? null, starred: !!t.starred });

export function subscribeTasks(uid: string, cb: (tasks: Task[]) => void, onError: (e: unknown) => void): () => void {
  return onSnapshot(tasksCol(uid), (snap) => cb(snap.docs.map((d) => d.data() as Task)), onError);
}

export const putTask = (uid: string, t: Task) => setDoc(doc(db, 'users', uid, 'tasks', t.id), clean(t));
export const removeTask = (uid: string, id: string) => deleteDoc(doc(db, 'users', uid, 'tasks', id));

/** Upload device-only tasks into the account (first sign-in on this device). */
export async function importTasks(uid: string, list: Task[]): Promise<void> {
  for (let i = 0; i < list.length; i += 400) {
    const batch = writeBatch(db);
    for (const t of list.slice(i, i + 400)) batch.set(doc(db, 'users', uid, 'tasks', t.id), clean(t));
    await batch.commit();
  }
}

export async function removeAll(uid: string, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    for (const id of ids.slice(i, i + 400)) batch.delete(doc(db, 'users', uid, 'tasks', id));
    await batch.commit();
  }
}

const settingsRef = (uid: string) => doc(db, 'users', uid, 'private', 'settings');
export async function getCloudGeminiKey(uid: string): Promise<string> {
  const s = await getDoc(settingsRef(uid));
  return (s.data()?.geminiKey as string | undefined) ?? '';
}
export const setCloudGeminiKey = (uid: string, key: string) => setDoc(settingsRef(uid), { geminiKey: key }, { merge: true });
