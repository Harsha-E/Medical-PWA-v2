/**
 * @fileoverview Scan Capture View
 * Minimalist glassmorphic UI solely dedicated to capturing an image.
 */
import { scannerCoordinator } from '../scanner/ScannerCoordinator.js';
import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs';
import VisionPipeline from '../services/VisionPipeline.js';
import ConfirmationGate from '../components/ConfirmationGate.js';
import MultipleMatchGate from '../components/MultipleMatchGate.js';
import { appAlert } from '../core/ui.js';


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
        /* Desktop: center the camera feed and float controls to the right */
        @media (min-width: 1024px) {
          #sc-video {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            width: auto !important;
            max-width: 512px;
            height: 100%;
            object-fit: cover;
          }
          .sc-bottom-controls-desktop {
            position: absolute;
            right: 40px;
            top: 50%;
            transform: translateY(-50%);
            display: flex !important;
            flex-direction: column;
            align-items: center;
            gap: 24px;
            background: rgba(10,15,25,0.5);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 2rem;
            padding: 28px 20px;
          }
          .sc-bottom-bar { display: none !important; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          #sc-video {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            width: auto !important;
            max-width: 448px;
            height: 100%;
            object-fit: cover;
          }
        }
      </style>

      <!-- Fullscreen Video -->
      <video id="sc-video" autoplay playsinline muted style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: none !important;"></video>
      <canvas id="sc-canvas" style="display: none;"></canvas>

      <!-- Permission Overlay -->
      <div id="permission-overlay" style="display: none; position: absolute; inset: 0; background: rgba(10, 15, 25, 0.95); backdrop-filter: blur(20px); z-index: 999; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 32px;">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255,107,53,0.1); border: 1px solid rgba(255,107,53,0.3); display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </div>
        <h2 style="color: white; font-size: 24px; font-weight: 800; margin-bottom: 16px; letter-spacing: -0.02em;">Camera Access Needed</h2>
        <p style="color: rgba(255,255,255,0.7); font-size: 15px; font-weight: 500; line-height: 1.6; max-width: 280px; margin-bottom: 32px;">MedCare requires your camera to scan medicine packaging securely on-device.</p>
        <button id="btn-request-cam" class="glass-btn" style="padding: 16px 32px; border-radius: 100px; color: white; font-weight: 700; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; width: auto; height: auto;">Allow Camera</button>
        <p style="color: rgba(255,255,255,0.4); font-size: 11px; margin-top: 24px;">If you've previously denied access, you may need to enable it in your browser settings.</p>
      </div>

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

      <!-- Minimalist Bottom Controls (mobile) -->
      <div class="glass-panel sc-bottom-bar" style="position: absolute; bottom: 0; left: 0; right: 0; padding: 30px 24px max(env(safe-area-inset-bottom), 40px); display: flex; justify-content: space-around; align-items: center;">
        
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

      <!-- Desktop Side Panel Controls (lg+) -->
      <div class="sc-bottom-controls-desktop" style="display: none;">
        <button id="sc-gallery-lg" class="glass-btn" style="width: 56px; height: 56px;" title="Gallery">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>
        <div id="sc-shutter-lg" class="shutter-btn" style="width: 80px; height: 80px;">
          <div class="shutter-inner" style="width: 62px; height: 62px;"></div>
        </div>
        <button id="sc-switch-lg" class="glass-btn" style="width: 56px; height: 56px;" title="Flip Camera">
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
    this._permissionOverlay = this.container.querySelector('#permission-overlay');
    this._btnRequestCam = this.container.querySelector('#btn-request-cam');
  }

  _attachListeners() {
    this._btnShutter.onclick = () => this._captureFromVideo();
    this._btnGallery.onclick = () => this._galleryInput.click();
    this._galleryInput.onchange = (e) => this._captureFromGallery(e);
    this._btnSwitch.onclick = () => this._switchCamera();
    this._btnTorch.onclick = () => this._toggleTorch();
    this._btnRequestCam.onclick = () => this._startCamera();

    // Desktop side-panel mirrors
    const btnShutterLg = this.container.querySelector('#sc-shutter-lg');
    const btnGalleryLg = this.container.querySelector('#sc-gallery-lg');
    const btnSwitchLg  = this.container.querySelector('#sc-switch-lg');
    if (btnShutterLg) btnShutterLg.onclick = () => this._captureFromVideo();
    if (btnGalleryLg) btnGalleryLg.onclick = () => this._galleryInput.click();
    if (btnSwitchLg)  btnSwitchLg.onclick  = () => this._switchCamera();
  }

  async _startCamera() {
    try {
      // Check Permissions API (specifically for Android/Chrome handling of permanent denials)
      if (navigator.permissions) {
          try {
              const status = await navigator.permissions.query({ name: 'camera' });
              if (status.state === 'denied') {
                  this._permissionOverlay.style.display = 'flex';
                  this._permissionOverlay.querySelector('h2').textContent = 'Camera Blocked';
                  this._permissionOverlay.querySelector('p').innerHTML = 'Camera access is disabled. <br><br><b>Android Fix:</b> Tap the lock icon 🔒 in your browser URL bar, tap <b>Site Settings</b>, and switch Camera to <b>Allow</b>.';
                  this._btnRequestCam.style.display = 'none';
                  return;
              }
          } catch(e) { /* Ignore permissions API errors on unsupported browsers */ }
      }

      this._permissionOverlay.style.display = 'none';
      const success = await scannerCoordinator.startScanner(this._video, () => {}, this.facingMode);
      if (!success) throw new Error('Camera access denied or unavailable');
      
      this.stream = scannerCoordinator.cameraStream;
      this.videoTrack = this.stream.getVideoTracks()[0];
      if (!this.handLandmarker) this._initMediaPipe();
    } catch (err) {
      console.warn('Camera connection error:', err);
      this._permissionOverlay.style.display = 'flex';
      // If we got here and couldn't start, assume it's blocked or unavailable
      this._permissionOverlay.querySelector('h2').textContent = 'Camera Blocked';
      this._permissionOverlay.querySelector('p').innerHTML = 'Camera access is disabled or unavailable. <br><br><b>Fix:</b> Tap the lock icon 🔒 in your browser URL bar, tap <b>Site Settings</b>, and switch Camera to <b>Allow</b>.';
      this._btnRequestCam.style.display = 'none';
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
    
    // Convert to Blob for routing fallback
    const blob = await new Promise(r => this._canvas.toBlob(r, 'image/jpeg', 0.85));
    sessionStorage.setItem('medcare_is_gallery_upload', 'false');

    this.showProcessingSpinner("Analyzing 2D Frame...");

    // 1. Check for QR Code (Family Pairing)
    let qrVal = null;
    if ('BarcodeDetector' in window) {
        try {
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(this._canvas);
            if (barcodes.length > 0) {
                qrVal = barcodes[0].rawValue;
            }
        } catch (e) { console.warn('[ScanView] Native QR detection failed', e); }
    }
    
    // Fallback to jsQR
    if (!qrVal && typeof jsQR !== 'undefined') {
        try {
            const imageData = ctx.getImageData(0, 0, cropSize, cropSize);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                qrVal = code.data;
            }
        } catch (e) { console.warn('[ScanView] jsQR fallback failed', e); }
    }
       if (qrVal && (qrVal.includes('connect=') || qrVal.includes('connect_v2='))) {
        this.hideProcessingSpinner();
        
        if (qrVal.includes('connect_v2=')) {
            let payloadV2 = qrVal.split('connect_v2=')[1].split('&')[0];
            try {
                const decoded = JSON.parse(atob(payloadV2));
                const meshInstance = window.familyMesh || window.peerMeshV2;
                if (meshInstance && typeof meshInstance.connectToFamilyMember === 'function') {
                    console.log("[ScanView] Intercepted PWA Deep Link V2. Connecting to:", decoded.id);
                    meshInstance.connectToFamilyMember(decoded.id, decoded);
                }
            } catch(e) {
                console.error('[ScanView] Failed to parse V2 payload', e);
            }
        } else {
            let peerId = null;
            try {
                const url = new URL(qrVal);
                peerId = url.searchParams.get('connect');
            } catch(err) {
                const match = qrVal.match(/[?&]connect=([^&]+)/);
                if (match) peerId = decodeURIComponent(match[1]);
            }
            if (peerId) {
                try {
                    const meshInstance = window.familyMesh || window.peerMeshV2;
                    if (meshInstance) {
                        console.log("[ScanView] Intercepted PWA Deep Link. Connecting to:", peerId);
                        if (typeof meshInstance.connect === 'function') {
                            meshInstance.connect(peerId);
                        } else if (typeof meshInstance.connectToFamilyMember === 'function') {
                            meshInstance.connectToFamilyMember(peerId, { id: peerId, installationId: 'legacy' });
                        } else if (typeof meshInstance.connectToPeer === 'function') {
                            meshInstance.connectToPeer(peerId);
                        }
                    }
                } catch(e) {
                    console.error('[ScanView] Error routing legacy connect link:', e);
                }
            }
        }
        
        window.location.hash = '#/peer-hub';
        return;
    }

    // 2. OCR Medicine Extraction
    try {
        const { default: AIExtractionService } = await import('../services/AIExtractionService.js');
        const medicines = await AIExtractionService.extractMedicines(blob);
        
        this.hideProcessingSpinner();

        if (medicines && medicines.length > 0) {
            await this._emitDICTelemetryAndRecord(medicines);
            // Store all extracted meds for potential multi-add later
            sessionStorage.setItem('medcheck_extracted_prescriptions', JSON.stringify(medicines));
            // Pre-fill add-medication form with the first extracted medicine
            sessionStorage.setItem('medcheck_scanned_data', JSON.stringify(medicines[0]));
            // Go straight to add-medication — no forced detour through safety-analysis
            window.location.hash = '#/add-medication';
        } else {
            appAlert('No medicines detected in this image.', 'Extraction Failed');
        }
    } catch (e) {
        console.error("[ScanView] AI Extraction failed:", e);
        this.hideProcessingSpinner();
        appAlert('AI Extraction Failed. Please try again.', 'Error');
    }
  }

  async _captureFromGallery(e) {
    const file = e.target.files[0];
    if (!file) return;
    const blob = file;
    sessionStorage.setItem('medcare_is_gallery_upload', 'true');

    this.showProcessingSpinner("Analyzing 2D Image...");

    try {
        const img = new Image();
        await new Promise((res, rej) => { 
            img.onload = res; 
            img.onerror = rej; 
            img.src = URL.createObjectURL(blob); 
        });

        const { default: AIExtractionService } = await import('../services/AIExtractionService.js');
        const medicines = await AIExtractionService.extractMedicines(blob);
        
        this.hideProcessingSpinner();

        if (medicines && medicines.length > 0) {
            await this._emitDICTelemetryAndRecord(medicines);
            sessionStorage.setItem('medcheck_extracted_prescriptions', JSON.stringify(medicines));
            sessionStorage.setItem('medcheck_scanned_data', JSON.stringify(medicines[0]));
            window.location.hash = '#/add-medication';
        } else {
            appAlert('No medicines detected in this image.', 'Extraction Failed');
        }
    } catch (error) {
        console.error("[ScanView] Gallery Scan failed:", error);
        this.hideProcessingSpinner();
        this.showGalleryErrorPopup();
    }
  }

  async _emitDICTelemetryAndRecord(medicines) {
    try {
      const stateModule = (await import('../core/state.js')).default;
      const dbModule = (await import('../core/db.js')).default;
      const targetUserId = stateModule.activeProfileContext ? String(stateModule.activeProfileContext.id) : (stateModule.user?.uid || 'anonymous');
      const timestampIso = new Date().toISOString();
      const executionId = 'exec_scan_' + Date.now();
      const medList = medicines.map(m => m.genericName || m.brandName || m.name);

      const scanRecord = {
        id: executionId,
        analysisId: executionId,
        execution_id: executionId,
        userId: targetUserId,
        patient_id: targetUserId,
        type: 'Report',
        title: `Prescription Scan: ${medicines[0].brandName || medicines[0].name || 'Extracted Medicine'}`,
        details: `Extracted ${medicines.length} medicine(s) via Vision Scan`,
        medicines: medicines,
        medication_ids: medList,
        date: timestampIso,
        timestamp: Date.now(),
        source: 'vision-scan',
        status: 'COMPLETED'
      };

      await dbModule.history.put(scanRecord);

      // Submit live telemetry execution payload to Drug Intelligence Console (Render)
      try {
        const { ApiClient } = await import('../core/api.js');
        await ApiClient.post('/api/v1/analyze', {
          analysis_id: executionId,
          patient_id: targetUserId,
          medications: medList,
          timestamp: timestampIso,
          source: 'vision-scan'
        }, { timeout: 2500 });
      } catch (apiErr) {
        console.warn('[ScanView] DIC Telemetry API submission warning:', apiErr.message);
      }

      try {
        const { default: SyncBridge } = await import('../services/SyncBridge.js');
        if (SyncBridge && SyncBridge.enqueueChange) {
          SyncBridge.enqueueChange('history', scanRecord);
        }
      } catch (sbErr) {
        console.warn('[ScanView] SyncBridge enqueue warning:', sbErr);
      }

      window.dispatchEvent(new CustomEvent('medcare:sync-complete', { detail: scanRecord }));
      window.dispatchEvent(new CustomEvent('medcare:data-synced', { detail: scanRecord }));
      console.log('[ScanView] 📡 DIC Telemetry & ExecutionRecord emitted to Clinical Ledger & Live SSE stream!');
    } catch (e) {
      console.warn('[ScanView] DIC Telemetry emission warning:', e);
    }
  }

  async _routeTo3D(blob) {
    try {
      const blobUrl = URL.createObjectURL(blob);
      sessionStorage.setItem('medcare_scanned_image', blobUrl);
      window.location.hash = '#/scan/3d';
    } catch (e) {
      console.error('Failed to create object URL for routing:', e);
      await appAlert('Failed to process image. Please try again.', 'Error');
    }
  }

  showProcessingSpinner(text) {
        let spinner = document.getElementById('fast-scan-spinner');
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'fast-scan-spinner';
            spinner.style.cssText = `
                position: absolute; inset: 0; z-index: 99999;
                background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
                font-family: system-ui, sans-serif;
            `;
            spinner.innerHTML = `
              <style>
                @keyframes pulseGlowLoader {
                  0% { box-shadow: 0 0 10px rgba(30,144,255,0.2); }
                  50% { box-shadow: 0 0 30px rgba(30,144,255,0.5); }
                  100% { box-shadow: 0 0 10px rgba(30,144,255,0.2); }
                }
                @keyframes spinFast { to { transform: rotate(360deg); } }
              </style>
              <div class="glass-card" style="position: absolute; bottom: max(env(safe-area-inset-bottom), 140px); left: 24px; right: 24px; padding: 24px; background: rgba(10, 15, 25, 0.7); backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; display: flex; align-items: center; gap: 20px; animation: pulseGlowLoader 3s infinite;">
                <div style="position: relative; width: 40px; height: 40px;">
                  <div style="position: absolute; inset: 0; border: 3px solid transparent; border-top-color: #1e90ff; border-radius: 50%; animation: spinFast 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;"></div>
                  <svg style="position:absolute; inset:0; margin:auto;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                </div>
                <div style="display: flex; flex-direction: column;">
                  <div id="spinner-text" style="font-weight: 700; color: white; font-size: 16px; letter-spacing: 0.05em;">${text}</div>
                  <div style="font-weight: 500; color: #94a3b8; font-size: 12px; margin-top: 4px;">Smart AI Capture</div>
                </div>
              </div>
            `;
            document.body.appendChild(spinner);
        } else {
            spinner.querySelector('#spinner-text').innerText = text;
            spinner.style.display = 'block';
        }
  }

  hideProcessingSpinner() {
        const spinner = document.getElementById('fast-scan-spinner');
        if (spinner) spinner.style.display = 'none';
  }

  show3DTutorialPopup(blob) {
        const modalOverlay = document.createElement('div');
        modalOverlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999999; 
            background: rgba(15, 20, 30, 0.85); backdrop-filter: blur(15px);
            display: flex; justify-content: center; align-items: center;
            padding: 20px; font-family: system-ui, -apple-system, sans-serif;
            opacity: 0; transition: opacity 0.3s ease;
        `;

        modalOverlay.innerHTML = `
            <div class="clay-panel" style="width: 100%; max-width: 400px; padding: 32px; text-align: center; display: flex; flex-direction: column; gap: 24px; transform: translateY(20px); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); background: #2a3149; border-radius: 28px; box-shadow: 10px 10px 20px rgba(15,20,30,0.6), inset 4px 4px 8px rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);">
                
                <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255, 165, 0, 0.15); color: #ffa500; display: flex; justify-content: center; align-items: center; font-size: 36px; margin: 0 auto; box-shadow: inset 2px 2px 10px rgba(0,0,0,0.2);">
                    🔄
                </div>
                
                <div>
                    <h2 style="color: #fff; margin: 0 0 8px 0; font-size: 1.4rem; font-weight: 800;">2D Scan Failed</h2>
                    <p style="color: #a4b0be; margin: 0; font-size: 0.95rem; font-weight: 500; line-height: 1.5;">We need more angles to identify this medication. Please hold your phone perpendicular and sweep 180 degrees around the bottle.</p>
                </div>
                
                <div style="display: flex; gap: 16px; margin-top: 8px;">
                    <button id="btn-cancel-3d" style="flex: 1; background: #353b50; color: #a4b0be; padding: 16px; border-radius: 20px; border: none; font-weight: bold; cursor: pointer;">Cancel</button>
                    <button id="btn-start-3d" style="flex: 1.5; background: linear-gradient(135deg, #1e90ff, #0984e3); color: white; padding: 16px; border-radius: 20px; border: none; font-weight: bold; box-shadow: 0 10px 20px rgba(30,144,255,0.4); cursor: pointer;">Start 3D Sweep</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        requestAnimationFrame(() => {
            modalOverlay.style.opacity = '1';
            modalOverlay.querySelector('.clay-panel').style.transform = 'translateY(0)';
        });

        modalOverlay.querySelector('#btn-start-3d').onclick = () => {
            modalOverlay.style.opacity = '0';
            setTimeout(() => {
                modalOverlay.remove();
                this._routeTo3D(blob);
            }, 300);
        };

        modalOverlay.querySelector('#btn-cancel-3d').onclick = () => {
            modalOverlay.style.opacity = '0';
            setTimeout(() => {
                modalOverlay.remove();
            }, 300);
        };
  }

  showGalleryErrorPopup() {
        const modalOverlay = document.createElement('div');
        modalOverlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999999; 
            background: rgba(15, 20, 30, 0.85); backdrop-filter: blur(15px);
            display: flex; justify-content: center; align-items: center;
            padding: 20px; font-family: system-ui, -apple-system, sans-serif;
            opacity: 0; transition: opacity 0.3s ease;
        `;

        modalOverlay.innerHTML = `
            <div class="clay-panel" style="width: 100%; max-width: 400px; padding: 32px; text-align: center; display: flex; flex-direction: column; gap: 24px; transform: translateY(20px); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); background: #2a3149; border-radius: 28px; box-shadow: 10px 10px 20px rgba(15,20,30,0.6), inset 4px 4px 8px rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255, 71, 87, 0.15); color: #ff4757; display: flex; justify-content: center; align-items: center; font-size: 36px; margin: 0 auto; box-shadow: inset 2px 2px 10px rgba(0,0,0,0.2);">
                    ⚠️
                </div>
                <div>
                    <h2 style="color: #fff; margin: 0 0 8px 0; font-size: 1.4rem; font-weight: 800;">Medication Not Found</h2>
                    <p style="color: #a4b0be; margin: 0; font-size: 0.95rem; font-weight: 500; line-height: 1.5;">We couldn't confidently read the label from that image. Please ensure the image is bright, clear, and the label is fully visible.</p>
                </div>
                <button id="btn-close-error" style="width: 100%; background: linear-gradient(135deg, #1e90ff, #0984e3); color: white; padding: 16px; border-radius: 20px; border: none; font-weight: bold; box-shadow: 0 10px 20px rgba(30,144,255,0.4); margin-top: 8px; cursor: pointer;">Try Again</button>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        requestAnimationFrame(() => {
            modalOverlay.style.opacity = '1';
            modalOverlay.querySelector('.clay-panel').style.transform = 'translateY(0)';
        });

        modalOverlay.querySelector('#btn-close-error').onclick = () => {
            modalOverlay.style.opacity = '0';
            setTimeout(() => {
                modalOverlay.remove();
            }, 300);
        };
  }

  showConfirmationModal(payload) {
        const brandName = payload.brandName || payload.name || "Unknown Medication";
        const genericName = payload.genericName || "Unknown Generic";
        const rawDosage = payload.dosage?.rawText || payload.dosage || "Dosage not detected";
        const dosageForm = payload.form || "Unknown form";
        
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'clay-confirmation-modal';
        modalOverlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999999; 
            background: rgba(10, 4, 7, 0.95); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
            display: flex; justify-content: center; align-items: center;
            padding: 24px; font-family: var(--font-body);
            opacity: 0; transition: opacity 0.3s ease;
            overflow-y: auto;
        `;

        // Add background blobs matching the dashboard theme
        const blobBackground = `
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; pointer-events: none; overflow: hidden; opacity: 0.4;">
                <div style="position: absolute; top: -10%; left: -20%; width: 70vw; height: 70vw; background: radial-gradient(circle, var(--color-primary-dark) 0%, transparent 70%); filter: blur(60px); border-radius: 50%; animation: pulse 8s infinite alternate;"></div>
                <div style="position: absolute; bottom: -10%; right: -20%; width: 60vw; height: 60vw; background: radial-gradient(circle, var(--color-secondary) 0%, transparent 70%); filter: blur(60px); border-radius: 50%; animation: pulse 10s infinite alternate-reverse;"></div>
            </div>
        `;

        modalOverlay.innerHTML = blobBackground + `
            <div class="clay-glass-panel" style="position: relative; z-index: 1; width: 100%; max-width: 420px; padding: 36px 28px; text-align: center; display: flex; flex-direction: column; gap: 28px; transform: translateY(30px); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); margin: auto;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--color-surface-elevated); color: var(--color-primary); display: flex; justify-content: center; align-items: center; font-size: 36px; margin: 0 auto; box-shadow: inset 4px 4px 10px rgba(0,0,0,0.3), inset -4px -4px 10px rgba(255,255,255,0.05), 0 8px 16px rgba(0,0,0,0.2); border: 1px solid var(--color-border);">💊</div>
                
                <div>
                    <h2 style="color: var(--color-text-primary); margin: 0 0 10px 0; font-size: clamp(1.4rem, 5vw, 1.7rem); font-weight: 800; letter-spacing: -0.02em;">Scan Successful</h2>
                    <p style="color: var(--color-text-secondary); margin: 0; font-size: clamp(0.85rem, 3.5vw, 1rem); font-weight: 500; padding: 0 10px;">Please verify the extracted details below.</p>
                </div>
                
                <div style="background: var(--color-surface); border-radius: 24px; padding: 24px; text-align: left; box-shadow: inset 4px 4px 12px rgba(0,0,0,0.4), inset -4px -4px 12px rgba(255,255,255,0.03); border: 1px solid var(--color-border);">
                    <div style="display: flex; flex-direction: column; gap: 20px;">
                        <div>
                            <div style="color: var(--color-primary); font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Brand Name</div>
                            <div style="color: var(--color-text-primary); font-size: clamp(1.2rem, 4vw, 1.4rem); font-weight: 700; line-height: 1.25;">${brandName}</div>
                        </div>
                        <div style="height: 1px; background: var(--color-border); opacity: 0.5;"></div>
                        <div>
                            <div style="color: var(--color-primary); font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Generic Name</div>
                            <div style="color: var(--color-text-secondary); font-size: clamp(1rem, 3.5vw, 1.15rem); font-weight: 500; line-height: 1.3;">${genericName}</div>
                        </div>
                        <div style="height: 1px; background: var(--color-border); opacity: 0.5;"></div>
                        <div>
                            <div style="color: var(--color-primary); font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Dosage & Form</div>
                            <div style="color: var(--color-text-secondary); font-size: clamp(1rem, 3.5vw, 1.15rem); font-weight: 500;">${rawDosage} • ${dosageForm}</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 16px; margin-top: 12px; flex-wrap: nowrap;">
                    <button id="btn-rescan" style="flex: 1; background: var(--color-surface); color: var(--color-text-primary); padding: 16px 8px; border-radius: 20px; border: 1px solid var(--color-border); font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-size: clamp(0.85rem, 3.5vw, 1rem); transition: transform 0.2s; white-space: nowrap; min-width: 0;">Rescan</button>
                    <button id="btn-confirm" style="flex: 1.2; background: var(--color-primary); color: var(--color-surface); padding: 16px 8px; border-radius: 20px; border: none; font-weight: 800; box-shadow: 0 8px 20px var(--color-skeleton-glow1); cursor: pointer; font-size: clamp(0.85rem, 3.5vw, 1rem); transition: transform 0.2s; white-space: nowrap; min-width: 0;">Confirm ✓</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        // Add simple touch feedback
        const addTouchScale = (btn) => {
            btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.95)');
            btn.addEventListener('mouseup', () => btn.style.transform = 'scale(1)');
            btn.addEventListener('touchstart', () => btn.style.transform = 'scale(0.95)');
            btn.addEventListener('touchend', () => btn.style.transform = 'scale(1)');
        };
        addTouchScale(modalOverlay.querySelector('#btn-rescan'));
        addTouchScale(modalOverlay.querySelector('#btn-confirm'));

        requestAnimationFrame(() => {
            modalOverlay.style.opacity = '1';
            const panel = modalOverlay.querySelector('.clay-glass-panel');
            if(panel) panel.style.transform = 'translateY(0)';
        });

        modalOverlay.querySelector('#btn-confirm').onclick = () => {
            modalOverlay.style.opacity = '0';
            setTimeout(() => {
                modalOverlay.remove();
                sessionStorage.setItem('medcheck_pending_scan', JSON.stringify(payload));
                window.location.hash = '#/add-medication';
            }, 300);
        };

        modalOverlay.querySelector('#btn-rescan').onclick = () => {
            modalOverlay.style.opacity = '0';
            setTimeout(() => {
                modalOverlay.remove();
            }, 300);
        };
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
