/**
 * @fileoverview Camera & OCR Scanning View for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module.
 * Paradigm: Hardware-accelerated video capture with off-screen canvas processing.
 * Features: Continuous scanning, torch control, real-time OCR pipeline integration.
 */

import { globalRouter } from '../core/router.js';
import { visionPipeline } from '../services/VisionPipeline.js';
import { nlpContext } from '../services/NLPContext.js';
import { Utils } from '../core/utils.js';

// ============================================================================
// CONSTANTS
// ============================================================================
const CROP_WIDTH_RATIO = 0.60;
const CROP_HEIGHT_RATIO = 0.40;
const AUTO_SCAN_INTERVAL_MS = 2000;
const SUCCESS_FLASH_DURATION_MS = 600;
const ERROR_RESET_DURATION_MS = 1500;

export default class ScannerCamera {
    /** @private {MediaStream|null} */
    static _stream = null;
    /** @private {HTMLVideoElement|null} */
    static _videoElement = null;
    /** @private {HTMLCanvasElement|null} */
    static _offscreenCanvas = null;
    /** @private {CanvasRenderingContext2D|null} */
    static _canvasContext = null;
    
    /** @private {boolean} */
    static _isScanning = false;
    /** @private {boolean} */
    static _isAutoScan = false;
    /** @private {boolean} */
    static _isTorchOn = false;
    /** @private {number|null} */
    static _autoScanInterval = null;

    /**
     * Initializes the view, mounts the DOM layout, and requests hardware access.
     * @param {HTMLElement} container - The target viewport DOM element.
     * @returns {Promise<void>}
     */
    static async render(container) {
        if (!container) return;

        // Reset state
        this._stream = null;
        this._isScanning = false;
        this._isAutoScan = false;
        this._isTorchOn = false;
        this._autoScanInterval = null;

        this._renderLayout(container);
        this._bindEvents(container);

        // Hardware initialization
        await this._startCamera(container);
    }

