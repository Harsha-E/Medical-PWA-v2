import Dexie from 'https://esm.sh/dexie';

export class DexieManager {
    constructor() {
        this.db = new Dexie('MedCare_MIOS_DB');
        this.initSchema();
    }

    initSchema() {
        // Define schema
        this.db.version(1).stores({
            medicine_knowledge: 'id, name, genericName, manufacturer, therapeuticCategory, *commonOcrErrors, *alternativeBrands, *regionalAvailability',
            packaging_reference: 'id, medicineId, blisterLayout',
            scan_history: '++id, userId, timestamp, identifiedMedId',
            scan_recordings: 'id, timestamp, failureType'
        });
    }

    async getDB() {
        if (!this.db.isOpen()) {
            await this.db.open();
        }
        return this.db;
    }

    // Secure persistent storage for the browser to prevent eviction
    async secureOfflineStorage() {
        if (navigator.storage && navigator.storage.persist) {
            const isPersisted = await navigator.storage.persist();
            console.log(`[Storage] Persistent status: ${isPersisted ? 'LOCKED' : 'EPHEMERAL'}`);
            return isPersisted;
        }
        return false;
    }

    async checkQuota() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            const usedMb = (estimate.usage / (1024 * 1024)).toFixed(2);
            const quotaMb = (estimate.quota / (1024 * 1024)).toFixed(2);
            console.log(`[Storage] Quota usage: ${usedMb}MB of ${quotaMb}MB allocated.`);
            return { usedMb, quotaMb };
        }
        return null;
    }
}

// Export singleton instance
export const dexieManager = new DexieManager();
