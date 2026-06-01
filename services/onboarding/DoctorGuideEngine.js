/**
 * @fileoverview Doctor Guide Engine Service
 * Translates clinical terms and medical jargon into simple, plain English
 * that a 12-year-old or grandparent can easily understand.
 */

const JARGON_DICTIONARY = {
  'adherence': 'taking medicines regularly',
  'compliance': 'taking medicines as directed',
  'persistence': 'keeping up with your medicine schedule',
  'engagement': 'recent reports',
  'biomarker trend': 'health check progress',
  'medication event': 'taking medicine',
  'contraindication': 'medicines that do not mix well',
  'dyspnea': 'difficulty breathing',
  'hypertension': 'high blood pressure',
  'hypotension': 'low blood pressure',
  'hyperglycemia': 'high blood sugar',
  'hypoglycemia': 'low blood sugar',
  'tachycardia': 'fast heart rate',
  'bradycardia': 'slow heart rate',
  'renal impairment': 'kidney issues',
  'hepatic impairment': 'liver issues',
  'contraindicated': 'not safe to take together'
};

export default class DoctorGuideEngine {
  /**
   * Translates a complex medical term or phrase to simple English.
   * @param {string} phrase - Complex clinical string
   * @returns {string} Simplified translation
   */
  translate(phrase) {
    if (!phrase) return '';
    const clean = phrase.trim().toLowerCase();
    
    // Check exact match
    if (JARGON_DICTIONARY[clean]) {
      return JARGON_DICTIONARY[clean];
    }

    // Check substring replacements
    let simplified = phrase;
    for (const [jargon, simple] of Object.entries(JARGON_DICTIONARY)) {
      const regex = new RegExp(`\\b${jargon}\\b`, 'gi');
      simplified = simplified.replace(regex, simple);
    }

    return simplified;
  }
}
