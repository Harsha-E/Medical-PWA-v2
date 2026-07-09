/**
 * MedCare | Firebase Core
 * Uses Firebase v10 modular SDK via CDN ESM — no bundler required.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, doc, getDocFromServer } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { ENV } from './env.js';

const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID,
  storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
export const db = initializeFirestore(firebaseApp, { localCache: persistentLocalCache() });
export const auth = getAuth(firebaseApp);

// Connectivity is managed automatically by Firestore offline persistence.

export const OperationType = {
  CREATE: 'create', UPDATE: 'update', DELETE: 'delete',
  LIST: 'list', GET: 'get', WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const info = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(info));
  throw new Error(JSON.stringify(info));
}