    /**
     * Injects the structural HTML and scoped CSS layout for the camera interface.
     * @private
     * @param {HTMLElement} container - The target viewport DOM element.
     */
    static _renderLayout(container) {
        const scopedCSS = `
            <style id="scanner-styles">
                .scanner-wrapper { position: relative; width: 100%; height: 100%; background-color: #000000; overflow: hidden; display: flex; flex-direction: column; }
                
                /* Top Navigation Bar */
                .scanner-top-bar { position: absolute; top: 0; left: 0; right: 0; height: var(--sp-7); padding: 0 var(--sp-2); display: flex; align-items: center; justify-content: space-between; z-index: var(--z-overlay); background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%); }
                .scanner-back-btn { width: var(--sp-6); height: var(--sp-6); display: flex; align-items: center; justify-content: center; color: #FFFFFF; cursor: pointer; border-radius: var(--radius-full); transition: background var(--time-fast) ease; }
                .scanner-back-btn:active { background: rgba(255,255,255,0.2); }
                .scanner-title { color: #FFFFFF; font-size: var(--fs-lg); font-weight: 600; letter-spacing: 0.02em; }
                
                /* Video Element */
                .scanner-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
                
                /* Reticle Overlay */
                .scanner-reticle-container { position: absolute; inset: 0; z-index: 2; pointer-events: none; display: flex; align-items: center; justify-content: center; }
                .scanner-vignette { position: absolute; inset: 0; background: radial-gradient(ellipse 60% 40% at 50% 50%, transparent 80%, rgba(0,0,0,0.85) 100%); pointer-events: none; }
                
                .scanner-box { position: relative; width: 60%; height: 40%; max-width: 400px; max-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: scale(0.9); opacity: 0; transition: transform 400ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease; }
                .scanner-box--active { transform: scale(1); opacity: 1; }
                
                /* Corner Brackets */
                .bracket { position: absolute; width: var(--sp-4); height: var(--sp-4); border: 3px solid #FFFFFF; border-radius: var(--radius-sm); transition: border-color var(--time-base) ease, transform var(--time-base) ease; }
                .bracket-tl { top: 0; left: 0; border-right: none; border-bottom: none; }
                .bracket-tr { top: 0; right: 0; border-left: none; border-bottom: none; }
                .bracket-bl { bottom: 0; left: 0; border-right: none; border-top: none; }
                .bracket-br { bottom: 0; right: 0; border-left: none; border-top: none; }
                
                .scanner-box--success .bracket { border-color: var(--clr-success); transform: scale(1.1); }
                
                /* Animated Scan Line */
                .scan-line { position: absolute; left: 0; right: 0; height: 2px; background: var(--clr-accent); box-shadow: 0 0 8px var(--clr-accent); animation: scanMove 2s ease-in-out infinite alternate; }
                .scanner-box--scanning .scan-line { animation-duration: 0.8s; background: var(--clr-purple-light); box-shadow: 0 0 8px var(--clr-purple-light); }
                @keyframes scanMove { 0% { top: 5%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 95%; opacity: 0; } }
                
                .reticle-label { position: absolute; bottom: calc(var(--sp-4) * -1); color: #FFFFFF; font-size: var(--fs-sm); font-weight: 500; text-shadow: 0 2px 4px rgba(0,0,0,0.8); white-space: nowrap; }
                
                .auto-badge { position: absolute; top: calc(var(--sp-4) * -1); background: var(--clr-accent); color: #FFFFFF; font-size: var(--fs-xs); font-weight: 700; padding: 2px 8px; border-radius: var(--radius-sm); letter-spacing: 0.05em; opacity: 0; transition: opacity var(--time-base) ease; animation: pulseBadge 1.5s infinite alternate; }
                .auto-badge--visible { opacity: 1; }
                @keyframes pulseBadge { from { transform: scale(1); } to { transform: scale(1.05); } }

                /* Bottom Control Panel */
                .scanner-controls { position: absolute; bottom: 0; left: 0; right: 0; padding: var(--sp-3) var(--sp-4) calc(var(--sp-3) + env(safe-area-inset-bottom, 0px)) var(--sp-4); z-index: var(--z-overlay); display: flex; flex-direction: column; align-items: center; gap: var(--sp-3); border-radius: var(--radius-xl) var(--radius-xl) 0 0; background: rgba(25, 10, 0, 0.65); backdrop-filter: blur(32px) saturate(180%); -webkit-backdrop-filter: blur(32px) saturate(180%); border-top: 1px solid rgba(255,255,255,0.15); }
                
                .controls-status { color: #FFFFFF; font-size: var(--fs-sm); font-weight: 500; height: var(--sp-3); transition: color var(--time-fast) ease; }
                
                .controls-row { width: 100%; display: flex; align-items: center; justify-content: space-between; max-width: 400px; margin: 0 auto; }
                
                .side-btn { width: var(--sp-6); height: var(--sp-6); display: flex; align-items: center; justify-content: center; border-radius: var(--radius-full); background: rgba(255,255,255,0.15); color: #FFFFFF; transition: all var(--time-fast) ease; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); }
                .side-btn:active { transform: scale(0.9); background: rgba(255,255,255,0.3); }
                .side-btn--active { background: var(--clr-accent); border-color: var(--clr-accent); }
                
                .capture-btn { position: relative; width: var(--sp-10); height: var(--sp-10); border-radius: var(--radius-full); background: transparent; border: 4px solid #FFFFFF; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform var(--time-fast) ease; }
                .capture-btn::after { content: ''; width: calc(100% - 10px); height: calc(100% - 10px); background: #FFFFFF; border-radius: var(--radius-full); transition: transform var(--time-fast) ease; }
                .capture-btn:active { transform: scale(0.95); }
                .capture-btn:active::after { transform: scale(0.9); }
                .capture-btn:disabled { opacity: 0.5; pointer-events: none; }

                /* Error State */
                .camera-error { position: absolute; inset: 0; z-index: 5; background: var(--clr-bg); display: none; flex-direction: column; align-items: center; justify-content: center; padding: var(--sp-4); text-align: center; }
                .camera-error--visible { display: flex; }
                .camera-error svg { color: var(--clr-danger); margin-bottom: var(--sp-3); }
            </style>
            
            <div class="scanner-wrapper view-enter">
                
                <div class="scanner-top-bar">
                    <div id="scan-back-btn" class="scanner-back-btn" aria-label="Go Back">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </div>
                    <h1 class="scanner-title">Scan Medication</h1>
                    <div style="width: 24px;"></div> </div>

                <video id="scanner-video" class="scanner-video" playsinline muted autoplay></video>
                
                <div class="scanner-reticle-container">
                    <div class="scanner-vignette"></div>
                    <div id="scanner-box" class="scanner-box">
                        <div class="auto-badge" id="auto-badge">AUTO</div>
                        <div class="bracket bracket-tl"></div>
                        <div class="bracket bracket-tr"></div>
                        <div class="bracket bracket-bl"></div>
                        <div class="bracket bracket-br"></div>
                        <div class="scan-line"></div>
                        <div class="reticle-label">Align label within the frame</div>
                    </div>
                </div>

                <div class="scanner-controls">
                    <div id="controls-status" class="controls-status">Ready to scan</div>
                    
                    <div class="controls-row">
                        <button id="torch-btn" class="side-btn" aria-label="Toggle Flashlight">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                        </button>
                        
                        <button id="capture-btn" class="capture-btn" aria-label="Capture Image"></button>
                        
                        <button id="gallery-btn" class="side-btn" aria-label="Upload from Gallery">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            <input type="file" id="gallery-input" accept="image/*" style="display: none;">
                        </button>
                    </div>
                    
                    <button id="auto-scan-btn" class="btn btn-ghost" style="color: #FFFFFF; opacity: 0.8; height: 32px; font-size: 12px; margin-top: 8px;">Start Auto-Scan</button>
                </div>

                <div id="camera-error" class="camera-error">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.32V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2.32z"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                    <h2 class="typography-h3 text-hi mb-2">Camera Unavailable</h2>
                    <p id="error-message" class="typography-body text-muted mb-6">Permission denied or no device found.</p>
                    <button id="error-gallery-btn" class="btn btn-primary w-full max-w-md">Use Gallery Instead</button>
                </div>

            </div>
        `;
        container.innerHTML = scopedCSS;
    }

