const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');

console.log('[WORKER 3] Started Ayurveda Parser...');
const sourceDir = workerData.sourceDir;

let combinedText = '';
try {
    const files = fs.readdirSync(sourceDir);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    
    // Simulate streaming and parsing massive textbook files
    txtFiles.forEach(file => {
        const filePath = path.join(sourceDir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            // We just grab the first 50,000 characters of each to keep memory stable for NLP simulation
            combinedText += content.substring(0, 50000) + ' '; 
        } catch (e) {
            console.warn(`[WORKER 3] Failed to read ${file}`);
        }
    });
    
    if (combinedText.length === 0) {
        combinedText = "Ashwagandha Guduchi Neem Tulsi Brahmi Amalaki Haritaki Shatavari Guggulu Triphala";
    }
} catch (e) {
    console.warn('[WORKER 3] Source directory error, using fallback textbook data.');
    combinedText = "Ashwagandha Guduchi Neem Tulsi Brahmi Amalaki Haritaki Shatavari Guggulu Triphala";
}

parentPort.postMessage(combinedText);
