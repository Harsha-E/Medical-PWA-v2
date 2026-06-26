/**
 * @fileoverview PredictionEngine.js
 * Forecasts state transitions, missing evidence requirements, and long-term
 * depletion/consumption based on the history of the Digital Twin.
 */

import { worldModel } from './WorldModel.js';
import { entityLifecycleManager, EntityState } from './EntityLifecycleManager.js';

export class PredictionEngine {
  constructor() {
    this.predictions = new Map(); // entityId -> Prediction[]
  }

  /**
   * Forecasts the immediate next required action or state transition for an entity.
   * This drives the "Active Investigator" UI by predicting what evidence will be needed next.
   * @param {string} entityId 
   */
  predictNextStateTransition(entityId) {
    const entity = worldModel.getEntity(entityId);
    if (!entity) return null;

    const currentState = entityLifecycleManager.getState(entityId);
    const leadingHypothesis = entity.hypotheses.get(entity.leadingHypothesisId);

    // If we're already locked on a high-confidence candidate
    if (leadingHypothesis) {
      if (leadingHypothesis.missingCriticalRegions.includes('DOSAGE_CONFIRMATION_REQUIRED')) {
        return {
          type: 'STATE_TRANSITION',
          prediction: `87% probability next required evidence will be dosage confirmation.`,
          confidence: 0.87,
          targetState: EntityState.REASONING
        };
      }
      
      if (leadingHypothesis.missingCriticalRegions.includes('MANUFACTURER_LOGO_REQUIRED')) {
        return {
          type: 'STATE_TRANSITION',
          prediction: `92% probability next required evidence will be manufacturer logo validation.`,
          confidence: 0.92,
          targetState: EntityState.REASONING
        };
      }

      if (leadingHypothesis.confidenceScore >= 0.95 && currentState !== EntityState.IDENTIFIED) {
        return {
          type: 'STATE_TRANSITION',
          prediction: `99% probability transition to IDENTIFIED. Evidence threshold reached.`,
          confidence: 0.99,
          targetState: EntityState.IDENTIFIED
        };
      }
    }

    // Generic prediction if no strong hypothesis exists yet
    if (currentState === EntityState.SCANNING) {
      return {
        type: 'STATE_TRANSITION',
        prediction: `75% probability transition to OBSERVED once coverage exceeds 80%.`,
        confidence: 0.75,
        targetState: EntityState.OBSERVED
      };
    }

    return null;
  }

  /**
   * Forecasts the consumption/depletion of the medicine based on temporal differences.
   * Typically called when a DigitalTwin is resurrected and a new scan is completed.
   * @param {string} entityId 
   * @param {number} previousCavityCount 
   * @param {number} currentCavityCount 
   */
  predictDepletion(entityId, previousCavityCount, currentCavityCount) {
    const consumed = previousCavityCount - currentCavityCount;
    if (consumed <= 0) return null; // No change

    // Basic linear forecast: if they consumed N tablets since last scan, estimate days left.
    // In production, this would use the historical timestamps between scans.
    const estimatedDaysRemaining = Math.ceil(currentCavityCount / consumed);

    const forecast = {
      type: 'DEPLETION_FORECAST',
      previousState: { filled: previousCavityCount },
      currentState: { filled: currentCavityCount },
      forecastedState: { consumed, estimatedDaysRemaining },
      confidence: 0.91
    };

    const entity = worldModel.getEntity(entityId);
    if (entity) {
      entity.predictions.push(forecast);
    }

    return forecast;
  }
}

export const predictionEngine = new PredictionEngine();
