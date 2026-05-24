/**
 * @fileoverview VisionPipeline — Dedicated OCR & Computer Vision Service
 * Performs pixel-level binarization, Tesseract interfacing, and NLP extraction.
 */
import { INDIAN_DRUG_DATASET, fuzzySearchDrugs } from '../data/indian-drug-dataset.js';

export default class VisionPipeline {
  constructor() {
    this.isReady = typeof Tesseract !== 'undefined';
    this.worker = null; 
  }

  /**
   * Pipeline Step 1: Advanced Pixel Preprocessing
   * Applies Grayscale, High-Contrast Luminance Thresholding, and Sharpening
   */
  preprocessImage(videoElement, scale = 1.0) {
    const vW = videoElement.videoWidth;
    const vH = videoElement.videoHeight;
    
    const canvas = document.createElement('canvas');
    canvas.width = vW * scale;
    canvas.height = vH * scale;
    const ctx = canvas.getContext('2d');
    
    // Draw initial video frame
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Extract raw pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 1. Grayscale & Adaptive Luminance Thresholding
    // We calculate average luminance to adjust the threshold dynamically based on lighting
    let totalLuminance = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalLuminance += (0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
    }
    const avgLuminance = totalLuminance / (data.length / 4);
    const threshold = avgLuminance * 0.85; // Darken threshold for text

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      
      // Standard grayscale conversion
      const v = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Binarization (Black/White push) for sharper OCR edges
      const finalColor = v > threshold ? 255 : 0; 
      
      data[i] = data[i+1] = data[i+2] = finalColor;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Pipeline Step 2: Execute OCR Engine
   */
  async recognizeText(canvas, onProgress = () => {}) {
    if (!this.isReady) throw new Error("Vision Engine (Tesseract) not loaded.");
    
    const result = await Tesseract.recognize(canvas, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress(Math.round((m.progress || 0) * 100));
        }
      }
    });
    return {
      rawText: result.data.text || '',
      words: result.data.words || []
    };
  }

  /**
   * Pipeline Step 3: NLP Extraction & Dataset Matching
   */
  extractMedicineData(rawText, words) {
    const data = {
      bestMatch: null, score: 0,
      dosage: '', unit: 'mg', frequency: '', quantity: '',
      allMatches: [], rawText
    };

    // 1. Extract Dosage (Enhanced Regex)
    const dosagePatterns = [
      /(\d+(?:\.\d+)?)\s*(mg|mcg|ug|µg|ml|g|iu|i\.u\.|units?|%)\b/gi,
      /(\d+)\s*[Mm][Gg]/g,
      /strength[:\s]+(\d+(?:\.\d+)?)\s*(mg|ml|mcg|g)/gi,
    ];

    for (const pattern of dosagePatterns) {
      const match = rawText.match(pattern);
      if (match && match.length > 0) {
        const first = rawText.match(new RegExp(pattern.source, 'i'));
        if (first) {
          data.dosage = first[1] || first[0].replace(/[^\d.]/g, '');
          data.unit   = (first[2] || 'mg').toLowerCase().replace('µg', 'mcg').replace('ug', 'mcg');
          break;
        }
      }
    }

    // 2. Extract Frequency
    const freqPatterns = [
      { re: /once\s+(?:a\s+)?daily|od\b|o\.d\./i, label: 'Once daily' },
      { re: /twice\s+(?:a\s+)?daily|bd\b|b\.d\.|bid\b/i, label: 'Twice daily' },
      { re: /thrice\s+(?:a\s+)?daily|tds\b|t\.d\.s\.|tid\b/i, label: 'Three times daily' },
      { re: /four\s+times\s+(?:a\s+)?day|qid\b|q\.i\.d\./i, label: 'Four times daily' },
      { re: /every\s+(\d+)\s+hours?/i, label: 'Every N hours' },
    ];
    for (const { re, label } of freqPatterns) {
      if (re.test(rawText)) { data.frequency = label; break; }
    }

    // 3. Match Drug Names via Fuzzy Engine
    const wordTexts = words.map(w => w.text.trim()).filter(t => t.length >= 3);
    const combined  = [rawText, ...wordTexts].join(' ');

    const allMatches = fuzzySearchDrugs(rawText, INDIAN_DRUG_DATASET, 0.45); // Tighter threshold for accuracy
    const seenNames = new Set();
    
    for (const m of allMatches) {
      if (!seenNames.has(m.drug.name)) {
        seenNames.add(m.drug.name);
        data.allMatches.push(m);
      }
    }

    if (data.allMatches.length > 0) {
      data.bestMatch = data.allMatches[0].drug;
      data.score     = data.allMatches[0].score;
    }

    return data;
  }
}