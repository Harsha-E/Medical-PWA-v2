const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const sourceFile = path.join(dataDir, 'indian_medicine_data.json');

console.log('Reading large dataset...');
const rawData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

const totalRecords = rawData.length;
const numChunks = 10;
const chunkSize = Math.ceil(totalRecords / numChunks);

console.log(`Total Records: ${totalRecords}`);
console.log(`Target Chunks: ${numChunks} (approx ${chunkSize} records per chunk)`);

for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, totalRecords);
    
    const chunkData = rawData.slice(start, end);
    const chunkPath = path.join(dataDir, `db_chunk_${i}.json`);
    
    fs.writeFileSync(chunkPath, JSON.stringify(chunkData));
    console.log(`Written chunk ${i}: ${chunkData.length} records -> ${chunkPath}`);
}

console.log('Chunking complete.');
