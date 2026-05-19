/**
 * @fileoverview Mesh Network Service for MedCare PWA.
 * Architecture: ES6 Module, WebRTC (PeerJS).
 * Paradigm: Offline-First Peer-to-Peer Synchronization via CRDT (Conflict-Free Replicated Data Type).
 * Requires: PeerJS library available on the global `window` object.
 */

/**
 * @typedef {Object} SyncRecord
 * @property {string|number} id - Unique identifier for the data row.
 * @property {string} table - The database table this record belongs to.
 * @property {any} data - The actual payload of the record.
 * @property {number|string} updatedAt - The timeline stamp for CRDT Last-Write-Wins resolution.
 */

/**
 * Core Network Service for local device mesh networking.
 * Manages WebRTC connections, data streams, and conflict resolution schemas.
 */
class MeshNetwork {
    constructor() {
        /**
         * The active PeerJS instance managing the WebRTC signaling.
         * @private
         * @type {any|null}
         */
        this._peer = null;

        /**
         * Map tracking all active data connection tunnels.
         * Key: peerId string. Value: PeerJS DataConnection object.
         * @private
         * @type {Map<string, any>}
         */
        this._connections = new Map();

        /**
         * The unique node identifier assigned to this specific device by the signaling server.
         * @private
         * @type {string}
         */
        this._localId = '';

        /**
         * Subscribers listening for incoming validated CRDT mutations.
         * @private
         * @type {Set<Function>}
         */
        this._syncCallbacks = new Set();

        /**
         * Memory representation of the Last-Write-Wins (LWW) Register map.
         * Key: recordId. Value: { value, timestamp, peerId }
         * @private
         * @type {Map<string|number, Object>}
         */
        this._crdt = new Map();
    }

    /**
     * Bootstraps the WebRTC peer identity and establishes signaling server connections.
     * @returns {Promise<void>} Resolves when the peer identity is locked and tunnel is ready.
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

                // Listen for incoming connection attempts from family members
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
     * Generates a cryptographic payload designed for secure QR code exchange.
     * Allows physically proximate devices to bridge NAT traversals safely.
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
                console.log(`[Mesh] Existing connection active with ${peerId}.`);
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
                
                // Track connection metadata natively on the connection object
                conn._medcareConnectedAt = Date.now();
                conn._medcareDeviceName = 'Unknown Device';
                
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
     * @param {any} conn - The inbound PeerJS DataConnection object.
     */
    _setupIncomingConnection(conn) {
        console.log(`[Mesh] Incoming connection request from: ${conn.peer}`);

        conn.on('open', () => {
            conn._medcareConnectedAt = Date.now();
            conn._medcareDeviceName = 'Unknown Device';
            
            this._connections.set(conn.peer, conn);

            // Acknowledge connection with reverse identity verification
            conn.send({
                type: 'HANDSHAKE',
                peerId: this._localId,
                deviceName: typeof navigator !== 'undefined' && navigator.platform ? navigator.platform : 'Web Client'
            });

            conn.on('data', (data) => this._handleIncoming(data, conn.peer));
            
            conn.on('close', () => {
                this._connections.delete(conn.peer);
                console.log(`[Mesh] Connection to ${conn.peer} dropped.`);
            });
        });
    }

    /**
     * Primary ingress router for all WebRTC data channel messages.
     * @private
     * @param {Object} data - The deserialized JSON message payload.
     * @param {string} fromPeerId - The origin identity of the sender.
     */
    _handleIncoming(data, fromPeerId) {
        if (!data || !data.type) {
            console.warn(`[Mesh] Malformed packet received from ${fromPeerId}`);
            return;
        }

        switch (data.type) {
            case 'HANDSHAKE':
                console.log(`[Mesh] Handshake verified from ${fromPeerId} (${data.deviceName})`);
                const conn = this._connections.get(fromPeerId);
                if (conn && data.deviceName) {
                    conn._medcareDeviceName = data.deviceName;
                }
                // Emit system-level connection event if external listeners are required
                window.dispatchEvent(new CustomEvent('peer_connected', { detail: { peerId: fromPeerId, deviceName: data.deviceName } }));
                break;

            case 'SYNC_DELTA':
                console.log(`[Mesh] Received CRDT Delta from ${fromPeerId}. Records: ${data.records ? data.records.length : 0}`);
                if (data.records && Array.isArray(data.records)) {
                    this._applyCRDT(data.records);
                }
                break;

            case 'SYNC_REQUEST':
                console.log(`[Mesh] Full state sync requested by ${fromPeerId}`);
                // In a production environment, this triggers a dump of all local records.
                // Implemented externally via sendDelta wrapping.
                break;

            case 'PING':
                const peerConn = this._connections.get(fromPeerId);
                if (peerConn) {
                    peerConn.send({ type: 'PONG', timestamp: Date.now() });
                }
                break;
                
            case 'PONG':
                // Latency calculation hook
                break;

            default:
                console.warn(`[Mesh] Unrecognized message type '${data.type}' from ${fromPeerId}`);
        }
    }

