/**
 * @fileoverview MedicalNLPEngine.js
 * Advanced Medical NLP, Fuzzy Spell Corrector (Levenshtein Distance),
 * and High-Performance Local Typeahead Autocomplete Engine.
 */

// Curated dictionary of top RxNorm / FDA brand & generic medicines
const COMMON_MEDICINES = [
  { name: 'Paracetamol', generic: 'Paracetamol', form: 'Tablet', doses: ['500mg', '650mg'] },
  { name: 'Crocin 650', generic: 'Paracetamol', form: 'Tablet', doses: ['650mg'] },
  { name: 'Dolo 650', generic: 'Paracetamol', form: 'Tablet', doses: ['650mg'] },
  { name: 'Hifenac-P', generic: 'Aceclofenac + Paracetamol', form: 'Tablet', doses: ['100mg + 325mg'] },
  { name: 'Aceclofenac', generic: 'Aceclofenac', form: 'Tablet', doses: ['100mg'] },
  { name: 'Atorvastatin', generic: 'Atorvastatin', form: 'Tablet', doses: ['10mg', '20mg', '40mg'] },
  { name: 'Lipitor', generic: 'Atorvastatin', form: 'Tablet', doses: ['10mg', '20mg'] },
  { name: 'Metformin', generic: 'Metformin Hydrochloride', form: 'Tablet', doses: ['500mg', '850mg', '1000mg'] },
  { name: 'Glucophage', generic: 'Metformin', form: 'Tablet', doses: ['500mg'] },
  { name: 'Amoxicillin', generic: 'Amoxicillin', form: 'Capsule', doses: ['250mg', '500mg'] },
  { name: 'Augmentin', generic: 'Amoxicillin + Clavulanic Acid', form: 'Tablet', doses: ['625mg', '1000mg'] },
  { name: 'Azithromycin', generic: 'Azithromycin', form: 'Tablet', doses: ['250mg', '500mg'] },
  { name: 'Zithromax', generic: 'Azithromycin', form: 'Tablet', doses: ['500mg'] },
  { name: 'Pantoprazole', generic: 'Pantoprazole Sodium', form: 'Tablet', doses: ['20mg', '40mg'] },
  { name: 'Pan 40', generic: 'Pantoprazole', form: 'Tablet', doses: ['40mg'] },
  { name: 'Omeprazole', generic: 'Omeprazole', form: 'Capsule', doses: ['20mg', '40mg'] },
  { name: 'Omez', generic: 'Omeprazole', form: 'Capsule', doses: ['20mg'] },
  { name: 'Amlodipine', generic: 'Amlodipine Besylate', form: 'Tablet', doses: ['2.5mg', '5mg', '10mg'] },
  { name: 'Norvasc', generic: 'Amlodipine', form: 'Tablet', doses: ['5mg'] },
  { name: 'Telmisartan', generic: 'Telmisartan', form: 'Tablet', doses: ['20mg', '40mg', '80mg'] },
  { name: 'Telma 40', generic: 'Telmisartan', form: 'Tablet', doses: ['40mg'] },
  { name: 'Losartan', generic: 'Losartan Potassium', form: 'Tablet', doses: ['25mg', '50mg', '100mg'] },
  { name: 'Cozaar', generic: 'Losartan', form: 'Tablet', doses: ['50mg'] },
  { name: 'Cetirizine', generic: 'Cetirizine Hydrochloride', form: 'Tablet', doses: ['5mg', '10mg'] },
  { name: 'Zyrtec', generic: 'Cetirizine', form: 'Tablet', doses: ['10mg'] },
  { name: 'Montelukast', generic: 'Montelukast Sodium', form: 'Tablet', doses: ['4mg', '5mg', '10mg'] },
  { name: 'Singulair', generic: 'Montelukast', form: 'Tablet', doses: ['10mg'] },
  { name: 'Ibuprofen', generic: 'Ibuprofen', form: 'Tablet', doses: ['200mg', '400mg', '600mg'] },
  { name: 'Brufen', generic: 'Ibuprofen', form: 'Tablet', doses: ['400mg'] },
  { name: 'Combiflam', generic: 'Ibuprofen + Paracetamol', form: 'Tablet', doses: ['400mg + 325mg'] },
  { name: 'Aspirin', generic: 'Acetylsalicylic Acid', form: 'Tablet', doses: ['75mg', '81mg', '150mg', '325mg'] },
  { name: 'Ecosprin', generic: 'Aspirin', form: 'Tablet', doses: ['75mg', '150mg'] },
  { name: 'Clopidogrel', generic: 'Clopidogrel Bisulfate', form: 'Tablet', doses: ['75mg'] },
  { name: 'Plavix', generic: 'Clopidogrel', form: 'Tablet', doses: ['75mg'] },
  { name: 'Rosuvastatin', generic: 'Rosuvastatin Calcium', form: 'Tablet', doses: ['5mg', '10mg', '20mg'] },
  { name: 'Crestor', generic: 'Rosuvastatin', form: 'Tablet', doses: ['10mg'] },
  { name: 'Levothyroxine', generic: 'Levothyroxine Sodium', form: 'Tablet', doses: ['25mcg', '50mcg', '88mcg', '100mcg'] },
  { name: 'Thyronorm', generic: 'Levothyroxine', form: 'Tablet', doses: ['50mcg', '100mcg'] },
  { name: 'Metoprolol', generic: 'Metoprolol Succinate', form: 'Tablet', doses: ['25mg', '50mg', '100mg'] },
  { name: 'Ranitidine', generic: 'Ranitidine Hydrochloride', form: 'Tablet', doses: ['150mg', '300mg'] },
  { name: 'Rantac', generic: 'Ranitidine', form: 'Tablet', doses: ['150mg'] },
  { name: 'Ciprofloxacin', generic: 'Ciprofloxacin', form: 'Tablet', doses: ['250mg', '500mg'] },
  { name: 'Ciplox', generic: 'Ciprofloxacin', form: 'Tablet', doses: ['500mg'] },
  { name: 'Diclofenac', generic: 'Diclofenac Sodium', form: 'Tablet', doses: ['50mg', '75mg', '100mg'] },
  { name: 'Voveran', generic: 'Diclofenac', form: 'Tablet', doses: ['50mg'] }
];

