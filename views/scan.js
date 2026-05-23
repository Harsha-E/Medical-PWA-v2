/**
 * @fileoverview Scanner & OCR View
 * Captures image, extracts text, and runs it through the TensorFlow NLP engine.
 */

import { nlpContext } from '../services/NLPContext.js';

export default class ScanView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'container';
    this.stream = null;
  }

  async render() {
    this.container.innerHTML = `
      <div class="container !pt-0 !mt-0 h-full flex flex-col">
        <div class="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-4 py-4 bg-[#0a0407]/90 backdrop-blur-md border-b border-[#7f2f5d]/30 mb-6">
          <button onclick="window.history.back()" class="flex items-center gap-2 text-[#ffb88c] hover:brightness-125 transition-all cursor-pointer">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span class="text-sm font-bold uppercase tracking-widest">Back</span>
          </button>
          <h2 class="text-lg font-bold text-white tracking-tight">Scan Prescription</h2>
          <div class="w-16"></div>
        </div>

        <main class="flex-1 w-full px-6 pt-4 pb-28 flex flex-col items-center max-w-md mx-auto relative">
          <p class="text-xs font-mono text-[#ffd9b5]/70 text-center mb-6 max-w-[280px]">Position the medication label clearly in the frame. The AI will extract the drug name.</p>
          
          <div class="relative w-full aspect-[3/4] bg-[#0a0407] border-2 border-[#7f2f5d]/50 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(127,47,93,0.3)] mb-8">
            <video id="video-preview" class="absolute inset-0 w-full h-full object-cover" autoplay playsinline muted></video>
            <canvas id="camera-canvas" class="hidden"></canvas>
            
            <div class="absolute inset-0 pointer-events-none p-6">
              <div class="w-full h-full border border-dashed border-[#ffb88c]/30 relative rounded-2xl">
                <div class="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#ffb88c]"></div>
                <div class="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#ffb88c]"></div>
                <div class="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#ffb88c]"></div>
                <div class="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#ffb88c]"></div>
              </div>
            </div>

            <div id="processing-overlay" class="absolute inset-0 z-20 bg-[#0a0407]/90 backdrop-blur-md flex-col items-center justify-center hidden">
              <div class="w-12 h-12 mb-4 relative">
                <div class="absolute inset-0 border-t-2 border-[#ffd9b5] rounded-full animate-spin"></div>
                <div class="absolute inset-2 border-b-2 border-[#7f2f5d] rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
              </div>
              <p id="processing-text" class="text-xs font-mono text-[#ffb88c] uppercase tracking-widest text-center px-4">Initializing Vision...</p>
            </div>
          </div>

          <button id="capture-btn" class="w-16 h-16 rounded-full border-4 border-[#ffb88c] bg-gradient-to-br from-[#7f2f5d] to-[#4a1532] shadow-[0_0_20px_rgba(127,47,93,0.4)] active:scale-90 transition-all focus:outline-none mb-6"></button>
        </main>
      </div>
    `;

    setTimeout(() => {
      this._startCamera();
      this._attachListeners();
    }, 100);

    return this.container;
  }

  async _startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      const video = this.container.querySelector('#video-preview');
      if (video) video.srcObject = this.stream;
    } catch (err) {
      console.warn('[Scanner] Camera access denied or unavailable.', err);
      // Fallback UI could go here (e.g., file upload input)
    }
  }

  _stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  _attachListeners() {
    // Capture button
    this.container.querySelector('#capture-btn')?.addEventListener('click', () => {
      this._processFrame();
    });
  }

  async _processFrame() {
    if (typeof Tesseract === 'undefined') {
      alert("Vision Engine (Tesseract) is still loading. Please wait a moment.");
      return;
    }

    const video = this.container.querySelector('#video-preview');
    const canvas = this.container.querySelector('#camera-canvas');
    const overlay = this.container.querySelector('#processing-overlay');
    const overlayText = this.container.querySelector('#processing-text');
    
    if (!video || !canvas || !overlay) return;

    // Freeze frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    this._stopCamera(); // Pause the feed

    // Show processing UI
    overlay.style.display = 'flex';
    
    try {
      // 1. Run Optical Character Recognition
      overlayText.textContent = "Extracting Text...";
      const result = await Tesseract.recognize(canvas, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            overlayText.textContent = `Scanning: ${Math.round(m.progress * 100)}%`;
          }
        }
      });
      
      const rawText = result.data.text;
      
      // 2. Feed text into our TensorFlow NLP Brain
      overlayText.textContent = "Analyzing Context...";
      const analysis = nlpContext.correctOCRText(rawText);

      // 3. Evaluate results and route to Add Medication
      if (analysis.matched && analysis.confidence > 0.35) {
        // High confidence match found in drug index
        this._showToast(`Identified: ${analysis.matched}`, 'success');
        setTimeout(() => {
          window.location.hash = `#/add?name=${encodeURIComponent(analysis.matched)}`;
        }, 1000);

      } else if (analysis.candidate) {
        // Found text, but it didn't perfectly match our medical dictionary
        this._showToast(`Found: "${analysis.candidate}". Please verify.`, 'warn');
        setTimeout(() => {
          window.location.hash = `#/add?name=${encodeURIComponent(analysis.candidate)}`;
        }, 1500);

      } else {
        // Failed to find anything readable
        this._showToast('No readable medication name detected.', 'error');
        setTimeout(() => {
          overlay.style.display = 'none';
          this._startCamera(); // Restart camera to try again
        }, 2000);
      }

    } catch (err) {
      console.error('[Scanner] Processing failed:', err);
      overlayText.textContent = "Processing Failed.";
      setTimeout(() => {
        overlay.style.display = 'none';
        this._startCamera();
      }, 2000);
    }
  }

  _showToast(msg, type = 'success') {
    // Modern dark-theme overlays replacing high-contrast white boxes
    const bg = type === 'error' ? 'bg-[#0a0407] border-red-500/50 text-red-400' 
             : type === 'warn' ? 'bg-[#0a0407] border-amber-500/50 text-amber-400'
             : 'bg-[#0a0407] border-green-500/50 text-green-400';
             
    const t = document.createElement('div');
    t.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-mono uppercase tracking-widest z-[99999] shadow-xl transition-all border ${bg}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  destroy() {
    this._stopCamera(); // Ensure camera turns off when navigating away
  }
}