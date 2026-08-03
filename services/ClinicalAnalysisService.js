/**
 * ClinicalAnalysisService.js
 * Orchestrates the asynchronous analysis lifecycle, decoupling ClinicalLogger
 * from the InteractionEngine API.
 */
import db from '../core/db.js';

class ClinicalAnalysisService {
  constructor() {
    // Engine removed
  }

  /**
   * Queue a profile analysis. Returns immediately.
   * @param {Object} patientProfile - Context for the analysis
   */
  async queueAnalysis(patientProfile) {
    const trackingId = Date.now().toString();

    // Log the PENDING state in our tracking table
    const analysisRecord = {
      trackingId,
      status: 'PENDING',
      timestamp: Date.now(),
      summarySnapshot: null,
      severity: 'NONE',
      warnings: [],
      analysisId: null,
      userId: patientProfile.userId || 'local_user'
    };

    const dbId = await db.clinical_analyses.add(analysisRecord);

    // Run the actual analysis asynchronously (non-blocking)
    this._runAnalysis(dbId, analysisRecord, patientProfile);
  }

  async _runAnalysis(dbId, record, profile) {
    try {
      // Transition to RUNNING
      await db.clinical_analyses.update(dbId, { status: 'RUNNING' });
      window.dispatchEvent(new CustomEvent('medcare:analysis-running', { detail: { dbId } }));

      // Build payload for DIC API
      const reqPayload = { medications: profile.activeMeds };
      
      const res = await fetch(`${window.ENV?.API_BASE_URL || 'http://localhost:8000'}/api/v1/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqPayload)
      });
      
      if (res.ok) {
        const result = await res.json();
        const executionId = result.execution_id;
        const severity = result.clinical_report?.status === 'WARNING' ? 'SEVERE' : 'NONE';
        const warnings = result.evidence || [];

        // Transition to COMPLETED
        await db.clinical_analyses.update(dbId, {
          status: 'COMPLETED',
          analysisId: executionId,
          summarySnapshot: result.clinical_report,
          severity: severity,
          warnings: warnings
        });
        window.dispatchEvent(new CustomEvent('medcare:analysis-completed', { detail: { dbId, analysisId: executionId } }));
      } else {
        throw new Error("Invalid response from DIC API");
      }
    } catch (e) {
      console.error('[ClinicalAnalysisService] Analysis failed', e);
      // Transition to PENDING_RETRY on network error / timeout
      await db.clinical_analyses.update(dbId, { status: 'PENDING_RETRY' });
      window.dispatchEvent(new CustomEvent('medcare:analysis-failed', { detail: { dbId } }));
    }
  }
}

export default new ClinicalAnalysisService();
