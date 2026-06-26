/**
 * @fileoverview Strip Flat Projector
 * Takes virtual camera poses from the StripSceneOrchestrator and renders
 * orthographic "flat" exports of the 3D mesh.
 */
import * as THREE from 'https://esm.sh/three';

export class StripFlatProjector {
  /**
   * Renders flat orthographic projections from 3 virtual poses.
   * @param {THREE.Scene} scene 
   * @param {THREE.WebGLRenderer} renderer 
   * @param {Object[]} poses - Array of {azimuth, elevation, distance}
   * @param {number} width 
   * @param {number} height 
   * @returns {Promise<Blob[]>} Array of 3 flat render PNG Blobs
   */
  static async renderFlatProjections(scene, renderer, poses, width, height) {
    const blobs = [];
    
    // Create an Orthographic Camera for flat projection
    const orthoCam = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0.1, 1000);
    
    for (const pose of poses) {
      // Calculate camera position based on spherical coordinates
      const phi = THREE.MathUtils.degToRad(90 - pose.elevation);
      const theta = THREE.MathUtils.degToRad(pose.azimuth);
      const radius = pose.distance || 100;
      
      orthoCam.position.setFromSphericalCoords(radius, phi, theta);
      orthoCam.lookAt(0, 0, 0);
      
      renderer.render(scene, orthoCam);
      
      // Extract canvas to Blob
      const blob = await new Promise(resolve => {
        renderer.domElement.toBlob(resolve, 'image/png');
      });
      blobs.push(blob);
    }
    
    return blobs;
  }
}
