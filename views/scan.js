/**
 * @fileoverview Smart Scanner & NLP Extractor
 * Features: Google Lens-style focal UI, Front/Back Camera Toggle, 
 * Levenshtein Distance Fuzzy Matching, and Regex Dosage Extraction.
 */

export default class ScanView {
  constructor() {
    this.isProcessing = false;
    this.stream = null;
    this.facingMode = 'environment'; // Default to back camera
    this.container = document.createElement('div');
    this.container.className = 'container h-full flex flex-col !pt-0 -mt-[max(4rem,env(safe-area-inset-top))]';
    
    // Fallback dictionary for fuzzy matching (Replace with your downloaded FDA JSON later)
    this.drugDictionary = ['Paracetamol', 'Ibuprofen', 'Atorvastatin', 'Amoxicillin', 'Metformin', 'Aspirin', 'Cetirizine'];
  }

  async render() {
    this.updateUI();
    return this.container;
  }

  updateUI() {
    this.container.innerHTML = `
      <div class="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-4 py-4 bg-[#0a0407]/90 backdrop-blur-md border-b border-[#7f2f5d]/30 mb-6">
        <button onclick="window.history.back()" class="flex items-center gap-2 text-[#ffb88c] hover:brightness-125 transition-all">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span class="text-sm font-bold uppercase tracking-widest">Back</span>
        </button>
        <h2 class="text-lg font-bold text-white tracking-tight">Vision Scanner</h2>
        
        <button id="switch-cam-btn" class="w-10 h-10 bg-[#1a0a12] border border-[#ffb88c]/40 rounded-full flex items-center justify-center text-[#ffb88c] active:scale-90 transition-all shadow-lg">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
        </button>
      </div>

      <main class="flex-1 w-full px-6 pt-4 pb-28 flex flex-col items-center max-w-md mx-auto relative">
        <p class="text-xs font-mono text-gray-400 text-center mb-6">Center the largest text in the target area.</p>

        <div class="relative w-full aspect-[3/4] bg-black border-2 border-[#7f2f5d]/50 rounded-[2rem] overflow-hidden shadow-[0_0_40px_rgba(127,47,93,0.5)] mb-8">
          <video id="video-preview" class="absolute inset-0 w-full h-full object-cover" autoplay playsinline muted></video>
          <canvas id="camera-canvas" class="hidden"></canvas>
          
          <div class="absolute inset-0 pointer-events-none" style="box-shadow: inset 0 0 100px 40px rgba(0,0,0,0.8);"></div>

          <div class="absolute inset-0 pointer-events-none p-8 flex items-center justify-center">
            <div class="w-full h-48 border border-white/20 relative rounded-xl overflow-hidden shadow-[0_0_15px_rgba(255,184,140,0.2)]">
              <div class="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#ffb88c] rounded-tl-xl animate-pulse"></div>
              <div class="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#ffb88c] rounded-tr-xl animate-pulse"></div>
              <div class="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#ffb88c] rounded-bl-xl animate-pulse"></div>
              <div class="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#ffb88c] rounded-br-xl animate-pulse"></div>
              
              <div class="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#ffb88c] to-transparent shadow-[0_0_8px_#ffb88c] animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>
          </div>

          ${this.isProcessing ? `
            <div class="absolute inset-0 z-20 bg-[#0a0407]/95 backdrop-blur-lg flex flex-col items-center justify-center">
              <div class="w-16 h-16 mb-6 relative">
                <div class="absolute inset-0 border-4 border-[#ffd9b5]/20 rounded-full"></div>
                <div class="absolute inset-0 border-4 border-[#ffb88c] rounded-full border-t-transparent animate-spin"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <svg class="w-6 h-6 text-[#ffb88c]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
                </div>
              </div>
              <h3 class="text-base font-bold text-white mb-2">Analyzing Label...</h3>
              <p class="text-[10px] font-mono text-[#ffb88c] uppercase tracking-widest text-center px-6">Cross-referencing datasets</p>
            </div>
          ` : ''}
        </div>

        <button id="capture-btn" class="w-20 h-20 rounded-full border-4 border-[#ffb88c]/50 bg-[#7f2f5d] flex items-center justify-center shadow-[0_0_30px_rgba(127,47,93,0.6)] active:scale-90 transition-all focus:outline-none mb-8 relative group">
           <div class="w-16 h-16 rounded-full bg-gradient-to-br from-[#ffb88c] to-[#4a1532] border-2 border-white/20 group-hover:scale-95 transition-transform"></div>
        </button>

        <style>
          @keyframes scan {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
        </style>
      </main>
    `;

    this.attachListeners();
    if (!this.isProcessing) this._startCamera();
  }

