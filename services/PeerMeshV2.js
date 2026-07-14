/**
 * PeerMeshV2.js
 * Distributed Knowledge Graph synchronization using WebRTC.
 * Sandbox Version: Built to run parallel to existing PeerMesh web-auth systems.
 * Allows phones and laptops to share database payloads instantly without a server.
 */

import { cryptoVault } from './CryptoVault.js';
import { TrustManager } from './TrustManager.js';
import { registry, ConnectionState } from './ConnectionRegistry.js';
import state from '../core/state.js';

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
                    const targetPeer = match[1];
                    console.log(`[PeerMeshV2] Peer ${targetPeer} unavailable. Triggering Reconnect Manager.`);
                    registry.scheduleReconnect(targetPeer, null, null, (pid) => {
                        this.connectToFamilyMember(pid, { id: pid, installationId: 'retry' }).catch(e => console.warn(e));
                    });
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
        if (!this.peer) {
            throw new Error("Network not ready yet. Try again later!");
        }
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
        
        let uid = window.appState?.user?.uid || state.user?.uid;
        if (!uid) {
            try {
                const { auth } = await import('../core/firebase.js');
                uid = auth?.currentUser?.uid;
            } catch(e) {}
        }
        
        const conn = this.peer.connect(targetPeerId, {
            metadata: {
                v2Handshake: true,
                firebaseUid: uid, // Send our Firebase UID for trust
                installationId: state.installationId || localStorage.getItem('medcheck_installation_id'),
                name: state.userProfile?.name || state.user?.displayName || 'Unknown Device',
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
                
                const myInstallId = state.installationId || localStorage.getItem('medcheck_installation_id');
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
                // We initiated the connection by scanning their QR code, or retrying.
                console.log(`[PeerMeshV2] Device matches scanned QR payload. Waiting for approver to accept...`);
                conn._meshState = 'AUTHENTICATING';
            } else {
                // They initiated the connection. Check if they are already trusted.
                import('../services/TrustManager.js').then(async ({ TrustManager }) => {
                    const trustedProfiles = await TrustManager.getTrustedProfiles();
                    const incomingUid = incomingMetadata ? incomingMetadata.firebaseUid : null;
                    const isTrusted = incomingUid && trustedProfiles.some(p => p.patientUid === incomingUid || p.trustedUid === incomingUid);

                    if (isTrusted) {
                        console.log(`[PeerMeshV2] Device is KNOWN (${incomingUid}). Auto-Authorizing incoming connection...`);
                        
                        let uid = window.appState?.user?.uid || state.user?.uid;
                        if (!uid) {
                            try {
                                const { auth } = await import('../core/firebase.js');
                                uid = auth?.currentUser?.uid;
                            } catch(e) {}
                        }
                        
                        // We are the Approver, but we auto-approve.
                        // We must send our HANDSHAKE_ACK to let the Initiator know we accept.
                        const ackPayload = {
                            type: 'HANDSHAKE_ACK',
                            firebaseUid: uid,
                            installationId: state.installationId || localStorage.getItem('medcheck_installation_id'),
                            permissions: null,
                            nonceResponse: incomingMetadata ? incomingMetadata.nonce : null
                        };
                        conn.send(ackPayload);
                        
                        conn._meshState = 'AUTHORIZED';
                        registry.setState(conn.peer, ConnectionState.AUTHORIZED);
                        
                        // Transition to SYNC_ACTIVE to allow data exchange
                        setTimeout(() => {
                            if (conn && conn.open) {
                                conn._meshState = 'SYNC_ACTIVE';
                                registry.setState(conn.peer, ConnectionState.SYNC_ACTIVE);
                                window.dispatchEvent(new CustomEvent('peermesh:connection-established', { detail: { peer: conn.peer } }));
                            }
                        }, 500);

                    } else {
                        console.log(`[PeerMeshV2] Device is UNKNOWN. Requesting user approval...`);
                        window.dispatchEvent(new CustomEvent('peermesh:incoming-request', {
                            detail: { conn: conn, payload: incomingMetadata }
                        }));
                    }
                }).catch(e => console.error('[PeerMeshV2] Error checking trust:', e));
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

        conn.on('data', async (payload) => {
            console.log(`[PeerMeshV2] 📦 Data received from ${conn.peer}:`, payload);

            if (payload && payload.type === 'HANDSHAKE_ACK') {
                if (conn._meshState === 'AUTHENTICATING' || conn._meshState === 'CONNECTED_UNTRUSTED') {
                    
                    // Verify installationId exactly once during HANDSHAKE_ACK
                    const expectedInstallId = conn._expectedRemoteInstallId;
                    if (expectedInstallId && expectedInstallId !== 'manual' && payload.installationId && payload.installationId !== expectedInstallId) {
                        console.error(`[PeerMeshV2] ❌ IDENTITY MISMATCH in ACK! Expected ${expectedInstallId} but got ${payload.installationId}. Dropping connection.`);
                        conn.close();
                        return;
                    }
                    
                    console.log(`[PeerMeshV2] Handshake ACK received and verified. Trust Established!`);
                    conn._meshState = 'AUTHORIZED';
                    registry.setState(conn.peer, ConnectionState.AUTHORIZED);
                    
                    // Finalize trust establishment (Initiator Side)
                    // The device that generated the QR code (the Approver) is the Patient.
                    // The device that scanned the QR code (us, the Initiator) is the Caregiver.
                    let localUid = window.appState?.user?.uid || state.user?.uid;
                    if (localUid && payload.firebaseUid) {
                        await TrustManager.establishTrust(
                            payload.firebaseUid, // They are the Patient
                            localUid, // We are the Caregiver
                            conn.metadata?.name || 'Unknown Patient', // Their name
                            window.appState?.userProfile?.name || state.userProfile?.name || 'Caregiver', // Our name
                            'CAREGIVER'
                        );
                    } else {
                        console.warn(`[PeerMeshV2] Initiator SKIPPED establishTrust! localUid (${localUid}) or payload.firebaseUid (${payload.firebaseUid}) is missing.`);
                    }
                    // Success! Transition to SYNC_ACTIVE for data sync or presence.
                    conn._meshState = 'SYNC_ACTIVE';
                    registry.setState(conn.peer, ConnectionState.SYNC_ACTIVE);
                    console.log(`[PeerMeshV2] 🟢 Pairing complete. Transitioned to SYNC_ACTIVE.`);
                    
                    window.dispatchEvent(new CustomEvent('peermesh:connection-established', { detail: { peer: conn.peer } }));
                    window.dispatchEvent(new CustomEvent('peermesh:pairing-complete'));
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

    async acceptConnection(conn, permissions, incomingPayload) {
        if (!conn || !conn.open) return;
        
        console.log(`[PeerMeshV2] User approved connection. Finalizing trust...`);
        let localUid = window.appState?.user?.uid || state.user?.uid;
        if (!localUid) {
            try {
                const { auth } = await import('../core/firebase.js');
                localUid = auth?.currentUser?.uid;
            } catch(e) {}
        }
        console.log(`[PeerMeshV2] Resolved local UID:`, localUid);
        console.log(`[PeerMeshV2] incomingPayload:`, incomingPayload);
        
        if (localUid && incomingPayload && incomingPayload.firebaseUid) {
            await TrustManager.establishTrust(
                localUid,
                incomingPayload.firebaseUid,
                window.appState?.userProfile?.name || state.userProfile?.name || 'Unknown',
                incomingPayload.name,
                'CAREGIVER'
            );
        } else {
            console.warn(`[PeerMeshV2] SKIPPED establishTrust! localUid (${localUid}) or incomingPayload.firebaseUid is missing.`);
        }

        this.transitionToAuthenticating(conn, { permissions: permissions }, null, true);
    }

    async transitionToAuthenticating(conn, trustedRecord, scannedPayload = null, isApprover = false) {
        conn._meshState = 'AUTHENTICATING';
        
        let uid = window.appState?.user?.uid || state.user?.uid;
        if (!uid) {
            try {
                const { auth } = await import('../core/firebase.js');
                uid = auth?.currentUser?.uid;
            } catch(e) {}
        }
        
        // Send our ack + UID
        const ackPayload = {
            type: 'HANDSHAKE_ACK',
            firebaseUid: uid, // Send our UID back
            installationId: state.installationId || localStorage.getItem('medcheck_installation_id'),
            permissions: trustedRecord ? trustedRecord.permissions : null,
            nonceResponse: (conn.metadata && conn.metadata.nonce) ? conn.metadata.nonce : (scannedPayload ? scannedPayload.nonce : null)
        };
        
        // WebRTC data channels are already secured by DTLS. Do not use local-only CryptoVault here.
        conn.send(ackPayload);
        
        if (isApprover) {
            conn._meshState = 'AUTHORIZED';
            registry.setState(conn.peer, ConnectionState.AUTHORIZED);
            console.log(`[PeerMeshV2] 🟢 Pairing complete (Approver side). Transitioned to SYNC_ACTIVE.`);
            
            setTimeout(() => {
                if (conn && conn.open) {
                    conn._meshState = 'SYNC_ACTIVE';
                    registry.setState(conn.peer, ConnectionState.SYNC_ACTIVE);
                    window.dispatchEvent(new CustomEvent('peermesh:connection-established', { detail: { peer: conn.peer } }));
                    window.dispatchEvent(new CustomEvent('peermesh:pairing-complete'));
                }
            }, 500);
        }
    }

    // Removed negotiateSync, flushQueue, sendMessage, broadcastUpdate
}
