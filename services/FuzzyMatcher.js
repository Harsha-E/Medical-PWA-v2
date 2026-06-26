/**
 * FuzzyMatcher.js
 * Deployment-Grade OCR Error Correction Engine.
 * Replaces simple distance metric with a multi-feature weighted scoring algorithm.
 */

export default class FuzzyMatcher {
    // Standard Levenshtein Distance
    static getDistance(a, b) {
        if (!a || !b) return 0;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }

    // Convert distance to a similarity percentage (0.0 to 1.0)
    static getSimilarity(a, b) {
        if (!a || !b) return 0;
        a = a.toLowerCase().trim();
        b = b.toLowerCase().trim();
        if (a === b) return 1.0;
        
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) return 1.0;
        
        const dist = this.getDistance(a, b);
        
        // Negative length penalty: If lengths are drastically different, penalize heavily
        if (Math.abs(a.length - b.length) > maxLen * 0.4) {
             return Math.max(0, (1 - (dist / maxLen)) - 0.2);
        }
        
        return 1 - (dist / maxLen);
    }

    /**
     * Finds the closest matching drug by scoring the ENTIRE JSON payload against every dimension of the database object.
     * @param {Object} aiPayload - The full parsed JSON from the VisionWorker
     * @param {Array} dataset - The full IndexedDB medicine dataset
     */
    static resolveComplexPayload(aiPayload, dataset) {
        if (!aiPayload || !dataset || dataset.length === 0) return null;
        
        // Extract features from OCR payload
        const ocrBrand = (aiPayload.brandName || aiPayload.medicationName || aiPayload.name || "").toLowerCase().trim();
        const ocrGeneric = (aiPayload.genericName || "").toLowerCase().trim();
        const ocrDosage = (aiPayload.dosage || aiPayload.strength || "").toLowerCase().trim();
        const ocrForm = (aiPayload.form || aiPayload.dosageForm || "").toLowerCase().trim();
        const ocrManufacturer = (aiPayload.manufacturer || "").toLowerCase().trim();

        let bestMatch = null;
        let highestScore = 0;
        const CONFIDENCE_THRESHOLD = 50; // Minimum score required to accept a fuzzy match

        for (const drug of dataset) {
            let score = 0;

            // 1. Array Unpacking & Name Scoring (Max ~60 points)
            // We search through ALL possible names (name, brandNames[], aliases[], genericName)
            const possibleDbBrands = [drug.name];
            if (Array.isArray(drug.brandNames)) possibleDbBrands.push(...drug.brandNames);
            if (Array.isArray(drug.aliases)) possibleDbBrands.push(...drug.aliases);
            if (Array.isArray(drug.ocrVariants)) possibleDbBrands.push(...drug.ocrVariants);

            let bestBrandSim = 0;
            if (ocrBrand) {
                for (const dbName of possibleDbBrands) {
                    if (!dbName) continue;
                    const dbNameLower = dbName.toLowerCase();
                    
                    // Exact Substring Boost
                    if (ocrBrand.length >= 4 && (dbNameLower.includes(ocrBrand) || ocrBrand.includes(dbNameLower))) {
                        bestBrandSim = Math.max(bestBrandSim, 0.95); // Huge boost for substrings (e.g. "Fepanil" in "Fepanil 500")
                    } else {
                        const sim = this.getSimilarity(ocrBrand, dbNameLower);
                        bestBrandSim = Math.max(bestBrandSim, sim);
                    }
                }
            }

            // Score Generic Name
            let genericSim = 0;
            if (ocrGeneric && drug.genericName) {
                genericSim = this.getSimilarity(ocrGeneric, drug.genericName);
            }

            // Combine Name Scores (Brand is heavily weighted, Generic is fallback)
            let nameScore = 0;
            if (ocrBrand && !ocrGeneric) {
                nameScore = bestBrandSim * 60; 
            } else if (!ocrBrand && ocrGeneric) {
                nameScore = genericSim * 60;
            } else if (ocrBrand && ocrGeneric) {
                // If AI found both, average them but prioritize brand
                nameScore = (bestBrandSim * 40) + (genericSim * 20);
            }
            score += nameScore;

            // 2. Dosage Alignment Boost (Max 15 points)
            if (ocrDosage && Array.isArray(drug.commonDoses)) {
                // Extract just the numbers to compare (e.g. "500 mg" -> "500")
                const ocrNum = ocrDosage.replace(/[^0-9.]/g, '');
                if (ocrNum) {
                    const matchesDosage = drug.commonDoses.some(dbDose => {
                        return dbDose.replace(/[^0-9.]/g, '') === ocrNum;
                    });
                    if (matchesDosage) score += 15;
                }
            }

            // 3. Form Factor Matching (Max 10 points)
            if (ocrForm && Array.isArray(drug.dosageForms)) {
                const matchesForm = drug.dosageForms.some(f => {
                    return this.getSimilarity(ocrForm, f.toLowerCase()) > 0.7; // Allow slight typos like "Tablets" vs "Tablet"
                });
                if (matchesForm) score += 10;
            }

            // 4. Manufacturer Intersection (Max 15 points)
            if (ocrManufacturer && Array.isArray(drug.manufacturer)) {
                const matchesMfg = drug.manufacturer.some(m => {
                    return m.toLowerCase().includes(ocrManufacturer) || ocrManufacturer.includes(m.toLowerCase()) || this.getSimilarity(ocrManufacturer, m.toLowerCase()) > 0.7;
                });
                if (matchesMfg) score += 15;
            }

            // Check if this is the new best
            if (score > highestScore) {
                highestScore = score;
                bestMatch = drug;
            }
            
            // Optimization: If score is incredibly high early on, we can short circuit
            if (highestScore >= 95) break;
        }

        if (highestScore >= CONFIDENCE_THRESHOLD) {
            console.log(`[FuzzyMatcher] Resolving payload to ${bestMatch.name || bestMatch.genericName} with Confidence Score: ${highestScore.toFixed(1)}/100`);
            return bestMatch;
        } else {
            console.warn(`[FuzzyMatcher] Failed to resolve. Highest score was ${highestScore.toFixed(1)}/100, below threshold of ${CONFIDENCE_THRESHOLD}`);
            return null;
        }
    }
}
