/**
 * MedCare | GhostFluid Background (Rose Current WebGL Shader)
 * Three.js via CDN ESM — no bundler required.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.0/build/three.module.js';

export default class GhostFluid {
  constructor() {
    this.isActive = true;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'webgl-liquid';
    this.canvas.className = 'fixed inset-0 -z-10 pointer-events-none opacity-90';
    document.body.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.clock = new THREE.Clock();

    this._handleResize = () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if (this.material) {
        this.material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
      }
    };

    this._initShader();
    this._animate();

    window.addEventListener('resize', this._handleResize);
  }

  _initShader() {
    // A single plane that covers the entire screen
    this.geometry = new THREE.PlaneGeometry(2, 2);

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      
      uniform vec3 colorDeep;
      uniform vec3 colorMid;
      uniform vec3 colorHighlight;
      
      uniform float speed;
      uniform float flowStrength;
      uniform float grain;
      uniform float contrast;

      varying vec2 vUv;

      // GLSL Simplex Noise and FBM setup
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i); // Avoid truncation effects in permutation
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 5; i++) {
              value += amplitude * snoise(p);
              p *= 2.0;
              amplitude *= 0.5;
          }
          return value;
      }

      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        st.x *= u_resolution.x / u_resolution.y;

        // Cinematic Liquid Flow Calculation
        vec2 q = vec2(0.);
        q.x = fbm(st + u_time * speed * 0.1);
        q.y = fbm(st + vec2(1.0));
        
        vec2 r = vec2(0.);
        r.x = fbm(st + q * flowStrength + u_time * speed * 0.15);
        r.y = fbm(st + q * flowStrength + u_time * speed * 0.126);
        
        float f = fbm(st + r);
        
        // Color Mapping
        vec3 color = mix(colorDeep, colorMid, clamp((f*f)*3.0, 0.0, 1.0));
        color = mix(color, colorHighlight, clamp(length(q), 0.0, 1.0) * 0.3);
        
        // Contrast Adustment
        color = mix(vec3(0.5), color, contrast);
        
        // Film Grain
        float noise = fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453);
        color -= noise * grain;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Map your exact component props to GLSL Uniforms
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0.0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        colorDeep: { value: new THREE.Color('#1a0a12') },       // Rose Current Deep
        colorMid: { value: new THREE.Color('#7f2f5d') },        // Rose Current Mid
        colorHighlight: { value: new THREE.Color('#ffd9b5') },  // Luxury Highlight
        speed: { value: 0.85 },
        flowStrength: { value: 0.75 },
        grain: { value: 0.05 },
        contrast: { value: 1.1 }
      },
      transparent: true
    });

    const plane = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(plane);
  }

  _animate() {
    if (!this.isActive) return;
    requestAnimationFrame(() => this._animate());
    // Feed the elapsed time to the shader
    this.material.uniforms.u_time.value = this.clock.getElapsedTime();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.isActive = false;
    window.removeEventListener('resize', this._handleResize);
    
    if (this.canvas) this.canvas.remove();
    
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
    if (this.material) this.material.dispose();
    if (this.geometry) this.geometry.dispose();
  }
}