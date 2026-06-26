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

            // Listen for internal SOS Broadcasts to forward to active peers
            window.addEventListener('medcare:sos-broadcast', (e) => {
                const { message, location } = e.detail;
                for (const [peerId, conn] of this._connections.entries()) {
                    if (conn.open) {
                        this.sendSignal(peerId, 'emergency-sos', { message, location });
                    }
                }
            });

            // Unify Family Members into the P2P Mesh
            this.syncFamilyNetwork();
            
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
            window.dispatchEvent(new CustomEvent('medcare:peer-connected', { detail: { peerId, metadata: conn.metadata } }));
        } catch (error) {
            console.error('[PeerMesh] Biometric consent failed or denied.', error);
            this._pendingConsent.delete(peerId);
            window.dispatchEvent(new CustomEvent('medcare:peer-denied', { detail: { peerId } }));
        }
    }

    /**
     * Denies a pending peer connection.
     * @param {string} peerId
     */
    denyPeer(peerId) {
        const conn = this._pendingConsent.get(peerId);
        if (conn) {
            conn.send({ type: 'peer-dropped', payload: { message: 'Connection denied' } });
            setTimeout(() => conn.close(), 500);
        }
        this._pendingConsent.delete(peerId);
        window.dispatchEvent(new CustomEvent('medcare:peer-denied', { detail: { peerId } }));
    }

    /**
     * Drops an active connection.
     * @param {string} peerId
     */
    disconnectPeer(peerId) {
        const conn = this._connections.get(peerId);
        if (conn) {
            conn.send({ type: 'peer-dropped', payload: { message: 'Connection dropped by user' } });
            setTimeout(() => {
                conn.close();
                this._connections.delete(peerId);
                window.dispatchEvent(new CustomEvent('medcare:peer-disconnected', { detail: { peerId } }));
            }, 500);
        }
    }

    /**
     * Sends a custom signal over the data channel.
     * @param {string} peerId 
     * @param {string} type 
     * @param {any} payload 
     */
    sendSignal(peerId, type, payload = {}) {
        const conn = this._connections.get(peerId);
        if (conn && conn.open) {
            conn.send({ type, payload });
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
            metadata: { 
                displayName: state.userProfile?.name || 'Unknown Device',
                phone: state.userProfile?.profile?.phone || ''
            }
        });
        
        // Add to connections and open channel
        this._connections.set(targetId, conn);
        this._openDataChannel(conn);
        return conn;
    }

    /**
     * Architecture Consolidation: Automatically unifies the active "Hydra Pool" 
     * mesh network with the "Family Member" graph sync.
     */
    syncFamilyNetwork() {
        if (!state.userProfile || !state.userProfile.family) return;
        
        console.log('[PeerMesh] Synchronizing family members into the mesh...');
        for (const member of state.userProfile.family) {
            if (member.deviceId && member.deviceId !== this.peerId) {
                try {
                    if (!this._connections.has(member.deviceId)) {
                        this.connectToPeer(member.deviceId);
                    }
                } catch (e) {
                    console.warn(`[PeerMesh] Failed to sync family member ${member.name}:`, e);
                }
            }
        }
    }

    /**
     * Opens the data channel for communication.
     * @param {Object} conn - The PeerJS connection object.
     */
    _openDataChannel(conn) {
        conn.on('open', () => {
            window.dispatchEvent(new CustomEvent('medcare:peer-connected', { detail: { peerId: conn.peer, metadata: conn.metadata } }));
        });

        conn.on('data', (data) => {
            this._handleData(conn.peer, data);
        });

        conn.on('close', () => {
            this._connections.delete(conn.peer);
            window.dispatchEvent(new CustomEvent('medcare:peer-disconnected', { detail: { peerId: conn.peer } }));
        });
        
        conn.on('error', (err) => {
            console.error('[PeerMesh] Conn Error:', err);
        });
    }

    _handleData(peerId, data) {
        if (data && data.type === 'yjs-update') {
            SyncBridge.getInstance().handleRemoteUpdate(peerId, data.payload);
        } else if (data && data.type === 'peer-dropped') {
            this._connections.delete(peerId);
            window.dispatchEvent(new CustomEvent('medcare:peer-dropped', { detail: { peerId, message: data.payload?.message } }));
        } else if (data && data.type === 'request-write-access') {
            window.dispatchEvent(new CustomEvent('medcare:write-request', { detail: { peerId } }));
        } else if (data && data.type === 'grant-write-access') {
            window.dispatchEvent(new CustomEvent('medcare:write-granted', { detail: { peerId } }));
        } else if (data && data.type === 'emergency-sos') {
            // High-priority alert for receiving peers
            alert(`CRITICAL EMERGENCY SOS RECEIVED!\n\nFrom Peer: ${peerId.substring(0,6)}...\nMessage: ${data.payload?.message}\nLocation: ${data.payload?.location || 'Unknown'}`);
            window.dispatchEvent(new CustomEvent('medcare:sos-received', { detail: { peerId, ...data.payload } }));
        }
    }
}
