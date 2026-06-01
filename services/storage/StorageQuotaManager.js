/**
 * @fileoverview Storage Quota Manager Service
 * Monitors browser storage estimates (IndexedDB & Cache Storage) to prevent failures
 * due to running out of local device storage space.
 */

export default class StorageQuotaManager {
  /**
   * Retrieves current disk storage usage and limit in bytes.
   * @returns {Promise<{usage: number, quota: number, percentageUsed: number}>}
   */
  async getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentageUsed = quota > 0 ? parseFloat(((usage / quota) * 100).toFixed(2)) : 0;
        return { usage, quota, percentageUsed };
      } catch (e) {
        console.warn('[StorageQuotaManager] Failed to get storage estimate:', e);
      }
    }
    return { usage: 0, quota: 0, percentageUsed: 0 };
  }

  /**
   * Checks if local storage usage exceeds a warning threshold (e.g. 80%).
   * @param {number} [warningThresholdPercent=80]
   * @returns {Promise<boolean>} True if running low on storage space
   */
  async isStorageRunningLow(warningThresholdPercent = 80) {
    const estimate = await this.getStorageEstimate();
    return estimate.percentageUsed >= warningThresholdPercent;
  }
}
