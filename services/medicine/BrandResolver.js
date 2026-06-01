/**
 * @fileoverview Brand Resolver Service
 * Resolves brand names from OCR raw blocks using normalization,
 * repetition cleaning, and dataset fuzzy evaluation.
 */

import AliasResolver from './AliasResolver.js';

/**
 * @typedef {Object} BrandMatch
 * @property {string} brandName - Fused brand candidate name
 * @property {number} confidence - Rating score (0-100)
 * @property {any} [matchedRecord] - Underling matching database record
 */

export default class BrandResolver {
  constructor() {
    this.aliasResolver = new AliasResolver();
  }

  /**
   * Cleans and normalizes a brand name.
   * @param {string} name - Brand name raw text
   * @returns {string}
   */
  normalizeBrand(name) {
    if (!name) return '';
    // Normalize punctuation, numbers and convert lowercase
    return this.aliasResolver.normalizeText(name)
      .replace(/[^a-zA-Z0-9\s\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Evaluates brand name candidates from OCR text block against a dataset.
   * @param {string} ocrText - Entire stabilized frame text or line
   * @param {any[]} medicineDataset - Master drug list to search
   * @returns {BrandMatch|null} The resolved brand, or null
   */
  resolveBrand(ocrText, medicineDataset) {
    if (!ocrText || !Array.isArray(medicineDataset)) return null;

    const cleanedText = this.aliasResolver.normalizeText(ocrText);
    
    // Split into segments
    const lines = cleanedText.split(/[\n,;]/);
    const candidates = [];

    // Parse potential brand candidate strings
    for (const line of lines) {
      const words = line.split(/\s+/).map(w => w.trim()).filter(w => w.length > 2);
      if (words.length === 0) continue;

      // Blister strip repetition handler: e.g. "DOLO DOLO DOLO" -> "DOLO"
      const uniqueWords = [];
      const wordSet = new Set();
      for (const w of words) {
        if (!wordSet.has(w.toLowerCase())) {
          wordSet.add(w.toLowerCase());
          uniqueWords.push(w);
        }
      }
      
      const candidatePhrase = uniqueWords.join(' ');
      
      // Clean candidate of pure dosages (e.g. "Dolo 650mg" -> "Dolo")
      const cleanCandidate = candidatePhrase
        .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|tab|cap)\b/gi, '')
        .trim();

      if (cleanCandidate.length > 2) {
        candidates.push(cleanCandidate);
      }
    }

    if (candidates.length === 0) return null;

    let bestMatch = null;
    let highestScore = 0;

    for (const cand of candidates) {
      const normCand = this.normalizeBrand(cand);
      
      for (const record of medicineDataset) {
        const brandNames = record.brandNames || (record.brandName ? [record.brandName] : []);
        
        for (const brand of brandNames) {
          const normBrand = this.normalizeBrand(brand);
          const score = this._calculateSimilarity(normCand, normBrand);
          
          if (score > highestScore) {
            highestScore = score;
            bestMatch = {
              brandName: brand,
              confidence: Math.round(score * 100),
              matchedRecord: record
            };
          }
        }
      }
    }

    // Return if match is above a minimum similarity threshold
    return highestScore >= 0.65 ? bestMatch : null;
  }

  /**
   * Helper calculation for Jaro-Winkler/Levenshtein distance similarity.
   * Returns a score between 0.0 (no match) and 1.0 (exact match).
   * @private
   * @param {string} s1
   * @param {string} s2
   * @returns {number}
   */
  _calculateSimilarity(s1, s2) {
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) {
      // Substring bonus
      const ratio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
      return 0.7 + (ratio * 0.25);
    }

    // Simple Levenshtein distance
    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    const distance = track[s2.length][s1.length];
    const maxLen = Math.max(s1.length, s2.length);
    return maxLen === 0 ? 1.0 : 1.0 - (distance / maxLen);
  }
}
