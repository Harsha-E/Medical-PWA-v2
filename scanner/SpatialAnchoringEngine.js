/**
 * @fileoverview SpatialAnchoringEngine.js
 * Translates the logical regions from the WorldModel into 3D space,
 * tracking them against the camera feed without requiring full SLAM.
 */

import { worldModel } from './WorldModel.js';

export class SpatialAnchoringEngine {
  constructor() {
    this.anchors = new Map(); // regionId -> { x, y, z, active }
  }

  /**
   * Called by the vision pipeline when a region is first segmented.
   * Calculates a 3D approximation of its position relative to the object center.
   * @param {string} regionId 
   * @param {Object} cameraPose 
   * @param {Object} boundingBox2D 
   */
  createAnchor(regionId, cameraPose, boundingBox2D) {
    // In production, this projects the 2D bounding box onto the 3D estimated surface of the Entity.
    const anchor = {
      x: boundingBox2D.x + boundingBox2D.width / 2,
      y: boundingBox2D.y + boundingBox2D.height / 2,
      z: 0.5, // Normalized depth
      active: true,
      lastUpdated: Date.now()
    };
    
    this.anchors.set(regionId, anchor);
    return anchor;
  }

  /**
   * Updates all anchor positions based on optical flow or feature tracking.
   * This is what keeps the labels "stuck" to the object as the user waves it.
   * @param {Object} flowDelta - The movement delta from the vision worker (dx, dy)
   */
  updateTracking(flowDelta) {
    this.anchors.forEach(anchor => {
      if (anchor.active) {
        anchor.x += flowDelta.dx;
        anchor.y += flowDelta.dy;
        anchor.lastUpdated = Date.now();
      }
    });
  }

  /**
   * Projects an anchor back to 2D screen coordinates for the UI overlay.
   * @param {string} regionId 
   */
  getScreenPosition(regionId) {
    const anchor = this.anchors.get(regionId);
    if (!anchor || !anchor.active) return null;
    
    // In a full implementation, this applies the camera projection matrix.
    return { x: anchor.x, y: anchor.y };
  }
}

export const spatialAnchoringEngine = new SpatialAnchoringEngine();