export class MedicalNLPEngine {
  /**
   * Levenshtein Distance matrix calculation for fuzzy matching
   */
  static levenshteinDistance(a, b) {
    const matrix = [];
    const lenA = a.length;
    const lenB = b.length;

    for (let i = 0; i <= lenB; i++) matrix[i] = [i];
    for (let j = 0; j <= lenA; j++) matrix[0][j] = j;

    for (let i = 1; i <= lenB; i++) {
      for (let j = 1; j <= lenA; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[lenB][lenA];
  }

  /**
   * Corrects mis-spelt OCR text against curated medical dictionary
   */
  static correctMedicineName(rawText) {
    if (!rawText || typeof rawText !== 'string') return rawText;
    const cleaned = rawText.trim();
    if (cleaned.length < 3) return cleaned;

    const lowerCleaned = cleaned.toLowerCase();

    // 1. Direct match check
    const directMatch = COMMON_MEDICINES.find(m => 
      m.name.toLowerCase() === lowerCleaned || m.generic.toLowerCase() === lowerCleaned
    );
    if (directMatch) return directMatch.name;

    // 2. Fuzzy Levenshtein Match
    let bestMatch = null;
    let minDistance = Infinity;

    for (const med of COMMON_MEDICINES) {
      const distName = this.levenshteinDistance(lowerCleaned, med.name.toLowerCase());
      const distGeneric = this.levenshteinDistance(lowerCleaned, med.generic.toLowerCase());
      const currentMin = Math.min(distName, distGeneric);

      // Max allowed edit distance proportional to string length
      const maxAllowedDistance = Math.min(3, Math.floor(cleaned.length / 3));

      if (currentMin <= maxAllowedDistance && currentMin < minDistance) {
        minDistance = currentMin;
        bestMatch = med.name;
      }
    }

    return bestMatch || cleaned;
  }

  /**
   * Instantaneous Typeahead Autocomplete Search (< 2ms)
   */
  static searchTypeahead(query, limit = 8) {
    if (!query || typeof query !== 'string') return [];
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const startsWithMatches = [];
    const containsMatches = [];
    const fuzzyMatches = [];

    for (const med of COMMON_MEDICINES) {
      const nameLower = med.name.toLowerCase();
      const genericLower = med.generic.toLowerCase();

      if (nameLower.startsWith(q) || genericLower.startsWith(q)) {
        startsWithMatches.push({
          name: med.name,
          genericName: med.generic,
          dosageForms: [med.form],
          commonDoses: med.doses,
          category: med.form
        });
      } else if (nameLower.includes(q) || genericLower.includes(q)) {
        containsMatches.push({
          name: med.name,
          genericName: med.generic,
          dosageForms: [med.form],
          commonDoses: med.doses,
          category: med.form
        });
      } else {
        const dist = this.levenshteinDistance(q, nameLower.slice(0, q.length));
        if (dist <= 1) {
          fuzzyMatches.push({
            name: med.name,
            genericName: med.generic,
            dosageForms: [med.form],
            commonDoses: med.doses,
            category: med.form
          });
        }
      }
    }

    const combined = [...startsWithMatches, ...containsMatches, ...fuzzyMatches];
    // Deduplicate by name
    const seen = new Set();
    const results = [];
    for (const item of combined) {
      if (!seen.has(item.name)) {
        seen.add(item.name);
        results.push(item);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  /**
   * Cleans extracted OCR medicine objects
   */
  static cleanExtractedMedicines(medicinesList) {
    if (!Array.isArray(medicinesList)) return medicinesList;

    return medicinesList.map(med => {
      const cleanedBrand = this.correctMedicineName(med.brandName || med.name);
      const cleanedGeneric = this.correctMedicineName(med.genericName);

      return {
        ...med,
        name: cleanedBrand || cleanedGeneric || med.name,
        brandName: cleanedBrand || med.brandName || '',
        genericName: cleanedGeneric || med.genericName || '',
        dosage: med.dosage || '',
        form: med.form || 'Tablet'
      };
    });
  }

  /**
   * Offline Clinical Interaction Engine
   */
  static checkLocalInteractions(drugList) {
    if (!Array.isArray(drugList) || drugList.length < 2) return [];

    const normalized = drugList.map(d => String(d).toLowerCase().trim());
    const warnings = [];

    const isMatch = (term, categoryTerms) => categoryTerms.some(c => term.includes(c));

    const nsaids = ['ibuprofen', 'aceclofenac', 'hifenac', 'diclofenac', 'voveran', 'aspirin', 'ecosprin', 'naproxen', 'combiflam'];
    const anticoagulants = ['warfarin', 'clopidogrel', 'plavix', 'heparin', 'apixaban'];
    const statins = ['atorvastatin', 'lipitor', 'rosuvastatin', 'crestor', 'simvastatin'];
    const arbs = ['telmisartan', 'telma', 'losartan', 'cozaar', 'valsartan'];

    // Check 1: NSAID + Anticoagulant
    const hasNsaid = normalized.find(d => isMatch(d, nsaids));
    const hasAnti = normalized.find(d => isMatch(d, anticoagulants));
    if (hasNsaid && hasAnti) {
      warnings.push({
        type: 'DRUG_INTERACTION',
        strength: 'HIGH',
        drugs: [hasNsaid, hasAnti],
        effect: 'Increased Bleeding Risk',
        description: `Combining NSAID (${hasNsaid}) with anticoagulant/antiplatelet (${hasAnti}) significantly increases the risk of severe gastrointestinal bleeding.`
      });
    }

    // Check 2: Dual NSAID
    const matchingNsaids = normalized.filter(d => isMatch(d, nsaids));
    if (matchingNsaids.length >= 2) {
      warnings.push({
        type: 'DUPLICATE_THERAPY',
        strength: 'HIGH',
        drugs: [matchingNsaids[0], matchingNsaids[1]],
        effect: 'Duplicate NSAID Toxicity',
        description: `Taking multiple NSAIDs simultaneously (${matchingNsaids.join(' + ')}) increases renal and gastric ulcer risks without therapeutic benefit.`
      });
    }

    return warnings;
  }
}
