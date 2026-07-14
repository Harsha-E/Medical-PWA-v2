import state from '../core/state.js';

import { showToast } from '../core/ui.js';
import { escapeHTML } from '../core/utils.js';

export default class PeerNetworkView {
    constructor() {
        this.mesh = window.familyMesh;
        this.container = null;
        this.connectedPeer = null;
    }

    async render() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'w-full h-full min-h-screen overflow-y-auto relative text-[#fefcff] font-sans';
        }

        this.mesh = window.familyMesh;
        
        const fallbackId = state.user && state.user.uid ? "MED-" + state.user.uid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase() : 'LOADING...';
        this.myPeerId = (this.mesh && this.mesh.peerId) ? this.mesh.peerId : fallbackId;
        
        window.addEventListener('peermesh:ready', (e) => {
            this.myPeerId = e.detail.id;
            if (this.container && this.container.parentNode) {
                this.renderContent();
            }
        }, { once: true });
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
            
            <main class="w-full px-4 md:px-8 pt-[112px] md:pt-8 md:pl-64 lg:pl-72 md:pt-8 md:pl-64 pb-28 md:pb-12 z-10 max-w-5xl mx-auto relative">
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
                        <h3 class="text-[10px] text-[#ffb88c] font-mono font-bold uppercase tracking-widest">CONNECTED NODES</h3>
                        <span class="text-[9px] text-[#10b981] font-mono font-bold uppercase tracking-widest border border-[#10b981]/40 bg-[#10b981]/10 rounded px-2.5 py-0.5">LIVE</span>
                    </div>

                    <!-- Active Connections or Empty State -->
                    <div id="roster-list" class="w-full">
                        ${this.connectedPeer ? `
                            <div class="p-6 rounded-[2rem] border border-[#10b981]/40 bg-[#10b981]/10 text-center space-y-1">
                                <span class="text-[10px] font-mono text-[#10b981] uppercase tracking-widest block">🟢 CONNECTED PEER NODE</span>
                                <h4 class="text-2xl font-bold font-display text-white">${escapeHTML(this.connectedPeer)}</h4>
                                <p class="text-[10px] font-mono text-white/50">P2P Encrypted Data Channel Active</p>
                            </div>
                        ` : `
                            <div class="w-full py-10 rounded-[2rem] border border-dashed border-white/20 flex flex-col items-center justify-center">
                                <p class="text-[10px] text-white/40 uppercase tracking-widest font-mono">NO ACTIVE CONNECTIONS</p>
                            </div>
                        `}
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
                            <input type="checkbox" id="perm-send" checked class="mt-0.5 form-checkbox bg-black/50 border-white/20 text-[#ffb88c] rounded focus:ring-0 focus:ring-offset-0">
                            <span class="text-xs text-white/80 group-hover:text-white transition-colors">View my shared medical records</span>
                        </label>
                        
                        <label class="flex items-start gap-3 cursor-pointer group">
                            <input type="checkbox" id="perm-receive" class="mt-0.5 form-checkbox bg-black/50 border-white/20 text-[#ffb88c] rounded focus:ring-0 focus:ring-offset-0">
                            <span class="text-xs text-white/80 group-hover:text-white transition-colors">Send records to this device</span>
                        </label>
                        
                        <label class="flex items-start gap-3 cursor-pointer group">
                            <input type="checkbox" id="perm-auto" class="mt-0.5 form-checkbox bg-black/50 border-white/20 text-[#ffb88c] rounded focus:ring-0 focus:ring-offset-0">
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

        this.bindEvents();
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

        let cameraStream = null;
        let scanning = false;
        
        const stopCamera = () => {
            scanning = false;
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                cameraStream = null;
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
                                if (Date.now() > decoded.expires) {
                                    alert('This connection QR code has expired. Please ask the peer to generate a new one.');
                                    return;
                                }
                                if (this.mesh && typeof this.mesh.connectToFamilyMember === 'function') {
                                    showToast('QR Scanned! Initiating secure link...', 'success');
                                    this.mesh.connectToFamilyMember(decoded.id, decoded);
                                }
                            } catch(e) {
                                console.error('[QR] Failed to parse V2 payload', e);
                            }
                            return;
                        } else if (qrVal.includes('connect=')) {
                            stopCamera();
                            let peerId = qrVal.split('connect=')[1].split('&')[0];
                            if (this.mesh && typeof this.mesh.connectToFamilyMember === 'function') {
                                showToast('QR Scanned! Initiating secure link...', 'success');
                                this.mesh.connectToFamilyMember(peerId, { id: peerId, installationId: 'legacy' });
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
                    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    videoElement.srcObject = cameraStream;
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
                    if (this.mesh && typeof this.mesh.connectToFamilyMember === 'function') {
                        await this.mesh.connectToFamilyMember(code, { id: code, installationId: 'manual' });
                    }
                } catch (e) {
                    console.warn('[Handshake Connection]', e);
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
            
            btnAcceptConn.onclick = () => {
                approvalModal.classList.remove('active');
                if (this.mesh && typeof this.mesh.acceptConnection === 'function') {
                    this.mesh.acceptConnection(conn, {
                        sync: {
                            receive: permSend.checked, // From receiver's perspective: "View my shared medical records" = Send
                            send: permReceive.checked, // "Send records to this device" = Receive
                            auto: permAuto.checked
                        },
                        records: { medications: true, reports: true, appointments: false, documents: false }
                    }, payload);
                }
                this.connectedPeer = conn.peer;
                showToast(`Connected to ${modalPeerName.innerText}`);
                this.renderContent();
            };
            
            btnRejectConn.onclick = () => {
                approvalModal.classList.remove('active');
                conn.close();
            };
        });
        
        window.addEventListener('peermesh:connection-accepted', (e) => {
             this.connectedPeer = e.detail.peer;
             showToast(`Peer node accepted connection.`);
             this.renderContent();
        });
    }
}
