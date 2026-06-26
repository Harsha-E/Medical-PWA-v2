/**
 * @fileoverview WorldModel.js
 * The sacred abstraction of the Medicine Intelligence Agent.
 * It does not "see" frames; it instantiates and manages the state of persistent Entities.
 */

import { SchemaTypes } from './EntitySchema.js';

export class WorldModel {
  constructor() {
    /** @type {Map<string, import('./EntitySchema.js').Entity>} */
    this.activeEntities = new Map();
    
    // Callbacks for UI/UX overlays
    this.onEntityCreated = null;
    this.onEntityUpdated = null;
  }

  /**
   * Instantiates a new Entity when the vision pipeline acquires a stable object lock.
   * @param {string} classification - e.g., 'BLISTER_PACK'
   * @returns {import('./EntitySchema.js').Entity}
   */
  createEntity(classification = 'UNKNOWN') {
    const entityId = `entity-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const entity = {
      id: entityId,
      classification,
      regions: new Map(),
      evidenceLog: [],
      hypotheses: new Map(),
      leadingHypothesisId: null,
      predictions: [],
      creationTime: Date.now(),
      lastUpdated: Date.now()
    };

    this.activeEntities.set(entityId, entity);
    
    console.log(`[WorldModel] Formed new entity: ${entityId} (${classification})`);
    if (this.onEntityCreated) this.onEntityCreated(entity);

    return entity;
  }

  /**
   * Retrieves an active Entity.
   * @param {string} entityId 
   * @returns {import('./EntitySchema.js').Entity | undefined}
   */
  getEntity(entityId) {
    return this.activeEntities.get(entityId);
  }

  /**
   * Registers a newly discovered Region onto an Entity.
   * @param {string} entityId 
   * @param {Partial<import('./EntitySchema.js').Region>} regionData 
   * @returns {import('./EntitySchema.js').Region}
   */
  addRegion(entityId, regionData) {
    const entity = this.getEntity(entityId);
    if (!entity) throw new Error(`Entity ${entityId} not found`);

    const region = {
      id: `reg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: regionData.type || 'UNKNOWN',
      boundingVolume: regionData.boundingVolume || { x: 0, y: 0, z: 0, width: 0, height: 0, depth: 0 },
      isOccluded: regionData.isOccluded || false,
      observabilityScore: regionData.observabilityScore || 1.0,
      spatialAnchor: regionData.spatialAnchor || null
    };

    entity.regions.set(region.id, region);
    this._touch(entity);
    return region;
  }

  /**
   * Commits a new piece of evidence to the Entity's timeline.
   * @param {string} entityId 
   * @param {Partial<import('./EntitySchema.js').Evidence>} evidenceData 
   * @returns {import('./EntitySchema.js').Evidence}
   */
  commitEvidence(entityId, evidenceData) {
    const entity = this.getEntity(entityId);
    if (!entity) throw new Error(`Entity ${entityId} not found`);

    const evidence = {
      id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      source: evidenceData.source || 'SYSTEM',
      type: evidenceData.type || 'UNKNOWN',
      regionId: evidenceData.regionId || null,
      payload: evidenceData.payload || {},
      timestamp: Date.now()
    };

    entity.evidenceLog.push(evidence);
    this._touch(entity);
    return evidence;
  }

  /**
   * Updates an Entity's hypotheses state (usually called by the Reasoning Engine).
   * @param {string} entityId 
   * @param {Map<string, import('./EntitySchema.js').Hypothesis>} newHypotheses 
   * @param {string} newLeadingId 
   */
  updateHypotheses(entityId, newHypotheses, newLeadingId) {
    const entity = this.getEntity(entityId);
    if (!entity) return;

    entity.hypotheses = newHypotheses;
    entity.leadingHypothesisId = newLeadingId;
    this._touch(entity);
  }

  _touch(entity) {
    entity.lastUpdated = Date.now();
    if (this.onEntityUpdated) this.onEntityUpdated(entity);
  }
}

export const worldModel = new WorldModel();
