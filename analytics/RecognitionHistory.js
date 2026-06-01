/**
 * @fileoverview Recognition History Service — Medicine Intelligence Ledger
 * Stores spelling corrections, tracks scanning error analytics, and persists
 * frequency and recency weights to compute scans acceleration boosts.
 */

export default class RecognitionHistory {
  /**
   * Initializes the long-term recognition ledger.
   * @param {Object} [options]
   * @param {string} [options.storageKey='medcare_recognition_ledger']
   * @param {number} [options.recencyWindow=86400000] - 24 hours in ms
   */
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'medcare_recognition_ledger';
    this.recencyWindow = options.recencyWindow || 24 * 60 * 60 * 1000;
  }

  /**
   * Loads ledger structure from local storage.
   * @private
   * @returns {{
   *   corrections: Record<string, string>,
   *   statistics: Record<string, {scans: number, corrections: number, uncertains: number, lastScanned: number}>
   * }}
   */
  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          corrections: parsed.corrections || {},
          statistics: parsed.statistics || {}
        };
      }
    } catch (e) {
      console.warn('[RecognitionHistory] Failed to load ledger:', e);
    }
    return { corrections: {}, statistics: {} };
  }

  /**
   * Saves ledger structure to local storage.
   * @private
   */
  _save(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('[RecognitionHistory] Failed to save ledger:', e);
    }
  }

  /**
   * Registers a manual correction from the user, learning the spelling mapping.
   * @param {string} rawOcrText - The text scanned in OCR
   * @param {string} correctedText - The text confirmed/selected by user
   * @returns {void}
   */
  recordCorrection(rawOcrText, correctedText) {
    if (!rawOcrText || !correctedText) return;

    const rawKey = rawOcrText.trim().toLowerCase();
    const corrVal = correctedText.trim();
    const ledger = this._load();

    // 1. Learn the spelling mapping if different
    if (rawKey !== corrVal.toLowerCase()) {
      ledger.corrections[rawKey] = corrVal;
    }

    // 2. Log correction statistics
    if (!ledger.statistics[rawKey]) {
      ledger.statistics[rawKey] = { scans: 1, corrections: 1, uncertains: 0, lastScanned: Date.now() };
    } else {
      ledger.statistics[rawKey].corrections += 1;
      ledger.statistics[rawKey].scans += 1;
      ledger.statistics[rawKey].lastScanned = Date.now();
    }

    this._save(ledger);
  }

  /**
   * Records a raw scan attempt and updates frequency stats.
   * @param {string} medicineName - Scanned medicine brand or generic name
   * @param {boolean} [isUncertain=false] - Was the scan confidence low?
   * @returns {void}
   */
  recordMatch(medicineName, isUncertain = false) {
    if (!medicineName) return;

    const nameKey = medicineName.trim().toLowerCase();
    const ledger = this._load();
    const now = Date.now();

    if (!ledger.statistics[nameKey]) {
      ledger.statistics[nameKey] = {
        scans: 1,
        corrections: 0,
        uncertains: isUncertain ? 1 : 0,
        lastScanned: now
      };
    } else {
      ledger.statistics[nameKey].scans += 1;
      ledger.statistics[nameKey].lastScanned = now;
      if (isUncertain) {
        ledger.statistics[nameKey].uncertains += 1;
      }
    }

    this._save(ledger);
  }

  /**
   * Intercepts OCR text and checks if a learned correction mapping exists.
   * @param {string} ocrText
   * @returns {string} The learned mapped correction if it exists, or the original text
   */
  getLearnedCorrection(ocrText) {
    if (!ocrText) return '';
    const clean = ocrText.trim().toLowerCase();
    const ledger = this._load();
    return ledger.corrections[clean] || ocrText;
  }

  /**
   * Calculates a recognition boost score for a medicine name.
   * Boost:
   * - Recency: +15% if scanned in last 24 hours.
   * - Frequency: +5% per past scan count, capped at +15%.
   * Total boost capped at +30%.
   * @param {string} medicineName - Candidate name
   * @returns {number} Boost percentage (0-30)
   */
  getBoost(medicineName) {
    if (!medicineName) return 0;

    const nameKey = medicineName.trim().toLowerCase();
    const ledger = this._load();
    const stats = ledger.statistics[nameKey];

    if (!stats) return 0;

    let boost = 0;
    const now = Date.now();

    // 1. Recency Boost
    if (now - stats.lastScanned <= this.recencyWindow) {
      boost += 15;
    }

    // 2. Frequency Boost
    boost += Math.min(15, stats.scans * 5);

    return Math.min(30, boost);
  }

  /**
   * Returns list of most frequently corrected medicine scans (identifies OCR errors).
   * @returns {Array<{name: string, count: number}>}
   */
  getMostMisread() {
    const ledger = this._load();
    return Object.entries(ledger.statistics)
      .filter(([_, s]) => s.corrections > 0)
      .map(([name, s]) => ({ name, count: s.corrections }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Returns list of most frequently scanned medicines.
   * @returns {Array<{name: string, count: number}>}
   */
  getMostCorrected() {
    return this.getMostMisread(); // Syntactic link
  }

  /**
   * Returns list of scans that are most uncertain.
   * @returns {Array<{name: string, count: number}>}
   */
  getMostUncertain() {
    const ledger = this._load();
    return Object.entries(ledger.statistics)
      .filter(([_, s]) => s.uncertains > 0)
      .map(([name, s]) => ({ name, count: s.uncertains }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Resets ledger data.
   * @returns {void}
   */
  clear() {
    this._save({ corrections: {}, statistics: {} });
  }
}
