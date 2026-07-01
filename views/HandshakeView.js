/**
 * HandshakeView.js
 * Premium Claymorphic P2P connection screen replacing the dotted grid.
 */

export default class HandshakeView {
    constructor() {
        this.activeTab = 'scan'; // 'scan' or 'share'
        this.myId = localStorage.getItem('medcheck_peer_id') || 'UNKNOWN-ID';
    }

    async render() {
        this.container = document.createElement('div');
        this.container.className = 'w-full h-[100dvh] overflow-y-auto pb-[140px] flex flex-col items-center px-6 pt-[120px]';
        this.container.style.background = 'radial-gradient(circle at top, #4a2c25 0%, #110908 100%)';
        this.container.style.fontFamily = "'Syne', sans-serif";

        this.renderContent();
        return this.container;
    }

    renderContent() {
        const isScan = this.activeTab === 'scan';

        this.container.innerHTML = `
            <!-- Tabs (Scan / Share) -->
            <div class="flex w-full max-w-sm shrink-0 mb-6 bg-black/20 p-1 rounded-full border border-white/10 backdrop-blur-sm">
                <button id="tab-scan" class="flex-1 py-3 text-xs font-bold tracking-widest uppercase rounded-full transition-all ${isScan ? 'bg-white/10 shadow-lg border border-white/5 text-white' : 'text-white/40 border border-transparent'}">Scan</button>
                <button id="tab-share" class="flex-1 py-3 text-xs font-bold tracking-widest uppercase rounded-full transition-all ${!isScan ? 'bg-white/10 shadow-lg border border-white/5 text-white' : 'text-white/40 border border-transparent'}">Share</button>
            </div>

            <!-- Main Card -->
            <div class="w-full max-w-sm shrink-0 p-8 rounded-[2.5rem] bg-[#2a1c18]/80 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center mb-10 relative overflow-hidden transition-all">
                <!-- Inner soft highlight -->
                <div class="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                
                ${isScan ? this.getScanTemplate() : this.getShareTemplate()}
            </div>

            <!-- The Roster -->
            <div class="w-full max-w-sm shrink-0">
                <div class="flex justify-between items-center mb-4 px-2">
                    <h3 class="text-[10px] text-white/80 font-bold uppercase tracking-widest">The Roster</h3>
                    <span class="text-[9px] text-white/60 font-bold uppercase tracking-widest border border-white/20 rounded pl-2 pr-2 py-1">Live</span>
                </div>

                <!-- Active Connections or Empty State -->
                <div id="roster-list" class="w-full py-10 rounded-[2rem] border border-dashed border-white/20 flex flex-col items-center justify-center gap-3">
                    <p class="text-[10px] text-white/40 uppercase tracking-widest font-mono">No Active Connections</p>
                </div>
            </div>
        `;

        this.bindEvents();

        if (!isScan) {
            this.generateQR();
        }
    }

    getScanTemplate() {
        return `
            <!-- Icon -->
            <div class="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center mb-6">
                <span class="text-xl text-white font-serif">T</span>
            </div>

            <h2 class="text-xl text-white font-bold mb-3">Connect to Peer</h2>
            <p class="text-[11px] text-white/60 text-center leading-relaxed font-mono mb-8">
                Enter a pairing code to establish a secure, localized connection with another device.
            </p>

            <!-- Scan QR Button -->
            <button id="btn-scan-qr" class="w-full py-4 mb-4 rounded-full bg-black/20 border border-white/10 text-white text-xs font-bold tracking-widest flex items-center justify-center gap-3 shadow-inner hover:bg-white/5 transition-all">
                <span class="font-serif text-base leading-none">T</span> SCAN QR
            </button>

            <!-- Code Input / Connect -->
            <div class="w-full relative flex items-center">
                <input type="text" id="pairing-code" placeholder="Enter Pairing Code." class="w-full bg-black/30 border border-transparent focus:border-white/20 text-white text-sm font-mono rounded-full py-4 pl-6 pr-32 outline-none shadow-inner transition-all placeholder:text-white/30">
                <button id="btn-connect" class="absolute right-1 top-1 bottom-1 bg-[#4a2f28] border border-white/10 text-white text-[10px] font-bold tracking-widest px-6 rounded-full shadow-lg hover:brightness-110 transition-all">CONNECT</button>
            </div>
        `;
    }

    getShareTemplate() {
        return `
            <div class="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </div>

            <h2 class="text-xl text-white font-bold mb-3">Your Pairing Code</h2>
            <p class="text-[11px] text-white/60 text-center leading-relaxed font-mono mb-6">
                Share this QR code or ID with a family member to establish a trusted link.
            </p>

            <div id="qr-container" class="bg-white p-3 rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.5)] mb-6 flex items-center justify-center w-[160px] h-[160px]">
                <!-- QR Code inserted here -->
            </div>

            <div class="bg-black/30 px-6 py-3 rounded-full border border-white/10 text-white font-mono text-sm shadow-inner tracking-wider">
                ${this.myId}
            </div>
        `;
    }

    generateQR() {
        const qrContainer = this.container.querySelector('#qr-container');
        if (typeof QRCode !== 'undefined' && qrContainer && this.myId) {
            qrContainer.innerHTML = ''; // clear
            new QRCode(qrContainer, {
                text: `https://harsha-e.github.io/Medical-PWA-v2/?connect=${this.myId}`,
                width: 136,
                height: 136,
                colorDark: "#2a1c18",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    }

    bindEvents() {
        const tabScan = this.container.querySelector('#tab-scan');
        const tabShare = this.container.querySelector('#tab-share');

        tabScan.onclick = () => {
            if (this.activeTab !== 'scan') {
                this.activeTab = 'scan';
                this.renderContent();
            }
        };

        tabShare.onclick = () => {
            if (this.activeTab !== 'share') {
                this.activeTab = 'share';
                this.renderContent();
            }
        };

        if (this.activeTab === 'scan') {
            const btnScanQr = this.container.querySelector('#btn-scan-qr');
            const btnConnect = this.container.querySelector('#btn-connect');
            const inputCode = this.container.querySelector('#pairing-code');

            if (btnScanQr) {
                btnScanQr.onclick = () => {
                    alert('Routing to scanner to capture QR code...');
                    window.location.hash = '#/scan-qr';
                };
            }

            if (btnConnect) {
                btnConnect.onclick = () => {
                    const code = inputCode.value.trim();
                    if (code) {
                        btnConnect.innerText = "CONNECTING...";
                        setTimeout(() => {
                            btnConnect.innerText = "CONNECT";
                            alert(`Simulated connection to ${code}`);
                        }, 1500);
                    }
                };
            }
        }
    }
}
