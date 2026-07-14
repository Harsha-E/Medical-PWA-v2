/**
 * PeerMeshV2.js
 * Distributed Knowledge Graph synchronization using WebRTC.
 * Sandbox Version: Built to run parallel to existing PeerMesh web-auth systems.
 * Allows phones and laptops to share database payloads instantly without a server.
 */

import { cryptoVault } from './CryptoVault.js';
import { TrustManager } from './TrustManager.js';
import { registry, ConnectionState } from './ConnectionRegistry.js';

export default class PeerMeshV2 {
    constructor(onSyncReceived) {
        if (typeof Peer === 'undefined') {
            console.error("[PeerMeshV2] PeerJS library not found. Add CDN to index.html.");
            return;
        }

        this.onSyncReceived = onSyncReceived; // Callback when another device sends data
        this.peer = null;
        
        // Initialize Peer deterministically using the authenticated User's UID
        import('../core/firebase.js').then(({ auth }) => {
            import('https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js').then(({ onAuthStateChanged }) => {
                onAuthStateChanged(auth, (user) => {
                    if (user && !this.peer) {
                        // Generate a beautiful, readable, permanent Peer ID like "MED-8XJ2AB9K"
                        const deterministicId = "MED-" + user.uid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
                        this.peer = new Peer(deterministicId);
                        this.setupListeners();
                    }
                });
            });
        });
    }

    get peerId() {
        return this.peer ? this.peer.id : null;
    }

