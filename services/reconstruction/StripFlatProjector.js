/**
 * @fileoverview Strip Flat Projector
 * Renders the 3D blister pack mesh from orthographic views and extracts 
 * flattened 2.5D projections (center, left, right) for OCR processing.
 */

import * as THREE from 'https://esm.sh/three';

export class StripFlatProjector {
  constructor(renderer, scene, mesh) {
    this.renderer = renderer;
    this.scene = scene;
    this.mesh = mesh;
    
    // Save original camera/background
    this.originalBackground = this.scene.background;
  }

  /**
   * Captures the flattened orthographic projections.
   * @returns {{center: string, left: string, right: string}} Data URLs of projections
   */
  projectOrthographicViews() {
    if (!this.mesh) return null;

    // Temporarily set a neutral background for OCR (white or transparent)
    this.scene.background = new THREE.Color('#ffffff');
    
    // Create an Orthographic Camera bounded by the mesh
    this.mesh.geometry.computeBoundingBox();
    const bb = this.mesh.geometry.boundingBox;
    
    const width = bb.max.x - bb.min.x;
    const height = bb.max.y - bb.min.y;
    
    // Adding slight padding
    const padding = 10;
    
    const orthoCamera = new THREE.OrthographicCamera(
      -width / 2 - padding,
       width / 2 + padding,
       height / 2 + padding,
      -height / 2 - padding,
      0.1, 1000
    );
    
    // We want to capture the 0 degree (Center) projection first.
    // Ensure the mesh is flat facing the camera.
    const originalRot = { x: this.mesh.rotation.x, y: this.mesh.rotation.y, z: this.mesh.rotation.z };
    
    this.mesh.rotation.set(0, 0, 0);
    orthoCamera.position.set(0, 0, 200);
    orthoCamera.lookAt(0, 0, 0);

    const projections = {};
    
    // 1. Render Center
    this.renderer.render(this.scene, orthoCamera);
    projections.center = this.renderer.domElement.toDataURL('image/jpeg', 1.0);
    
    // 2. Render Left Angle
    this.mesh.rotation.y = THREE.MathUtils.degToRad(-15);
    this.renderer.render(this.scene, orthoCamera);
    projections.left = this.renderer.domElement.toDataURL('image/jpeg', 1.0);
    
    // 3. Render Right Angle
    this.mesh.rotation.y = THREE.MathUtils.degToRad(15);
    this.renderer.render(this.scene, orthoCamera);
    projections.right = this.renderer.domElement.toDataURL('image/jpeg', 1.0);
    
    // Restore state
    this.mesh.rotation.set(originalRot.x, originalRot.y, originalRot.z);
    this.scene.background = this.originalBackground;
    
    return projections;
  }
}
