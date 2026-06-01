/**
 * @fileoverview Clinical Interaction Graph Service.
 * Architecture: ES6 Module, Client-Side Graph Traversal.
 * Paradigm: Offline-first adjacency list for drug-drug and drug-food interactions.
 */

import { INDIAN_DRUG_DATASET } from '../data/indian-drug-dataset.js';
import { AP_DRUG_DATASET } from '../datasets/regional/andhra-pradesh-brands.js';
import { getMasterRegistry } from '../datasets/ayurvedic/ayush-dataset.js';
import { resolveBrandAlias, BRAND_TO_GENERIC } from '../datasets/aliases/brand-aliases.js';

class InteractionGraph {
  constructor() {
    /** @type {Map<string, Map<string, Object>>} Adjacency list of interactions */
    this._graph = new Map();
    /** @type {Map<string, Object>} Fast lookup index for drug metadata */
    this._drugIndex = new Map();
    /** @type {boolean} Tracks if the graph has been hydrated */
    this._isReady = false;
  }

  /**
   * Hydrates the graph from local JSON data files.
   * Fails gracefully if offline and not cached.
   * @returns {Promise<boolean>} True if initialized successfully.
   */
  async initialize() {
    if (this._isReady) return true;

    try {
      const [graphResponse, indexResponse] = await Promise.all([
        fetch('./data/drug-graph.json').catch(() => null),
        fetch('./data/drug-index.json').catch(() => null)
      ]);

      if (graphResponse && graphResponse.ok) {
        const graphData = await graphResponse.json();
        
        // Populate nodes
        if (Array.isArray(graphData.nodes)) {
          graphData.nodes.forEach((node) => {
            const key = this._normalize(node.displayName || node.id);
            this._drugIndex.set(key, node);
            this._addDrug(key);
          });
        }

        // Populate edges (interactions)
        if (Array.isArray(graphData.edges)) {
          graphData.edges.forEach((edge) => {
            this._addInteraction(
              edge.from,
              edge.to,
              edge.severity,
              edge.recommendation || edge.mechanism || edge.description || 'Potential interaction detected.',
              edge
            );
          });
        }
      }

      // Populate flat index if available
      if (indexResponse && indexResponse.ok) {
        const indexData = await indexResponse.json();
        if (Array.isArray(indexData)) {
          indexData.forEach((entry) => {
            if (typeof entry === 'string') {
              const key = this._normalize(entry);
              if (!this._drugIndex.has(key)) {
                this._drugIndex.set(key, { displayName: entry, id: entry });
              }
            }
          });
        }
      }

      this._isReady = true;
      return true;

    } catch (error) {
      console.error('[InteractionGraph] Failed to initialize clinical data:', error);
      return false; // Fail gracefully, allow app to run without safety checks
    }
  }

  /**
   * Normalizes strings for consistent Map key lookups.
   * @private
   */
  _normalize(drugName) {
    return String(drugName || '').trim().toLowerCase().replace(/_/g, ' ');
  }

  /**
   * Adds a drug vertex to the graph.
   * @private
   */
  _addDrug(drugName) {
    const key = this._normalize(drugName);
    if (!key) return;
    if (!this._graph.has(key)) {
      this._graph.set(key, new Map());
    }
  }

  /**
   * Adds a bidirectional interaction edge to the graph.
   * @private
   */
  _addInteraction(drug1, drug2, severity, description, metadata = {}) {
    const from = this._normalize(drug1);
    const to = this._normalize(drug2);
    if (!from || !to) return;

    this._addDrug(from);
    this._addDrug(to);

    const payload = {
      exists: true,
      drug1: metadata.displayName1 || drug1,
      drug2: metadata.displayName2 || drug2,
      severity: (severity || 'moderate').toLowerCase(),
      description: description,
      recommendation: metadata.recommendation || 'Consult your doctor before combining these medicines.',
      evidence: metadata.evidence || 'theoretical',
      details: metadata
    };

    // Store bi-directionally
    this._graph.get(from).set(to, payload);
    this._graph.get(to).set(from, { ...payload, drug1: drug2, drug2: drug1 });
  }

  /**
   * Checks for a specific interaction between two drugs.
   * @param {string} drug1 
   * @param {string} drug2 
   * @returns {Object|null} Interaction details or null if safe.
   */
  checkInteraction(drug1, drug2) {
    if (!this._isReady) return null;
    const from = this._normalize(drug1);
    const to = this._normalize(drug2);
    return this._graph.get(from)?.get(to) || null;
  }

