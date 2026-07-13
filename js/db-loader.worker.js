// db-loader.worker.js
self.importScripts('https://unpkg.com/dexie@4.0.8/dist/dexie.js');

const db = new Dexie('MedCareDB');
db.version(11).stores({
    medicines: '++id, name, genericName, manufacturer'
});

self.onmessage = async (event) => {
    if (event.data.action === 'LOAD_CHUNKS') {
        const numChunks = event.data.numChunks;
        let totalLoaded = 0;

        try {
            for (let i = 0; i < numChunks; i++) {
                // Fetch the chunk
                const response = await fetch(`../data/db_chunk_${i}.json`);
                if (!response.ok) throw new Error(`Failed to load chunk ${i}`);
                
                const data = await response.json();
                
                // Bulk add to Dexie
                await db.medicines.bulkPut(data);
                
                totalLoaded += data.length;
                
                // Report progress
                self.postMessage({
                    status: 'progress',
                    chunkIndex: i,
                    recordsLoaded: totalLoaded,
                    percent: Math.round(((i + 1) / numChunks) * 100)
                });
            }

            self.postMessage({ status: 'complete', totalRecords: totalLoaded });
        } catch (error) {
            self.postMessage({ status: 'error', error: error.message });
        }
    }
};
