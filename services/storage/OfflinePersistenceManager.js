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
      const syncTable = async (tableName, targetUid) => {
        try {
          const localRecords = await db[tableName].where('userId').equals(targetUid).toArray();
          const tableRef = collection(firestoreDb, `users/${targetUid}/${tableName}`);
          const querySnapshot = await getDocs(tableRef);
          
          const remoteMap = new Map();
          querySnapshot.forEach(docSnap => {
            remoteMap.set(docSnap.id, docSnap.data());
          });

          // Helper to recursively remove undefined values from objects/arrays
          const stripUndefined = (obj) => {
              if (obj === null || typeof obj !== 'object') return obj;
              if (Array.isArray(obj)) {
                  return obj.map(item => stripUndefined(item)).filter(item => item !== undefined);
              }
              const result = {};
              for (const [k, v] of Object.entries(obj)) {
                  if (v !== undefined) {
                      result[k] = stripUndefined(v);
                  }
              }
              return result;
          };

          // Write local changes to firestore (only for our own data, unless we have write permission - for now write everything since we have roles)
          const batch = writeBatch(firestoreDb);
          for (const local of localRecords) {
            const idStr = local.id.toString();
            // Check if remote exists either under new ID format or legacy format
            const remote = remoteMap.get(idStr) || remoteMap.get(`${targetUid}_${idStr}`);
            // Simple Last-Write-Wins or merge logic
            if (!remote || local.updatedAt > (remote.updatedAt || 0)) {
              const docRef = doc(firestoreDb, `users/${targetUid}/${tableName}`, idStr);
              const cleanLocal = stripUndefined({ ...local, id: idStr });
              batch.set(docRef, cleanLocal, { merge: true });
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
              const record = { ...remoteRec, id: parsedId, userId: targetUid };
              await db[tableName].put(record);
            }
          }
        } catch (tableErr) {
          console.warn(`[OfflinePersistenceManager] Sync failed for table: ${tableName}`, tableErr);
        }
      };

      // 1. Determine which profiles to sync (Self + Active Context)
      const profilesToSync = [userId];
      if (state.activeProfileContext) {
          let targetProfileUid;
          if (typeof state.activeProfileContext === 'string') {
              targetProfileUid = state.activeProfileContext;
          } else if (state.activeProfileContext.patientUid && state.activeProfileContext.trustedUid) {
              // It's a family record from Dexie
              const isPatient = state.activeProfileContext.patientUid === userId;
              targetProfileUid = isPatient ? state.activeProfileContext.trustedUid : state.activeProfileContext.patientUid;
          } else {
              targetProfileUid = state.activeProfileContext.id; // Fallback
          }
          
          if (targetProfileUid && targetProfileUid !== userId) {
            profilesToSync.push(targetProfileUid);
          }
      }

      // 2. Sync All Core Tables
      const tablesToSync = [
        'medications',
        'disease_ledger',
        'history',
        'allergies',
        'surgeries',
        'appointments'
      ];

      for (const targetUid of profilesToSync) {
          console.log(`[OfflinePersistenceManager] Syncing records for UID: ${targetUid}`);
          for (const table of tablesToSync) {
            await syncTable(table, targetUid);
          }
      }

      console.log('[OfflinePersistenceManager] Data synchronization successful.');
      window.dispatchEvent(new CustomEvent('medcare:sync-complete'));
    } catch (e) {
      console.error('[OfflinePersistenceManager] Data synchronization failed:', e);
    }
  }

  static _unsubscribeList = [];
  
  /**
   * Attaches real-time listeners to Firestore for active profiles.
   */
  async attachRealtimeListeners() {
      if (!navigator.onLine || !state.user) return;
      
      const { getFirestore, collection, onSnapshot, query } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js').catch(() => ({}));
      if (!getFirestore) return;
      const firestoreDb = getFirestore();

      // Clear existing listeners
      OfflinePersistenceManager._unsubscribeList.forEach(unsub => unsub());
      OfflinePersistenceManager._unsubscribeList = [];

      const profilesToSync = [state.user.uid];
      if (window.activeProfileContext && window.activeProfileContext !== state.user.uid) {
          profilesToSync.push(window.activeProfileContext);
      }

      const tablesToSync = ['medications', 'disease_ledger', 'history', 'allergies', 'surgeries', 'appointments'];

      for (const targetUid of profilesToSync) {
          for (const table of tablesToSync) {
              const tableRef = collection(firestoreDb, `users/${targetUid}/${table}`);
              const q = query(tableRef);
              
              const unsub = onSnapshot(q, async (snapshot) => {
                  if (snapshot.metadata.hasPendingWrites) return; // Ignore local writes
                  
                  let hasChanges = false;
                  snapshot.docChanges().forEach(change => {
                      if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') hasChanges = true;
                  });
                  
                  if (hasChanges) {
                      console.log(`[OfflinePersistenceManager] Realtime update detected on ${table} for ${targetUid}. Syncing...`);
                      this.synchronize().catch(e => console.error('[OfflinePersistenceManager] Realtime sync error:', e));
                  }
              }, (error) => {
                 console.warn(`[OfflinePersistenceManager] Realtime listener error for ${table}:`, error);
              });
              
              OfflinePersistenceManager._unsubscribeList.push(unsub);
          }
      }
  }
}
