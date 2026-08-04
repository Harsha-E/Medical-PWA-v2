/**
 * ClinicalAnalysisService.js
 * Orchestrates the asynchronous analysis lifecycle, decoupling ClinicalLogger
 * from the InteractionEngine API.
 */
import db from '../core/db.js';
import state from '../core/state.js';
import CanonicalContextBuilder from '../core/CanonicalContextBuilder.js';

class ClinicalAnalysisService {
  constructor() {
    // Engine removed
  }

  /**
   * Queue a profile analysis. Returns immediately.
   * @param {Object} patientProfile - Context for the analysis
   */
  async queueAnalysis(patientProfile = {}) {
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
      userId: patientProfile.userId || state.userProfile?.userId || 'verified_patient'
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

      const activeMeds = (profile.activeMeds || []).map(m => typeof m === 'string' ? m : (m.genericName || m.name || m.brandName));
      const canonicalPatient = CanonicalContextBuilder.build(state.userProfile, activeMeds);
      
      const executionId = 'exec_' + dbId + '_' + Date.now();
      const reqPayload = {
        analysis_id: executionId,
        patient_id: canonicalPatient.patient_id,
        patient: canonicalPatient,
        medications: activeMeds.map(m => ({ id: m, name: m })),
        timestamp: new Date().toISOString()
      };

      const { ApiClient } = await import('../core/api.js');
      const result = await ApiClient.post('/api/v1/analyze', reqPayload, { timeout: 3500 });

      const finalExecutionId = result.execution_id || executionId;
      const severity = result.clinical_report?.status === 'WARNING' ? 'SEVERE' : 'NONE';
      const warnings = result.evidence || [];

      // Transition to COMPLETED
      await db.clinical_analyses.update(dbId, {
        status: 'COMPLETED',
        analysisId: finalExecutionId,
        summarySnapshot: result.clinical_report || {},
        severity: severity,
        warnings: warnings
      });
      window.dispatchEvent(new CustomEvent('medcare:analysis-completed', { detail: { dbId, analysisId: finalExecutionId } }));
    } catch (e) {
      console.error('[ClinicalAnalysisService] Analysis failed', e);
      // Transition to PENDING_RETRY on network error / timeout
      await db.clinical_analyses.update(dbId, { status: 'PENDING_RETRY' });
      window.dispatchEvent(new CustomEvent('medcare:analysis-failed', { detail: { dbId } }));
    }
  }
}

export default new ClinicalAnalysisService();
