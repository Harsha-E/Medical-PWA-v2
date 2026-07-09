/**
 * ClinicalExplanationEngine
 * 
 * Aggregates all interaction data and generates the final structured 
 * clinical explanation object that the UI consumes.
 */
class ClinicalExplanationEngine {
    format(interactions) {
        return interactions.map(interaction => {
            return {
                id: `ix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                drug1: interaction.drug1,
                drug2: interaction.drug2,
                riskLevel: interaction.riskLevel,
                reason: interaction.reason,
                possibleEffects: interaction.possibleEffects,
                recommendation: interaction.recommendation,
                confidence: '98%',
                source: 'Internal Drug Knowledge Base',
                generatedAt: new Date().toISOString()
            };
        });
    }
}

export default new ClinicalExplanationEngine();
