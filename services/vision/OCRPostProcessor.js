/**
 * @fileoverview OCR Post Processor
 * Applies pharma-context character corrections, resolves common OCR confusions,
 * and normalizes metadata (like dosages).
 */

// Simple local fallback for boilerplate tokens if file missing
const BOILERPLATE_TOKENS = [
  'mfg', 'manufactured', 'by', 'batch', 'no', 'exp', 'date', 'mrp', 'rs', 'inclusive', 'of', 'all', 'taxes',
  'lic', 'private', 'limited', 'ltd', 'pvt', 'pharmaceuticals', 'pharma', 'laboratories', 'labs'
];

export class OCRPostProcessor {
  /**
   * Applies all correction layers to raw OCR text.
   * @param {string} rawText 
   * @returns {string} Cleaned text
   */
  static process(rawText) {
    if (!rawText) return '';
    
    let text = rawText;
    
    // 1. Normalize Dosage Strings (e.g., "5Omg" -> "50mg")
    text = text.replace(/(\d+)[Oo]\s*(mg|mcg|ml|g|tablet|capsule)/gi, '$10$2');
    text = text.replace(/(\d+)[Ii]\s*(mg|mcg|ml|g)/gi, '$11$2');
    
    // 2. Common Character Confusions in isolated numeric-like tokens
    // Replace S with 5 if surrounded by numbers, B with 8, etc.
    text = text.replace(/(\d)[Ss](\d)/g, '$15$2');
    text = text.replace(/(\d)[Bb](\d)/g, '$18$2');

    // 3. Trim Boilerplate Tokens
    const words = text.split(/\s+/);
    const cleanedWords = words.filter(w => !BOILERPLATE_TOKENS.includes(w.toLowerCase()));
    text = cleanedWords.join(' ');

    return text.trim();
  }

  /**
   * Fragment recovery (partial OCR stitching)
   * Merges fragmented sub-words like "para" + "cetamol" if they co-occur across frames.
   * @param {Map<string, {score: number, displayVal: string, highestConf: number}>} wordVotes
   */
  static stitchFragments(wordVotes) {
    const keys = Array.from(wordVotes.keys());
    for (let i = 0; i < keys.length; i++) {
      for (let j = 0; j < keys.length; j++) {
        if (i === j) continue;
        const w1 = keys[i];
        const w2 = keys[j];
        
        // If suffix of w1 matches prefix of w2, we merge.
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
  }

  /**
   * Finds length of suffix-prefix overlap between two words.
   * @private
   * @param {string} a - First word
   * @param {string} b - Second word
   * @returns {number} Overlapping characters
   */
  static _getOverlapLength(a, b) {
    const minLen = Math.min(a.length, b.length);
    for (let len = minLen; len > 0; len--) {
      if (a.endsWith(b.slice(0, len))) {
        return len;
      }
    }
    return 0;
  }
}