    setupListeners() {
        this.peer.on('open', (id) => {
            console.log(`[PeerMeshV2] 🟢 Node Online. Device ID: ${id}`);
            localStorage.setItem('medcheck_peer_v2_id', id);
            window.dispatchEvent(new CustomEvent('peermesh:ready', { detail: { id } }));
        });

        // Listen for incoming connections from family members
        this.peer.on('connection', (conn) => {
            console.log(`[PeerMeshV2] 🔗 Incoming connection from: ${conn.peer}`);
            this.manageConnection(conn, { direction: 'incoming' });
        });

        this.peer.on('error', (err) => {
            if (err.type === 'network' || err.type === 'server-error' || (err.message && err.message.includes('Lost connection'))) {
                console.warn('[PeerMeshV2] Disconnected from signaling server (Offline mode active).');
                return;
            }
            console.error('[PeerMeshV2] Network Error:', err);
            
            // Reconnect Manager in ConnectionRegistry handles background retries for peer-unavailable.
            if (err.type === 'peer-unavailable') {
                const match = err.message.match(/peer (MED-[A-Z0-9\-]+)/);
                if (match && match[1]) {
                    console.log(`[PeerMeshV2] Peer ${match[1]} unavailable. Handled by Reconnect Manager.`);
                }
                return; // Suppress immediate UI error toast, ConnectionRegistry will handle state.
            }
            
            // Pop errors to UI
            import('../core/ui.js').then(({ showToast }) => {
                if (err.type === 'browser-incompatible') {
                    showToast("Browser does not support WebRTC.", 'error');
                } else if (err.type !== 'unavailable-id') {
                    showToast(err.message || "Connection failed.", 'error');
                }
            }).catch(e => console.warn(e));
            
            if (err.type === 'unavailable-id' || (err.message && err.message.includes('is taken'))) {
                console.warn('[PeerMeshV2] ID was taken (ghost connection). Generating a new fallback ID...');
                const failedId = this.peer.id || 'MED-RND';
                let baseId = failedId.split('-').slice(0, 2).join('-'); // Keep MED-XXXXXXXX
                const newId = `${baseId}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                this.peer.destroy();
                this.peer = new Peer(newId);
                this.setupListeners();
            }
        });
    }

    // Reconcile and AutoConnect removed for new Trust Architecture


    async connectToFamilyMember(targetPeerId, payload) {
        if (this.peer.disconnected && !this.peer.destroyed) {
            console.warn(`[PeerMeshV2] Disconnected from signaling server. Auto-reconnecting...`);
            this.peer.reconnect();
            await new Promise(resolve => {
                const onOpen = () => { cleanup(); resolve(); };
                const onError = () => { cleanup(); resolve(); };
                const cleanup = () => {
                    this.peer.off('open', onOpen);
                    this.peer.off('error', onError);
                };
                this.peer.on('open', onOpen);
                this.peer.on('error', onError);
                setTimeout(() => { cleanup(); resolve(); }, 5000); // 5s absolute max timeout
            });
        }

        const existingConn = registry.getConnection(targetPeerId);
        if (existingConn && existingConn.open && registry.getState(targetPeerId) === ConnectionState.SYNC_ACTIVE) {
            console.log(`[PeerMeshV2] Already connected to ${targetPeerId}`);
            return;
        }
        console.log(`[PeerMeshV2] Attempting to dial ${targetPeerId}...`);
        
        const conn = this.peer.connect(targetPeerId, {
            metadata: {
                v2Handshake: true,
                firebaseUid: window.state?.user?.uid, // Send our Firebase UID for trust
                installationId: window.state?.installationId || localStorage.getItem('medcheck_installation_id'),
                name: window.state?.userProfile?.name || window.state?.user?.displayName || 'Unknown Device',
                nonce: payload?.nonce || 'legacy'
            }
        });
        
        conn._expectedRemoteInstallId = payload?.installationId;
        conn._expectedRemoteName = payload?.name;
        
        this.manageConnection(conn, { direction: 'outgoing', remote: payload });
    }

    manageConnection(conn, context) {
        // State tracking for this specific connection
        conn._meshState = 'DISCOVERED';
        registry.setState(conn.peer, ConnectionState.DISCOVERED);
        
        conn.on('open', async () => {
            console.log(`[PeerMeshV2] ✅ Secure channel opened with ${conn.peer}`);
            
            // Collision Detection & Tie-Breaker
            const existingConn = registry.getConnection(conn.peer);
            if (existingConn && existingConn.open && existingConn !== conn) {
                console.warn(`[PeerMeshV2] Collision detected for ${conn.peer}! Resolving using installationId tie-breaker...`);
                
                const myInstallId = window.state?.installationId || localStorage.getItem('medcheck_installation_id');
                const incomingMetadata = conn.metadata || {};
                const theirInstallId = context.direction === 'outgoing' 
                    ? (context.remote ? context.remote.installationId : null)
                    : incomingMetadata.installationId;
                
                if (myInstallId && theirInstallId && myInstallId !== theirInstallId) {
                    const amIInitiator = myInstallId > theirInstallId;
                    const isOutgoing = context.direction === 'outgoing';
                    
                    if (amIInitiator && !isOutgoing) {
                        console.log(`[PeerMeshV2] I have higher ID but this is incoming. Closing incoming connection to avoid duplicate.`);
                        conn.close();
                        return;
                    } else if (!amIInitiator && isOutgoing) {
                        console.log(`[PeerMeshV2] I have lower ID but this is outgoing. Closing outgoing connection to avoid duplicate.`);
                        conn.close();
                        return;
                    }
                    console.log(`[PeerMeshV2] Collision won. Closing old ghost connection.`);
                    existingConn.close();
                } else {
                    // Fallback
                    existingConn.close();
                }
            }

            registry.setConnection(conn.peer, conn);
            registry.clearReconnectTask(conn.peer);
            
            // Stage 3: CONNECTED_UNTRUSTED
            conn._meshState = 'CONNECTED_UNTRUSTED';
            registry.setState(conn.peer, ConnectionState.CONNECTED_UNTRUSTED);
            
            const incomingMetadata = conn.metadata || {};
            const remoteInstallId = context.direction === 'outgoing' 
                ? (context.remote ? context.remote.installationId : null)
                : incomingMetadata.installationId;
            
            console.log(`[PeerMeshV2] 🔍 Authenticating. Direction: ${context.direction}, Peer ID: ${conn.peer}`);

            if (context.direction === 'outgoing') {
                // We initiated the connection by scanning their QR code.
                console.log(`[PeerMeshV2] Device matches scanned QR payload. Initiating trust...`);
                this.transitionToAuthenticating(conn, null, context.remote);
            } else {
                // They initiated the connection. Request user approval.
                console.log(`[PeerMeshV2] Device is UNKNOWN. Requesting user approval...`);
                window.dispatchEvent(new CustomEvent('peermesh:incoming-request', {
                    detail: { conn: conn, payload: incomingMetadata }
                }));
            }
        });

        conn.on('error', (err) => {
            console.error(`[PeerMeshV2] Connection error with ${conn.peer}:`, err);
            import('../core/ui.js').then(({ showToast }) => {
                showToast(`Connection to ${conn.peer} failed.`, 'error');
            }).catch(e => console.warn(e));
        });

        conn.on('close', () => {
            console.warn(`[PeerMeshV2] Connection with ${conn.peer} closed.`);
            
            // Only remove from registry if THIS is the active connection (handles ghost collision close gracefully)
            const activeConn = registry.getConnection(conn.peer);
            if (activeConn === conn) {
                registry.removeConnection(conn.peer);
                registry.setState(conn.peer, ConnectionState.DISCONNECTED);
                window.dispatchEvent(new CustomEvent('peermesh:connection-closed', { detail: { peer: conn.peer } }));
            }
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

            if (payload && payload.type === 'HANDSHAKE_ACK') {
                if (conn._meshState === 'AUTHENTICATING' || conn._meshState === 'CONNECTED_UNTRUSTED') {
                    
                    // Verify installationId exactly once during HANDSHAKE_ACK
                    const expectedInstallId = conn._expectedRemoteInstallId;
                    if (expectedInstallId && payload.installationId && payload.installationId !== expectedInstallId) {
                        console.error(`[PeerMeshV2] ❌ IDENTITY MISMATCH in ACK! Expected ${expectedInstallId} but got ${payload.installationId}. Dropping connection.`);
                        conn.close();
                        return;
                    }
                    
                    console.log(`[PeerMeshV2] Handshake ACK received and verified. Trust Established!`);
                    conn._meshState = 'AUTHORIZED';
                    registry.setState(conn.peer, ConnectionState.AUTHORIZED);
                    
                    // Finalize trust establishment
                    if (window.state?.user && payload.firebaseUid) {
                        await TrustManager.establishTrust(
                            window.state.user.uid,
                            payload.firebaseUid,
                            window.state.userProfile?.name,
                            conn.metadata?.name || 'Unknown',
                            'CAREGIVER'
                        );
                    }

                    // Success! Close connection. PeerJS is only for pairing now.
                    console.log(`[PeerMeshV2] 🟢 Pairing complete. Terminating temporary WebRTC channel.`);
                    window.dispatchEvent(new CustomEvent('peermesh:pairing-complete'));
                    conn.close();
                }
                return;
            }

            // Reject payload if not SYNC_ACTIVE (unless it's a legacy peer)
            if (conn._meshState !== 'SYNC_ACTIVE' && conn.metadata && conn.metadata.v2Handshake) {
                console.warn(`[PeerMeshV2] Rejected payload from ${conn.peer} because state is ${conn._meshState}`);
                return;
            }
            
            // Check if they are allowed to send to us (we receive it)
            if (conn.metadata && conn.metadata.v2Handshake && conn._meshPermissions?.sync?.send === false) {
                console.warn(`[PeerMeshV2] Rejected payload from ${conn.peer} due to permission constraint (they are not allowed to send)`);
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
            const activeConn = registry.getConnection(conn.peer);
            if (activeConn === conn) {
                registry.removeConnection(conn.peer);
                registry.setState(conn.peer, ConnectionState.DISCONNECTED);
            }
        });
    }

    // Called by UI when user clicks "ACCEPT" on the modal
    async acceptConnection(conn, permissions, incomingPayload) {
        if (!conn || !conn.open) return;
        
        console.log(`[PeerMeshV2] User approved connection. Finalizing trust...`);
        
        if (window.state?.user && incomingPayload.firebaseUid) {
            await TrustManager.establishTrust(
                window.state.user.uid,
                incomingPayload.firebaseUid,
                window.state.userProfile?.name,
                incomingPayload.name,
                'CAREGIVER'
            );
        }

        this.transitionToAuthenticating(conn, { permissions: permissions }, null, true);
    }

    async transitionToAuthenticating(conn, trustedRecord, scannedPayload = null, isApprover = false) {
        conn._meshState = 'AUTHENTICATING';
        
        // Send our ack + UID
        const ackPayload = {
            type: 'HANDSHAKE_ACK',
            firebaseUid: window.state?.user?.uid, // Send our UID back
            installationId: window.state?.installationId || localStorage.getItem('medcheck_installation_id'),
            permissions: trustedRecord ? trustedRecord.permissions : null,
            nonceResponse: (conn.metadata && conn.metadata.nonce) ? conn.metadata.nonce : (scannedPayload ? scannedPayload.nonce : null)
        };
        
        if (cryptoVault.isUnlocked()) {
            const enc = await cryptoVault.encryptObject(ackPayload);
            conn.send(enc);
        } else {
            conn.send(ackPayload);
        }
        
        if (isApprover) {
            conn._meshState = 'AUTHORIZED';
            registry.setState(conn.peer, ConnectionState.AUTHORIZED);
            console.log(`[PeerMeshV2] 🟢 Pairing complete (Approver side). Terminating temporary WebRTC channel.`);
            window.dispatchEvent(new CustomEvent('peermesh:pairing-complete'));
            conn.close();
        }
    }

    // Removed negotiateSync, flushQueue, sendMessage, broadcastUpdate
}
