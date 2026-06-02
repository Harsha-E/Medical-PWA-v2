import { dexieManager } from '../../storage/DexieManager.js';

export class TherapeuticResolver {
    constructor() {
        this.dbManager = dexieManager;
    }

    async init() {
        this.db = await this.dbManager.getDB();
    }

    /**
     * Identifies the therapeutic category for a given medicine
     * @param {string} medicineId - The ID of the medicine
     */
    async getDrugCategory(medicineId) {
        await this.init();
        const medicine = await this.db.medicine_knowledge.get(medicineId);
        
        if (medicine && medicine.therapeuticCategory) {
            return medicine.therapeuticCategory;
        }
        return 'Unknown Category';
    }

    /**
     * Retrieves known drug-drug interactions for this active compound
     * @param {string} genericName - The generic compound name
     */
    async getInteractionProfile(genericName) {
        // In a complete system, this would query a dedicated interactions table
        // For MIOS, we return a mocked high-level profile
        const lowerGeneric = genericName.toLowerCase();
        
        let interactions = [];
        let warnings = [];

        if (lowerGeneric.includes('paracetamol') || lowerGeneric.includes('acetaminophen')) {
            warnings.push('Avoid alcohol. Liver toxicity risk if dosage exceeds 4000mg/day.');
            interactions.push('Warfarin (may increase bleeding risk)');
        } else if (lowerGeneric.includes('ibuprofen')) {
            warnings.push('Take with food. May cause stomach bleeding.');
            interactions.push('Aspirin (reduces effectiveness)');
            interactions.push('Blood pressure medications (may reduce effect)');
        }

        return {
            hasWarnings: warnings.length > 0,
            warnings: warnings,
            interactions: interactions
        };
    }
}

export const therapeuticResolver = new TherapeuticResolver();
