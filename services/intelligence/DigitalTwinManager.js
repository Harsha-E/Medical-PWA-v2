/**
 * @fileoverview DigitalTwinManager.js
 * Persists the active WorldModel entities to the local IndexedDB (Dexie).
 * Allows an Intelligence Agent to resume exactly where it left off, days later.
 */

import { worldModel } from './WorldModel.js';
import { entityLifecycleManager, EntityState } from './EntityLifecycleManager.js';
import { attributionEngine } from './EvidenceAttributionEngine.js';
// import { dexieManager } from '../../storage/DexieManager.js'; // Assuming it's updated to v3 schema

export class DigitalTwinManager {
  constructor() {
    this.autoSaveInterval = null;
  }

  /**
   * Starts a background loop to continuously sync active entities to local storage.
   */
  enableAutoSave() {
    if (this.autoSaveInterval) return;
    
    this.autoSaveInterval = setInterval(() => {
      this._persistActiveEntities();
    }, 5000); // Save every 5 seconds
    
    console.log('[DigitalTwinManager] Auto-save enabled.');
  }

  disableAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Synchronizes the current in-memory World Model to the database.
   */
  async _persistActiveEntities() {
    // In a full implementation, this would call dexieManager.db.world_entities.put(...)
    // For the scaffold, we log the persistence action.
    
    worldModel.activeEntities.forEach((entity, entityId) => {
      const state = entityLifecycleManager.getState(entityId);
      
      // We don't need to aggressively save transient/aborted locks.
      if (state === EntityState.ACQUIRED || state === 'UNKNOWN') return;

      const fullLedger = attributionEngine.getFullLedger(entityId);
      
      const twinSnapshot = {
        id: entity.id,
        classification: entity.classification,
        creationTime: entity.creationTime,
        lastUpdated: entity.lastUpdated,
        state: state,
        // Convert Maps to Arrays for IndexedDB storage
        regions: Array.from(entity.regions.values()),
        hypotheses: Array.from(entity.hypotheses.values()),
        evidenceLog: entity.evidenceLog,
        ledger: fullLedger
      };

      // Mock DB write
      // await dexieManager.getDB().world_entities.put(twinSnapshot);
      console.debug(`[DigitalTwinManager] Saved Digital Twin snapshot for ${entity.id} (State: ${state})`);
    });
  }

  /**
   * Resurrects an entity from the database back into the active WorldModel.
   * @param {string} entityId 
   */
  async loadDigitalTwin(entityId) {
    // Mock DB read
    // const snapshot = await dexieManager.getDB().world_entities.get(entityId);
    const snapshot = null; // Simulated miss
    
    if (!snapshot) {
      console.warn(`[DigitalTwinManager] Twin ${entityId} not found in storage.`);
      return false;
    }

    // Reconstruct the Maps and inject back into WorldModel
    // worldModel.activeEntities.set(snapshot.id, reconstructedEntity);
    // attributionEngine.ledgers.set(snapshot.id, snapshot.ledger);
    // entityLifecycleManager.forceState(snapshot.id, snapshot.state);
    
    return true;
  }
}

export const digitalTwinManager = new DigitalTwinManager();
