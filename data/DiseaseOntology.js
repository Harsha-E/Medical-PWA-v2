export const DISEASE_ONTOLOGY = [
    { id: 1, clinicalName: 'Hypertension', aliases: ['high blood pressure', 'bp', 'hbp', 'hypertension'] },
    { id: 2, clinicalName: 'Diabetes Mellitus', aliases: ['diabetes', 'sugar', 'type 2 diabetes', 'type 1 diabetes', 'diabetic'] },
    { id: 3, clinicalName: 'Asthma', aliases: ['asthma', 'breathing problem', 'wheezing'] },
    { id: 4, clinicalName: 'Peptic Ulcer Disease', aliases: ['ulcer', 'peptic ulcer', 'stomach ulcer', 'gastric ulcer'] },
    { id: 5, clinicalName: 'Hepatic Impairment', aliases: ['liver disease', 'hepatic impairment', 'liver failure', 'cirrhosis'] },
    { id: 6, clinicalName: 'Renal Impairment', aliases: ['kidney disease', 'renal impairment', 'kidney failure', 'ckd'] },
    { id: 7, clinicalName: 'Pregnancy', aliases: ['pregnant', 'pregnancy'] },
    { id: 8, clinicalName: 'Lactation', aliases: ['breastfeeding', 'lactation', 'nursing'] },
    { id: 9, clinicalName: 'Heart Failure', aliases: ['heart failure', 'chf', 'congestive heart failure'] },
    { id: 10, clinicalName: 'Arrhythmia', aliases: ['arrhythmia', 'irregular heartbeat', 'afib', 'atrial fibrillation'] },
    { id: 11, clinicalName: 'Epilepsy', aliases: ['epilepsy', 'seizures', 'convulsions'] },
    { id: 12, clinicalName: 'Glaucoma', aliases: ['glaucoma', 'eye pressure'] },
    { id: 13, clinicalName: 'Hyperthyroidism', aliases: ['hyperthyroidism', 'overactive thyroid'] },
    { id: 14, clinicalName: 'Hypothyroidism', aliases: ['hypothyroidism', 'underactive thyroid'] },
    { id: 15, clinicalName: 'Gastroesophageal Reflux Disease (GERD)', aliases: ['gerd', 'acid reflux', 'heartburn'] }
];

export function searchOntology(query) {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    
    // Exact/Partial alias matching
    const results = DISEASE_ONTOLOGY.filter(disease => 
        disease.aliases.some(alias => alias.includes(lowerQuery)) ||
        disease.clinicalName.toLowerCase().includes(lowerQuery)
    );
    return results;
}
