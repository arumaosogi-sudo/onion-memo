import { useCallback, useEffect, useState } from 'react';
import { firebaseConfig } from './firebase-config';
import type { CloudUser } from './cloud';

export type CloudModule = typeof import('./cloud');
export const cloudEnabled = firebaseConfig !== null;
let modPromise: Promise<CloudModule> | null = null;
let loaded: CloudModule | null = null;
export const loadCloud = () => (modPromise ??= import('./cloud').then((m) => (loaded = m)));
/** Load Firebase ahead of the tap so the Google popup opens inside the user gesture
 *  (Safari/iPad blocks popups opened after an await). */
export const prefetchCloud = () => { if (cloudEnabled) void loadCloud(); };

const HINT = 'stt.signedIn'; // lets us load Firebase eagerly only for people who use an account

export function useAccount() {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [cloud, setCloud] = useState<CloudModule | null>(null);
  const [checking, setChecking] = useState(() => cloudEnabled && localStorage.getItem(HINT) === '1');

  useEffect(() => {
    if (!cloudEnabled || localStorage.getItem(HINT) !== '1') return;
    let off = () => {};
    loadCloud().then((m) => {
      setCloud(m);
      off = m.watchAuth((u) => { setUser(u); setChecking(false); if (!u) localStorage.removeItem(HINT); });
    }).catch(() => setChecking(false));
    return () => off();
  }, []);

  const signIn = useCallback(async () => {
    // Use the already-loaded module synchronously so the popup is opened in the same tap.
    const m = loaded ?? (await loadCloud());
    localStorage.setItem(HINT, '1');
    try {
      await m.signInGoogle();
    } catch (e) {
      localStorage.removeItem(HINT);
      throw e;
    }
    setCloud(m);
    return new Promise<void>((resolve) => {
      const off = m.watchAuth((u) => { if (u) { setUser(u); off(); resolve(); } });
    });
  }, []);

  const signOut = useCallback(async () => {
    if (cloud) await cloud.signOutUser();
    localStorage.removeItem(HINT);
    setUser(null);
    // The Firestore instance was terminated to wipe its offline cache; start fresh.
    location.reload();
  }, [cloud]);

  return { enabled: cloudEnabled, user, cloud, checking, signIn, signOut };
}
