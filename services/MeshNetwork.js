/**
 * @fileoverview Mesh Network Service for MedCheck PWA.
 * Architecture: ES6 Module, WebRTC (PeerJS).
 * Paradigm: Offline-First Peer-to-Peer Synchronization via CRDT (Conflict-Free Replicated Data Type).
 * Requires: PeerJS library available on the global `window` object via CDN.
 */

/**
 * @typedef {Object} SyncRecord
 * @property {string|number} id - Unique identifier for the data row.
 * @property {string} table - The database table this record belongs to.
 * @property {any} data - The actual payload of the record.
 * @property {number|string} updatedAt - The timeline stamp for CRDT Last-Write-Wins resolution.
 */

class MeshNetwork {
    constructor() {
        /** @type {any|null} The active PeerJS instance */
        this._peer = null;

        /** @type {Map<string, any>} Active data connection tunnels */
        this._connections = new Map();

        /** @type {string} Local WebRTC routing ID */
        this._localId = '';

        /** @type {Set<Function>} Callbacks for incoming data */
        this._syncCallbacks = new Set();

        /** @type {Map<string|number, Object>} Last-Write-Wins (LWW) Register */
        this._crdt = new Map();
    }

    /**
     * Bootstraps the WebRTC peer identity and establishes signaling server connections.
     * @returns {Promise<void>} Resolves when the peer identity is locked.
     */
    init() {
        return new Promise((resolve, reject) => {
            if (this._peer) {
                console.warn('[Mesh] Network peer already initialized.');
                return resolve();
            }

            if (typeof Peer === 'undefined') {
                return reject(new Error('[Mesh Fatal] Global Peer object missing. Ensure PeerJS CDN is loaded.'));
            }

            try {
                // Initialize the local node with optimized public STUN servers for NAT traversal
                this._peer = new Peer({
                    debug: 0,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' }
                        ]
                    }
                });

                this._peer.on('open', (id) => {
                    this._localId = id;
                    console.log(`[Mesh] Peer initialized. ID: ${this._localId}`);
                    resolve();
                });

                // Listen for incoming connection attempts
                this._peer.on('connection', (conn) => {
                    this._setupIncomingConnection(conn);
                });

                // System-level Error Categorization Routing
                this._peer.on('error', (err) => {
                    this._handlePeerError(err);
                });

            } catch (err) {
                reject(new Error(`[Mesh] Failed to instantiate Peer object: ${err.message}`));
            }
        });
    }

    /**
     * Retrieves the device's public WebRTC routing ID.
     * @returns {string} The local peer ID.
     * @throws {Error} If the network has not been initialized.
     */
    getLocalId() {
        if (!this._localId) {
            throw new Error('[Mesh Error] Local ID requested before Peer initialization.');
        }
        return this._localId;
    }

    /**
     * Generates a payload designed for secure QR code exchange.
     * @returns {string} JSON-encoded connection string.
     */
    generateQRPayload() {
        const localId = this.getLocalId();
        const payload = {
            peerId: localId,
            appVersion: '1.0.0',
            timestamp: Date.now(),
            checksum: localId.substring(0, 8)
        };
        return JSON.stringify(payload);
    }

    /**
     * Actively reaches out to establish a new encrypted data tunnel with a target peer.
     * @param {string} peerId - The target device's WebRTC routing ID.
     * @returns {Promise<string>} Resolves with the peerId upon successful handshake.
     */
    connectToPeer(peerId) {
        return new Promise((resolve, reject) => {
            if (!this._peer || this._peer.disconnected) {
                return reject(new Error('[Mesh] Local peer offline or destroyed.'));
            }

            if (this._connections.has(peerId)) {
                return resolve(peerId);
            }

            console.log(`[Mesh] Attempting tunnel connection to: ${peerId}`);
            const conn = this._peer.connect(peerId, { reliable: true, serialization: 'json' });

            // Fail-safe 10s connection timeout
            const timeoutTimer = setTimeout(() => {
                conn.close();
                reject(new Error(`[Mesh] Connection to ${peerId} timed out after 10s.`));
            }, 10000);

            conn.on('open', () => {
                clearTimeout(timeoutTimer);
                
                conn._medcheckConnectedAt = Date.now();
                conn._medcheckDeviceName = 'Unknown Device';
                
                this._connections.set(peerId, conn);

                conn.on('data', (data) => this._handleIncoming(data, peerId));
                conn.on('close', () => {
                    this._connections.delete(peerId);
                    console.log(`[Mesh] Connection to ${peerId} closed.`);
                });

                console.log(`[Mesh] Tunnel established with ${peerId}.`);
                resolve(peerId);
            });

            conn.on('error', (err) => {
                clearTimeout(timeoutTimer);
                reject(err);
            });
        });
    }

    /**
     * Configures event listeners for tunnels initiated by remote peers.
     * @private
     */
    _setupIncomingConnection(conn) {
        console.log(`[Mesh] Incoming connection request from: ${conn.peer}`);

        conn.on('open', () => {
            conn._medcheckConnectedAt = Date.now();
            conn._medcheckDeviceName = 'Unknown Device';
            
            this._connections.set(conn.peer, conn);

            // Acknowledge connection
            conn.send({
                type: 'HANDSHAKE',
                peerId: this._localId,
                deviceName: typeof navigator !== 'undefined' && navigator.platform ? navigator.platform : 'Web Client'
            });

            conn.on('data', (data) => this._handleIncoming(data, conn.peer));
            
            conn.on('close', () => {
                this._connections.delete(conn.peer);
            });
        });
    }

    /**
     * Primary ingress router for all WebRTC data channel messages.
     * @private
     */
    _handleIncoming(data, fromPeerId) {
        if (!data || !data.type) return;

        switch (data.type) {
            case 'HANDSHAKE':
                const conn = this._connections.get(fromPeerId);
                if (conn && data.deviceName) {
                    conn._medcheckDeviceName = data.deviceName;
                }
                window.dispatchEvent(new CustomEvent('peer_connected', { detail: { peerId: fromPeerId, deviceName: data.deviceName } }));
                break;

            case 'SYNC_DELTA':
                if (data.records && Array.isArray(data.records)) {
                    this._applyCRDT(data.records);
                }
                break;

            case 'PING':
                const peerConn = this._connections.get(fromPeerId);
                if (peerConn) peerConn.send({ type: 'PONG', timestamp: Date.now() });
                break;
        }
    }

    /**
     * Broadcasts a package of database row changes to all connected peers.
     * @param {SyncRecord[]} records 
     * @returns {Promise<number>} Number of peers notified.
     */
    async sendDelta(records) {
        if (!Array.isArray(records) || records.length === 0) return 0;

        const payload = {
            type: 'SYNC_DELTA',
            records,
            fromPeerId: this._localId,
            sentAt: Date.now()
        };

        let sendCount = 0;
        for (const [peerId, conn] of this._connections.entries()) {
            if (conn && conn.open) {
                conn.send(payload);
                sendCount++;
            }
        }

        return sendCount;
    }

    /**
     * Executes internal CRDT mathematical merge strategy (Last-Write-Wins).
     * @private
     */
    _applyCRDT(incomingRecords) {
        const validatedUpdates = [];

        for (const record of incomingRecords) {
            if (!record.id || !record.updatedAt) continue;

            const existingEntry = this._crdt.get(record.id);
            const incomingTimestamp = new Date(record.updatedAt).getTime();
            const existingTimestamp = existingEntry ? new Date(existingEntry.timestamp).getTime() : 0;

            if (!existingEntry || incomingTimestamp > existingTimestamp) {
                this._crdt.set(record.id, {
                    value: record,
                    timestamp: record.updatedAt,
                    peerId: record.peerId || 'unknown'
                });
                validatedUpdates.push(record);
            }
        }

        if (validatedUpdates.length > 0) {
            for (const callback of this._syncCallbacks) {
                try { callback(validatedUpdates); } catch (e) { console.error(e); }
            }
        }
    }

    /**
     * Registers a callback for when novel synchronization data arrives.
     * @param {Function} callback 
     * @returns {Function} Unsubscribe method.
     */
    onSync(callback) {
        this._syncCallbacks.add(callback);
        return () => this._syncCallbacks.delete(callback);
    }

    /**
     * Generates a status array mapping all active data tunnels.
     * @returns {Array<{peerId: string, deviceName: string, connectedAt: number}>}
     */
    getConnectedPeers() {
        const peerStatusList = [];
        for (const [peerId, conn] of this._connections.entries()) {
            peerStatusList.push({
                peerId,
                deviceName: conn._medcheckDeviceName || 'Unknown Node',
                connectedAt: conn._medcheckConnectedAt || Date.now()
            });
        }
        return peerStatusList;
    }

    /**
     * Gracefully terminates data connection channels.
     * @param {string} [peerId] 
     */
    disconnect(peerId = undefined) {
        if (peerId) {
            const conn = this._connections.get(peerId);
            if (conn) {
                conn.close();
                this._connections.delete(peerId);
            }
        } else {
            for (const conn of this._connections.values()) {
                conn.close();
            }
            this._connections.clear();
            if (this._peer) {
                this._peer.destroy();
                this._peer = null;
                this._localId = '';
            }
        }
    }

    isConnected() {
        return this._peer !== null && !this._peer.disconnected && this._connections.size > 0;
    }

    _handlePeerError(err) {
        const errorType = err.type || 'unknown';
        switch (errorType) {
            case 'peer-unavailable':
                console.info(`[Mesh] Target node currently unreachable.`);
                break;
            case 'network':
                console.warn('[Mesh] Lost contact with signaling server.');
                break;
            case 'server-error':
                console.error('[Mesh] PeerJS core signaling relays are unresponsive.');
                break;
            default:
                console.error(`[Mesh] Unhandled PeerJS exception:`, err);
        }
    }
}

export const meshNetwork = new MeshNetwork();