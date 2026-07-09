const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

console.log('=================================================');
console.log('🚀 INITIALIZING MEDCHECK DATA HYDRATION PIPELINE');
console.log('=================================================\n');

const dataDir = path.join(__dirname, '..', '..', 'data');
const allopathicSource = path.join(dataDir, 'indian_medicine_data.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    console.error('❌ Data directory not found:', dataDir);
    process.exit(1);
}

// 1. Extract Unique Generics from 2.5L Dataset
console.log('⏳ [MASTER] Parsing 2.5L Allopathic Dataset...');
let rawData = [];
try {
    rawData = JSON.parse(fs.readFileSync(allopathicSource, 'utf8'));
} catch (e) {
    console.warn('⚠️ Could not load indian_medicine_data.json. Will run pipeline with empty allopathic base.');
}

const genericsSet = new Set();
rawData.forEach(d => {
    if (d.genericName) {
        d.genericName.split('+').forEach(g => {
            const cleanG = g.trim().toLowerCase();
            if (cleanG.length > 2) genericsSet.add(cleanG);
        });
    }
});

const uniqueGenerics = Array.from(genericsSet);
console.log(`✅ [MASTER] Extracted ${uniqueGenerics.length} unique chemical components.\n`);

function runWorker(filename, workerData) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, filename), { workerData });
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker ${filename} stopped with exit code ${code}`));
        });
    });
}

async function runPipeline() {
    try {
        console.log('🔥 SPANNING WORKERS...');
        
        // Spawn Allopathic Workers
        console.log('   -> Starting Worker 1 (Allopathic Graph)');
        console.log('   -> Starting Worker 2 (Allopathic Disease)');
        
        const [graphData, diseaseData] = await Promise.all([
            runWorker('worker-allopathic-graph.cjs', { generics: uniqueGenerics }),
            runWorker('worker-allopathic-disease.cjs', { generics: uniqueGenerics })
        ]);

        console.log('\n✅ [WORKER 1] Completed Graph Generation:', graphData.nodes.length, 'nodes', graphData.edges.length, 'edges');
        console.log('✅ [WORKER 2] Completed Disease Contraindications:', diseaseData.length, 'profiles\n');

        // Spawn Ayurvedic Workers
        console.log('🔥 SPANNING AYURVEDIC NLP WORKERS...');
        console.log('   -> Starting Worker 3 (Ayurveda Parser)');
        const parsedText = await runWorker('worker-ayurveda-parser.cjs', { sourceDir: path.join(dataDir, 'ayurvedha') });
        console.log(`✅ [WORKER 3] Parsed ${parsedText.length} bytes of ancient texts.`);

        console.log('   -> Starting Worker 4 (NLP Herbal Decoder)');
        const extractedHerbs = await runWorker('worker-nlp-herbal.cjs', { text: parsedText });
        console.log(`✅ [WORKER 4] Extracted ${extractedHerbs.length} classical herbs/formulations.`);

        console.log('   -> Starting Worker 5 (Compound Mapper)');
        const ayurvedicKnowledge = await runWorker('worker-compound-mapper.cjs', { herbs: extractedHerbs, allopathicGenerics: uniqueGenerics });
        console.log(`✅ [WORKER 5] Mapped compounds and cross-referenced ${ayurvedicKnowledge.interactions.length} Herb-Drug interactions.\n`);

        // MERGE DATA
        console.log('🔄 [MASTER] Merging Unified Datasets...');
        
        // Merge nodes and edges (Allopathic + Ayurvedic)
        const finalGraph = {
            nodes: [...graphData.nodes, ...ayurvedicKnowledge.nodes],
            edges: [...graphData.edges, ...ayurvedicKnowledge.interactions]
        };

        // Merge contraindications (Allopathic + Ayurvedic)
        const finalDiseases = {
            data: [...diseaseData, ...ayurvedicKnowledge.contraindications]
        };

        // Write Final Output
        fs.writeFileSync(path.join(dataDir, 'drug-graph.json'), JSON.stringify(finalGraph, null, 2));
        fs.writeFileSync(path.join(dataDir, 'indian_pharma_interactions.json'), JSON.stringify(finalDiseases, null, 2));
        fs.writeFileSync(path.join(dataDir, 'ayurvedic_knowledge_base.json'), JSON.stringify(ayurvedicKnowledge.fullBase, null, 2));

        console.log('\n=================================================');
        console.log('🎉 PIPELINE COMPLETE! DATABASES HYDRATED TO 100%');
        console.log('=================================================\n');

    } catch (err) {
        console.error('❌ Pipeline Failed:', err);
    }
}

runPipeline();
