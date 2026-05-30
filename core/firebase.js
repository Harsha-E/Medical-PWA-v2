/**
 * MedCare | Firebase Core
 * Uses Firebase v10 modular SDK via CDN ESM — no bundler required.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, doc, getDocFromServer } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDfF54qdvqxaasAPLqhx2axoSASLQSvkN4",
  authDomain: "cp-v1-ca134.firebaseapp.com",
  projectId: "cp-v1-ca134",
  storageBucket: "cp-v1-ca134.firebasestorage.app",
  messagingSenderId: "864742646610",
  appId: "1:864742646610:web:642ced3c456700e876108b"
};

const firebaseApp = initializeApp(firebaseConfig);
export const db = initializeFirestore(firebaseApp, { localCache: persistentLocalCache() });
export const auth = getAuth(firebaseApp);

// Connectivity check
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error?.message?.includes('offline')) {
      console.warn('Firebase: offline, using cache.');
    } else {
      console.warn('Firebase ping:', error?.message);
    }
  }
}
testConnection();

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