/**
 * @fileoverview Manufacturer Resolver Service
 * Identifies drug manufacturers from OCR snippets, supporting major Indian pharma
 * players and regional state suppliers.
 */

import { resolveRegionalManufacturer } from '../../datasets/regional/regional-manufacturers.js';
import { MANUFACTURER_ALIASES } from '../../datasets/aliases/manufacturer-aliases.js';

/**
 * @typedef {Object} ManufacturerMatch
 * @property {string} manufacturerName - Official manufacturer name
 * @property {number} confidence - Classification confidence score (0-100)
 * @property {boolean} isRegional - Did it match a regional-specific entity?
 */

export default class ManufacturerResolver {
  /**
   * Normalizes a manufacturer string.
   * @param {string} name
   * @returns {string}
   */
  normalizeManufacturer(name) {
    if (!name) return '';
    return name.trim().toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Identifies manufacturer in OCR text.
   * @param {string} ocrText - Text extracted from scanner
   * @returns {ManufacturerMatch|null} Resolved manufacturer, or null
   */
  resolveManufacturer(ocrText) {
    if (!ocrText || typeof ocrText !== 'string') return null;

    const lines = ocrText.split(/[\n,;]/);
    
    let bestMatch = null;
    let highestScore = 0;
    let isRegional = false;

    // Scan line-by-line first (manufacturers usually occupy their own line or corner)
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.length < 3) continue;

      // 1. Try regional database resolver
      const regionalResolved = resolveRegionalManufacturer(cleanLine);
      if (regionalResolved) {
        const score = this._calculateConfidence(cleanLine, regionalResolved);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = regionalResolved;
          isRegional = true;
        }
      }
      
      // 2. Try matching corporate suffixes (e.g. "by cipla", "mfg. by: lupin")
      const mfgPrefixMatch = cleanLine.match(/(?:mfg|manufactured|marketed|mfd)?\s*(?:by|for)?\s*:\s*([a-z0-9\s.\']+)/i);
      if (mfgPrefixMatch) {
        const candidate = mfgPrefixMatch[1].trim();
        const resolved = resolveRegionalManufacturer(candidate);
        if (resolved) {
          const score = this._calculateConfidence(candidate, resolved) + 15; // Bonus for explicit prefix trigger
          const finalScore = Math.min(100, score);
          if (finalScore > highestScore) {
            highestScore = finalScore;
            bestMatch = resolved;
            isRegional = Object.keys(MANUFACTURER_ALIASES).includes(resolved) === false; // check if it's regional
          }
        }
      }
    }

    if (bestMatch && highestScore >= 50) {
      return {
        manufacturerName: bestMatch,
        confidence: highestScore,
        isRegional
      };
    }

    return null;
  }

  /**
   * Helper to calculate a confidence rating based on how closely the OCR matched the target.
   * @private
   * @param {string} input - The OCR candidate text segment
   * @param {string} official - The resolved official name
   * @returns {number}
   */
  _calculateConfidence(input, official) {
    const cleanIn = this.normalizeManufacturer(input);
    const cleanOff = this.normalizeManufacturer(official);

    if (cleanIn === cleanOff) return 100;
    if (cleanIn.includes(cleanOff) || cleanOff.includes(cleanIn)) return 85;

    // Word boundary match
    const wordsIn = new Set(cleanIn.split(/\s+/));
    const wordsOff = new Set(cleanOff.split(/\s+/));
    let intersection = 0;
    for (const w of wordsIn) {
      if (wordsOff.has(w)) intersection++;
    }

    if (intersection > 0) {
      const matchRate = intersection / Math.max(wordsIn.size, wordsOff.size);
      return Math.round(60 + (matchRate * 25));
    }

    return 40; // Default low match score
  }
}