    /**
     * Attaches interactive event listeners to the generated interface components.
     * @private
     * @param {HTMLElement} container - The root viewport element.
     */
    static _bindEvents(container) {
        const backBtn = Utils.qs('#scan-back-btn', container);
        const captureBtn = Utils.qs('#capture-btn', container);
        const torchBtn = Utils.qs('#torch-btn', container);
        const autoScanBtn = Utils.qs('#auto-scan-btn', container);
        const galleryBtn = Utils.qs('#gallery-btn', container);
        const galleryInput = Utils.qs('#gallery-input', container);
        const errorGalleryBtn = Utils.qs('#error-gallery-btn', container);

        if (backBtn) {
            Utils.on(backBtn, 'click', () => {
                this.destroy();
                globalRouter.back();
            });
        }

        if (captureBtn) {
            Utils.on(captureBtn, 'click', () => {
                if (!this._isScanning) this._captureAndScan(container);
            });
        }

        if (torchBtn) {
            Utils.on(torchBtn, 'click', () => this._toggleTorch(container));
        }

        if (autoScanBtn) {
            Utils.on(autoScanBtn, 'click', () => this._toggleContinuousMode(container));
        }

        const handleGalleryClick = () => { if (galleryInput) galleryInput.click(); };
        if (galleryBtn) Utils.on(galleryBtn, 'click', handleGalleryClick);
        if (errorGalleryBtn) Utils.on(errorGalleryBtn, 'click', handleGalleryClick);

        if (galleryInput) {
            Utils.on(galleryInput, 'change', (e) => this._handleGalleryUpload(e, container));
        }
    }

    /**
     * Requests hardware access and pipes the video stream to the interface.
     * @private
     * @param {HTMLElement} container - The active viewport container.
     * @returns {Promise<void>}
     */
    static async _startCamera(container) {
        this._videoElement = Utils.qs('#scanner-video', container);
        const errorPanel = Utils.qs('#camera-error', container);
        const errorMsg = Utils.qs('#error-message', container);
        const reticleBox = Utils.qs('#scanner-box', container);

        if (!this._videoElement) return;

        try {
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            this._stream = await navigator.mediaDevices.getUserMedia(constraints);
            this._videoElement.srcObject = this._stream;
            
            // Await playback initialization to ensure dimensional accuracy
            await new Promise(resolve => {
                this._videoElement.onloadedmetadata = () => {
                    this._videoElement.play().then(resolve);
                };
            });

            // Initialize the offscreen computational canvas
            this._offscreenCanvas = document.createElement('canvas');
            this._canvasContext = this._offscreenCanvas.getContext('2d', { willReadFrequently: true });

            // Activate visual targeting reticle
            if (reticleBox) reticleBox.classList.add('scanner-box--active');

        } catch (cameraError) {
            console.error('[ScannerCamera] Media context violation:', cameraError);
            
            if (errorPanel && errorMsg) {
                if (cameraError.name === 'NotAllowedError' || cameraError.name === 'SecurityError') {
                    errorMsg.textContent = "Camera access denied. Please enable hardware access in your browser settings.";
                } else if (cameraError.name === 'NotFoundError' || cameraError.name === 'OverconstrainedError') {
                    errorMsg.textContent = "No supported camera hardware detected on this device.";
                } else {
                    errorMsg.textContent = "Failed to initialize camera context. Hardware may be in use.";
                }
                errorPanel.classList.add('camera-error--visible');
            }
        }
    }

