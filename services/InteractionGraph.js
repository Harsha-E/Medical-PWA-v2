/**
 * @fileoverview Clinical Interaction Graph Service.
 * Architecture: ES6 Module, Client-Side Graph Traversal.
 * Paradigm: Offline-first adjacency list for drug-drug and drug-food interactions.
 */

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
      console.log(`[InteractionGraph] Hydrated with ${this._graph.size} active nodes.`);
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
   * Evaluates an entire list of medications for any cross-interactions.
   * @param {string[]|Object[]} drugList - Array of drug names or medication objects.
   * @returns {Object[]} Array of found interactions.
   */
  findInteractions(drugList = []) {
    if (!this._isReady || drugList.length < 2) return [];

    const normalized = drugList.map((drug) =>
      typeof drug === 'string'
        ? { key: this._normalize(drug), label: drug }
        : { key: this._normalize(drug.genericName || drug.name), label: drug.name || drug.genericName }
    );
    
    const seen = new Set();
    const interactions = [];

    // O(N^2) comparison for small arrays (typically < 10 medications)
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const interaction = this.checkInteraction(normalized[i].key, normalized[j].key);
        if (!interaction) continue;
        
        // Prevent duplicate bi-directional pushes
        const pairKey = [normalized[i].key, normalized[j].key].sort().join('::');
        if (seen.has(pairKey)) continue;
        
        seen.add(pairKey);
        interactions.push({
          drug1: normalized[i].label,
          drug2: normalized[j].label,
          severity: interaction.severity,
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