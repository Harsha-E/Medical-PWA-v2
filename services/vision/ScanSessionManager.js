export class ScanSessionManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.sessionId = Date.now().toString();
    this.state = 'INIT'; // INIT, LIVE_SCAN, RECOVERY, CONFIRMATION, DONE
    this.frames = [];
    this.startTime = 0;
    this.targetObject = null; // 'FRONT', 'BACK', 'UNKNOWN'
  }

  startLiveScan(target = 'UNKNOWN') {
    this.reset();
    this.state = 'LIVE_SCAN';
    this.startTime = Date.now();
    this.targetObject = target;
    return this.sessionId;
  }

  addFrame(frameData, confidenceScore) {
    if (this.state !== 'LIVE_SCAN' && this.state !== 'RECOVERY') return { action: 'IGNORE' };

    this.frames.push({
      timestamp: Date.now(),
      data: frameData,
      confidence: confidenceScore
    });

    // Check transition from Live to Recovery
    if (this.state === 'LIVE_SCAN') {
      const elapsed = Date.now() - this.startTime;
      // 4-second timeout for Live Scan before forcing Recovery
      if (elapsed > 4000 && confidenceScore < 85) {
        this.state = 'RECOVERY';
        return { action: 'TRANSITION_TO_RECOVERY', reason: 'timeout' };
      }
    }
    
    // If we hit high confidence in any mode, jump to confirmation
    if (confidenceScore >= 90) {
      this.state = 'CONFIRMATION';
      return { action: 'TRANSITION_TO_CONFIRMATION', confidence: confidenceScore };
    }

    return { action: 'CONTINUE', state: this.state };
  }
}
