/**
 * @fileoverview Packaging Analyzer
 * Extracts structural and spatial layout intelligence from medicine packaging (strips, boxes, bottles).
 * Leverages OCR regions, repetitive text arrays, and MediaPipe bounding boxes.
 */

import TextRegionRanker from './TextRegionRanker.js';

/**
 * @typedef {Object} PackagingProfile
 * @property {string} packagingType - Guess: 'strip', 'box', 'bottle', or 'unknown'
 * @property {boolean} isStripRepetitionPattern - Does the layout repeat text (common in blister strips)?
 * @property {string[]} detectedDosageZones - Extracted dosages
 * @property {string[]} detectedManufacturerZones - Extracted manufacturers
 * @property {number} layoutConfidence - Structural confidence score (0-1)
 * @property {Object} spatialMetadata - Layout properties
 */

export default class PackagingAnalyzer {
  constructor() {
    this.ranker = new TextRegionRanker();
  }

  /**
   * Main orchestrator to analyze text blocks and detection context.
   * @param {import('./TextRegionRanker.js').OcrRegion[]} ocrRegions - OCR outputs
   * @param {any} [detectionData] - MediaPipe object detection results
   * @returns {PackagingProfile} Full packaging intelligence profile
   */
  analyzePackaging(ocrRegions, detectionData = null) {
    if (!Array.isArray(ocrRegions)) {
      throw new Error('[PackagingAnalyzer] ocrRegions must be a valid array.');
    }

    const features = this.extractPackagingFeatures(ocrRegions);
    const ranked = this.rankRegions(ocrRegions, features);
    const profile = this.generateProfile(features, ranked, detectionData);

    return profile;
  }

  /**
   * Rank text regions by likelihood of containing primary medicine names.
   * @param {import('./TextRegionRanker.js').OcrRegion[]} ocrRegions
   * @param {Object} [featuresContext] - Pre-extracted features to guide ranking
   * @returns {import('./TextRegionRanker.js').RankedRegion[]}
   */
  rankRegions(ocrRegions, featuresContext = {}) {
    return this.ranker.rank(ocrRegions, {
      knownDosages: featuresContext.dosageZones || [],
      knownManufacturers: featuresContext.manufacturerZones || []
    });
  }

  /**
   * Extracts layout, lexical, and structural features from OCR blocks.
   * @param {import('./TextRegionRanker.js').OcrRegion[]} ocrRegions
   * @returns {Object} Extracted raw features map
   */
  extractPackagingFeatures(ocrRegions) {
    const dosageZones = [];
    const manufacturerZones = [];
    const wordCounts = new Map();
    let totalWords = 0;

    const dosageRegex = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|mcg|i\.u\.)\b/gi;
    const mfgKeywords = /\b(?:ltd|limited|labs|laboratories|pharma|pharmaceuticals|cipla|sun|lupin|reddy)\b/i;

    for (const region of ocrRegions) {
      const text = region.text.trim();
      
      // Extract dosages
      const doseMatches = text.match(dosageRegex);
      if (doseMatches) {
        dosageZones.push(...doseMatches);
      }

      // Extract potential manufacturers
      if (mfgKeywords.test(text)) {
        manufacturerZones.push(text);
      }

      // Track word frequency to analyze strip print repetition
      const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      for (const w of words) {
        totalWords++;
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }
    }

    // Determine repeating strip pattern (at least some words repeat highly)
    let repetitionScore = 0;
    const repeatedWords = [];
    
    if (totalWords > 0) {
      let repeatedCount = 0;
      for (const [word, count] of wordCounts.entries()) {
        if (count >= 2) {
          repeatedCount += count;
          repeatedWords.push(word);
        }
      }
      repetitionScore = repeatedCount / totalWords;
    }

    // Attempt spatial spacing repetition
    const repeatsSpatially = this.detectRepetition(ocrRegions);

