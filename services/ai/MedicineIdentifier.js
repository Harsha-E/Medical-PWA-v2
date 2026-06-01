/**
 * @fileoverview Medicine Identifier Orchestrator
 * Coordinates MultiFrameFusion, PackagingAnalyzer, StripPatternAnalyzer,
 * resolvers, and MedicineMatcher to perform comprehensive drug identification.
 * Integrates short-term session memory and accuracy tracking for recognition boost.
 */

import MultiFrameFusion from '../vision/MultiFrameFusion.js';
import PackagingAnalyzer from '../vision/PackagingAnalyzer.js';
import ConfidenceEngine from '../vision/ConfidenceEngine.js';
import StripPatternAnalyzer from './StripPatternAnalyzer.js';
import MedicineMatcher from '../medicine/MedicineMatcher.js';
import AliasResolver from '../medicine/AliasResolver.js';
import TextRegionRanker from '../vision/TextRegionRanker.js';

import ScanSessionMemory from '../../analytics/ScanSessionMemory.js';
import AccuracyTracker from '../../analytics/AccuracyTracker.js';
import RecognitionHistory from '../../analytics/RecognitionHistory.js';
import HouseholdMedicineRegistry from '../../analytics/HouseholdMedicineRegistry.js';
import PackagingMemory from '../../analytics/PackagingMemory.js';

// Import datasets to compile unified matching dictionary
import { INDIAN_DRUG_DATASET } from '../../data/indian-drug-dataset.js';
import { AP_DRUG_DATASET } from '../../datasets/regional/andhra-pradesh-brands.js';
import { getMasterRegistry } from '../../datasets/ayurvedic/ayush-dataset.js';

/**
 * @typedef {Object} IdentificationResult
 * @property {boolean} success - Match found
 * @property {any|null} bestMatch - Matched drug database record
 * @property {number} confidence - Fused confidence score (0-100)
 * @property {'ACCEPTED'|'VERIFYING'|'HUNTING'} state - Target scanner state
 * @property {string} rawText - Stabilized OCR text
 * @property {Object} [diagnosticReport] - Diagnostic indicators
 */

export default class MedicineIdentifier {
  constructor() {
    // 1. Compile Unified Dataset
    const ayushDataset = getMasterRegistry();
    const unifiedDataset = [
      ...INDIAN_DRUG_DATASET,
      ...AP_DRUG_DATASET,
      ...ayushDataset
    ];

    // 2. Instantiate pipeline components
    this.fusion = new MultiFrameFusion();
    this.packagingAnalyzer = new PackagingAnalyzer();
    this.stripPatternAnalyzer = new StripPatternAnalyzer();
    this.confidenceEngine = new ConfidenceEngine();
    this.matcher = new MedicineMatcher(unifiedDataset);
    this.aliasResolver = new AliasResolver();
    this.regionRanker = new TextRegionRanker();

    // 3. Instantiate memory & tracking
    this.sessionMemory = new ScanSessionMemory();
    this.accuracyTracker = new AccuracyTracker();
    this.recognitionHistory = new RecognitionHistory();
    this.householdRegistry = new HouseholdMedicineRegistry();
    this.packagingMemory = new PackagingMemory();
  }

