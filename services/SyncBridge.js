/**
 * SyncBridge.js
 * Implements Offline Queueing and CRDT (Conflict-Free Replicated Data Types)
 * for the MedCheck P2P Mesh Network.
 */

import db from '../core/db.js';

export default class SyncBridge {
    /**
     * Queues a mutation for offline syncing.
     * @param {string} action 'ADD', 'UPDATE', or 'DELETE'
     * @param {string} table The Dexie table name
     * @param {object} record The full record data (with logicalClock and updatedAt)
     */
    static async queueMutation(action, table, record) {
        // Increment logical clock
        record.logicalClock = (record.logicalClock || 0) + 1;
        record.updatedAt = new Date().toISOString();

        if (action === 'DELETE') {
            record.isDeleted = true;
            action = 'UPDATE'; // A delete is just an update with the tombstone set
        }

        const payload = { ...record };

        // Save to the actual table first
        if (action === 'ADD') {
            if (!record.id) {
                record.id = await db[table].add(record);
                payload.id = record.id;
            } else {
                await db[table].put(record);
            }
        } else if (action === 'UPDATE') {
            await db[table].put(record);
        }

        // Add to sync queue
        await db.sync_queue.add({
            action,
            table,
            recordId: record.id,
            payload,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0
        });

        console.log(`[SyncBridge] Queued ${action} on ${table}:${record.id}`);

        // Try to flush immediately if online
        if (navigator.onLine) {
            // We dispatch an event so PeerMeshV2 can pick it up and flush
            window.dispatchEvent(new CustomEvent('medcare:sync-queued'));
        }
    }

    /**
     * Flushes the offline queue and sends payloads over the provided peer connection.
     */
    static async processQueue(meshInstance) {
        if (!meshInstance || !meshInstance.connections) return;
        const peers = Array.from(meshInstance.connections.keys());
        if (peers.length === 0) return;

        const pending = await db.sync_queue.where('status').equals('pending').toArray();
        if (pending.length === 0) return;

        console.log(`[SyncBridge] Flushing ${pending.length} queued items to peers...`);

        for (const item of pending) {
            const message = {
                type: 'CRDT_SYNC',
                table: item.table,
                payload: item.payload
            };

            let successCount = 0;
            for (const peerId of peers) {
                try {
                    await meshInstance.sendMessage(peerId, message);
                    successCount++;
                } catch (e) {
                    console.warn(`[SyncBridge] Failed to send to ${peerId}:`, e);
                }
            }

            if (successCount > 0) {
                // Mark as synced if sent to at least one peer
                await db.sync_queue.update(item.id, { status: 'synced' });
            }
        }
    }

    /**
     * Applies an incoming CRDT payload using Last-Write-Wins (LWW).
     */
    static async applyIncomingSync(message, senderId) {
        const { table, payload } = message;
        
        try {
            const existingRecord = await db[table].get(payload.id);

            if (existingRecord) {
                // Conflict Resolution (LWW)
                const localTime = new Date(existingRecord.updatedAt).getTime();
                const remoteTime = new Date(payload.updatedAt).getTime();

                if (remoteTime > localTime) {
                    // Remote is newer, accept
                    await db[table].put(payload);
                    console.log(`[SyncBridge] Applied newer remote record for ${table}:${payload.id}`);
                } else if (remoteTime === localTime) {
                    // Tie-breaker: Alphabetical Peer ID
                    const localPeerId = localStorage.getItem('medcheck_peer_v2_id') || 'Z';
                    if (senderId > localPeerId) {
                        await db[table].put(payload);
                        console.log(`[SyncBridge] Tie-breaker won by remote for ${table}:${payload.id}`);
                    } else {
                        console.log(`[SyncBridge] Tie-breaker won by local for ${table}:${payload.id}`);
                    }
                } else {
                    // Local is newer, ignore
                    console.log(`[SyncBridge] Ignored older remote record for ${table}:${payload.id}`);
                }
            } else {
                // Doesn't exist locally, add it
                await db[table].put(payload);
                console.log(`[SyncBridge] Inserted new remote record for ${table}:${payload.id}`);
            }

            // Dispatch event to refresh UI
            window.dispatchEvent(new CustomEvent('medcare:data-synced', { detail: { table } }));

        } catch (e) {
            console.error(`[SyncBridge] Failed to apply incoming sync for ${table}:`, e);
        }
    }
}
