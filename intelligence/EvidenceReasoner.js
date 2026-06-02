export class EvidenceReasoner {
    constructor() {
        this.scannerEvidence = [];
        this.graphEvidence = [];
        
        // 70% Knowledge Graph, 30% Scanner Confidence
        this.weights = {
            scanner: 0.30,
            graph: 0.70
        };
    }

    /**
     * Ingests real-time computer vision evidence (OCR, physical dimensions)
     */
    ingestScannerEvidence(cvData) {
        this.scannerEvidence.push(cvData);
        // Retain only latest 5 frames of evidence for smoothing
        if (this.scannerEvidence.length > 5) {
            this.scannerEvidence.shift();
        }
    }

    /**
     * Ingests data points matched from the MedicineKnowledgeGraph
     */
    ingestGraphEvidence(graphData) {
        this.graphEvidence.push(graphData);
    }

    /**
     * Calculates the probability matrix for potential candidates
     * Returns a sorted array of matches with confidence scores
     */
    calculateProbabilityMatrix() {
        if (this.scannerEvidence.length === 0 || this.graphEvidence.length === 0) {
            return [];
        }

        // Aggregate CV confidence
        let cvScoreTotal = 0;
        this.scannerEvidence.forEach(ev => {
            cvScoreTotal += ev.confidence || 0;
        });
        const avgCvScore = cvScoreTotal / this.scannerEvidence.length;

        // In a real system, we would score each candidate in the graphEvidence
        // against the cvData properties (brand name match, shape match, etc.)
        // Mocking the probability matrix generation:
        
        const candidateScores = this.graphEvidence.map(candidate => {
            let graphScore = 0.5; // Base graph score
            
            // Example logic: if common OCR error matched, boost score
            if (candidate.matchedViaAlias) {
                graphScore += 0.3;
            }
            
            // Example logic: if physical shape matched, boost score
            if (candidate.shapeMatched) {
                graphScore += 0.2;
            }

            // Cap graph score at 1.0
            graphScore = Math.min(graphScore, 1.0);

            // Final weighted confidence
            const finalConfidence = (avgCvScore * this.weights.scanner) + (graphScore * this.weights.graph);

            return {
                candidateId: candidate.id,
                name: candidate.name,
                confidence: finalConfidence,
                breakdown: {
                    scannerContribution: avgCvScore * this.weights.scanner,
                    graphContribution: graphScore * this.weights.graph
                }
            };
        });

        // Sort descending by confidence
        return candidateScores.sort((a, b) => b.confidence - a.confidence);
    }

    reset() {
        this.scannerEvidence = [];
        this.graphEvidence = [];
    }
}

export const evidenceReasoner = new EvidenceReasoner();
