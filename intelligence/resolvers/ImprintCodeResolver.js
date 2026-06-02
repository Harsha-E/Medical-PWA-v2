import { dexieManager } from '../../storage/DexieManager.js';

export class ImprintCodeResolver {
    constructor() {
        this.dbManager = dexieManager;
    }

    async init() {
        this.db = await this.dbManager.getDB();
    }

    /**
     * Translates tablet imprint stamps into active records
     * @param {string} code - The alphanumeric stamp on the tablet
     */
    async resolveImprint(code) {
        if (!code) return [];
        
        await this.init();
        const upperCode = code.toUpperCase();
        
        // Find medicines that have this code in their imprintCodes array
        const candidates = await this.db.medicine_knowledge
            .filter(med => {
                if (!med.imprintCodes) return false;
                return med.imprintCodes.some(imprint => imprint.toUpperCase() === upperCode);
            })
            .toArray();

        return candidates;
    }
}

export const imprintCodeResolver = new ImprintCodeResolver();
