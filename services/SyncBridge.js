/**
 * @fileoverview Y.js CRDT Sync Layer for PeerMesh
 */
import * as Y from 'https://esm.sh/yjs@13.6.14';
import db from '../core/db.js';
import PeerMesh from './PeerMesh.js';
import state from '../core/state.js';

let instance = null;

export default class SyncBridge {
    constructor() {
        if (instance) return instance;
        instance = this;
        this._docs = new Map();
    }

    static getInstance() {
        if (!instance) {
            instance = new SyncBridge();
        }
        return instance;
    }

    /**
     * Attaches a Y.js document to an active peer session.
     * @param {string} peerId - The ID of the peer.
     * @param {string} permissionLevel - 'READ_ONLY' or 'READ_WRITE'
     */
    async attachToSession(peerId, permissionLevel) {
        try {
            const ydoc = new Y.Doc();
            this._docs.set(peerId, { ydoc, permission: permissionLevel });

            const mesh = PeerMesh.getInstance();
            const conn = mesh._connections.get(peerId);

            if (!conn) throw new Error('No active connection found for this peer.');

            ydoc.on('update', (update, origin) => {
                if (origin !== 'remote') {
                    conn.send({ type: 'yjs-update', payload: Array.from(update) });
                }
            });

            const sharedProfile = ydoc.getMap('userProfile');

            sharedProfile.observe(async (event) => {
                if (event.transaction.origin === 'remote') {
                    const updatedData = sharedProfile.toJSON();
                    await this._flushToDb(peerId, updatedData);
                }
            });

        } catch (err) {
            console.error('[SyncBridge] Failed to attach to session:', err);
        }
    }

    /**
     * Flushes updated data from the Y.js doc to the Dexie database.
     * @param {string} peerId 
     * @param {Object} data 
     */
    async _flushToDb(peerId, data) {
        try {
            const localUserId = state.get('user').uid;
            if (!localUserId) throw new Error('User not authenticated.');

            await db.family.where('userId').equals(localUserId).modify(data);
        } catch (err) {
            console.error('[SyncBridge] DB flush failed:', err);
        }
    }

    /**
     * Handles an incoming remote update from the data channel.
     * @param {string} peerId 
     * @param {Array} payload 
     */
    handleRemoteUpdate(peerId, payload) {
        const session = this._docs.get(peerId);
        if (session) {
            Y.applyUpdate(session.ydoc, new Uint8Array(payload), 'remote');
        }
    }

    /**
     * Updates a shared field if permission allows.
     * @param {string} peerId 
     * @param {string} key 
     * @param {any} value 
     */
    setSharedField(peerId, key, value) {
        const session = this._docs.get(peerId);
        if (!session) return;

        if (session.permission !== 'READ_WRITE') {
            console.warn('[SyncBridge] Write blocked. READ_ONLY session.');
            return;
        }

        session.ydoc.getMap('userProfile').set(key, value);
    }
}
