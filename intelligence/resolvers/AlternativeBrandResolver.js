import { dexieManager } from '../../storage/DexieManager.js';

export class AlternativeBrandResolver {
    constructor() {
        this.dbManager = dexieManager;
    }

    async init() {
        this.db = await this.dbManager.getDB();
    }

    /**
     * Finds local generic substitutions or alternative brands for a given medicine
     * @param {string} brandId - The ID of the original brand
     */
    async getGenericAlternatives(brandId) {
        await this.init();
        const medicine = await this.db.medicine_knowledge.get(brandId);
        
        if (!medicine || !medicine.alternativeBrands) return [];

        const alternatives = await this.db.medicine_knowledge
            .where('id').anyOf(medicine.alternativeBrands)
            .toArray();
            
        // Map to a simplified response object for the UI
        return alternatives.map(alt => ({
            id: alt.id,
            name: alt.name,
            manufacturer: alt.manufacturer,
            strength: alt.strength,
            priceEstimate: 'Variable' // In a real system, query pricing API
        }));
    }
}

export const alternativeBrandResolver = new AlternativeBrandResolver();
