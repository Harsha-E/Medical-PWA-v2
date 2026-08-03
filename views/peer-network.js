import state from '../core/state.js';
import { registry, ConnectionState } from '../services/ConnectionRegistry.js';

import { showToast } from '../core/ui.js';
import { escapeHTML } from '../core/utils.js';

export default class PeerNetworkView {
    constructor() {
        this.mesh = window.familyMesh || window.peerMeshV2;
        this.container = null;
        this.connectedPeer = null;
        this.abortController = new AbortController();
        this.cameraStream = null;
    }

    async render() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'w-full h-full min-h-screen overflow-y-auto relative text-[#fefcff] font-sans';
        }

        if (!window.peerMeshV2) {
            const { default: PeerMeshV2 } = await import('../services/PeerMeshV2.js');
            window.peerMeshV2 = new PeerMeshV2();
        }
        this.mesh = window.peerMeshV2;
        
        const fallbackId = state.user && state.user.uid ? "MED-" + state.user.uid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase() : 'LOADING...';
        this.myPeerId = (this.mesh && this.mesh.peerId) ? this.mesh.peerId : fallbackId;
        
        window.addEventListener('peermesh:ready', (e) => {
            this.myPeerId = e.detail.id;
            if (this.container && this.container.parentNode) {
                this.renderContent();
            }
        }, { once: true, signal: this.abortController.signal });
        this.renderContent();
        return this.container;
    }

    renderContent() {
        const styles = `
            <style>
                .connect-pill-btn {
                    background: linear-gradient(135deg, #3d2127 0%, #1e0e12 100%);
                    border: 1px solid rgba(255, 184, 140, 0.35);
                    color: #ffffff;
                    box-shadow: 
                        4px 4px 10px rgba(0, 0, 0, 0.6),
                        inset 1px 1px 2px rgba(255, 255, 255, 0.2);
                    transition: all 0.2s ease;
                }
                .connect-pill-btn:hover {
                    background: #ffb88c;
                    color: #0a0407;
                    transform: scale(1.03);
                }
                .qr-sharp-img {
                    border-radius: 0px !important;
                    shape-rendering: crispEdges;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                
                #peer-scanner-container {
                    display: none;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                }
                #peer-scanner-container.active {
                    display: flex;
                }
                #peer-camera-feed {
                    width: 100%;
                    max-width: 300px;
                    border-radius: 1rem;
                    border: 2px solid rgba(255,184,140,0.5);
                    background: #000;
                    aspect-ratio: 1;
                    object-fit: cover;
                }
                
                #peer-approval-modal {
                    display: none;
                    position: fixed;
                    inset: 0;
                    z-index: 50;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(8px);
                }
                #peer-approval-modal.active {
                    display: flex;
                }
            </style>
        `;

        this.container.innerHTML = `
            ${styles}
            <!-- Gradient background layer -->
            <div class="fixed inset-0 z-0 pointer-events-none" style="background: radial-gradient(circle at 100% 0%, rgba(255, 184, 140, 0.12) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(127, 47, 93, 0.08) 0%, transparent 50%) #0a0407;"></div>
            <!-- Frosted glass blur layer -->
            <div class="fixed inset-0 z-[1] pointer-events-none backdrop-blur-3xl bg-[#0a0407]/40"></div>
            
            <main class="w-full px-4 md:px-8 pt-24 md:pt-8 md:pl-72 pb-28 md:pb-12 z-10 max-w-5xl mx-auto relative">
                <!-- Desktop 2-col on lg: QR left, roster right -->
                <div class="flex flex-col lg:flex-row lg:items-start lg:gap-8">
                
                <!-- Main Neumorphic Card -->
                <div class="w-full lg:max-w-md shrink-0 p-8 clay-glass-panel flex flex-col items-center relative overflow-hidden text-center space-y-6 transition-all duration-300">
                    <!-- Title -->
                    <h2 class="text-2xl md:text-3xl text-white font-bold font-display tracking-tight" id="peer-card-title">Link Device</h2>
                    
                    <!-- QR Code Default View -->
                    <div id="peer-qr-view" class="w-full flex flex-col items-center space-y-6">
                        <div id="peer-qr-container" class="bg-white p-5 rounded-2xl shadow-xl flex items-center justify-center min-w-[200px] min-h-[200px]">
                            <!-- QR Code injected here -->
                        </div>
                        
                        <div class="space-y-2 w-full">
                            <p class="text-[10px] text-[#ffb88c] uppercase tracking-widest font-mono font-bold">DIRECT PAIRING NODE</p>
                            <div id="peer-id-display" class="bg-black/50 px-6 py-3 rounded-full border border-white/10 text-[#ffb88c] font-mono text-xs font-bold tracking-wider select-all shadow-inner overflow-x-auto whitespace-nowrap scrollbar-hide cursor-pointer" title="Click to copy">
                                ${escapeHTML(this.myPeerId)}
                            </div>
                        </div>

                        <!-- SCAN Button -->
                        <button id="btn-scan-qr" class="w-full py-4 rounded-full bg-black/40 border border-white/10 text-white text-xs font-mono font-bold tracking-widest flex items-center justify-center gap-3 hover:bg-white/5 transition-all shadow-inner mt-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <rect x="7" y="7" width="3" height="3"/>
                                <rect x="14" y="7" width="3" height="3"/>
                                <rect x="7" y="14" width="3" height="3"/>
                                <rect x="14" y="14" width="3" height="3"/>
                            </svg>
                            SCAN QR CODE
                        </button>

                        <!-- Manual Entry -->
                        <div class="w-full pt-4 border-t border-white/10 flex items-center gap-2">
                            <input type="text" id="pairing-code" placeholder="Enter Peer ID..." class="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-full px-4 md:px-8 lg:px-12 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#ffb88c] transition-colors font-mono">
                            <button id="btn-connect" class="px-5 py-3 rounded-full bg-[#ffb88c] text-[#0a0407] text-xs font-mono font-bold tracking-widest hover:bg-[#ffcba8] transition-colors shadow-lg shadow-[#ffb88c]/20 shrink-0">
                                LINK
                            </button>
                        </div>
                    </div>

                    <!-- Inline Scanner View -->
                    <div id="peer-scanner-container">
                        <video id="peer-camera-feed" playsinline autoplay></video>
                        <canvas id="peer-scanner-canvas" class="hidden"></canvas>
                        
                        <p class="text-xs text-white/60 mt-4 mb-2 animate-pulse">Scanning for devices...</p>
                        
                        <button id="btn-cancel-scan" class="w-full py-3 rounded-full bg-white/10 border border-white/10 text-white text-xs font-mono font-bold tracking-widest flex items-center justify-center gap-3 hover:bg-white/20 transition-all mt-4">
                            CANCEL SCAN
                        </button>
                    </div>
                </div>

                <!-- The Roster -->
                <div class="w-full lg:flex-1 shrink-0 space-y-4 mt-8 lg:mt-0">
                    <div class="flex justify-between items-center px-2">
                        <h3 class="text-[10px] text-[#ffb88c] font-mono font-bold uppercase tracking-widest">TRUSTED CAREGIVERS & PATIENTS</h3>
                        <span class="text-[9px] text-[#10b981] font-mono font-bold uppercase tracking-widest border border-[#10b981]/40 bg-[#10b981]/10 rounded px-2.5 py-0.5">SECURE</span>
                    </div>

                    <!-- Active Connections or Empty State -->
                    <div id="roster-list" class="w-full space-y-3">
                        <div class="w-full py-10 rounded-[2rem] border border-dashed border-white/20 flex flex-col items-center justify-center">
                            <p class="text-[10px] text-white/40 uppercase tracking-widest font-mono text-center">NO TRUSTED PROFILES YET<br/><span class="opacity-50">Scan a QR code to link a device</span></p>
                        </div>
                    </div>
                </div>

                </div><!-- end 2-col flex -->
            </main>

            <!-- Peer Approval Modal -->
            <div id="peer-approval-modal">
                <div class="w-[90%] max-w-sm clay-glass-panel p-6 rounded-3xl flex flex-col space-y-4 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-1 bg-[#ffb88c]"></div>
                    
                    <h3 class="text-lg font-bold text-white font-display">Device wants to connect</h3>
                    <p class="text-sm text-white/70 leading-relaxed">
                        <strong id="modal-peer-name" class="text-white">Unknown Device</strong> wants to establish a secure PeerMesh connection.
                    </p>
                    
                    <div class="bg-black/30 rounded-xl p-4 border border-white/5 space-y-3 mt-2">
                        <h4 class="text-[10px] text-white/50 uppercase tracking-widest font-bold">Permissions</h4>
                        
                        <label class="flex items-start gap-3 cursor-pointer group">
                            <input type="checkbox" id="perm-send" checked class="w-4 h-4 mt-0.5 accent-[#ffb88c] bg-gray-800 border-gray-600 rounded cursor-pointer">
                            <span class="text-xs text-white/80 group-hover:text-white transition-colors">View my shared medical records</span>
                        </label>
                        
                        <label class="flex items-start gap-3 cursor-pointer group">
                            <input type="checkbox" id="perm-receive" class="w-4 h-4 mt-0.5 accent-[#ffb88c] bg-gray-800 border-gray-600 rounded cursor-pointer">
                            <span class="text-xs text-white/80 group-hover:text-white transition-colors">Send records to this device</span>
                        </label>
                        
                        <label class="flex items-start gap-3 cursor-pointer group">
                            <input type="checkbox" id="perm-auto" class="w-4 h-4 mt-0.5 accent-[#ffb88c] bg-gray-800 border-gray-600 rounded cursor-pointer">
                            <span class="text-xs text-white/80 group-hover:text-white transition-colors">Automatically sync future changes</span>
                        </label>
                    </div>

                    <div class="flex gap-3 mt-4 pt-2">
                        <button id="btn-reject-conn" class="flex-1 py-3 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-mono font-bold tracking-widest hover:bg-white/10 hover:text-white transition-colors">
                            REJECT
                        </button>
                        <button id="btn-accept-conn" class="flex-1 py-3 rounded-full bg-[#ffb88c] text-[#0a0407] text-xs font-mono font-bold tracking-widest hover:bg-[#ffcba8] transition-colors shadow-lg shadow-[#ffb88c]/20">
                            CONNECT
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Render QR
        import('../utils/QRManager.js').then(module => {
            const qrContainer = this.container.querySelector('#peer-qr-container');
            const installId = state.installationId || 'unknown';
            const devName = state.userProfile?.name || state.user?.displayName || 'MedCheck User';
            module.default.generateConnectQR(qrContainer, this.myPeerId, installId, devName);
        });

        // Peer node click listener for dashboard routing
        const activePeerCard = this.container.querySelector('#active-peer-card');
        if (activePeerCard) {
            activePeerCard.addEventListener('click', () => {
                if (this.connectedPeer) {
                    import('../core/state.js').then((module) => {
                        const state = module.default;
                        state.currentPeerContext = {
                            peerId: this.connectedPeer,
                            name: this.connectedPeer // Will update to use real name if available later
                        };
                        window.appState.setActiveProfileContext({ id: this.connectedPeer, name: this.connectedPeer });
                        window.location.hash = '#/dashboard';
                    });
                }
            });
        }

        this.refreshFamilyList();
        this.bindEvents();
    }

    async refreshFamilyList() {
        try {
            const { TrustManager } = await import('../services/TrustManager.js');
            const trustedProfiles = await TrustManager.getTrustedProfiles();
            const rosterList = this.container.querySelector('#roster-list');
            
            console.log(`[PeerNetworkView] refreshFamilyList: fetched ${trustedProfiles.length} profiles from Dexie.`, trustedProfiles);

            // Sync names from profile
            const myUid = state?.user?.uid;
            if (myUid) {
                import('../core/firebase.js').then(({ db: firestoreDb }) => {
                    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js').then(async ({ doc, getDoc }) => {
                        let changed = false;
                        for (const p of trustedProfiles) {
                            const targetUid = (p.patientUid === myUid) ? p.trustedUid : p.patientUid;
                            try {
                                const snap = await getDoc(doc(firestoreDb, 'users', targetUid));
                                if (snap.exists() && snap.data().name && snap.data().name !== p.name) {
                                    p.name = snap.data().name;
                                    await db.family.update(p.id, { name: p.name });
                                    changed = true;
                                }
                            } catch(e) {}
                        }
                        if (changed) this.refreshFamilyList(); // Re-render once updated
                    });
                });
            }

            if (!rosterList) return;

            if (trustedProfiles.length === 0) {
                rosterList.innerHTML = `
                    <div class="w-full py-10 rounded-[2rem] border border-dashed border-white/20 flex flex-col items-center justify-center">
                        <p class="text-[10px] text-white/40 uppercase tracking-widest font-mono text-center">NO TRUSTED PROFILES YET<br/><span class="opacity-50">Scan a QR code to link a device</span></p>
                    </div>
                `;
                return;
            }

            rosterList.innerHTML = '';
            trustedProfiles.forEach(profile => {
                const profileCard = document.createElement('div');
                profileCard.className = 'p-4 rounded-2xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-between hover:bg-gray-800 transition-colors cursor-pointer group';
                profileCard.onclick = () => {
                    // Update state to view this trusted profile
                    const myUid = state?.user?.uid;
                    const otherUid = profile.patientUid === myUid ? profile.trustedUid : profile.patientUid;
                    window.appState.setActiveProfileContext({ id: otherUid, name: profile.name });
                    window.location.hash = '#/dashboard'; // Route to dashboard with the active context
                };

                const peerIdStr = profile.patientUid ? profile.patientUid.substring(0, 8) : 'unknown';
                
                profileCard.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50">
                        <span class="text-lg font-bold text-indigo-400">${profile.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                        <h4 class="text-white font-bold tracking-wide">${escapeHTML(profile.name)}</h4>
                        <div class="text-emerald-400 text-xs font-bold tracking-widest mt-1 uppercase flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ${profile.role || 'CAREGIVER'}
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button class="btn-remove-peer w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20" title="Remove Connection">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                    <div class="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 text-gray-400 transition-all border border-gray-600/50">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
                    </div>
                </div>
                `;
                
                rosterList.appendChild(profileCard);
                
                const removeBtn = profileCard.querySelector('.btn-remove-peer');
                removeBtn.onclick = async (e) => {
                    e.stopPropagation(); // Don't trigger the card's onclick (dashboard navigation)
                    if (confirm(`Are you sure you want to remove the connection to ${profile.name}?`)) {
                        await TrustManager.revokeTrust(profile.patientUid, profile.trustedUid);
                        import('../core/ui.js').then(({ showToast }) => showToast(`Removed connection to ${profile.name}`, 'info'));
                        this.refreshFamilyList();
                    }
                };
            });
            
        } catch (err) {
            console.error("Failed to load trusted profiles:", err);
        }
    }

    bindEvents() {
        const btnScanQr = this.container.querySelector('#btn-scan-qr');
        const btnConnect = this.container.querySelector('#btn-connect');
        const inputCode = this.container.querySelector('#pairing-code');
        
        const peerQrView = this.container.querySelector('#peer-qr-view');
        const peerScannerContainer = this.container.querySelector('#peer-scanner-container');
        const videoElement = this.container.querySelector('#peer-camera-feed');
        const canvasElement = this.container.querySelector('#peer-scanner-canvas');
        const btnCancelScan = this.container.querySelector('#btn-cancel-scan');
        
        const approvalModal = this.container.querySelector('#peer-approval-modal');
        const modalPeerName = this.container.querySelector('#modal-peer-name');
        const btnAcceptConn = this.container.querySelector('#btn-accept-conn');
        const btnRejectConn = this.container.querySelector('#btn-reject-conn');
        
        const permSend = this.container.querySelector('#perm-send');
        const permReceive = this.container.querySelector('#perm-receive');
        const permAuto = this.container.querySelector('#perm-auto');

        let scanning = false;
        
        const stopCamera = () => {
            scanning = false;
            if (this.cameraStream) {
                this.cameraStream.getTracks().forEach(track => track.stop());
                this.cameraStream = null;
            }
            if (peerScannerContainer) peerScannerContainer.classList.remove('active');
            if (peerQrView) peerQrView.classList.remove('hidden');
        };

        const scanFrame = () => {
            if (!scanning) return;
            if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                const ctx = canvasElement.getContext('2d');
                canvasElement.width = videoElement.videoWidth;
                canvasElement.height = videoElement.videoHeight;
                ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
                
                if (typeof jsQR !== 'undefined') {
                    const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    if (code && code.data) {
                        const qrVal = code.data;
                        if (qrVal.includes('connect_v2=')) {
                            stopCamera();
                            let payloadV2 = qrVal.split('connect_v2=')[1];
                            try {
                                const decoded = JSON.parse(atob(payloadV2));
                                const meshInstance = this.mesh || window.familyMesh || window.peerMeshV2;
                                if (meshInstance && typeof meshInstance.connectToFamilyMember === 'function') {
                                    showToast('QR Scanned! Initiating secure link...', 'success');
                                    meshInstance.connectToFamilyMember(decoded.id, decoded).catch(err => {
                                        showToast(err.message, 'error');
                                    });
                                } else {
                                    showToast('Network not ready yet. Try again.', 'error');
                                }
                            } catch(e) {
                                console.error('[QR] Failed to parse V2 payload', e);
                                showToast('Invalid QR code format.', 'error');
                            }
                            return;
                        } else if (qrVal.includes('connect=')) {
                            stopCamera();
                            let peerId = qrVal.split('connect=')[1].split('&')[0];
                            const meshInstance = this.mesh || window.familyMesh || window.peerMeshV2;
                            if (meshInstance && typeof meshInstance.connectToFamilyMember === 'function') {
                                showToast('QR Scanned! Initiating secure link...', 'success');
                                meshInstance.connectToFamilyMember(peerId, { id: peerId, installationId: 'legacy' }).catch(err => {
                                    showToast(err.message, 'error');
                                });
                            } else {
                                showToast('Network not ready yet. Try again.', 'error');
                            }
                            return;
                        }
                    }
                }
            }
            requestAnimationFrame(scanFrame);
        };

        if (btnScanQr) {
            btnScanQr.onclick = async () => {
                peerQrView.classList.add('hidden');
                peerScannerContainer.classList.add('active');
                scanning = true;
                
                try {
                    this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    videoElement.srcObject = this.cameraStream;
                    videoElement.setAttribute('playsinline', true);
                    await videoElement.play();
                    requestAnimationFrame(scanFrame);
                } catch(e) {
                    console.error("[Camera Error]", e);
                    alert("Could not access camera. Please check permissions.");
                    stopCamera();
                }
            };
        }
        
        if (btnCancelScan) {
            btnCancelScan.onclick = stopCamera;
        }

        const peerIdDisplay = this.container.querySelector('#peer-id-display');
        if (peerIdDisplay) {
            peerIdDisplay.onclick = () => {
                navigator.clipboard.writeText(this.myPeerId);
                showToast('Peer ID copied to clipboard', 'success');
            };
        }

        if (btnConnect && inputCode) {
            btnConnect.onclick = async () => {
                let code = inputCode.value.trim();
                if (!code) {
                    alert('Please enter a pairing code or peer ID.');
                    return;
                }
                if (code.includes('connect=')) {
                    code = code.split('connect=')[1].split('&')[0];
                }
                btnConnect.innerText = "LINKING...";
                btnConnect.disabled = true;

                try {
                    const meshInstance = this.mesh || window.familyMesh || window.peerMeshV2;
                    if (meshInstance && typeof meshInstance.connectToFamilyMember === 'function') {
                        await meshInstance.connectToFamilyMember(code, { id: code, installationId: 'manual' });
                        showToast('Initiating secure link...', 'success');
                    } else {
                        showToast('Network not ready yet. Try again later!', 'error');
                    }
                } catch (e) {
                    console.warn('[Handshake Connection]', e);
                    showToast(e.message || 'Connection failed', 'error');
                }

                btnConnect.innerText = "LINK";
                btnConnect.disabled = false;
            };
        }
        
        // Modal logic
        window.addEventListener('peermesh:incoming-request', (e) => {
            const { conn, payload } = e.detail;
            modalPeerName.innerText = (payload && payload.name) ? payload.name : conn.peer;
            approvalModal.classList.add('active');
            
            btnAcceptConn.onclick = async () => {
                btnAcceptConn.disabled = true;
                btnAcceptConn.innerText = "CONNECTING...";
                
                if (this.mesh && typeof this.mesh.acceptConnection === 'function') {
                    try {
                        await this.mesh.acceptConnection(conn, {
                            sync: {
                                receive: permSend.checked,
                                send: permReceive.checked,
                                auto: permAuto.checked
                            },
                            records: { medications: true, reports: true, appointments: false, documents: false }
                        }, payload);
                    } catch (e) {
                        console.error('[Handshake Approval Failed]', e);
                    }
                }
                
                approvalModal.classList.remove('active');
                this.connectedPeer = conn.peer;
                showToast(`Connected to ${modalPeerName.innerText}`, 'success');
                
                // Now safely re-render because Dexie writes are definitely finished
                this.renderContent();
            };
            
            btnRejectConn.onclick = () => {
                approvalModal.classList.remove('active');
                conn.close();
            };
        }, { signal: this.abortController.signal });
        
        window.addEventListener('peermesh:connection-accepted', (e) => {
             this.connectedPeer = e.detail.peer;
             showToast(`Peer node accepted connection.`, 'success');
             this.renderContent();
        }, { signal: this.abortController.signal });

        window.addEventListener('peermesh:connection-closed', (e) => {
             if (this.connectedPeer === e.detail.peer) {
                 const currentState = typeof registry !== 'undefined' ? registry.getState(e.detail.peer) : null;
                 if (currentState === ConnectionState.WAITING_FOR_REMOTE || currentState === ConnectionState.RETRYING) {
                     return;
                 }
                 this.connectedPeer = null;
                 showToast('Peer node disconnected.', 'error');
                 this.renderContent();
             }
        }, { signal: this.abortController.signal });

        window.addEventListener('peermesh:pairing-complete', () => {
             this.renderContent();
        }, { signal: this.abortController.signal });

        window.addEventListener('peermesh:state-changed', (e) => {
            const { peerId, state } = e.detail;
            if (this.connectedPeer === peerId || (!this.connectedPeer && (state === ConnectionState.WAITING_FOR_REMOTE || state === ConnectionState.RETRYING))) {
                if (state === ConnectionState.WAITING_FOR_REMOTE || state === ConnectionState.RETRYING) {
                    this.connectedPeer = peerId;
                    this.renderContent();
                } else if (state === ConnectionState.CONNECTED) {
                    this.connectedPeer = peerId;
                    this.renderContent();
                } else if (state === ConnectionState.DISCONNECTED || state === ConnectionState.FAILED) {
                    if (this.connectedPeer === peerId) {
                        this.connectedPeer = null;
                        this.renderContent();
                    }
                }
            }
        }, { signal: this.abortController.signal });
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        if (window.peerMeshV2) {
            if (window.peerMeshV2.peer) {
                window.peerMeshV2.peer.destroy();
            }
            window.peerMeshV2 = null;
            this.mesh = null;
        }
    }
}
