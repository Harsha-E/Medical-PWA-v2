import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@4.0.8/dist/dexie.mjs';

class InteractionDB extends Dexie {
  constructor() {
    super('InteractionEngineDB');
    this.version(1).stores({
      metadata: 'id',
      interactions: 'genericName'
    });
  }
}

const db = new InteractionDB();

export default class InteractionEngine {
  constructor() {
    this.lruCache = new Map();
    this.maxCacheSize = 100;
  }

  async init(datasetUrl) {
    try {
      const meta = await db.metadata.get('dataset_info');
      if (meta && meta.loaded) {
        return; // Already cached
      }

      console.log('[InteractionEngine] 📥 Streaming massive interaction dataset...');
      const response = await fetch(datasetUrl);
      if (!response.ok) throw new Error(`HTTP fetch failed: ${response.status}`);
      const json = await response.json();
      
      // Store in IndexedDB for chunked access
      await db.transaction('rw', db.metadata, db.interactions, async () => {
        await db.interactions.clear();
        await db.interactions.bulkPut(json.data);
        await db.metadata.put({ id: 'dataset_info', loaded: true, version: json.metadata.version });
      });
      console.log('[InteractionEngine] ✅ Dataset successfully chunked and cached in IndexedDB.');
    } catch (e) {
      console.error('[InteractionEngine] Failed to initialize dataset:', e);
    }
  }

  // Levenshtein Distance for fuzzy matching
  _levenshtein(a, b) {
    if(a.length === 0) return b.length; 
    if(b.length === 0) return a.length; 
    const matrix = [];
    for(let i = 0; i <= b.length; i++){ matrix[i] = [i]; }
    for(let j = 0; j <= a.length; j++){ matrix[0][j] = j; }
    for(let i = 1; i <= b.length; i++){
      for(let j = 1; j <= a.length; j++){
        if(b.charAt(i-1) == a.charAt(j-1)){
          matrix[i][j] = matrix[i-1][j-1];
        } else {
          matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
        }
      }
    }
    return matrix[b.length][a.length];
  }

  async getDrugData(query) {
    if (!query) return null;
    const key = query.toLowerCase().trim();
    
    // LRU Cache hit
    if (this.lruCache.has(key)) {
      const data = this.lruCache.get(key);
      this.lruCache.delete(key);
      this.lruCache.set(key, data);
      return data;
    }

    // Try Exact Generic Match in DB
    let data = await db.interactions.get(key);
    
    // If not found exactly, fall back to Brand/Substitute search and Fuzzy Matching
    if (!data) {
      const allDrugs = await db.interactions.toArray();
      let bestMatch = null;
      let lowestDistance = Infinity;

      for (const drug of allDrugs) {
         // 1. Check exact brand match
         if (drug.substitutes && drug.substitutes.some(s => s.toLowerCase() === key)) {
            data = drug;
            break;
         }
         // 2. Check exact composition match
         if (drug.compositions && drug.compositions.some(c => c.toLowerCase() === key)) {
            data = drug;
            break;
         }
         // 3. Calculate fuzzy distance on generic name
         const dist = this._levenshtein(key, drug.genericName.toLowerCase());
         if (dist < lowestDistance && dist <= 3) { // Max 3 typos allowed
            lowestDistance = dist;
            bestMatch = drug;
         }
      }
      // Apply fuzzy fallback if no exact substitute/composition match found
      if (!data && bestMatch) data = bestMatch;
    }

    if (data) {
      // Store under the original query key to speed up subsequent identical typos or brand queries
      if (this.lruCache.size >= this.maxCacheSize) {
        const firstKey = this.lruCache.keys().next().value;
        this.lruCache.delete(firstKey);
      }
      this.lruCache.set(key, data);
    }
    return data;
  }

  async autocomplete(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase().trim();
    
    // We fetch all and filter since we have max 100-200 cached items right now in the demo
    const allDrugs = await db.interactions.toArray();
    const suggestions = new Set();
    
    for (const drug of allDrugs) {
      if (suggestions.size >= 5) break;
      if (drug.genericName.toLowerCase().includes(q)) {
        suggestions.add(drug.genericName);
      } else if (drug.substitutes) {
        for (const sub of drug.substitutes) {
          if (sub.toLowerCase().includes(q)) {
            suggestions.add(sub);
            break;
          }
        }
      }
    }
    return Array.from(suggestions);
  }

  async analyze(genericName, patientProfile = { conditions: [], activeMeds: [] }) {
    if (!genericName) return [];
    
    const drugData = await this.getDrugData(genericName);
    if (!drugData) return [];

    const warnings = [];

    // 1. Evaluate Disease Contraindications
    if (drugData.contraindications) {
      for (const condition of patientProfile.conditions) {
        const match = drugData.contraindications.find(c => c.disease.toLowerCase() === condition.toLowerCase());
        if (match) {
          warnings.push({
            type: 'CONTRAINDICATION',
            severity: match.severity,
            trigger: condition,
            message: match.warning
          });
        }
      }
    }

    // 2. Evaluate Drug-Drug Interactions (Multi-Salt Combination Support)
    if (drugData.interactsWith) {
      // Resolve all active meds into their base salts if they are brands/combos
      const resolvedActiveSalts = new Set();
      for (const activeMed of patientProfile.activeMeds) {
        const activeData = await this.getDrugData(activeMed);
        if (activeData) {
          resolvedActiveSalts.add(activeData.genericName.toLowerCase());
          if (activeData.compositions) {
            activeData.compositions.forEach(c => resolvedActiveSalts.add(c.toLowerCase()));
          }
        } else {
          resolvedActiveSalts.add(activeMed.toLowerCase());
        }
      }

      for (const activeSalt of resolvedActiveSalts) {
        const match = drugData.interactsWith.find(i => i.drug.toLowerCase() === activeSalt);
        if (match) {
          warnings.push({
            type: 'INTERACTION',
            severity: match.severity,
            trigger: activeSalt, // Note: activeSalt might be a base chemical now
            message: match.warning
          });
        }
      }
    }

    return warnings;
  }
}
