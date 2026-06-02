export class AmbiguityResolver {
    
    /**
     * Resolves phonetically similar or identically spelled candidates 
     * by cross-referencing physical attributes or dosages
     * @param {Array} candidates - List of candidate medicine objects
     * @param {Object} rawOcr - The raw OCR text fragments
     * @param {Object} physicalFeatures - Bounding box or estimated layout features
     */
    resolveAmbiguousClass(candidates, rawOcr, physicalFeatures = null) {
        if (!candidates || candidates.length <= 1) {
            return candidates; // No ambiguity
        }

        console.log(`[AmbiguityResolver] Resolving ambiguity between ${candidates.length} candidates.`);

        // Example: Dolo 650 vs Dolo 500
        // We look specifically for dosage numbers in the raw OCR
        const ocrString = Array.isArray(rawOcr) ? rawOcr.join(' ') : (rawOcr || '');
        
        let resolvedCandidates = candidates.map(candidate => {
            let scoreBoost = 0;
            
            // Check if dosage matches OCR text
            if (candidate.strength && ocrString.includes(candidate.strength.replace(/[^0-9]/g, ''))) {
                scoreBoost += 0.5; // High confidence boost if number matches
            }

            // Check if physical layout matches expected layout
            if (physicalFeatures && physicalFeatures.estimatedLayout && candidate.blisterLayout) {
                if (physicalFeatures.estimatedLayout === candidate.blisterLayout) {
                    scoreBoost += 0.3;
                }
            }

            return {
                ...candidate,
                ambiguityResolutionScore: scoreBoost
            };
        });

        // Sort by the newly calculated resolution score
        resolvedCandidates.sort((a, b) => b.ambiguityResolutionScore - a.ambiguityResolutionScore);
        
        return resolvedCandidates;
    }
}

export const ambiguityResolver = new AmbiguityResolver();