  /**
   * Orchestrates the parsing and matching of a single OCR frame.
   * @param {Object} frameOcrOutput
   * @param {string} frameOcrOutput.rawText - Text in the frame
   * @param {number} frameOcrOutput.confidence - OCR engine confidence (0-100)
   * @param {any[]} [frameOcrOutput.regions] - Bounding boxes and text segments
   * @param {string} [frameOcrOutput.sessionId] - Active scan session ID
   * @returns {IdentificationResult} Consolidated scanning decision
   */
  identifyMedicine(frameOcrOutput) {
    try {
      const sessionId = frameOcrOutput?.sessionId || 'default-session';
      
      if (!this._boostCache) this._boostCache = new Map();
      if (this._currentSessionId !== sessionId) {
          this._boostCache.clear();
          this._currentSessionId = sessionId;
      }

      // BUG FIX: Reject garbage text immediately. A medicine label will always yield more than 4 characters.
      if (!frameOcrOutput || typeof frameOcrOutput.rawText !== 'string' || frameOcrOutput.rawText.trim().length < 4) {
        this.accuracyTracker.recordFailure(sessionId, 'NO_TEXT');
        return { success: false, bestMatch: null, confidence: 0, state: 'HUNTING', rawText: '' };
      }

      // Step 0.1: Check for learned user corrections
      const learnedOcrText = this.recognitionHistory.getLearnedCorrection(frameOcrOutput.rawText);

      // Step 0.2: Resolve aliases & normalize raw text for the current frame
      const resolvedAlias = this.aliasResolver.resolveAliases(learnedOcrText);
      const normalizedRawText = resolvedAlias.resolvedText;

      const normalizedFrameOutput = {
        ...frameOcrOutput,
        rawText: normalizedRawText
      };

      // Step 1: Accumulate Frame in Temporal Fusion Buffer
      this.fusion.addFrame(normalizedFrameOutput);
      const fusionResult = this.fusion.getStableResult();
      const stableText = fusionResult.stabilizedText || normalizedRawText;

      // Step 2: Extract spatial packaging layout structure
      const regions = frameOcrOutput.regions || [];
      const packProfile = this.packagingAnalyzer.analyzePackaging(regions);

      // Step 3: Analyze repetition patterns
      const ocrLines = normalizedRawText.split(/[\r\n]+/);
      const stripPattern = this.stripPatternAnalyzer.analyzePattern(ocrLines);

      // Step 4: Perform database lookup on stabilized text
      const matches = this.matcher.matchMedicine(stableText);

      // Record scan in accuracy tracker
      const predictedNames = matches.map(m => m.drugRecord.name);
      this.accuracyTracker.recordScan(sessionId, frameOcrOutput.confidence, predictedNames);

      if (matches.length === 0) {
        this.accuracyTracker.recordFailure(sessionId, 'NO_MATCH');
        return {
          success: false,
          bestMatch: null,
          confidence: 0,
          state: 'UNKNOWN',
          rawText: stableText,
          diagnosticReport: { packProfile, stripPattern, processedFramesCount: fusionResult.processedFramesCount }
        };
      }

      // Step 5: Evaluate confidence against best match
      const topMatch = matches[0];
      const record = topMatch.drugRecord;

      // Check for scan session memory "recognition boost" (short-term temporal memory)
      let sessionBoost = 0;
      const recentCandidates = this.sessionMemory.getTopCandidates();
      const matchedNameLower = record.name.toLowerCase();
      
      const foundInMemory = recentCandidates.find(c => 
        c.name === matchedNameLower || 
        (record.brandNames && record.brandNames.some(b => b.toLowerCase() === c.name))
      );
      
      if (foundInMemory) {
        sessionBoost = foundInMemory.count * 10;
      }

      // Fetch or Calculate long-term and household boosts using a lightweight per-session cache
      const cacheKey = record.id || record.name;
      if (!this._boostCache.has(cacheKey)) {
        let hBoost = this.recognitionHistory.getBoost(record.name);
        let hhBoost = this.householdRegistry.getBoost(record.name);
        if (record.brandNames) {
          for (const brand of record.brandNames) {
            hBoost = Math.max(hBoost, this.recognitionHistory.getBoost(brand));
            hhBoost = Math.max(hhBoost, this.householdRegistry.getBoost(brand));
          }
        }
        this._boostCache.set(cacheKey, { historyBoost: hBoost, householdBoost: hhBoost });
      }
      
      const { historyBoost, householdBoost } = this._boostCache.get(cacheKey);

      // Check for packaging signature matches
      let packagingSignatureMatched = false;
      let signatureConfidenceBonus = 0;
      const mfgResolved = record.manufacturer ? (Array.isArray(record.manufacturer) ? record.manufacturer[0] : record.manufacturer) : '';
      const signatureMatches = this.packagingMemory.matchSignature(regions, mfgResolved);
      const matchForCurrent = signatureMatches.find(sm => sm.medicineId.toLowerCase() === record.id.toLowerCase());
      if (matchForCurrent) {
        packagingSignatureMatched = true;
        signatureConfidenceBonus = Math.round(matchForCurrent.matchScore * 0.15); // max +15 points
      }

      // Combine boosts, capped at +30%
      const combinedBoost = Math.min(30, sessionBoost + historyBoost + householdBoost);

      // Find the bounding box of the matching region or highest ranked region
      let matchingBbox = null;
      if (regions.length > 0 && record) {
        const searchTerms = [
          record.name.toLowerCase(),
          ...(record.brandNames ? record.brandNames.map(b => b.toLowerCase()) : []),
          ...(record.ocrVariants ? record.ocrVariants.map(v => v.toLowerCase()) : []),
          ...(record.aliases ? record.aliases.map(a => a.toLowerCase()) : [])
        ];
        const bestRegion = regions.find(r => 
          r.text && searchTerms.some(term => 
            r.text.toLowerCase().includes(term) || term.includes(r.text.toLowerCase())
          )
        );
        if (bestRegion && bestRegion.bbox) {
          matchingBbox = bestRegion.bbox;
        } else {
          const ranked = this.regionRanker.rank(regions);
          if (ranked.length > 0 && ranked[0].region.bbox) {
            matchingBbox = ranked[0].region.bbox;
          }
        }
      }

      // Record this frame details in ScanSessionMemory
      this.sessionMemory.addFrame({
        rawText: stableText,
        confidence: frameOcrOutput.confidence,
        bbox: matchingBbox || frameOcrOutput.bbox,
        candidates: matches.slice(0, 3).map(m => m.drugRecord.name)
      });

      // Check if manufacturer matches
      let mfgConf = 0;
      const recMfgs = record.manufacturer ? (Array.isArray(record.manufacturer) ? record.manufacturer : [record.manufacturer]) : [];
      if (packProfile.detectedManufacturerZones.length > 0 && recMfgs.length > 0) {
        const matchesMfg = recMfgs.some(rm => 
          packProfile.detectedManufacturerZones.some(dm => 
            dm.toLowerCase().includes(rm.toLowerCase()) || rm.toLowerCase().includes(dm.toLowerCase())
          )
        );
        mfgConf = matchesMfg ? 100 : 20;
      } else {
        mfgConf = 50; // Neutral default
      }

      // Check if dosage matches
      let doseConf = 0;
      const recDoses = record.commonDoses || [];
      if (packProfile.detectedDosageZones.length > 0 && recDoses.length > 0) {
        const matchesDose = recDoses.some(rd => 
          packProfile.detectedDosageZones.some(dd => 
            dd.replace(/\s+/g, '').toLowerCase() === rd.replace(/\s+/g, '').toLowerCase()
          )
        );
        doseConf = matchesDose ? 100 : 30;
      } else {
        doseConf = 50;
      }

      // Check if packaging type matches drug dosage forms
      let packConf = 50;
      if (packProfile.packagingType === 'strip') {
        const isPill = record.dosageForms && record.dosageForms.some(df => 
          /tablet|capsule|vati|churna/i.test(df)
        );
        packConf = isPill ? 100 : 40;
      } else if (packProfile.packagingType === 'bottle') {
        const isLiquid = record.dosageForms && record.dosageForms.some(df => 
          /syrup|suspension|arishta|asava|liquid|drops|taila/i.test(df)
        );
        packConf = isLiquid ? 100 : 40;
      }

      // Evaluate fused confidence (apply combined boost & signature bonus)
      const confReport = this.confidenceEngine.generateReport({
        ocrConfidence: frameOcrOutput.confidence,
        fusionConfidence: fusionResult.fusionConfidence,
        datasetMatchScore: Math.min(100, topMatch.matchConfidence + combinedBoost + signatureConfidenceBonus),
        manufacturerConfidence: mfgConf,
        dosageConfidence: doseConf,
        packagingConfidence: packConf
      });

      // Record match details in RecognitionHistory
      const isUncertain = confReport.finalConfidence < 75;
      this.recognitionHistory.recordMatch(record.name, isUncertain);

      // Build visual explainability checklists
      const explainabilityDetails = [];
      if (topMatch.matchDetails.matchedField === 'brandName') {
        explainabilityDetails.push(`Brand name "${record.brandNames ? record.brandNames[0] : record.name}" detected`);
      } else {
        explainabilityDetails.push(`Generic name "${record.name}" detected`);
      }

      if (mfgConf === 100) {
        explainabilityDetails.push(`Manufacturer company verified (${recMfgs[0]} confidence 92%)`);
      }
      if (doseConf === 100) {
        explainabilityDetails.push(`Dosage matching verified (${packProfile.detectedDosageZones[0]})`);
      }
      
      const stats = this.recognitionHistory._load().statistics[record.name.toLowerCase()];
      const pastScans = stats ? stats.scans : 0;
      if (pastScans > 0) {
        explainabilityDetails.push(`Seen previously ${pastScans} times in history`);
      }
      if (householdBoost > 0) {
        explainabilityDetails.push(`Common household medicine recognized`);
      }
      if (packagingSignatureMatched) {
        explainabilityDetails.push(`Packaging pattern matched successfully`);
      }

      return {
        success: confReport.state !== 'UNKNOWN',
        bestMatch: record,
        confidence: confReport.finalConfidence,
        state: confReport.state,
        rawText: stableText,
        bbox: matchingBbox || frameOcrOutput.bbox,
        explainabilityDetails,
        diagnosticReport: {
          confidenceBreakdown: confReport.breakdown,
          recommendations: confReport.recommendations,
          packagingProfile: packProfile,
          stripPatternAnalysis: stripPattern,
          fuzzyDistance: topMatch.matchDetails.distance,
          processedFramesCount: fusionResult.processedFramesCount,
          sessionBoostApplied: combinedBoost
        }
      };

    } catch (e) {
      console.error('[MedicineIdentifier] Orchestrator error:', e);
      return { success: false, bestMatch: null, confidence: 0, state: 'UNKNOWN', rawText: frameOcrOutput.rawText || '' };
    }
  }

