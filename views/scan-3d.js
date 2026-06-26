/**
 * @fileoverview Scan 3D Generation View
 * The "Hero" screen that takes the captured 2D image, inflates it to a 3D model,
 * and runs OCR in the background.
 */
import { StripDepthEstimator } from '../services/reconstruction/StripDepthEstimator.js';
import { StripMeshBuilder } from '../services/reconstruction/StripMeshBuilder.js';
import { StripSceneOrchestrator } from '../services/reconstruction/StripSceneOrchestrator.js';
import { StripFlatProjector } from '../services/reconstruction/StripFlatProjector.js';
import { ObjectSegmenter } from '../services/vision/ObjectSegmenter.js';
import VisionPipeline from '../services/VisionPipeline.js';
import CanvasEditor from '../services/CanvasEditor.js';

export default class Scan3DView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'scan-3d-root';
    this.container.style.cssText = `
      position: fixed; inset: 0; width: 100%; height: 100%;
      background: #000; overflow: hidden; display: flex;
      flex-direction: column; font-family: 'Inter', sans-serif; z-index: 10;
    `;
    this.pipeline = new VisionPipeline();
  }

  async render() {
    this._buildDOM();
    this._processWorkflow();
    return this.container;
  }

  _buildDOM() {
    // Read the image from sessionStorage
    const dataUrl = sessionStorage.getItem('medcare_scanned_image');
    
    this.container.innerHTML = `
      <style>
        .scan-3d-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .glass-card { 
          background: rgba(10, 15, 25, 0.5); 
          backdrop-filter: blur(24px); 
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1); 
          border-radius: 24px;
        }
        .bg-blur {
          position: absolute; inset: -10%; width: 120%; height: 120%;
          object-fit: cover; filter: blur(40px) brightness(0.4); opacity: 0.8;
          z-index: 1; pointer-events: none;
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 10px rgba(16,185,129,0.2); }
          50% { box-shadow: 0 0 30px rgba(16,185,129,0.5); }
          100% { box-shadow: 0 0 10px rgba(16,185,129,0.2); }
        }
      </style>

      <!-- Raw Frame Canvas -->
      <canvas id="s3d-raw-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1;"></canvas>

      <!-- Laser Line (Hidden initially) -->
      <div id="laser-line" style="display: none;"></div>

      <!-- 3D Canvas Container -->
      <div id="s3d-viewport" style="position: absolute; inset: 0; z-index: 2;"></div>

      <!-- Processing Overlay Panel -->
      <div class="glass-card" style="position: absolute; bottom: max(env(safe-area-inset-bottom), 40px); left: 24px; right: 24px; padding: 24px; z-index: 50; display: flex; align-items: center; gap: 20px; animation: pulseGlow 3s infinite;">
        <!-- Spinner -->
        <div style="position: relative; width: 40px; height: 40px;">
          <div style="position: absolute; inset: 0; border: 3px solid transparent; border-top-color: #10b981; border-radius: 50%; animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;"></div>
          <svg style="position:absolute; inset:0; margin:auto;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        </div>
        <div style="display: flex; flex-direction: column;">
          <div id="s3d-phase-label" style="font-weight: 700; color: white; font-size: 16px; letter-spacing: 0.05em;">Constructing 3D Mesh...</div>
          <div style="font-weight: 500; color: #94a3b8; font-size: 12px; margin-top: 4px;">AI depth estimation active</div>
        </div>
      </div>
    `;
  }

  async _processWorkflow() {
    const dataUrl = sessionStorage.getItem('medcare_scanned_image');
    if (!dataUrl) {
      window.location.hash = '#/scan';
      return;
    }

    const yieldToMain = () => new Promise(r => setTimeout(r, 0));

    try {
      // 1. Fetch blob from Data URL
      const res = await fetch(dataUrl);
      const originalBlob = await res.blob();
      sessionStorage.removeItem('medcare_scanned_image'); // Prevent re-processing on back navigation
      
      const vp3d = this.container.querySelector('#s3d-viewport');
      const phaseLabel = this.container.querySelector('#s3d-phase-label');
      const rawCanvas = this.container.querySelector('#s3d-raw-canvas');
      const rawCtx = rawCanvas.getContext('2d');

      // Draw initial raw frame
      const initialImg = new Image();
      await new Promise(res => { initialImg.onload = res; initialImg.src = dataUrl; });
      rawCanvas.width = initialImg.naturalWidth;
      rawCanvas.height = initialImg.naturalHeight;
      rawCtx.drawImage(initialImg, 0, 0);

      const updatePhaseLabel = async (primary, secondary) => {
        if (!phaseLabel) return;
        phaseLabel.parentElement.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        phaseLabel.parentElement.style.opacity = '0';
        phaseLabel.parentElement.style.transform = 'translateY(4px)';
        await new Promise(r => setTimeout(r, 200));
        phaseLabel.textContent = primary;
        if (secondary && phaseLabel.nextElementSibling) {
            phaseLabel.nextElementSibling.textContent = secondary;
        }
        phaseLabel.parentElement.style.opacity = '1';
        phaseLabel.parentElement.style.transform = 'translateY(0)';
        await new Promise(r => setTimeout(r, 200));
      };

      await updatePhaseLabel('Isolating Object...', 'Object-Centric Segmentation');
      await yieldToMain();

      const updateProgress = (progressData) => {
          if (!phaseLabel) return;
          if (progressData.status === 'initiate') {
              phaseLabel.nextElementSibling.textContent = 'Downloading Vision Engine...';
          } else if (progressData.status === 'progress') {
              const progress = Math.round(progressData.progress);
              phaseLabel.nextElementSibling.textContent = `Downloading Vision Engine... ${progress}%`;
          } else if (progressData.status === 'done') {
              phaseLabel.nextElementSibling.textContent = 'Vision Engine Ready';
          }
      };

      await yieldToMain();
      // 2. Extract Object Bounding Box
      const { croppedBlob, bbox } = await ObjectSegmenter.extract(originalBlob, updateProgress);
      
      // Live Segmentation Reveal: Redraw canvas with transparent object
      const transparentImg = new Image();
      await new Promise(res => { 
          transparentImg.onload = res; 
          transparentImg.src = URL.createObjectURL(croppedBlob); 
      });
      rawCtx.clearRect(0, 0, rawCanvas.width, rawCanvas.height);
      rawCtx.drawImage(transparentImg, 0, 0, rawCanvas.width, rawCanvas.height);

      // Activate Laser and update text
      const laserLine = this.container.querySelector('#laser-line');
      if (laserLine) {
          laserLine.style.display = 'block';
          laserLine.className = 'scanner-laser';
      }

      await updatePhaseLabel('Extracting Medical Data...', 'AI depth estimation active');
      await yieldToMain();

      // 3. Initialize 3D Depth Estimator (On the Cropped Object)
      const isGalleryUpload = sessionStorage.getItem('medcare_is_gallery_upload') === 'true';
      let depthData = null;
      let projectionImg = new Image();

      await new Promise((resolve, reject) => {
          projectionImg.onload = resolve;
          projectionImg.onerror = reject;
          projectionImg.src = URL.createObjectURL(croppedBlob); // Use cropped blob as fallback
      });

      if (!isGalleryUpload) {
          const estimator = new StripDepthEstimator();
          await estimator.init();
          const imgBitmap = await createImageBitmap(croppedBlob);
          depthData = await estimator.estimateDepth(imgBitmap);
      } else {
          console.log("VISION: Gallery Upload detected. Skipping 3D Depth Engine.");
      }

      if (depthData) {
        console.log("VISION: ✓ Depth Engine initialized. 3D Topology mapped.");
        // 3. Build Mesh & Render
        const mesh = await StripMeshBuilder.buildMesh(croppedBlob, depthData.depthMap, depthData.width, depthData.height, 16);
        this.orchestrator = new StripSceneOrchestrator(vp3d);
        this.orchestrator.setMesh(mesh);
        this.orchestrator.startAutoRotate();

        await updatePhaseLabel('Extracting Label Details...', 'Scanning 3D topology');
        await yieldToMain();

        // 4. Project Orthographic Views
        const projector = new StripFlatProjector(this.orchestrator.renderer, this.orchestrator.scene, mesh);
        const projections = projector.projectOrthographicViews();
        
        if (projections && projections.center) {
          let newImg = new Image();
          await new Promise((resolve, reject) => {
              newImg.onload = resolve;
              newImg.onerror = reject;
              newImg.src = projections.center;
          });
          projectionImg = newImg;
        }
      } else {
        console.warn("VISION: ✗ Depth Engine failed. System Operating in 2D Mode.");
      }

      // 5. OCR Process
      await yieldToMain();
      
      await updatePhaseLabel('Refining Cutout...', 'Manual touch-up active');
      const refinedImage = await new Promise((resolve) => {
          const modal = document.createElement('div');
          modal.style.position = 'absolute';
          modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%';
          modal.style.zIndex = '9999';
          modal.style.background = 'rgba(0,0,0,0.9)';
          document.body.appendChild(modal);

          new CanvasEditor(modal, dataUrl, projectionImg.src, (finalEditedBase64) => {
              document.body.removeChild(modal);
              const img = new Image();
              img.onload = () => resolve(img);
              img.src = finalEditedBase64;
          });
      });

      await updatePhaseLabel('Analyzing Text...', 'Querying Intelligence Mesh');
      const matchResult = await this.pipeline.processFrame(refinedImage, 1.0, true);
      
      if (matchResult && matchResult.bestMatch) {
          // Success! Save results and navigate to add-medication
          sessionStorage.setItem('medcheck_pending_scan', JSON.stringify({
              name: matchResult.bestMatch.name || matchResult.bestMatch.brandName || matchResult.bestMatch.genericName,
              dosage: matchResult.bestMatch.dosage,
              form: matchResult.bestMatch.form,
              totalQuantity: matchResult.bestMatch.totalQuantity || matchResult.quantity,
              isAsNeeded: matchResult.bestMatch.isAsNeeded,
              confidence: depthData ? matchResult.confidence : Math.max(0, matchResult.confidence - 20), // Penalize if 3D failed
              depthEngineFailed: !depthData, // Trust Layer telemetry
              schedule: matchResult.bestMatch.schedule,
              brandName: matchResult.bestMatch.brandName,
              genericName: matchResult.bestMatch.genericName,
              manufacturer: matchResult.bestMatch.manufacturer,
              therapeuticCategory: matchResult.bestMatch.therapeuticCategory,
              alternativeBrands: matchResult.bestMatch.alternativeBrands ? matchResult.bestMatch.alternativeBrands.join(', ') : '',
              explainabilityDetails: matchResult.explainabilityDetails,
              diagnosticReport: matchResult.diagnosticReport
          }));

          await updatePhaseLabel('Match Found!', 'Redirecting...');
          setTimeout(() => { window.location.hash = '#/add-medication'; }, 800);
      } else {
          // Failed to find medicine
          await updatePhaseLabel('Scan Failed', 'Try Again');
          setTimeout(() => { window.location.hash = '#/scan'; }, 1500);
      }
    } catch (e) {
      console.error('[Scan3DView] Pipeline failed:', e);
      const errLabel = this.container.querySelector('#s3d-phase-label');
      if (errLabel) {
        errLabel.textContent = 'Scan Failed';
        if (errLabel.nextElementSibling) {
            errLabel.nextElementSibling.textContent = 'Try Again';
        }
      }
      setTimeout(() => { window.location.hash = '#/scan'; }, 2000);
    }
  }

  destroy() {
    if (this.orchestrator) this.orchestrator.dispose();
  }
}
