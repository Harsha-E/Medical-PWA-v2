/**
 * @fileoverview Offline Persistence Manager Service
 * Orchestrates bi-directional data replication and conflict resolution between
 * local Dexie IndexedDB tables and remote Firestore documents.
 */

import db from '../../core/db.js';
import state from '../../core/state.js';

export default class OfflinePersistenceManager {
  /**
   * Pushes unsynced changes to Firestore and fetches remote updates.
   * @returns {Promise<void>}
   */
  async synchronize() {
    if (!navigator.onLine || !state.user) {
      console.log('[OfflinePersistenceManager] Client is offline or unauthenticated; skipping sync.');
      return;
    }

    try {
      const userId = state.user.uid;
      const { getFirestore, doc, setDoc, collection, getDocs, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')
        .catch(() => ({}));
      
      if (!getFirestore) return;
      const firestoreDb = getFirestore();

      // 1. Sync Medications
      const localMeds = await db.medications.where('userId').equals(userId).toArray();
      const medsRef = collection(firestoreDb, `users/${userId}/medicines`);
      const querySnapshot = await getDocs(medsRef);
      const remoteMedsMap = new Map();
      querySnapshot.forEach(docSnap => {
        remoteMedsMap.set(docSnap.id, docSnap.data());
      });

      // Write local changes to firestore
      const batch = writeBatch(firestoreDb);
      for (const m of localMeds) {
        const idStr = m.id.toString();
        const remote = remoteMedsMap.get(idStr);
        // Simple Last-Write-Wins or merge logic
        if (!remote || m.updatedAt > (remote.updatedAt || 0)) {
          const docRef = doc(firestoreDb, `users/${userId}/medicines`, idStr);
          batch.set(docRef, { ...m, id: idStr }, { merge: true });
        }
      }
      await batch.commit();

      // Import remote medicines to local Dexie
      for (const [idStr, remoteMed] of remoteMedsMap.entries()) {
        const local = localMeds.find(m => m.id.toString() === idStr);
        if (!local || (remoteMed.updatedAt || 0) > (local.updatedAt || 0)) {
          const record = { ...remoteMed, id: parseInt(idStr, 10) };
          await db.medications.put(record);
        }
      }

      console.log('[OfflinePersistenceManager] Data synchronization successful.');
    } catch (e) {
      console.error('[OfflinePersistenceManager] Data synchronization failed:', e);
    }
  }
}
