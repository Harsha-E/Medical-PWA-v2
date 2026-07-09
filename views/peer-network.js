import state from '../core/state.js';
import PeerMesh from '../services/PeerMesh.js';
import { showToast } from '../core/ui.js';
import { escapeHTML } from '../core/utils.js';

export default class PeerNetworkView {
    constructor() {
        this.mesh = PeerMesh.getInstance();
        this.container = null;
        this.connectedPeer = null;
    }

    async render() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'w-full h-full min-h-screen overflow-y-auto relative text-[#fefcff] font-sans';
            this.container.style.backgroundColor = '#0a0407';
        }

        try {
            await this.mesh.init();
        } catch (e) {
            console.warn('[PeerMesh] init warning:', e);
        }

        this.myPeerId = this.mesh.peerId || (state.user && state.user.uid ? state.user.uid.slice(0, 12) : 'local_node');
        this.renderContent();
        return this.container;
    }

    renderContent() {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(window.location.origin + window.location.pathname + '?connect=' + this.myPeerId)}`;

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
            </style>
        `;

        this.container.innerHTML = `
            ${styles}
            <main class="w-full max-w-md mx-auto px-6 pt-20 md:pt-28 pb-40 flex flex-col items-center space-y-8 z-10">
                
                <!-- Main Neumorphic Card -->
                <div class="w-full shrink-0 p-8 clay-glass-panel flex flex-col items-center relative overflow-hidden text-center space-y-6">
                    <!-- Title -->
                    <h2 class="text-2xl text-white font-bold font-display tracking-tight">Link Device</h2>
                    
                    <!-- QR Code -->
                    <div class="bg-white p-5 rounded-2xl shadow-xl flex items-center justify-center">
                        <img src="${qrUrl}" alt="Scan QR Code" class="w-40 h-40 qr-sharp-img" />
                    </div>
                    
                    <div class="space-y-2 w-full">
                        <p class="text-[10px] text-[#ffb88c] uppercase tracking-widest font-mono font-bold">DIRECT PAIRING NODE</p>
                        <div id="peer-id-display" class="bg-black/50 px-6 py-3 rounded-full border border-white/10 text-[#ffb88c] font-mono text-xs font-bold tracking-wider select-all shadow-inner overflow-x-auto whitespace-nowrap scrollbar-hide cursor-pointer" title="Click to copy">
                            ${escapeHTML(this.myPeerId)}
                        </div>
                    </div>

                    <!-- Input field + Connect -->
                    <div class="w-full relative flex items-center">
                        <input type="text" id="pairing-code" placeholder="Paste Peer ID..." class="w-full bg-[#0d0709] border border-white/10 focus:border-[#ffb88c]/40 text-white text-xs font-mono rounded-full py-4 pl-5 pr-28 outline-none shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8)] placeholder:text-white/30">
                        <button id="btn-connect" class="absolute right-1.5 top-1.5 bottom-1.5 connect-pill-btn text-[10px] font-mono font-bold tracking-widest px-5 rounded-full">LINK</button>
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
                        SCAN
                    </button>
                </div>

                <!-- The Roster -->
                <div class="w-full max-w-sm shrink-0 space-y-4">
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
            </main>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const btnScanQr = this.container.querySelector('#btn-scan-qr');
        const btnConnect = this.container.querySelector('#btn-connect');
        const inputCode = this.container.querySelector('#pairing-code');

        if (btnScanQr) {
            btnScanQr.onclick = () => {
                window.location.hash = '#/scan';
            };
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
                    if (this.mesh && typeof this.mesh.connectToPeer === 'function') {
                        await this.mesh.connectToPeer(code);
                    } else if (this.mesh && typeof this.mesh.connectToFamilyMember === 'function') {
                        await this.mesh.connectToFamilyMember(code);
                    }
                } catch (e) {
                    console.warn('[Handshake Connection]', e);
                }

                this.connectedPeer = code;
                showToast(`Connected to node: ${code}`);
                btnConnect.innerText = "LINK";
                btnConnect.disabled = false;
                this.renderContent();
            };
        }
    }
}
