import { dexieManager } from '../../storage/DexieManager.js';

export class DatasetSyncManager {
    constructor() {
        this.dbManager = dexieManager;
        this.syncEndpoints = [
            'https://api.example.com/cdsco/updates', // Placeholder for government registry
            'https://api.example.com/manufacturers/catalog'
        ];
    }

    async init() {
        this.db = await this.dbManager.getDB();
    }

    /**
     * Triggers a sync of all local databases with remote sources
     */
    async syncAll() {
        await this.init();
        
        // Fast-path: Check if database is already fully hydrated
        const existingCount = await this.db.medicine_knowledge.count();
        if (existingCount >= 240000) {
            console.log(`[DatasetSyncManager] Database already hydrated with ${existingCount} records. Skipping sync to save battery and time.`);
            return { success: true, updates: 0, skipped: true };
        }

        console.log('[DatasetSyncManager] Starting full dataset synchronization (First Boot)...');
        
        try {
            // Fetch massive JSON and stream to Dexie
            const mockUpdateCount = await this.fetchAndMergeUpdates();
            console.log(`[DatasetSyncManager] Sync complete. Applied ${mockUpdateCount} updates.`);
            return { success: true, updates: mockUpdateCount };
        } catch (error) {
            console.error('[DatasetSyncManager] Sync failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Fetches the massive 250k JSON dataset and streams it into Dexie in chunks.
     * Yields to the main thread to prevent UI lag.
     */
    async fetchAndMergeUpdates() {
        console.log('[DatasetSyncManager] Fetching massive indian_medicine_data.json...');
        try {
            const response = await fetch('./data/indian_medicine_data.json');
            if (!response.ok) throw new Error('Failed to fetch dataset');
            
            const records = await response.json();
            console.log(`[DatasetSyncManager] Successfully parsed ${records.length} records. Starting DB Hydration...`);

            const CHUNK_SIZE = 2500;
            let updateCount = 0;
            
            // Clear existing if any
            await this.db.transaction('rw', this.db.medicine_knowledge, async () => {
                await this.db.medicine_knowledge.clear();
            });

            // Chunked insertion to keep phone completely lag-free
            for (let i = 0; i < records.length; i += CHUNK_SIZE) {
                const chunk = records.slice(i, i + CHUNK_SIZE);
                await this.db.transaction('rw', this.db.medicine_knowledge, async () => {
                    await this.db.medicine_knowledge.bulkAdd(chunk);
                });
                updateCount += chunk.length;
                console.log(`[DatasetSyncManager] Hydrated ${updateCount}/${records.length}...`);
                
                // Yield to main thread with a 50ms window.
                // This is CRITICAL because it allows background IndexedDB read queries (like the Scanner)
                // to slip through and execute without getting stuck behind massive write locks.
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            console.log('[DatasetSyncManager] DB Hydration complete!');
            return updateCount;
        } catch (error) {
            console.error('[DatasetSyncManager] Failed to hydrate DB:', error);
            return 0;
        }
    }
}

// Export singleton instance
export const datasetSyncManager = new DatasetSyncManager();
