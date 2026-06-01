/**
 * @fileoverview Mock Fuse.js implementation for offline Node.js testing.
 * Emulates the Fuse.js search API and scores matches by string overlap.
 */

export default class MockFuse {
  constructor(dataset, options = {}) {
    this.dataset = dataset;
    this.keys = (options.keys || []).map(k => typeof k === 'string' ? k : k.name);
  }

  search(term) {
    if (!term || typeof term !== 'string') return [];
    const termLower = term.trim().toLowerCase();
    const results = [];

    for (const item of this.dataset) {
      let matched = false;
      let bestScore = 1.0;

      for (const key of this.keys) {
        const val = item[key];
        if (Array.isArray(val)) {
          for (const v of val) {
            if (typeof v === 'string') {
              const vLower = v.toLowerCase();
              if (vLower.includes(termLower) || termLower.includes(vLower)) {
                matched = true;
                const overlapRatio = Math.min(v.length, term.length) / Math.max(v.length, term.length);
                const score = 1.0 - (overlapRatio * 0.85); // score between 0.15 (perfect) and 1.0
                bestScore = Math.min(bestScore, score);
              }
            }
          }
        } else if (typeof val === 'string') {
          const vLower = val.toLowerCase();
          if (vLower.includes(termLower) || termLower.includes(vLower)) {
            matched = true;
            const overlapRatio = Math.min(val.length, term.length) / Math.max(val.length, term.length);
            const score = 1.0 - (overlapRatio * 0.85);
            bestScore = Math.min(bestScore, score);
          }
        }
      }

      if (matched) {
        results.push({ item, score: bestScore });
      }
    }

    return results.sort((a, b) => a.score - b.score);
  }
}
