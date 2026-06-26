export default class RecognitionHistory {
    constructor() {
        this.data = { statistics: {} };
    }
    getLearnedCorrection(rawText) { 
        return rawText || ''; 
    }
    getBoost(name) { 
        return 0; 
    }
    recordMatch(name, isUncertain) {}
    recordCorrection(rawText, name) {}
    _load() { 
        return this.data; 
    }
}
