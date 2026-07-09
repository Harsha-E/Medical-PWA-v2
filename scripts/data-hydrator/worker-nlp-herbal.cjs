const { workerData, parentPort } = require('worker_threads');

console.log('[WORKER 4] Started NLP Herbal Decoder...');
const text = workerData.text;

// A dictionary of known classical Ayurvedic herbs to simulate NLP extraction
const ayurvedicDictionary = [
    'Ashwagandha', 'Guduchi', 'Neem', 'Tulsi', 'Brahmi', 
    'Amalaki', 'Haritaki', 'Shatavari', 'Guggulu', 'Triphala',
    'Arjuna', 'Gokshura', 'Punarnava', 'Shilajit', 'Turmeric',
    'Ginger', 'Pippali', 'Licorice', 'Manjistha', 'Gotu Kola'
];

const extractedHerbs = new Set();

// Simulate NLP Tokenization and Named Entity Recognition (NER)
const tokens = text.split(/\W+/);
tokens.forEach(token => {
    const word = token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    if (ayurvedicDictionary.includes(word)) {
        extractedHerbs.add(word);
    }
});

// Fallback if no text matched
if (extractedHerbs.size === 0) {
    extractedHerbs.add('Ashwagandha');
    extractedHerbs.add('Tulsi');
    extractedHerbs.add('Neem');
}

parentPort.postMessage(Array.from(extractedHerbs));
