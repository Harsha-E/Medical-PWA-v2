/**
 * @fileoverview EvidenceAttributionEngine.js
 * The core economy of the Intelligence Agent. 
 * Autonomous brokers (OCR, Shape, Knowledge Graph) attribute weighted evidence points 
 * for or against specific hypotheses.
 */

import { SchemaTypes } from './EntitySchema.js';

export class EvidenceAttributionEngine {
  constructor() {
    // Ledger history of all transactions across all entities
    /** @type {Map<string, Array<import('./EntitySchema.js').LedgerEntry>>} */
    this.ledgers = new Map(); // Map of entityId -> LedgerEntry[]
    
    // Broker weights. This controls how much influence each subsystem has on the final confidence.
    this.brokerWeights = {
      'OCR_ENGINE': 1.0,
      'SHAPE_ANALYZER': 0.8,
      'PACKAGING_ANALYZER': 0.85,
      'KNOWLEDGE_GRAPH': 1.5,     // High trust in medical ground truth
      'HISTORICAL_TWIN': 1.2      // High trust in past confirmations
    };
  }

  /**
   * Initializes the ledger for a new Entity.
   * @param {string} entityId 
   */
  initializeLedger(entityId) {
    if (!this.ledgers.has(entityId)) {
      this.ledgers.set(entityId, []);
    }
  }

  /**
   * A broker attributes points (positive or negative) to a hypothesis based on evidence.
   * @param {string} entityId 
   * @param {string} hypothesisId 
   * @param {import('./EntitySchema.js').Evidence} evidence 
   * @param {number} basePoints - Base score (e.g., +10 for a match, -20 for a contradiction)
   * @param {string} rationale - Explanation for the UI/Replay system
   * @returns {import('./EntitySchema.js').LedgerEntry}
   */
  attributeEvidence(entityId, hypothesisId, evidence, basePoints, rationale) {
    this.initializeLedger(entityId);
    
    // Apply the broker's reputation weight to the base points
    const weight = this.brokerWeights[evidence.source] || 1.0;
    const finalPoints = basePoints * weight;

    const entry = {
      id: `ledg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      evidenceId: evidence.id,
      targetHypothesisId: hypothesisId,
      points: finalPoints,
      rationale: rationale,
      timestamp: Date.now()
    };

    this.ledgers.get(entityId).push(entry);
    
    console.log(`[Attribution] ${evidence.source} bid ${finalPoints > 0 ? '+' : ''}${finalPoints.toFixed(1)} on ${hypothesisId}. Reason: ${rationale}`);
    
    return entry;
  }

  /**
   * Returns all ledger transactions for a given entity and hypothesis.
   * Used by the Reasoning Engine to sum the confidence score.
   * @param {string} entityId 
   * @param {string} hypothesisId 
   * @returns {Array<import('./EntitySchema.js').LedgerEntry>}
   */
  getLedgerForHypothesis(entityId, hypothesisId) {
    const allEntries = this.ledgers.get(entityId) || [];
    return allEntries.filter(entry => entry.targetHypothesisId === hypothesisId);
  }

  /**
   * Revokes an existing evidence attribution by adding an inverse ledger entry.
   * @param {string} entityId 
   * @param {string} evidenceId 
   * @param {string} rationale 
   */
  revokeEvidence(entityId, evidenceId, rationale) {
    const allEntries = this.ledgers.get(entityId) || [];
    // Find all positive or negative attributions for this evidence and inverse them
    const relatedEntries = allEntries.filter(e => e.evidenceId === evidenceId && e.points !== 0);
    
    relatedEntries.forEach(entry => {
      const inverseEntry = {
        id: `ledg-rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        evidenceId: evidenceId,
        targetHypothesisId: entry.targetHypothesisId,
        points: -entry.points, // Inverse the points to nullify
        rationale: rationale,
        timestamp: Date.now()
      };
      allEntries.push(inverseEntry);
      console.log(`[Attribution] Revoked evidence ${evidenceId} for ${entry.targetHypothesisId}. Offset: ${-entry.points.toFixed(1)}. Reason: ${rationale}`);
    });
  }

  /**
   * Returns the entire economy ledger for an entity.
   * Useful for Reasoning Replay and Counterfactual Analysis.
   * @param {string} entityId 
   */
  getFullLedger(entityId) {
    return this.ledgers.get(entityId) || [];
  }
}

export const attributionEngine = new EvidenceAttributionEngine();
