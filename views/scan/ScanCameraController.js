/**
 * @fileoverview Scan Camera Controller
 * Manages video stream connections, front/back camera toggling, torch controls,
 * and high-resolution gallery fallback image pipelines.
 */

export default class ScanCameraController {
  /**
   * @param {Object} view - The main ScanView context
   */
  constructor(view) {
    this.view = view;
  }

  /**
   * Starts the camera stream.
   * @returns {Promise<void>}
   */
  async startCamera() {
    try {
      if (this.view.stream) {
        this.view.stream.getTracks().forEach(t => t.stop());
      }
      this.view.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: this.view.facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      
      const tracks = this.view.stream.getVideoTracks();
      if (tracks.length > 0) {
        this.view.videoTrack = tracks[0];
      }
      
      if (this.view._video) {
        this.view._video.srcObject = this.view.stream;
      }
    } catch (err) {
      console.warn('Camera connection blocked:', err);
      this.view._statusText.textContent = 'CAMERA BLOCKED';
      this.view._statusText.style.color = '#ef4444';
      if (this.view._camErrorOverlay) {
        this.view._camErrorOverlay.style.display = 'flex';
      }
    }
  }

  /**
   * Switches front/back camera options.
   * @returns {Promise<void>}
   */
  async switchCamera() {
    this.view.facingMode = this.view.facingMode === 'environment' ? 'user' : 'environment';
    this.view.torchOn = false;
    if (this.view._torchBtn) {
      this.view._torchBtn.style.color = 'rgba(255,184,140,0.45)';
      this.view._torchBtn.style.background = 'rgba(26,10,18,0.8)';
    }
    await this.startCamera();
  }

  /**
   * Toggles the hardware flash/torch if supported.
   * @returns {Promise<void>}
   */
  async toggleTorch() {
    if (!this.view.videoTrack) return;
    const capabilities = this.view.videoTrack.getCapabilities?.();
    if (capabilities?.torch) {
      this.view.torchOn = !this.view.torchOn;
      await this.view.videoTrack.applyConstraints({ advanced: [{ torch: this.view.torchOn }] });
      if (this.view._torchBtn) {
        this.view._torchBtn.style.color = this.view.torchOn ? '#0a0407' : 'rgba(255,184,140,0.45)';
        this.view._torchBtn.style.background = this.view.torchOn ? '#ffb88c' : 'rgba(26,10,18,0.8)';
      }
    }
  }

  /**
   * Handles user gallery photo upload.
   * @param {Event} e
   * @returns {void}
   */
  handleGalleryUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = async () => {
      if (this.view._video) this.view._video.pause();
      this.view.stateController.setState('VERIFYING');

      this.showProcessingOverlay('Importing Image…', 'Analyzing high-res photo');

      if (this.view._captureCanvas) {
        const MAX_DIM = 1280;
        let w = img.width;
        let h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.floor(w * ratio);
          h = Math.floor(h * ratio);
        }
        this.view._captureCanvas.width = w;
        this.view._captureCanvas.height = h;
        const ctx = this.view._captureCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
      }

      await this.runGalleryPipeline();
    };
    img.src = URL.createObjectURL(file);
  }

  /**
   * Runs the static OCR pipeline on the uploaded gallery canvas image.
   * @returns {Promise<void>}
   */
  async runGalleryPipeline() {
    try {
      this.appendLog('Applying Adaptive Binarization Matrix...');
      const matchResult = await this.view.pipeline.processFrame(this.view._captureCanvas, 1.0, true);
      
      await new Promise(r => setTimeout(r, 600)); // UX buffer
      this.hideProcessingOverlay();

      if (matchResult && matchResult.bestMatch) {
        this.view.currentResults = matchResult;
        this.view.confidenceTracker = 100;
        this.view.overlay.updateConfidenceUI();
        this.view.stateController.setState('RESULT');

        if (this.view._terminalLog && matchResult.diagnosticReport) {
          this.view._terminalLog.innerHTML = '';
          this.appendLog('Gallery Match Successful!');
          this.appendLog(`Matched Candidate: ${matchResult.bestMatch.name}`);
          this.appendLog(`Match Score: ${matchResult.confidence}%`);
        }
        return;
      }

      this.view.stateController.setState('IDLE');
      if (this.view._video) this.view._video.play();
      this.view._statusText.textContent = 'NO MATCH FOUND';
      this.view._statusText.style.color = '#ef4444';

      this.view.pipeline.recordFailure(this.view.pipeline.activeSessionId, 'GALLERY_NO_MATCH');

      setTimeout(() => {
        this.view.stateController.setState('HUNTING');
      }, 3000);
    } catch (err) {
      console.error(err);
      this.hideProcessingOverlay();
      this.view.stateController.setState('IDLE');
      if (this.view._video) this.view._video.play();
    }
  }

  showProcessingOverlay(title, logMsg) {
    if (this.view._procOverlay) this.view._procOverlay.style.display = 'flex';
    if (this.view._phaseLabel) this.view._phaseLabel.textContent = title;
    if (this.view._terminalLog) this.view._terminalLog.innerHTML = '';
    this.appendLog(logMsg);
  }

  hideProcessingOverlay() {
    if (this.view._procOverlay) this.view._procOverlay.style.display = 'none';
  }

  appendLog(msg) {
    this.view.overlay.appendLog(msg);
  }
}
