/**
 * @fileoverview Storage Manager Service
 * Orchestrates file and data operations across Firestore, Firebase Storage,
 * local Dexie IndexedDB, and browser Cache Storage.
 */

import db from '../../core/db.js';
import state from '../../core/state.js';

export default class StorageManager {
  /**
   * Uploads an image or document file to Firebase Storage.
   * @param {File|Blob} file - The file to upload
   * @param {string} path - Remote storage path (e.g. 'users/uid/reports/filename')
   * @returns {Promise<string>} Download URL of the uploaded file
   */
  async uploadFile(file, path) {
    if (!state.user) throw new Error('[StorageManager] User is not authenticated.');
    
    // Fallback if Firebase SDK is not loaded or for offline testing
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js')
      .catch(() => ({}));

    if (!uploadBytes) {
      console.warn('[StorageManager] Firebase Storage not available, using offline blob simulation.');
      return URL.createObjectURL(file);
    }

    try {
      const storage = getStorage();
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (e) {
      console.error('[StorageManager] File upload failed:', e);
      throw e;
    }
  }

  /**
   * Cache a machine learning model or dataset file locally using Cache Storage.
   * @param {string} url - URL of the asset
   * @returns {Promise<Response>} Cached response
   */
  async cacheAsset(url) {
    try {
      const cache = await caches.open('medcare-assets-v1');
      let response = await cache.match(url);
      if (!response) {
        await cache.add(url);
        response = await cache.match(url);
      }
      return response;
    } catch (e) {
      console.warn('[StorageManager] Cache storage error:', e);
      return fetch(url);
    }
  }

  /**
   * Saves a prescription record locally in Dexie IndexedDB.
   * @param {Object} prescription
   * @param {Blob} [imageBlob]
   * @returns {Promise<number>} Record ID
   */
  async saveLocalPrescription(prescription, imageBlob = null) {
    const userId = state.user?.uid || 'anonymous';
    const record = {
      userId,
      date: prescription.date || new Date().toISOString().split('T')[0],
      rawText: prescription.rawText || '',
      imageBlob: imageBlob,
      doctorName: prescription.doctorName || null
    };
    return db.prescriptions.add(record);
  }

  /**
   * Retrieves all locally saved prescriptions for the current user.
   * @returns {Promise<Object[]>}
   */
  async getLocalPrescriptions() {
    const userId = state.user?.uid || 'anonymous';
    return db.prescriptions.where('userId').equals(userId).toArray();
  }
}
