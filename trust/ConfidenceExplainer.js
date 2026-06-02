export class ConfidenceExplainer {
    
    /**
     * Translates a numerical confidence score into a natural language explanation
     * to build trust with the user without exposing raw percentages.
     */
    getConfidenceExplanation(confidenceScore, evidenceList = []) {
        let explanation = "";

        if (confidenceScore >= 0.90) {
            explanation = "We're highly confident in this match because ";
        } else if (confidenceScore >= 0.70) {
            explanation = "This is a likely match based on ";
        } else {
            explanation = "We cannot fully confirm this medicine because ";
        }

        if (evidenceList.length > 0) {
            // Convert list of evidence (e.g., ['packaging matched', 'text verified']) into a sentence
            if (evidenceList.length === 1) {
                explanation += evidenceList[0] + ".";
            } else if (evidenceList.length === 2) {
                explanation += evidenceList[0] + " and " + evidenceList[1] + ".";
            } else {
                const last = evidenceList.pop();
                explanation += evidenceList.join(", ") + ", and " + last + ".";
            }
        } else {
            explanation = "Please verify the details manually.";
        }

        return explanation;
    }
}

export const confidenceExplainer = new ConfidenceExplainer();