  async _startCamera() {
    try {
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
      }
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode },
        audio: false
      });
      const video = this.container.querySelector('#video-preview');
      if (video) video.srcObject = this.stream;
    } catch (err) {
      console.warn('[Scanner] Camera access denied:', err);
      this._showToast('Camera access blocked.', 'error');
    }
  }

  attachListeners() {
    this.container.querySelector('#capture-btn')?.addEventListener('click', () => this._processFrame());
    
    this.container.querySelector('#switch-cam-btn')?.addEventListener('click', () => {
      this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
      this._startCamera();
    });
  }

  async _processFrame() {
    if (typeof Tesseract === 'undefined') {
      this._showToast('Vision Engine loading, please wait.', 'warn');
      return;
    }

    const video = this.container.querySelector('#video-preview');
    const canvas = this.container.querySelector('#camera-canvas');
    if (!video || !canvas) return;

    // Freeze frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Simple Image Preprocessing (High contrast to help Tesseract)
    ctx.filter = 'contrast(1.4) grayscale(1)';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    this.isProcessing = true;
    this.updateUI();

    try {
      const result = await Tesseract.recognize(canvas, 'eng');
      const rawText = result.data.text;
      
      // 1. Smart Regex for Dosage Extraction (Matches formats like "500 mg", "1.5ml")
      let extractedDosage = '';
      let extractedUnit = 'mg';
      const dosageMatch = rawText.match(/(\d+(?:\.\d+)?)\s*(mg|ml|mcg|g|iu)\b/i);
      if (dosageMatch) {
        extractedDosage = dosageMatch[1];
        extractedUnit = dosageMatch[2].toLowerCase();
      }

      // 2. Fuzzy Matching to find the closest real drug name
      const bestMatch = this._findNearestDrug(rawText);

      if (bestMatch.name && bestMatch.score > 0.4) {
        this._showToast(`Found: ${bestMatch.name} ${extractedDosage}${extractedUnit}`, 'success');
        setTimeout(() => {
          window.location.hash = `#/add?name=${encodeURIComponent(bestMatch.name)}&dosage=${extractedDosage}&unit=${extractedUnit}`;
        }, 1200);
      } else {
        this._showToast('No accurate drug name recognized. Try again.', 'error');
        setTimeout(() => {
          this.isProcessing = false;
          this.updateUI();
        }, 2000);
      }
    } catch (err) {
      console.error('[Scanner] OCR failed:', err);
      this._showToast('Processing crashed.', 'error');
      this.isProcessing = false;
      this.updateUI();
    }
  }

  // --- NLP Fuzzy Matching Engine (Levenshtein based) ---
  _findNearestDrug(scannedText) {
    const words = scannedText.replace(/[^a-zA-Z]/g, ' ').split(/\s+/).filter(w => w.length > 3);
    let bestMatch = { name: null, score: 0 };

    for (const scanWord of words) {
      const target = scanWord.toLowerCase();
      
      for (const dictWord of this.drugDictionary) {
        const dict = dictWord.toLowerCase();
        const dist = this._levenshtein(target, dict);
        
        // Calculate similarity percentage
        const maxLength = Math.max(target.length, dict.length);
        const similarity = (maxLength - dist) / maxLength;

        if (similarity > bestMatch.score) {
          bestMatch = { name: dictWord, score: similarity };
        }
      }
    }
    return bestMatch;
  }

  _levenshtein(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    return matrix[a.length][b.length];
  }

  _showToast(msg, type = 'success') {
    const bg = type === 'error' ? 'bg-[#1a0a12] border-red-500/50 text-red-400' 
             : type === 'warn' ? 'bg-[#1a0a12] border-amber-500/50 text-amber-400'
             : 'bg-[#1a0a12] border-green-500/50 text-green-400';
             
    const t = document.createElement('div');
    t.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-mono uppercase tracking-widest z-[99999] shadow-2xl transition-all border ${bg}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  destroy() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
  }
}