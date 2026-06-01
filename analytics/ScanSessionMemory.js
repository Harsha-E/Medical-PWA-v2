/**
 * @fileoverview Scan Session Memory
 * Maintains short-term temporal memory across a scanning session, storing OCR history,
 * bboxes, and drug candidates to assist multi-frame fusion.
 */

/**
 * @typedef {Object} MemoryFrame
 * @property {number} timestamp - Epoch time of frame capture
 * @property {string} rawText - OCR text in the frame
 * @property {number} confidence - OCR engine confidence (0-100)
 * @property {any} [bbox] - Bounding box coordinates
 * @property {any[]} [candidates] - Extracted candidate drug objects/names
 */

export default class ScanSessionMemory {
  /**
   * Initialize Scan Session Memory.
   * @param {Object} [options]
   * @param {number} [options.maxSize=50] - Maximum frames to hold in the rolling buffer
   * @param {number} [options.expiryTime=10000] - Expiry threshold in milliseconds (default 10s)
   */
  constructor(options = {}) {
    this.maxSize = options.maxSize || 50;
    this.expiryTime = options.expiryTime || 10000;
    
    /** @type {MemoryFrame[]} */
    this.frames = [];
    
    /** @type {Map<string, {count: number, lastSeen: number}>} */
    this.candidateFrequency = new Map();
  }

  /**
   * Records a frame's OCR data in session memory.
   * @param {Object} frameData
   * @param {string} frameData.rawText - Raw OCR text
   * @param {number} frameData.confidence - Confidence score
   * @param {any} [frameData.bbox] - Bounding box
   * @param {any[]} [frameData.candidates] - Extracted candidates
   * @returns {void}
   */
  addFrame(frameData) {
    if (!frameData || typeof frameData.rawText !== 'string') return;

    const timestamp = Date.now();
    const newFrame = {
      timestamp,
      rawText: frameData.rawText,
      confidence: typeof frameData.confidence === 'number' ? frameData.confidence : 50,
      bbox: frameData.bbox || null,
      candidates: Array.isArray(frameData.candidates) ? frameData.candidates : []
    };

    // Push and enforce size constraint
    this.frames.push(newFrame);
    if (this.frames.length > this.maxSize) {
      const removed = this.frames.shift();
      if (removed) this._decrementCandidates(removed.candidates);
    }

    // Increment frequencies
    this._incrementCandidates(newFrame.candidates);

    // Auto cleanup expired frames
    this.cleanup();
  }

  /**
   * Retrieves all non-expired frames in memory.
   * @returns {MemoryFrame[]}
   */
  getRecentFrames() {
    this.cleanup();
    return [...this.frames];
  }

  /**
   * Retrieves candidate frequencies across the active session memory.
   * @returns {Array<{name: string, count: number, lastSeen: number}>} Sorted by frequency desc
   */
  getTopCandidates() {
    this.cleanup();
    return Array.from(this.candidateFrequency.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        lastSeen: data.lastSeen
      }))
      .sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen);
  }

  /**
   * Increments the frequency counters for candidate names.
   * @private
   * @param {any[]} candidates
   */
  _incrementCandidates(candidates) {
    const now = Date.now();
    for (const candidate of candidates) {
      const name = typeof candidate === 'string' ? candidate : (candidate.name || '');
      if (!name) continue;

      const normName = name.trim().toLowerCase();
      const current = this.candidateFrequency.get(normName) || { count: 0, lastSeen: now };
      current.count++;
      current.lastSeen = now;
      this.candidateFrequency.set(normName, current);
    }
  }

  /**
   * Decrements frequency counters when a frame falls off the rolling buffer.
   * @private
   * @param {any[]} candidates
   */
  _decrementCandidates(candidates) {
    for (const candidate of candidates) {
      const name = typeof candidate === 'string' ? candidate : (candidate.name || '');
      if (!name) continue;

      const normName = name.trim().toLowerCase();
      const current = this.candidateFrequency.get(normName);
      if (current) {
        current.count--;
        if (current.count <= 0) {
          this.candidateFrequency.delete(normName);
        } else {
          this.candidateFrequency.set(normName, current);
        }
      }
    }
  }

  /**
   * Clean up expired frames that exceed the session temporal window.
   * @returns {void}
   */
  cleanup() {
    const now = Date.now();
    const threshold = now - this.expiryTime;

    while (this.frames.length > 0 && this.frames[0].timestamp < threshold) {
      const expired = this.frames.shift();
      if (expired) {
        this._decrementCandidates(expired.candidates);
      }
    }
  }

  /**
   * Reset/wipe session memory.
   * @returns {void}
   */
  clear() {
    this.frames = [];
    this.candidateFrequency.clear();
  }
}
