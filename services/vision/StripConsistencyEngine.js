export class StripConsistencyEngine {
  constructor() {
    this.baselineFeatures = null;
  }

  // BUG FIX: Add missing memory reset
  reset() {
    this.baselineFeatures = null;
  }

  setBaseline(frameData) {
    this.baselineFeatures = this._extractFeatures(frameData);
  }

  // ADDED: facingMode parameter to understand the physical context
  checkConsistency(frameData, facingMode = 'environment') {
    // 🚀 ZERO-LAG BYPASS: If using front camera, people move. Ignore consistency to save battery/CPU.
    if (facingMode === 'user') {
        return { consistent: true };
    }

    if (!this.baselineFeatures) {
      this.setBaseline(frameData);
      return { consistent: true };
    }

    const currentFeatures = this._extractFeatures(frameData);
    const diff = this._compareFeatures(this.baselineFeatures, currentFeatures);

    // If structure diff is huge, user probably swapped strips
    if (diff > 0.4) {
      return { 
        consistent: false, 
        reason: 'Significant layout change detected.'
      };
    }
    return { consistent: true };
  }

  _extractFeatures(frameData) {
    // In a real implementation: analyze pill cavity layout, text density, and relative bbox positions
    return {
      textDensity: frameData.textDensity || Math.random(), // fallback for testing
      layoutHash: frameData.layoutHash || 'layout-a'
    };
  }

  _compareFeatures(base, current) {
    let diff = Math.abs(base.textDensity - current.textDensity);
    if (base.layoutHash !== current.layoutHash && current.layoutHash !== undefined) {
      diff += 0.3; // arbitrary penalty for layout mismatch
    }
    return diff;
  }
}
