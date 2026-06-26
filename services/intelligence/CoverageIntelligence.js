/**
 * @fileoverview CoverageIntelligence.js
 * An intelligence primitive that answers: "Have I seen enough?"
 * Gates the ReasoningEngine from finalizing identifications prematurely.
 * Evaluates coverage based on SEMANTIC REGIONS (e.g., Manufacturer, Dosage, Brand),
 * not geometric percentages.
 */

import { worldModel } from './WorldModel.js';

export const CoverageState = {
  INSUFFICIENT: 'INSUFFICIENT', // Core identity regions missing
  PARTIAL: 'PARTIAL',           // Some identity regions found, but critical gaps remain
  ADEQUATE: 'ADEQUATE',         // Enough critical regions to allow ReasoningEngine to finalize
  COMPLETE: 'COMPLETE'          // All expected regions found
};

export class CoverageIntelligence {
  constructor() {}

  /**
   * Evaluates the coverage state of a specific entity.
   * @param {string} entityId 
   * @returns {Object} { state: string, missingRegions: string[], efficiency: number }
   */
  evaluateCoverage(entityId) {
    const entity = worldModel.getEntity(entityId);
    if (!entity) {
      return { state: CoverageState.INSUFFICIENT, missingRegions: [], efficiency: 0 };
    }

    let foundManufacturer = false;
    let foundDosage = false;
    let foundBrandText = false;
    let foundBlisterCavity = false;

    // Check semantic regions
    entity.regions.forEach(region => {
      if (region.type === 'MANUFACTURER_LOGO') foundManufacturer = true;
      if (region.type === 'DOSAGE_TEXT') foundDosage = true;
      if (region.type === 'TEXT_BLOCK') foundBrandText = true; // Simplified for now
      if (region.type === 'BLISTER_CAVITY') foundBlisterCavity = true;
    });

    const missingRegions = [];
    if (!foundManufacturer) missingRegions.push('MANUFACTURER_LOGO');
    if (!foundDosage) missingRegions.push('DOSAGE_TEXT');
    if (!foundBrandText) missingRegions.push('BRAND_TEXT');

    let state = CoverageState.INSUFFICIENT;

    // Semantic Gating Logic
    if (foundBrandText && foundManufacturer && foundDosage) {
      state = foundBlisterCavity ? CoverageState.COMPLETE : CoverageState.ADEQUATE;
    } else if (foundBrandText && (foundManufacturer || foundDosage)) {
      state = CoverageState.PARTIAL;
    } else {
      state = CoverageState.INSUFFICIENT;
    }

    return {
      state,
      missingRegions
    };
  }

  /**
   * Determines if the Reasoning Engine is permitted to declare an IDENTIFIED state.
   * @param {string} entityId 
   * @returns {boolean}
   */
  canFinalizeReasoning(entityId) {
    const { state } = this.evaluateCoverage(entityId);
    return state === CoverageState.ADEQUATE || state === CoverageState.COMPLETE;
  }
}

export const coverageIntelligence = new CoverageIntelligence();
