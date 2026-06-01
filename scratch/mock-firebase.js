export function initializeApp() { return {}; }
export function getAuth() { return { currentUser: { uid: 'test-user', email: 'test@example.com' } }; }
export function initializeFirestore() { return {}; }
export function persistentLocalCache() { return {}; }
export function doc() { return {}; }
export function getDocFromServer() { return Promise.resolve({ exists: () => false }); }
export function getDoc() { return Promise.resolve({ exists: () => false }); }
export function getStorage() { return {}; }
export function ref() { return {}; }
export function uploadBytes() { return Promise.resolve({}); }
export function getDownloadURL() { return Promise.resolve('https://mockstorage/report.pdf'); }
export function setDoc() { return Promise.resolve(); }
export const OperationType = {
  CREATE: 'create', UPDATE: 'update', DELETE: 'delete',
  LIST: 'list', GET: 'get', WRITE: 'write',
};
export function handleFirestoreError(e) { return e; }
export const db = {};
export const auth = { currentUser: { uid: 'test-user', email: 'test@example.com' } };
