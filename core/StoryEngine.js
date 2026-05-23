/**
 * MedCare | StoryEngine.js
 *
 * Responsive layout:
 * MOBILE: TOP 55vh (Canvas) / BOTTOM 45vh (Text)
 * DESKTOP: LEFT 50% (Canvas) / RIGHT 50% (Text)
 *
 * Snap-scroll vertical. One card per phase.
 * Phase crossfade: alpha lerp speed 0.14/frame.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.0/build/three.module.js';

/* ── Palette ─────────────────────────────────────────── */
const PALETTE = {
  primary: new THREE.Color('#f26b3c'),
  dark:    new THREE.Color('#7a3520'),
  peach:   new THREE.Color('#ffb88c'),
  wine:    new THREE.Color('#7f1e40'),
  white:   new THREE.Color('#ffffff'),
  cyan:    new THREE.Color('#38bdf8'),
  gold:    new THREE.Color('#f59e0b'),
  red:     new THREE.Color('#ef4444'),
  green:   new THREE.Color('#10b981'),
};

/* ── Phase Data ──────────────────────────────────────── */
const PHASES = [
  {
    tag: 'SYSTEM BOOT',
    head: 'Your Body.\nOne System.',
    body: 'MedCare fuses clinical precision with offline-first speed into one sovereign health ledger.',
  },
  {
    tag: 'PROTOCOL 01 — HISTORY',
    head: 'Every Record.\nInstantly.',
    body: 'Prescriptions, diagnoses, allergies, labs — encrypted and retrieved in milliseconds. Your full clinical narrative in one ledger.',
  },
  {
    tag: 'PROTOCOL 02 — COMPLIANCE',
    head: 'Missed Dose?\nWe Know.',
    body: 'Real-time adherence per medication. Streak analytics, circadian reminders and refill forecasts fused into one meridian.',
  },
  {
    tag: 'PROTOCOL 03 — INTERACTIONS',
    head: 'Five Vectors.\nZero Conflicts.',
    body: 'Drug–drug · Drug–food · Drug–disease · Pharmacokinetic · Pharmacodynamic — all five screened before harm can propagate.',
  },
  {
    tag: 'PROTOCOL 04 — SCAN',
    head: 'Prescription.\nDigitised.',
    body: 'OCR reads physical scripts in under 3 seconds. Every dosage, frequency and unit extracted and pre-filled.',
  },
  {
    tag: 'PROTOCOL 05 — EMERGENCY',
    head: 'One Tap.\nFull Vitals.',
    body: 'Blood type, active medications, allergies and emergency contacts on a single locked-screen card.',
  },
  {
    tag: 'SYSTEM LIVE',
    head: 'Offline.\nUnbreakable.',
    body: 'End-to-end encrypted. Works without signal. No vendor. No subscription. Your data — sovereign.',
  },
];

/* ════════════════════════════════════════════════════════
   STORY ENGINE
════════════════════════════════════════════════════════ */
export default class StoryEngine {
  constructor() {
    this.overlay = null;
    this.renderer = null;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.clock = new THREE.Clock();
    this.animationId = null;
    this.currentPhase = 0;
    this.sceneGroups = [];
    this.mouse = { x: 0, y: 0 };
    this.styleTag = null;
    
    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
  }

  mount() {
    if (document.getElementById('se-root')) return;
    
    this.buildDOM();
    this.initWebGL();
    this.buildScenes();
    this.setupIntersectionObserver();
    
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('mousemove', this.handleMouseMove);
    
    this.startRenderLoop();
    requestAnimationFrame(() => { this.overlay.style.opacity = '1'; });
  }

  unmount() {
    this.overlay.style.opacity = '0';
    
    setTimeout(() => {
      cancelAnimationFrame(this.animationId);
      this.observer?.disconnect();
      
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('mousemove', this.handleMouseMove);
      
      this.renderer?.dispose();
      this.renderer?.forceContextLoss();
      
      document.getElementById('se-root')?.remove();
      document.getElementById('se-dots')?.remove();
      document.getElementById('se-close')?.remove();
      if (this.styleTag) this.styleTag.remove();
      
      this.overlay = null;
    }, 500);
  }

