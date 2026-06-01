/**
 * @fileoverview Household Medicine Registry
 * Manages local household medicine graphs, mapping medications to family members
 * (e.g. Father, Mother), and tracks overall scan frequency.
 * Awards scan confidence boost (+8 points) for detected household medicines.
 */

export default class HouseholdMedicineRegistry {
  /**
   * Initializes the registry.
   * @param {Object} [options]
   * @param {string} [options.storageKey='medcare_household_registry']
   * @param {number} [options.commonThreshold=5] - Number of scans to be considered common
   */
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'medcare_household_registry';
    this.commonThreshold = options.commonThreshold || 5;
  }

  /**
   * Loads registry state from local storage.
   * @private
   * @returns {{
   *   scanCounts: Record<string, number>,
   *   members: Record<string, string[]>
   * }}
   */
  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          scanCounts: parsed.scanCounts || {},
          members: parsed.members || {}
        };
      }
    } catch (e) {
      console.warn('[HouseholdMedicineRegistry] Failed to load data:', e);
    }
    return { scanCounts: {}, members: {} };
  }

  /**
   * Saves registry state to local storage.
   * @private
   * @param {Object} data
   * @returns {void}
   */
  _save(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('[HouseholdMedicineRegistry] Failed to save data:', e);
    }
  }

  /**
   * Records a scan check for a drug. Increments global scan count.
   * @param {string} medicineName - Normalized medicine name
   * @returns {void}
   */
  recordScan(medicineName) {
    if (!medicineName || typeof medicineName !== 'string') return;
    const nameKey = medicineName.trim().toLowerCase();
    const data = this._load();

    data.scanCounts[nameKey] = (data.scanCounts[nameKey] || 0) + 1;
    this._save(data);
  }

  /**
   * Links a medication to a household member.
   * @param {string} memberName - e.g. "Father", "Mother"
   * @param {string} medicineName - Medication brand or generic name
   * @returns {void}
   */
  associateMemberMedicine(memberName, medicineName) {
    if (!memberName || !medicineName) return;
    const mKey = memberName.trim();
    const medKey = medicineName.trim();
    
    const data = this._load();
    if (!data.members[mKey]) {
      data.members[mKey] = [];
    }

    if (!data.members[mKey].includes(medKey)) {
      data.members[mKey].push(medKey);
    }

    // Also record it as scanned
    const normMed = medKey.toLowerCase();
    data.scanCounts[normMed] = (data.scanCounts[normMed] || 0) + 1;

    this._save(data);
  }

  /**
   * Unlinks a medication from a household member.
   * @param {string} memberName
   * @param {string} medicineName
   * @returns {void}
   */
  disassociateMemberMedicine(memberName, medicineName) {
    if (!memberName || !medicineName) return;
    const mKey = memberName.trim();
    const medKey = medicineName.trim();
    
    const data = this._load();
    if (data.members[mKey]) {
      data.members[mKey] = data.members[mKey].filter(m => m !== medKey);
      this._save(data);
    }
  }

  /**
   * Retrieves medications associated with a member.
   * @param {string} memberName
   * @returns {string[]} List of medications
   */
  getMemberMedicines(memberName) {
    if (!memberName) return [];
    const data = this._load();
    return data.members[memberName.trim()] || [];
  }

  /**
   * Returns scan frequency count for a medicine.
   * @param {string} medicineName
   * @returns {number}
   */
  getScanCount(medicineName) {
    if (!medicineName) return 0;
    const nameKey = medicineName.trim().toLowerCase();
    const data = this._load();
    return data.scanCounts[nameKey] || 0;
  }

  /**
   * Check if medicine is a common household item and return confidence boost.
   * Boost: +8 confidence points if scan count >= commonThreshold.
   * @param {string} medicineName
   * @returns {number} Boost points (0 or 8)
   */
  getBoost(medicineName) {
    if (!medicineName) return 0;
    const count = this.getScanCount(medicineName);
    return count >= this.commonThreshold ? 8 : 0;
  }

  /**
   * Returns lists of members who take this drug.
   * @param {string} medicineName
   * @returns {string[]}
   */
  getAssociatedMembers(medicineName) {
    if (!medicineName) return [];
    const medLower = medicineName.trim().toLowerCase();
    const data = this._load();
    const associated = [];

    for (const [member, meds] of Object.entries(data.members)) {
      if (meds.some(m => m.toLowerCase() === medLower)) {
        associated.push(member);
      }
    }
    return associated;
  }

  /**
   * Wipes the registry.
   * @returns {void}
   */
  clear() {
    this._save({ scanCounts: {}, members: {} });
  }
}
