/**
 * FuzzyMatcher.js
 * Deployment-Grade OCR Error Correction.
 * Uses Levenshtein Distance to snap broken OCR text to the real medical database.
 */

export default class FuzzyMatcher {
    // Calculate edit distance between two strings
    static getDistance(a, b) {
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

    /**
     * Finds the closest matching drug in the dataset, tolerating typos and OCR cutoffs (substrings).
     */
    static resolveOCR(ocrText, dataset) {
        if (!ocrText || !dataset) return null;
        
        const target = ocrText.toLowerCase().trim();
        let bestMatch = null;
        let lowestDistance = Infinity;

        // Iterate through massive dataset
        for (const drug of dataset) {
            // Check all possible naming fields
            const possibleNames = [
                drug.name ? drug.name.toLowerCase() : "",
                drug.brandName ? drug.brandName.toLowerCase() : "",
                drug.genericName ? drug.genericName.toLowerCase() : ""
            ].filter(Boolean);

            for (const dbName of possibleNames) {
                // 1. Substring Match (e.g., OCR sees "APEN", Database has "MEGAPEN")
                // Only allow this if the OCR text is reasonably long (>= 4 chars) to prevent random false positives
                if (target.length >= 4 && dbName.includes(target)) {
                    // Treat direct substring as a perfect match if nothing better is found
                    if (0 < lowestDistance) {
                        lowestDistance = 0;
                        bestMatch = drug;
                    }
                    break; 
                }

                // 2. Standard Levenshtein Distance
                const distance = this.getDistance(target, dbName);
                
                // Allow up to 3 character mistakes (e.g. 5YMBICORT -> symbicort)
                // Or allow 4 mistakes if the word is very long
                const maxAllowedDistance = target.length > 7 ? 4 : 3;

                if (distance < lowestDistance && distance <= maxAllowedDistance) {
                    lowestDistance = distance;
                    bestMatch = drug;
                }
                
                if (lowestDistance === 0) break; // Perfect match found
            }
            if (lowestDistance === 0) break; // Stop outer loop
        }

        return bestMatch; // Returns the exact database object
    }
}
