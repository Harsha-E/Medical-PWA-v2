/**
 * RecommendationEngine
 * 
 * Generates actionable clinical recommendations based on Risk Level and Effects.
 */
class RecommendationEngine {
    generate(interactions) {
        return interactions.map(interaction => {
            const recommendation = this._getRecommendation(interaction.riskLevel);
            return {
                ...interaction,
                recommendation: recommendation
            };
        });
    }

    _getRecommendation(riskLevel) {
        switch (riskLevel) {
            case 'High Risk':
                return 'Consult your physician before combining these medicines.';
            case 'Medium Risk':
                return 'Monitor closely for side effects. Inform your doctor at your next visit.';
            case 'Low Risk':
                return 'Safe to take together under normal circumstances.';
            default:
                return 'Consult your pharmacist for guidance.';
        }
    }
}

export default new RecommendationEngine();