  /* ── DOM Construction ───────────────────────────────── */
  buildDOM() {
    const style = document.createElement('style');
    style.innerHTML = `
      .se-hide-scrollbar::-webkit-scrollbar { display: none; }
      .se-hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      
      .se-snap-unit {
        height: 100dvh;
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      .se-canvas-wrap {
        flex: 0 0 55%;
        position: relative;
        overflow: hidden;
        background: #030303;
      }
      .se-card {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 28px 28px 32px;
        background: rgba(255, 255, 255, 0.025);
        border-top: 1px solid rgba(242, 107, 60, 0.12);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        position: relative;
        z-index: 3;
      }

      @media (min-width: 768px) {
        .se-snap-unit { flex-direction: row; }
        .se-canvas-wrap {
          flex: 0 0 50%; height: 100dvh;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }
        .se-card {
          flex: 0 0 50%; height: 100dvh;
          padding: 60px 80px; border-top: none;
        }
      }
    `;
    document.head.appendChild(style);
    this.styleTag = style;

    const root = document.createElement('div');
    root.id = 'se-root';
    root.className = 'se-hide-scrollbar';
    root.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: #030303; opacity: 0; transition: opacity 0.45s ease;
      overflow-y: scroll; scroll-snap-type: y mandatory;
      -webkit-overflow-scrolling: touch;
    `;
    this.overlay = root;

    PHASES.forEach((phase, index) => {
      const snapUnit = document.createElement('div');
      snapUnit.dataset.phaseIndex = index;
      snapUnit.className = 'se-snap-unit';

      const canvasWrap = document.createElement('div');
      canvasWrap.dataset.canvasWrap = index;
      canvasWrap.className = 'se-canvas-wrap';

      const vignette = document.createElement('div');
      vignette.style.cssText = `
        position: absolute; inset: 0; pointer-events: none; z-index: 2;
        background: radial-gradient(ellipse at 50% 50%, transparent 30%, #030303 95%);
      `;
      canvasWrap.appendChild(vignette);

      const card = document.createElement('div');
      card.className = 'se-card';

      const tag = document.createElement('span');
      tag.style.cssText = `
        font-family: 'Roboto Mono', monospace; font-size: 9px; font-weight: 700;
        letter-spacing: 0.5em; text-transform: uppercase; color: #f26b3c;
        opacity: 0.8; display: block; margin-bottom: 14px;
      `;
      tag.textContent = phase.tag;

      const heading = document.createElement('h2');
      heading.style.cssText = `
        font-family: 'Caveat', cursive; font-size: clamp(42px, 7vw, 70px);
        line-height: 0.95; font-weight: 700; color: #ffffff;
        margin: 0 0 16px; letter-spacing: -0.02em; white-space: pre-line;
      `;
      heading.textContent = phase.head;

      const bodyText = document.createElement('p');
      bodyText.style.cssText = `
        font-family: 'Inter', sans-serif; font-size: clamp(14px, 2vw, 17px);
        line-height: 1.7; color: rgba(255, 255, 255, 0.55);
        margin: 0; font-weight: 400; max-width: 450px;
      `;
      bodyText.textContent = phase.body;

      card.appendChild(tag);
      card.appendChild(heading);
      card.appendChild(bodyText);

      snapUnit.appendChild(canvasWrap);
      snapUnit.appendChild(card);
      root.appendChild(snapUnit);
    });

    document.body.appendChild(root);

    const closeBtn = document.createElement('button');
    closeBtn.id = 'se-close';
    closeBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    closeBtn.style.cssText = `
      position: fixed; top: 18px; right: 18px; z-index: 10001;
      width: 38px; height: 38px; border-radius: 12px; cursor: pointer;
      background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(242, 107, 60, 0.25);
      color: #f26b3c; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    `;
    closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(242, 107, 60, 0.12)';
    closeBtn.onmouseleave = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.04)';
    closeBtn.onclick = () => this.unmount();
    
    document.body.appendChild(closeBtn);

    const dotsContainer = document.createElement('div');
    dotsContainer.id = 'se-dots';
    dotsContainer.style.cssText = `
      position: fixed; right: 14px; top: 50%; transform: translateY(-50%);
      z-index: 10001; display: flex; flex-direction: column; gap: 8px;
    `;

    PHASES.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.dataset.dotIndex = i;
      dot.style.cssText = `
        width: 4px; height: 4px; border-radius: 50%;
        background: rgba(255, 255, 255, 0.18); cursor: pointer; transition: all 0.25s ease;
      `;
      dot.onclick = () => {
        const targetSection = document.querySelector(`[data-phase-index="${i}"]`);
        targetSection?.scrollIntoView({ behavior: 'smooth' });
      };
      dotsContainer.appendChild(dot);
    });

    document.body.appendChild(dotsContainer);
    this.dotsContainer = dotsContainer;
    this.syncNavDots(0);
  }

  syncNavDots(activeIndex) {
    this.dotsContainer?.querySelectorAll('[data-dot-index]').forEach(dot => {
      const idx = parseInt(dot.dataset.dotIndex);
      if (idx === activeIndex) {
        dot.style.background = '#f26b3c';
        dot.style.height = '18px';
        dot.style.borderRadius = '3px';
        dot.style.boxShadow = '0 0 6px #f26b3c';
      } else {
        dot.style.background = 'rgba(255, 255, 255, 0.18)';
        dot.style.height = '4px';
        dot.style.borderRadius = '50%';
        dot.style.boxShadow = 'none';
      }
    });
  }

  /* ── WebGL Initialization ───────────────────────────── */
  initWebGL() {
    const isDesktop = window.innerWidth >= 768;
    const width = isDesktop ? window.innerWidth / 2 : window.innerWidth;
    const height = isDesktop ? window.innerHeight : window.innerHeight * 0.55;
    
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 200);
    this.camera.position.z = 9;
    
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0, 0);
    
    this.renderer.domElement.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 1;
    `;
    
    const firstWrap = document.querySelector('[data-canvas-wrap="0"]');
    firstWrap?.appendChild(this.renderer.domElement);
  }

  /* ── Scene Builders ─────────────────────────────────── */
  buildScenes() {
    this.sceneGroups = [
      this.buildSceneVoidCollapse(),
      this.buildSceneHelix(),
      this.buildSceneMeridian(),     // Protocol 02
      this.buildSceneSynapse(),
      this.buildSceneRetinalGrid(),
      this.buildSceneEmergencyVitals(), // Protocol 05 (Redesigned)
      this.buildSceneQuantum(),
    ];

    this.sceneGroups.forEach((group, index) => {
      group.userData.alpha = index === 0 ? 1 : 0;
      group.visible = index === 0;
      this.scene.add(group);
    });
  }

  buildSceneVoidCollapse() {
    const group = new THREE.Group();
    const particleCount = 2800;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 7;
      
      positions[idx]     = radius * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = radius * Math.cos(phi);
      positions[idx + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      velocities[idx]     = -positions[idx] * 0.004 + (Math.random() - 0.5) * 0.02;
      velocities[idx + 1] = -positions[idx + 1] * 0.004;
      velocities[idx + 2] = -positions[idx + 2] * 0.004 + (Math.random() - 0.5) * 0.02;
      
      const color = new THREE.Color().lerpColors(PALETTE.wine, PALETTE.primary, i / particleCount);
      colors[idx]     = color.r;
      colors[idx + 1] = color.g;
      colors[idx + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.09, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    group.add(points);
    group.userData = { velocities, points, type: 'void' };
    
    return group;
  }

  buildSceneHelix() {
    const group = new THREE.Group();
    const pointCount = 1400;
    const turns = 4;
    const radius = 2;
    const height = 6;
    
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);

    for (let i = 0; i < pointCount; i++) {
      const idx = i * 3;
      const t = (i / pointCount) * turns * Math.PI * 2;
      const y = (i / pointCount) * height - height / 2;
      const side = i % 2 === 0 ? 1 : -1;
      
      positions[idx]     = Math.cos(t * side) * radius + (Math.random() - 0.5) * 0.12;
      positions[idx + 1] = y + (Math.random() - 0.5) * 0.08;
      positions[idx + 2] = Math.sin(t * side) * radius + (Math.random() - 0.5) * 0.12;
      
      const color = new THREE.Color().lerpColors(PALETTE.dark, PALETTE.peach, i / pointCount);
      colors[idx]     = color.r;
      colors[idx + 1] = color.g;
      colors[idx + 2] = color.b;
    }

    const rungCount = 45;
    const rungPositions = new Float32Array(rungCount * 6);
    const rungColors = new Float32Array(rungCount * 6);

    for (let i = 0; i < rungCount; i++) {
      const idx = i * 6;
      const t = (i / rungCount) * turns * Math.PI * 2;
      const y = (i / rungCount) * height - height / 2;
      
      rungPositions.set([
        Math.cos(t) * radius, y, Math.sin(t) * radius,
        Math.cos(-t) * radius, y, Math.sin(-t) * radius
      ], idx);
      
      rungColors.set([
        PALETTE.primary.r, PALETTE.primary.g, PALETTE.primary.b,
        PALETTE.dark.r, PALETTE.dark.g, PALETTE.dark.b
      ], idx);
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    group.add(new THREE.Points(pointsGeo, new THREE.PointsMaterial({
      size: 0.08, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending
    })));

    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute('position', new THREE.BufferAttribute(rungPositions, 3));
    linesGeo.setAttribute('color', new THREE.BufferAttribute(rungColors, 3));
    group.add(new THREE.LineSegments(linesGeo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false
    })));

    group.userData.type = 'helix';
    return group;
  }

  /* RE-ENGINEERED: Protocol 02 (Perfect Alignment Duo-Pill) */
  buildSceneMeridian() {
    const group = new THREE.Group();
    const rings = [
      { r: 1.2, n: 10, tilt: 0 }, { r: 2.2, n: 18, tilt: 0.4 },
      { r: 3.2, n: 28, tilt: 0.8 }, { r: 4,   n: 38, tilt: 1.2 }
    ];

    rings.forEach(({ r, n, tilt }, ringIndex) => {
      const positions = new Float32Array(n * 3);
      const colors = new Float32Array(n * 3);

      for (let i = 0; i < n; i++) {
        const idx = i * 3;
        const angle = (i / n) * Math.PI * 2;
        const isTaken = Math.random() > 0.25;
        
        positions[idx]     = Math.cos(angle) * r;
        positions[idx + 1] = Math.sin(angle) * r * Math.sin(tilt);
        positions[idx + 2] = Math.sin(angle) * r * Math.cos(tilt) * 0.25;
        
        const color = isTaken ? PALETTE.primary : PALETTE.wine;
        colors[idx] = color.r; colors[idx + 1] = color.g; colors[idx + 2] = color.b;
      }

      const pointsGeo = new THREE.BufferGeometry();
      pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      group.add(new THREE.Points(pointsGeo, new THREE.PointsMaterial({
        size: 0.13 + ringIndex * 0.015, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending
      })));

      const lineNodes = 160;
      const linePositions = new Float32Array(lineNodes * 3);
      const lineColors = new Float32Array(lineNodes * 3);

      for (let j = 0; j < lineNodes; j++) {
        const idx = j * 3;
        const angle = (j / lineNodes) * Math.PI * 2;
        
        linePositions[idx]     = Math.cos(angle) * r;
        linePositions[idx + 1] = Math.sin(angle) * r * Math.sin(tilt);
        linePositions[idx + 2] = Math.sin(angle) * r * Math.cos(tilt) * 0.25;
        
        const color = new THREE.Color().lerpColors(PALETTE.wine, PALETTE.dark, j / lineNodes);
        lineColors[idx] = color.r; lineColors[idx + 1] = color.g; lineColors[idx + 2] = color.b;
      }

      const loopGeo = new THREE.BufferGeometry();
      loopGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      loopGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
      group.add(new THREE.LineLoop(loopGeo, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false
      })));
    });

    // ── Perfect Mathematical Duo-Pill ──
    const capsuleGroup = new THREE.Group();
    const pMat = { size: 0.06, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false };

    // Top Half (Peach)
    const topCapGeo = new THREE.SphereGeometry(0.35, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const topCap = new THREE.Points(topCapGeo, new THREE.PointsMaterial({ color: PALETTE.peach, ...pMat }));
    topCap.position.y = 0.35;
    
    const topCylGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.35, 24, 8, true);
    const topCyl = new THREE.Points(topCylGeo, new THREE.PointsMaterial({ color: PALETTE.peach, ...pMat }));
    topCyl.position.y = 0.175;
    
    // Bottom Half (Primary Rose)
    const botCapGeo = new THREE.SphereGeometry(0.35, 24, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const botCap = new THREE.Points(botCapGeo, new THREE.PointsMaterial({ color: PALETTE.primary, ...pMat }));
    botCap.position.y = -0.35;
    
    const botCylGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.35, 24, 8, true);
    const botCyl = new THREE.Points(botCylGeo, new THREE.PointsMaterial({ color: PALETTE.primary, ...pMat }));
    botCyl.position.y = -0.175;

    // Glowing split line ring
    const gapGeo = new THREE.TorusGeometry(0.35, 0.02, 8, 32);
    const gapRing = new THREE.Points(gapGeo, new THREE.PointsMaterial({ color: PALETTE.white, size: 0.03, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }));
    gapRing.rotation.x = Math.PI / 2;

    capsuleGroup.add(topCap, topCyl, botCap, botCyl, gapRing);

    // Lay flat horizontally
    capsuleGroup.rotation.z = Math.PI / 2;
    capsuleGroup.scale.setScalar(0.9);
    
    group.userData.capsule = capsuleGroup;
    group.add(capsuleGroup);
    
    group.userData.type = 'meridian';
    return group;
  }

  buildSceneSynapse() {
    const group = new THREE.Group();
    const nodes = [
      { x: 0, y: 0, z: 0, r: 0.42, c: PALETTE.primary }, { x: 2.7, y: 0.5, z: 0.4, r: 0.32, c: PALETTE.peach },
      { x: -2.3, y: 0.8, z: -0.3, r: 0.28, c: PALETTE.primary }, { x: 0.4, y: -2.5, z: 0.5, r: 0.32, c: PALETTE.wine },
      { x: -1.7, y: -1.5, z: -0.4, r: 0.22, c: PALETTE.peach }, { x: 1.5, y: 2, z: -0.8, r: 0.22, c: PALETTE.primary }
    ];

    const edges = [
      { a: 0, b: 1, sev: 'crit' }, { a: 0, b: 2, sev: 'warn' }, { a: 0, b: 3, sev: 'mod' },
      { a: 1, b: 4, sev: 'info' }, { a: 0, b: 5, sev: 'crit' }, { a: 2, b: 3, sev: 'warn' }, { a: 1, b: 3, sev: 'mod' }
    ];
    
    const severityColors = { crit: PALETTE.red, warn: PALETTE.gold, mod: PALETTE.peach, info: PALETTE.cyan };

    edges.forEach(({ a, b, sev }) => {
      const nodeA = nodes[a], nodeB = nodes[b];
      const segments = 44;
      const positions = new Float32Array(segments * 3);
      const colors = new Float32Array(segments * 3);

      for (let s = 0; s < segments; s++) {
        const idx = s * 3;
        const t = s / (segments - 1);
        const midX = (nodeA.x + nodeB.x) / 2 + (Math.random() - 0.5) * 0.5;
        const midY = (nodeA.y + nodeB.y) / 2 + (Math.random() - 0.5) * 0.5;
        const midZ = (nodeA.z + nodeB.z) / 2 + (Math.random() - 0.5) * 0.5;
        
        positions[idx]     = (nodeA.x + (midX - nodeA.x) * t) + (nodeB.x - midX) * t;
        positions[idx + 1] = (nodeA.y + (midY - nodeA.y) * t) + (nodeB.y - midY) * t;
        positions[idx + 2] = (nodeA.z + (midZ - nodeA.z) * t) + (nodeB.z - midZ) * t;
        
        const fade = Math.sin(t * Math.PI);
        const edgeColor = severityColors[sev];
        colors[idx] = edgeColor.r * fade; colors[idx + 1] = edgeColor.g * fade; colors[idx + 2] = edgeColor.b * fade;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: sev === 'crit' ? 0.9 : 0.5, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      line.userData.sev = sev;
      group.add(line);
    });

    nodes.forEach(node => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(node.x, node.y, node.z);
      
      const haloNodes = 70;
      const haloPositions = new Float32Array(haloNodes * 3);
      const haloColors = new Float32Array(haloNodes * 3);

      for (let i = 0; i < haloNodes; i++) {
        const idx = i * 3;
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r = node.r * (0.5 + Math.random() * 0.9);
        
        haloPositions.set([r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)], idx);
        
        const c = new THREE.Color().copy(node.c).multiplyScalar(0.4 + Math.random() * 0.8);
        haloColors.set([c.r, c.g, c.b], idx);
      }

      const haloGeo = new THREE.BufferGeometry();
      haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
      haloGeo.setAttribute('color', new THREE.BufferAttribute(haloColors, 3));
      nodeGroup.add(new THREE.Points(haloGeo, new THREE.PointsMaterial({
        size: 0.1, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending
      })));

      const coreGeo = new THREE.BufferGeometry();
      coreGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
      coreGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array([node.c.r, node.c.g, node.c.b]), 3));
      nodeGroup.add(new THREE.Points(coreGeo, new THREE.PointsMaterial({
        size: 0.26, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending
      })));

      group.add(nodeGroup);
    });

    group.userData.type = 'synapse';
    return group;
  }

  buildSceneRetinalGrid() {
    const group = new THREE.Group();
    const cols = 18, rows = 12, width = 7, height = 4.5;
    const nodeCount = cols * rows;
    
    const positions = new Float32Array(nodeCount * 3);
    const colors = new Float32Array(nodeCount * 3);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = (r * cols + c) * 3;
        positions[idx]     = (c / (cols - 1)) * width - width / 2 + (Math.random() - 0.5) * 0.1;
        positions[idx + 1] = (r / (rows - 1)) * height - height / 2 + (Math.random() - 0.5) * 0.1;
        positions[idx + 2] = (Math.random() - 0.5) * 0.4;
        
        const colorVal = Math.random() > 0.3 ? PALETTE.dark : PALETTE.wine;
        colors[idx] = colorVal.r; colors[idx + 1] = colorVal.g; colors[idx + 2] = colorVal.b;
      }
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(pointsGeo, new THREE.PointsMaterial({
      size: 0.09, vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    group.add(points);

    const scanLine = new THREE.Mesh(
      new THREE.PlaneGeometry(width + 0.5, 0.035),
      new THREE.MeshBasicMaterial({ color: PALETTE.primary, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    const glowWave = new THREE.Mesh(
      new THREE.PlaneGeometry(width + 0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: PALETTE.primary, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    
    scanLine.position.y = height / 2;
    glowWave.position.y = height / 2;
    group.add(scanLine);
    group.add(glowWave);

    for (let r = 0; r <= rows; r++) {
      const y = (r / rows) * height - height / 2;
      const linePos = new Float32Array([-width / 2, y, 0, width / 2, y, 0]);
      const lineCol = new Float32Array([
        PALETTE.wine.r * 0.25, PALETTE.wine.g * 0.25, PALETTE.wine.b * 0.25,
        PALETTE.wine.r * 0.25, PALETTE.wine.g * 0.25, PALETTE.wine.b * 0.25
      ]);
      
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
      lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3));
      
      group.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false
      })));
    }

    group.userData = { points, colors: colors, scanLine, glowWave, scanH: height, type: 'retinal' };
    return group;
  }

  /* RE-ENGINEERED: Protocol 05 (Medical Shield & Vitals Rings) */
  buildSceneEmergencyVitals() {
    const group = new THREE.Group();
    
    // 1. Central Medical Cross
    const crossGroup = new THREE.Group();
    const crossMat = new THREE.PointsMaterial({ color: PALETTE.primary, size: 0.08, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    
    // Vertical Bar
    const vGeo = new THREE.BoxGeometry(0.8, 2.4, 0.4, 12, 36, 6);
    const vPts = new THREE.Points(vGeo, crossMat);
    // Horizontal Bar
    const hGeo = new THREE.BoxGeometry(2.4, 0.8, 0.4, 36, 12, 6);
    const hPts = new THREE.Points(hGeo, crossMat);
    
    crossGroup.add(vPts, hPts);
    group.add(crossGroup);

    // 2. Protective Energy Sphere (Shield)
    const shieldGeo = new THREE.SphereGeometry(2.2, 32, 32);
    const shieldMat = new THREE.PointsMaterial({ color: PALETTE.wine, size: 0.04, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
    const shield = new THREE.Points(shieldGeo, shieldMat);
    group.add(shield);

    // 3. Orbital Data Rings (Representing Vitals/Allergies)
    const rings = [];
    const ringRadii = [3.0, 3.5, 4.0];
    const ringColors = [PALETTE.peach, PALETTE.primary, PALETTE.wine];
    const ringSpeeds = [0.5, -0.3, 0.4];

    ringRadii.forEach((r, i) => {
      const rGeo = new THREE.TorusGeometry(r, 0.02, 8, 120);
      const rMat = new THREE.PointsMaterial({ color: ringColors[i], size: 0.06, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
      const rMesh = new THREE.Points(rGeo, rMat);
      
      // Tilt each ring randomly
      rMesh.rotation.x = Math.random() * Math.PI;
      rMesh.rotation.y = Math.random() * Math.PI;
      
      group.add(rMesh);
      rings.push({ mesh: rMesh, speed: ringSpeeds[i] });
    });

    group.userData = { cross: crossGroup, shield, rings, type: 'emergency' };
    return group;
  }

  buildSceneQuantum() {
    const group = new THREE.Group();
    const polyhedra = [
      { geo: new THREE.IcosahedronGeometry(0.9, 1), spin: [0.3, 0.5, 0.2],   c: '#f26b3c', opacity: 0.5 },
      { geo: new THREE.OctahedronGeometry(1.6, 0),  spin: [-0.2, 0.3, -0.4], c: '#ffb88c', opacity: 0.35 },
      { geo: new THREE.TetrahedronGeometry(2.3, 0), spin: [0.15, -0.25, 0.5],c: '#7f1e40', opacity: 0.22 },
      { geo: new THREE.IcosahedronGeometry(2.9, 1), spin: [-0.1, 0.1, 0.3],  c: '#f26b3c', opacity: 0.1 }
    ];

    polyhedra.forEach(({ geo, spin, c, opacity }) => {
      const edges = new THREE.EdgesGeometry(geo);
      const mesh = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
        color: c, transparent: true, opacity: opacity, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      mesh.userData.spin = spin;
      group.add(mesh);
    });

    const dustNodes = 400;
    const dustPositions = new Float32Array(dustNodes * 3);
    const dustColors = new Float32Array(dustNodes * 3);

    for (let i = 0; i < dustNodes; i++) {
      const idx = i * 3;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * 3;
      
      dustPositions[idx]     = r * Math.sin(phi) * Math.cos(theta);
      dustPositions[idx + 1] = r * Math.cos(phi);
      dustPositions[idx + 2] = r * Math.sin(phi) * Math.sin(theta);
      
      const color = new THREE.Color().lerpColors(PALETTE.dark, PALETTE.peach, Math.random());
      dustColors[idx] = color.r; dustColors[idx + 1] = color.g; dustColors[idx + 2] = color.b;
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    group.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
      size: 0.07, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending
    })));

    group.userData.type = 'quantum';
    return group;
  }

  /* ── Observers & Events ─────────────────────────────── */
  setupIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.intersectionRatio >= 0.5) {
          const index = parseInt(entry.target.dataset.phaseIndex);
          if (index !== this.currentPhase) {
            this.currentPhase = index;
            this.syncNavDots(index);
            
            const targetWrap = document.querySelector(`[data-canvas-wrap="${index}"]`);
            if (targetWrap && this.renderer.domElement.parentNode !== targetWrap) {
              targetWrap.appendChild(this.renderer.domElement);
            }
          }
        }
      });
    }, { threshold: 0.5 });
    
    document.querySelectorAll('[data-phase-index]').forEach(section => this.observer.observe(section));
  }

  handleResize() {
    const isDesktop = window.innerWidth >= 768;
    const width = isDesktop ? window.innerWidth / 2 : window.innerWidth;
    const height = isDesktop ? window.innerHeight : window.innerHeight * 0.55;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  handleMouseMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  /* ── Render Loop ────────────────────────────────────── */
  startRenderLoop() {
    this.animationId = requestAnimationFrame(this.startRenderLoop.bind(this));
    
    const time = this.clock.getElapsedTime();
    const mx = this.mouse.x;
    const my = this.mouse.y;

    // Crossfade Logic
    this.sceneGroups.forEach((group, index) => {
      const targetAlpha = index === this.currentPhase ? 1 : 0;
      group.userData.alpha += (targetAlpha - group.userData.alpha) * 0.14;
      const currentAlpha = group.userData.alpha;
      
      group.visible = currentAlpha > 0.004;
      
      group.traverse(child => {
        if (!child.material) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach(mat => {
          if (mat.opacity === undefined) return;
          if (child.userData.baseOpacity === undefined) {
            child.userData.baseOpacity = mat.opacity;
          }
          mat.opacity = child.userData.baseOpacity * currentAlpha;
        });
      });
    });

    const groups = this.sceneGroups;

    // Phase 0: Void Collapse
    if (groups[0]?.visible) {
      groups[0].rotation.y = time * 0.08 + mx * 0.28;
      groups[0].rotation.x = my * 0.14 + Math.sin(time * 0.06) * 0.04;
      
      const posAttr = groups[0].userData.points.geometry.attributes.position;
      const velocities = groups[0].userData.velocities;
      
      for (let i = 0; i < posAttr.count; i++) {
        const px = posAttr.getX(i);
        const py = posAttr.getY(i);
        const pz = posAttr.getZ(i);
        
        if (Math.sqrt(px * px + py * py + pz * pz) < 0.35) {
          const phi = Math.acos(2 * Math.random() - 1);
          const theta = Math.random() * Math.PI * 2;
          const newRadius = 6 + Math.random() * 5;
          
          posAttr.setXYZ(i, newRadius * Math.sin(phi) * Math.cos(theta), newRadius * Math.cos(phi), newRadius * Math.sin(phi) * Math.sin(theta));
          
          velocities[i * 3]     = -posAttr.getX(i) * 0.004 + (Math.random() - 0.5) * 0.02;
          velocities[i * 3 + 1] = -posAttr.getY(i) * 0.004;
          velocities[i * 3 + 2] = -posAttr.getZ(i) * 0.004 + (Math.random() - 0.5) * 0.02;
        } else {
          const swirl = 0.011;
          posAttr.setXYZ(i, px + velocities[i * 3] + pz * swirl, py + velocities[i * 3 + 1], pz + velocities[i * 3 + 2] - px * swirl);
        }
      }
      posAttr.needsUpdate = true;
    }

    // Phase 1: Helix
    if (groups[1]?.visible) {
      groups[1].rotation.y = time * 0.14 + mx * 0.32;
      groups[1].rotation.x = my * 0.12 + Math.sin(time * 0.08) * 0.04;
      groups[1].scale.setScalar(1 + 0.04 * Math.sin(time * 0.7));
    }

    // Phase 2: Meridian
    if (groups[2]?.visible) {
      groups[2].rotation.y = time * 0.2 + mx * 0.38;
      groups[2].rotation.z = Math.sin(time * 0.11) * 0.1;
      
      const capsule = groups[2].userData.capsule;
      if (capsule) {
        capsule.rotation.x = 0.2 + Math.sin(time * 0.4) * 0.1; // Gentle horizontal bobbing
        capsule.position.y = Math.sin(time * 0.55) * 0.14;
      }
    }

    // Phase 3: Synapse
    if (groups[3]?.visible) {
      groups[3].rotation.y = time * 0.09 + mx * 0.42;
      groups[3].rotation.x = my * 0.18 + Math.sin(time * 0.055) * 0.07;
      
      groups[3].children.forEach((child, index) => {
        if (child.isGroup) {
          child.scale.setScalar(1 + 0.1 * Math.sin(time * 1.9 + index * 0.85));
        }
        if (child.isLine && child.userData.sev === 'crit') {
          child.material.opacity = child.userData.baseOpacity * groups[3].userData.alpha * (0.6 + 0.4 * Math.sin(time * 3.6 + index));
        }
      });
    }

    // Phase 4: Retinal Grid
    if (groups[4]?.visible) {
      groups[4].rotation.y = mx * 0.12;
      groups[4].rotation.x = my * 0.07;
      
      const { scanLine, glowWave, points, colors, scanH } = groups[4].userData;
      if (scanLine) {
        const scanY = scanH / 2 - ((time * 0.75) % (scanH + 0.8));
        scanLine.position.y = scanY;
        glowWave.position.y = scanY;
        
        const colAttr = points.geometry.attributes.color;
        const posAttr = points.geometry.attributes.position;
        
        for (let i = 0; i < posAttr.count; i++) {
          const dist = Math.abs(posAttr.getY(i) - scanY);
          const lit = Math.max(0, 1 - dist / 0.7);
          
          colAttr.setXYZ(i, 
            PALETTE.dark.r + (PALETTE.primary.r - PALETTE.dark.r) * lit, 
            PALETTE.dark.g + (PALETTE.primary.g - PALETTE.dark.g) * lit, 
            PALETTE.dark.b + (PALETTE.primary.b - PALETTE.dark.b) * lit
          );
        }
        colAttr.needsUpdate = true;
      }
    }

    // Phase 5: Emergency Vitals Shield
    if (groups[5]?.visible) {
      groups[5].rotation.y = mx * 0.2;
      groups[5].position.y = Math.sin(time * 0.5) * 0.1;
      
      const { cross, shield, rings } = groups[5].userData;
      if (cross) {
        cross.rotation.z = Math.sin(time * 0.5) * 0.05;
        // Heartbeat pulsing effect
        const pulse = 0.7 + 0.3 * Math.abs(Math.sin(time * 3));
        cross.children.forEach(c => c.material.opacity = pulse * groups[5].userData.alpha);
      }
      if (shield) {
        shield.rotation.y = time * 0.15;
        shield.rotation.x = time * 0.1;
      }
      if (rings) {
        rings.forEach(ring => {
          ring.mesh.rotation.z += ring.speed * 0.02;
        });
      }
    }

    // Phase 6: Quantum Lock
    if (groups[6]?.visible) {
      groups[6].children.forEach(child => {
        if (child.userData.spin) {
          child.rotation.x += child.userData.spin[0] * 0.007;
          child.rotation.y += child.userData.spin[1] * 0.007;
          child.rotation.z += child.userData.spin[2] * 0.007;
        }
      });
      groups[6].rotation.x = my * 0.18 + Math.sin(time * 0.045) * 0.05;
      groups[6].rotation.y += 0.003 + mx * 0.008;
    }

    // Camera Drift
    this.camera.position.x += (mx * 0.5 - this.camera.position.x) * 0.04;
    this.camera.position.y += (my * 0.35 - this.camera.position.y) * 0.04;
    this.camera.lookAt(0, 0, 0);
    
    this.renderer.render(this.scene, this.camera);
  }
}

let activeEngineInstance = null;

export function launchStoryEngine() { 
  if (!activeEngineInstance) activeEngineInstance = new StoryEngine(); 
  activeEngineInstance.mount(); 
}

export function closeStoryEngine() { 
  activeEngineInstance?.unmount(); 
  activeEngineInstance = null; 
}