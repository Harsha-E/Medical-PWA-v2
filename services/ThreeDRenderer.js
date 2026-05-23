/**
 * @fileoverview WebGL 3D Visualization Service.
 * Architecture: ES6 Module.
 * Paradigm: GPU-accelerated particle system and pharmacokinetic curve rendering.
 * Requires: Three.js (global `THREE` object) loaded via CDN in index.html.
 */

class ThreeDRenderer {
  constructor() {
    this._isSupported = typeof window !== 'undefined' && 'THREE' in window;
    
    this._scene = null;
    this._camera = null;
    this._renderer = null;
    this._particles = null;
    this._curveLine = null;
    this._animFrame = null;
    this._clock = null;
    this._resizeObserver = null;
    
    this._particlePositions = null;
    this._particleBasePositions = null;
    
    this._targetColor = null;
    this._currentColor = null;
    
    // Bind methods to preserve context in animation loops
    this._animate = this._animate.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  /**
   * Initializes the WebGL context on the provided canvas.
   * @param {HTMLCanvasElement} canvasElement 
   * @returns {boolean} True if initialized successfully, false if WebGL is unavailable.
   */
  init(canvasElement) {
    if (!this._isSupported || !canvasElement) {
      console.warn('[ThreeDRenderer] THREE.js not available or canvas missing. Skipping 3D render.');
      return false;
    }

    try {
      const parent = canvasElement.parentElement;
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      // 1. Setup Renderer
      this._renderer = new THREE.WebGLRenderer({ 
        canvas: canvasElement, 
        alpha: true, 
        antialias: true 
      });
      this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this._renderer.setSize(width, height);

      // 2. Setup Camera
      this._camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      this._camera.position.set(0, 0, 5);

      // 3. Setup Scene
      this._scene = new THREE.Scene();
      this._clock = new THREE.Clock();
      
      this._currentColor = new THREE.Color('#3b82f6'); // Default Blue
      this._targetColor = new THREE.Color('#3b82f6');

      // 4. Build Objects
      this._buildParticleSystem();
      this._buildConcentrationCurve();

      // 5. Setup Observers & Loop
      this._resizeObserver = new ResizeObserver(this._onResize);
      this._resizeObserver.observe(parent);

      this._animFrame = requestAnimationFrame(this._animate);
      return true;

    } catch (error) {
      console.error('[ThreeDRenderer] Failed to initialize WebGL context:', error);
      return false;
    }
  }

  /**
   * Constructs the 3D particle cloud.
   * @private
   */
  _buildParticleSystem() {
    const particleCount = 800;
    const geometry = new THREE.BufferGeometry();
    
    this._particlePositions = new Float32Array(particleCount * 3);
    this._particleBasePositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const centerColor = new THREE.Color('#3b82f6'); // Accent
    const edgeColor = new THREE.Color('#f59e0b');   // Warn

    for (let i = 0; i < particleCount; i++) {
      // Random position in a sphere of radius 2.5
      const r = 2.5 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this._particleBasePositions[i * 3] = x;
      this._particleBasePositions[i * 3 + 1] = y;
      this._particleBasePositions[i * 3 + 2] = z;
      
      this._particlePositions[i * 3] = x;
      this._particlePositions[i * 3 + 1] = y;
      this._particlePositions[i * 3 + 2] = z;

      // Color gradient based on distance from center
      const mixedColor = centerColor.clone().lerp(edgeColor, r / 2.5);
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;

      // Random sizes between 0.02 and 0.08
      sizes[i] = Math.random() * 0.06 + 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this._particlePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this._particles = new THREE.Points(geometry, material);
    this._scene.add(this._particles);
  }

  /**
   * Constructs the 24-hour pharmacokinetic line curve.
   * @private
   * @param {Object[]} [doseLogs=null] 
   */
  _buildConcentrationCurve(doseLogs = null) {
    if (this._curveLine) {
      this._scene.remove(this._curveLine);
      this._curveLine.geometry.dispose();
      this._curveLine.material.dispose();
    }

    const points = [];
    const samples = 100;
    
    // X-axis ranges from -3 to +3 (representing 24 hours)
    for (let i = 0; i < samples; i++) {
      const x = -3 + (i / samples) * 6;
      let y = 0;

      // Mathematical approximation of drug plasma concentration
      // Rapid rise (absorption), peak, then exponential decay (elimination)
      const t = i / samples; // 0 to 1
      if (t < 0.1) {
        y = (t / 0.1) * 1.5; // Rapid rise
      } else {
        y = 1.5 * Math.exp(-3 * (t - 0.1)); // Decay
      }

      // Add a slight baseline wave
      y += Math.sin(x * 2) * 0.1;
      
      points.push(new THREE.Vector3(x, y - 1, 0));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x10b981, // Success Green
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });

    this._curveLine = new THREE.Line(geometry, material);
    this._scene.add(this._curveLine);
  }

  /**
   * Updates the visualizer context when a specific medication is selected.
   * @param {Object} medication 
   * @param {Object[]} recentLogs 
   */
  setMedication(medication, recentLogs = []) {
    if (!this._isSupported || !this._particles) return;

    // 1. Rebuild the curve (in a real scenario, offset by recentLogs times)
    this._buildConcentrationCurve(recentLogs);

    // 2. Set Target Color based on clinical category
    const category = (medication.category || '').toLowerCase();
    let hex = '#3b82f6'; // Default Blue

    if (category.includes('antibiotic')) hex = '#3b82f6'; // Blue
    else if (category.includes('hypertens')) hex = '#14b8a6'; // Teal
    else if (category.includes('statin') || category.includes('cholesterol')) hex = '#f59e0b'; // Amber
    else if (category.includes('pain') || category.includes('analgesic')) hex = '#ef4444'; // Red/Coral

    this._targetColor = new THREE.Color(hex);
  }

  /**
   * Internal render loop.
   * @private
   */
  _animate() {
    this._animFrame = requestAnimationFrame(this._animate);

    if (!this._scene || !this._camera || !this._renderer) return;

    const time = this._clock.getElapsedTime();

    // 1. Rotate the entire particle cloud
    if (this._particles) {
      this._particles.rotation.y += 0.001;
      this._particles.rotation.x += 0.0005;

      // Pulse opacity
      this._particles.material.opacity = 0.6 + 0.1 * Math.sin(time * 0.5);

      // Breathing motion: shift positions slightly using sine waves
      const positions = this._particles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        const baseX = this._particleBasePositions[i * 3];
        const baseZ = this._particleBasePositions[i * 3 + 2];
        
        positions[i * 3] = baseX + Math.sin(time + i) * 0.05;
        positions[i * 3 + 2] = baseZ + Math.cos(time + i) * 0.05;
      }
      this._particles.geometry.attributes.position.needsUpdate = true;

      // Smooth color transition
      this._currentColor.lerp(this._targetColor, 0.05);
      
      // We only update the center color of the gradient
      const colors = this._particles.geometry.attributes.color.array;
      const edgeColor = new THREE.Color('#0a0407'); // Fade to background
      
      for (let i = 0; i < positions.length / 3; i++) {
        const x = this._particleBasePositions[i * 3];
        const y = this._particleBasePositions[i * 3 + 1];
        const z = this._particleBasePositions[i * 3 + 2];
        const r = Math.sqrt(x*x + y*y + z*z);
        
        const mixed = this._currentColor.clone().lerp(edgeColor, r / 3.0);
        colors[i * 3] = mixed.r;
        colors[i * 3 + 1] = mixed.g;
        colors[i * 3 + 2] = mixed.b;
      }
      this._particles.geometry.attributes.color.needsUpdate = true;
    }

    this._renderer.render(this._scene, this._camera);
  }

  /**
   * Handles canvas resizing dynamically.
   * @private
   */
  _onResize(entries) {
    if (!this._camera || !this._renderer || !entries || !entries[0]) return;
    
    const { width, height } = entries[0].contentRect;
    if (width === 0 || height === 0) return;

    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(width, height);
  }

  /**
   * Safely disposes of all WebGL resources to prevent memory leaks.
   */
  destroy() {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    if (this._resizeObserver) this._resizeObserver.disconnect();

    if (this._particles) {
      this._particles.geometry.dispose();
      this._particles.material.dispose();
    }

    if (this._curveLine) {
      this._curveLine.geometry.dispose();
      this._curveLine.material.dispose();
    }

    if (this._renderer) {
      this._renderer.dispose();
      this._renderer.forceContextLoss();
    }

    this._scene = null;
    this._camera = null;
    this._renderer = null;
    this._particles = null;
    this._curveLine = null;
  }
}

export const threeDRenderer = new ThreeDRenderer();