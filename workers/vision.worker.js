import { FilesetResolver, ObjectDetector } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs';
import { createWorker } from 'https://esm.sh/tesseract.js@5';
import Fuse from 'https://esm.sh/fuse.js@7.0.0';
import { drugDataset } from '../data/indian-drug-dataset.js';

const fuse = new Fuse(drugDataset, {
    keys: ['name', 'brandName'],
    threshold: 0.15,
    distance: 200,
    useExtendedSearch: false,
    includeScore: true
});

let _detectorReady = false;
let detector = null;
let vision = null;

let _tesseractReady = false;
let ocrWorker = null;

self.onmessage = async (e) => {
    if (e.data.type === 'CLEAR_MEMORY') {
        if (detector) { detector.close(); detector = null; _detectorReady = false; }
        if (ocrWorker) { await ocrWorker.terminate(); ocrWorker = null; _tesseractReady = false; }
        return;
    }
    if (e.data.type === 'PROCESS_FRAME') {
        try {
            const bitmap = e.data.bitmap;
            
            // 1. MEDIAPIPE BOUNDARY DETECTION
            if (!_detectorReady) {
                vision = await FilesetResolver.forVisionTasks('/vendor/mediapipe/wasm');
                detector = await ObjectDetector.createFromOptions(vision, {
                    baseOptions: { modelAssetPath: '/vendor/mediapipe/efficientdet_lite0.tflite', delegate: 'GPU' },
                    scoreThreshold: 0.5,
                    maxResults: 1
                });
                _detectorReady = true;
            }

            const detections = detector.detect(bitmap);
            let croppedBlob;
            
            if (detections && detections.detections && detections.detections.length > 0) {
                const bbox = detections.detections[0].boundingBox;
                const oc = new OffscreenCanvas(bbox.width, bbox.height);
                const ctx = oc.getContext('2d');
                ctx.drawImage(bitmap, bbox.originX, bbox.originY, bbox.width, bbox.height, 0, 0, bbox.width, bbox.height);
                croppedBlob = await oc.convertToBlob({ type: 'image/png' });
            } else {
                const oc = new OffscreenCanvas(bitmap.width, bitmap.height);
                const ctx = oc.getContext('2d');
                ctx.drawImage(bitmap, 0, 0);
                croppedBlob = await oc.convertToBlob({ type: 'image/png' });
            }

            // 2. JS-NATIVE BRADLEY-ROTH ADAPTIVE THRESHOLDING (Fallback for missing OpenCV)
            let finalCleanedBlob;
            {
                const srcBlob = croppedBlob || bitmap;
                const imgBitmap = await createImageBitmap(srcBlob);
                const w = imgBitmap.width;
                const h = imgBitmap.height;
                const oc = new OffscreenCanvas(w, h);
                const ctx = oc.getContext('2d');
                ctx.drawImage(imgBitmap, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, w, h);
                const data = imageData.data;
                const s = Math.max(w, h) / 16 | 0;
                const t = 15;
                const intImg = new Int32Array(w * h);
                
                for (let i = 0; i < w; i++) {
                    let sum = 0;
                    for (let j = 0; j < h; j++) {
                        let idx = (j * w + i) * 4;
                        let val = (data[idx] + data[idx+1] + data[idx+2]) / 3;
                        sum += val;
                        intImg[j * w + i] = (i === 0 ? sum : intImg[j * w + i - 1] + sum);
                    }
                }
                
                for (let i = 0; i < w; i++) {
                    for (let j = 0; j < h; j++) {
                        const x1 = Math.max(i - s, 0);
                        const y1 = Math.max(j - s, 0);
                        const x2 = Math.min(i + s, w - 1);
                        const y2 = Math.min(j + s, h - 1);
                        const count = (x2 - x1) * (y2 - y1);
                        const sum = intImg[y2 * w + x2] - intImg[y1 * w + x2] - intImg[y2 * w + x1] + intImg[y1 * w + x1];
                        
                        let idx = (j * w + i) * 4;
                        let val = (data[idx] + data[idx+1] + data[idx+2]) / 3;
                        let res = val * count < sum * (100 - t) / 100 ? 0 : 255;
                        data[idx] = data[idx+1] = data[idx+2] = res;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                finalCleanedBlob = await oc.convertToBlob({ type: 'image/png' });
            }

            // 3. TESSERACT.JS OCR
            if (!_tesseractReady) {
                ocrWorker = await createWorker('eng', 1, {
                    logger: (m) => { if (m.status === 'recognizing text') self.postMessage({ type: 'OCR_PROGRESS', progress: m.progress }); }
                });
                _tesseractReady = true;
            }

            const { data: { text, confidence } } = await ocrWorker.recognize(finalCleanedBlob);
            const rawText = text.trim();
            
            if (!rawText) {
                self.postMessage({ type: 'PIPELINE_ERROR', error: 'NO_TEXT' });
                return;
            }

            // 4. NER REGEX PIPELINE
            self.postMessage({ type: 'PIPELINE_STAGE', stage: 'Extracting Dosage' });
            const dosageRegex = /(?:take\s+)?(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|tablet|capsule)/gi;
            const dosages = [...rawText.matchAll(dosageRegex)].map(m => ({ value: m[1], unit: m[2] }));

            self.postMessage({ type: 'PIPELINE_STAGE', stage: 'Extracting Frequency' });
            const freqRegex = /\b(BID|TID|QID|OD|twice\s+a\s+day|once\s+daily|every\s+\d+\s+hours?)\b/gi;
            const frequencies = [...rawText.matchAll(freqRegex)].map(m => m[1]);

            self.postMessage({ type: 'PIPELINE_STAGE', stage: 'Extracting Quantification' });
            const quantRegex = /(?:qty|quantity|no\.|#)?\s*(\d+)\s*(?:x\s*\d+)?\s*(tablets?|capsules?|strips?|packs?|bottles?|tubes?)/gi;
            const quantities = [...rawText.matchAll(quantRegex)].map(m => ({ value: m[1], unit: m[2] }));

            let maskedText = rawText.replace(dosageRegex, '').replace(freqRegex, '').replace(quantRegex, '');

            self.postMessage({ type: 'PIPELINE_STAGE', stage: 'Extracting Identification via Fuse.js' });
            const candidates = maskedText
                .split(/[\n\r,;.]+/)
                .map(s => s.trim())
                .filter(s => s.length > 3);

            const confirmedDrugs = [];
            const unresolvedCandidates = [];

            for (const candidate of candidates) {
                const results = fuse.search(candidate);
                if (results.length > 0) {
                    if (results[0].score <= 0.15) {
                        confirmedDrugs.push(results[0].item);
                    } else if (results[0].score <= 0.4) {
                        unresolvedCandidates.push(candidate);
                    }
                }
            }

            self.postMessage({ 
                type: 'PIPELINE_COMPLETE', 
                result: { 
                    rawText, 
                    confirmedDrugs,
                    unresolvedCandidates,
                    confidence,
                    dosages,
                    frequencies,
                    quantities,
                    croppedBlob 
                } 
            });
        } catch (err) {
            console.error('[VisionWorker] Pipeline Error:', err);
            self.postMessage({ type: 'PIPELINE_ERROR', error: err.message });
        }
    }
};
