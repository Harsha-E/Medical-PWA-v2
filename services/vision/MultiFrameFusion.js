/**
 * @fileoverview Multi-Frame Fusion Service
 * Aggregates and stabilizes OCR outputs over a rolling window of up to 30 frames.
 * Uses weighted voting, outlier filtering, and fragment stitching for higher accuracy.
 */

/**
 * @typedef {Object} FrameOcrOutput
 * @property {string} rawText - Raw OCR text string
 * @property {number} confidence - OCR confidence (0-100)
 * @property {any[]} [candidates] - Candidate matches identified in this single frame
 * @property {number} [timestamp] - Timestamp of frame
 */

/**
 * @typedef {Object} StableScanResult
 * @property {string} stabilizedText - Consolidated stabilized text block
 * @property {string[]} candidates - Sorted candidates by fused score
 * @property {number} fusionConfidence - Calculated fusion reliability score (0-100)
 * @property {number} processedFramesCount - Number of frames utilized
 */

export default class MultiFrameFusion {
  /**
   * Initialize Multi-Frame Fusion engine.
   * @param {Object} [options]
   * @param {number} [options.maxWindowSize=30] - Rolling buffer length
   * @param {number} [options.minConfidenceThreshold=40] - Reject single frame OCR below this
   */
  constructor(options = {}) {
    this.maxWindowSize = options.maxWindowSize || 30;
    this.minConfidenceThreshold = options.minConfidenceThreshold || 40;
    
    /** @type {FrameOcrOutput[]} */
    this.buffer = [];
  }

  /**
   * Adds a new frame's OCR result to the rolling fusion buffer.
   * Filters out outliers (extreme low confidence or empty text when others are populated).
   * @param {FrameOcrOutput} ocrOutput
   * @returns {boolean} True if frame was accepted
   */
  addFrame(ocrOutput) {
    if (!ocrOutput || typeof ocrOutput.rawText !== 'string') return false;

    // 1. Basic confidence filtering
    const confidence = typeof ocrOutput.confidence === 'number' ? ocrOutput.confidence : 50;
    if (confidence < this.minConfidenceThreshold) return false;

    const rawText = ocrOutput.rawText.trim();
    if (rawText.length === 0) return false;

    // 2. Statistical Outlier Detection (check if this frame deviates drastically from rolling average)
    if (this.buffer.length >= 5) {
      const avgLen = this.buffer.reduce((sum, f) => sum + f.rawText.length, 0) / this.buffer.length;
      // If the length of text is less than 20% or more than 500% of rolling average, it might be a blur outlier
      if (rawText.length < avgLen * 0.2 || rawText.length > avgLen * 5.0) {
        return false;
      }
    }

    const frame = {
      rawText,
      confidence,
      candidates: Array.isArray(ocrOutput.candidates) ? ocrOutput.candidates : [],
      timestamp: ocrOutput.timestamp || Date.now()
    };

    this.buffer.push(frame);

    // Roll/slide window
    if (this.buffer.length > this.maxWindowSize) {
      this.buffer.shift();
    }

    return true;
  }

  /**
   * Resets the rolling buffer.
   * @returns {void}
   */
  clear() {
    this.buffer = [];
  }

