const { workerData, parentPort } = require('worker_threads');

console.log('[WORKER 2] Started Allopathic Disease Generation...');
const generics = workerData.generics;

const profiles = [];

const diseasePool = [
    'Asthma', 'Hypertension', 'Kidney Disease', 'Liver Disease', 
    'Diabetes', 'Peptic Ulcer', 'Glaucoma', 'Heart Failure', 
    'Pregnancy', 'Bleeding Disorder', 'Thyroid Disorder'
];

const severityPool = ['High', 'Moderate', 'Low'];

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

generics.forEach((g) => {
    const numContra = 1 + (hashCode(g) % 3); // 1 to 3 contraindications
    const contraindications = [];
    
    for (let i = 0; i < numContra; i++) {
        const diseaseIndex = hashCode(g + i) % diseasePool.length;
        const disease = diseasePool[diseaseIndex];
        
        // Avoid duplicates
        if (!contraindications.find(c => c.disease === disease)) {
            contraindications.push({
                disease: disease,
                severity: severityPool[hashCode(g + disease) % severityPool.length],
                warning: `Use of ${g} is contraindicated in patients with ${disease}. Consult physician.`
            });
        }
    }
    
    profiles.push({
        genericName: g,
        contraindications: contraindications
    });
});

parentPort.postMessage(profiles);
