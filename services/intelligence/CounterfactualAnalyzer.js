/**
 * @fileoverview CounterfactualAnalyzer.js
 * Runs "what-if" simulations against the current Evidence Attribution ledger.
 * Triggered on reasoning events (confidence change, candidate change) to prove 
 * the structural integrity of the Intelligence Agent's decisions.
 */

import { worldModel } from './WorldModel.js';
import { attributionEngine } from './EvidenceAttributionEngine.js';
import { reasoningEngine } from './ReasoningEngine.js';

export class CounterfactualAnalyzer {
  constructor() {}

  /**
   * Generates a ranked list of the top confidence contributors for the leading hypothesis.
   * @param {string} entityId 
   * @returns {Array<{source: string, points: number, type: string}>}
   */
  getTopContributors(entityId) {
    const entity = worldModel.getEntity(entityId);
    if (!entity || !entity.leadingHypothesisId) return [];

    const ledger = attributionEngine.getLedgerForHypothesis(entityId, entity.leadingHypothesisId);
    
    // Group points by subsystem (source)
    const contributors = new Map(); // source -> total points
    const sourceTypes = new Map();  // source -> type of match

    ledger.forEach(entry => {
      // Find the evidence object to get the source
      const evidence = entity.evidenceLog.find(ev => ev.id === entry.evidenceId);
      if (evidence) {
        const currentPoints = contributors.get(evidence.source) || 0;
        contributors.set(evidence.source, currentPoints + entry.points);
        sourceTypes.set(evidence.source, evidence.type);
      }
    });

    const ranked = Array.from(contributors.entries())
      .map(([source, points]) => ({ source, points, type: sourceTypes.get(source) }))
      .sort((a, b) => b.points - a.points); // Descending

    return ranked;
  }

  /**
   * Runs a negative simulation: "What if X evidence didn't exist?"
   * @param {string} entityId 
   * @param {string} evidenceSourceToRemove - e.g., 'OCR_ENGINE'
   * @returns {Object} The simulated drop in confidence
   */
  simulateRemoval(entityId, evidenceSourceToRemove) {
    const entity = worldModel.getEntity(entityId);
    if (!entity || !entity.leadingHypothesisId) return null;

    const leadingHypothesis = entity.hypotheses.get(entity.leadingHypothesisId);
    const baselineConfidence = leadingHypothesis.confidenceScore;

    const ledger = attributionEngine.getLedgerForHypothesis(entityId, entity.leadingHypothesisId);
    
    // Calculate total points EXCLUDING the target source
    let simulatedTotalPoints = 0;
    
    ledger.forEach(entry => {
      const evidence = entity.evidenceLog.find(ev => ev.id === entry.evidenceId);
      if (evidence && evidence.source !== evidenceSourceToRemove) {
        simulatedTotalPoints += entry.points;
      }
    });

    // Recalculate confidence using the ReasoningEngine's mathematical threshold
    const simulatedConfidence = Math.max(0, Math.min(1.0, simulatedTotalPoints / reasoningEngine.POINTS_FOR_MAX_CONFIDENCE));

    return {
      simulation: `Remove ${evidenceSourceToRemove}`,
      baselineConfidence: baselineConfidence,
      simulatedConfidence: simulatedConfidence,
      dropPercentage: baselineConfidence - simulatedConfidence
    };
  }
}

export const counterfactualAnalyzer = new CounterfactualAnalyzer();
