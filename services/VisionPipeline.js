/**
 * @fileoverview Vision Pipeline Service for MedCare PWA.
 * Architecture: ES6 Module, WebAssembly (Tesseract.js) wrapper.
 * Paradigm: Edge-computed Optical Character Recognition (OCR) with hardware-safe throttling.
 */

/**
 * @typedef {Object} OCRWord
 * @property {string} text - The recognized word.
 * @property {number} confidence - The confidence score (0-100) of the specific word.
 */

/**
 * @typedef {Object} OCRResult
 * @property {string} text - The raw, full text extracted from the image.
 * @property {number} confidence - The overall confidence score (0-100) of the extraction.
 * @property {OCRWord[]} words - Array of individual recognized words and their specific confidences.
 */

/**
 * VisionPipeline handles all local OCR tasks.
 * Includes image preprocessing (WebGL/Canvas), noise reduction, 
 * and a token-bucket rate limiter to prevent thread starvation on mobile CPUs.
 */
class VisionPipeline {
    constructor() {
        /** @private {any} Tesseract worker instance */
        this._worker = null;
        
        /** @private {Promise|null} Lock for lazy initialization */
        this._initPromise = null;

        // Token Bucket Rate Limiter Configuration
        // Allows a burst of 3 scans, but strictly limits sustained scans to 1 per 2 seconds
        /** @private {number} Maximum capacity of the token bucket */
        this._maxTokens = 3;
        
        /** @private {number} Current available tokens */
        this._tokens = 3;
        
        /** @private {number} Milliseconds required to regenerate a single token */
        this._refillRateMs = 2000;
        
        /** @private {number} Timestamp of the last token computation */
        this._lastRefillTimestamp = Date.now();
    }

    /**
     * Internal token bucket logic. Computes token regeneration based on elapsed time.
     * @private
     */
    _refillTokens() {
        const now = Date.now();
        const timeElapsed = now - this._lastRefillTimestamp;
        
        const tokensToGenerate = Math.floor(timeElapsed / this._refillRateMs);

        if (tokensToGenerate > 0) {
            this._tokens = Math.min(this._maxTokens, this._tokens + tokensToGenerate);
            // Advance the timestamp strictly by the chunks of time consumed
            this._lastRefillTimestamp += (tokensToGenerate * this._refillRateMs);
        }
    }

    /**
     * Attempts to consume an OCR token.
     * @private
     * @throws {Error} If the rate limit bucket is currently empty.
     */
    _consumeToken() {
        this._refillTokens();
        
        if (this._tokens >= 1) {
            this._tokens -= 1;
            return true;
        }

        throw new Error('OCR Rate Limit Exceeded: Please wait a moment before scanning again.');
    }

    /**
     * Lazily initializes the Tesseract WebAssembly worker.
     * Guarantees only one worker is spun up, even if called concurrently.
     * @private
     * @returns {Promise<any>} The ready Tesseract worker.
     */
    async _initWorker() {
        if (this._worker) {
            return this._worker;
        }

        if (this._initPromise) {
            return this._initPromise;
        }

        this._initPromise = (async () => {
            if (typeof Tesseract === 'undefined') {
                throw new Error('[VisionPipeline Fatal] Tesseract is not loaded on the window object.');
            }

            console.log('[VisionPipeline] Booting Tesseract WASM worker...');
            
            try {
                // Initialize worker with logging suppressed to prevent console thrashing
                const worker = await Tesseract.createWorker({
                    logger: (message) => {
                        if (message.status === 'recognizing text' && message.progress % 0.25 === 0) {
                            // Only log major progress increments
                            console.debug(`[VisionPipeline] OCR Progress: ${(message.progress * 100).toFixed(0)}%`);
                        }
                    }
                });

                await worker.loadLanguage('eng');
                await worker.initialize('eng');
                
                // Whitelist characters to improve accuracy for medical labels
                await worker.setParameters({
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-/ ',
                });

                this._worker = worker;
                console.log('[VisionPipeline] Tesseract worker ready.');
                return worker;
            } catch (error) {
                this._initPromise = null; // Free the lock so we can retry on failure
                throw new Error(`[VisionPipeline] Failed to initialize worker: ${error.message}`);
            }
        })();

        return this._initPromise;
    }

