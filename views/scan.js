/**
 * @fileoverview Scan Capture View
 * Minimalist glassmorphic UI solely dedicated to capturing an image.
 */
import { scannerCoordinator } from '../scanner/ScannerCoordinator.js';
import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs';

export default class ScanView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'scan-capture-root';
    this.container.style.cssText = `
      position: fixed; inset: 0; width: 100%; height: 100%;
      background: #000; overflow: hidden; display: flex;
      flex-direction: column; font-family: 'Inter', sans-serif; z-index: 10;
    `;
    this.stream = null;
    this.facingMode = 'environment';
    this.torchOn = false;
    this.handLandmarker = null;
    this.isHandInFrame = false;
    this.animationFrameId = null;
  }

  async render() {
    this._buildDOM();
    this._cacheElements();
    this._attachListeners();
    await this._startCamera();
    return this.container;
  }

  _buildDOM() {
    this.container.innerHTML = `
      <style>
        .scan-capture-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .glass-panel { 
          background: rgba(10, 15, 25, 0.4); 
          backdrop-filter: blur(20px); 
          -webkit-backdrop-filter: blur(20px);
        }
        .glass-btn { 
          background: rgba(255, 255, 255, 0.1); 
          backdrop-filter: blur(12px); 
          border-radius: 50%; 
          display: flex; align-items: center; justify-content: center; 
          cursor: pointer; transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
        }
        .glass-btn:active { transform: scale(0.9); background: rgba(255, 255, 255, 0.2); }
        .shutter-btn {
          width: 72px; height: 72px; border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 4px solid rgba(255, 255, 255, 0.6);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
        }
        .shutter-btn:active { transform: scale(0.85); background: white; }
        .shutter-inner {
          width: 54px; height: 54px; border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
        }
      </style>

      <!-- Fullscreen Video -->
      <video id="sc-video" autoplay playsinline muted style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;"></video>
      <canvas id="sc-canvas" style="display: none;"></canvas>

      <!-- Hand Warning UI Screamer -->
      <div id="hand-warning" style="display: none; position: absolute; inset: 0; background: rgba(220, 38, 38, 0.9); z-index: 100; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 24px;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="margin-bottom: 16px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <h2 style="color: white; font-size: 24px; font-weight: 800; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Hands Detected</h2>
        <p style="color: white; font-size: 16px; font-weight: 500;">Please place the medication on a table. Remove hands from frame.</p>
      </div>

      <!-- Minimalist Top Header -->
      <div class="glass-panel" style="position: absolute; top: 0; left: 0; right: 0; padding: max(env(safe-area-inset-top), 20px) 24px 20px; display: flex; justify-content: space-between; align-items: center;">
        <a href="#/dashboard" class="glass-btn" style="width: 44px; height: 44px; text-decoration: none;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </a>
        <div style="font-weight: 600; letter-spacing: 0.1em; color: white; font-size: 14px; text-transform: uppercase;">Scan Label</div>
        <button id="sc-torch" class="glass-btn" style="width: 44px; height: 44px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2l1.5 4.5L13 8l-3 5 4 4-7 5 2-8-4-4 4.5-1.5L9 2z"/></svg>
        </button>
      </div>

      <!-- Minimalist Bottom Controls -->
      <div class="glass-panel" style="position: absolute; bottom: 0; left: 0; right: 0; padding: 30px 24px max(env(safe-area-inset-bottom), 40px); display: flex; justify-content: space-around; align-items: center;">
        
        <input type="file" id="sc-gallery-input" accept="image/*" style="display: none;" />
        <button id="sc-gallery" class="glass-btn" style="width: 52px; height: 52px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>

        <div id="sc-shutter" class="shutter-btn">
          <div class="shutter-inner"></div>
        </div>

        <button id="sc-switch" class="glass-btn" style="width: 52px; height: 52px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
          </svg>
        </button>

      </div>
    `;
  }

  _cacheElements() {
    this._video = this.container.querySelector('#sc-video');
    this._canvas = this.container.querySelector('#sc-canvas');
    this._galleryInput = this.container.querySelector('#sc-gallery-input');
    this._btnGallery = this.container.querySelector('#sc-gallery');
    this._btnShutter = this.container.querySelector('#sc-shutter');
    this._btnSwitch = this.container.querySelector('#sc-switch');
    this._btnTorch = this.container.querySelector('#sc-torch');
    this._handWarning = this.container.querySelector('#hand-warning');
  }

  _attachListeners() {
    this._btnShutter.onclick = () => this._captureFromVideo();
    this._btnGallery.onclick = () => this._galleryInput.click();
    this._galleryInput.onchange = (e) => this._captureFromGallery(e);
    this._btnSwitch.onclick = () => this._switchCamera();
    this._btnTorch.onclick = () => this._toggleTorch();
  }

  async _startCamera() {
    try {
      await scannerCoordinator.startScanner(this._video, () => {});
      this.stream = scannerCoordinator.cameraStream;
      this.videoTrack = this.stream.getVideoTracks()[0];
      if (!this.handLandmarker) this._initMediaPipe();
    } catch (err) {
      console.warn('Camera connection error:', err);
    }
  }

  _stopCamera() {
    scannerCoordinator.stopScanner();
    if (this.stream) {
      this.stream = null;
    }
  }

  async _initMediaPipe() {
    try {
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm');
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2
      });
      console.log("[ScanView] MediaPipe Hands initialized.");
      this._detectHandsLoop();
    } catch (e) {
      console.warn("Failed to initialize MediaPipe Hands:", e);
    }
  }

  _detectHandsLoop() {
    if (!this.handLandmarker || !this._video || !this.stream) return;
    
    // Only detect if video has valid dimensions
    if (this._video.videoWidth > 0 && this._video.videoHeight > 0) {
      const startTimeMs = performance.now();
      const results = this.handLandmarker.detectForVideo(this._video, startTimeMs);
      
      if (results.landmarks && results.landmarks.length > 0) {
        this.isHandInFrame = true;
        this._handWarning.style.display = 'flex';
        this._btnShutter.style.opacity = '0.3';
        this._btnShutter.style.pointerEvents = 'none';
      } else {
        this.isHandInFrame = false;
        this._handWarning.style.display = 'none';
        this._btnShutter.style.opacity = '1';
        this._btnShutter.style.pointerEvents = 'auto';
      }
    }
    
    this.animationFrameId = requestAnimationFrame(() => this._detectHandsLoop());
  }

  async _switchCamera() {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.torchOn = false;
    this._btnTorch.style.background = 'rgba(255, 255, 255, 0.1)';
    await this._startCamera();
  }

  async _toggleTorch() {
    if (!this.videoTrack) return;
    const capabilities = this.videoTrack.getCapabilities?.();
    if (capabilities?.torch) {
      this.torchOn = !this.torchOn;
      await this.videoTrack.applyConstraints({ advanced: [{ torch: this.torchOn }] });
      this._btnTorch.style.background = this.torchOn ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)';
    }
  }

  async _captureFromVideo() {
    if (this.isHandInFrame) return; // Shutter Lock
    if (!this._video || !this._canvas) return;
    const w = this._video.videoWidth;
    const h = this._video.videoHeight;
    if (!w || !h) return;

    // Apply center crop to ensure focus on the medication and consistent aspect ratio
    const cropSize = Math.min(w, h) * 0.8; // 80% of the shortest dimension
    const startX = (w - cropSize) / 2;
    const startY = (h - cropSize) / 2;

    this._canvas.width = cropSize;
    this._canvas.height = cropSize;
    const ctx = this._canvas.getContext('2d');
    
    // Draw cropped video frame
    ctx.drawImage(this._video, startX, startY, cropSize, cropSize, 0, 0, cropSize, cropSize);
    
    // Convert to Blob for routing
    const blob = await new Promise(r => this._canvas.toBlob(r, 'image/jpeg', 0.85));
    sessionStorage.setItem('medcare_is_gallery_upload', 'false');
    this._routeTo3D(blob);
  }

  async _captureFromGallery(e) {
    const file = e.target.files[0];
    if (!file) return;
    const blob = file;
    sessionStorage.setItem('medcare_is_gallery_upload', 'true');
    this._routeTo3D(blob);
  }

  _routeTo3D(blob) {
    try {
      const blobUrl = URL.createObjectURL(blob);
      sessionStorage.setItem('medcare_scanned_image', blobUrl);
      window.location.hash = '#/scan/3d';
    } catch (e) {
      console.error('Failed to create object URL for routing:', e);
      alert('Failed to process image. Please try again.');
    }
  }

  destroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
  }
}
