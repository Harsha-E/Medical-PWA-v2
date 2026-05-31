/**
 * @fileoverview Decentralized Mesh Network & WebAuthn Gating
 */

import state from '../core/state.js';
import SyncBridge from './SyncBridge.js';

let instance = null;

export default class PeerMesh {
    constructor() {
        if (instance) return instance;
        instance = this;
        this._peer = null;
        this.peerId = null;
        this._connections = new Map();
        this._pendingConsent = new Map();
    }

    static getInstance() {
        if (!instance) {
            instance = new PeerMesh();
        }
        return instance;
    }

    /**
     * Initializes the PeerJS connection with a deterministic ID.
     */
    async init() {
        if (this._peer) return;

        try {
            const uid = state.user?.uid;
            if (!uid) throw new Error('User not authenticated.');

            const encoder = new TextEncoder();
            const data = encoder.encode(uid);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const deterministicId = hashHex.slice(0, 32);

            this._peer = new Peer(deterministicId, { debug: 2 });

            await new Promise((resolve) => {
                this._peer.on('open', (id) => {
                    this.peerId = id;
                    resolve();
                });
                this._peer.on('error', (err) => {
                    console.error('[PeerMesh] error in open:', err);
                    resolve(); // resolve anyway so UI doesn't hang
                });
            });

            this._peer.on('connection', (conn) => {
                this._handleIncoming(conn);
            });
        } catch (err) {
            console.error('[PeerMesh] Initialization failed:', err);
        }
    }

    /**
     * Handles an incoming connection request.
     * @param {Object} conn - The PeerJS connection object.
     */
    _handleIncoming(conn) {
        this._pendingConsent.set(conn.peer, conn);

        window.dispatchEvent(new CustomEvent('medcare:peer-request', {
            detail: {
                peerId: conn.peer,
                connLabel: conn.metadata?.displayName ?? 'Unknown Device'
            }
        }));
    }

    /**
     * Approves a peer connection using WebAuthn.
     * @param {string} peerId - The ID of the peer.
     */
    async approvePeerConnection(peerId) {
        const conn = this._pendingConsent.get(peerId);
        if (!conn) throw new Error('No pending connection found for this peer.');

        try {
            const challenge = crypto.getRandomValues(new Uint8Array(32));
            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge: challenge,
                    timeout: 60000,
                    userVerification: 'required',
                    rpId: window.location.hostname
                }
            });

            this._connections.set(peerId, conn);
            this._pendingConsent.delete(peerId);
            this._openDataChannel(conn);
        } catch (error) {
            console.error('[PeerMesh] Biometric consent failed or denied.', error);
            this._pendingConsent.delete(peerId);
            window.dispatchEvent(new CustomEvent('medcare:peer-denied', { detail: { peerId } }));
        }
    }

    /**
     * Actively connects to another peer.
     * @param {string} targetId - The ID of the peer to connect to.
     */
    connectToPeer(targetId) {
        if (!this._peer) throw new Error('PeerMesh not initialized.');
        if (targetId === this.peerId) throw new Error('Cannot connect to self.');

        const conn = this._peer.connect(targetId, {
            metadata: { displayName: state.userProfile?.name || 'Unknown Device' }
        });
        
        // Add to connections and open channel
        this._connections.set(targetId, conn);
        this._openDataChannel(conn);
        return conn;
    }

    /**
     * Opens the data channel for communication.
     * @param {Object} conn - The PeerJS connection object.
     */
    _openDataChannel(conn) {
        conn.on('open', () => {
        });

        conn.on('data', (data) => {
            this._handleData(conn.peer, data);
        });

        conn.on('close', () => {
            this._connections.delete(conn.peer);
        });
        
        conn.on('error', (err) => {
            console.error('[PeerMesh] Conn Error:', err);
        });
    }

    _handleData(peerId, data) {
        if (data && data.type === 'yjs-update') {
            SyncBridge.getInstance().handleRemoteUpdate(peerId, data.payload);
        }
    }
}