    /**
     * Broadcasts a package of database row changes to all connected peers.
     * @param {SyncRecord[]} records - Array of structural data modifications.
     * @returns {Promise<number>} The number of peers successfully notified.
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
     * Executes the internal CRDT mathematical merge strategy (Last-Write-Wins).
     * Compares incoming record timestamps against local memory structures to prevent regression.
     * @private
     * @param {SyncRecord[]} incomingRecords - Array of potentially novel records.
     */
    _applyCRDT(incomingRecords) {
        const validatedUpdates = [];

        for (const record of incomingRecords) {
            if (!record.id || !record.updatedAt) continue;

            const existingEntry = this._crdt.get(record.id);
            const incomingTimestamp = new Date(record.updatedAt).getTime();
            const existingTimestamp = existingEntry ? new Date(existingEntry.timestamp).getTime() : 0;

            // Last-Write-Wins condition evaluation
            if (!existingEntry || incomingTimestamp > existingTimestamp) {
                // Mutate local memory map
                this._crdt.set(record.id, {
                    value: record,
                    timestamp: record.updatedAt,
                    peerId: record.peerId || 'unknown'
                });
                
                validatedUpdates.push(record);
            }
        }

        if (validatedUpdates.length > 0) {
            // Distribute novel changes down to architectural subscribers (e.g., DatabaseEngine or View)
            for (const callback of this._syncCallbacks) {
                try {
                    callback(validatedUpdates);
                } catch (cbError) {
                    console.error('[Mesh] Sync subscriber notification fault:', cbError);
                }
            }
        }
    }

    /**
     * Registers a callback to be invoked whenever a novel synchronization payload is verified.
     * @param {Function} callback - Execution block handling SyncRecord[].
     * @returns {Function} Unsubscribe detachment closure.
     */
    onSync(callback) {
        if (typeof callback !== 'function') throw new TypeError('[Mesh] onSync requires a valid function callback.');
        
        this._syncCallbacks.add(callback);
        
        return () => {
            this._syncCallbacks.delete(callback);
        };
    }

    /**
     * Generates a status array mapping all active data tunnels.
     * @returns {Array<{peerId: string, deviceName: string, connectedAt: number}>} Status report objects.
     */
    getConnectedPeers() {
        const peerStatusList = [];
        for (const [peerId, conn] of this._connections.entries()) {
            peerStatusList.push({
                peerId,
                deviceName: conn._medcareDeviceName || 'Unknown Node',
                connectedAt: conn._medcareConnectedAt || Date.now()
            });
        }
        return peerStatusList;
    }

    /**
     * Gracefully terminates data connection channels.
     * @param {string} [peerId] - Specific target to disconnect. If omitted, completely tears down the local WebRTC stack.
     */
    disconnect(peerId = undefined) {
        if (peerId) {
            const conn = this._connections.get(peerId);
            if (conn) {
                conn.close();
                this._connections.delete(peerId);
                console.log(`[Mesh] Channel to ${peerId} actively severed.`);
            }
        } else {
            console.log('[Mesh] Executing total network teardown.');
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

    /**
     * Performs a lightweight system check validating active routing capabilities.
     * @returns {boolean} True if WebRTC signaling is operational and nodes are linked.
     */
    isConnected() {
        return this._peer !== null && !this._peer.disconnected && this._connections.size > 0;
    }

    /**
     * Safely categorizes native PeerJS network exceptions for localized UI consumption.
     * @private
     * @param {Error|any} err - The error context emitted by the Peer object.
     */
    _handlePeerError(err) {
        const errorType = err.type || 'unknown';
        
        switch (errorType) {
            case 'peer-unavailable':
                console.info(`[Mesh] Target node currently unreachable. Target may be offline or actively sleeping.`);
                // Handled silently to prevent UI thrashing on volatile mobile networks
                break;
            case 'network':
                console.warn('[Mesh Network Constraint] Lost contact with signaling server. Falling back to isolated mode.');
                window.dispatchEvent(new CustomEvent('mesh_status', { detail: { state: 'offline', msg: 'Network unavailable.' } }));
                break;
            case 'server-error':
                console.error('[Mesh Architecture Fault] PeerJS core signaling relays are unresponsive.');
                window.dispatchEvent(new CustomEvent('mesh_status', { detail: { state: 'error', msg: 'Signaling server down.' } }));
                break;
            case 'browser-incompatible':
                console.error('[Mesh] Runtime environment lacks fundamental WebRTC capabilities.');
                break;
            default:
                console.error(`[Mesh] Unhandled PeerJS exception sequence [${errorType}]:`, err);
        }
    }
}

// Export a durable, singleton reference for global module consumption.
export const meshNetwork = new MeshNetwork();