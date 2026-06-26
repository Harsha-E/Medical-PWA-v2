/**
 * @fileoverview Brand Priority Guard
 * Post-filter that intercepts matching results to ensure a generic component 
 * is not returned as the primary drug match if a valid brand name was also identified.
 */

export class BrandPriorityGuard {
  /**
   * Applies the guard rules to a list of ranked match candidates.
   * @param {Object[]} candidates - Array of match candidates
   * @param {Object} query - The original parsed query containing OCR text
   * @returns {Object[]} The filtered and re-ranked list of candidates
   */
  static apply(candidates, query) {
    if (!candidates || candidates.length === 0) return candidates;

    // Check if the OCR text explicitly contains any of the top brand names
    const topCandidate = candidates[0];
    
    // If the top candidate is ALREADY a brand name, no action needed.
    if (this._isBrandName(topCandidate.drugRecord, query.rawText)) {
      return candidates;
    }

    // Top candidate is likely a generic. Look for a brand name candidate further down.
    // If we find a brand name candidate that was suppressed (e.g. scored lower because of generics),
    // and its generic composition matches the generic we found, swap them!
    
    const brandCandidateIndex = candidates.findIndex(cand => 
      cand !== topCandidate && 
      this._isBrandName(cand.drugRecord, query.rawText) &&
      this._sharesGenericComposition(cand.drugRecord, topCandidate.drugRecord)
    );

    if (brandCandidateIndex > 0) {
      console.warn(`[BrandPriorityGuard] Blocked generic promotion: Demoting ${topCandidate.drugRecord.name} in favor of brand ${candidates[brandCandidateIndex].drugRecord.name}`);
      
      // Extract the brand candidate
      const brandCandidate = candidates[brandCandidateIndex];
      
      // Boost its confidence so it becomes the primary match
      brandCandidate.matchConfidence = Math.min(topCandidate.matchConfidence + 10, 100);
      
      // Remove it from its old position and put it at the top
      const newCandidates = [...candidates];
      newCandidates.splice(brandCandidateIndex, 1);
      newCandidates.unshift(brandCandidate);
      
      return newCandidates;
    }

    return candidates;
  }

  /**
   * Evaluates whether the candidate record acts as a brand name that was actually found in text.
   */
  static _isBrandName(record, rawText) {
    if (!record || !rawText) return false;
    // Assume a record is a Brand if it has a brandName field that isn't identical to its generic name
    const bName = record.brandName || record.name;
    const gName = record.genericName || '';
    
    // It's a brand if the brand name differs from generic name
    const isStructurallyBrand = bName.toLowerCase() !== gName.toLowerCase();
    
    // Was it actually in the text?
    const textLower = rawText.toLowerCase();
    const isInText = textLower.includes(bName.toLowerCase());
    
    return isStructurallyBrand && isInText;
  }

  /**
   * Checks if two drug records share the same active ingredient.
   */
  static _sharesGenericComposition(recordA, recordB) {
    const genericA = (recordA.genericName || '').toLowerCase();
    const genericB = (recordB.genericName || recordB.name || '').toLowerCase();
    
    if (!genericA || !genericB) return false;
    
    // If one generic name contains the other (e.g., "Budesonide" in "Budesonide Formoterol Fumarate")
    return genericA.includes(genericB) || genericB.includes(genericA);
  }
}
