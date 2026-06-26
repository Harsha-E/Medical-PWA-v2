/**
 * @fileoverview IntelligenceDiffLogger.js
 * Compares the legacy vision pipeline output against the new WorldModel output.
 * Runs silently in the background during Shadow Mode to calibrate confidence and catch regressions.
 */

export class IntelligenceDiffLogger {
  constructor() {
    this.diffs = [];
  }

  /**
   * Logs a comparison between the old system and the new intelligence agent.
   * @param {Object} legacyOutput 
   * @param {Object} newOutput 
   */
  logDiff(legacyOutput, newOutput) {
    const diff = {
      timestamp: Date.now(),
      legacy: {
        candidate: legacyOutput.bestMatch ? legacyOutput.bestMatch.name : 'NONE',
        confidence: legacyOutput.confidence
      },
      worldModel: {
        candidate: newOutput.bestMatch ? newOutput.bestMatch.name : 'NONE',
        confidence: newOutput.confidence,
        missingEvidence: newOutput.diagnosticReport?.missingRegions || []
      }
    };

    this.diffs.push(diff);

    // Console output formatted exactly as requested by UX Architect
    console.log('\n[Shadow Mode] Intelligence Diff');
    console.log('Legacy:');
    console.log(`${diff.legacy.candidate}`);
    console.log(`${diff.legacy.confidence}%`);
    console.log('\nNew:');
    console.log(`${diff.worldModel.candidate}`);
    console.log(`${diff.worldModel.confidence}%`);
    
    if (diff.worldModel.missingEvidence.length > 0) {
      console.log(`Missing Evidence: ${diff.worldModel.missingEvidence.join(', ')}`);
    }

    // Detect Regression (Old system was confident, New system is not)
    if (diff.legacy.confidence > 80 && diff.worldModel.confidence < 40) {
      console.warn('⚠️ [Regression Warning] Legacy system highly confident, but WorldModel rejected candidate due to missing structural evidence.');
    }
  }

  exportReport() {
    return JSON.stringify(this.diffs, null, 2);
  }
}

export const diffLogger = new IntelligenceDiffLogger();
