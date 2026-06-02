import { dexieManager } from '../../storage/DexieManager.js';

export class VisualMedicineResolver {
    constructor() {
        this.dbManager = dexieManager;
    }

    async init() {
        this.db = await this.dbManager.getDB();
    }

    /**
     * Finds candidates based entirely on visual physical attributes
     * @param {string} shape - Expected shape (e.g., 'oval', 'round')
     * @param {string} color - Expected color (e.g., 'white', 'yellow')
     * @param {string} blisterLayout - Optional blister arrangement (e.g., '5x2')
     */
    async resolveVisualMatch(shape, color, blisterLayout = null) {
        await this.init();
        
        let query = this.db.medicine_knowledge.filter(med => {
            let match = true;
            if (shape && med.tabletShape !== shape) match = false;
            if (color && med.tabletColor !== color) match = false;
            return match;
        });

        let visualCandidates = await query.toArray();

        // Cross-reference with packaging layout if provided
        if (blisterLayout && visualCandidates.length > 0) {
            const candidateIds = visualCandidates.map(c => c.id);
            const packagingRecords = await this.db.packaging_reference
                .where('medicineId').anyOf(candidateIds)
                .toArray();
                
            // Filter candidates that also have matching packaging
            visualCandidates = visualCandidates.filter(candidate => {
                const pkg = packagingRecords.find(p => p.medicineId === candidate.id);
                return pkg && pkg.blisterLayout === blisterLayout;
            });
        }

        return visualCandidates;
    }
}

export const visualMedicineResolver = new VisualMedicineResolver();
