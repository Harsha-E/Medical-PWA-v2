/**
 * @fileoverview Dataset Sync Manager
 * Schedules incremental updates and fetches of clinical drug catalogs,
 * persisting them to a standalone lightweight Dexie database (MedCareDatasets)
 * to avoid user profile data locks.
 */

import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@4.0.8/dist/dexie.mjs';
import DatasetVersionManager from './DatasetVersionManager.js';

// Define standalone database schema
const datasetsDb = new Dexie('MedCareDatasets');
datasetsDb.version(1).stores({
  cdsco:         'id, name, genericName, category, schedule',
  ayush:         'id, name, type, category, manufacturer',
  nppa:          'id, name, genericName, ceilingPrice',
  janaushadhi:   'id, name, genericName, code, price',
  regional:      'id, name, genericName, manufacturer',
  manufacturers: 'id, name, alias'
});

export default class DatasetSyncManager {
  constructor() {
    this.db = datasetsDb;
    this.versionManager = new DatasetVersionManager();
  }

  /**
   * Syncs a specific dataset offline, updating version maps and backing up records.
   * @param {string} datasetName - Name matching a table (e.g. 'cdsco')
   * @param {string} recordsUrl - HTTP URL to pull updated JSON catalog
   * @param {string} expectedHash - Expected SHA-256 integrity check hash
   * @param {string} newVersion - Target version string (e.g. "v1.2.0")
   * @returns {Promise<boolean>} True if sync was successful
   */
  async sync(datasetName, recordsUrl, expectedHash, newVersion) {
    if (!this.db[datasetName]) {
      console.error(`[DatasetSyncManager] Unknown dataset/table: ${datasetName}`);
      return false;
    }

    try {
      // 1. Fetch catalog
      const response = await fetch(recordsUrl);
      if (!response.ok) throw new Error(`Network returned status: ${response.status}`);
      const records = await response.json();

      // 2. Audit integrity hash
      const isValid = await this.versionManager.verifyIntegrity(records, expectedHash);
      if (!isValid) {
        throw new Error(`Integrity verification failed for ${datasetName}. Checksum mismatch.`);
      }

      // 3. Backup existing records before clearing database (for rollback support)
      const existingRecords = await this.db[datasetName].toArray();
      
      // 4. Overwrite table records
      await this.db.transaction('rw', this.db[datasetName], async () => {
        await this.db[datasetName].clear();
        await this.db[datasetName].bulkAdd(records);
      });

      // 5. Update version control ledger
      this.versionManager.setVersion(datasetName, newVersion, expectedHash, existingRecords);
      console.info(`[DatasetSyncManager] Synergized updates for ${datasetName} successfully!`);
      return true;

    } catch (err) {
      console.error(`[DatasetSyncManager] Failed to sync ${datasetName}:`, err);
      return false;
    }
  }

  /**
   * Performs recovery rollback if a dataset is corrupted.
   * @param {string} datasetName
   * @returns {Promise<boolean>} True if rollback completed
   */
  async rollbackDataset(datasetName) {
    if (!this.db[datasetName]) return false;

    try {
      const backupData = this.versionManager.rollback(datasetName);
      if (!backupData) return false;

      await this.db.transaction('rw', this.db[datasetName], async () => {
        await this.db[datasetName].clear();
        await this.db[datasetName].bulkAdd(backupData);
      });

      return true;
    } catch (e) {
      console.error(`[DatasetSyncManager] Rollback database failed:`, e);
      return false;
    }
  }

  /**
   * Checks if a dataset has been synced.
   * @param {string} datasetName
   * @returns {Promise<boolean>}
   */
  async isSynced(datasetName) {
    if (!this.db[datasetName]) return false;
    const count = await this.db[datasetName].count();
    return count > 0;
  }

  /**
   * Searches for medications across all synced offline datasets.
   * @param {string} query - Medication name query
   * @returns {Promise<Array<{record: Object, source: string}>>} Combined search results
   */
  async searchAllDatasets(query) {
    if (!query || query.trim().length < 3) return [];
    
    const cleanQuery = query.trim().toLowerCase();
    const results = [];

    // Define table search priorities
    const tables = ['regional', 'ayush', 'janaushadhi', 'cdsco'];
    
    for (const table of tables) {
      try {
        const matches = await this.db[table]
          .filter(r => 
            (r.name && r.name.toLowerCase().includes(cleanQuery)) || 
            (r.genericName && r.genericName.toLowerCase().includes(cleanQuery))
          )
          .limit(10)
          .toArray();

        for (const item of matches) {
          results.push({ record: item, source: table });
        }
      } catch (e) {
        console.warn(`[DatasetSyncManager] Search failed on table ${table}:`, e);
      }
    }

    return results;
  }
}
