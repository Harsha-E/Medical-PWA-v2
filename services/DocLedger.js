/**
 * @fileoverview Cryptographic Document Ledger
 */
import db from '../core/db.js';
import state from '../core/state.js';
import Fuse from 'https://esm.sh/fuse.js@7.0.0';

let instance = null;

export default class DocLedger {
    constructor() {
        if (instance) return instance;
        instance = this;
    }

    static getInstance() {
        if (!instance) {
            instance = new DocLedger();
        }
        return instance;
    }

    /**
     * Ingests a document, computes its SHA-256 hash, and saves it to the ledger.
     * @param {File} file 
     * @param {Object} metadata 
     */
    async ingestDocument(file, metadata = {}) {
        try {
            const userId = state.get('user').uid;
            if (!userId) throw new Error('User not authenticated.');

            const arrayBuffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            const record = {
                userId,
                filename: file.name,
                mimeType: file.type,
                size: file.size,
                subresourceIntegrity: `sha256-${hashHex}`,
                date: new Date().toISOString().split('T')[0],
                timestamp: Date.now(),
                ...metadata
            };

            const id = await db.history.add(record);
            return id;
        } catch (err) {
            console.error('[DocLedger] Ingestion failed:', err);
            throw err;
        }
    }

    /**
     * Searches the document ledger using Fuse.js fuzzy matching.
     * @param {string} query 
     * @returns {Promise<Array>}
     */
    async search(query) {
        try {
            const userId = state.get('user').uid;
            if (!userId) return [];

            const records = await db.history.where('userId').equals(userId).toArray();
            if (!query) return records;

            const fuse = new Fuse(records, {
                keys: ['filename', 'title', 'type', 'notes', 'date'],
                threshold: 0.3
            });

            const results = fuse.search(query);
            return results.map(r => r.item);
        } catch (err) {
            console.error('[DocLedger] Search failed:', err);
            return [];
        }
    }
}
