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

  async getDrugData(genericName) {
    const key = genericName.toLowerCase().trim();
    
    // LRU Cache hit
    if (this.lruCache.has(key)) {
      const data = this.lruCache.get(key);
      this.lruCache.delete(key);
      this.lruCache.set(key, data);
      return data;
    }

    // IndexedDB hit
    const data = await db.interactions.get(key);
    if (data) {
      if (this.lruCache.size >= this.maxCacheSize) {
        const firstKey = this.lruCache.keys().next().value; // Evict oldest
        this.lruCache.delete(firstKey);
      }
      this.lruCache.set(key, data);
    }
    return data;
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

    // 2. Evaluate Drug-Drug Interactions
    if (drugData.interactsWith) {
      for (const activeMed of patientProfile.activeMeds) {
        const match = drugData.interactsWith.find(i => i.drug.toLowerCase() === activeMed.toLowerCase());
        if (match) {
          warnings.push({
            type: 'INTERACTION',
            severity: match.severity,
            trigger: activeMed,
            message: match.warning
          });
        }
      }
    }

    return warnings;
  }
}
