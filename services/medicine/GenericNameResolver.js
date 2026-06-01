/**
 * @fileoverview Generic Name Resolver Service
 * Extracts active pharmaceutical ingredients (APIs) or generic salts (e.g., Paracetamol, Amoxicillin)
 * from OCR text, handling abbreviations and misspellings.
 */

/**
 * Common regional abbreviations for generic drugs.
 * @type {Record<string, string>}
 */
export const GENERIC_ABBREVIATIONS = {
  'pcm': 'Paracetamol',
  'apap': 'Paracetamol',
  'para': 'Paracetamol',
  'ibu': 'Ibuprofen',
  'amox': 'Amoxicillin',
  'amoxy': 'Amoxicillin',
  'panto': 'Pantoprazole',
  'atorva': 'Atorvastatin',
  'met': 'Metformin',
  'hcq': 'Hydroxychloroquine',
  'aza': 'Azathioprine',
  'mtx': 'Methotrexate'
};

/**
 * @typedef {Object} GenericCandidate
 * @property {string} genericName - The resolved generic drug name
 * @property {number} confidence - Matching confidence score (0-100)
 * @property {string} originalToken - The matching string source
 */

export default class GenericNameResolver {
  /**
   * Matches generic drug candidates from OCR text block.
   * @param {string} ocrText - Entire stabilized OCR text block
   * @param {any[]} medicineDataset - Master drug list to search
   * @returns {GenericCandidate[]} Ranked generic candidate matches
   */
  resolveGeneric(ocrText, medicineDataset) {
    if (!ocrText || !Array.isArray(medicineDataset)) return [];

    const cleanText = ocrText.trim().toLowerCase();
    
    // Split text by typical boundaries
    const tokens = cleanText.split(/[\s,;.+:\-\\/]+/).filter(t => t.length >= 3);
    const candidatesMap = new Map();

    for (const token of tokens) {
      // 1. Check abbreviation lookup
      let resolvedAbbrev = GENERIC_ABBREVIATIONS[token];
      if (resolvedAbbrev) {
        this._addOrUpdateCandidate(candidatesMap, resolvedAbbrev, 95, token);
        continue;
      }

      // 2. Perform comparison against generic names in dataset
      for (const record of medicineDataset) {
        // In the master dataset, record.name is the generic name. In AP dataset, record.genericName is used.
        const officialGenericName = record.genericName || record.name;
        if (!officialGenericName) continue;

        const normGeneric = officialGenericName.toLowerCase();
        
        // Exact substring or match check
        if (token === normGeneric) {
          this._addOrUpdateCandidate(candidatesMap, officialGenericName, 100, token);
        } else if (normGeneric.includes(token) && token.length >= 5) {
          const score = Math.round((token.length / normGeneric.length) * 90);
          this._addOrUpdateCandidate(candidatesMap, officialGenericName, score, token);
        } else if (token.includes(normGeneric)) {
          this._addOrUpdateCandidate(candidatesMap, officialGenericName, 85, token);
        } else {
          // Fuzzy spelling similarity
          const dist = this._getLevenshteinDistance(token, normGeneric);
          const maxLen = Math.max(token.length, normGeneric.length);
          const similarity = 1.0 - (dist / maxLen);
          if (similarity >= 0.75) {
            this._addOrUpdateCandidate(candidatesMap, officialGenericName, Math.round(similarity * 90), token);
          }
        }
      }
    }

    return this.rankGenericCandidates(Array.from(candidatesMap.values()));
  }

  /**
   * Sorts generic candidate matches by score and removes low confidence matches.
   * @param {GenericCandidate[]} candidates - Unsorted list
   * @returns {GenericCandidate[]} Sorted candidates
   */
  rankGenericCandidates(candidates) {
    if (!Array.isArray(candidates)) return [];
    
    return candidates
      .filter(c => c.confidence >= 50)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Helper to merge duplicate candidates keeping highest score.
   * @private
   * @param {Map<string, GenericCandidate>} map
   * @param {string} name
   * @param {number} score
   * @param {string} token
   */
  _addOrUpdateCandidate(map, name, score, token) {
    const key = name.toLowerCase();
    const existing = map.get(key);
    if (!existing || existing.confidence < score) {
      map.set(key, {
        genericName: name,
        confidence: score,
        originalToken: token
      });
    }
  }

  /**
   * Classic Levenshtein Distance.
   * @private
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  _getLevenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}
