export class MultiAngleFusion {
  constructor() {
    this.angleData = [];
  }

  addAngle(angleName, ocrResult) {
    this.angleData.push({ angleName, ocrResult });
  }

  /**
   * Fuses multiple OCR passes into a single high-confidence string.
   */
  getBestCandidate() {
    if (this.angleData.length === 0) return null;
    
    // Simple fusion: pick the result with the highest overall confidence
    // A robust fusion would align the texts via Myers diff and pick best characters
    const sorted = [...this.angleData].sort((a, b) => {
      const confA = a.ocrResult.confidence || 0;
      const confB = b.ocrResult.confidence || 0;
      return confB - confA;
    });
    
    return sorted[0];
  }
}
