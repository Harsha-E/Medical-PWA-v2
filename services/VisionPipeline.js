    /**
     * @fileoverview VisionPipeline — Optimized for Temporal Memory & High-Accuracy Extraction
     */
    import { INDIAN_DRUG_DATASET, fuzzySearchDrugs } from '../data/indian-drug-dataset.js';

    const PREPROCESS_WORKER_CODE = `
    function bradleyRoth(data, width, height) {
      const S = Math.floor(width / 8);
      const s2 = Math.floor(S / 2);
      const t = 0.15;
      const integral = new Uint32Array(width * height);

      for (let i = 0; i < width; i++) {
        let sum = 0;
        for (let j = 0; j < height; j++) {
          const idx = (j * width + i) * 4;
          const gray = (data[idx] * 299 + data[idx+1] * 587 + data[idx+2] * 114) / 1000;
          sum += gray;
          integral[j * width + i] = (i === 0) ? sum : integral[j * width + i - 1] + sum;
        }
      }

      for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
          const x1 = Math.max(i - s2, 0);
          const x2 = Math.min(i + s2, width - 1);
          const y1 = Math.max(j - s2, 0);
          const y2 = Math.min(j + s2, height - 1);
          const count = (x2 - x1 + 1) * (y2 - y1 + 1);
          
          const sum = integral[y2 * width + x2] 
                    - (x1 > 0 ? integral[y2 * width + x1 - 1] : 0) 
                    - (y1 > 0 ? integral[(y1 - 1) * width + x2] : 0) 
                    + (x1 > 0 && y1 > 0 ? integral[(y1 - 1) * width + x1 - 1] : 0);

          const idx = (j * width + i) * 4;
          const gray = (data[idx] * 299 + data[idx+1] * 587 + data[idx+2] * 114) / 1000;

          if (gray * count < sum * (1.0 - t)) {
            data[idx] = data[idx+1] = data[idx+2] = 0;
          } else {
            data[idx] = data[idx+1] = data[idx+2] = 255;
          }
          data[idx+3] = 255;
        }
      }
      return data;
    }

    onmessage = (e) => {
      const { imageData, width, height } = e.data;
      bradleyRoth(imageData.data, width, height);
      postMessage({ imageData }, [imageData.data.buffer]);
    };
    `;

    export default class VisionPipeline {
    constructor() {
        this.isReady = false;
        this.isProcessing = false;
        this.temporalBuffer = [];
        this.worker = null;
        this.tessWorker = null;
        this.canvas = null;
        this.ctx = null;

        this._initWorker();
        this._initTesseract();
    }

    async _initWorker() {
        const blob = new Blob([PREPROCESS_WORKER_CODE], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
    }

    async _initTesseract() {
        if (typeof Tesseract === 'undefined') return;
        this.tessWorker = await Tesseract.createWorker('eng');
        this.isReady = true;
    }

    _preprocessInWorker(imageData, width, height) {
        return new Promise((resolve) => {
            this.worker.onmessage = (e) => resolve(e.data.imageData);
            this.worker.postMessage({ imageData, width, height }, [imageData.data.buffer]);
        });
    }

    async processFrame(sourceElement, scale = 0.5, isSingleFrame = false) {
        if (this.isProcessing || !this.isReady) return null;
        this.isProcessing = true;

        try {
            const width = Math.floor((sourceElement.videoWidth || sourceElement.width) * scale);
            const height = Math.floor((sourceElement.videoHeight || sourceElement.height) * scale);

            if (!width || !height) {
                this.isProcessing = false;
                return null;
            }

            if (!this.canvas || this.canvas.width !== width || this.canvas.height !== height) {
                if (typeof OffscreenCanvas !== 'undefined') {
                    this.canvas = new OffscreenCanvas(width, height);
                } else {
                    this.canvas = document.createElement('canvas');
                    this.canvas.width = width;
                    this.canvas.height = height;
                }
                this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
            }

            this.ctx.drawImage(sourceElement, 0, 0, width, height);
            const imgData = this.ctx.getImageData(0, 0, width, height);

            const processedImageData = await this._preprocessInWorker(imgData, width, height);
            this.ctx.putImageData(processedImageData, 0, 0);

            const result = await this.tessWorker.recognize(this.canvas);
            
            const extraction = this.extractMedicineDataTemporal(result.data.words, isSingleFrame);
            
            if (extraction && extraction.bbox) {
                extraction.bbox = {
                    x0: extraction.bbox.x0 / scale,
                    y0: extraction.bbox.y0 / scale,
                    x1: extraction.bbox.x1 / scale,
                    y1: extraction.bbox.y1 / scale
                };
            }

            this.isProcessing = false;
            return extraction;
        } catch (e) {
            console.error(e);
            this.isProcessing = false;
            return null;
        }
    }

    extractMedicineDataTemporal(newWords, isSingleFrame = false) {
        const now = Date.now();
        const validWords = newWords.filter(w => w.confidence > 70 && w.text.trim().length >= 3);
        
        if (isSingleFrame) {
            const corpus = validWords.map(w=>w.text).join(' ');
            const matches = fuzzySearchDrugs(corpus, INDIAN_DRUG_DATASET, 0.70);
            if (matches.length > 0) {
                return {
                    state: 'VERIFYING',
                    bestMatch: matches[0].drug,
                    score: matches[0].score,
                    bbox: validWords.length > 0 ? validWords[0].bbox : null
                };
            }
            return { state: 'HUNTING', bestMatch: null };
        }

        this.temporalBuffer.push({ time: now, words: validWords });
        this.temporalBuffer = this.temporalBuffer.filter(f => now - f.time <= 2000);
        
        if (this.temporalBuffer.length === 0) return { state: 'HUNTING', bestMatch: null };

        const latestMatches = fuzzySearchDrugs(this.temporalBuffer[this.temporalBuffer.length-1].words.map(w=>w.text).join(' '), INDIAN_DRUG_DATASET, 0.70);
        
        if (latestMatches.length > 0) {
            const candidate = latestMatches[0];
            
            let consecutiveCount = 0;
            let avgScore = 0;
            for (let i = this.temporalBuffer.length - 1; i >= 0; i--) {
                const frameCorpus = this.temporalBuffer[i].words.map(w=>w.text).join(' ');
                const m = fuzzySearchDrugs(frameCorpus, INDIAN_DRUG_DATASET, 0.70);
                const found = m.find(x => x.drug.name === candidate.drug.name);
                if (found) {
                    consecutiveCount++;
                    avgScore += found.score;
                } else {
                    break;
                }
            }

            if (consecutiveCount >= 5) {
                const candidateParts = candidate.drug.name.toLowerCase().split(' ');
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                let foundBox = false;

                this.temporalBuffer[this.temporalBuffer.length-1].words.forEach(w => {
                    const wText = w.text.toLowerCase();
                    if (candidateParts.some(part => wText.includes(part) || part.includes(wText))) {
                        minX = Math.min(minX, w.bbox.x0);
                        minY = Math.min(minY, w.bbox.y0);
                        maxX = Math.max(maxX, w.bbox.x1);
                        maxY = Math.max(maxY, w.bbox.y1);
                        foundBox = true;
                    }
                });

                return { 
                    state: 'VERIFYING',
                    bestMatch: candidate.drug, 
                    score: avgScore / consecutiveCount,
                    bbox: foundBox ? { x0: minX, y0: minY, x1: maxX, y1: maxY } : null
                };
            } else {
                return {
                    state: 'LOCKING',
                    partialMatch: candidate.drug,
                    consecutiveFrames: consecutiveCount
                };
            }
        }

        return { state: 'HUNTING', bestMatch: null };
    }

    clearMemory() {
        this.temporalBuffer = [];
    }
    }