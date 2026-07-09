const { workerData, parentPort } = require('worker_threads');

console.log('[WORKER 1] Started Allopathic Graph Generation...');
const generics = workerData.generics;

const nodes = [];
const edges = [];

// Interaction templates for synthetic deterministic generation
const severities = ['SEVERE', 'MODERATE', 'MILD'];
const templates = [
    { s: 'SEVERE', d: 'May cause severe hypotension when combined.' },
    { s: 'SEVERE', d: 'Significant risk of bleeding. Avoid combination.' },
    { s: 'MODERATE', d: 'May decrease the efficacy of one or both drugs. Monitor closely.' },
    { s: 'MODERATE', d: 'Increased risk of gastrointestinal toxicity.' },
    { s: 'MILD', d: 'May cause mild drowsiness. Use with caution.' },
    { s: 'MILD', d: 'Potential for minor stomach upset.' }
];

// Hash function for deterministic assignment
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

generics.forEach((g, index) => {
    // Add Node
    nodes.push({ id: g, label: g, type: 'allopathic' });
    
    // Deterministic edge generation (3 to 6 edges per node)
    const numEdges = 3 + (hashCode(g) % 4); 
    
    for (let i = 0; i < numEdges; i++) {
        // Pick a target deterministically based on current index and i
        const targetIndex = (index + (hashCode(g + i) % (generics.length - 1)) + 1) % generics.length;
        const target = generics[targetIndex];
        
        // Pick a template deterministically
        const template = templates[hashCode(g + target) % templates.length];
        
        edges.push({
            from: g,
            to: target,
            severity: template.s,
            description: template.d
        });
    }
});

parentPort.postMessage({ nodes, edges });
