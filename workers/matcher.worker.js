/**
 * @fileoverview Matcher Web Worker
 * Offloads the heavy medicine identification pipeline (MedicineIdentifier orchestrator)
 * from the main UI thread to prevent layout junk and frame drops during live camera feeds.
 */

import MedicineIdentifier from '../services/ai/MedicineIdentifier.js';

let identifier = null;

try {
  identifier = new MedicineIdentifier();
} catch (err) {
  console.error('[MatcherWorker] Failed to initialize MedicineIdentifier inside worker:', err);
}

self.onmessage = async (e) => {
  if (!e.data || !e.data.type) return;

  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'INIT':
        // Identifier is already initialized above. Send ready signal.
        self.postMessage({ type: 'INIT_COMPLETE' });
        break;

      case 'IDENTIFY_MEDICINE':
        if (!identifier) {
          throw new Error('MedicineIdentifier is not initialized.');
        }

        // payload expected: { rawText, confidence, regions }
        const result = identifier.identifyMedicine(payload);
        const diagnosticText = identifier.generateIdentificationReport(result);

        self.postMessage({
          type: 'IDENTIFICATION_COMPLETE',
          result,
          diagnosticText
        });
        break;

      case 'RECORD_CORRECTION':
        if (identifier) {
          identifier.recordCorrection(
            payload.sessionId,
            payload.finalDrugs,
            payload.isUserCorrection,
            payload.rawOcrText,
            payload.regions
          );
        }
        break;

      case 'RECORD_FAILURE':
        if (identifier) {
          identifier.recordFailure(payload.sessionId, payload.failureType);
        }
        break;

      case 'CLEAR':
        if (identifier) {
          identifier.clear();
        }
        self.postMessage({ type: 'CLEAR_COMPLETE' });
        break;

      default:
        console.warn(`[MatcherWorker] Unhandled message type: ${type}`);
    }
  } catch (err) {
    console.error(`[MatcherWorker] Error processing message of type ${type}:`, err);
    self.postMessage({
      type: 'ERROR',
      error: err.message,
      stage: type
    });
  }
};
