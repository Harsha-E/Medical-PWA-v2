/**
 * @fileoverview RegionGraph.js
 * Manages the spatial and logical relationships between Regions on an Entity.
 * Allows the reasoning engine to ask topological questions:
 * "Is the Manufacturer Logo near the Dosage Text?"
 */

export class RegionGraph {
  constructor() {
    // Adjacency list: Map of regionId -> Array of { targetRegionId, relationship, distance }
    this.edges = new Map();
  }

  /**
   * Registers a spatial relationship between two regions.
   * @param {string} sourceRegionId 
   * @param {string} targetRegionId 
   * @param {string} relationship - e.g., 'ADJACENT_TO', 'ABOVE', 'CONTAINS', 'OPPOSITE_SIDE'
   * @param {number} distance - Estimated physical or pixel distance
   */
  connect(sourceRegionId, targetRegionId, relationship, distance = 0) {
    if (!this.edges.has(sourceRegionId)) {
      this.edges.set(sourceRegionId, []);
    }
    
    // Avoid duplicate edges
    const existingEdges = this.edges.get(sourceRegionId);
    const existing = existingEdges.find(e => e.targetRegionId === targetRegionId && e.relationship === relationship);
    if (!existing) {
      existingEdges.push({ targetRegionId, relationship, distance });
    }

    // Bidirectional for basic spatial relations unless it's hierarchical (like CONTAINS)
    if (relationship !== 'CONTAINS' && relationship !== 'CONTAINED_BY') {
      if (!this.edges.has(targetRegionId)) {
        this.edges.set(targetRegionId, []);
      }
      const inverseRelationship = this._getInverseRelationship(relationship);
      const targetEdges = this.edges.get(targetRegionId);
      if (!targetEdges.find(e => e.targetRegionId === sourceRegionId && e.relationship === inverseRelationship)) {
        targetEdges.push({ targetRegionId: sourceRegionId, relationship: inverseRelationship, distance });
      }
    }
  }

  /**
   * Queries the graph for related regions.
   * @param {string} regionId 
   * @param {string} [filterRelationship] - Optional filter (e.g., only return 'ADJACENT_TO')
   * @returns {Array<Object>} List of connected edges
   */
  getRelatedRegions(regionId, filterRelationship = null) {
    const connections = this.edges.get(regionId) || [];
    if (filterRelationship) {
      return connections.filter(c => c.relationship === filterRelationship);
    }
    return connections;
  }

  /**
   * Evaluates if a logical spatial constraint is met.
   * Used by the Reasoning Engine to validate evidence.
   * @param {string} regionA 
   * @param {string} regionB 
   * @param {string} expectedRelationship 
   * @returns {boolean}
   */
  verifyConstraint(regionA, regionB, expectedRelationship) {
    const connections = this.edges.get(regionA) || [];
    return connections.some(c => c.targetRegionId === regionB && c.relationship === expectedRelationship);
  }

  _getInverseRelationship(rel) {
    switch(rel) {
      case 'ABOVE': return 'BELOW';
      case 'BELOW': return 'ABOVE';
      case 'LEFT_OF': return 'RIGHT_OF';
      case 'RIGHT_OF': return 'LEFT_OF';
      case 'FRONT': return 'BACK';
      case 'BACK': return 'FRONT';
      default: return rel; // e.g., ADJACENT_TO is symmetric
    }
  }
}
