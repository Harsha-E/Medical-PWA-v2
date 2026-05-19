/**
 * @fileoverview WebGL 3D Drug Concentration Visualizer for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module.
 * Paradigm: Hardware-accelerated particle systems and pharmacokinetic curves.
 * Requires: THREE.js (r128) available on the global `window` object.
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const PARTICLE_COUNT = 800;
const SPHERE_RADIUS = 2.5;
const BASE_ACCENT = 0xff6b35; // New orange accent
const BASE_WARN = 0xd4860a;   // New amber warning
const BASE_SUCCESS = 0x2d9e6b; // New green success

/**
 * Maps medical categories to specific visual color identities.
 * Uses the updated Warm Light color palette standard.
 * @type {Object<string, number>}
 */
const CATEGORY_COLORS = {
    'antibiotic': 0x2563eb,       // info blue
    'antihypertensive': 0x2d9e6b, // success green
    'statin': 0xff9f1c,           // amber-orange
    'pain relief': 0xc0392b,      // danger red
    'antidiabetic': 0x9b5de5,     // purple
    'default': 0xff6b35           // primary orange
};

// ============================================================================
// THREE.JS RENDERER IMPLEMENTATION
// ============================================================================

class ThreeDRenderer {
    constructor() {
        /** @private {THREE.Scene|null} */
        this._scene = null;
        /** @private {THREE.PerspectiveCamera|null} */
        this._camera = null;
        /** @private {THREE.WebGLRenderer|null} */
        this._renderer = null;
        
        /** @private {THREE.Points|null} */
        this._particles = null;
        /** @private {Float32Array|null} Array buffer holding raw vector matrices */
        this._particlePositions = null;
        /** @private {Float32Array|null} Array buffer storing origin seeds for noise drift */
        this._particleOrigins = null;

        /** @private {THREE.Line|null} Pharmacokinetic visualization line */
        this._concentrationCurve = null;
        
        /** @private {number|null} Hardware frame token */
        this._animFrame = null;
        /** @private {THREE.Clock|null} Timeline tracking primitive */
        this._clock = null;
        
        /** @private {ResizeObserver|null} DOM dimensional tracking observer */
        this._resizeObserver = null;

        /** @private {Object|null} State configuration for color interpolation */
        this._colorTweenState = null;
    }

    /**
     * Determines client GPU support for the WebGL context.
     * @private
     * @returns {boolean}
     */
    _checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    /**
     * Bootstraps the WebGL viewport and instantiates core matrix configurations.
     * @param {HTMLCanvasElement} canvasElement - Target rendering interface.
     * @returns {void}
     */
    init(canvasElement) {
        if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) {
            console.error('[ThreeDRenderer] Initialization aborted: Invalid canvas target provided.');
            return;
        }

        if (typeof THREE === 'undefined') {
            console.error('[ThreeDRenderer Fatal] THREE.js engine missing from global namespace.');
            return;
        }

        if (!this._checkWebGLSupport()) {
            console.warn('[ThreeDRenderer] WebGL context unavailable or blocked by browser flags. Visualization degrading gracefully.');
            return;
        }

        const container = canvasElement.parentElement;
        if (!container) {
            console.warn('[ThreeDRenderer] Canvas lacks a valid structural parent container.');
            return;
        }

