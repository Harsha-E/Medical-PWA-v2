/**
 * @fileoverview CarePoint Vision Scanner — Auto-Tracking Architecture + Hardware Controls & Gallery Fallback
 */
import { INDIAN_DRUG_DATASET, fuzzySearchDrugs, SCHEDULE_INFO } from '../data/indian-drug-dataset.js';
import state from '../core/state.js';
import { db as firebaseDb } from '../core/firebase.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import VisionPipeline from '../services/VisionPipeline.js';

export default class ScanView {
  constructor() {
    this.stream            = null;
    this.animFrameId       = null;
    this.confidenceTracker = 0;   
    this.cameraReady       = false;
    this.state             = 'IDLE'; // IDLE, HUNTING, LOCKING, VERIFYING, RESULT
    this.pipeline          = new VisionPipeline();
    this.particles         = [];
    this.huntStartTime     = 0;
    this.galleryPromptShown= false;
    
    // --- APPENDED: Hardware State ---
    this.facingMode        = 'environment';
    this.torchOn           = false;

    this.container = document.createElement('div');
    this.container.className = 'scan-view-root';
    this.container.style.cssText = `
      position: fixed; inset: 0; width: 100%; height: 100%;
      background: #050203; overflow: hidden; display: flex;
      flex-direction: column; font-family: 'Inter', sans-serif; z-index: 10;
    `;
    this._boundLoop = this._renderLoop.bind(this);
  }

