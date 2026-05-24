/**
 * @fileoverview CarePoint Vision Scanner — Complete Rebuild
 *
 * Features implemented:
 *  • Google Lens–style real-time video feed with correct zoom/aspect
 *  • Canvas overlay: colour zones on live video (background, text areas, title areas)
 *  • Particle cloud around detected word regions
 *  • Glowing title–region highlights with real-time bounding-box rendering
 *  • Freeze → Snapshot → Tesseract.js OCR pipeline with preprocessing
 *  • Skeleton loading state during analysis
 *  • Fuzzy + alias matching against the Indian Drug Dataset
 *  • Regex extraction: dosage, unit, frequency, quantity
 *  • Front/back camera toggle (no zoom distortion)
 *  • Single-page no-scroll layout (full viewport height)
 *  • Firebase Firestore scan history logging
 *  • Graceful camera permission error handling
 *  • Routed result redirect to #/add with pre-filled query params
 */

import { INDIAN_DRUG_DATASET, fuzzySearchDrugs, SCHEDULE_INFO } from '../data/indian-drug-dataset.js';
import state from '../core/state.js';
import { db as firebaseDb } from '../core/firebase.js';
import {
  collection, addDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import VisionPipeline from '../services/VisionPipeline.js';

export default class ScanView {
  constructor() {
    this.isProcessing      = false;
    this.stream            = null;
    this.facingMode        = 'environment';
    this.animFrameId       = null;
    this.overlayCtx        = null;
    this.particles         = [];
    this.detectedRegions   = [];
    this.lastOcrTime       = 0;
    this.liveOcrThrottle   = 1800;
    this.liveWords         = [];
    this.isSnapping        = false;
    this.scanPhase         = 'idle';
    this.cameraReady       = false;
    this.particlePool      = [];
    this.torchOn           = false;
    this.videoTrack        = null;
    this.currentResults    = null;
    this.pipeline          = new VisionPipeline();

    this.container = document.createElement('div');
    this.container.className = 'scan-view-root';
    this.container.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      background: #050203;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      font-family: 'Inter', sans-serif;
      z-index: 10;
    `;

    this._boundLoop = this._renderLoop.bind(this);
  }

  async render() {
    this._buildDOM();
    this._cacheElements();
    this._attachListeners();
    this._startParticleSystem();
    await this._startCamera();
    return this.container;
  }

  _buildDOM() {
    this.container.innerHTML = `
      <style>
        .scan-view-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

        @keyframes scanLine {
          0%   { top: 8%;  opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 92%; opacity: 0; }
        }
        @keyframes cornerPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes particleFade {
          0%   { opacity: 0; transform: scale(0) translateY(0px); }
          20%  { opacity: 1; transform: scale(1) translateY(-4px); }
          80%  { opacity: 0.8; }
          100% { opacity: 0; transform: scale(0.3) translateY(-20px); }
        }
        @keyframes rippleOut {
          0%   { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes skelSlide {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes snapFlash {
          0%   { opacity: 0; }
          30%  { opacity: 0.85; }
          100% { opacity: 0; }
        }
        @keyframes resultSlideUp {
          0%   { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spinDot {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes wordHighlight {
          0%, 100% { box-shadow: 0 0 0 1px rgba(255,184,140,0.3); }
          50%       { box-shadow: 0 0 12px 2px rgba(255,184,140,0.7); }
        }
        @keyframes floatUp {
          0%   { transform: translateY(0px) scale(1); opacity: 1; }
          100% { transform: translateY(-60px) scale(0); opacity: 0; }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(255,184,140,0.4)); }
          50%       { filter: drop-shadow(0 0 14px rgba(255,184,140,0.9)); }
        }
        @keyframes zoneReveal {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes badgePop {
          0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes scannerSweep {
          0%   { transform: translateY(0); opacity: 0.9; }
          50%  { opacity: 1; }
          100% { transform: translateY(260px); opacity: 0.9; }
        }

        .skel-shimmer {
          background: linear-gradient(90deg, #1a0a12 25%, #2d1020 50%, #1a0a12 75%);
          background-size: 800px 100%;
          animation: skelSlide 1.4s infinite linear;
          border-radius: 8px;
        }

        .scan-btn-ring {
          animation: glowPulse 2s ease-in-out infinite;
        }
        .overlay-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .particle-host {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .particle-dot {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          animation: particleFade var(--dur, 1.2s) ease-out forwards;
        }
      </style>

      <!-- TOP HEADER BAR -->
      <div id="sv-header" style="
        position: relative;
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px 10px;
        padding-top: max(14px, env(safe-area-inset-top));
        background: linear-gradient(180deg, rgba(5,2,3,0.98) 0%, rgba(5,2,3,0.7) 100%);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(127,47,93,0.25);
        flex-shrink: 0;
      ">
        <button id="sv-back" style="
          display: flex; align-items: center; gap: 6px;
          color: #ffb88c; font-size: 13px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          background: none; border: none; cursor: pointer; padding: 4px;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>

        <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
          <span style="color: white; font-size: 15px; font-weight: 700; letter-spacing: -0.02em;">Vision Scanner</span>
          <span id="sv-status-text" style="color: #7f2f5d; font-size: 10px; font-family: 'Roboto Mono', monospace; letter-spacing: 0.12em; text-transform: uppercase;">Initializing…</span>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="sv-torch" style="
            width: 36px; height: 36px; border-radius: 50%;
            border: 1px solid rgba(255,184,140,0.25);
            background: rgba(26,10,18,0.8);
            color: rgba(255,184,140,0.45);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 2l1.5 4.5L13 8l-3 5 4 4-7 5 2-8-4-4 4.5-1.5L9 2z"/>
            </svg>
          </button>
          <button id="sv-cam-switch" style="
            width: 36px; height: 36px; border-radius: 50%;
            border: 1px solid rgba(255,184,140,0.25);
            background: rgba(26,10,18,0.8);
            color: #ffb88c;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s; active: scale(0.9);
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- CAMERA VIEWPORT -->
      <div id="sv-viewport" style="
        position: relative;
        flex: 1;
        overflow: hidden;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Live video -->
        <video id="sv-video" autoplay playsinline muted style="
          position: absolute;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        "></video>

        <!-- Hidden capture canvas -->
        <canvas id="sv-capture-canvas" style="display: none;"></canvas>

        <!-- Real-time overlay canvas (drawn every frame) -->
        <canvas id="sv-overlay-canvas" class="overlay-canvas"></canvas>

        <!-- Particle host -->
        <div id="sv-particle-host" class="particle-host"></div>

        <!-- Scan frame corners -->
        <div id="sv-frame" style="
          position: absolute;
          inset: 0;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div id="sv-frame-inner" style="
            position: relative;
            width: 88%;
            height: 260px;
          ">
            <!-- Corner TL -->
            <div style="position:absolute;top:-2px;left:-2px;width:24px;height:24px;border-top:3px solid #ffb88c;border-left:3px solid #ffb88c;border-radius:4px 0 0 0;animation:cornerPulse 1.8s ease-in-out infinite;"></div>
            <!-- Corner TR -->
            <div style="position:absolute;top:-2px;right:-2px;width:24px;height:24px;border-top:3px solid #ffb88c;border-right:3px solid #ffb88c;border-radius:0 4px 0 0;animation:cornerPulse 1.8s ease-in-out infinite 0.2s;"></div>
            <!-- Corner BL -->
            <div style="position:absolute;bottom:-2px;left:-2px;width:24px;height:24px;border-bottom:3px solid #ffb88c;border-left:3px solid #ffb88c;border-radius:0 0 0 4px;animation:cornerPulse 1.8s ease-in-out infinite 0.4s;"></div>
            <!-- Corner BR -->
            <div style="position:absolute;bottom:-2px;right:-2px;width:24px;height:24px;border-bottom:3px solid #ffb88c;border-right:3px solid #ffb88c;border-radius:0 0 4px 0;animation:cornerPulse 1.8s ease-in-out infinite 0.6s;"></div>

            <!-- Scan sweep line -->
            <div id="sv-sweep" style="
              position: absolute;
              left: 0; right: 0; top: 0;
              height: 2px;
              background: linear-gradient(90deg, transparent 0%, rgba(255,184,140,0.15) 10%, rgba(255,184,140,0.9) 50%, rgba(255,184,140,0.15) 90%, transparent 100%);
              box-shadow: 0 0 12px 3px rgba(255,184,140,0.5);
              animation: scannerSweep 2.4s ease-in-out infinite alternate;
              border-radius: 1px;
            "></div>

            <!-- Guide text -->
            <div style="
              position: absolute;
              bottom: -32px;
              left: 0; right: 0;
              text-align: center;
              font-size: 10px;
              font-family: 'Roboto Mono', monospace;
              color: rgba(255,255,255,0.4);
              letter-spacing: 0.1em;
              text-transform: uppercase;
            ">Align tablet label within frame</div>
          </div>
        </div>

        <!-- Flash overlay for snapshot -->
        <div id="sv-flash" style="
          position: absolute; inset: 0;
          background: white;
          opacity: 0; pointer-events: none;
          transition: opacity 0.05s;
        "></div>

        <!-- Processing overlay (skeleton state) -->
        <div id="sv-processing-overlay" style="
          position: absolute; inset: 0;
          background: rgba(5,2,3,0.92);
          backdrop-filter: blur(8px);
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          z-index: 30;
        ">
          <!-- Spinner with icon -->
          <div style="position: relative; width: 72px; height: 72px;">
            <div style="
              position: absolute; inset: 0;
              border: 2px solid rgba(255,184,140,0.12);
              border-radius: 50%;
            "></div>
            <div style="
              position: absolute; inset: 0;
              border: 2px solid transparent;
              border-top-color: #ffb88c;
              border-right-color: rgba(255,184,140,0.3);
              border-radius: 50%;
              animation: spinDot 0.9s linear infinite;
            "></div>
            <div style="
              position: absolute; inset: 8px;
              border: 1px solid rgba(127,47,93,0.4);
              border-bottom-color: #7f2f5d;
              border-radius: 50%;
              animation: spinDot 1.5s linear infinite reverse;
            "></div>
            <div style="
              position: absolute; inset: 0;
              display: flex; align-items: center; justify-content: center;
            ">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffb88c" stroke-width="1.8">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
          </div>

          <!-- Phase label -->
          <div style="text-align: center;">
            <div id="sv-phase-label" style="
              font-size: 15px; font-weight: 700; color: white;
              letter-spacing: -0.02em; margin-bottom: 6px;
            ">Analyzing Image…</div>
            <div id="sv-phase-sub" style="
              font-size: 10px; font-family: 'Roboto Mono', monospace;
              color: #ffb88c; letter-spacing: 0.15em; text-transform: uppercase;
            ">Preprocessing frame</div>
          </div>

          <!-- Skeleton cards -->
          <div style="width: 260px; display: flex; flex-direction: column; gap: 10px; padding: 0 4px;">
            <div class="skel-shimmer" style="height: 18px; width: 60%;"></div>
            <div class="skel-shimmer" style="height: 14px; width: 80%;"></div>
            <div class="skel-shimmer" style="height: 14px; width: 45%;"></div>
            <div style="display: flex; gap: 8px; margin-top: 4px;">
              <div class="skel-shimmer" style="height: 32px; flex: 1; border-radius: 10px;"></div>
              <div class="skel-shimmer" style="height: 32px; flex: 1; border-radius: 10px;"></div>
            </div>
          </div>
        </div>

        <!-- Camera error state -->
        <div id="sv-cam-error" style="
          position: absolute; inset: 0;
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 24px;
          text-align: center;
        ">
          <div style="
            width: 64px; height: 64px; border-radius: 50%;
            background: rgba(239,68,68,0.1);
            border: 1px solid rgba(239,68,68,0.3);
            display: flex; align-items: center; justify-content: center;
          ">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.8">
              <path d="M23 7 16 12l7 5V7zM14 5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V7c0-1.1.9-2 2-2h12z"/>
              <line x1="2" y1="2" x2="22" y2="22" stroke="#ef4444"/>
            </svg>
          </div>
          <div>
            <div style="color: white; font-size: 15px; font-weight: 700; margin-bottom: 6px;">Camera Unavailable</div>
            <div style="color: rgba(255,255,255,0.5); font-size: 12px; line-height: 1.6;">Please allow camera access in your browser settings to use the scanner.</div>
          </div>
          <button id="sv-retry-cam" style="
            padding: 10px 24px; border-radius: 20px;
            background: rgba(127,47,93,0.4); border: 1px solid #7f2f5d;
            color: #ffb88c; font-size: 13px; font-weight: 600;
            cursor: pointer;
          ">Retry Camera</button>
        </div>
      </div>

      <!-- BOTTOM CONTROLS -->
      <div id="sv-controls" style="
        position: relative;
        z-index: 50;
        flex-shrink: 0;
        padding: 20px 24px 28px;
        padding-bottom: max(28px, env(safe-area-inset-bottom));
        background: linear-gradient(0deg, rgba(5,2,3,0.98) 0%, rgba(5,2,3,0.7) 100%);
        backdrop-filter: blur(12px);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      ">
        <!-- Live detection badge strip -->
        <div id="sv-live-badge" style="
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          min-height: 28px;
        ">
          <span style="font-size: 10px; color: rgba(255,255,255,0.3); font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase;">Live:</span>
          <div id="sv-badge-container" style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;"></div>
        </div>

        <!-- Main shutter row -->
        <div style="display: flex; align-items: center; justify-content: center; gap: 32px; width: 100%;">
          <!-- Gallery placeholder -->
          <button id="sv-gallery" style="
            width: 48px; height: 48px; border-radius: 12px;
            border: 1px solid rgba(255,184,140,0.2);
            background: rgba(26,10,18,0.6);
            color: rgba(255,184,140,0.5);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>

          <!-- Shutter button -->
          <button id="sv-capture-btn" class="scan-btn-ring" style="
            width: 80px; height: 80px; border-radius: 50%;
            border: 3px solid rgba(255,184,140,0.4);
            background: radial-gradient(circle at 38% 35%, #a0415f, #4a1532 60%, #1a0a12);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            position: relative;
            transition: transform 0.15s, border-color 0.15s;
          ">
            <div style="
              width: 60px; height: 60px; border-radius: 50%;
              background: radial-gradient(circle at 40% 38%, #ffb88c, #c0522a 50%, #7f2f5d);
              border: 2px solid rgba(255,255,255,0.15);
              box-shadow: inset 0 -4px 8px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1);
            "></div>
            <!-- Ripple rings -->
            <div id="sv-ripple-1" style="
              position: absolute; inset: -6px; border-radius: 50%;
              border: 1.5px solid rgba(255,184,140,0.25);
              animation: rippleOut 2.4s ease-out infinite;
              pointer-events: none;
            "></div>
            <div id="sv-ripple-2" style="
              position: absolute; inset: -6px; border-radius: 50%;
              border: 1.5px solid rgba(127,47,93,0.3);
              animation: rippleOut 2.4s ease-out infinite 0.8s;
              pointer-events: none;
            "></div>
          </button>

          <!-- Zoom level toggle -->
          <button id="sv-zoom-toggle" style="
            width: 48px; height: 48px; border-radius: 12px;
            border: 1px solid rgba(255,184,140,0.2);
            background: rgba(26,10,18,0.6);
            color: rgba(255,184,140,0.5);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            cursor: pointer; gap: 1px;
          ">
            <span style="font-size: 14px; font-weight: 700; color: #ffb88c; line-height: 1;">1×</span>
            <span style="font-size: 8px; color: rgba(255,184,140,0.5); font-family: monospace; letter-spacing: 0.05em;">ZOOM</span>
          </button>
        </div>

        <!-- Instruction hint -->
        <p style="
          font-size: 10px;
          font-family: 'Roboto Mono', monospace;
          color: rgba(255,255,255,0.25);
          margin: 0;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        ">Tap shutter to scan • Hold steady</p>
      </div>

      <!-- RESULT SHEET (slides up) -->
      <div id="sv-result-sheet" style="
        position: fixed;
        left: 0; right: 0; bottom: 0;
        z-index: 100;
        transform: translateY(100%);
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        border-radius: 24px 24px 0 0;
        overflow: hidden;
        background: linear-gradient(180deg, #140710 0%, #0a0407 100%);
        border-top: 1px solid rgba(127,47,93,0.4);
        max-height: 75vh;
        display: flex;
        flex-direction: column;
      ">
        <!-- Sheet drag handle -->
        <div style="padding: 12px 0 0; display: flex; justify-content: center; flex-shrink: 0;">
          <div style="width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.15);"></div>
        </div>

        <!-- Sheet header -->
        <div style="
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px 10px;
          flex-shrink: 0;
        ">
          <div>
            <div style="font-size: 11px; color: #7f2f5d; font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 2px;">Scan Result</div>
            <div id="sv-result-name" style="font-size: 20px; font-weight: 800; color: white; letter-spacing: -0.03em;"></div>
          </div>
          <div id="sv-result-schedule-badge" style="
            padding: 5px 12px; border-radius: 20px; font-size: 10px;
            font-family: monospace; font-weight: 700; letter-spacing: 0.08em;
            text-transform: uppercase;
          "></div>
        </div>

        <!-- Sheet body -->
        <div style="flex: 1; overflow-y: auto; padding: 0 20px 20px;">
          <!-- Dosage row -->
          <div id="sv-result-dosage-row" style="
            display: flex; gap: 10px; margin-bottom: 14px;
          "></div>

          <!-- Aliases row -->
          <div id="sv-result-aliases" style="
            display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;
          "></div>

          <!-- Drug info card -->
          <div id="sv-result-info-card" style="
            background: rgba(127,47,93,0.1);
            border: 1px solid rgba(127,47,93,0.25);
            border-radius: 14px;
            padding: 14px;
            margin-bottom: 16px;
            display: none;
          ">
            <div id="sv-result-category" style="font-size: 11px; color: #7f2f5d; font-family: monospace; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px;"></div>
            <div id="sv-result-manufacturers" style="font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.6;"></div>
            <div id="sv-result-forms" style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 6px; line-height: 1.6;"></div>
          </div>

          <!-- Raw OCR text preview -->
          <details style="margin-bottom: 16px;">
            <summary style="font-size: 11px; color: rgba(255,184,140,0.4); font-family: monospace; cursor: pointer; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 0;">Raw OCR Text</summary>
            <div id="sv-result-raw" style="
              margin-top: 8px;
              background: rgba(0,0,0,0.4);
              border: 1px solid rgba(255,255,255,0.06);
              border-radius: 8px;
              padding: 10px;
              font-size: 10px;
              font-family: monospace;
              color: rgba(255,255,255,0.4);
              line-height: 1.7;
              white-space: pre-wrap;
              word-break: break-word;
              max-height: 120px;
              overflow-y: auto;
            "></div>
          </details>

          <!-- Action buttons -->
          <div style="display: flex; gap: 10px;">
            <button id="sv-result-add" style="
              flex: 1; padding: 14px; border-radius: 14px;
              background: linear-gradient(135deg, #7f2f5d, #4a1532);
              border: 1px solid rgba(255,184,140,0.2);
              color: white; font-size: 14px; font-weight: 700;
              cursor: pointer; letter-spacing: -0.01em;
            ">Add to Medications</button>
            <button id="sv-result-retry" style="
              padding: 14px 16px; border-radius: 14px;
              background: rgba(26,10,18,0.8);
              border: 1px solid rgba(255,184,140,0.15);
              color: rgba(255,184,140,0.7); font-size: 13px; font-weight: 600;
              cursor: pointer;
            ">Retry</button>
          </div>
        </div>
      </div>
    `;
  }

  _cacheElements() {
    this._video           = this.container.querySelector('#sv-video');
    this._captureCanvas   = this.container.querySelector('#sv-capture-canvas');
    this._overlayCanvas   = this.container.querySelector('#sv-overlay-canvas');
    this._particleHost    = this.container.querySelector('#sv-particle-host');
    this._viewport        = this.container.querySelector('#sv-viewport');
    this._statusText      = this.container.querySelector('#sv-status-text');
    this._procOverlay     = this.container.querySelector('#sv-processing-overlay');
    this._phaseLabel      = this.container.querySelector('#sv-phase-label');
    this._phaseSub        = this.container.querySelector('#sv-phase-sub');
    this._camError        = this.container.querySelector('#sv-cam-error');
    this._captureBtn      = this.container.querySelector('#sv-capture-btn');
    this._switchBtn       = this.container.querySelector('#sv-cam-switch');
    this._torchBtn        = this.container.querySelector('#sv-torch');
    this._backBtn         = this.container.querySelector('#sv-back');
    this._flash           = this.container.querySelector('#sv-flash');
    this._badgeContainer  = this.container.querySelector('#sv-badge-container');
    this._resultSheet     = this.container.querySelector('#sv-result-sheet');
    this._resultName      = this.container.querySelector('#sv-result-name');
    this._resultDosRow    = this.container.querySelector('#sv-result-dosage-row');
    this._resultAliases   = this.container.querySelector('#sv-result-aliases');
    this._resultInfoCard  = this.container.querySelector('#sv-result-info-card');
    this._resultCat       = this.container.querySelector('#sv-result-category');
    this._resultMfrs      = this.container.querySelector('#sv-result-manufacturers');
    this._resultForms     = this.container.querySelector('#sv-result-forms');
    this._resultRaw       = this.container.querySelector('#sv-result-raw');
    this._resultAdd       = this.container.querySelector('#sv-result-add');
    this._resultRetry     = this.container.querySelector('#sv-result-retry');
    this._resultSched     = this.container.querySelector('#sv-result-schedule-badge');
    this._zoomToggle      = this.container.querySelector('#sv-zoom-toggle');

    this.overlayCtx = this._overlayCanvas.getContext('2d');
  }

  _attachListeners() {
    this._backBtn.addEventListener('click', () => {
      this.destroy();
      window.history.back();
    });

    this._captureBtn.addEventListener('click', () => {
      if (!this.isProcessing && !this.isSnapping) this._handleCapture();
    });
    this._captureBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!this.isProcessing && !this.isSnapping) this._handleCapture();
    }, { passive: false });

    this._switchBtn.addEventListener('click', () => this._switchCamera());

    this._torchBtn.addEventListener('click', () => this._toggleTorch());

    this._resultAdd.addEventListener('click', () => this._navigateToAdd());

    this._resultRetry.addEventListener('click', () => {
      this._hideResultSheet();
      this.isProcessing = false;
      this._setStatus('Ready', 'Ready to scan');
    });

    this.container.querySelector('#sv-retry-cam')?.addEventListener('click', () => {
      this._camError.style.display = 'none';
      this._startCamera();
    });

    this._video.addEventListener('loadedmetadata', () => {
      this.cameraReady = true;
      this._resizeOverlay();
      this._setStatus('Camera Ready', 'Point at a medicine label');
      this._startRenderLoop();
    });

    this._video.addEventListener('playing', () => {
      this.cameraReady = true;
    });

    window.addEventListener('resize', () => this._resizeOverlay());
    this._resizeOverlay();
  }

  _setStatus(title, sub) {
    if (this._statusText) this._statusText.textContent = sub || title;
  }

  _resizeOverlay() {
    if (!this._overlayCanvas || !this._viewport) return;
    const vp = this._viewport.getBoundingClientRect();
    this._overlayCanvas.width  = vp.width;
    this._overlayCanvas.height = vp.height;
    this._particleHost.style.width  = vp.width + 'px';
    this._particleHost.style.height = vp.height + 'px';
  }

  async _startCamera() {
    try {
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
        this.videoTrack = null;
      }

      const constraints = {
        video: {
          facingMode: { ideal: this.facingMode },
          width:  { ideal: 1280, max: 1920 },
          height: { ideal: 720,  max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoTrack = this.stream.getVideoTracks()[0];
      this._video.srcObject = this.stream;
      this._video.play().catch(() => {});
      this._setStatus('Camera Active', 'Camera stream started');

    } catch (err) {
      console.warn('[Scanner] Camera access denied:', err);
      this._camError.style.display = 'flex';
      this._setStatus('Camera Error', 'Camera blocked');
    }
  }

  async _switchCamera() {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    this.cameraReady = false;
    this._switchBtn.style.opacity = '0.5';
    await this._startCamera();
    this._switchBtn.style.opacity = '1';
  }

  async _toggleTorch() {
    if (!this.videoTrack) return;
    try {
      const capabilities = this.videoTrack.getCapabilities?.();
      if (capabilities?.torch) {
        this.torchOn = !this.torchOn;
        await this.videoTrack.applyConstraints({ advanced: [{ torch: this.torchOn }] });
        this._torchBtn.style.color = this.torchOn ? '#ffb88c' : 'rgba(255,184,140,0.45)';
        this._torchBtn.style.borderColor = this.torchOn ? 'rgba(255,184,140,0.6)' : 'rgba(255,184,140,0.25)';
      } else {
        this._showToast('Torch not supported on this device', 'warn');
      }
    } catch (e) {
      console.warn('[Scanner] Torch error:', e);
    }
  }

  _startRenderLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this._renderLoop();
  }

  _renderLoop() {
    this.animFrameId = requestAnimationFrame(this._boundLoop);
    if (!this.cameraReady || this.isProcessing) return;
    this._drawOverlay();
    this._updateParticles();
    this._maybeLiveOcr();
  }

  _drawOverlay() {
    const ctx = this.overlayCtx;
    if (!ctx) return;
    const W = this._overlayCanvas.width;
    const H = this._overlayCanvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!this._video.videoWidth) return;

    const vW = this._video.videoWidth;
    const vH = this._video.videoHeight;

    const scaleX = W / vW;
    const scaleY = H / vH;

    const zones = this._computeVideoZones(W, H);

    ctx.save();

    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    if (this.liveWords.length > 0 && !this.isProcessing) {
      this._drawWordRegions(ctx, scaleX, scaleY, W, H);
    }

    ctx.restore();
  }

  _computeVideoZones(W, H) {
    return {
      center: { x: W * 0.06, y: H * 0.18, w: W * 0.88, h: H * 0.64 }
    };
  }

  _drawWordRegions(ctx, scaleX, scaleY, W, H) {
    const words = this.liveWords;
    const frameLeft   = W * 0.06;
    const frameTop    = H * 0.18;
    const frameRight  = W * 0.94;
    const frameBottom = H * 0.82;

    for (const word of words) {
      if (!word.bbox || word.text.trim().length < 2) continue;

      const { x0, y0, x1, y1 } = word.bbox;
      const rx = x0 * scaleX;
      const ry = y0 * scaleY;
      const rw = (x1 - x0) * scaleX;
      const rh = (y1 - y0) * scaleY;

      if (rx < frameLeft || rx + rw > frameRight) continue;
      if (ry < frameTop  || ry + rh > frameBottom) continue;

      const conf = (word.confidence || 50) / 100;
      const isTitle = word.text.length > 3 && conf > 0.65 && rh > 16;
      const isKeyword = this._isKnownDrugWord(word.text);

      if (isKeyword) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 184, 140, ${0.4 + conf * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.shadowColor = '#ffb88c';
        ctx.shadowBlur = 6;
        this._roundRect(ctx, rx - 3, ry - 2, rw + 6, rh + 4, 4);
        ctx.stroke();

        const grd = ctx.createLinearGradient(rx, ry, rx, ry + rh);
        grd.addColorStop(0, `rgba(255,184,140,${0.08 * conf})`);
        grd.addColorStop(1, `rgba(127,47,93,${0.06 * conf})`);
        ctx.fillStyle = grd;
        this._roundRect(ctx, rx - 3, ry - 2, rw + 6, rh + 4, 4);
        ctx.fill();
        ctx.restore();

        if (Math.random() < 0.06) {
          this._emitParticle(rx + rw / 2, ry + rh / 2, '#ffb88c');
        }

      } else if (isTitle) {
        ctx.save();
        ctx.strokeStyle = `rgba(200, 120, 255, ${0.25 + conf * 0.35})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        const bgGrd = ctx.createLinearGradient(rx, ry, rx, ry + rh);
        bgGrd.addColorStop(0, `rgba(160,65,95,${0.08 * conf})`);
        bgGrd.addColorStop(1, `rgba(75,21,50,${0.04})`);
        ctx.fillStyle = bgGrd;
        this._roundRect(ctx, rx - 2, ry - 1, rw + 4, rh + 2, 3);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

      } else if (conf > 0.4) {
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${0.02 * conf})`;
        this._roundRect(ctx, rx - 1, ry - 1, rw + 2, rh + 2, 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _isKnownDrugWord(text) {
    const t = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (t.length < 3) return false;
    for (const drug of INDIAN_DRUG_DATASET) {
      if (drug.name.toLowerCase().includes(t)) return true;
      for (const alias of drug.aliases || []) {
        const a = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (a.includes(t) && t.length >= 4) return true;
      }
    }
    return false;
  }

  _startParticleSystem() {
    this.particles = [];
  }

  _emitParticle(x, y, color = '#ffb88c') {
    const spread = 24;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'particle-dot';
      const size = 2 + Math.random() * 4;
      const dur  = 0.9 + Math.random() * 0.7;
      el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        left: ${x + (Math.random() - 0.5) * spread}px;
        top: ${y + (Math.random() - 0.5) * spread}px;
        --dur: ${dur}s;
        opacity: 0;
        box-shadow: 0 0 ${size * 2}px ${color};
      `;
      this._particleHost.appendChild(el);
      setTimeout(() => el.remove(), dur * 1000 + 100);
    }
  }

  _emitParticleBurst(x, y, color = '#ffb88c', count = 18) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r     = 20 + Math.random() * 40;
      const ex    = x + Math.cos(angle) * r;
      const ey    = y + Math.sin(angle) * r;
      this._emitParticle(ex, ey, color);
    }
  }

  _updateParticles() {
  }

  async _maybeLiveOcr() {
    if (!this.cameraReady || this.isProcessing) return;
    if (!this.pipeline.isReady) return;

    const now = Date.now();
    if (now - this.lastOcrTime < this.liveOcrThrottle) return;
    this.lastOcrTime = now;

    if (!this._video.videoWidth) return;

    try {
      // Use Pipeline to process a scaled-down 35% frame for real-time speed
      const processedCanvas = this.pipeline.preprocessImage(this._video, 0.35);
      const result = await this.pipeline.recognizeText(processedCanvas);
      
      this.liveWords = result.words.map(w => ({
        text: w.text,
        confidence: w.confidence,
        bbox: w.bbox ? {
          x0: w.bbox.x0 / 0.35, y0: w.bbox.y0 / 0.35,
          x1: w.bbox.x1 / 0.35, y1: w.bbox.y1 / 0.35
        } : null
      }));
      this._updateLiveBadges();
    } catch (e) {
      // Ignore live OCR silent fails
    }
  }

  _updateLiveBadges() {
    const matches = [];
    const seenDrugs = new Set();

    for (const word of this.liveWords) {
      if (word.text.length < 4 || word.confidence < 45) continue;
      const results = fuzzySearchDrugs(word.text, INDIAN_DRUG_DATASET, 0.6);
      for (const r of results) {
        if (!seenDrugs.has(r.drug.name)) {
          seenDrugs.add(r.drug.name);
          matches.push(r);
        }
      }
    }

    if (!this._badgeContainer) return;
    this._badgeContainer.innerHTML = '';
    const top = matches.slice(0, 4);
    for (const m of top) {
      const badge = document.createElement('div');
      badge.style.cssText = `
        padding: 4px 10px; border-radius: 20px;
        background: rgba(127,47,93,0.25);
        border: 1px solid rgba(127,47,93,0.5);
        color: #ffb88c; font-size: 10px;
        font-family: 'Roboto Mono', monospace;
        font-weight: 600;
        letter-spacing: 0.06em;
        animation: badgePop 0.3s cubic-bezier(0.16,1,0.3,1) both;
      `;
      badge.textContent = m.drug.name;
      this._badgeContainer.appendChild(badge);
    }
  }

  async _handleCapture() {
    if (!this.cameraReady || this.isProcessing || this.isSnapping) return;
    if (typeof Tesseract === 'undefined') {
      this._showToast('Vision engine loading… please wait.', 'warn');
      return;
    }

    this.isSnapping   = true;
    this.isProcessing = true;

    this._captureBtn.style.transform = 'scale(0.88)';
    setTimeout(() => { if (this._captureBtn) this._captureBtn.style.transform = 'scale(1)'; }, 160);

    this._doFlash();

    const vW = this._video.videoWidth;
    const vH = this._video.videoHeight;

    this._captureCanvas.width  = vW;
    this._captureCanvas.height = vH;
    const ctx = this._captureCanvas.getContext('2d');

    ctx.filter = 'contrast(1.45) brightness(1.05) grayscale(1)';
    ctx.drawImage(this._video, 0, 0, vW, vH);

    const vp = this._viewport.getBoundingClientRect();
    this._emitParticleBurst(vp.width / 2, vp.height / 2, '#ffb88c', 24);

    this._showProcessingOverlay('Reading Label…', 'Freeze-framing image');
    this.isSnapping = false;

    await this._runOcrPipeline();
  }

  _doFlash() {
    this._flash.style.opacity = '0.8';
    setTimeout(() => { if (this._flash) this._flash.style.opacity = '0'; }, 120);
  }

  _showProcessingOverlay(title = 'Analyzing…', sub = 'Processing') {
    this._procOverlay.style.display = 'flex';
    if (this._phaseLabel) this._phaseLabel.textContent = title;
    if (this._phaseSub)   this._phaseSub.textContent   = sub;
  }

  _hideProcessingOverlay() {
    this._procOverlay.style.display = 'none';
  }

  _setPhase(title, sub) {
    if (this._phaseLabel) this._phaseLabel.textContent = title;
    if (this._phaseSub)   this._phaseSub.textContent   = sub;
  }

  async _runOcrPipeline() {
    try {
      this._setPhase('Enhancing Image…', 'Applying binarization thresholding');
      
      // 1. Pipeline: Preprocess full resolution frame
      const processedCanvas = this.pipeline.preprocessImage(this._video, 1.0);

      this._setPhase('Running OCR Engine…', 'Tesseract.js — Neural Net Active');

      // 2. Pipeline: Recognize Text
      const ocrResult = await this.pipeline.recognizeText(processedCanvas, (pct) => {
        this._setPhase('Reading Text…', `OCR progress: ${pct}%`);
      });

      this._setPhase('Matching Drug Database…', 'Querying Indian pharmaceutical index');

      // 3. Pipeline: Extract & Map Data
      const extractedData = this.pipeline.extractMedicineData(ocrResult.rawText, ocrResult.words);
      this.currentResults = extractedData;

      await new Promise(r => setTimeout(r, 350));

      this._hideProcessingOverlay();
      this.isProcessing = false;

      if (extractedData.bestMatch) {
        await this._logScanToFirestore(extractedData);
        this._showResultSheet(extractedData, ocrResult.rawText);
        const vp = this._viewport.getBoundingClientRect();
        this._emitParticleBurst(vp.width / 2, vp.height / 2, '#10b981', 28);
      } else {
        this._showToast('Could not identify a drug. Try better lighting.', 'error');
        this._setStatus('Not Found', 'Align label and try again');
      }

    } catch (err) {
      console.error('[Scanner] OCR pipeline crashed:', err);
      this._hideProcessingOverlay();
      this.isProcessing = false;
      this._showToast('Scan failed. Try again.', 'error');
    }
  }

  _showResultSheet(extractedData, rawText) {
    const drug  = extractedData.bestMatch;
    const sched = SCHEDULE_INFO[drug.schedule] || SCHEDULE_INFO['OTC'];

    this._resultName.textContent = drug.name;

    this._resultSched.textContent = drug.schedule || 'OTC';
    this._resultSched.style.background = `${sched.color}22`;
    this._resultSched.style.border = `1px solid ${sched.color}55`;
    this._resultSched.style.color  = sched.color;

    this._resultDosRow.innerHTML = '';

    if (extractedData.dosage) {
      this._resultDosRow.innerHTML += this._pillHTML(`💊 ${extractedData.dosage}${extractedData.unit}`, '#ffb88c', 'rgba(255,184,140,0.12)');
    }
    if (extractedData.frequency) {
      this._resultDosRow.innerHTML += this._pillHTML(`🕐 ${extractedData.frequency}`, '#a78bfa', 'rgba(167,139,250,0.12)');
    }
    if (extractedData.quantity) {
      this._resultDosRow.innerHTML += this._pillHTML(`📦 ${extractedData.quantity} pcs`, '#34d399', 'rgba(52,211,153,0.12)');
    }
    if (extractedData.score) {
      const pct = Math.round(extractedData.score * 100);
      this._resultDosRow.innerHTML += this._pillHTML(`✓ ${pct}% match`, '#6ee7b7', 'rgba(110,231,183,0.1)');
    }

    this._resultAliases.innerHTML = '';
    const topAliases = (drug.aliases || []).slice(0, 6);
    for (const alias of topAliases) {
      const chip = document.createElement('div');
      chip.style.cssText = `
        padding: 3px 10px; border-radius: 20px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.5);
        font-size: 11px; font-family: monospace;
      `;
      chip.textContent = alias;
      this._resultAliases.appendChild(chip);
    }

    this._resultInfoCard.style.display = 'block';
    this._resultCat.textContent = drug.category || '';
    this._resultMfrs.textContent = drug.manufacturer ? `Manufacturers: ${drug.manufacturer.join(', ')}` : '';
    this._resultForms.textContent = drug.dosageForms ? `Forms: ${drug.dosageForms.join(' · ')}` : '';

    this._resultRaw.textContent = rawText.trim().slice(0, 600);

    this._resultSheet.style.transform = 'translateY(0)';
  }

  _pillHTML(label, color, bg) {
    return `<div style="
      padding: 6px 12px; border-radius: 20px;
      background: ${bg}; border: 1px solid ${color}33;
      color: ${color}; font-size: 12px; font-weight: 600;
      font-family: monospace;
    ">${label}</div>`;
  }

  _hideResultSheet() {
    this._resultSheet.style.transform = 'translateY(100%)';
    this.currentResults = null;
    this.liveWords = [];
    this._badgeContainer.innerHTML = '';
  }

  _navigateToAdd() {
    if (!this.currentResults?.bestMatch) return;
    const drug = this.currentResults.bestMatch;
    const params = new URLSearchParams({
      name:   drug.name,
      dosage: this.currentResults.dosage || '',
      unit:   this.currentResults.unit   || 'mg',
    });
    if (this.currentResults.frequency) params.set('frequency', this.currentResults.frequency);
    this.destroy();
    window.location.hash = `#/add?${params.toString()}`;
  }

  async _logScanToFirestore(extractedData) {
    try {
      const user = state.user;
      if (!user) return;
      await addDoc(collection(firebaseDb, 'users', user.uid, 'scan_history'), {
        timestamp:   serverTimestamp(),
        drugName:    extractedData.bestMatch?.name || '',
        category:    extractedData.bestMatch?.category || '',
        schedule:    extractedData.bestMatch?.schedule || '',
        dosage:      extractedData.dosage || '',
        unit:        extractedData.unit   || '',
        frequency:   extractedData.frequency || '',
        quantity:    extractedData.quantity  || '',
        matchScore:  extractedData.score     || 0,
        rawOcrText:  (extractedData.rawText  || '').slice(0, 400),
      });
    } catch (e) {
      console.warn('[Scanner] Could not log scan to Firestore:', e);
    }
  }

  _showToast(msg, type = 'success') {
    const colors = {
      error:   { bg: '#1a0a12', border: 'rgba(239,68,68,0.5)',   text: '#ef4444' },
      warn:    { bg: '#1a0a12', border: 'rgba(245,158,11,0.5)',  text: '#f59e0b' },
      success: { bg: '#0a1a10', border: 'rgba(52,211,153,0.5)',  text: '#34d399' },
    };
    const c = colors[type] || colors.success;
    const t = document.createElement('div');
    t.style.cssText = `
      position: fixed; bottom: 110px; left: 50%; transform: translateX(-50%);
      padding: 10px 20px; border-radius: 24px;
      background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
      font-size: 11px; font-family: 'Roboto Mono', monospace;
      letter-spacing: 0.1em; text-transform: uppercase;
      z-index: 99999; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      white-space: nowrap; max-width: 88vw; text-align: center;
      transition: opacity 0.3s;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.cameraReady = false;
    this.isProcessing = false;
    this.liveWords = [];
    window.removeEventListener('resize', this._resizeOverlay);
  }
}