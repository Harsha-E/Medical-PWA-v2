export class SessionConfidenceEngine {
  getHumanReadableState(confidence, sessionState) {
    if (sessionState === 'CONFIRMATION' || sessionState === 'DONE') {
      return "Medicine found";
    }
    
    if (confidence < 30) {
      return "Finding medicine...";
    } else if (confidence < 70) {
      return "Need a clearer view...";
    } else {
      return "Almost ready...";
    }
  }
}
