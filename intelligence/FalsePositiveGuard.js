export class FalsePositiveGuard {
    
    /**
     * Verifies that the extracted dosage matches the expected generic record
     * to prevent dangerous false positives (e.g., confusing 50mg with 500mg)
     * @param {string} brandName - The identified brand name
     * @param {string} extractedDosage - The dosage text extracted from OCR
     * @param {Object} genericRecord - The database record for the candidate
     */
    verifyBrandDosage(brandName, extractedDosage, genericRecord) {
        if (!genericRecord || !genericRecord.strength) {
            // If the database doesn't enforce a strength, we pass it but log a warning
            console.warn(`[FalsePositiveGuard] No strength requirement for ${brandName}`);
            return { valid: true, riskLevel: 'LOW' };
        }

        if (!extractedDosage) {
            // We identified the brand but couldn't read the dosage. This is risky.
            return { 
                valid: false, 
                riskLevel: 'HIGH',
                message: `Could not verify dosage for ${brandName}. Requires manual check.` 
            };
        }

        // Clean up both strings for comparison (remove spaces, make lowercase)
        const expectedNumeric = genericRecord.strength.replace(/[^0-9]/g, '');
        const extractedNumeric = extractedDosage.replace(/[^0-9]/g, '');

        if (expectedNumeric === extractedNumeric) {
            return { valid: true, riskLevel: 'NONE' };
        } else {
            // Mismatch detected. Block the match.
            console.error(`[FalsePositiveGuard] Dosage mismatch! Expected ${expectedNumeric}, got ${extractedNumeric}`);
            return { 
                valid: false, 
                riskLevel: 'CRITICAL',
                message: `Dosage mismatch. System expected ${genericRecord.strength}.` 
            };
        }
    }
}

export const falsePositiveGuard = new FalsePositiveGuard();
