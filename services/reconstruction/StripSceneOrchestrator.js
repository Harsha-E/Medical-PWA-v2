/**
 * @fileoverview Strip Scene Orchestrator
 * Manages the Three.js Scene, Camera, and WebGLRenderer. Handles the auto-rotation
 * animation for the UI and exposes virtual poses for flat projection exports.
 */
import * as THREE from 'https://esm.sh/three';

export class StripSceneOrchestrator {
  /**
   * @param {HTMLElement} containerElement - DOM container to attach the canvas
   */
  constructor(containerElement) {
    this.container = containerElement;
    
    // Core Three.js components
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#18181b'); // Dark Zinc
    
    const width = this.container.clientWidth || window.innerWidth || 300;
    const height = this.container.clientHeight || window.innerHeight || 400;
    
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 150);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 50, 100);
    this.scene.add(dirLight);

    this.mesh = null;
    this.animationId = null;
    this.isRotating = false;
  }

  /**
   * Attaches the displaced mesh to the scene.
   * @param {THREE.Mesh} mesh 
   */
  setMesh(mesh) {
    if (this.mesh) this.scene.remove(this.mesh);
    this.mesh = mesh;
    // Center the mesh
    this.mesh.geometry.computeBoundingBox();
    const bb = this.mesh.geometry.boundingBox;
    this.mesh.position.set(
      -(bb.max.x + bb.min.x) / 2,
      -(bb.max.y + bb.min.y) / 2,
      0
    );
    this.scene.add(this.mesh);
  }

  /**
   * Starts a 1.5 second auto-rotation animation, then pauses at frontal pose.
   */
  startAutoRotate() {
    if (!this.mesh) return;
    this.isRotating = true;
    
    let startTime = performance.now();
    const duration = 2000; // 2.0 seconds for longer visual inspection

    // Add Wireframe overlay for "Jarvis" scanning aesthetic
    const wireframeGeo = new THREE.WireframeGeometry(this.mesh.geometry);
    const wireframeMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.8 });
    const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
    this.mesh.add(wireframe);

    const animate = (time) => {
      if (!this.isRotating) return;
      
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      
      // Easing out sine
      const easeProgress = Math.sin((progress * Math.PI) / 2);
      
      // Rotate from -30 degrees to 0 degrees over 2.0 seconds
      this.mesh.rotation.y = THREE.MathUtils.degToRad(-40 + (40 * easeProgress));
      this.mesh.rotation.x = THREE.MathUtils.degToRad(20 - (20 * easeProgress));
      
      // Fade out wireframe over time
      if (wireframe) {
          wireframe.material.opacity = 0.8 * (1.0 - progress);
      }

      this.renderer.render(this.scene, this.camera);
      this._updateTags(); // Update 2D spatial tags
      
      if (progress < 1.0) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isRotating = false;
        if (wireframe) this.mesh.remove(wireframe); // Clean up wireframe
      }
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * Adds an Evidence Tag (HTML Overlay) projected to a specific 3D coordinate on the mesh.
   */
  addEvidenceTag(label, localPosition, color = '#10b981') {
    if (!this.tags) this.tags = [];
    
    const tagEl = document.createElement('div');
    tagEl.style.cssText = `
      position: absolute;
      background: rgba(10, 15, 25, 0.8);
      border: 1px solid ${color};
      color: ${color};
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      backdrop-filter: blur(8px);
      pointer-events: none;
      transform: translate(-50%, -50%);
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 20;
    `;
    tagEl.innerText = label;
    
    // Add connector line
    const lineEl = document.createElement('div');
    lineEl.style.cssText = `
      position: absolute;
      width: 1px;
      background: ${color};
      pointer-events: none;
      transform-origin: top center;
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 19;
    `;

    this.container.appendChild(tagEl);
    this.container.appendChild(lineEl);

    this.tags.push({ element: tagEl, line: lineEl, position: new THREE.Vector3().copy(localPosition) });
    
    // Fade in
    requestAnimationFrame(() => {
      tagEl.style.opacity = '1';
      lineEl.style.opacity = '0.5';
    });
  }

  _updateTags() {
    if (!this.tags || !this.mesh) return;
    
    const widthHalf = this.container.clientWidth / 2;
    const heightHalf = this.container.clientHeight / 2;

    this.tags.forEach(tag => {
      // Convert local coordinate to world coordinate
      const worldPos = tag.position.clone().applyMatrix4(this.mesh.matrixWorld);
      
      // Project to 2D screen space
      worldPos.project(this.camera);
      
      const x = (worldPos.x * widthHalf) + widthHalf;
      const y = -(worldPos.y * heightHalf) + heightHalf;
      
      tag.element.style.left = `${x}px`;
      tag.element.style.top = `${y - 40}px`; // Float above the target point

      // Draw connector line
      const dx = 0; // Straight down
      const dy = 40; 
      tag.line.style.left = `${x}px`;
      tag.line.style.top = `${y - 40}px`;
      tag.line.style.height = `${dy}px`;
    });
  }

  /**
   * Stops rotation.
   */
  stopRotation() {
    this.isRotating = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  /**
   * Returns virtual camera poses for multi-angle flat projections.
   * @returns {Object[]}
   */
  getVirtualPoses() {
    return [
      { azimuth: 0, elevation: 0 },
      { azimuth: 20, elevation: 0 },
      { azimuth: -20, elevation: 0 }
    ];
  }

  /**
   * Exposes renderer for other classes (like FlatProjector)
   */
  getRendererAndScene() {
    return { scene: this.scene, renderer: this.renderer };
  }

  dispose() {
    this.stopRotation();
    if (this.tags) {
      this.tags.forEach(t => {
        if (t.element.parentNode) t.element.parentNode.removeChild(t.element);
        if (t.line.parentNode) t.line.parentNode.removeChild(t.line);
      });
      this.tags = [];
    }
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    this.renderer.dispose();
  }
}
