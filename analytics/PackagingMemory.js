/**
 * @fileoverview Packaging Memory Service
 * Stores and queries layout signature profiles (visual patterns, line layouts, line densities)
 * of previously scanned medicines to verify layouts.
 */

export default class PackagingMemory {
  /**
   * Initialize Packaging Memory.
   * @param {Object} [options]
   * @param {string} [options.storageKey='medcare_packaging_memory']
   */
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'medcare_packaging_memory';
  }

  /**
   * Loads layout records from local storage.
   * @private
   * @returns {Record<string, Object[]>} Map of medicineId -> array of layout signatures
   */
  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[PackagingMemory] Failed to load packaging signatures:', e);
      return {};
    }
  }

  /**
   * Saves layout records to local storage.
   * @private
   * @param {Record<string, Object[]>} data
   * @returns {void}
   */
  _save(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('[PackagingMemory] Failed to save packaging signatures:', e);
    }
  }

  /**
   * Stores a visual and spatial fingerprint layout of a medicine.
   * @param {string} medicineId - Unique medicine ID
   * @param {Object} fingerprint
   * @param {string} [fingerprint.imageHash] - Optional visual image hash
   * @param {string} fingerprint.manufacturer - Resolved manufacturer
   * @param {number} fingerprint.textLineCount - Number of text lines
   * @param {Array<{x0:number, y0:number, x1:number, y1:number}>} fingerprint.normalizedBoxes - Normalized relative boxes
   * @returns {void}
   */
  saveSignature(medicineId, fingerprint) {
    if (!medicineId || !fingerprint) return;

    const data = this._load();
    if (!data[medicineId]) {
      data[medicineId] = [];
    }

    const newSignature = {
      timestamp: Date.now(),
      imageHash: fingerprint.imageHash || null,
      manufacturer: fingerprint.manufacturer || '',
      textLineCount: fingerprint.textLineCount || 0,
      normalizedBoxes: fingerprint.normalizedBoxes || [],
      patternSignature: this._generatePatternSignature(fingerprint.normalizedBoxes)
    };

    // Cap at 3 signatures per medicine to prevent bloat
    data[medicineId].push(newSignature);
    if (data[medicineId].length > 3) {
      data[medicineId].shift();
    }

    this._save(data);
  }

  /**
   * Compares current OCR layout bounding boxes against known patterns.
   * @param {Array<{bbox: Object, text: string}>} regions - Current frame OCR regions
   * @param {string} [manufacturer] - Current resolved manufacturer
   * @returns {Array<{medicineId: string, matchScore: number}>} Scored layout matches (0-100)
   */
  matchSignature(regions, manufacturer = '') {
    if (!Array.isArray(regions) || regions.length === 0) return [];

    const normBoxes = this._extractNormalizedBoxes(regions);
    const currentPattern = this._generatePatternSignature(normBoxes);
    const data = this._load();
    const results = [];

    for (const [medicineId, signatures] of Object.entries(data)) {
      let maxScore = 0;
      
      for (const sig of signatures) {
        let score = 0;

        // 1. Manufacturer match bonus
        if (manufacturer && sig.manufacturer && 
            (manufacturer.toLowerCase().includes(sig.manufacturer.toLowerCase()) || 
             sig.manufacturer.toLowerCase().includes(manufacturer.toLowerCase()))) {
          score += 30;
        }

        // 2. Line count similarity
        const lineCountDiff = Math.abs(regions.length - sig.textLineCount);
        const countBonus = Math.max(0, 30 - (lineCountDiff * 10));
        score += countBonus;

        // 3. Jaccard string similarity of pattern signature strings
        const patternSim = this._getStringSimilarity(currentPattern, sig.patternSignature);
        score += patternSim * 40;

        if (score > maxScore) {
          maxScore = score;
        }
      }

      if (maxScore >= 50) {
        results.push({ medicineId, matchScore: Math.round(maxScore) });
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Extracts layout normalized box sizes (relative widths/heights).
   * @private
   */
  _extractNormalizedBoxes(regions) {
    // Find boundary coordinates of all boxes combined
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of regions) {
      if (r.bbox) {
        minX = Math.min(minX, r.bbox.x0);
        minY = Math.min(minY, r.bbox.y0);
        maxX = Math.max(maxX, r.bbox.x1);
        maxY = Math.max(maxY, r.bbox.y1);
      }
    }

    const width = maxX - minX;
    const height = maxY - minY;

    if (width <= 0 || height <= 0) return [];

    return regions
      .filter(r => r.bbox)
      .map(r => ({
        x0: parseFloat(((r.bbox.x0 - minX) / width).toFixed(2)),
        y0: parseFloat(((r.bbox.y0 - minY) / height).toFixed(2)),
        x1: parseFloat(((r.bbox.x1 - minX) / width).toFixed(2)),
        y1: parseFloat(((r.bbox.y1 - minY) / height).toFixed(2))
      }));
  }

  /**
   * Encodes normalized boxes spatial sequence into a signature string.
   * @private
   */
  _generatePatternSignature(normBoxes) {
    if (!normBoxes || normBoxes.length === 0) return '';
    // Sort boxes vertically
    const sorted = [...normBoxes].sort((a, b) => a.y0 - b.y0);
    return sorted.map(b => {
      const w = Math.round((b.x1 - b.x0) * 10);
      const h = Math.round((b.y1 - b.y0) * 10);
      const x = Math.round(b.x0 * 10);
      return `${x}-${w}-${h}`;
    }).join('|');
  }

  /**
   * Helper calculation for basic similarity.
   * @private
   */
  _getStringSimilarity(s1, s2) {
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;
    
    // Levenshtein distance similarity
    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    const distance = track[s2.length][s1.length];
    const maxLen = Math.max(s1.length, s2.length);
    return maxLen === 0 ? 1.0 : 1.0 - (distance / maxLen);
  }

  /**
   * Wipes packaging memory database.
   * @returns {void}
   */
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.error('[PackagingMemory] Wiping failed:', e);
    }
  }
}
