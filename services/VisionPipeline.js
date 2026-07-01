    /**
     * @fileoverview VisionPipeline — MIOS API Orchestrator
     * Pushes camera frames to the Python Intelligence Layer and parses responses.
     */
    import { MedicineKnowledgeGraph } from '../intelligence/MedicineKnowledgeGraph.js';
    import FuzzyMatcher from './FuzzyMatcher.js';

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
                
                // Retain full color and max quality for highest accuracy
                ctx.drawImage(sourceElement, startX, startY, cropSize, cropSize, 0, 0, targetSize, targetSize);

                const base64Image = canvas.toDataURL('image/jpeg', 1.0);

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
                        const brandToMatch = result.medicationName || result.brandName;
                        const genericToMatch = result.genericName;
                        
                        const yieldToMain = () => new Promise(r => setTimeout(r, 0));
                        await yieldToMain();
                        
                        const graph = new MedicineKnowledgeGraph();
                        await graph.init();

                        console.log("[VisionPipeline] Bypassing legacy search. Deploying Advanced Fuzzy Matcher...");
                        
                        // Optimized DB Query to prevent 250k full table scan lag
                        const brandPrefix = String(brandToMatch || '').substring(0, 2).toLowerCase();
                        const genericPrefix = String(genericToMatch || '').substring(0, 2).toLowerCase();
                        
                        // Always do the fast prefix search
                        let candidateDataset = [];
                        if (brandPrefix.length >= 2 || genericPrefix.length >= 2) {
                            const query = graph.db.medicine_knowledge.where('name').startsWithIgnoreCase(brandPrefix);
                            if (genericPrefix.length >= 2) {
                                query.or('genericName').startsWithIgnoreCase(genericPrefix);
                            }
                            candidateDataset = await query.limit(1500).toArray(); 
                        } else {
                            candidateDataset = await graph.db.medicine_knowledge.limit(100).toArray();
                        }
                        
                        // Per user request: ALWAYS run a deep substring scan for cropped OCR (e.g., 'apen' matching 'Megapen')
                        // We merge this with the prefix dataset to ensure comprehensive candidate presentation.
                        const brandTarget = String(brandToMatch || '').toLowerCase();
                        const genericTarget = String(genericToMatch || '').toLowerCase();
                        
                        if (brandTarget.length >= 3 || genericTarget.length >= 3) {
                            console.log(`[VisionPipeline] Executing deep substring scan using optimized key-index (target: '${brandTarget}'/'${genericTarget}')...`);
                            
                            let substringDataset = [];
                            try {
                                // Instead of a slow Dexie full table scan, we fetch the raw JSON which v8 parses extremely fast in memory.
                                const response = await fetch('./data/indian_medicine_data.json');
                                if (response.ok) {
                                    const allData = await response.json();
                                    
                                    substringDataset = allData.filter(item => {
                                        let match = false;
                                        if (brandTarget.length >= 3 && item.name && item.name.toLowerCase().includes(brandTarget)) {
                                            match = true;
                                        }
                                        if (genericTarget.length >= 3 && item.genericName && item.genericName.toLowerCase().includes(genericTarget)) {
                                            match = true;
                                        }
                                        return match;
                                    }).slice(0, 30);
                                }
                            } catch(e) {
                                console.warn("[VisionPipeline] Deep substring scan failed:", e);
                            }
                            
                            // Merge and deduplicate
                            const merged = [...candidateDataset, ...substringDataset];
                            const uniqueMap = new Map();
                            merged.forEach(d => {
                                const key = d.id || d.name;
                                if (!uniqueMap.has(key)) uniqueMap.set(key, d);
                            });
                            candidateDataset = Array.from(uniqueMap.values());
                        }

                        // Pass the comprehensive dataset for contextual scoring
                        bestMatch = null;
                        let candidates = [];
                        let matchOutput = FuzzyMatcher.resolveComplexPayload(result, candidateDataset);
                        
                        if (matchOutput) {
                            bestMatch = matchOutput.bestMatch;
                            candidates = matchOutput.candidates || [];
                            console.log("[Fuzzy Matcher] Successfully matched payload to:", bestMatch.name || bestMatch.genericName);
                        }

                        // Failsafe: Construct a raw payload if the local knowledge graph is missing the drug entirely
                        if (!bestMatch) {
                            console.log("[Graph Search] All local lookups failed. Constructing synthetic raw AI payload.");
                            bestMatch = {
                                name: brandToMatch || genericToMatch || 'Unknown Medicine',
                                brandName: result.brandName,
                                genericName: result.genericName,
                                strength: result.strengthPerUnit || result.dosageAmount || '',
                                manufacturer: result.manufacturer || result.companyName || '',
                                dosageForm: result.form || '',
                                totalQuantity: result.totalQuantityCount || null,
                                isRawPayload: true
                            };
                            candidates = [bestMatch];
                        }

                        console.log("[Graph Search] Match Result:", bestMatch || "FAILED - No match found");
                        console.groupEnd();

                        // Map to legacy expected format
                        resolve({
                            state: bestMatch && !bestMatch.isRawPayload ? 'SUCCESS' : 'NEEDS_REVIEW',
                            confidence: bestMatch && !bestMatch.isRawPayload ? 1.0 : 0.6,
                            name: bestMatch.name,
                            dosage: bestMatch.strength,
                            manufacturer: bestMatch.manufacturer,
                            quantity: bestMatch.totalQuantity,
                            unit: '', 
                            bbox: null,
                            bestMatch: bestMatch,
                            candidates: candidates
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