  _setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    
    if (this._statusText) {
      switch(newState) {
        case 'IDLE':
          this._statusText.textContent = 'SYSTEM IDLE';
          this._statusText.style.color = '#ffffff';
          break;
        case 'HUNTING':
          this._statusText.textContent = 'HUNTING FOR MATCH';
          this._statusText.style.color = '#ffb88c';
          break;
        case 'LOCKING':
          this._statusText.textContent = 'ACQUIRING LOCK';
          this._statusText.style.color = '#10b981';
          break;
        case 'VERIFYING':
          this._statusText.textContent = 'VERIFYING DATA';
          this._statusText.style.color = '#3b82f6';
          break;
        case 'RESULT':
          this._statusText.textContent = 'LOCKED';
          this._statusText.style.color = '#10b981';
          this._triggerAutoLock();
          break;
      }
    }
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
        .scan-view-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        @keyframes cornerPulse { 0%, 100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes particleFade { 0% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1.5); } 100% { opacity: 0; transform: scale(0.5) translateY(-30px); } }
        @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 100% { box-shadow: 0 0 0 30px rgba(16,185,129,0); } }
        @keyframes spinDot { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .particle-host { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; z-index: 20; }
        .particle-dot { position: absolute; border-radius: 50%; pointer-events: none; animation: particleFade var(--dur) ease-out forwards; }
      </style>

      <div id="sv-header" style="position: relative; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px 10px; background: linear-gradient(180deg, rgba(5,2,3,0.98) 0%, rgba(5,2,3,0.7) 100%); border-bottom: 1px solid rgba(127,47,93,0.25);">
        <a href="#/dashboard" style="color: #ffb88c; font-size: 13px; font-weight: 700; text-transform: uppercase; text-decoration: none; display: flex; align-items: center; gap: 6px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span class="hidden sm:inline">Back</span>
        </a>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
          <span style="color: white; font-size: 15px; font-weight: 700;">Vision Scanner</span>
          <span id="sv-status-text" style="color: #ffffff; font-size: 10px; font-family: monospace; text-transform: uppercase;">System Idle</span>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button id="sv-torch" style="width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,184,140,0.25); background: rgba(26,10,18,0.8); color: rgba(255,184,140,0.45); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2l1.5 4.5L13 8l-3 5 4 4-7 5 2-8-4-4 4.5-1.5L9 2z"/></svg>
          </button>
          <button id="sv-cam-switch" style="width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,184,140,0.25); background: rgba(26,10,18,0.8); color: #ffb88c; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
            </svg>
          </button>
        </div>
      </div>

      <div id="sv-viewport" style="position: relative; flex: 1; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden;">
        <video id="sv-video" autoplay playsinline muted style="position: absolute; width: 100%; height: 100%; object-fit: cover;"></video>
        <canvas id="sv-capture-canvas" style="display: none;"></canvas>
        <div id="sv-particle-host" class="particle-host"></div>

        <div id="sv-frame" style="position: absolute; inset: 0; pointer-events: none; display: flex; align-items: center; justify-content: center;">
          <div style="position: relative; width: 75%; max-width: 300px; height: 120px;">
            <div style="position:absolute;top:-2px;left:-2px;width:24px;height:24px;border-top:3px solid #ffb88c;border-left:3px solid #ffb88c;animation:cornerPulse 1.8s ease-in-out infinite;"></div>
            <div style="position:absolute;top:-2px;right:-2px;width:24px;height:24px;border-top:3px solid #ffb88c;border-right:3px solid #ffb88c;animation:cornerPulse 1.8s ease-in-out infinite 0.2s;"></div>
            <div style="position:absolute;bottom:-2px;left:-2px;width:24px;height:24px;border-bottom:3px solid #ffb88c;border-left:3px solid #ffb88c;animation:cornerPulse 1.8s ease-in-out infinite 0.4s;"></div>
            <div style="position:absolute;bottom:-2px;right:-2px;width:24px;height:24px;border-bottom:3px solid #ffb88c;border-right:3px solid #ffb88c;animation:cornerPulse 1.8s ease-in-out infinite 0.6s;"></div>
          </div>
        </div>

        <div id="sv-processing-overlay" style="position: absolute; inset: 0; background: rgba(5,2,3,0.95); backdrop-filter: blur(8px); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 60;">
          <div style="position: relative; width: 72px; height: 72px; margin-bottom: 20px;">
            <div style="position: absolute; inset: 0; border: 2px solid transparent; border-top-color: #ffb88c; border-radius: 50%; animation: spinDot 0.9s linear infinite;"></div>
            <div style="position: absolute; inset: 8px; border: 1px solid transparent; border-bottom-color: #7f2f5d; border-radius: 50%; animation: spinDot 1.5s linear infinite reverse;"></div>
            <svg style="position:absolute; inset:0; margin:auto;" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffb88c" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <div id="sv-phase-label" style="font-size: 15px; font-weight: 700; color: white;">Analyzing Image…</div>
          <div id="sv-terminal-log" style="width: 280px; height: 120px; margin-top: 15px; font-size: 10px; font-family: monospace; color: #10b981; text-align: left; background: rgba(0,0,0,0.6); padding: 10px; border-radius: 8px; border: 1px solid rgba(16,185,129,0.3); overflow-y: auto; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);"></div>
        </div>
      </div>

      <div id="sv-controls" style="position: relative; z-index: 50; padding: 20px 24px 40px; background: linear-gradient(0deg, rgba(5,2,3,0.98) 0%, rgba(5,2,3,0.7) 100%); display: flex; flex-direction: column; align-items: center; gap: 16px;">
        <p style="font-size: 11px; color: rgba(255,255,255,0.4); font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase;">Hover over medicine label</p>
        
        <div style="display: flex; align-items: center; justify-content: center; width: 100%; position: relative;">
          
          <div style="position: absolute; left: 0;">
            <input type="file" id="sv-gallery-input" accept="image/*" style="display: none;" />
            <button id="sv-gallery" style="width: 48px; height: 48px; border-radius: 12px; background: rgba(26,10,18,0.6); border: 1px solid rgba(255,184,140,0.2); color: rgba(255,184,140,0.7); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </button>
          </div>

          <div style="position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
            <svg width="80" height="80" viewBox="0 0 100 100" style="position: absolute; transform: rotate(-90deg);">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,184,140,0.2)" stroke-width="6" />
              <circle id="sv-confidence-ring" cx="50" cy="50" r="45" fill="none" stroke="#10b981" stroke-width="6" stroke-dasharray="283" stroke-dashoffset="283" style="transition: stroke-dashoffset 0.4s ease-out;" />
            </svg>
            <div id="sv-auto-center" style="width: 50px; height: 50px; border-radius: 50%; background: rgba(16,185,129,0.1); border: 2px solid rgba(16,185,129,0.3); display: flex; align-items: center; justify-content: center; transition: all 0.3s; cursor: pointer;">
               <span id="sv-confidence-text" style="font-size: 12px; font-weight: bold; color: #10b981;">0%</span>
            </div>
          </div>
          
        </div>
      </div>

      <div id="sv-result-sheet" style="position: fixed; left: 0; right: 0; bottom: 0; z-index: 100; transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1); border-radius: 24px 24px 0 0; background: linear-gradient(180deg, #140710 0%, #0a0407 100%); border-top: 1px solid rgba(127,47,93,0.4); display: flex; flex-direction: column; max-height: 80vh; box-shadow: 0 -10px 40px rgba(0,0,0,0.5);">
        <div style="padding: 14px 20px 10px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 11px; color: #7f2f5d; font-family: monospace; text-transform: uppercase;">Locked Match</div>
            <div id="sv-result-name" style="font-size: 20px; font-weight: 800; color: white;"></div>
          </div>
          <div id="sv-result-schedule-badge" style="padding: 5px 12px; border-radius: 20px; font-size: 10px; font-weight: 700;"></div>
        </div>
        <div style="flex: 1; overflow-y: auto; padding: 0 20px 20px;">
          <div id="sv-result-dosage-row" style="display: flex; gap: 10px; margin-bottom: 24px;"></div>
          <div style="display: flex; gap: 10px;">
            <button id="sv-result-add" style="flex: 1; padding: 14px; border-radius: 14px; background: linear-gradient(135deg, #7f2f5d, #4a1532); border: 1px solid rgba(255,184,140,0.2); color: white; font-weight: 700;">Add to Medications</button>
            <button id="sv-result-retry" style="padding: 14px 16px; border-radius: 14px; background: rgba(26,10,18,0.8); border: 1px solid rgba(255,184,140,0.15); color: rgba(255,184,140,0.7);">Retry</button>
          </div>
        </div>
      </div>
    `;
  }

  _cacheElements() {
    this._video           = this.container.querySelector('#sv-video');
    this._captureCanvas   = this.container.querySelector('#sv-capture-canvas'); // Appended
    this._particleHost    = this.container.querySelector('#sv-particle-host');
    this._confRing        = this.container.querySelector('#sv-confidence-ring');
    this._confText        = this.container.querySelector('#sv-confidence-text');
    this._autoCenter      = this.container.querySelector('#sv-auto-center');
    this._resultSheet     = this.container.querySelector('#sv-result-sheet');
    this._resultName      = this.container.querySelector('#sv-result-name');
    this._resultDosRow    = this.container.querySelector('#sv-result-dosage-row');
    this._resultSched     = this.container.querySelector('#sv-result-schedule-badge');
    this._resultAdd       = this.container.querySelector('#sv-result-add');
    this._resultRetry     = this.container.querySelector('#sv-result-retry');
    
    // --- APPENDED: Cached Elements ---
    this._torchBtn        = this.container.querySelector('#sv-torch');
    this._switchBtn       = this.container.querySelector('#sv-cam-switch');
    this._galleryBtn      = this.container.querySelector('#sv-gallery');
    this._galleryInput    = this.container.querySelector('#sv-gallery-input');
    this._procOverlay     = this.container.querySelector('#sv-processing-overlay');
    this._phaseLabel      = this.container.querySelector('#sv-phase-label');
    this._terminalLog     = this.container.querySelector('#sv-terminal-log');
    this._statusText      = this.container.querySelector('#sv-status-text');
  }

  _attachListeners() {
    this._resultAdd.addEventListener('click', () => this._navigateToAdd());
    this._resultRetry.addEventListener('click', () => {
      this._resultSheet.style.transform = 'translateY(100%)';
      this.pipeline.clearMemory();
      this.confidenceTracker = 0;
      this._setState('IDLE');
      this.targetBBox = null;
      this.particles.forEach(p => p.el.remove());
      this.particles = [];
      this._updateConfidenceUI();
      if(this._video) this._video.play(); 
    });

    this._video.addEventListener('loadedmetadata', () => {
      this.cameraReady = true;
      this._startRenderLoop();
    });

    // --- APPENDED: Hardware & Gallery Listeners ---
    this._torchBtn.addEventListener('click', () => this._toggleTorch());
    this._switchBtn.addEventListener('click', () => this._switchCamera());
    
    this._galleryBtn.addEventListener('click', () => this._galleryInput.click());
    this._galleryInput.addEventListener('change', (e) => this._handleGalleryUpload(e));
    
    // Tap radar to force manual scan focus
    this._autoCenter.addEventListener('click', () => {
       if(this.state !== 'RESULT' && !this.pipeline.isProcessing) {
          this.confidenceTracker = Math.min(100, this.confidenceTracker + 20);
          this._updateConfidenceUI();
          this._runContinuousScan();
       }
    });
  }

  // --- APPENDED: Hardware Methods ---
  async _startCamera() {
    try {
      if (this.stream) this.stream.getTracks().forEach(t => t.stop());
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: this.facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false
      });
      const tracks = this.stream.getVideoTracks();
      if (tracks.length > 0) this.videoTrack = tracks[0];
      this._video.srcObject = this.stream;
    } catch (err) { 
      console.warn('Camera blocked'); 
      this._statusText.textContent = 'CAMERA BLOCKED';
      this._statusText.style.color = '#ef4444';
    }
  }

  async _switchCamera() {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    this.torchOn = false;
    this._torchBtn.style.color = 'rgba(255,184,140,0.45)';
    this._torchBtn.style.background = 'rgba(26,10,18,0.8)';
    await this._startCamera();
  }

  async _toggleTorch() {
    if (!this.videoTrack) return;
    const capabilities = this.videoTrack.getCapabilities?.();
    if (capabilities?.torch) {
      this.torchOn = !this.torchOn;
      await this.videoTrack.applyConstraints({ advanced: [{ torch: this.torchOn }] });
      this._torchBtn.style.color = this.torchOn ? '#0a0407' : 'rgba(255,184,140,0.45)';
      this._torchBtn.style.background = this.torchOn ? '#ffb88c' : 'rgba(26,10,18,0.8)';
    }
  }

  // --- APPENDED: Gallery Processing Methods ---
  _handleGalleryUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const img = new Image();
    img.onload = async () => {
      // Pause live camera
      if (this._video) this._video.pause();
      this._setState('VERIFYING'); // Lock the auto-scanner loop
      
      this._showProcessingOverlay('Importing Image…', 'Analyzing high-res photo');
      
      this._captureCanvas.width = img.width;
      this._captureCanvas.height = img.height;
      const ctx = this._captureCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      await this._runGalleryPipeline();
    };
    img.src = URL.createObjectURL(file);
  }

  _showProcessingOverlay(title, logMsg) {
    this._procOverlay.style.display = 'flex';
    this._phaseLabel.textContent = title;
    this._terminalLog.innerHTML = '';
    this._appendLog(logMsg);
  }

  _appendLog(msg) {
    if (this._terminalLog) {
      const line = document.createElement('div');
      line.textContent = `> ${msg}`;
      this._terminalLog.appendChild(line);
      this._terminalLog.scrollTop = this._terminalLog.scrollHeight;
    }
  }

  _hideProcessingOverlay() { 
    this._procOverlay.style.display = 'none'; 
  }

  async _runGalleryPipeline() {
    try {
      this._appendLog('Applying Adaptive Binarization Matrix...');
      
      const data = await this.pipeline.processFrame(this._captureCanvas, 1.0, true);
      
      await new Promise(r => setTimeout(r, 600)); // UX buffer
      this._hideProcessingOverlay();

      if (data && (data.state === 'VERIFYING' || data.bestMatch)) {
        this.currentResults = data;
        this.confidenceTracker = 100;
        this._updateConfidenceUI();
        this._setState('RESULT');
      } else {
        // Fallback if gallery image failed
        this._setState('IDLE');
        if(this._video) this._video.play();
        this._statusText.textContent = 'NO MATCH FOUND';
        this._statusText.style.color = '#ef4444';
        setTimeout(() => {
           this._setState('HUNTING');
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      this._hideProcessingOverlay();
      this._setState('IDLE');
      if(this._video) this._video.play();
    }
  }

  _showGalleryPrompt() {
      this.galleryPromptShown = true;
      const prompt = document.createElement('div');
      prompt.style.cssText = `
          position: absolute; top: 80px; left: 50%; transform: translateX(-50%);
          background: rgba(5,2,3,0.85); border: 1px solid rgba(255,184,140,0.4);
          color: #ffb88c; padding: 12px 20px; border-radius: 20px; font-size: 12px;
          z-index: 80; backdrop-filter: blur(8px); display: flex; align-items: center; gap: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5); cursor: pointer;
      `;
      prompt.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Can't read the label? Try uploading a photo.
      `;
      prompt.addEventListener('click', () => {
          prompt.remove();
          this._galleryInput.click();
      });
      this.container.appendChild(prompt);
      setTimeout(() => { if (prompt.parentNode) prompt.remove(); }, 10000);
  }

  // --- CORE LOOP ---
  _startRenderLoop() {
    this._renderLoop();
  }

  _renderLoop() {
    this.animFrameId = requestAnimationFrame(this._boundLoop);
    this._updateParticles();

    if (!this.cameraReady || this.state === 'RESULT') return;
    
    if (!this.pipeline.isProcessing) {
      this._runContinuousScan();
    }
  }

  async _runContinuousScan() {
    if (this.state === 'RESULT' || !this.cameraReady || !this.pipeline.isReady) return;

    if (this.state === 'IDLE') this._setState('HUNTING');

    const data = await this.pipeline.processFrame(this._video, 0.5);
    if (!data) return;

    if (data.state === 'HUNTING') {
        this._setState('HUNTING');
        this.confidenceTracker = Math.max(0, this.confidenceTracker - 10);
        
        if (this.huntStartTime === 0) {
            this.huntStartTime = Date.now();
        } else if (Date.now() - this.huntStartTime > 5000 && !this.galleryPromptShown) {
            this._showGalleryPrompt();
        }
    } else if (data.state === 'LOCKING') {
        this._setState('LOCKING');
        this.huntStartTime = 0;
        this.confidenceTracker = Math.min(90, data.consecutiveFrames * 20);
    } else if (data.state === 'VERIFYING') {
        this._setState('VERIFYING');
        this.huntStartTime = 0;
        this.confidenceTracker = 100;
        this.currentResults = data;
        
        if (data.bbox) {
            this._spawnPinnedParticles(data.bbox);
        }

        setTimeout(() => {
            if (this.state === 'VERIFYING') {
                this._setState('RESULT');
            }
        }, 300);
    }

      this._updateConfidenceUI();
  }

  _updateConfidenceUI() {
    const offset = 283 - (this.confidenceTracker / 100) * 283;
    this._confRing.style.strokeDashoffset = offset;
    this._confText.textContent = `${Math.floor(this.confidenceTracker)}%`;
    
    if (this.confidenceTracker > 50) {
      this._autoCenter.style.background = 'rgba(16,185,129,0.3)';
      this._autoCenter.style.borderColor = 'rgba(16,185,129,0.8)';
    } else {
      this._autoCenter.style.background = 'rgba(16,185,129,0.1)';
      this._autoCenter.style.borderColor = 'rgba(16,185,129,0.3)';
    }
  }

  _triggerAutoLock() {
    this.isAutoLocked = true;
    this._video.pause(); 
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]); 
    
    this._autoCenter.style.animation = 'pulseRing 1s ease-out forwards';
    this._confText.textContent = 'LOCKED';

    const vpRect = this.container.getBoundingClientRect();
    for(let i=0; i<3; i++) setTimeout(() => this._emitTargetedParticleCloud(vpRect.width / 2, vpRect.height / 2, 100), i * 150);

    setTimeout(() => {
      this._showResultSheet(this.currentResults);
    }, 500);
  }

  _emitTargetedParticleCloud(cx, cy, spread = 40) {
    for (let i = 0; i < 15; i++) {
      const el = document.createElement('div');
      el.className = 'particle-dot';
      const px = cx + (Math.random() - 0.5) * spread;
      const py = cy + (Math.random() - 0.5) * spread;
      const size = 3 + Math.random() * 5;
      el.style.cssText = `
        width: ${size}px; height: ${size}px; background: #10b981;
        left: ${px}px; top: ${py}px; --dur: ${0.8 + Math.random()}s;
        opacity: 0; box-shadow: 0 0 ${size * 3}px #10b981;
      `;
      this._particleHost.appendChild(el);
      setTimeout(() => el.remove(), 1800);
    }
  }

  _spawnPinnedParticles(bbox) {
    const vpRect = this.container.getBoundingClientRect();
    let x0, y0, x1, y1;
    
    if (this._video && this._video.videoWidth > 0) {
      const vW = this._video.videoWidth;
      const vH = this._video.videoHeight;
      const scale = Math.max(vpRect.width / vW, vpRect.height / vH);
      const scaledW = vW * scale;
      const scaledH = vH * scale;
      const offsetX = (vpRect.width - scaledW) / 2;
      const offsetY = (vpRect.height - scaledH) / 2;

      x0 = bbox.x0 * scale + offsetX;
      y0 = bbox.y0 * scale + offsetY;
      x1 = bbox.x1 * scale + offsetX;
      y1 = bbox.y1 * scale + offsetY;
    } else {
      x0 = bbox.x0; y0 = bbox.y0; x1 = bbox.x1; y1 = bbox.y1;
    }
    
    this.targetBBox = { x0, y0, x1, y1, width: x1 - x0, height: y1 - y0 };

    for (let i = 0; i < 40; i++) {
      const p = {
        el: document.createElement('div'),
        offsetX: Math.random() * this.targetBBox.width,
        offsetY: Math.random() * this.targetBBox.height,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02
      };
      p.el.className = 'particle-dot';
      const size = 3 + Math.random() * 5;
      p.el.style.cssText = `
        position: absolute;
        width: ${size}px; height: ${size}px;
        background: #10b981;
        border-radius: 50%;
        pointer-events: none;
        box-shadow: 0 0 ${size * 3}px #10b981;
        z-index: 100;
      `;
      this._particleHost.appendChild(p.el);
      this.particles.push(p);
    }
  }

  _updateParticles() {
    if (!this.targetBBox) return;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay;
      
      if (p.life <= 0) {
        p.el.remove();
        this.particles.splice(i, 1);
        continue;
      }

      const currentX = this.targetBBox.x0 + p.offsetX;
      const currentY = this.targetBBox.y0 + p.offsetY;

      p.el.style.left = `${currentX}px`;
      p.el.style.top = `${currentY}px`;
      p.el.style.opacity = p.life;
      p.el.style.transform = `scale(${p.life})`;
    }
  }

  _showResultSheet(data) {
    const drug = data.bestMatch;
    const sched = SCHEDULE_INFO[drug.schedule] || SCHEDULE_INFO['OTC'];

    this._resultName.textContent = drug.name;
    this._resultSched.textContent = drug.schedule || 'OTC';
    this._resultSched.style.color = sched.color;
    this._resultSched.style.background = `${sched.color}22`;
    
    this._resultDosRow.innerHTML = '';
    if (data.dosage) {
      this._resultDosRow.innerHTML += `<div style="padding: 6px 12px; border-radius: 20px; background: rgba(255,184,140,0.12); color: #ffb88c; font-size: 12px; font-family: monospace;">💊 ${data.dosage}${data.unit}</div>`;
    }
    
    this._resultSheet.style.transform = 'translateY(0)';
  }

  _navigateToAdd() {
    if (!this.currentResults?.bestMatch) return;
    const drug = this.currentResults.bestMatch;
    const params = new URLSearchParams({ name: drug.name, dosage: this.currentResults.dosage || '', unit: this.currentResults.unit || 'mg' });
    this.destroy();
    window.location.hash = `#/add?${params.toString()}`;
  }

  destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
  }
}