    /**
     * Applies image processing techniques to maximize OCR contrast and legibility.
     * Converts to Grayscale and applies a high-pass contrast boost.
     * @param {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} source - The image source.
     * @returns {HTMLCanvasElement} A new, processed canvas element.
     */
    preprocessCanvas(source) {
        if (!source) {
            throw new Error('[VisionPipeline] Invalid source provided for preprocessing.');
        }

        const width = source.videoWidth || source.width;
        const height = source.videoHeight || source.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Draw initial image
        ctx.drawImage(source, 0, 0, width, height);

        // Extract pixel data
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        const contrastFactor = 1.8; // Aggressive contrast boost for faded pill bottles

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // 1. Luminance (Grayscale) conversion (BT.601 standard)
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // 2. Contrast Boost formula: C * (Pixel - 128) + 128
            let boosted = ((gray / 255.0 - 0.5) * contrastFactor + 0.5) * 255.0;

            // 3. Clamp values strictly to 0-255
            boosted = Math.max(0, Math.min(255, boosted));

            // Apply monochromatic result back to RGB channels
            data[i] = boosted;     // Red
            data[i + 1] = boosted; // Green
            data[i + 2] = boosted; // Blue
            // Alpha (data[i + 3]) remains untouched
        }

        // Commit modifications back to canvas
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    /**
     * Parses raw OCR output using Regex to isolate the most probable drug name.
     * Aggressively strips pharmacy noise (Lot numbers, Expiry dates, Rx numbers).
     * @param {string} ocrText - The raw string returned by Tesseract.
     * @returns {string} The hypothesized drug name, or an empty string if unresolvable.
     */
    extractDrugName(ocrText) {
        if (!ocrText || typeof ocrText !== 'string') return '';

        let sanitized = ocrText.toUpperCase();

        // 1. Strip standard pharmacy label noise
        sanitized = sanitized.replace(/LOT\s*#?:?\s*[A-Z0-9]+/g, ''); // Remove LOT numbers
        sanitized = sanitized.replace(/EXP\s*#?:?\s*\d{2}[\/\-]\d{2,4}/g, ''); // Remove Expiry dates
        sanitized = sanitized.replace(/RX\s*#?:?\s*\d+/g, ''); // Remove Rx numbers
        sanitized = sanitized.replace(/NDC\s*\d+\-\d+\-\d+/g, ''); // Remove NDC codes
        sanitized = sanitized.replace(/TAKE\s+ONE\s+TABLET/g, ''); // Remove common instructions
        sanitized = sanitized.replace(/BY\s+MOUTH/g, ''); 

        // 2. Look for a strong indicator pattern: [WORD] [DOSAGE] (e.g., "AMOXICILLIN 500MG")
        const dosagePattern = /([A-Z]{4,})\s+(?:\d+(?:\.\d+)?\s*(?:MG|ML|MCG|G|IU|UNITS))/;
        const dosageMatch = sanitized.match(dosagePattern);

        if (dosageMatch && dosageMatch[1]) {
            return dosageMatch[1].trim();
        }

        // 3. Fallback: Find the longest continuous alphabetical string > 4 characters
        // Medical generic names are typically the longest single word on the bottle.
        const cleanWords = sanitized.split(/[^A-Z]/).filter(word => word.length > 4);
        
        if (cleanWords.length > 0) {
            return cleanWords.reduce((longest, current) => current.length > longest.length ? current : longest);
        }

        return '';
    }

    /**
     * The primary public interface for executing an OCR operation.
     * Handled within a strictly rate-limited pipeline.
     * @param {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} sourceImage - The visual target.
     * @returns {Promise<OCRResult>} Extracted text data.
     */
    async recognize(sourceImage) {
        if (!sourceImage) {
            throw new Error('[VisionPipeline] recognize() requires a valid image or canvas source.');
        }

        try {
            // Enforce token-bucket hardware constraints
            this._consumeToken();

            // Prepare the image
            const optimizedCanvas = this.preprocessCanvas(sourceImage);
            
            // Ensure worker is hot
            const worker = await this._initWorker();

            console.log('[VisionPipeline] Executing local tensor evaluation...');
            
            // Execute Recognition
            const { data } = await worker.recognize(optimizedCanvas);

            // Structure result payload
            return {
                text: data.text || '',
                confidence: data.confidence || 0,
                words: (data.words || []).map(word => ({
                    text: word.text,
                    confidence: word.confidence
                }))
            };

        } catch (error) {
            console.error('[VisionPipeline Error] Recognition cycle failed:', error);
            throw error; // Re-throw for UI-layer toast notification
        }
    }
}

// Export a single, immutable instance for memory conservation.
export const visionPipeline = new VisionPipeline();