    return {
      dosageZones: [...new Set(dosageZones)],
      manufacturerZones: [...new Set(manufacturerZones)],
      repeatedWords,
      repetitionScore,
      repeatsSpatially
    };
  }

  /**
   * Analyzes spatial coordinates to detect regular strip print repetition.
   * @param {import('./TextRegionRanker.js').OcrRegion[]} ocrRegions
   * @returns {boolean} True if text is repeating at regular spatial offsets
   */
  detectRepetition(ocrRegions) {
    const validBoxes = ocrRegions
      .filter(r => r.bbox && typeof r.bbox.y0 === 'number')
      .map(r => r.bbox);

    if (validBoxes.length < 3) return false;

    // Sort by vertical position
    validBoxes.sort((a, b) => a.y0 - b.y0);

    const verticalOffsets = [];
    for (let i = 1; i < validBoxes.length; i++) {
      verticalOffsets.push(validBoxes[i].y0 - validBoxes[i - 1].y0);
    }

    // Check standard deviation of offsets. If low, it repeats at regular spacing.
    const average = verticalOffsets.reduce((a, b) => a + b, 0) / verticalOffsets.length;
    if (average === 0) return false;

    const variance = verticalOffsets.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / verticalOffsets.length;
    const stdDev = Math.sqrt(variance);

    // Standard deviation / average ratio is the coefficient of variation
    const coefOfVariation = stdDev / average;

    // If CV is low (e.g. < 0.25), the spacing between blocks is highly uniform (typical of pill strips)
    return coefOfVariation < 0.25;
  }

  /**
   * Compiles the final packaging profile object.
   * @param {Object} features - Extracted features
   * @param {import('./TextRegionRanker.js').RankedRegion[]} rankedRegions - Scored regions
   * @param {any} [detectionData] - External detection data (e.g. MediaPipe label)
   * @returns {PackagingProfile}
   */
  generateProfile(features, rankedRegions, detectionData = null) {
    let packagingType = 'unknown';
    let layoutConfidence = 0.5;

    // 1. Determine type from MediaPipe bounding label if available
    if (detectionData && detectionData.categories && detectionData.categories.length > 0) {
      const mediaPipeLabel = detectionData.categories[0].categoryName.toLowerCase();
      if (['strip', 'blister', 'pills'].some(k => mediaPipeLabel.includes(k))) {
        packagingType = 'strip';
        layoutConfidence = 0.9;
      } else if (['bottle', 'jar', 'vial'].some(k => mediaPipeLabel.includes(k))) {
        packagingType = 'bottle';
        layoutConfidence = 0.95;
      } else if (['box', 'carton', 'pack'].some(k => mediaPipeLabel.includes(k))) {
        packagingType = 'box';
        layoutConfidence = 0.85;
      }
    }

    // 2. Fallback or adjustment based on text heuristics
    if (packagingType === 'unknown') {
      if (features.repeatsSpatially || features.repetitionScore > 0.4) {
        packagingType = 'strip';
        layoutConfidence = 0.8;
      } else if (features.dosageZones.length > 0 && features.manufacturerZones.length > 0) {
        // High text layout structures usually mean structured box cartons
        packagingType = 'box';
        layoutConfidence = 0.6;
      }
    }

    const isStripRepetitionPattern = (packagingType === 'strip' && (features.repeatsSpatially || features.repetitionScore > 0.3));

    return {
      packagingType,
      isStripRepetitionPattern,
      detectedDosageZones: features.dosageZones,
      detectedManufacturerZones: features.manufacturerZones,
      layoutConfidence,
      spatialMetadata: {
        totalRegionsCount: rankedRegions.length,
        averageTextLength: rankedRegions.length > 0
          ? rankedRegions.reduce((sum, item) => sum + item.region.text.length, 0) / rankedRegions.length
          : 0,
        hasRepetitiveVerticalLayout: features.repeatsSpatially
      }
    };
  }
}
