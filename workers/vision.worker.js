/**
 * @fileoverview Pure Vision Extraction Worker
 * strictly handles Mediapipe Cropping and Tesseract OCR.
 * Matching is delegated to matcher.worker.js.
 */
import { FilesetResolver, ObjectDetector } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs';
import { createWorker } from 'https://esm.sh/tesseract.js@5';

let _detectorReady = false;
let detector = null;
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
            const isSingleFrame = e.data.isSingleFrame || false;
            
            // 1. Hardware-Accelerated Bounding Box (Mediapipe)
            if (!_detectorReady) {
                try {
                    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm');
                    detector = await ObjectDetector.createFromOptions(vision, {
                        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite', delegate: 'GPU' },
                        scoreThreshold: 0.5,
                        maxResults: 1
                    });
                    _detectorReady = true;
                } catch (mlErr) {
                    console.warn('[VisionWorker] Mediapipe init failed, defaulting to full-frame OCR.');
                }
            }

            let baseCanvas;
            if (_detectorReady && detector) {
                const detections = detector.detect(bitmap);
                if (detections?.detections?.length > 0) {
                    // BUG FIX: Filter out human faces/bodies from the generic object detector
                    const validDetections = detections.detections.filter(d => {
                        const category = d.categories[0]?.categoryName?.toLowerCase();
                        return category !== 'person' && category !== 'face';
                    });

                    if (validDetections.length > 0) {
                        const bbox = validDetections[0].boundingBox;
                        // BUG FIX: Prevent Tesseract crashing on impossibly small bounding boxes (e.g. 2x36)
                        if (bbox.width >= 20 && bbox.height >= 20) {
                            baseCanvas = new OffscreenCanvas(bbox.width, bbox.height);
                            const ctx = baseCanvas.getContext('2d');
                            ctx.drawImage(bitmap, bbox.originX, bbox.originY, bbox.width, bbox.height, 0, 0, bbox.width, bbox.height);
                        }
                    }
                }
            }
            
            // Fallback: Use entire frame if no bounding box found
            if (!baseCanvas) {
                baseCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
                const ctx = baseCanvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0);
            }

            const getRotatedBlob = async (angle) => {
                if (angle === 0) return await baseCanvas.convertToBlob({ type: 'image/png' });
                
                // Use a diagonal-sized canvas to prevent corner clipping during rotation
                const diag = Math.ceil(Math.sqrt(baseCanvas.width**2 + baseCanvas.height**2));
                const rCanvas = new OffscreenCanvas(diag, diag);
                const ctx = rCanvas.getContext('2d');
                
                ctx.translate(diag/2, diag/2);
                ctx.rotate(angle * Math.PI / 180);
                ctx.drawImage(baseCanvas, -baseCanvas.width/2, -baseCanvas.height/2);
                
                return await rCanvas.convertToBlob({ type: 'image/png' });
            };

            // 2. Optical Character Recognition (Tesseract)
            if (!_tesseractReady) {
                ocrWorker = await createWorker('eng', 1, {
                    logger: (m) => {
                        if (m.status === 'recognizing text') self.postMessage({ type: 'PIPELINE_STAGE', stage: 'OCR Extraction' });
                    }
                });
                _tesseractReady = true;
            }

            // Generate angles from 0 to 180 in 15-degree increments.
            // (Tesseract naturally handles +/- 7 degrees of skew, so 15-degree steps 
            // perfectly covers literally every possible degree without duplicating work).
            let angles = [];
            if (isSingleFrame) {
                angles = [0, 90, 180, 270]; // Manual captures can be oriented portrait or landscape
            } else {
                for (let i = 0; i <= 180; i += 15) {
                    angles.push(i);
                }
            }
            let bestResult = null;
            let finalBlob = null;

            for (const angle of angles) {
                const processBlob = await getRotatedBlob(angle);
                const { data } = await ocrWorker.recognize(processBlob);
                
                if (!bestResult || data.confidence > bestResult.confidence) {
                    bestResult = data;
                    finalBlob = processBlob;
                }
                
                // Break early if we find a confident text string (Performance Friendly)
                if (data.confidence > 60 && data.text.trim().length > 3) {
                    break;
                }
            }

            const { text, confidence, lines } = bestResult;
            
            // Map regions for spatial analysis
            const regions = lines.map(line => ({
                text: line.text.trim(),
                confidence: line.confidence,
                bbox: line.bbox 
            }));

            // Pass strictly formatted data to the main thread
            self.postMessage({ 
                type: 'PIPELINE_COMPLETE', 
                result: { rawText: text.trim(), confidence, regions, croppedBlob: finalBlob } 
            });

        } catch (error) {
            self.postMessage({ type: 'PIPELINE_ERROR', error: error.message });
        }
    }
};
