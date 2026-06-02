import { liveEvidencePipeline } from './LiveEvidencePipeline.js';

export class ExplainabilityMode {
    constructor() {
        this.isActive = false;
    }

    /**
     * Toggles the "Teacher Mode" which exposes the underlying reasoning pipelines
     */
    toggleMode() {
        this.isActive = !this.isActive;
        liveEvidencePipeline.toggleVisibility(this.isActive);
        
        console.log(`[ExplainabilityMode] Teacher mode is now ${this.isActive ? 'ACTIVE' : 'INACTIVE'}`);
        return this.isActive;
    }

    /**
     * Translates a final match result into a human-readable visual explanation
     */
    generateMatchExplanation(medicineId, evidenceSummary) {
        // In a real system, this would map the evidenceSummary to a visual tree
        // For MIOS, we push to the live pipeline
        
        if (!this.isActive) return null;

        // Convert the evidence summary into pipeline updates
        const updates = {
            contours: evidenceSummary.contoursFound ? 'pass' : 'fail',
            shape: evidenceSummary.shapeMatched ? 'pass' : 'working',
            text: evidenceSummary.ocrConfidence > 0.8 ? 'pass' : 'fail',
            dosage: evidenceSummary.dosageVerified ? 'pass' : 'fail',
            packaging: evidenceSummary.packagingMatched ? 'pass' : 'working'
        };

        liveEvidencePipeline.updatePipelineCheckpoints(updates);
        return updates;
    }
}

export const explainabilityMode = new ExplainabilityMode();
