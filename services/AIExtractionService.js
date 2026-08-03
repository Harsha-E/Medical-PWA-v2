/**
 * AIExtractionService
 * Provider-Agnostic Extraction Service
 *
 * Delegates execution to ProviderFactory.getProvider()
 * ScanView and all downstream pipelines remain 100% untouched.
 */

import { ProviderFactory } from './vision/ProviderFactory.js';

class AIExtractionService {
    constructor() {
        this.useDemoMode = false;
    }

    /**
     * Extracts medicines from a captured image blob.
     * @param {Blob} imageBlob
     * @returns {Promise<Array>} Structured list of medicine objects.
     */
    async extractMedicines(imageBlob) {
        try {
            const provider = ProviderFactory.getProvider();
            console.log('[AIExtractionService] 🚀 Delegating extraction to active Vision Provider...');
            return await provider.extract(imageBlob);
        } catch (err) {
            console.error('[AIExtractionService] Vision Provider extraction exception:', err);
            throw err;
        }
    }
}

export default new AIExtractionService();
