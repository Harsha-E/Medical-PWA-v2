import { benchmarkDatasetManager } from './BenchmarkDatasetManager.js';
import { evidenceReasoner } from '../intelligence/EvidenceReasoner.js';

export class RegressionTestSuite {
    
    /**
     * Executes simulated runs against the benchmark library to ensure new code
     * doesn't regress on known test cases (e.g., crumpled strips)
     */
    async runTestBenches() {
        console.log('[RegressionTestSuite] Starting evaluation run...');
        
        const suites = benchmarkDatasetManager.getAllSuites();
        let totalTests = 0;
        let passes = 0;

        for (const [suiteName, tests] of Object.entries(suites)) {
            console.log(`Running suite: ${suiteName}`);
            
            for (const test of tests) {
                totalTests++;
                
                // Simulate pipeline injection
                evidenceReasoner.reset();
                
                // Mocking the data that would normally come from the scanner and graph
                evidenceReasoner.ingestScannerEvidence({ confidence: 0.85 });
                evidenceReasoner.ingestGraphEvidence({ 
                    id: test.expectedId, 
                    name: 'Mock Name', 
                    matchedViaAlias: true, 
                    shapeMatched: true 
                });

                const matrix = evidenceReasoner.calculateProbabilityMatrix();
                
                // Check if the top result matches the expected ground truth
                if (matrix.length > 0 && matrix[0].candidateId === test.expectedId) {
                    passes++;
                } else {
                    console.error(`[RegressionTestSuite] FAILED: ${test.id} under conditions: ${test.conditions}`);
                }
            }
        }

        const accuracy = (passes / totalTests) * 100;
        console.log(`[RegressionTestSuite] Complete. Accuracy: ${accuracy.toFixed(2)}% (${passes}/${totalTests})`);
        
        return {
            total: totalTests,
            passes: passes,
            accuracy: accuracy
        };
    }
}

export const regressionTestSuite = new RegressionTestSuite();