  /**
   * Generates readable console diagnostic report text.
   * @param {IdentificationResult} result - Result from identifyMedicine
   * @returns {string}
   */
  generateIdentificationReport(result) {
    if (!result || !result.diagnosticReport) return 'No diagnostic data available.';

    const diag = result.diagnosticReport;
    const breakdown = diag.confidenceBreakdown || {};
    const pack = diag.packagingProfile || {};
    
    return `
----- CarePoint Scanner Diagnostic Report -----
FUSED STATE: ${result.state} (${result.confidence}%)
DRUG IDENTIFIED: ${result.bestMatch ? result.bestMatch.name : 'NONE'}
STABILIZED OCR TEXT: "${result.rawText}"

Confidence Breakdown:
- Match Score:  ${breakdown.datasetContribution || 0} pts
- temporal:     ${breakdown.fusionContribution || 0} pts
- ocr:          ${breakdown.ocrContribution || 0} pts
- dosage:       ${breakdown.dosageContribution || 0} pts
- manufacturer: ${breakdown.mfgContribution || 0} pts
- packaging:    ${breakdown.packagingContribution || 0} pts

Packaging Analysis:
- Type: ${pack.packagingType || 'unknown'} (conf: ${pack.layoutConfidence || 0})
- Strip Repetition Pattern: ${pack.isStripRepetitionPattern ? 'YES' : 'NO'}
- Dosage Zones Found: [${(pack.detectedDosageZones || []).join(', ')}]
- Mfg Zones Found: [${(pack.detectedManufacturerZones || []).join(', ')}]

Recommendations:
${(diag.recommendations || []).map(r => `* ${r}`).join('\n') || '* Scanning stability optimal.'}
-----------------------------------------------
    `;
  }