  /**
   * Fuses all buffered frame data to output a stabilized prediction.
   * @returns {StableScanResult}
   */
  getStableResult() {
    if (this.buffer.length === 0) {
      return { stabilizedText: '', candidates: [], fusionConfidence: 0, processedFramesCount: 0 };
    }

    // 1. Weighted voting of words
    const wordVotes = new Map(); // word -> total weighted vote
    const candidateVotes = new Map(); // candidateName -> total weighted vote

    for (const frame of this.buffer) {
      const weight = frame.confidence / 100;
      
      // Tokenize words
      const words = frame.rawText.split(/[\s,;.+:\-\\/]+/).map(w => w.trim()).filter(w => w.length > 2);
      for (const w of words) {
        const key = w.toLowerCase();
        // Keep capitalization from highest confidence frames
        const current = wordVotes.get(key) || { score: 0, displayVal: w };
        current.score += weight;
        if (frame.confidence > (current.highestConf || 0)) {
          current.displayVal = w;
          current.highestConf = frame.confidence;
        }
        wordVotes.set(key, current);
      }

      // Vote candidates
      for (const cand of frame.candidates) {
        let record = null;
        let confidence = 50;
        if (cand && typeof cand === 'object' && cand.drugRecord) {
          record = cand.drugRecord;
          confidence = cand.matchConfidence || 50;
        } else if (cand && typeof cand === 'object' && cand.name) {
          record = cand;
          confidence = 50;
        } else if (typeof cand === 'string') {
          record = { id: cand.toLowerCase(), name: cand };
          confidence = 50;
        }
        if (!record || !record.id) continue;
        
        const key = record.id.toLowerCase();
        const current = candidateVotes.get(key) || { score: 0, record, maxConf: 0 };
        
        // Weighted vote contribution: frame confidence * candidate match confidence
        const voteContribution = weight * (confidence / 100);
        current.score += voteContribution;
        if (confidence > current.maxConf) {
          current.maxConf = confidence;
        }
        
        candidateVotes.set(key, current);
      }
    }

    // 2. Fragment recovery (partial OCR stitching)
    // Merge fragmented sub-words like "para" + "cetamol" if they co-occur.
    const keys = Array.from(wordVotes.keys());
    for (let i = 0; i < keys.length; i++) {
      for (let j = 0; j < keys.length; j++) {
        if (i === j) continue;
        const w1 = keys[i];
        const w2 = keys[j];
        
        // If w1 + w2 yields a known longer word that exists in some frame or database
        // We look for overlaps: if suffix of w1 matches prefix of w2, we merge.
        const overlapLen = this._getOverlapLength(w1, w2);
        if (overlapLen >= 3) {
          const merged = w1 + w2.slice(overlapLen);
          const v1 = wordVotes.get(w1);
          const v2 = wordVotes.get(w2);
          
          if (v1 && v2) {
            // Create a merged word entry
            wordVotes.set(merged, {
              score: (v1.score + v2.score) * 0.8, // Slight penalty for synthetically stitched word
              displayVal: v1.displayVal + v2.displayVal.slice(overlapLen),
              highestConf: Math.max(v1.highestConf || 0, v2.highestConf || 0)
            });
            // Deprioritize separate components
            v1.score *= 0.2;
            v2.score *= 0.2;
          }
        }
      }
    }

    // 3. Construct Stabilized Text string
    // Sort words by score and keep those above a threshold
    const sortedWords = Array.from(wordVotes.values())
      .filter(item => item.score > 0.4)
      .sort((a, b) => b.score - a.score)
      .map(item => item.displayVal);

    const stabilizedText = sortedWords.join(' ');

    // 4. Sorted candidates list sorted by accumulated vote score
    const sortedCandidates = Array.from(candidateVotes.values())
      .sort((a, b) => b.score - a.score);

    const candidates = sortedCandidates.map(item => item.record.name);
    const bestCandidateRecord = sortedCandidates.length > 0 ? sortedCandidates[0].record : null;

    const report = this.getConfidenceReport();

    return {
      stabilizedText,
      candidates,
      bestCandidateRecord,
      fusionConfidence: report.fusionConfidence,
      processedFramesCount: this.buffer.length
    };
  }

  /**
   * Generates a detailed fusion metrics report.
   * @returns {{fusionConfidence: number, consistencyScore: number, frameAverageConfidence: number}}
   */
  getConfidenceReport() {
    if (this.buffer.length === 0) {
      return { fusionConfidence: 0, consistencyScore: 0, frameAverageConfidence: 0 };
    }

    // Average single-frame confidence
    const avgSingleConf = this.buffer.reduce((sum, f) => sum + f.confidence, 0) / this.buffer.length;

    // Consistency score: are the frames reporting similar text length?
    const lengths = this.buffer.map(f => f.rawText.length);
    const meanLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const devSum = lengths.reduce((sum, len) => sum + Math.abs(len - meanLength), 0);
    const avgDeviation = devSum / lengths.length;
    
    // consistency ranges from 0 to 1
    const consistencyScore = meanLength > 0 ? Math.max(0, 1 - (avgDeviation / meanLength)) : 0;

    // Fusion confidence increases with buffer size (temporal evidence) and consistency
    const temporalFactor = Math.min(1.0, this.buffer.length / 10); // Fully satisfied at 10 frames
    const fusionConfidence = Math.round(
      (avgSingleConf * 0.5) + (consistencyScore * 30) + (temporalFactor * 20)
    );

    return {
      fusionConfidence: Math.max(0, Math.min(100, fusionConfidence)),
      consistencyScore: parseFloat(consistencyScore.toFixed(3)),
      frameAverageConfidence: parseFloat(avgSingleConf.toFixed(2))
    };
  }

  /**
   * Finds length of suffix-prefix overlap between two words.
   * @private
   * @param {string} a - First word
   * @param {string} b - Second word
   * @returns {number} Overlapping characters
   */
  _getOverlapLength(a, b) {
    const minLen = Math.min(a.length, b.length);
    for (let len = minLen; len > 0; len--) {
      if (a.endsWith(b.slice(0, len))) {
        return len;
      }
    }
    return 0;
  }
}
