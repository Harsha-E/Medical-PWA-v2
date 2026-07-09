/**
 * MedicineNormalizer
 * 
 * Standardizes extracted medicine data against an internal dictionary or rule set.
 * Maps raw names to generic forms if needed.
 */
class MedicineNormalizer {
    normalize(medicines) {
        if (!Array.isArray(medicines)) return [];

        return medicines.map(med => {
            const rawName = med.name || med.brandName || med.genericName || 'Unknown';
            const genericMap = this._getGenericMapping(rawName);

            return {
                id: med.id || `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                originalName: rawName,
                normalizedName: genericMap.normalized,
                drugClass: genericMap.class,
                dosage: med.dosage || 'Unknown',
                frequency: med.frequency || 'As directed',
                timeOfDay: med.timeOfDay || 'Unknown',
                instructions: med.instructions || '',
                isActive: true,
                prescriptionId: med.prescriptionId || null,
                extractedAt: med.extractedAt || new Date().toISOString()
            };
        });
    }

    _getGenericMapping(name) {
        const lower = name.toLowerCase();
        
        // Hackathon Demo Dictionary
        if (lower.includes('atorvastatin') || lower.includes('lipitor')) {
            return { normalized: 'Atorvastatin', class: 'Statin' };
        }
        if (lower.includes('metformin') || lower.includes('glucophage')) {
            return { normalized: 'Metformin', class: 'Biguanide' };
        }
        if (lower.includes('warfarin') || lower.includes('coumadin')) {
            return { normalized: 'Warfarin', class: 'Anticoagulant' };
        }
        if (lower.includes('aspirin') || lower.includes('ecosprin')) {
            return { normalized: 'Aspirin', class: 'NSAID / Antiplatelet' };
        }
        if (lower.includes('amoxicillin')) {
            return { normalized: 'Amoxicillin', class: 'Antibiotic' };
        }

        return { normalized: name, class: 'Unknown Class' };
    }
}

export default new MedicineNormalizer();
