// Firebase web config (public by design — access is protected by Firestore security rules,
// see firestore.rules). Set to null to run the app in device-only mode without sign-in.
import type { FirebaseOptions } from 'firebase/app';

export const firebaseConfig: FirebaseOptions | null = {
  apiKey: 'AIzaSyCOounY1yaM-2sYk5_7Ta10WKRNFsx5opY',
  authDomain: 'onion-memo-fbbe4.firebaseapp.com',
  projectId: 'onion-memo-fbbe4',
  storageBucket: 'onion-memo-fbbe4.firebasestorage.app',
  messagingSenderId: '736297519543',
  appId: '1:736297519543:web:e9bed70bfd60d1780c4032',
};
