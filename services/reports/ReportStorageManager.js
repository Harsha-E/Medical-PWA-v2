/**
 * @fileoverview Report Storage Manager Service
 * Manages uploading report assets to Firebase Storage and saving metadata
 * inside Dexie local DB and Firestore.
 */

import db from '../../core/db.js';
import state from '../../core/state.js';

export default class ReportStorageManager {
  /**
   * Uploads report file and saves record.
   * @param {File} file
   * @param {Object} parsedMeta - Metadata extracted (e.g. title, date, notes, metrics)
   * @returns {Promise<number>} Local IndexedDB record ID
   */
  async saveReport(file, parsedMeta) {
    const userId = state.user?.uid || 'anonymous';
    const dateStr = parsedMeta.date || new Date().toISOString().split('T')[0];
    
    // Save locally to Dexie first
    const record = {
      userId,
      type: 'Report',
      date: dateStr,
      title: parsedMeta.title || file.name,
      provider: parsedMeta.provider || 'Self-Reported',
      notes: parsedMeta.notes || 'Lab report document vault entry',
      metrics: parsedMeta.metrics || {},
      localFileUrl: URL.createObjectURL(file)
    };

    const recordId = await db.history.add(record);

    // If online, upload to storage and firestore in the background
    if (navigator.onLine && state.user) {
      this._uploadBackground(file, recordId, userId, dateStr, record).catch(console.error);
    }

    return recordId;
  }

  /**
   * Background upload routine.
   * @private
   */
  async _uploadBackground(file, recordId, userId, dateStr, record) {
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js')
      .catch(() => ({}));
    const { getFirestore, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')
      .catch(() => ({}));

    if (!uploadBytes || !getFirestore) return;

    try {
      const storage = getStorage();
      const fileRef = ref(storage, `users/${userId}/reports/${recordId}_${file.name}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      // Save metadata to Firestore
      const firestoreDb = getFirestore();
      const docRef = doc(firestoreDb, `users/${userId}/reports`, recordId.toString());
      await setDoc(docRef, {
        ...record,
        id: recordId.toString(),
        remoteFileUrl: downloadURL
      }, { merge: true });

      // Update local record with remote URL
      await db.history.update(recordId, { remoteFileUrl: downloadURL });
      console.log('[ReportStorageManager] Remote report synchronization complete.');
    } catch (e) {
      console.error('[ReportStorageManager] Background upload failed:', e);
    }
  }
}
