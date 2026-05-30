import state from '../core/state.js';
import PeerMesh from '../services/PeerMesh.js';
import QRCode from 'https://esm.sh/qrcode@1.5.3';

export default class PeerNetworkView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';
    
    const displayName = state.user?.displayName || 'Unknown Node';
    const mesh = PeerMesh.getInstance();
    await mesh.init();

    this.container.innerHTML = `
      <header class="view-header bg-gradient-to-r from-[#1a0a12] to-[#2a121e] border-b border-[#7f2f5d]/40 justify-between px-6 shadow-xl shadow-[#7f2f5d]/5">
        <div class="flex flex-col">
          <span class="text-xs text-[#ffb88c]/70 uppercase font-bold tracking-widest leading-none">P2P Network</span>
          <h1 class="text-xl font-display mt-1 text-white leading-none">The Handshake</h1>
        </div>
      </header>

      <main class="scroll-area px-6 pt-28 bg-[#1a0a12] pb-24">
        
        <!-- P2P SCANNING / CONNECT (Card 1) -->
        <section class="mb-10">
            <h3 class="text-xs font-bold text-[#ffb88c] mb-4 tracking-[0.2em] uppercase px-1">Network Scanner</h3>
            <div class="glass-panel p-8 text-center border-[#7f2f5d]/40 shadow-2xl relative overflow-hidden bg-white/5 rounded-[2rem]">
                <div class="w-16 h-16 bg-[#ca5229]/20 rounded-full flex items-center justify-center mb-6 border border-[#ca5229]/50 mx-auto">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ca5229" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
                </div>
                <h2 class="text-lg font-display text-white mb-2">Connect to Peer</h2>
                <p class="text-xs text-[#ffb88c]/70 font-mono mb-8">Enter a pairing code to establish a secure, localized connection with another device.</p>
                
                <div class="flex gap-3">
                    <input type="text" id="pairing-code" placeholder="Enter Pairing Code..." class="flex-1 bg-black/40 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-white text-xs font-mono focus:outline-none focus:border-[#ffb88c]/50 transition-colors shadow-inner">
                    <button id="connect-btn" class="bg-[#ca5229] text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs active:scale-95 transition-transform shadow-lg shadow-[#ca5229]/20">Connect</button>
                </div>
            </div>
        </section>

        <!-- QR DETAILS (Card 2) -->
        <section class="mb-12">
            <h3 class="text-xs font-bold text-[#ffb88c] mb-4 tracking-[0.2em] uppercase px-1">Share My Node</h3>
            <div class="glass-panel p-8 text-center border-[#7f2f5d]/40 shadow-2xl relative overflow-hidden bg-gradient-to-br from-[#7f2f5d]/20 to-[#ca5229]/10 rounded-[2rem]">
                <h2 class="text-lg font-display text-white mb-2">My Pairing QR</h2>
                <p class="text-xs text-[#ffb88c]/70 font-mono mb-6">Scan this code to establish a peer-to-peer connection with ${displayName}</p>
                
                <div id="qr-container" class="bg-white p-4 rounded-3xl inline-block shadow-lg border border-white/20 relative z-10 min-h-[200px] min-w-[200px] flex items-center justify-center">
                    <div class="loader">
                      <div class="box1"></div>
                      <div class="box2"></div>
                      <div class="box3"></div>
                    </div>
                </div>
                <p class="text-xs text-white font-mono mt-6 tracking-[0.2em] uppercase font-bold">Code: ${mesh.peerId || 'AWAITING_ID'}</p>
            </div>
        </section>

        <!-- The Roster: Connected peers -->
        <section>
            <div class="flex justify-between items-center mb-6 px-1">
                <h3 class="text-xs font-bold text-[#ffb88c]/80 tracking-[0.2em] uppercase">The Roster</h3>
                <span class="text-xs text-[#00ff7f] font-mono border border-[#00ff7f]/30 bg-[#00ff7f]/10 px-2 py-0.5 rounded uppercase tracking-widest">Live</span>
            </div>
            
            <div id="roster-container" class="space-y-4">
                <!-- Peer nodes will be injected here -->
                <div class="text-center py-10 border border-dashed border-[#7f2f5d]/30 rounded-3xl opacity-50">
                    <p class="text-xs text-white font-mono uppercase tracking-widest">No Active Connections</p>
                </div>
            </div>
        </section>
        
        <!-- Gatekeeper Modal (Hidden by default) -->
        <div id="gatekeeper-modal" class="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md hidden items-center justify-center p-6 opacity-0 transition-opacity duration-300">
            <div class="bg-gradient-to-b from-[#4a1532] to-[#1a0a12] border border-[#ffb88c]/30 rounded-[32px] p-8 max-w-sm w-full shadow-2xl transform scale-95 transition-transform duration-300" id="gatekeeper-content">
                <div class="w-16 h-16 bg-[#ca5229]/20 rounded-full flex items-center justify-center mb-6 border border-[#ca5229]/50 mx-auto">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ca5229" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h2 class="text-2xl font-display text-white text-center mb-2">Connection Request</h2>
                <p class="text-xs text-[#ffb88c]/80 text-center font-mono mb-8" id="gatekeeper-peer-name">Unknown Device is requesting access.</p>
                
                <div class="space-y-3 mb-8">
                    <label class="flex items-center gap-3 p-4 border border-[#7f2f5d]/50 rounded-xl bg-white/5 cursor-pointer">
                        <input type="radio" name="permissions" value="read-only" checked class="accent-[#ca5229]">
                        <div>
                            <p class="text-sm font-bold text-white">Read-Only</p>
                            <p class="text-[10px] text-gray-400 font-mono mt-1">Peer can view your compliance data.</p>
                        </div>
                    </label>
                    <label class="flex items-center gap-3 p-4 border border-[#7f2f5d]/50 rounded-xl bg-white/5 cursor-pointer opacity-50">
                        <input type="radio" name="permissions" value="admin" disabled class="accent-[#ca5229]">
                        <div>
                            <p class="text-sm font-bold text-white">Admin / Caregiver</p>
                            <p class="text-[10px] text-gray-400 font-mono mt-1">Peer can modify doses. (Locked)</p>
                        </div>
                    </label>
                </div>

                <div class="flex gap-3">
                    <button id="gatekeeper-deny" class="flex-1 py-4 border border-[#7f2f5d]/50 text-gray-400 font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-white/5 transition-colors">Deny</button>
                    <button id="gatekeeper-approve" class="flex-1 py-4 bg-gradient-to-r from-[#7f2f5d] to-[#ca5229] text-white font-bold uppercase text-xs tracking-widest rounded-xl shadow-lg shadow-[#ca5229]/20 active:scale-95 transition-transform">Authorize</button>
                </div>
            </div>
        </div>

      </main>

      <style>
        .view-header { position: fixed; top: 0; left: 0; right: 0; height: 80px; backdrop-filter: blur(24px); display: flex; align-items: center; z-index: 100; }
        .glass-panel { backdrop-filter: blur(12px); border-radius: var(--radius-lg); }
        .loader { width: 40px; height: 40px; display: flex; justify-content: space-between; align-items: center; }
        .loader > div { width: 10px; height: 10px; background-color: #ca5229; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
        .loader .box1 { animation-delay: -0.32s; }
        .loader .box2 { animation-delay: -0.16s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      </style>
    `;

    this.attachListeners(mesh);
    this.generateQR(mesh.peerId);
    this.updateRoster(mesh);
    return this.container;
  }

  generateQR(peerId) {
    const container = this.container.querySelector('#qr-container');
    if (!peerId) {
      container.innerHTML = '<p class="text-xs text-red-500 uppercase tracking-widest font-bold">Network Offline</p>';
      return;
    }

    QRCode.toDataURL(peerId, {
      width: 200,
      margin: 1,
      color: { dark: '#1a0a12', light: '#ffffff' }
    }, (err, url) => {
      if (err) {
        console.error('QR Generate Error:', err);
        return;
      }
      container.innerHTML = \`<img src="\${url}" alt="Pairing QR Code" class="rounded-xl animate-fade-in-up" />\`;
    });
  }

  attachListeners(mesh) {
    const connectBtn = this.container.querySelector('#connect-btn');
    const pairingInput = this.container.querySelector('#pairing-code');
    const modal = this.container.querySelector('#gatekeeper-modal');
    const modalContent = this.container.querySelector('#gatekeeper-content');
    
    connectBtn.addEventListener('click', () => {
        const targetId = pairingInput.value.trim();
        if(targetId) {
            connectBtn.innerHTML = '<svg class="animate-spin h-4 w-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
            mesh.connectToPeer(targetId);
            setTimeout(() => {
                connectBtn.innerHTML = 'CONNECT';
                pairingInput.value = '';
            }, 1500);
        }
    });

    // Handle incoming peer requests (Biometric / Gatekeeper Modal)
    let pendingPeerId = null;
    window.addEventListener('medcare:peer-request', (e) => {
        pendingPeerId = e.detail.peerId;
        this.container.querySelector('#gatekeeper-peer-name').textContent = \`Node \${pendingPeerId.substring(0,6)}... wants to sync.\`;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modalContent.classList.remove('scale-95');
        }, 10);
    });

    this.container.querySelector('#gatekeeper-approve').addEventListener('click', () => {
        if(pendingPeerId) mesh.approvePeer(pendingPeerId);
        closeModal();
    });
    
    this.container.querySelector('#gatekeeper-deny').addEventListener('click', () => {
        if(pendingPeerId) mesh.denyPeer(pendingPeerId);
        closeModal();
    });

    const closeModal = () => {
        modal.classList.add('opacity-0');
        modalContent.classList.add('scale-95');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.add('hidden');
            pendingPeerId = null;
        }, 300);
    };

    window.addEventListener('medcare:peer-connected', () => this.updateRoster(mesh));
    window.addEventListener('medcare:peer-disconnected', () => this.updateRoster(mesh));
  }

  updateRoster(mesh) {
      const rosterEl = this.container.querySelector('#roster-container');
      const peers = Object.keys(mesh.connections);
      
      if (peers.length === 0) {
          rosterEl.innerHTML = \`
              <div class="text-center py-10 border border-dashed border-[#7f2f5d]/30 rounded-3xl opacity-50">
                  <p class="text-xs text-white font-mono uppercase tracking-widest">No Active Connections</p>
              </div>
          \`;
          return;
      }

      rosterEl.innerHTML = peers.map(pid => \`
          <div class="glass-panel p-4 flex justify-between items-center bg-white/5 border border-[#00ff7f]/30">
              <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ff7f]/20 to-[#1a0a12] border border-[#00ff7f]/40 flex items-center justify-center text-[#00ff7f]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                  </div>
                  <div>
                      <p class="font-bold text-sm text-white">Peer Node</p>
                      <p class="text-[10px] text-[#00ff7f]/70 font-mono tracking-widest uppercase">\${pid.substring(0,8)}...</p>
                  </div>
              </div>
              <button class="bg-[#1a0a12] border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest active:scale-90 transition-transform">Drop</button>
          </div>
      \`).join('');
  }

  destroy() {
    // Cleanup event listeners
  }
}
