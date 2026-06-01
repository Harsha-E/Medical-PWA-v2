export class MultiAngleFusion {
  constructor() {
    this.angleData = [];
  }

  addAngle(angleName, ocrText, confidence) {
    this.angleData.push({ angleName, ocrText, confidence });
  }

  getBestCandidate() {
    if (this.angleData.length === 0) return null;
    
    const sorted = [...this.angleData].sort((a, b) => b.confidence - a.confidence);
    return sorted[0];
  }
}
