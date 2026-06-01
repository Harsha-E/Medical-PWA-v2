/**
 * @fileoverview Feature Discovery Engine Service
 * Progressively introduces complex features (like the Vision Scanner or PDF Telemetry)
 * only after the user has successfully configured basic medicine schedules.
 */

import db from '../../core/db.js';
import state from '../../core/state.js';

export default class FeatureDiscoveryEngine {
  constructor(storageKey = 'medcare_discovered_features') {
    this.storageKey = storageKey;
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  _save(discovered) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(discovered));
    } catch (e) {}
  }

  /**
   * Evaluates if a feature should be highlighted for discovery.
   * @param {string} featureName - e.g. 'scanner', 'export-pdf'
   * @returns {Promise<boolean>} True if the feature is unlocked and hasn't been shown yet
   */
  async shouldDiscover(featureName) {
    const discovered = this._load();
    if (discovered.includes(featureName)) return false;

    const userId = state.user?.uid || 'anonymous';
    const meds = await db.medications.where('userId').equals(userId).toArray();

    if (featureName === 'scanner') {
      // Unlocks scanner only after user has at least 1 medication added manually first
      return meds.length >= 1;
    }

    if (featureName === 'export-pdf') {
      // Unlocks export only after user has logged at least 3 doses in calendar
      const doses = await db.doses.where('userId').equals(userId).toArray();
      return doses.length >= 3;
    }

    return false;
  }

  /**
   * Marks a feature as discovered.
   * @param {string} featureName
   */
  markAsDiscovered(featureName) {
    const discovered = this._load();
    if (!discovered.includes(featureName)) {
      discovered.push(featureName);
      this._save(discovered);
    }
  }
}
