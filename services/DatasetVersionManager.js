/**
 * @fileoverview Dataset Version Manager
 * Controls versioning, integrity check hashing, database migration states,
 * and rollback snapshots for offline datasets.
 */

export default class DatasetVersionManager {
  /**
   * Initializes version manager.
   * @param {Object} [options]
   * @param {string} [options.storageKey='medcare_dataset_versions']
   */
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'medcare_dataset_versions';
  }

  /**
   * Loads versions ledger.
   * @private
   * @returns {Record<string, {
   *   version: string,
   *   updatedAt: number,
   *   checksum: string,
   *   backupSnapshot: any|null
   * }>}
   */
  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[DatasetVersionManager] Failed to load version metadata:', e);
      return {};
    }
  }

  /**
   * Saves versions ledger.
   * @private
   */
  _save(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('[DatasetVersionManager] Failed to save version metadata:', e);
    }
  }

  /**
   * Retrieves active version of a dataset.
   * @param {string} datasetName
   * @returns {string|null} Version string (e.g. "v1.0.4")
   */
  getCurrentVersion(datasetName) {
    if (!datasetName) return null;
    const ledger = this._load();
    return ledger[datasetName]?.version || null;
  }

  /**
   * Records a new active dataset version.
   * @param {string} datasetName
   * @param {string} version
   * @param {string} checksum - SHA-256 integrity hash
   * @param {any} [backupData] - Backup database records for rollback
   * @returns {void}
   */
  setVersion(datasetName, version, checksum, backupData = null) {
    if (!datasetName || !version) return;

    const ledger = this._load();
    const existing = ledger[datasetName];

    ledger[datasetName] = {
      version,
      updatedAt: Date.now(),
      checksum,
      // Store backup of previous version records if available
      backupSnapshot: backupData || (existing ? existing.backupSnapshot : null)
    };

    this._save(ledger);
  }

  /**
   * Validates dataset payload integrity against expected SHA-256 hash.
   * @param {any[]} records - Dataset records to audit
   * @param {string} expectedHash - Expected SHA-256 string
   * @returns {Promise<boolean>}
   */
  async verifyIntegrity(records, expectedHash) {
    if (!Array.isArray(records) || !expectedHash) return false;
    
    try {
      const encoder = new TextEncoder();
      const stringified = JSON.stringify(records);
      const data = encoder.encode(stringified);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex === expectedHash;
    } catch (e) {
      console.error('[DatasetVersionManager] Integrity audit failed:', e);
      return false;
    }
  }

  /**
   * Drops current active version and restores the backup snapshot.
   * @param {string} datasetName
   * @returns {any|null} The restored backup dataset records, or null if no backup exists
   */
  rollback(datasetName) {
    if (!datasetName) return null;

    const ledger = this._load();
    const entry = ledger[datasetName];

    if (!entry || !entry.backupSnapshot) {
      console.warn(`[DatasetVersionManager] No rollback snapshot found for dataset ${datasetName}`);
      return null;
    }

    const restoredRecords = entry.backupSnapshot;

    // Remove the current entry or restore to previous
    delete ledger[datasetName];
    this._save(ledger);

    console.info(`[DatasetVersionManager] Successfully rolled back ${datasetName}`);
    return restoredRecords;
  }

  /**
   * Clears backup cache of a dataset to reclaim memory.
   * @param {string} datasetName
   * @returns {void}
   */
  clearBackup(datasetName) {
    if (!datasetName) return;
    const ledger = this._load();
    if (ledger[datasetName]) {
      ledger[datasetName].backupSnapshot = null;
      this._save(ledger);
    }
  }

  /**
   * Resets all version records.
   * @returns {void}
   */
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.error('[DatasetVersionManager] Wiping failed:', e);
    }
  }
}