  /**
   * Resolves a brand name to its generic active ingredient name.
   * @private
   * @param {string} drugName - Scanned brand name
   * @returns {string} The normalized generic active ingredient name
   */
  _resolveToGeneric(drugName) {
    if (!drugName) return '';
    let clean = String(drugName).trim().toLowerCase();

    // 1. Resolve spelling variations or aliases of brand names
    const resolvedBrand = resolveBrandAlias(clean);
    if (resolvedBrand) {
      clean = resolvedBrand.toLowerCase();
    }

    // 2. Map official brand name to generic salt if mapped in our directory
    if (BRAND_TO_GENERIC[clean]) {
      return BRAND_TO_GENERIC[clean].toLowerCase();
    }

    // 3. Fallback: check if matches name or brands/aliases in global dataset
    for (const record of INDIAN_DRUG_DATASET) {
      if (record.name && record.name.toLowerCase() === clean) {
        return record.name.toLowerCase();
      }
      const brands = record.brandNames || [];
      if (brands.some(b => b.toLowerCase() === clean)) {
        return record.name.toLowerCase();
      }
      const aliases = record.aliases || [];
      if (aliases.some(a => a.toLowerCase() === clean)) {
        return record.name.toLowerCase();
      }
    }

    // 2. Check in regional AP brands dataset
    for (const record of AP_DRUG_DATASET) {
      if (record.name && record.name.toLowerCase() === clean) {
        return record.genericName.toLowerCase();
      }
      const aliases = record.aliases || [];
      if (aliases.some(a => a.toLowerCase() === clean)) {
        return record.genericName.toLowerCase();
      }
    }

    // 3. Check in AYUSH datasets
    const ayushDataset = getMasterRegistry ? getMasterRegistry() : [];
    for (const record of ayushDataset) {
      if (record.name && record.name.toLowerCase() === clean) {
        return record.name.toLowerCase();
      }
      const aliases = record.aliases || [];
      if (aliases.some(a => a.toLowerCase() === clean)) {
        return record.name.toLowerCase();
      }
    }

    return clean;
  }

  /**
   * Evaluates an entire list of medications for any cross-interactions.
   * @param {string[]|Object[]} drugList - Array of drug names or medication objects.
   * @returns {Object[]} Array of found interactions.
   */
  findInteractions(drugList = []) {
    if (!this._isReady || drugList.length < 2) return [];

    const normalized = drugList.map((drug) => {
      const rawName = typeof drug === 'string'
        ? drug
        : (drug.genericName || drug.name || drug.title);
        
      const genericName = this._resolveToGeneric(rawName);

      return {
        key: this._normalize(genericName),
        label: rawName,
        date: typeof drug === 'string' ? null : (drug.date || null)
      };
    });
    
    const seen = new Set();
    const interactions = [];
    const now = Date.now();

    // O(N^2) comparison for small arrays (typically < 10 medications)
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const interaction = this.checkInteraction(normalized[i].key, normalized[j].key);
        if (!interaction) continue;
        
        // Prevent duplicate bi-directional pushes
        const pairKey = [normalized[i].key, normalized[j].key].sort().join('::');
        if (seen.has(pairKey)) continue;
        
        seen.add(pairKey);

        let finalSeverity = interaction.severity;
        
        if (finalSeverity === 'safe') continue;

        interactions.push({
          drug1: normalized[i].label,
          drug2: normalized[j].label,
          severity: finalSeverity,
          originalSeverity: interaction.severity,
          description: interaction.description,
          recommendation: interaction.recommendation,
          evidence: interaction.evidence
        });
      }
    }

    return interactions;
  }

  /**
   * Returns a categorized summary of a patient's regimen safety.
   * @param {string[]|Object[]} drugList 
   * @returns {Object} { severe: [], moderate: [], mild: [], safe: [] }
   */
  getInteractionSummary(drugList = []) {
    const interactions = this.findInteractions(drugList);
    
    const summary = {
      severe: interactions.filter((item) => item.severity === 'severe'),
      moderate: interactions.filter((item) => item.severity === 'moderate'),
      mild: interactions.filter((item) => item.severity === 'mild'),
      safe: []
    };

    // Determine which drugs have NO interactions
    summary.safe = drugList
      .map((drug) => (typeof drug === 'string' ? drug : drug.name || drug.genericName))
      .filter((drugName) => !interactions.some((item) => 
        item.drug1.toLowerCase() === drugName.toLowerCase() || 
        item.drug2.toLowerCase() === drugName.toLowerCase()
      ));

    return summary;
  }
}

// Export as a singleton
export const interactionGraph = new InteractionGraph();