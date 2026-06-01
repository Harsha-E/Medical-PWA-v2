/**
 * @fileoverview Strip Pattern Analyzer Service
 * Analyzes repeating text layouts on blister/foil strips to identify
 * repeated medicine brand/generic prints and separate them from single-occurrence metadata.
 */

/**
 * @typedef {Object} RepetitionPattern
 * @property {boolean} isStripPattern - Does the layout match a recurring strip pattern?
 * @property {string|null} dominantTerm - The primary recurring name candidate
 * @property {number} repetitionConfidence - Confidence score of the pattern (0-100)
 * @property {string[]} allRepeatedTerms - All terms that occurred more than once
 */

export default class StripPatternAnalyzer {
  /**
   * Main entry point to evaluate patterns from OCR lines.
   * @param {string[]} ocrLines - Array of raw lines extracted
   * @returns {RepetitionPattern}
   */
  analyzePattern(ocrLines) {
    if (!Array.isArray(ocrLines) || ocrLines.length === 0) {
      return { isStripPattern: false, dominantTerm: null, repetitionConfidence: 0, allRepeatedTerms: [] };
    }

    const allRepeatedTerms = this.detectRepetition(ocrLines);

    if (allRepeatedTerms.length === 0) {
      return { isStripPattern: false, dominantTerm: null, repetitionConfidence: 0, allRepeatedTerms: [] };
    }

    // Identify dominant term (usually the longest repeating word or word sequence)
    let dominantTerm = null;
    let maxLen = 0;
    for (const term of allRepeatedTerms) {
      if (term.length > maxLen) {
        maxLen = term.length;
        dominantTerm = term;
      }
    }

    // Confidence scales with word count and length of repeating terms
    const baseConf = 50;
    const countBonus = Math.min(30, allRepeatedTerms.length * 10);
    const lengthBonus = Math.min(20, maxLen * 2);
    const repetitionConfidence = Math.min(100, baseConf + countBonus + lengthBonus);

    return {
      isStripPattern: true,
      dominantTerm,
      repetitionConfidence,
      allRepeatedTerms
    };
  }

  /**
   * Tokenizes text and detects lexical tokens repeating across lines/blocks.
   * @param {string[]} ocrLines - Text lines
   * @returns {string[]} List of repeating terms (case-insensitive normalized)
   */
  detectRepetition(ocrLines) {
    const termFrequency = new Map();

    // Clean and tokenize lines
    for (const line of ocrLines) {
      const cleanLine = line.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();

      if (cleanLine.length < 3) continue;

      // Extract individual words or short word sequences (bigrams)
      const words = cleanLine.split(/\s+/).filter(w => w.length > 2);
      
      // Track single words
      for (const w of words) {
        termFrequency.set(w, (termFrequency.get(w) || 0) + 1);
      }

      // Track bigrams (two adjacent words, e.g. "dolo 650")
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i+1]}`;
        termFrequency.set(bigram, (termFrequency.get(bigram) || 0) + 1);
      }
    }

    // Filter terms that repeat and are not common noise metadata
    const noiseKeywords = new Set([
      'mg', 'ml', 'tab', 'tablet', 'tablets', 'cap', 'capsule', 'capsules', 
      'mfg', 'lic', 'exp', 'date', 'batch', 'price', 'max', 'retail', 'incl'
    ]);

    const repeatingTerms = [];
    for (const [term, count] of termFrequency.entries()) {
      if (count >= 2 && !noiseKeywords.has(term)) {
        // For bigrams, ensure they are not composed solely of noise
        const parts = term.split(' ');
        if (parts.length > 1 && parts.every(p => noiseKeywords.has(p))) {
          continue;
        }
        repeatingTerms.push(term);
      }
    }

    return repeatingTerms;
  }
}
