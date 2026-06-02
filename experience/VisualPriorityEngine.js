export class VisualPriorityEngine {
    
    /**
     * Translates raw numerical data into simple, visual-first states.
     * Enforces the "never expose raw percentages" rule.
     * @param {number} confidenceScore - Range 0.0 to 1.0
     * @returns {Object} State object for the UI to render
     */
    getVisualStatus(confidenceScore) {
        if (confidenceScore >= 0.90) {
            return {
                statusText: 'Verified',
                icon: '✅',
                colorVar: 'var(--frosted-mint)',
                actionRequired: false
            };
        } else if (confidenceScore >= 0.70) {
            return {
                statusText: 'Likely Match',
                icon: '👀',
                colorVar: 'var(--soft-cyan)',
                actionRequired: true,
                suggestedAction: 'Please check the dosage on the package.'
            };
        } else if (confidenceScore >= 0.40) {
            return {
                statusText: 'Need More Views',
                icon: '🔄',
                colorVar: '#ffd166', // Warning yellow
                actionRequired: true,
                suggestedAction: 'Show the other side of the strip.'
            };
        } else {
            return {
                statusText: 'Cannot Confirm',
                icon: '❌',
                colorVar: '#ef476f', // Soft red
                actionRequired: true,
                suggestedAction: 'Strip is too damaged or not in database.'
            };
        }
    }
}

export const visualPriorityEngine = new VisualPriorityEngine();
