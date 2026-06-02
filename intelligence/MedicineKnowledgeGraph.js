import { dexieManager } from '../storage/DexieManager.js';

export class MedicineKnowledgeGraph {
    constructor() {
        this.dbManager = dexieManager;
    }

    async init() {
        this.db = await this.dbManager.getDB();
    }

    /**
     * Search for a medicine by name or generic name using full-text or fuzzy logic
     */
    async queryNode(query) {
        await this.init();
        const lowerQuery = query.toLowerCase();
        
        // Exact or partial match on name or generic name
        const matches = await this.db.medicine_knowledge
            .filter(med => {
                return med.name.toLowerCase().includes(lowerQuery) || 
                       med.genericName.toLowerCase().includes(lowerQuery) ||
                       (med.commonOcrErrors && med.commonOcrErrors.some(err => err.toLowerCase().includes(lowerQuery)));
            })
            .toArray();
            
        return matches;
    }

    /**
     * Find alternative brands with the same generic compound
     */
    async getTherapeuticSubstitutes(brandId) {
        await this.init();
        const medicine = await this.db.medicine_knowledge.get(brandId);
        if (!medicine || !medicine.alternativeBrands) return [];

        const substitutes = await this.db.medicine_knowledge
            .where('id').anyOf(medicine.alternativeBrands)
            .toArray();
            
        return substitutes;
    }

    /**
     * Fetch distributors in Andhra Pradesh for a given brand
     */
    async getAndhraDistributors(brandId) {
        await this.init();
        const medicine = await this.db.medicine_knowledge.get(brandId);
        if (!medicine || !medicine.andhraDistribution) return [];
        return medicine.andhraDistribution;
    }

    /**
     * Get medicine by its exact ID
     */
    async getMedicineById(id) {
        await this.init();
        return await this.db.medicine_knowledge.get(id);
    }
}

// Export singleton
export const medicineKnowledgeGraph = new MedicineKnowledgeGraph();