    /**
     * Executes the hardware capture, dimensional cropping, and OCR analysis pipeline.
     * @private
     * @param {HTMLElement} container - The active viewport container.
     * @returns {Promise<void>}
     */
    static async _captureAndScan(container) {
        if (!this._videoElement || !this._canvasContext || this._isScanning) return;

        const statusText = Utils.qs('#controls-status', container);
        const captureBtn = Utils.qs('#capture-btn', container);
        const reticleBox = Utils.qs('#scanner-box', container);

        try {
            this._isScanning = true;
            
            // UI Feedback state
            if (statusText) {
                statusText.textContent = 'Processing structure...';
                statusText.style.color = '#FFFFFF';
            }
            if (captureBtn) captureBtn.disabled = true;
            if (reticleBox) reticleBox.classList.add('scanner-box--scanning');

            // Dimensional computation for central crop area
            const vWidth = this._videoElement.videoWidth;
            const vHeight = this._videoElement.videoHeight;
            
            const sWidth = vWidth * CROP_WIDTH_RATIO;
            const sHeight = vHeight * CROP_HEIGHT_RATIO;
            const sx = (vWidth - sWidth) / 2;
            const sy = (vHeight - sHeight) / 2;

            this._offscreenCanvas.width = sWidth;
            this._offscreenCanvas.height = sHeight;

            // Paint and extract binary frame
            this._canvasContext.drawImage(this._videoElement, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

            // Execute asynchronous AI Vision Pipeline
            const result = await visionPipeline.recognize(this._offscreenCanvas);
            
            if (!result || !result.text) {
                throw new Error('OCR Extractor returned empty buffer.');
            }

            // Execute context correction against known pharmacological database
            const nlpMatch = await nlpContext.correctOCRText(result.text);

            if (nlpMatch && nlpMatch.matched) {
                // Successful extraction and contextual alignment
                if (statusText) {
                    statusText.textContent = `Identified: ${nlpMatch.matched}`;
                    statusText.style.color = 'var(--clr-success)';
                }
                
                if (reticleBox) {
                    reticleBox.classList.remove('scanner-box--scanning');
                    reticleBox.classList.add('scanner-box--success');
                }

                // Halt operations and advance routing after visual confirmation
                setTimeout(() => {
                    this.destroy();
                    globalRouter.navigate('#/search', { query: nlpMatch.matched });
                }, SUCCESS_FLASH_DURATION_MS);

            } else {
                // OCR succeeded but Context Engine rejected mapping
                throw new Error('Unrecognized pharmacological signature.');
            }

        } catch (scanError) {
            console.warn('[ScannerCamera] Capture pipeline rejected extraction:', scanError);
            
            if (statusText) {
                statusText.textContent = "Couldn't identify. Try better lighting.";
                statusText.style.color = 'var(--clr-warn)';
            }
            
            if (reticleBox) reticleBox.classList.remove('scanner-box--scanning');

            // Reset operational limits
            setTimeout(() => {
                this._isScanning = false;
                if (captureBtn) captureBtn.disabled = false;
                if (statusText && this._isAutoScan) statusText.textContent = 'Auto-Scanning...';
                else if (statusText) statusText.textContent = 'Ready to scan';
            }, ERROR_RESET_DURATION_MS);
        }
    }

    /**
     * Toggles continuous background polling of the video feed.
     * @private
     * @param {HTMLElement} container - The active viewport container.
     */
    static _toggleContinuousMode(container) {
        const autoScanBtn = Utils.qs('#auto-scan-btn', container);
        const autoBadge = Utils.qs('#auto-badge', container);
        const statusText = Utils.qs('#controls-status', container);

        this._isAutoScan = !this._isAutoScan;

        if (this._isAutoScan) {
            if (autoScanBtn) autoScanBtn.textContent = 'Stop Auto-Scan';
            if (autoBadge) autoBadge.classList.add('auto-badge--visible');
            if (statusText) statusText.textContent = 'Auto-Scanning...';
            
            this._autoScanInterval = setInterval(() => {
                if (!this._isScanning) this._captureAndScan(container);
            }, AUTO_SCAN_INTERVAL_MS);

        } else {
            if (autoScanBtn) autoScanBtn.textContent = 'Start Auto-Scan';
            if (autoBadge) autoBadge.classList.remove('auto-badge--visible');
            if (statusText && !this._isScanning) statusText.textContent = 'Ready to scan';
            
            if (this._autoScanInterval) {
                clearInterval(this._autoScanInterval);
                this._autoScanInterval = null;
            }
        }
    }

    /**
     * Attempts to interface with hardware flashlight controls via MediaStream constraints.
     * @private
     * @param {HTMLElement} container - The active viewport container.
     */
    static _toggleTorch(container) {
        if (!this._stream) return;

        const track = this._stream.getVideoTracks()[0];
        if (!track) return;

        try {
            const capabilities = track.getCapabilities();
            if (!capabilities.torch) {
                Utils.showToast('Torch hardware unavailable on this lens.', 'warn');
                return;
            }

            this._isTorchOn = !this._isTorchOn;
            track.applyConstraints({
                advanced: [{ torch: this._isTorchOn }]
            });

            const torchBtn = Utils.qs('#torch-btn', container);
            if (torchBtn) {
                if (this._isTorchOn) torchBtn.classList.add('side-btn--active');
                else torchBtn.classList.remove('side-btn--active');
            }

        } catch (torchError) {
            console.warn('[ScannerCamera] Torch execution constraint failed:', torchError);
            Utils.showToast('Flashlight control rejected by hardware.', 'error');
        }
    }

    /**
     * Intercepts standard file input for static image ingestion.
     * Bypasses the live hardware stream.
     * @private
     * @param {Event} event - The FileList interaction event.
     * @param {HTMLElement} container - The active viewport container.
     * @returns {Promise<void>}
     */
    static async _handleGalleryUpload(event, container) {
        const file = event.target.files[0];
        if (!file) return;

        const statusText = Utils.qs('#controls-status', container);
        if (statusText) {
            statusText.textContent = 'Analyzing static image...';
            statusText.style.color = '#FFFFFF';
        }

        try {
            // Load file into an Image element to acquire dimensions
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = objectUrl;
            });

            if (!this._offscreenCanvas) {
                this._offscreenCanvas = document.createElement('canvas');
                this._canvasContext = this._offscreenCanvas.getContext('2d');
            }

            // For static images, analyze the entire uncropped image
            this._offscreenCanvas.width = img.width;
            this._offscreenCanvas.height = img.height;
            this._canvasContext.drawImage(img, 0, 0);

            URL.revokeObjectURL(objectUrl);

            const result = await visionPipeline.recognize(this._offscreenCanvas);
            
            if (!result || !result.text) throw new Error('OCR rejected static image array.');

            const nlpMatch = await nlpContext.correctOCRText(result.text);

            if (nlpMatch && nlpMatch.matched) {
                this.destroy();
                globalRouter.navigate('#/search', { query: nlpMatch.matched });
            } else {
                throw new Error('Unrecognized signature in uploaded image.');
            }

        } catch (uploadError) {
            console.error('[ScannerCamera] Static gallery ingestion failed:', uploadError);
            Utils.showToast("Couldn't read medication from image.", 'error');
            if (statusText) {
                statusText.textContent = 'Ready to scan';
                statusText.style.color = '#FFFFFF';
            }
        }
    }

    /**
     * Hard-stops system loops, releases graphic hardware memory structures, and drops bounds trackers.
     * Standard teardown closure avoiding memory leak crashes in single page application routing layers.
     * @returns {void}
     */
    static destroy() {
        console.log('[ScannerCamera] Executing hardware context teardown.');

        if (this._autoScanInterval) {
            clearInterval(this._autoScanInterval);
            this._autoScanInterval = null;
        }

        if (this._stream) {
            this._stream.getTracks().forEach(track => {
                track.stop();
            });
            this._stream = null;
        }

        if (this._videoElement) {
            this._videoElement.srcObject = null;
            this._videoElement = null;
        }

        // Release dimensional canvas blocks
        this._offscreenCanvas = null;
        this._canvasContext = null;

        this._isScanning = false;
        this._isAutoScan = false;
        this._isTorchOn = false;
    }
}