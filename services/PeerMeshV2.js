/**
 * PeerMeshV2.js
 * Distributed Knowledge Graph synchronization using WebRTC.
 * Sandbox Version: Built to run parallel to existing PeerMesh web-auth systems.
 * Allows phones and laptops to share database payloads instantly without a server.
 */

import { cryptoVault } from './CryptoVault.js';
import { db } from '../core/firebase.js';
import { doc, getDoc, updateDoc, arrayUnion, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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

    get peerId() {
        return this.peer ? this.peer.id : null;
    }

    setupListeners() {
        this.peer.on('open', (id) => {
            console.log(`[PeerMeshV2] 🟢 Node Online. Device ID: ${id}`);
            localStorage.setItem('medcheck_peer_v2_id', id);
            window.dispatchEvent(new CustomEvent('peermesh:ready', { detail: { id } }));
            
            // Trigger Boot Reconciliation
            this.reconcileOfflineQueue(id);
        });

        // Listen for incoming connections from family members
        this.peer.on('connection', (conn) => {
            console.log(`[PeerMeshV2] 🔗 Incoming connection from: ${conn.peer}`);
            this.manageConnection(conn);
        });

        this.peer.on('error', (err) => {
            if (err.type === 'network' || err.type === 'server-error' || (err.message && err.message.includes('Lost connection'))) {
                console.warn('[PeerMeshV2] Disconnected from signaling server (Offline mode active).');
                return;
            }
            console.error('[PeerMeshV2] Network Error:', err);
            if (err.type === 'unavailable-id' || (err.message && err.message.includes('is taken'))) {
                console.warn('[PeerMeshV2] ID was taken (ghost connection). Generating a new ID...');
                localStorage.removeItem('medcheck_peer_v2_id');
                this.peer.destroy();
                this.peer = new Peer();
                this.setupListeners();
            }
        });
    }

    async reconcileOfflineQueue(peerId) {
        if (!peerId) return;
        
        // Wait for Firebase Auth to be ready before querying Firestore
        const { auth } = await import('../core/firebase.js');
        const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js');
        
        const checkQueue = async (user) => {
            if (!user) return; // Only authenticated users can read sync_queue
            
            try {
                console.log(`[PeerMeshV2] 🔄 Checking Firestore sync_queue for offline messages...`);
                const targetRef = doc(db, 'sync_queue', peerId);
                const docSnap = await getDoc(targetRef);
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.messages && data.messages.length > 0) {
                        console.log(`[PeerMeshV2] Found ${data.messages.length} offline messages in queue. Processing...`);
                        
                        const SyncBridgeModule = await import('./SyncBridge.js');
                        
                        for (const packet of data.messages) {
                            let payload;
                            try {
                                if (typeof packet.payload === 'string' && packet.payload.includes('.')) {
                                    payload = await cryptoVault.decryptObject(packet.payload);
                                } else {
                                    payload = packet.payload;
                                }
                                if (payload && payload.type === 'CRDT_SYNC') {
                                    SyncBridgeModule.default.applyIncomingSync(payload, 'FIRESTORE_QUEUE');
                                } else if (this.onSyncReceived) {
                                    this.onSyncReceived(payload);
                                }
                            } catch (e) {
                                console.error('[PeerMeshV2] Failed to process queued message:', e);
                            }
                        }
                        
                        // Delete the queue after successful processing
                        await deleteDoc(targetRef);
                        console.log(`[PeerMeshV2] ✅ Offline queue processed and cleared.`);
                    }
                } else {
                    console.log(`[PeerMeshV2] No offline messages found.`);
                }
            } catch (err) {
                console.error(`[PeerMeshV2] Boot Reconciliation failed:`, err);
            }
        };

        if (auth.currentUser) {
            checkQueue(auth.currentUser);
        } else {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    checkQueue(user);
                }
                // Unsubscribe after the first evaluation so it only runs once per boot
                unsubscribe();
            });
        }
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

            // Flush offline queue on new connection
            import('./SyncBridge.js').then(module => {
                module.default.processQueue(this);
            }).catch(err => console.error("Failed to load SyncBridge for flush", err));
        });

        conn.on('data', async (encryptedPayload) => {
            if (!cryptoVault.isUnlocked()) {
                console.warn('[PeerMeshV2] Received data but vault is locked. Cannot decrypt.');
                return;
            }

            let payload;
            try {
                if (typeof encryptedPayload === 'string' && encryptedPayload.includes('.')) {
                    payload = await cryptoVault.decryptObject(encryptedPayload);
                } else {
                    payload = encryptedPayload; // Fallback for unencrypted local dev traffic
                }
            } catch (e) {
                console.error('[PeerMeshV2] Failed to decrypt payload:', e);
                return;
            }

            console.log(`[PeerMeshV2] 📦 Decrypted data received from ${conn.peer}:`, payload);

            if (payload && payload.type === 'CRDT_SYNC') {
                import('./SyncBridge.js').then(module => {
                    module.default.applyIncomingSync(payload, conn.peer);
                });
            } else if (payload && (payload.type === 'missed_dose' || payload.type === 'alert')) {
                // Trigger Service Worker Push Notification
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'show_notification',
                        payload: payload
                    });
                } else if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(payload.title || 'MedCare Alert', {
                        body: payload.body || 'You have an important medication alert.',
                        icon: '/assets/logo.webp'
                    });
                }
            } else if (this.onSyncReceived) {
                // Trigger the local database update
                this.onSyncReceived(payload);
            }

            // Dispatch global event for UI visual data pulses
            window.dispatchEvent(new CustomEvent('peermesh:data-received', {
                detail: { from: conn.peer, payload: payload }
            }));
        });

        conn.on('close', () => {
            console.log(`[PeerMeshV2] ❌ Disconnected from ${conn.peer}`);
            this.connections.delete(conn.peer);
        });
    }

    async sendMessage(peerId, message) {
        let encrypted = message;
        if (cryptoVault.isUnlocked()) {
            encrypted = await cryptoVault.encryptObject(message);
        } else {
            console.warn('[PeerMeshV2] Vault locked, sending unencrypted (unsafe)');
        }

        const conn = this.connections.get(peerId);
        if (conn && conn.open) {
            conn.send(encrypted);
        } else {
            console.log(`[PeerMeshV2] Peer ${peerId} offline. Hybrid Sync: Falling back to Firestore...`);
            try {
                const targetRef = doc(db, 'sync_queue', peerId);
                const docSnap = await getDoc(targetRef);
                const packet = { payload: encrypted, timestamp: Date.now() };
                
                if (docSnap.exists()) {
                    await updateDoc(targetRef, { messages: arrayUnion(packet) });
                } else {
                    await setDoc(targetRef, { messages: [packet] });
                }
                console.log(`[PeerMeshV2] Successfully queued message in Firestore for ${peerId}`);
            } catch (err) {
                console.error(`[PeerMeshV2] Hybrid Sync fallback failed:`, err);
                throw new Error(`Connection to ${peerId} is not open and Firestore fallback failed`);
            }
        }
    }

    async broadcastUpdate(action, data) {
        // Send a database update (e.g., added a new med) to all connected devices
        const payload = {
            timestamp: Date.now(),
            action: action, // e.g., 'ADD_MEDICATION'
            data: data
        };
        
        let outPayload = payload;
        if (cryptoVault.isUnlocked()) {
            outPayload = await cryptoVault.encryptObject(payload);
        }

        let sentCount = 0;
        this.connections.forEach((conn, peerId) => {
            if (conn.open) {
                conn.send(outPayload);
                sentCount++;
                
                // Dispatch global event for UI visual data pulses
                window.dispatchEvent(new CustomEvent('peermesh:data-sent', {
                    detail: { to: peerId, payload: payload } // keep plain for UI
                }));
            }
        });
        
        console.log(`[PeerMeshV2] 📡 Broadcasted update to ${sentCount} devices.`);
        return sentCount;
    }
}
