/**
 * @fileoverview Text Region Ranker
 * Prioritizes OCR text regions based on heuristic scoring to identify blocks
 * that most likely represent the primary medicine names (brand or generic).
 */

/**
 * @typedef {Object} OcrRegion
 * @property {string} text - Raw OCR text block
 * @property {number} confidence - OCR confidence score (0-100)
 * @property {Object} [bbox] - Bounding box coordinates
 * @property {number} [bbox.x0]
 * @property {number} [bbox.y0]
 * @property {number} [bbox.x1]
 * @property {number} [bbox.y1]
 */

/**
 * @typedef {Object} RankedRegion
 * @property {OcrRegion} region - The original region
 * @property {number} score - Heuristic likelihood score (0 to 1+)
 */

export default class TextRegionRanker {
  /**
   * Scores a single OCR region based on text features and spatial proximity context.
   * @param {OcrRegion} region - The region to score
   * @param {Object} [context] - Context from other regions
   * @param {string[]} [context.knownDosages] - Dosages extracted in the frame
   * @param {string[]} [context.knownManufacturers] - Manufacturers extracted in the frame
   * @returns {number} Normalized score between 0.0 and 1.0 (can exceed 1.0 for high matches)
   */
  calculateRegionScore(region, context = {}) {
    if (!region || typeof region.text !== 'string') return 0;
    
    const text = region.text.trim();
    if (text.length < 3 || text.length > 50) return 0; // Medicine names are usually 3-30 chars

    let score = 0.2; // Base score for any sensible length word

    // 1. Length Heuristics (Optimal brand names are 5-15 characters)
    if (text.length >= 5 && text.length <= 15) {
      score += 0.15;
    }

    // 2. Uppercase ratio (Pharma names on packaging are heavily capitalized)
    const letters = text.replace(/[^A-Za-z]/g, '');
    if (letters.length > 0) {
      const uppercaseCount = letters.split('').filter(c => c === c.toUpperCase()).length;
      const upperRatio = uppercaseCount / letters.length;
      if (upperRatio === 1.0) {
        score += 0.25; // All caps (e.g. "DOLO 650")
      } else if (upperRatio > 0.5) {
        score += 0.15; // Mostly capitalized
      } else if (text[0] === text[0].toUpperCase()) {
        score += 0.1;  // Title case
      }
    }

    // 3. Noise reduction (Ignore pure numbers, common labels, or special characters only)
    if (/^\d+$/.test(text)) return 0; // Pure numbers
    if (/^[^\w\s]+$/.test(text)) return 0; // Pure symbols
    if (/\b(?:batch|mfg|exp|expiry|date|lic|price|mr|m\.r\.p|rs|tax|lot|no)\b/i.test(text)) {
      return 0.05; // Lower score heavily for metadata lines
    }

    // 4. Proximity or combination with dosage indicators (e.g. "500mg", "10ml")
    const hasDosageUnit = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g)\b/i.test(text);
    if (hasDosageUnit) {
      // The region itself contains a dosage. This is great context!
      score += 0.2;
    }

    // If we have overall context of extracted dosages, check if this text is adjacent or contains them
    if (context.knownDosages && context.knownDosages.length > 0) {
      for (const dosage of context.knownDosages) {
        if (text.toLowerCase().includes(dosage.toLowerCase())) {
          score += 0.25;
        }
      }
    }

    // 5. Proximity or combination with manufacturer terms (e.g. "Cipla", "Laboratories")
    const hasMfgKeyword = /\b(?:ltd|limited|labs|laboratories|pharma|pharmaceuticals)\b/i.test(text);
    if (hasMfgKeyword) {
      // It's a manufacturer line, which means it itself is not the drug name, but has high structural meaning.
      // We grade it lower as a *medicine name* candidate but higher in the system as a manufacturer.
      score -= 0.1;
    }

    if (context.knownManufacturers && context.knownManufacturers.length > 0) {
      for (const mfg of context.knownManufacturers) {
        if (text.toLowerCase().includes(mfg.toLowerCase())) {
          score -= 0.15; // Probably a manufacturer label rather than the brand/drug name
        }
      }
    }

    // 6. Repetition check (Strips repeat brand names)
    // If word contains duplicates, e.g. "DOLO DOLO" or "PAN PAN"
    const words = text.split(/\s+/);
    if (words.length > 1) {
      const uniqueWords = new Set(words.map(w => w.toLowerCase()));
      if (uniqueWords.size < words.length) {
        score += 0.15; // Repetitive words indicate a strip pattern
      }
    }

    // 7. OCR Confidence scaling
    const confidenceWeight = typeof region.confidence === 'number' ? region.confidence / 100 : 0.8;
    score *= (0.5 + 0.5 * confidenceWeight); // Scale score by confidence but don't zero it completely

    return Math.max(0, parseFloat(score.toFixed(3)));
  }

  /**
   * Sorts and filters OCR regions, prioritizing candidates most likely to be medicine names.
   * @param {OcrRegion[]} regions - Unstructured list of OCR blocks
   * @param {Object} [context] - Context options
   * @returns {RankedRegion[]} Sorted list of regions with scores
   */
  rank(regions, context = {}) {
    if (!Array.isArray(regions)) {
      throw new Error('[TextRegionRanker] Invalid input: regions must be an array.');
    }

    // Pre-calculate context details if not provided
    const computedContext = {
      knownDosages: context.knownDosages || [],
      knownManufacturers: context.knownManufacturers || []
    };

    if (!context.knownDosages) {
      // Scan all text to extract possible dosages for context
      const dosageRegex = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g)\b/gi;
      for (const r of regions) {
        const matches = r.text.match(dosageRegex);
        if (matches) computedContext.knownDosages.push(...matches);
      }
    }

    return regions
      .map(region => ({
        region,
        score: this.calculateRegionScore(region, computedContext)
      }))
      // Filter out completely non-relevant noise (score of 0)
      .filter(item => item.score > 0.05)
      // Sort highest score first
      .sort((a, b) => b.score - a.score);
  }
}
