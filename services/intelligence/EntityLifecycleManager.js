/**
 * @fileoverview EntityLifecycleManager.js
 * Manages the state machine of a Digital Twin from birth to archive.
 * States: Acquired → Scanning → Observed → Reasoning → Identified → Verified → Tracked → Archived
 */

import { worldModel } from './WorldModel.js';

export const EntityState = {
  ACQUIRED: 'ACQUIRED',       // Object lock just established
  SCANNING: 'SCANNING',       // Actively gathering frames/regions
  OBSERVED: 'OBSERVED',       // Sufficient regions mapped to begin deep reasoning
  REASONING: 'REASONING',     // Evidence Attribution actively running
  IDENTIFIED: 'IDENTIFIED',   // Leading hypothesis > 95% confidence
  VERIFIED: 'VERIFIED',       // Knowledge graph confirmed or user confirmed
  TRACKED: 'TRACKED',         // Digital twin persisting across sessions (e.g. tracking depletion)
  ARCHIVED: 'ARCHIVED'        // Object destroyed or completely depleted
};

export class EntityLifecycleManager {
  constructor() {
    /** @type {Map<string, string>} Map of entityId -> EntityState */
    this.states = new Map();
    this.onStateChanged = null; // Callback for UI
  }

  /**
   * Initializes the lifecycle for a new entity.
   * @param {string} entityId 
   */
  startLifecycle(entityId) {
    this._transition(entityId, EntityState.ACQUIRED);
  }

  /**
   * Evaluates the current world model state and transitions the lifecycle automatically.
   * @param {string} entityId 
   */
  evaluateState(entityId) {
    const entity = worldModel.getEntity(entityId);
    if (!entity) return;

    const currentState = this.states.get(entityId);
    if (currentState === EntityState.ARCHIVED) return; // Terminal state

    let nextState = currentState;

    // Transition Logic
    if (currentState === EntityState.ACQUIRED && entity.regions.size > 0) {
      nextState = EntityState.SCANNING;
    } 
    
    if (currentState === EntityState.SCANNING && entity.evidenceLog.length > 5) {
      nextState = EntityState.OBSERVED;
    }

    if (currentState === EntityState.OBSERVED && entity.hypotheses.size > 0) {
      nextState = EntityState.REASONING;
    }

    if (currentState === EntityState.REASONING) {
      const leadingHypothesis = entity.hypotheses.get(entity.leadingHypothesisId);
      if (leadingHypothesis && leadingHypothesis.confidenceScore >= 0.95) {
        nextState = EntityState.IDENTIFIED;
      }
    }

    // VERIFIED requires Knowledge Graph or explicit manual confirmation (handled externally)
    
    if (currentState !== nextState) {
      this._transition(entityId, nextState);
    }
  }

  /**
   * Explicitly sets a state (e.g., when a user verifies, or when archived).
   * @param {string} entityId 
   * @param {string} newState 
   */
  forceState(entityId, newState) {
    this._transition(entityId, newState);
  }

  _transition(entityId, newState) {
    const oldState = this.states.get(entityId) || 'NONE';
    this.states.set(entityId, newState);
    console.log(`[Lifecycle] Entity ${entityId} transitioned: ${oldState} → ${newState}`);
    
    if (this.onStateChanged) {
      this.onStateChanged(entityId, newState, oldState);
    }
  }

  getState(entityId) {
    return this.states.get(entityId) || 'UNKNOWN';
  }
}

export const entityLifecycleManager = new EntityLifecycleManager();
