/**
 * @fileoverview Confidence Engine
 * Fuses various confidence dimensions (OCR, temporal fusion, dataset matching,
 * dosage/manufacturer recognition, packaging type matching) into a single final score
 * and determines scanner auto-lock state.
 */

/**
 * @typedef {Object} ConfidenceInputs
 * @property {number} ocrConfidence - Raw confidence from OCR engine (0-100)
 * @property {number} fusionConfidence - Stabilization confidence from MultiFrameFusion (0-100)
 * @property {number} datasetMatchScore - Score from dataset lookup (0-100)
 * @property {number} [manufacturerConfidence] - Success of manufacturer verification (0-100)
 * @property {number} [dosageConfidence] - Success of dosage verification (0-100)
 * @property {number} [packagingConfidence] - Matching of packaging features (0-100)
 */

/**
 * @typedef {Object} ConfidenceReport
 * @property {number} finalConfidence - Weighted aggregate confidence (0-100)
 * @property {'ACCEPTED'|'VERIFYING'|'HUNTING'} state - Auto-lock action state
 * @property {Record<string, number>} breakdown - Explanation of weights applied
 * @property {string[]} recommendations - List of tips to improve confidence
 */

export default class ConfidenceEngine {
  /**
   * Initializes confidence weights and threshold bounds.
   * @param {Object} [options]
   * @param {number} [options.acceptedThreshold=90] - Score required to auto-lock
   * @param {number} [options.probableThreshold=75] - Score required to suggest lock
   * @param {number} [options.verifyingThreshold=50] - Score required to start acquiring lock
   */
  constructor(options = {}) {
    this.acceptedThreshold = options.acceptedThreshold || 90;
    this.probableThreshold = options.probableThreshold || 75;
    this.verifyingThreshold = options.verifyingThreshold || 50;

    // Weights must sum to 1.0
    this.weights = {
      datasetMatchScore: 0.35,
      fusionConfidence: 0.20,
      ocrConfidence: 0.15,
      dosageConfidence: 0.10,
      manufacturerConfidence: 0.10,
      packagingConfidence: 0.10
    };
  }

  /**
   * Computes weighted confidence score from multiple inputs.
   * @param {ConfidenceInputs} inputs
   * @returns {number} Fused score (0-100)
   */
  calculateConfidence(inputs) {
    if (!inputs) return 0;

    let score = 0;
    
    // Extract inputs and apply fallbacks
    const ocrConf = typeof inputs.ocrConfidence === 'number' ? inputs.ocrConfidence : 0;
    const fusionConf = typeof inputs.fusionConfidence === 'number' ? inputs.fusionConfidence : 0;
    const datasetScore = typeof inputs.datasetMatchScore === 'number' ? inputs.datasetMatchScore : 0;
    const dosageConf = typeof inputs.dosageConfidence === 'number' ? inputs.dosageConfidence : 0;
    const mfgConf = typeof inputs.manufacturerConfidence === 'number' ? inputs.manufacturerConfidence : 0;
    const packConf = typeof inputs.packagingConfidence === 'number' ? inputs.packagingConfidence : 0;

    // Weighted accumulation
    score += datasetScore * this.weights.datasetMatchScore;
    score += fusionConf * this.weights.fusionConfidence;
    score += ocrConf * this.weights.ocrConfidence;
    score += dosageConf * this.weights.dosageConfidence;
    score += mfgConf * this.weights.manufacturerConfidence;
    score += packConf * this.weights.packagingConfidence;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Evaluates state category based on confidence level.
   * @param {number} finalConfidence - Consolidated confidence score
   * @returns {'ACCEPTED'|'PROBABLE'|'VERIFYING'|'UNKNOWN'}
   */
  determineState(finalConfidence) {
    if (finalConfidence >= this.acceptedThreshold) {
      return 'ACCEPTED';
    } else if (finalConfidence >= this.probableThreshold) {
      return 'PROBABLE';
    } else if (finalConfidence >= this.verifyingThreshold) {
      return 'VERIFYING';
    }
    return 'UNKNOWN';
  }

  /**
   * Generates a structural confidence explanation breakdown.
   * @param {ConfidenceInputs} inputs
   * @returns {ConfidenceReport} Full audit report
   */
  generateReport(inputs) {
    const finalConfidence = this.calculateConfidence(inputs);
    const state = this.determineState(finalConfidence);
    const recommendations = [];

    // Auditing low components to generate recommendations
    if ((inputs.ocrConfidence || 0) < 60) {
      recommendations.push('Improve lighting or camera focus to clear up characters.');
    }
    if ((inputs.fusionConfidence || 0) < 50) {
      recommendations.push('Hold the camera steady for 1-2 seconds to capture more frames.');
    }
    if ((inputs.datasetMatchScore || 0) < 70) {
      recommendations.push('Ensure the medicine name is fully visible and not blocked.');
    }
    if (!(inputs.dosageConfidence) || inputs.dosageConfidence < 50) {
      recommendations.push('Position the dosage labels (e.g. 500mg, 10ml) inside the scanning zone.');
    }
    if (!(inputs.manufacturerConfidence) || inputs.manufacturerConfidence < 50) {
      recommendations.push('Locate and display the pharmaceutical company logo or text.');
    }

    if (recommendations.length === 0 && state !== 'ACCEPTED') {
      recommendations.push('Adjust viewing angle to minimize reflections on plastic blister sheets.');
    }

    return {
      finalConfidence,
      state,
      breakdown: {
        ocrContribution: Math.round((inputs.ocrConfidence || 0) * this.weights.ocrConfidence),
        fusionContribution: Math.round((inputs.fusionConfidence || 0) * this.weights.fusionConfidence),
        datasetContribution: Math.round((inputs.datasetMatchScore || 0) * this.weights.datasetMatchScore),
        dosageContribution: Math.round((inputs.dosageConfidence || 0) * this.weights.dosageConfidence),
        mfgContribution: Math.round((inputs.manufacturerConfidence || 0) * this.weights.manufacturerConfidence),
        packagingContribution: Math.round((inputs.packagingConfidence || 0) * this.weights.packagingConfidence)
      },
      recommendations
    };
  }
}