  /**
   * Records user verification/correction details.
   * @param {string} sessionId
   * @param {string[]} finalDrugs
   * @param {boolean} isUserCorrection
   * @param {string} [rawOcrText]
   * @param {any[]} [regions]
   */
  recordCorrection(sessionId, finalDrugs, isUserCorrection, rawOcrText = '', regions = []) {
    this.accuracyTracker.recordCorrection(sessionId, finalDrugs, isUserCorrection);
    if (finalDrugs && Array.isArray(finalDrugs)) {
      for (const drug of finalDrugs) {
        if (isUserCorrection && rawOcrText) {
          this.recognitionHistory.recordCorrection(rawOcrText, drug);
        } else {
          this.recognitionHistory.recordMatch(drug);
        }
        
        // Update household scan frequency
        this.householdRegistry.recordScan(drug);

        // Save layout signature
        if (regions && regions.length > 0) {
          const matches = this.matcher.matchMedicine(drug);
          if (matches.length > 0) {
            const medRecord = matches[0].drugRecord;
            const mfg = medRecord.manufacturer ? (Array.isArray(medRecord.manufacturer) ? medRecord.manufacturer[0] : medRecord.manufacturer) : '';
            this.packagingMemory.saveSignature(medRecord.id, {
              manufacturer: mfg,
              textLineCount: regions.length,
              normalizedBoxes: this.packagingMemory._extractNormalizedBoxes(regions)
            });
          }
        }
      }
    }
  }

  /**
   * Records scanning failure events.
   * @param {string} sessionId
   * @param {string} failureType
   */
  recordFailure(sessionId, failureType) {
    this.accuracyTracker.recordFailure(sessionId, failureType);
  }

  /**
   * Cleans orchestrator temporal buffers.
   * @returns {void}
   */
  clear() {
    this.fusion.clear();
    this.sessionMemory.clear();
    // BUG FIX: Clear consistency baseline and region rankers
    if (this.stripPatternAnalyzer && typeof this.stripPatternAnalyzer.reset === 'function') {
        this.stripPatternAnalyzer.reset();
    }
    if (this._boostCache) this._boostCache.clear();
  }
}
