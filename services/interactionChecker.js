/**
 * @fileoverview Interaction Checker Module
 * Deeply compares two or more extracted medicine JSON objects to flag contraindications based on active ingredients.
 */

export function checkInteractions(medicines) {
    if (!Array.isArray(medicines) || medicines.length < 2) {
        return { hasInteractions: false, warnings: [] };
    }

    const warnings = [];

    for (let i = 0; i < medicines.length; i++) {
        for (let j = i + 1; j < medicines.length; j++) {
            const medA = medicines[i];
            const medB = medicines[j];

            // 1. Duplicate Therapy Check (Same Active Category)
            if (medA.category && medA.category === medB.category) {
                warnings.push({
                    level: 'HIGH',
                    type: 'DUPLICATE_THERAPY',
                    drugs: [medA.name, medB.name],
                    description: `Both medications belong to the same therapeutic category (${medA.category}). This increases the risk of adverse effects and overdose.`
                });
            }

            // 2. Common Cross-Category Contraindications
            const categoryPair = [medA.category, medB.category].sort();
            
            // Example: NSAID + Antiplatelet/Anticoagulant -> High Bleeding Risk
            if (categoryPair.includes('NSAID') && 
               (categoryPair.includes('Antiplatelet') || categoryPair.includes('Anticoagulant'))) {
                warnings.push({
                    level: 'SEVERE',
                    type: 'DRUG_DRUG_INTERACTION',
                    drugs: [medA.name, medB.name],
                    description: 'Combining NSAIDs with blood thinners significantly increases the risk of gastrointestinal bleeding.'
                });
            }

            // Example: ACE Inhibitor / ARB + Diuretic (e.g., Spironolactone) -> Hyperkalemia Risk
            const isRAAS = categoryPair.includes('ACE Inhibitor') || categoryPair.includes('ARB');
            if (isRAAS && categoryPair.includes('Diuretic')) {
                warnings.push({
                    level: 'MODERATE',
                    type: 'DRUG_DRUG_INTERACTION',
                    drugs: [medA.name, medB.name],
                    description: 'Combining these antihypertensives can alter kidney function and electrolyte levels (e.g., potassium). Monitor closely.'
                });
            }

            // 3. Deep check against explicit contraindications list in the JSON objects
            if (medA.contraindications && medB.name) {
                const contraindicatedByA = medA.contraindications.some(c => 
                    c.toLowerCase().includes(medB.name.toLowerCase()) || 
                    (medB.category && c.toLowerCase().includes(medB.category.toLowerCase()))
                );
                if (contraindicatedByA) {
                    warnings.push({
                        level: 'SEVERE',
                        type: 'EXPLICIT_CONTRAINDICATION',
                        drugs: [medA.name, medB.name],
                        description: `${medB.name} or its category is explicitly contraindicated for users taking ${medA.name}.`
                    });
                }
            }
            if (medB.contraindications && medA.name) {
                const contraindicatedByB = medB.contraindications.some(c => 
                    c.toLowerCase().includes(medA.name.toLowerCase()) || 
                    (medA.category && c.toLowerCase().includes(medA.category.toLowerCase()))
                );
                if (contraindicatedByB) {
                    warnings.push({
                        level: 'SEVERE',
                        type: 'EXPLICIT_CONTRAINDICATION',
                        drugs: [medA.name, medB.name],
                        description: `${medA.name} or its category is explicitly contraindicated for users taking ${medB.name}.`
                    });
                }
            }
        }
    }

    // Deduplicate warnings
    const uniqueWarnings = Array.from(new Set(warnings.map(w => JSON.stringify(w)))).map(w => JSON.parse(w));

    return {
        hasInteractions: uniqueWarnings.length > 0,
        warnings: uniqueWarnings
    };
}
