/**
 * @fileoverview Accuracy Tracker
 * Tracks real-world OCR & medicine identification performance,
 * recording successes, user overrides/corrections, failures, and confidence benchmarks.
 * Saves/persists data to IndexedDB or localStorage.
 */

/**
 * @typedef {Object} ScanEvent
 * @property {string} sessionId - ID of scan session
 * @property {number} timestamp - Epoch time
 * @property {number} ocrConfidence - Raw OCR confidence score
 * @property {string[]} predictedDrugs - List of matched drugs predicted
 * @property {string[]} correctedDrugs - Actual list of drugs approved by user
 * @property {boolean} isCorrected - Did user override/edit the result?
 * @property {string|null} failureType - Failure category if no match (e.g. 'NO_TEXT', 'NO_MATCH', 'DDI_ABORT')
 */

export default class AccuracyTracker {
  constructor(storageKey = 'medcare_accuracy_metrics') {
    this.storageKey = storageKey;
    
    /** @type {ScanEvent[]} */
    this.events = [];
    this.load();
  }

  /**
   * Records a raw scan attempt before user confirmation.
   * @param {string} sessionId
   * @param {number} ocrConfidence
   * @param {string[]} predictedDrugs
   * @returns {void}
   */
  recordScan(sessionId, ocrConfidence, predictedDrugs) {
    const event = {
      sessionId,
      timestamp: Date.now(),
      ocrConfidence,
      predictedDrugs: predictedDrugs || [],
      correctedDrugs: [],
      isCorrected: false,
      failureType: null
    };
    
    // De-duplicate session scans (update or push)
    const existingIndex = this.events.findIndex(e => e.sessionId === sessionId);
    if (existingIndex !== -1) {
      this.events[existingIndex] = { ...this.events[existingIndex], ...event };
    } else {
      this.events.push(event);
    }
    
    this.save();
  }

  /**
   * Records user verification details (accepted as is, or edited).
   * @param {string} sessionId
   * @param {string[]} finalDrugs - The list of drugs the user actually selected/typed
   * @param {boolean} isUserCorrection - Whether the user changed the prediction
   * @returns {void}
   */
  recordCorrection(sessionId, finalDrugs, isUserCorrection) {
    const event = this.events.find(e => e.sessionId === sessionId);
    if (event) {
      event.correctedDrugs = finalDrugs || [];
      event.isCorrected = isUserCorrection;
      event.failureType = finalDrugs.length === 0 ? 'USER_DISCARDED' : null;
      this.save();
    }
  }

  /**
   * Records a hard failure.
   * @param {string} sessionId
   * @param {string} failureType - Category of failure
   * @returns {void}
   */
  recordFailure(sessionId, failureType) {
    const event = this.events.find(e => e.sessionId === sessionId) || {
      sessionId,
      timestamp: Date.now(),
      ocrConfidence: 0,
      predictedDrugs: [],
      correctedDrugs: [],
      isCorrected: false
    };

    event.failureType = failureType;
    
    const existingIndex = this.events.findIndex(e => e.sessionId === sessionId);
    if (existingIndex === -1) {
      this.events.push(event);
    } else {
      this.events[existingIndex] = event;
    }
    
    this.save();
  }

  /**
   * Generates summary accuracy metrics.
   * @returns {Object} Accuracy report
   */
  getMetrics() {
    const totalSessions = this.events.length;
    if (totalSessions === 0) {
      return { totalSessions: 0, accuracyRate: 0, correctionRate: 0, failureRate: 0, averageOcrConfidence: 0 };
    }

    let successes = 0; // predicted correctly and accepted
    let corrections = 0; // modified by user
    let failures = 0; // no text, user discarded, or completely wrong
    let sumConfidence = 0;

    for (const e of this.events) {
      sumConfidence += e.ocrConfidence;
      if (e.failureType) {
        failures++;
      } else if (e.isCorrected) {
        corrections++;
      } else {
        successes++;
      }
    }

    return {
      totalSessions,
      successCount: successes,
      correctionCount: corrections,
      failureCount: failures,
      accuracyRate: parseFloat(((successes / totalSessions) * 100).toFixed(2)),
      correctionRate: parseFloat(((corrections / totalSessions) * 100).toFixed(2)),
      failureRate: parseFloat(((failures / totalSessions) * 100).toFixed(2)),
      averageOcrConfidence: parseFloat((sumConfidence / totalSessions).toFixed(2))
    };
  }

  /**
   * Exports the entire tracking database as a JSON string.
   * @returns {string} JSON dump of metrics
   */
  exportReport() {
    return JSON.stringify({
      generatedAt: new Date().toISOString(),
      metrics: this.getMetrics(),
      rawEvents: this.events
    }, null, 2);
  }

  /**
   * Persists tracking events to localStorage.
   * @returns {void}
   */
  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.events));
    } catch (e) {
      console.warn('[AccuracyTracker] Failed to persist scan metrics:', e);
    }
  }

  /**
   * Loads tracking events from localStorage.
   * @returns {void}
   */
  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        this.events = JSON.parse(data);
      }
    } catch (e) {
      console.warn('[AccuracyTracker] Failed to load scan metrics:', e);
      this.events = [];
    }
  }

  /**
   * Wipes the local database.
   * @returns {void}
   */
  clear() {
    this.events = [];
    this.save();
  }
}
