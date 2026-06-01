/**
 * @fileoverview CarePoint Vision Scanner — Auto-Tracking Architecture + Hardware Controls & Gallery Fallback
 * Orchestrates the scanner view utilizing modular sub-controllers.
 */
import VisionPipeline from '../services/VisionPipeline.js';
import ScanCameraController from './scan/ScanCameraController.js';
import ScanOverlayController from './scan/ScanOverlayController.js';
import ScanStateController from './scan/ScanStateController.js';
import ScanResultController from './scan/ScanResultController.js';
import { ScanSessionManager } from '../services/vision/ScanSessionManager.js';
import { UserConfirmationEngine } from '../services/vision/UserConfirmationEngine.js';
import { StripConsistencyEngine } from '../services/vision/StripConsistencyEngine.js';
import { SessionConfidenceEngine } from '../services/vision/SessionConfidenceEngine.js';
import { MultiAngleFusion } from '../services/vision/MultiAngleFusion.js';

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
    
    // Vision Engines
    this.sessionManager = new ScanSessionManager();
    this.confirmationEngine = new UserConfirmationEngine();
    this.consistencyEngine = new StripConsistencyEngine();
    this.confidenceEngine = new SessionConfidenceEngine();
    this.fusion = new MultiAngleFusion();
    
    // Hardware State
    this.facingMode        = 'environment';
    this.torchOn           = false;
    this.videoTrack        = null;

    this.container = document.createElement('div');
    this.container.className = 'scan-view-root';
    this.container.style.cssText = `
      position: fixed; inset: 0; width: 100%; height: 100%;
      background: transparent; overflow: hidden; display: flex;
      flex-direction: column; font-family: 'Inter', sans-serif; z-index: 10;
    `;
    this._boundLoop = this._renderLoop.bind(this);

    // Initialize sub-controllers
    this.cameraController = new ScanCameraController(this);
    this.overlay = new ScanOverlayController(this);
    this.stateController = new ScanStateController(this);
    this.resultController = new ScanResultController(this);
  }

  // State coordination wrapper
  _setState(newState) {
    this.stateController.setState(newState);
  }

  async render() {
    if (this.pipeline) {
      this.pipeline.activeSessionId = 'session-' + Date.now();
    }
    this._buildDOM();
    this._cacheElements();
    this._attachListeners();
    await this._startCamera();

    const cached = sessionStorage.getItem('medcare_scan_cache');
    if (cached) {
      try {
        this.currentResults = JSON.parse(cached);
        sessionStorage.removeItem('medcare_scan_cache');
        this.confidenceTracker = 100;
        this._setState('RESULT');
        this._updateConfidenceUI();
      } catch (e) {
        console.error(e);
      }
    }

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

      <div id="sv-header" style="position: relative; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px 10px; background: rgba(5,2,3,0.4); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.05);">
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
        <canvas id="sv-ghost-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.3; pointer-events: none; display: none;"></canvas>
        <div id="sv-particle-host" class="particle-host"></div>

        <div id="sv-frame" style="position: absolute; inset: 0; pointer-events: none; display: flex; align-items: center; justify-content: center;">
          <div style="position: relative; width: 75%; max-width: 300px; height: 120px;">
            <div style="position:absolute;top:-2px;left:-2px;width:24px;height:24px;border-top:3px solid #ffb88c;border-left:3px solid #ffb88c;animation:cornerPulse 1.8s ease-in-out infinite;"></div>
            <div style="position:absolute;top:-2px;right:-2px;width:24px;height:24px;border-top:3px solid #ffb88c;border-right:3px solid #ffb88c;animation:cornerPulse 1.8s ease-in-out infinite 0.2s;"></div>
            <div style="position:absolute;bottom:-2px;left:-2px;width:24px;height:24px;border-bottom:3px solid #ffb88c;border-left:3px solid #ffb88c;animation:cornerPulse 1.8s ease-in-out infinite 0.4s;"></div>
            <div style="position:absolute;bottom:-2px;right:-2px;width:24px;height:24px;border-bottom:3px solid #ffb88c;border-right:3px solid #ffb88c;animation:cornerPulse 1.8s ease-in-out infinite 0.6s;"></div>
          </div>
        </div>

        <!-- Intent Toggle Overlay -->
        <div id="sv-intent-overlay" style="position: absolute; inset: 0; background: rgba(5,2,3,0.9); z-index: 65; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(8px);">
           <h3 style="color: white; font-size: 18px; font-weight: 700; margin-bottom: 20px;">What are you scanning?</h3>
           <div style="display: flex; flex-direction: column; gap: 12px; width: 220px;">
              <button class="sv-intent-btn" data-target="FRONT" style="padding: 14px; border-radius: 12px; background: rgba(26,10,18,0.8); border: 1px solid #ffb88c; color: #ffb88c; font-weight: bold; cursor: pointer;">Front of strip</button>
              <button class="sv-intent-btn" data-target="BACK" style="padding: 14px; border-radius: 12px; background: rgba(26,10,18,0.8); border: 1px solid rgba(255,184,140,0.5); color: white; font-weight: bold; cursor: pointer;">Back of strip</button>
              <button class="sv-intent-btn" data-target="UNKNOWN" style="padding: 14px; border-radius: 12px; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #aaa; font-weight: bold; cursor: pointer;">Not sure</button>
           </div>
        </div>

        <!-- Smart Scan Recovery UI -->
        <div id="sv-recovery-overlay" style="position: absolute; top: 16px; left: 16px; right: 16px; display: none; flex-direction: column; gap: 8px; z-index: 60;">
           <div style="background: rgba(26,10,18,0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255,184,140,0.4); border-radius: 16px; padding: 12px; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
              <canvas id="sv-recovery-thumb" width="40" height="40" style="border-radius: 8px; background: #000; flex-shrink: 0;"></canvas>
              <div style="flex: 1;">
                 <div style="color: #ffb88c; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Strip Session Started</div>
                 <div id="sv-recovery-instruction" style="color: white; font-size: 14px; font-weight: bold; margin-top: 2px;">Align the same strip here</div>
              </div>
           </div>
           
           <div style="background: rgba(26,10,18,0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255,184,140,0.2); border-radius: 16px; padding: 12px;">
              <div id="sv-recovery-human-state" style="color: white; font-size: 13px; font-weight: 600; margin-bottom: 6px; text-align: center;">Finding medicine...</div>
              <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                 <div id="sv-recovery-progress" style="width: 0%; height: 100%; background: #10b981; transition: width 0.3s;"></div>
              </div>
           </div>
        </div>

        <!-- Intrusion Dialog -->
        <div id="sv-intrusion-dialog" style="position: absolute; inset: 0; background: rgba(5,2,3,0.95); z-index: 80; display: none; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(8px); padding: 24px; text-align: center;">
           <div style="font-size: 40px; margin-bottom: 12px;">👨‍⚕️</div>
           <h3 style="color: white; font-size: 18px; font-weight: 700; margin-bottom: 8px;">Different Strip Detected</h3>
           <p style="color: #ccc; font-size: 14px; margin-bottom: 24px;">This looks like a different medicine strip. What would you like to do?</p>
           <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 260px;">
              <button id="sv-intrusion-continue" style="padding: 14px; border-radius: 12px; background: rgba(26,10,18,0.8); border: 1px solid #ffb88c; color: #ffb88c; font-weight: bold; cursor: pointer;">Continue current scan</button>
              <button id="sv-intrusion-new" style="padding: 14px; border-radius: 12px; background: #10b981; border: none; color: white; font-weight: bold; cursor: pointer;">Start new scan</button>
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

        <div id="sv-camera-error" style="position: absolute; inset: 0; background: #050203; display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 70; padding: 20px; text-align: center;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5" style="margin-bottom: 16px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
          <div style="font-size: 16px; font-weight: 700; color: white; margin-bottom: 8px;">Camera Access Required</div>
          <div style="font-size: 12px; color: #aaa; margin-bottom: 24px; max-width: 280px;">Please allow camera permissions in your browser settings to scan medicine labels.</div>
          <button id="sv-retry-cam" style="padding: 12px 24px; border-radius: 12px; background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.5); color: #ef4444; font-weight: 700; cursor: pointer;">Retry Connection</button>
        </div>
      </div>

      <div id="sv-controls" style="position: relative; z-index: 50; padding: 20px 24px 40px; background: rgba(5,2,3,0.4); backdrop-filter: blur(16px); border-top: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; align-items: center; gap: 16px;">
        <p style="font-size: 11px; color: rgba(255,255,255,0.4); font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase;">Align medicine and tap to capture</p>
        
        <div style="display: flex; align-items: center; justify-content: center; width: 100%; position: relative;">
          
          <div style="position: absolute; left: 0;">
            <input type="file" id="sv-gallery-input" accept="image/*" style="display: none;" />
            <button id="sv-gallery" style="width: 48px; height: 48px; border-radius: 12px; background: rgba(26,10,18,0.6); border: 1px solid rgba(255,184,140,0.2); color: rgba(255,184,140,0.7); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </button>
          </div>

          <div style="position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 70px; height: 70px; border-radius: 50%; border: 4px solid rgba(255,184,140,0.4);"></div>
            <div id="sv-auto-center" style="width: 54px; height: 54px; border-radius: 50%; background: #ffb88c; display: flex; align-items: center; justify-content: center; transition: all 0.3s; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            </div>
          </div>
          
        </div>
      </div>

      <div id="sv-result-sheet" style="position: fixed; left: 0; right: 0; bottom: 0; z-index: 100; transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1); border-radius: 24px 24px 0 0; background: rgba(26,10,18,0.7); backdrop-filter: blur(24px); border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; max-height: 80vh; box-shadow: 0 -10px 40px rgba(0,0,0,0.7);">
        
        <!-- Confirmation Sub-Sheet -->
        <div id="sv-confirm-dialog" style="padding: 20px; text-align: center; display: none; flex-direction: column; align-items: center; gap: 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">
           <div style="font-size: 13px; color: #ffb88c; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Possible Match</div>
           <div id="sv-confirm-name" style="font-size: 24px; font-weight: 800; color: white;">Dolo 650</div>
           <div style="font-size: 15px; color: #ccc;">Does this look correct?</div>
           <div style="display: flex; gap: 12px; width: 100%;">
             <button id="sv-confirm-yes" style="flex: 1; padding: 14px; border-radius: 12px; background: #10b981; color: white; font-weight: bold; border: none; cursor: pointer;">Yes</button>
             <button id="sv-confirm-no" style="flex: 1; padding: 14px; border-radius: 12px; background: rgba(239,68,68,0.2); color: #ef4444; font-weight: bold; border: 1px solid rgba(239,68,68,0.5); cursor: pointer;">No</button>
           </div>
        </div>

        <div id="sv-final-result-content" style="display: flex; flex-direction: column; flex: 1; opacity: 0; pointer-events: none; transition: opacity 0.3s;">
          <div style="padding: 14px 20px 10px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 11px; color: #7f2f5d; font-family: monospace; text-transform: uppercase;">Locked Match</div>
            <div id="sv-result-name" style="font-size: 20px; font-weight: 800; color: white;"></div>
          </div>
          <div id="sv-result-schedule-badge" style="padding: 5px 12px; border-radius: 20px; font-size: 10px; font-weight: 700;"></div>
        </div>
          <div style="flex: 1; overflow-y: auto; padding: 0 20px 20px;">
            <div id="sv-result-dosage-row" style="display: flex; gap: 10px; margin-bottom: 24px;"></div>
            
            <div id="sv-result-clinical-use" style="margin-top: 16px; margin-bottom: 24px; padding: 14px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); border-radius: 14px; display: none; flex-direction: column; gap: 4px;">
                <div style="font-size: 11px; color: #10b981; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    Clinical Usage
                </div>
                <div id="sv-result-use-text" style="color: rgba(255,255,255,0.9); font-size: 13px; line-height: 1.5; font-weight: 500;"></div>
            </div>

            <div style="display: flex; gap: 10px;">
              <button id="sv-result-add" style="flex: 1; padding: 14px; border-radius: 14px; background: linear-gradient(135deg, #7f2f5d, #4a1532); border: 1px solid rgba(255,184,140,0.2); color: white; font-weight: 700;">Add to Medications</button>
              <button id="sv-result-retry" style="padding: 14px 16px; border-radius: 14px; background: rgba(26,10,18,0.8); border: 1px solid rgba(255,184,140,0.15); color: rgba(255,184,140,0.7);">Retry</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _cacheElements() {
    this._video           = this.container.querySelector('#sv-video');
    this._captureCanvas   = this.container.querySelector('#sv-capture-canvas');
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
    
    this._torchBtn        = this.container.querySelector('#sv-torch');
    this._switchBtn       = this.container.querySelector('#sv-cam-switch');
    this._galleryBtn      = this.container.querySelector('#sv-gallery');
    this._galleryInput    = this.container.querySelector('#sv-gallery-input');
    this._procOverlay     = this.container.querySelector('#sv-processing-overlay');
    this._phaseLabel      = this.container.querySelector('#sv-phase-label');
    this._terminalLog     = this.container.querySelector('#sv-terminal-log');
    this._statusText      = this.container.querySelector('#sv-status-text');
    this._camErrorOverlay = this.container.querySelector('#sv-camera-error');
    this._retryCamBtn     = this.container.querySelector('#sv-retry-cam');

    // Smart Scan Recovery UI Elements
    this._intentOverlay = this.container.querySelector('#sv-intent-overlay');
    this._intentBtns = this.container.querySelectorAll('.sv-intent-btn');
    this._recoveryOverlay = this.container.querySelector('#sv-recovery-overlay');
    this._recoveryThumb = this.container.querySelector('#sv-recovery-thumb');
    this._recoveryInstruction = this.container.querySelector('#sv-recovery-instruction');
    this._recoveryHumanState = this.container.querySelector('#sv-recovery-human-state');
    this._recoveryProgress = this.container.querySelector('#sv-recovery-progress');
    this._ghostCanvas = this.container.querySelector('#sv-ghost-canvas');
    this._confirmDialog = this.container.querySelector('#sv-confirm-dialog');
    this._confirmName = this.container.querySelector('#sv-confirm-name');
    this._confirmYes = this.container.querySelector('#sv-confirm-yes');
    this._confirmNo = this.container.querySelector('#sv-confirm-no');
    this._finalResultContent = this.container.querySelector('#sv-final-result-content');
    
    this._intrusionDialog = this.container.querySelector('#sv-intrusion-dialog');
    this._intrusionContinue = this.container.querySelector('#sv-intrusion-continue');
    this._intrusionNew = this.container.querySelector('#sv-intrusion-new');
  }

  _attachListeners() {
    this._resultAdd.addEventListener('click', async () => {
      await this.resultController.handleResultAdd();
    });

    this._intentBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        this.sessionManager.startLiveScan(target);
        this._intentOverlay.style.display = 'none';
      });
    });

    if (this._confirmYes) {
      this._confirmYes.addEventListener('click', () => {
         const drugName = this._confirmName.textContent;
         this.confirmationEngine.logConfirmation(drugName, {}, true);
         this._confirmDialog.style.display = 'none';
         this._finalResultContent.style.opacity = '1';
         this._finalResultContent.style.pointerEvents = 'auto';
      });
    }

    if (this._confirmNo) {
      this._confirmNo.addEventListener('click', () => {
         const drugName = this._confirmName.textContent;
         this.confirmationEngine.logConfirmation(drugName, {}, false);
         this._confirmDialog.style.display = 'none';
         this._resultRetry.click();
      });
    }

    if (this._intrusionContinue) {
       this._intrusionContinue.addEventListener('click', () => {
           this._intrusionDialog.style.display = 'none';
       });
       this._intrusionNew.addEventListener('click', () => {
           this._intrusionDialog.style.display = 'none';
           this._resultRetry.click();
       });
    }

    this._resultRetry.addEventListener('click', () => {
      this._resultSheet.style.transform = 'translateY(100%)';
      this.pipeline.recordFailure(this.pipeline.activeSessionId || 'default-session', 'USER_RETRY');
      this.pipeline.clearMemory();
      if (this.sessionManager) {
          const prevTarget = this.sessionManager.targetObject || 'UNKNOWN';
          this.sessionManager.startLiveScan(prevTarget);
      }
      if (this.consistencyEngine && typeof this.consistencyEngine.reset === 'function') {
          this.consistencyEngine.reset();
      }
      this.confidenceTracker = 0;
      this._setState('IDLE');
      this.targetBBox = null;
      this.particles.forEach(p => p.el.remove());
      this.particles = [];
      this._updateConfidenceUI();
      if (this._video) this._video.play(); 
    });

    this._video.addEventListener('loadedmetadata', () => {
      this.cameraReady = true;
      this._startRenderLoop();
    });

    this._torchBtn.addEventListener('click', () => this._toggleTorch());
    this._switchBtn.addEventListener('click', () => this._switchCamera());
    
    if (this._retryCamBtn) {
      this._retryCamBtn.addEventListener('click', () => {
        if (this._camErrorOverlay) this._camErrorOverlay.style.display = 'none';
        this._startCamera();
      });
    }

    this._galleryBtn.addEventListener('click', () => this._galleryInput.click());
    this._galleryInput.addEventListener('change', (e) => this._handleGalleryUpload(e));
    
    this._autoCenter.addEventListener('click', async () => {
       if (this.state !== 'RESULT' && !this.pipeline.isProcessing) {
          // Play capture animation
          this._autoCenter.style.transform = 'scale(0.85)';
          setTimeout(() => { this._autoCenter.style.transform = 'scale(1)'; }, 150);
          
          await this._captureAndAnalyze();
       }
    });

    window.addEventListener('scan:pipeline-stage', (e) => {
      this._appendLog(e.detail);
      if (this.state === 'VERIFYING' || this.state === 'HUNTING' || this.state === 'LOCKING') {
        this._statusText.textContent = e.detail.toUpperCase();
      }
    });

    this._visibilityHandler = async () => {
      if (document.hidden) {
        // App is in background: Stop the render loop and KILL hardware camera completely
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop()); // Completely turns off the green dot
          this.stream = null;
          this.cameraReady = false;
        }
      } else {
        // App is active again: Reboot the camera natively
        if (this.state !== 'RESULT') {
          await this._startCamera(); // Re-request hardware access
          this._startRenderLoop();
        }
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  // Delegation methods pointing to Sub-Controllers
  _startCamera() {
    return this.cameraController.startCamera();
  }

  _switchCamera() {
    return this.cameraController.switchCamera();
  }

  _toggleTorch() {
    return this.cameraController.toggleTorch();
  }

  _handleGalleryUpload(e) {
    this.cameraController.handleGalleryUpload(e);
  }

  _updateConfidenceUI() {
    this.overlay.updateConfidenceUI();
  }

  _updateParticles() {
    this.overlay.updateParticles();
  }

  _spawnPinnedParticles(bbox) {
    this.overlay.spawnPinnedParticles(bbox);
  }

  _appendLog(msg) {
    this.overlay.appendLog(msg);
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

  _startRenderLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this._renderLoop();
  }

  _renderLoop() {
    this.animFrameId = requestAnimationFrame(this._boundLoop);
    this._updateParticles();

    if (!this.cameraReady || this.state === 'RESULT') return;
    
    // Polling removed! We only wait for manual shutter taps now.
  }

  async _captureAndAnalyze() {
    console.log("[DEBUG] _captureAndAnalyze TRIGGERED");
    if (this._terminalLog) this.overlay.appendLog("[DEBUG] Capture Button Clicked");

    if (this.state === 'RESULT' || !this.cameraReady || !this.pipeline.isReady) {
        console.log("[DEBUG] Blocked by early return: state=", this.state, "cameraReady=", this.cameraReady, "pipelineReady=", this.pipeline.isReady);
        return;
    }
    
    if (this.sessionManager.state === 'INIT') {
        console.log("[DEBUG] Auto-dismissing INIT state");
        this.sessionManager.startLiveScan('UNKNOWN');
        if (this._intentOverlay) this._intentOverlay.style.display = 'none';
    }
    if (this._intrusionDialog && this._intrusionDialog.style.display === 'flex') return;

    // Show loading overlay
    this._setState('HUNTING');
    if (this._procOverlay) {
        this._procOverlay.style.display = 'flex';
        if (this._phaseLabel) this._phaseLabel.textContent = 'Extracting Label Details...';
    }

    console.log("[DEBUG] FRAME CAPTURED, calling processFrame");
    if (this._terminalLog) this.overlay.appendLog("[DEBUG] Calling processFrame");
    
    // Capture single high-res frame (scale = 1.0)
    const matchResult = await this.pipeline.processFrame(this._video, 1.0, true);
    
    console.log("[DEBUG] processFrame RESOLVED, matchResult=", matchResult);
    if (this._terminalLog) this.overlay.appendLog("[DEBUG] processFrame finished");
    
    // Hide loading overlay
    if (this._procOverlay) {
        this._procOverlay.style.display = 'none';
    }

    if (!matchResult) return;

    if (matchResult.state === 'ERROR') {
        this._statusText.textContent = matchResult.error === 'NO_TEXT' ? 'NO TEXT DETECTED' : 'SCAN ERROR';
        this._statusText.style.color = '#ef4444';
        if (!this.galleryPromptShown) this._showGalleryPrompt();
        return;
    }

    if (this._terminalLog && matchResult.diagnosticReport) {
      this._terminalLog.innerHTML = '';
      const diag = matchResult.diagnosticReport;
      const breakdown = diag.confidenceBreakdown || {};
      const pack = diag.packagingProfile || {};
      const boost = diag.sessionBoostApplied || 0;

      this.overlay.appendLog(`Analysis Complete.`);
      this.overlay.appendLog(`Type: ${pack.packagingType || 'unknown'}`);
      
      if (boost > 0) {
        this.overlay.appendLog(`⚡ Recognition Boost: +${boost}%`);
      }

      this.overlay.appendLog(`Confidence: ${matchResult.confidence}%`);

      if (matchResult.bestMatch) {
        this.overlay.appendLog(`Matching Drug: ${matchResult.bestMatch.name}`);
      }
    }

    // Since this is a manual high-res capture, directly evaluate if a valid drug was found
    if (matchResult.bestMatch) {
        this.currentResults = matchResult;
        this.confidenceTracker = 100;
        this.overlay.updateConfidenceUI();
        this._setState('RESULT');
        this.pipeline.recordCorrection(this.pipeline.activeSessionId, [matchResult.bestMatch.name], false);
        
        if (matchResult.bbox) {
            this._spawnPinnedParticles(matchResult.bbox);
        }

        // Show confirmation dialog before final result
        if (this._confirmDialog) {
            this._confirmDialog.style.display = 'flex';
            this._confirmName.textContent = matchResult.bestMatch.name || "Unknown Medicine";
            this._finalResultContent.style.opacity = '0';
            this._finalResultContent.style.pointerEvents = 'none';
        }

        setTimeout(() => {
            this._setState('RESULT');
        }, 150);
    } else {
        const extracted = matchResult.rawText ? matchResult.rawText.substring(0, 20) + "..." : "NO TEXT";
        
        this._setState('HUNTING');
        this._statusText.textContent = `NO MATCH FOUND: ${extracted}`;
        this._statusText.style.color = '#ef4444';
        
        // Temporarily highlight the text to draw attention
        this._statusText.style.transform = 'scale(1.1)';
        setTimeout(() => { this._statusText.style.transform = 'scale(1)'; }, 300);
        
        this.confidenceTracker = 0;
        if (!this.galleryPromptShown) this._showGalleryPrompt();
    }

    this._updateConfidenceUI();

    this._updateConfidenceUI();
  }

  destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this._visibilityHandler) document.removeEventListener('visibilitychange', this._visibilityHandler);
    if (this.pipeline) this.pipeline.clearMemory();
  }
}
