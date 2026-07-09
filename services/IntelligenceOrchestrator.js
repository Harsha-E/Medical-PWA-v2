/**
 * IntelligenceOrchestrator
 * 
 * Coordinates the full intelligence pipeline:
 * 1. Medicine Normalization
 * 2. Interaction Engine (IndexedDB + Dataset)
 * 3. Risk Classification
 * 4. Recommendation Generation
 * 5. Clinical Explanation Generation
 */
import MedicineNormalizer from './MedicineNormalizer.js';
import InteractionEngine from './InteractionEngine.js';
import RiskAssessmentEngine from './RiskAssessmentEngine.js';
import RecommendationEngine from './RecommendationEngine.js';
import ClinicalExplanationEngine from './ClinicalExplanationEngine.js';

class IntelligenceOrchestrator {
    constructor() {
        this.interactionEngine = new InteractionEngine();
    }

    async init() {
        if (!this.interactionEngine.isReady) {
            await this.interactionEngine.init();
        }
    }

    /**
     * Runs the full intelligence pipeline for newly extracted medicines.
     * @param {Array} newMedicines Raw medicines from AIExtractionService
     * @param {Object} patientProfile Profile containing activeMeds, allergies, activeDiseases
     * @returns {Array} List of structured Clinical Explanations
     */
    async analyzePrescription(newMedicines, patientProfile) {
        await this.init();

        // 1. Medicine Normalization
        const normalizedMeds = MedicineNormalizer.normalize(newMedicines);

        // 2. Interaction Engine
        const rawWarnings = [];
        for (const med of normalizedMeds) {
            const warnings = await this.interactionEngine.analyze(med.normalizedName, patientProfile);
            warnings.forEach(w => {
                rawWarnings.push({
                    drug1: med.normalizedName,
                    // Parse out drug2 from text or assume it's part of the interaction warning
                    // The old engine text says "Interaction with X: ..."
                    drug2: this._extractDrug2FromWarning(w.text) || 'Existing Medication',
                    severity: w.severity,
                    text: w.text,
                    type: w.type
                });
            });
        }

        // Map old warnings to the new structured interaction object for the pipeline
        const interactions = rawWarnings.map(w => ({
            drug1: w.drug1,
            drug2: w.drug2,
            reason: w.text
        }));

        if (interactions.length === 0) return [];

        // 3. Risk Classification
        const assessed = RiskAssessmentEngine.assess(interactions);

        // 4. Recommendation Generation
        const recommended = RecommendationEngine.generate(assessed);

        // 5. Clinical Explanation Formatting
        const finalExplanations = ClinicalExplanationEngine.format(recommended);

        // 6. Timeline Persistence (Save to Ledger)
        await this._persistToLedger(finalExplanations, newMedicines);

        // 7. Family Sync
        await this._triggerFamilySync(finalExplanations);

        return finalExplanations;
    }

    async _persistToLedger(explanations, rawMedicines) {
        try {
            const { default: db } = await import('../core/db.js');
            const { default: state } = await import('../core/state.js');
            const userId = state.user?.uid || 'local-user';

            const record = {
                type: 'Scan & Interaction Check',
                date: new Date().toISOString().split('T')[0],
                title: `Scanned ${rawMedicines.length} medications`,
                provider: 'AI Intelligence',
                userId,
                updatedAt: new Date().toISOString(),
                logicalClock: Date.now(),
                isDeleted: false,
                metadata: {
                    medicines: rawMedicines,
                    interactions: explanations
                }
            };

            await db.history.add(record);
        } catch (e) {
            console.error('[IntelligenceOrchestrator] Persistence failed:', e);
        }
    }

    async _triggerFamilySync(explanations) {
        try {
            const { default: PeerMesh } = await import('./PeerMesh.js');
            const mesh = PeerMesh.getInstance();
            if (mesh && mesh.isReady) {
                mesh.broadcast({
                    type: 'CLINICAL_ALERT',
                    payload: explanations
                });
            }
        } catch (e) {
            console.warn('[IntelligenceOrchestrator] Family sync deferred to offline queue:', e);
        }
    }

    _extractDrug2FromWarning(text) {
        // e.g., "Interaction with Aspirin: Both medications..."
        const match = text.match(/Interaction with (.*?):/);
        return match ? match[1] : null;
    }
}

export default new IntelligenceOrchestrator();
