import { dexieManager } from '../../storage/DexieManager.js';

export class MarketAvailabilityResolver {
    constructor() {
        this.dbManager = dexieManager;
    }

    async init() {
        this.db = await this.dbManager.getDB();
    }

    /**
     * Look up regional availability and distribution networks for a given brand
     * @param {string} medicineId - The ID of the medicine
     */
    async lookupAvailability(medicineId) {
        await this.init();
        const medicine = await this.db.medicine_knowledge.get(medicineId);
        
        if (!medicine) return null;

        return {
            states: medicine.regionalAvailability || [],
            distributors: medicine.andhraDistribution || [],
            retailPresence: medicine.retailPresence || [],
            status: medicine.marketStatus || 'Unknown'
        };
    }
}

export const marketAvailabilityResolver = new MarketAvailabilityResolver();
