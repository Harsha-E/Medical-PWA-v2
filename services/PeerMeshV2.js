/**
 * PeerMeshV2.js
 * Distributed Knowledge Graph synchronization using WebRTC.
 * Sandbox Version: Built to run parallel to existing PeerMesh web-auth systems.
 * Allows phones and laptops to share database payloads instantly without a server.
 */

export default class PeerMeshV2 {
    constructor(onSyncReceived) {
        if (typeof Peer === 'undefined') {
            console.error("[PeerMeshV2] PeerJS library not found. Add CDN to index.html.");
            return;
        }

        this.onSyncReceived = onSyncReceived; // Callback when another device sends data
        this.connections = new Map();
        
        // Initialize Peer with auto-generated ID, or grab a saved one from localStorage (Isolated Key)
        const savedId = localStorage.getItem('medcheck_peer_v2_id');
        this.peer = savedId ? new Peer(savedId) : new Peer();

        this.setupListeners();
    }

    setupListeners() {
        this.peer.on('open', (id) => {
            console.log(`[PeerMeshV2] 🟢 Node Online. Device ID: ${id}`);
            localStorage.setItem('medcheck_peer_v2_id', id);
        });

        // Listen for incoming connections from family members
        this.peer.on('connection', (conn) => {
            console.log(`[PeerMeshV2] 🔗 Incoming connection from: ${conn.peer}`);
            this.manageConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('[PeerMeshV2] Network Error:', err);
        });
    }

    connectToFamilyMember(targetPeerId) {
        if (this.connections.has(targetPeerId)) {
            console.log(`[PeerMeshV2] Already connected to ${targetPeerId}`);
            return;
        }
        console.log(`[PeerMeshV2] Attempting to dial ${targetPeerId}...`);
        const conn = this.peer.connect(targetPeerId);
        this.manageConnection(conn);
    }

    manageConnection(conn) {
        conn.on('open', () => {
            console.log(`[PeerMeshV2] ✅ Secure channel opened with ${conn.peer}`);
            this.connections.set(conn.peer, conn);
        });

        conn.on('data', (payload) => {
            console.log(`[PeerMeshV2] 📦 Data received from ${conn.peer}:`, payload);
            if (this.onSyncReceived) {
                // Trigger the local database update
                this.onSyncReceived(payload);

                // Dispatch global event for UI visual data pulses
                window.dispatchEvent(new CustomEvent('peermesh:data-received', {
                    detail: { from: conn.peer, payload: payload }
                }));
            }
        });

        conn.on('close', () => {
            console.log(`[PeerMeshV2] ❌ Disconnected from ${conn.peer}`);
            this.connections.delete(conn.peer);
        });
    }

    broadcastUpdate(action, data) {
        // Send a database update (e.g., added a new med) to all connected devices
        const payload = {
            timestamp: Date.now(),
            action: action, // e.g., 'ADD_MEDICATION'
            data: data
        };

        let sentCount = 0;
        this.connections.forEach((conn, peerId) => {
            if (conn.open) {
                conn.send(payload);
                sentCount++;
                
                // Dispatch global event for UI visual data pulses
                window.dispatchEvent(new CustomEvent('peermesh:data-sent', {
                    detail: { to: peerId, payload: payload }
                }));
            }
        });
        
        console.log(`[PeerMeshV2] 📡 Broadcasted update to ${sentCount} devices.`);
    }
}
