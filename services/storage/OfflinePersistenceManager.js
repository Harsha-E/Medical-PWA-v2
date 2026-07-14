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

      // Generic table synchronizer
      const syncTable = async (tableName) => {
        try {
          const localRecords = await db[tableName].where('userId').equals(userId).toArray();
          const tableRef = collection(firestoreDb, `users/${userId}/${tableName}`);
          const querySnapshot = await getDocs(tableRef);
          
          const remoteMap = new Map();
          querySnapshot.forEach(docSnap => {
            remoteMap.set(docSnap.id, docSnap.data());
          });

          // Write local changes to firestore
          const batch = writeBatch(firestoreDb);
          for (const local of localRecords) {
            const idStr = local.id.toString();
            // Check if remote exists either under new ID format or legacy format
            const remote = remoteMap.get(idStr) || remoteMap.get(`${userId}_${idStr}`);
            // Simple Last-Write-Wins or merge logic
            if (!remote || local.updatedAt > (remote.updatedAt || 0)) {
              const docRef = doc(firestoreDb, `users/${userId}/${tableName}`, idStr);
              batch.set(docRef, { ...local, id: idStr }, { merge: true });
            }
          }
          await batch.commit();

          // Import remote records to local Dexie
          for (const [idStr, remoteRec] of remoteMap.entries()) {
            // Handle legacy IDs like "uid_12345" by extracting just the numeric part
            const cleanIdStr = idStr.includes('_') ? idStr.split('_')[1] : idStr;
            const local = localRecords.find(r => r.id.toString() === cleanIdStr);
            
            if (!local || (remoteRec.updatedAt || 0) > (local.updatedAt || 0)) {
              const parsedId = parseInt(cleanIdStr, 10);
              if (isNaN(parsedId)) continue;
              const record = { ...remoteRec, id: parsedId };
              await db[tableName].put(record);
            }
          }
        } catch (tableErr) {
          console.warn(`[OfflinePersistenceManager] Sync failed for table: ${tableName}`, tableErr);
        }
      };

      // 1. Sync All Core Tables
      const tablesToSync = [
        'medications',
        'disease_ledger',
        'history',
        'allergies',
        'surgeries',
        'appointments'
      ];

      for (const table of tablesToSync) {
        await syncTable(table);
      }

      console.log('[OfflinePersistenceManager] Data synchronization successful.');
    } catch (e) {
      console.error('[OfflinePersistenceManager] Data synchronization failed:', e);
    }
  }
}
