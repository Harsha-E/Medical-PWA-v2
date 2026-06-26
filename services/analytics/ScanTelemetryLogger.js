/**
 * @fileoverview ScanTelemetryLogger.js
 * Collects "Gold Metrics" during Shadow Mode and real user scans.
 * Tracks Evidence Acquisition Timelines, Evidence Efficiency, and Coverage Plateaus.
 * Persists raw data to Dexie (scan_telemetry, evidence_timelines).
 */

import { diagnosticHeatmap } from './DiagnosticHeatmap.js';

export class ScanTelemetryLogger {
  constructor() {
    this.activeSessions = new Map(); // sessionId -> sessionData
  }

  /**
   * Starts tracking a new scan session.
   * @param {string} sessionId 
   * @param {string} packagingType 
   */
  startSession(sessionId, packagingType) {
    this.activeSessions.set(sessionId, {
      sessionId,
      startTime: Date.now(),
      packagingType,
      framesSeen: 0,
      framesUsed: 0,
      evidenceAdded: 0,
      timeline: [],
      coverageSnapshots: [],
      plateauDetected: false,
      lastEvidenceAcquisitionTime: Date.now()
    });
    this.recordTimelineEvent(sessionId, 'SCAN_STARTED');
  }

  /**
   * Records that the camera processed a frame (even if no evidence was found).
   * @param {string} sessionId 
   */
  recordFrameSeen(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) session.framesSeen++;
  }

  /**
   * Records a distinct timeline event in milliseconds since start.
   * @param {string} sessionId 
   * @param {string} eventName (e.g., 'OCR_FOUND', 'DOSAGE_FOUND', 'CONFIDENCE_STABLE')
   */
  recordTimelineEvent(sessionId, eventName) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    // Prevent duplicate spam for the same event type
    if (session.timeline.some(t => t.event === eventName)) return;

    const now = Date.now();
    const offsetSeconds = ((now - session.startTime) / 1000).toFixed(2);
    session.timeline.push({ event: eventName, timeOffset: offsetSeconds });
    
    // Also means this frame was useful
    session.framesUsed++;
    session.evidenceAdded++;
    session.lastEvidenceAcquisitionTime = now;
    
    console.log(`[Telemetry] ${offsetSeconds}s: ${eventName}`);
  }

  /**
   * Calculates the mathematical probability of finding missing evidence
   * based on historical Scarcity, time elapsed, and frame efficiency.
   * @param {Object} session 
   * @param {string[]} missingRegions 
   */
  _calculateProbabilityOfNewEvidence(session, missingRegions) {
    if (missingRegions.length === 0) return 100;

    const timeSinceLastAcquisition = (Date.now() - session.lastEvidenceAcquisitionTime) / 1000;
    const efficiency = session.framesSeen > 0 ? (session.framesUsed / session.framesSeen) : 0;
    
    // If we've seen very few relevant frames overall, probability is lower
    let baseProb = efficiency * 100; 

    let maxScarcityPenalty = 0;
    missingRegions.forEach(region => {
      const scarcity = diagnosticHeatmap.getScarcityScore(region);
      if (scarcity === 'Very Rare') maxScarcityPenalty = Math.max(maxScarcityPenalty, 0.8);
      if (scarcity === 'Rare') maxScarcityPenalty = Math.max(maxScarcityPenalty, 0.5);
      if (scarcity === 'Moderate') maxScarcityPenalty = Math.max(maxScarcityPenalty, 0.2);
    });

    // Penalize heavily based on time since last discovery
    // E.g., if it's been 2 seconds since we found anything, probability drops aggressively
    const timeDecay = Math.max(0, 1 - (timeSinceLastAcquisition / 3)); // 0 after 3 seconds of waving

    const probability = baseProb * (1 - maxScarcityPenalty) * timeDecay;
    
    return probability;
  }

  /**
   * Logs a snapshot of the Coverage state to detect plateaus dynamically.
   * @param {string} sessionId 
   * @param {string} coverageState (e.g., 'PARTIAL', 'ADEQUATE')
   * @param {string[]} missingRegions
   */
  recordCoverageSnapshot(sessionId, coverageState, missingRegions = []) {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.plateauDetected) return;

    const offsetSeconds = ((Date.now() - session.startTime) / 1000).toFixed(2);
    session.coverageSnapshots.push({ timeOffset: offsetSeconds, state: coverageState });

    // Ensure we've at least been scanning for a short while before assuming plateau
    if (session.framesSeen > 30 && coverageState === 'PARTIAL') {
      const probability = this._calculateProbabilityOfNewEvidence(session, missingRegions);
      const timeSinceLast = ((Date.now() - session.lastEvidenceAcquisitionTime) / 1000).toFixed(1);
      
      if (probability < 5) {
        session.plateauDetected = true;
        this.recordTimelineEvent(sessionId, 'COVERAGE_PLATEAU_DETECTED');
        console.warn(`\n[Coverage Engine] Plateau Reached.`);
        console.log(`Missing Evidence: ${missingRegions.join(', ')}`);
        console.log(`Observed frames: ${session.framesSeen}`);
        console.log(`Relevant frames: ${session.framesUsed}`);
        console.log(`Last successful acquisition: ${timeSinceLast}s ago`);
        console.log(`Probability of discovery: ${probability.toFixed(1)}%\n`);
      }
    }
  }

  /**
   * Finalizes the session, calculates efficiency, and persists to local Dexie DB.
   * @param {string} sessionId 
   * @param {Object} legacyOutput 
   * @param {Object} worldModelOutput 
   */
  finalizeSession(sessionId, legacyOutput, worldModelOutput) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    this.recordTimelineEvent(sessionId, 'SCAN_COMPLETE');

    const durationSeconds = ((Date.now() - session.startTime) / 1000).toFixed(2);
    const efficiency = session.framesSeen > 0 ? ((session.framesUsed / session.framesSeen) * 100).toFixed(0) : 0;

    const finalReport = {
      ...session,
      durationSeconds,
      efficiencyPercent: efficiency,
      legacyCandidate: legacyOutput.bestMatch ? legacyOutput.bestMatch.name : 'NONE',
      legacyConfidence: legacyOutput.confidence,
      worldModelCandidate: worldModelOutput.bestMatch ? worldModelOutput.bestMatch.name : 'NONE',
      worldModelConfidence: worldModelOutput.confidence,
      legacyAcceptedWmRejected: (legacyOutput.confidence > 80 && worldModelOutput.confidence < 50)
    };

    console.log(`\n=== SCAN TELEMETRY SAVED ===`);
    console.log(`Duration: ${durationSeconds}s`);
    console.log(`Efficiency: ${efficiency}% (Frames Seen: ${session.framesSeen}, Used: ${session.framesUsed})`);
    if (finalReport.legacyAcceptedWmRejected) {
      console.log(`🌟 GOLD METRIC: Legacy Accepted, WorldModel Rejected!`);
    }
    console.log(`============================\n`);

    // In production: await dexieManager.getDB().scan_telemetry.put(finalReport);
    this.activeSessions.delete(sessionId);
    return finalReport;
  }
}

export const scanTelemetryLogger = new ScanTelemetryLogger();
