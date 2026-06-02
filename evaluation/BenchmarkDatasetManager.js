export class BenchmarkDatasetManager {
    constructor() {
        // In a real system, these would load from a local dataset folder
        // containing actual cropped image matrices and expected metadata
        this.referenceSuites = {
            'clean_strips': [
                { id: 'bench_dolo_01', expectedId: 'brand-dolo-650', conditions: 'clean' },
                { id: 'bench_crocin_01', expectedId: 'brand-crocin-650', conditions: 'clean' }
            ],
            'crumpled_strips': [
                { id: 'bench_dolo_crumple', expectedId: 'brand-dolo-650', conditions: 'heavy_crease' }
            ],
            'reflective_strips': [
                { id: 'bench_calpol_glare', expectedId: 'brand-calpol-650', conditions: 'specular_glare' }
            ]
        };
    }

    getBenchmarkSuite(suiteName) {
        return this.referenceSuites[suiteName] || [];
    }

    getAllSuites() {
        return this.referenceSuites;
    }
}

export const benchmarkDatasetManager = new BenchmarkDatasetManager();
