/**
 * CanonicalContextBuilder.js - MedCheck Clinical Context Builder & Validation Engine
 * 
 * Centralized service for:
 * 1. Building transient runtime-stamped Canonical Patient Context for DIC requests (/api/v1/analyze).
 * 2. Deriving dynamic sectional health completeness scores (never stored in DB).
 * 3. Validating required vs recommended onboarding fields and determining resume step index.
 */

export class CanonicalContextBuilder {
  /**
   * Builds the runtime-generated Canonical Patient Context snapshot for DIC /api/v1/analyze payloads.
   * @param {Object} userProfile - Raw profile document from state / Firestore
   * @param {Array} currentMedications - Active medication list
   * @returns {Object} Canonical DIC payload matching FastAPI PatientContext schema
   */
  static build(userProfile, currentMedications = []) {
    const p = userProfile?.profile || {};
    
    // Compute exact age from DOB
    let age = null;
    if (p.dob) {
      const dobDate = new Date(p.dob);
      if (!isNaN(dobDate.getTime())) {
        const today = new Date();
        age = today.getFullYear() - dobDate.getFullYear();
        const m = today.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age--;
      }
    }

    // Extract organ function values safely from object or string
    const extractVal = (field, fallback = 'UNKNOWN') => {
      if (!field) return fallback;
      if (typeof field === 'object' && field.value) return field.value;
      if (typeof field === 'string') return field;
      return fallback;
    };

    // Extract active conditions list as standardized strings/codes
    const conditions = (p.active_conditions || []).map(c => {
      if (typeof c === 'string') return c;
      return c.code || c.display || c.id || c.name;
    }).filter(Boolean);

    // Extract allergies as standardized strings
    const allergies = (p.allergies || []).map(a => {
      if (typeof a === 'string') return a;
      return a.name || a.allergy;
    }).filter(Boolean);

    // Extract current medications as drug name strings
    const meds = (currentMedications || []).map(m => {
      if (typeof m === 'string') return m;
      return m.name || m.brandName || m.genericName;
    }).filter(Boolean);

    return {
      patient_id: userProfile?.userId || 'anonymous_patient',
      name: p.fullName || p.name || 'Anonymous Patient',
      age: age,
      sex: p.sex || 'UNKNOWN',
      height_cm: p.height_cm ? parseFloat(p.height_cm) : null,
      weight_kg: p.weight_kg ? parseFloat(p.weight_kg) : null,
      blood_group: p.bloodType || 'UNKNOWN',
      renal_clearance: extractVal(p.renal_clearance, 'UNKNOWN'),
      hepatic_impairment: extractVal(p.hepatic_impairment, 'UNKNOWN'),
      pregnancy_status: extractVal(p.pregnancy_status, 'UNKNOWN'),
      active_conditions: conditions,
      allergies: allergies,
      lifestyle: {
        smoking: p.lifestyle?.smoking || 'UNKNOWN',
        tobacco_chewing: p.lifestyle?.tobacco_chewing || 'UNKNOWN',
        alcohol: p.lifestyle?.alcohol || 'UNKNOWN'
      },
      current_medications: meds,
      medication_baseline: p.medication_baseline || 'UNKNOWN',
      analysis_timestamp: new Date().toISOString(),
      profile_version: userProfile?.profileVersion || 2
    };
  }

  /**
   * Dynamically calculates actionable section-by-section health completion status.
   * NEVER stored in DB to avoid stale data.
   * @param {Object} userProfile 
   * @param {Array} currentMedications 
   * @returns {Object} Sectional health completion status
   */
  static calculateCompleteness(userProfile, currentMedications = []) {
    const p = userProfile?.profile || {};
    
    const isIdentityComplete = !!(p.fullName && p.dob && p.sex && p.sex !== 'UNKNOWN');
    const isEmergencyComplete = !!(p.emergencyName && p.emergencyPhone && p.emergencyRelationship);
    const isConsentGiven = !!userProfile?.consentGiven;

    const isMedicalComplete = !!(p.renal_clearance && p.hepatic_impairment && 
      (typeof p.renal_clearance === 'object' ? p.renal_clearance.value : p.renal_clearance) !== 'UNKNOWN');

    const isLifestyleComplete = !!(p.lifestyle && 
      p.lifestyle.smoking !== 'UNKNOWN' && p.lifestyle.alcohol !== 'UNKNOWN');

    const isMedsComplete = currentMedications.length > 0 || p.medication_baseline === 'NO';

    return {
      identity: {
        complete: isIdentityComplete,
        status: isIdentityComplete ? 'COMPLETE' : 'INCOMPLETE',
        label: 'Identity & Demographics'
      },
      medical: {
        complete: isMedicalComplete,
        status: isMedicalComplete ? 'COMPLETE' : 'MISSING_ORGAN_FUNCTION',
        label: 'Medical & Organ Function'
      },
      lifestyle: {
        complete: isLifestyleComplete,
        status: isLifestyleComplete ? 'COMPLETE' : 'MISSING_LIFESTYLE',
        label: 'Lifestyle Factors'
      },
      emergency: {
        complete: isEmergencyComplete,
        status: isEmergencyComplete ? 'COMPLETE' : 'INCOMPLETE',
        label: 'Emergency Contact'
      },
      medications: {
        complete: isMedsComplete,
        status: isMedsComplete ? 'COMPLETE' : 'EMPTY_LIST',
        label: 'Medication Baseline'
      },
      overallPercentage: Math.round(
        ((isIdentityComplete ? 25 : 0) + 
         (isMedicalComplete ? 25 : 0) + 
         (isLifestyleComplete ? 20 : 0) + 
         (isEmergencyComplete ? 15 : 0) + 
         (isMedsComplete ? 15 : 0))
      )
    };
  }

  /**
   * Validates profile completeness to decide if onboarding is required and at what resume step.
   * Strictly separates REQUIRED (mandatory) fields from RECOMMENDED (skippable) fields.
   * @param {Object} userProfile 
   * @returns {Object} { isComplete: boolean, step: number }
   */
  static validateProfile(userProfile) {
    if (!userProfile) return { isComplete: false, step: 1 };
    
    // Check schema version and complete flag
    if (!userProfile.onboardingComplete) {
      const p = userProfile.profile || {};
      
      // Step 1: Welcome & Consent
      if (!userProfile.consentGiven) return { isComplete: false, step: 1 };
      
      // Step 2: Personal Identity (Required: Full Name, DOB, Biological Sex)
      if (!p.fullName || !p.dob || !p.sex || p.sex === 'UNKNOWN') return { isComplete: false, step: 2 };
      
      // Recommended steps (3 to 8) can be completed or skipped
      if (!p.active_conditions) return { isComplete: false, step: 3 };
      if (!p.allergies) return { isComplete: false, step: 4 };
      if (!p.lifestyle) return { isComplete: false, step: 5 };
      if (!p.renal_clearance || !p.hepatic_impairment) return { isComplete: false, step: 6 };
      if (!p.height_cm && !p.weight_kg && !p.bloodType) return { isComplete: false, step: 7 };
      if (!p.family_history) return { isComplete: false, step: 8 };

      // Step 9: Emergency Contact (Required: Name, Phone, Relationship)
      if (!p.emergencyName || !p.emergencyPhone || !p.emergencyRelationship) return { isComplete: false, step: 9 };

      // Step 10: Avatar Selection (Required if missing)
      if (!p.avatar) return { isComplete: false, step: 10 };

      // Step 11: Review & Finish
      return { isComplete: false, step: 11 };
    }

    return { isComplete: true, step: 11 };
  }
}

export default CanonicalContextBuilder;
