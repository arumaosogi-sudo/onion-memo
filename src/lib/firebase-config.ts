// Firebase web config (public by design — access is protected by Firestore security rules,
// see firestore.rules). Paste the config from Firebase console → Project settings → Your apps.
// While this is null the app runs in device-only mode and hides the sign-in button.
import type { FirebaseOptions } from 'firebase/app';

export const firebaseConfig: FirebaseOptions | null = null;