        try {
            // 1. Core Component Instantiation
            const width = container.clientWidth || 300;
            const height = container.clientHeight || 300;

            this._scene = new THREE.Scene();
            // Transparent background required for floating over organic blob layers
            this._scene.background = null; 

            this._camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
            this._camera.position.set(0, 0, 5);

            this._renderer = new THREE.WebGLRenderer({
                canvas: canvasElement,
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });

            this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this._renderer.setSize(width, height);
            
            this._clock = new THREE.Clock();

            // 2. Geometry Assemblies
            this._buildParticleSystem();
            this._buildConcentrationCurve();

            // 3. Execution Pipeline Loop
            this._animate = this._animate.bind(this);
            this._animate();

            // 4. Responsive Handlers
            this._resizeObserver = new ResizeObserver(() => this._onResize(container));
            this._resizeObserver.observe(container);

            console.log('[ThreeDRenderer] Hardware visualization cluster initialized.');

        } catch (initError) {
            console.error('[ThreeDRenderer] Catastrophic failure during pipeline instantiation:', initError);
            this.destroy(); // Guarantee clean state on failure
        }
    }

    /**
     * Constructs a volume of geometric vectors representing drug molecular saturation.
     * Maps proximity-based gradient matrices using BufferGeometry optimizations.
     * @private
     */
    _buildParticleSystem() {
        if (!this._scene) return;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const colors = new Float32Array(PARTICLE_COUNT * 3);
        const sizes = new Float32Array(PARTICLE_COUNT);

        const colorAccent = new THREE.Color(BASE_ACCENT);
        const colorWarn = new THREE.Color(BASE_WARN);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Generate uniform spherical distribution using polar coordinates
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = Math.cbrt(Math.random()) * SPHERE_RADIUS; // cbrt ensures volume density

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Mathematical distance from core dictates gradient mapping ratio
            const distanceFromCenter = Math.sqrt(x * x + y * y + z * z);
            const mixRatio = Math.min(1.0, distanceFromCenter / SPHERE_RADIUS);

            const particleColor = colorAccent.clone().lerp(colorWarn, mixRatio);
            colors[i * 3] = particleColor.r;
            colors[i * 3 + 1] = particleColor.g;
            colors[i * 3 + 2] = particleColor.b;

            // Generate scale variance between 0.02 and 0.08
            sizes[i] = Math.random() * 0.06 + 0.02;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this._particles = new THREE.Points(geometry, material);
        this._scene.add(this._particles);

        this._particlePositions = positions;
        this._particleOrigins = new Float32Array(positions); // Clone for drift calculation baseline
    }

    /**
     * Constructs a synthetic pharmacokinetic line graph detailing metabolism loops.
     * @private
     * @param {Array<Object>} [doseLogs] - Optional real-world telemetry log mappings.
     */
    _buildConcentrationCurve(doseLogs = null) {
        if (!this._scene) return;

        // Discard existing curve layer if rebuilding
        if (this._concentrationCurve) {
            this._scene.remove(this._concentrationCurve);
            this._concentrationCurve.geometry.dispose();
            this._concentrationCurve.material.dispose();
            this._concentrationCurve = null;
        }

        const material = new THREE.LineBasicMaterial({ 
            color: BASE_SUCCESS, // New success green variable
            linewidth: 2,
            transparent: true,
            opacity: 0.85
        });

        const points = [];
        const resolution = 100;
        const widthRange = 6.0; // Span x-axis from -3 to +3

        // Evaluate empirical telemetry or apply synthetic approximation functions
        if (doseLogs && Array.isArray(doseLogs) && doseLogs.length > 0) {
            
            // Analyze the most recent action payload to shift the peak mapping
            const latestLog = doseLogs.sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt))[0];
            const msSinceDose = Date.now() - new Date(latestLog.takenAt).getTime();
            const hoursSinceDose = Math.max(0, msSinceDose / (1000 * 60 * 60));

            // Map standard 24 hour breakdown across the 6.0 x-axis grid
            for (let i = 0; i <= resolution; i++) {
                const xVal = (i / resolution) * widthRange - (widthRange / 2);
                
                // Mathematical translation scaling -3..+3 to 0..24 hours
                const simHour = ((xVal + 3) / 6) * 24; 
                
                let yVal = 0;
                
                // Advanced algorithmic dose response mapping: 
                // C(t) = Cmax * (exp(-k_el * t) - exp(-k_a * t))
                if (simHour >= hoursSinceDose) {
                    const t = simHour - hoursSinceDose;
                    const ka = 1.2; // Absorption constant
                    const kel = 0.15; // Elimination constant
                    const cMax = 2.0; // Theoretical peak plasma volume target
                    
                    yVal = cMax * 2.5 * (Math.exp(-kel * t) - Math.exp(-ka * t));
                    yVal = Math.max(0, Math.min(2.0, yVal)); 
                }

                // Append slight floor threshold for visual presentation clipping
                points.push(new THREE.Vector3(xVal, yVal - 1.5, 0));
            }

        } else {
            // Synthetic Pharmacokinetic Approximation (Default Shape)
            // Rapid rise 0→2h, plateau 2→4h, logarithmic decay 4→24h
            for (let i = 0; i <= resolution; i++) {
                const x = (i / resolution) * widthRange - (widthRange / 2);
                
                // Map x (-3 to +3) to simulated hour (0 to 24)
                const hour = ((x + 3) / 6) * 24;
                let y = 0;

                if (hour < 2) {
                    y = (hour / 2) * 1.8; // Linear rise
                } else if (hour < 4) {
                    y = 1.8 + Math.sin((hour - 2) * Math.PI / 2) * 0.2; // Soft peak curve
                } else {
                    y = 2.0 * Math.exp(-0.15 * (hour - 4)); // Logarithmic decay
                }

                // Offset Y axis base coordinate to bottom grid plane
                points.push(new THREE.Vector3(x, y - 1.5, 0));
            }
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this._concentrationCurve = new THREE.Line(geometry, material);
        this._scene.add(this._concentrationCurve);
    }

    /**
     * Executes the infinite hardware render cycle request string.
     * Evaluates particle drift, opacity phasing, and material color tweening.
     * @private
     */
    _animate() {
        if (!this._renderer || !this._scene || !this._camera) return;
        
        this._animFrame = requestAnimationFrame(this._animate);

        const elapsedTime = this._clock.getElapsedTime();

        // System Rotation
        if (this._particles) {
            this._particles.rotation.y += 0.001;
            this._particles.rotation.x += 0.0005;

            // Opacity Phasing (Breathing Effect)
            const baseOpacity = 0.6;
            const phaseVariance = 0.1 * Math.sin(elapsedTime * 0.5);
            this._particles.material.opacity = baseOpacity + phaseVariance;

            // Particle Noise Displacement Matrix
            const positions = this._particles.geometry.attributes.position.array;
            
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const originX = this._particleOrigins[i * 3];
                const originZ = this._particleOrigins[i * 3 + 2];
                
                // Sinusoidal organic drift applied exclusively on X and Z axis planes
                positions[i * 3] = originX + Math.sin(elapsedTime * 1.5 + i) * 0.03;
                positions[i * 3 + 2] = originZ + Math.cos(elapsedTime * 1.2 + i) * 0.03;
            }
            
            this._particles.geometry.attributes.position.needsUpdate = true;

            // Execute Color Tween State Overlays
            if (this._colorTweenState && this._colorTweenState.active) {
                this._processColorTween(elapsedTime);
            }
        }

        this._renderer.render(this._scene, this._camera);
    }

    /**
     * Contextualizes the 3D space based on the specific pharmacological variables of a drug.
     * Rebuilds pharmacokinetic graph curves and initiates particle color tweening.
     * @param {Object} medication - The active drug schema.
     * @param {Array<Object>} [doseLogs] - Correlated telemetry logs for exact predictions.
     */
    setMedication(medication, doseLogs = []) {
        if (!medication || !this._particles || !this._scene) return;

        // 1. Rebuild accurate dosage curve
        this._buildConcentrationCurve(doseLogs);

        // 2. Identify target semantic category colors
        const rawCategory = (medication.category || 'default').toLowerCase();
        let targetHex = CATEGORY_COLORS['default'];

        for (const [key, hexValue] of Object.entries(CATEGORY_COLORS)) {
            if (rawCategory.includes(key)) {
                targetHex = hexValue;
                break;
            }
        }

        // 3. Configure Hardware Tween Matrix Engine
        const startColors = new Float32Array(this._particles.geometry.attributes.color.array);
        const targetColorObj = new THREE.Color(targetHex);
        const targetColors = new Float32Array(PARTICLE_COUNT * 3);

        const warnColor = new THREE.Color(BASE_WARN);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const x = this._particleOrigins[i * 3];
            const y = this._particleOrigins[i * 3 + 1];
            const z = this._particleOrigins[i * 3 + 2];
            
            const dist = Math.sqrt(x * x + y * y + z * z);
            const mix = Math.min(1.0, dist / SPHERE_RADIUS);

            // Interpolate target color string
            const blendedTarget = targetColorObj.clone().lerp(warnColor, mix * 0.5); // Subdue warning threshold mix
            
            targetColors[i * 3] = blendedTarget.r;
            targetColors[i * 3 + 1] = blendedTarget.g;
            targetColors[i * 3 + 2] = blendedTarget.b;
        }

        // Setup the localized execution pointer parameters for _processColorTween
        this._colorTweenState = {
            active: true,
            startTime: this._clock.getElapsedTime(),
            duration: 0.8, // 800ms interpolation limit
            startColors: startColors,
            targetColors: targetColors
        };
        
        console.log(`[ThreeDRenderer] Transitioning matrix parameters to category: ${rawCategory}`);
    }

    /**
     * Mutates color matrices per frame matching quadratic translation easing functions.
     * @private
     * @param {number} currentTime - Raw elapsed engine time index.
     */
    _processColorTween(currentTime) {
        const state = this._colorTweenState;
        let progress = (currentTime - state.startTime) / state.duration;

        if (progress >= 1.0) {
            progress = 1.0;
            state.active = false;
        }

        // Apply easing curve (Ease-Out Quad)
        const easedProgress = 1 - (1 - progress) * (1 - progress);

        const colorsAttribute = this._particles.geometry.attributes.color;
        const currentColors = colorsAttribute.array;

        for (let i = 0; i < currentColors.length; i++) {
            const startVal = state.startColors[i];
            const targetVal = state.targetColors[i];
            currentColors[i] = startVal + (targetVal - startVal) * easedProgress;
        }

        colorsAttribute.needsUpdate = true;
    }

    /**
     * Mutates canvas viewport dimensions tracking parent DOM boundaries dynamically.
     * Prevents distortion stretching and pixel aspect crushing constraints.
     * @private
     * @param {HTMLElement} container - Tracking host DOM boundary.
     */
    _onResize(container) {
        if (!this._camera || !this._renderer || !container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        if (width === 0 || height === 0) return;

        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(width, height);
    }

    /**
     * Hard-stops system loops, releases graphic hardware memory structures, and drops bounds trackers.
     * Standard teardown closure avoiding memory leak crashes in single page application routing layers.
     */
    destroy() {
        console.log('[ThreeDRenderer] Destructing hardware pipeline contexts.');
        
        if (this._animFrame !== null) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }

        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }

        if (this._particles) {
            this._particles.geometry.dispose();
            this._particles.material.dispose();
        }

        if (this._concentrationCurve) {
            this._concentrationCurve.geometry.dispose();
            this._concentrationCurve.material.dispose();
        }

        if (this._renderer) {
            this._renderer.dispose();
        }

        // Clean out pointer configurations
        this._scene = null;
        this._camera = null;
        this._renderer = null;
        this._particles = null;
        this._particlePositions = null;
        this._particleOrigins = null;
        this._concentrationCurve = null;
        this._clock = null;
        this._colorTweenState = null;
    }
}

// Export structural singleton configuration for single page context routing limits.
export const threeDRenderer = new ThreeDRenderer();