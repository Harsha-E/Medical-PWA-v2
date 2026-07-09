/**
 * RiskAssessmentEngine
 * 
 * Classifies raw interactions into Risk Levels (High, Medium, Low)
 * and generates possible effects.
 */
class RiskAssessmentEngine {
    assess(interactions) {
        return interactions.map(interaction => {
            const level = this._determineRiskLevel(interaction.drug1, interaction.drug2);
            const effects = this._determineEffects(interaction.drug1, interaction.drug2);
            
            return {
                ...interaction,
                riskLevel: level,
                possibleEffects: effects
            };
        });
    }

    _determineRiskLevel(drug1, drug2) {
        const pair = [drug1.toLowerCase(), drug2.toLowerCase()].sort().join('+');
        
        const riskMap = {
            'aspirin+warfarin': 'High Risk',
            'atorvastatin+warfarin': 'Medium Risk',
            'amoxicillin+metformin': 'Low Risk'
        };

        return riskMap[pair] || 'Medium Risk';
    }

    _determineEffects(drug1, drug2) {
        const pair = [drug1.toLowerCase(), drug2.toLowerCase()].sort().join('+');
        
        const effectsMap = {
            'aspirin+warfarin': ['Internal bleeding', 'Easy bruising', 'Nosebleeds'],
            'atorvastatin+warfarin': ['Muscle pain', 'Elevated liver enzymes'],
            'amoxicillin+metformin': ['Mild gastrointestinal upset']
        };

        return effectsMap[pair] || ['Unknown side effects'];
    }
}

export default new RiskAssessmentEngine();
