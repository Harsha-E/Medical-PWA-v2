    /**
     * @fileoverview VisionPipeline — Optimized for Temporal Memory & High-Accuracy Extraction
     */


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
            this.isReady = true;
            this.isProcessing = false;
            this.activeSessionId = null;
            this._worker = new Worker(new URL('../workers/vision.worker.js', import.meta.url), { type: 'module' });
            this._matcherWorker = new Worker(new URL('../workers/matcher.worker.js', import.meta.url), { type: 'module' });
        }

        async processFrame(sourceElement, scale = 0.5, isSingleFrame = false) {
            if (this.isProcessing || !this.isReady) return null;
            this.isProcessing = true;

            try {
                const bitmap = await createImageBitmap(sourceElement);
                this._worker.postMessage({ type: 'PROCESS_FRAME', bitmap }, [bitmap]);
                
                const workerResult = await new Promise((resolve) => {
                    const handler = (e) => {
                        if (e.data.type === 'PIPELINE_COMPLETE') {
                            this._worker.removeEventListener('message', handler);
                            resolve(e.data.result);
                        } else if (e.data.type === 'PIPELINE_ERROR') {
                            this._worker.removeEventListener('message', handler);
                            resolve({ error: e.data.error });
                        } else if (e.data.type === 'PIPELINE_STAGE') {
                            window.dispatchEvent(new CustomEvent('scan:pipeline-stage', { detail: e.data.stage }));
                        }
                    };
                    this._worker.addEventListener('message', handler);
                });

                if (!workerResult) {
                    this.isProcessing = false;
                    return null;
                }

                if (workerResult.error) {
                    this.isProcessing = false;
                    return { state: 'ERROR', error: workerResult.error };
                }

                // Send the OCR data to the matcher worker
                const matchResult = await new Promise((resolve) => {
                    const handler = (e) => {
                        if (e.data.type === 'IDENTIFICATION_COMPLETE') {
                            this._matcherWorker.removeEventListener('message', handler);
                            resolve(e.data.result);
                        } else if (e.data.type === 'ERROR') {
                            this._matcherWorker.removeEventListener('message', handler);
                            resolve({ state: 'ERROR', error: e.data.error });
                        }
                    };
                    this._matcherWorker.addEventListener('message', handler);
                    this._matcherWorker.postMessage({
                        type: 'IDENTIFY_MEDICINE',
                        payload: {
                            rawText: workerResult.rawText,
                            confidence: workerResult.confidence,
                            regions: workerResult.regions || [],
                            sessionId: this.activeSessionId || 'default-session'
                        }
                    });
                });

                this.isProcessing = false;

                if (!matchResult) return null;

                // Propagate dosage, quantity, and cropped image metadata into final output
                return {
                    ...matchResult,
                    dosage: workerResult.dosages && workerResult.dosages[0] ? workerResult.dosages[0].value : null,
                    unit: workerResult.dosages && workerResult.dosages[0] ? workerResult.dosages[0].unit : null,
                    quantity: workerResult.quantities && workerResult.quantities[0] ? workerResult.quantities[0].value : null,
                    croppedBlob: workerResult.croppedBlob,
                    bbox: matchResult.bbox || null
                };

            } catch (e) {
                console.error(e);
                this.isProcessing = false;
                return null;
            }
        }

        recordCorrection(sessionId, finalDrugs, isUserCorrection, rawOcrText = '', regions = []) {
            if (this._matcherWorker) {
                this._matcherWorker.postMessage({
                    type: 'RECORD_CORRECTION',
                    payload: { sessionId, finalDrugs, isUserCorrection, rawOcrText, regions }
                });
            }
        }

        recordFailure(sessionId, failureType) {
            if (this._matcherWorker) {
                this._matcherWorker.postMessage({
                    type: 'RECORD_FAILURE',
                    payload: { sessionId, failureType }
                });
            }
        }

        clearMemory() {
            if (this._worker) {
                this._worker.postMessage({ type: 'CLEAR_MEMORY' });
            }
            if (this._matcherWorker) {
                this._matcherWorker.postMessage({ type: 'CLEAR' });
            }
        }
    }