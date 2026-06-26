    /**
     * @fileoverview VisionPipeline — MIOS API Orchestrator
     * Pushes camera frames to the Python Intelligence Layer and parses responses.
     */
    import { MedicineKnowledgeGraph } from '../intelligence/MedicineKnowledgeGraph.js';

    export default class VisionPipeline {
        constructor() {
            this.isReady = true;
            this.isProcessing = false;
            this.activeSessionId = null;
            this.apiUrl = 'http://localhost:8000/api/intelligence/analyze';
        }

        async processFrame(sourceElement, scale = 0.75, isSingleFrame = false) {
            console.log("[VisionPipeline] Sending frame to background Web Worker for Groq OCR...");
            if (this.isProcessing || !this.isReady) return null;
            this.isProcessing = true;

            try {
                return await Promise.race([
                    this._executePipeline(sourceElement, scale, isSingleFrame),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Pipeline Watchdog Timeout')), 45000))
                ]);
            } catch (e) {
                console.error("[VisionPipeline] Error or Timeout:", e);
                this.isProcessing = false;
                return null;
            }
        }

        async _executePipeline(sourceElement, scale, isSingleFrame) {
            try {
                // 1. Crop & Extract frame to Data URI
                const canvas = document.createElement('canvas');
                const sw = sourceElement.videoWidth || sourceElement.naturalWidth || sourceElement.width;
                const sh = sourceElement.videoHeight || sourceElement.naturalHeight || sourceElement.height;
                
                const cropSize = Math.min(sw, sh) * 0.8;
                const startX = (sw - cropSize) / 2;
                const startY = (sh - cropSize) / 2;

                const targetSize = Math.floor(cropSize * scale);
                canvas.width = targetSize;
                canvas.height = targetSize;
                const ctx = canvas.getContext('2d');
                
                ctx.drawImage(sourceElement, startX, startY, cropSize, cropSize, 0, 0, targetSize, targetSize);

                const base64Image = canvas.toDataURL('image/jpeg', 0.85);

                window.dispatchEvent(new CustomEvent('scan:pipeline-stage', { detail: 'Local Worker Analysis' }));

                return await new Promise((resolve, reject) => {
                    // The ?v= timestamp physically blocks the browser from caching the old worker
                    const worker = new Worker(`./services/visionWorker.js?v=${Date.now()}`, { type: 'module' });
                    
                    worker.onmessage = async (e) => {
                        this.isProcessing = false;
                        worker.terminate();
                        
                        console.group("[Vision Pipeline Execution]");
                        
                        const result = e.data;
                        if (result.error) {
                            reject(new Error(result.error));
                            return;
                        }

                        let bestMatch = null;
                        const nameToMatch = result.medicationName || result.brandName;
                        if (nameToMatch) {
                            console.log("[Graph Search] Attempting to match string:", nameToMatch);
                            
                            const yieldToMain = () => new Promise(r => setTimeout(r, 0));
                            await yieldToMain();
                            
                            const graph = new MedicineKnowledgeGraph();
                            const matches = await graph.queryNode(nameToMatch);
                            if (matches && matches.length > 0) {
                                bestMatch = matches[0];
                            }
                            console.log("[Graph Search] Match Result:", bestMatch || "FAILED - No match found");
                        }
                        console.groupEnd();

                        // Map to legacy expected format
                        resolve({
                            state: bestMatch ? 'SUCCESS' : 'NEEDS_REVIEW',
                            confidence: 1.0,
                            name: nameToMatch || 'Unknown',
                            dosage: result.strengthPerUnit || (bestMatch ? bestMatch.strength : ''),
                            manufacturer: result.manufacturer || (bestMatch ? bestMatch.manufacturer : ''),
                            quantity: result.totalQuantityCount || null,
                            unit: '', 
                            bbox: null,
                            bestMatch: bestMatch
                        });
                    };

                    worker.onerror = (error) => {
                        console.error('[VisionPipeline][Crash] Worker encountered an internal error:', error.message);
                        this.isProcessing = false;
                        worker.terminate();
                        reject(new Error(error.message || 'Worker initialization failed'));
                    };

                    worker.postMessage({ image_url: base64Image });
                });
                
            } catch (error) {
                console.error('[VisionPipeline][Crash] Failed to reach local orchestrator:', error);
                this.isProcessing = false;
                window.dispatchEvent(new CustomEvent('scan:pipeline-error', { detail: error.message }));
                throw error;
            }
        }

        recordCorrection(sessionId, finalDrugs, isUserCorrection, rawOcrText = '', regions = []) {
            console.log("[VisionPipeline] recordCorrection sent to Telemetry endpoint (Not Implemented)");
        }

        recordFailure(sessionId, failureType) {
            console.log("[VisionPipeline] recordFailure sent to Telemetry endpoint (Not Implemented)");
        }

        clearMemory() {
            console.log("[VisionPipeline] clearMemory invoked.");
        }
    }