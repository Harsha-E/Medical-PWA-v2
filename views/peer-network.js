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
      <header class="view-header">
        <div class="flex flex-col">
          <span class="text-xs text-[#ffb88c]/70 uppercase font-bold tracking-widest leading-none">P2P Network</span>
          <h1 class="text-xl font-display mt-1 text-white leading-none">The Handshake</h1>
        </div>
      </header>

      <main class="scroll-area px-6 pt-28 bg-transparent pb-24">
        
        <!-- Toggle Control -->
        <div class="flex bg-[#1a0a12]/40 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl p-1 mb-8 backdrop-blur-xl">
            <button id="toggle-scan" class="flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl bg-[#ca5229] text-white shadow-lg shadow-[#ca5229]/20 transition-all">Scan</button>
            <button id="toggle-share" class="flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl text-gray-400 hover:text-white transition-all">Share</button>
        </div>

        <!-- P2P SCANNING / CONNECT (Card 1) -->
        <section id="scan-section" class="mb-10 block animate-fade-in">
            <div class="clay-glass-panel p-8 text-center border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] bg-[#1a0a12]/40 backdrop-blur-xl relative overflow-hidden rounded-[2rem]">
                <div class="w-16 h-16 bg-[#ca5229]/20 rounded-full flex items-center justify-center mb-6 border border-[#ca5229]/50 mx-auto">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ca5229" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
                </div>
                <h2 class="text-lg font-display text-white mb-2">Connect to Peer</h2>
                <p class="text-xs text-[#ffb88c]/70 font-mono mb-8">Enter a pairing code to establish a secure, localized connection with another device.</p>
                
                <div class="flex flex-col sm:flex-row items-center gap-3 w-full">
                    <button id="start-scanner-btn" class="bg-gradient-to-r from-[#ca5229] to-[#7f2f5d] text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs active:scale-95 transition-transform shadow-[0_4px_16px_rgba(202,82,41,0.4)] flex items-center justify-center gap-2 w-full sm:w-auto shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
                        Scan QR
                    </button>
                    <div class="text-[10px] text-gray-500 font-mono uppercase tracking-widest hidden sm:block">OR</div>
                    <div class="flex flex-1 w-full gap-2">
                        <input type="text" id="pairing-code" placeholder="Enter Pairing Code..." class="flex-1 min-w-0 bg-black/40 border border-[#7f2f5d]/50 rounded-full px-4 py-3 text-white text-xs font-mono focus:outline-none focus:border-[#ffb88c]/50 transition-colors shadow-inner">
                        <button id="connect-btn" class="bg-[#1a0a12] border border-[#ca5229]/50 text-[#ffb88c] px-5 py-3 rounded-full font-bold uppercase tracking-widest text-xs active:scale-95 transition-all shadow-lg hover:bg-[#ca5229]/10 shrink-0">Connect</button>
                    </div>
                </div>
                <!-- Fullscreen Hover Scanner Modal -->
                <div id="hover-scanner-modal" class="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm hidden flex-col items-center justify-center opacity-0 transition-opacity duration-300">
                    <div class="relative w-full max-w-sm aspect-square p-4">
                        <!-- Custom CSS Scanning Reticle overlay -->
                        <div class="absolute inset-0 z-10 pointer-events-none">
                            <div class="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-[#ca5229] rounded-tl-xl"></div>
                            <div class="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-[#ca5229] rounded-tr-xl"></div>
                            <div class="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-[#ca5229] rounded-bl-xl"></div>
                            <div class="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-[#ca5229] rounded-br-xl"></div>
                            <div class="absolute top-1/2 left-4 right-4 h-0.5 bg-[#ca5229]/50 shadow-[0_0_10px_#ca5229] animate-[ping_3s_infinite]"></div>
                        </div>
                        <!-- The html5-qrcode reader injects the video here -->
                        <div id="reader" class="w-full h-full rounded-2xl overflow-hidden bg-black/50 shadow-[0_0_50px_rgba(202,82,41,0.2)]"></div>
                    </div>
                    <button id="close-scanner-btn" class="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold uppercase tracking-widest text-xs border border-white/20 transition-all active:scale-95">Cancel</button>
                </div>
            </div>
        </section>

        <!-- QR DETAILS (Card 2) -->
        <section id="share-section" class="mb-12 hidden animate-fade-in">
            <div class="clay-glass-panel p-8 text-center border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden bg-[#1a0a12]/40 backdrop-blur-xl rounded-[2rem]">
                <h2 class="text-lg font-display text-white mb-2">My Pairing QR</h2>
                <p class="text-xs text-[#ffb88c]/70 font-mono mb-6">Scan this code to establish a peer-to-peer connection with ${displayName}</p>
                
                <div id="qr-container" class="bg-transparent p-4 inline-block relative z-10 min-h-[200px] min-w-[200px] flex items-center justify-center">
                    <div id="qr-loader" class="clay-loader"></div>
                </div>
                <p id="peer-id-display" class="text-xs text-white font-mono mt-6 tracking-[0.2em] uppercase font-bold cursor-pointer hover:text-[#ffb88c] active:scale-95 transition-all select-none" title="Click to copy">Code: ${mesh.peerId || 'AWAITING_ID'}</p>
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
                <div class="text-center py-10 border border-dashed border-white/20 bg-[#1a0a12]/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-3xl opacity-50">
                    <p class="text-xs text-white font-mono uppercase tracking-widest">No Active Connections</p>
                </div>
            </div>
        </section>
        
        <!-- Gatekeeper Modal (Hidden by default) -->
        <div id="gatekeeper-modal" class="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md hidden items-center justify-center p-6 opacity-0 transition-opacity duration-300">
            <div class="bg-[#1a0a12]/60 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 max-w-sm w-full shadow-[0_8px_32px_rgba(0,0,0,0.7)] transform scale-95 transition-transform duration-300" id="gatekeeper-content">
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

                <div class="flex flex-col sm:flex-row gap-3">
                    <button id="gatekeeper-deny" class="flex-1 py-4 border border-[#7f2f5d]/50 text-gray-400 font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-white/5 transition-colors">Deny</button>
                    <button id="gatekeeper-approve" class="flex-1 py-4 bg-gradient-to-r from-[#7f2f5d] to-[#ca5229] text-white font-bold uppercase text-xs tracking-widest rounded-xl shadow-lg shadow-[#ca5229]/20 active:scale-95 transition-transform">Authorize</button>
                </div>
            </div>
        </div>

      </main>

      <style>
        .view-header { position: fixed; top: 0; left: 0; right: 0; height: 80px; backdrop-filter: blur(24px); display: flex; align-items: center; z-index: 100; }
        .clay-glass-panel { backdrop-filter: blur(12px); border-radius: var(--radius-lg); }
        .loader {
          width: 112px;
          height: 112px;
          position: relative;
        }

        .box1,
        .box2,
        .box3 {
          border: 16px solid #ca5229;
          box-sizing: border-box;
          position: absolute;
          display: block;
        }

        .box1 {
          width: 112px;
          height: 48px;
          margin-top: 64px;
          margin-left: 0px;
          animation: abox1 4s 1s forwards ease-in-out infinite;
        }

        .box2 {
          width: 48px;
          height: 48px;
          margin-top: 0px;
          margin-left: 0px;
          animation: abox2 4s 1s forwards ease-in-out infinite;
        }

        .box3 {
          width: 48px;
          height: 48px;
          margin-top: 0px;
          margin-left: 64px;
          animation: abox3 4s 1s forwards ease-in-out infinite;
        }

        @keyframes abox1 {
          0% { width: 112px; height: 48px; margin-top: 64px; margin-left: 0px; }
          12.5% { width: 48px; height: 48px; margin-top: 64px; margin-left: 0px; }
          25% { width: 48px; height: 48px; margin-top: 64px; margin-left: 0px; }
          37.5% { width: 48px; height: 48px; margin-top: 64px; margin-left: 0px; }
          50% { width: 48px; height: 48px; margin-top: 64px; margin-left: 0px; }
          62.5% { width: 48px; height: 48px; margin-top: 64px; margin-left: 0px; }
          75% { width: 48px; height: 112px; margin-top: 0px; margin-left: 0px; }
          87.5% { width: 48px; height: 48px; margin-top: 0px; margin-left: 0px; }
          100% { width: 48px; height: 48px; margin-top: 0px; margin-left: 0px; }
        }

        @keyframes abox2 {
          0% { width: 48px; height: 48px; margin-top: 0px; margin-left: 0px; }
          12.5% { width: 48px; height: 48px; margin-top: 0px; margin-left: 0px; }
          25% { width: 48px; height: 48px; margin-top: 0px; margin-left: 0px; }
          37.5% { width: 48px; height: 48px; margin-top: 0px; margin-left: 0px; }
          50% { width: 112px; height: 48px; margin-top: 0px; margin-left: 0px; }
          62.5% { width: 48px; height: 48px; margin-top: 0px; margin-left: 64px; }
          75% { width: 48px; height: 48px; margin-top: 0px; margin-left: 64px; }
          87.5% { width: 48px; height: 48px; margin-top: 0px; margin-left: 64px; }
          100% { width: 48px; height: 48px; margin-top: 0px; margin-left: 64px; }
        }

        @keyframes abox3 {
          0% { width: 48px; height: 48px; margin-top: 0px; margin-left: 64px; }
          12.5% { width: 48px; height: 48px; margin-top: 0px; margin-left: 64px; }
          25% { width: 48px; height: 112px; margin-top: 0px; margin-left: 64px; }
          37.5% { width: 48px; height: 48px; margin-top: 64px; margin-left: 64px; }
          50% { width: 48px; height: 48px; margin-top: 64px; margin-left: 64px; }
          62.5% { width: 48px; height: 48px; margin-top: 64px; margin-left: 64px; }
          75% { width: 48px; height: 48px; margin-top: 64px; margin-left: 64px; }
          87.5% { width: 48px; height: 48px; margin-top: 64px; margin-left: 64px; }
          100% { width: 112px; height: 48px; margin-top: 64px; margin-left: 0px; }
        }
    `;

    this.attachListeners(mesh);
    this.generateQR(mesh.peerId);
    this.updateRoster(mesh);
    
    // Auto-Connect from Deep Link
    const hashUrl = window.location.hash;
    if (hashUrl.includes('?connect=')) {
        const urlParams = new URLSearchParams(hashUrl.split('?')[1]);
        const connectId = urlParams.get('connect');
        if (connectId && connectId !== mesh.peerId) {
            setTimeout(() => {
                const input = this.container.querySelector('#pairing-code');
                const btn = this.container.querySelector('#connect-btn');
                if (input && btn) {
                    input.value = connectId;
                    btn.click();
                    // Clean URL
                    window.location.hash = '#/peer-hub';
                }
            }, 600);
        }
    }
    
    // Cleanup scanner on navigation
    window.addEventListener('hashchange', () => {
        if (this.html5QrcodeScanner) {
            this.html5QrcodeScanner.stop().catch(()=>{});
            this.html5QrcodeScanner = null;
        }
    }, { once: true });

    return this.container;
  }

  generateQR(peerId) {
    const container = this.container.querySelector('#qr-container');
    if (!peerId) {
      container.innerHTML = '<p class="text-xs text-red-500 uppercase tracking-widest font-bold">Network Offline</p>';
      return;
    }

    const deepLink = `${window.location.origin}${window.location.pathname}#/peer-hub?connect=${peerId}`;

    QRCode.toDataURL(deepLink, {
      width: 200,
      margin: 1,
      color: { dark: '#1a0a12', light: '#ffffff' }
    }, (err, url) => {
      if (err) {
        console.error('QR Generate Error:', err);
        return;
      }
      container.innerHTML = `<img src="${url}" alt="Pairing QR Code" class="rounded-xl animate-fade-in-up" />`;
    });
  }

  attachListeners(mesh) {
    const scanBtn = this.container.querySelector('#toggle-scan');
    const shareBtn = this.container.querySelector('#toggle-share');
    const scanSection = this.container.querySelector('#scan-section');
    const shareSection = this.container.querySelector('#share-section');
    
    const startScannerBtn = this.container.querySelector('#start-scanner-btn');
    const hoverModal = this.container.querySelector('#hover-scanner-modal');
    const closeScannerBtn = this.container.querySelector('#close-scanner-btn');

    if (startScannerBtn && hoverModal && closeScannerBtn) {
        startScannerBtn.addEventListener('click', async () => {
            if (typeof Html5Qrcode === 'undefined') {
                alert('Scanner library is loading. Please try again in a few seconds.');
                return;
            }
            
            hoverModal.classList.remove('hidden');
            // Allow display block to render before triggering opacity transition
            requestAnimationFrame(() => hoverModal.classList.remove('opacity-0'));
            
            try {
                this.html5QrcodeScanner = new Html5Qrcode("reader");
                await this.html5QrcodeScanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        let parsedId = decodedText;
                        if (decodedText.includes('?connect=')) {
                            const params = new URLSearchParams(decodedText.split('?')[1]);
                            parsedId = params.get('connect') || decodedText;
                        }
                        
                        const input = this.container.querySelector('#pairing-code');
                        const btn = this.container.querySelector('#connect-btn');
                        if (input && btn) {
                            input.value = parsedId;
                            btn.click();
                        }
                        
                        closeScannerBtn.click(); // Auto-close on success
                    },
                    (errorMessage) => { /* ignore parse errors during tracking */ }
                );
            } catch (err) {
                console.error("Camera start failed:", err);
                hoverModal.classList.add('opacity-0');
                setTimeout(() => hoverModal.classList.add('hidden'), 300);
                alert("Camera Access Denied or Unavailable.");
            }
        });

        closeScannerBtn.addEventListener('click', async () => {
            if (this.html5QrcodeScanner) {
                await this.html5QrcodeScanner.stop().catch(()=>{});
                this.html5QrcodeScanner = null;
            }
            hoverModal.classList.add('opacity-0');
            setTimeout(() => hoverModal.classList.add('hidden'), 300);
        });
    }

    if (scanBtn && shareBtn) {
      scanBtn.addEventListener('click', () => {
        scanBtn.classList.add('bg-[#ca5229]', 'text-white', 'shadow-lg', 'shadow-[#ca5229]/20');
        scanBtn.classList.remove('text-gray-400', 'hover:text-white');
        shareBtn.classList.add('text-gray-400', 'hover:text-white');
        shareBtn.classList.remove('bg-[#ca5229]', 'text-white', 'shadow-lg', 'shadow-[#ca5229]/20');
        scanSection.classList.remove('hidden');
        scanSection.classList.add('block');
        shareSection.classList.add('hidden');
        shareSection.classList.remove('block');
      });

      shareBtn.addEventListener('click', () => {
        shareBtn.classList.add('bg-[#ca5229]', 'text-white', 'shadow-lg', 'shadow-[#ca5229]/20');
        shareBtn.classList.remove('text-gray-400', 'hover:text-white');
        scanBtn.classList.add('text-gray-400', 'hover:text-white');
        scanBtn.classList.remove('bg-[#ca5229]', 'text-white', 'shadow-lg', 'shadow-[#ca5229]/20');
        shareSection.classList.remove('hidden');
        shareSection.classList.add('block');
        scanSection.classList.add('hidden');
        scanSection.classList.remove('block');

        // Forcefully close the scanner modal if it's open
        if (closeScannerBtn) {
            closeScannerBtn.click();
        }

        // Show the claymorphism loader animation momentarily when toggled
        const qrContainer = this.container.querySelector('#qr-container');
        if (qrContainer) {
          qrContainer.innerHTML = `
            <div id="qr-loader" class="clay-loader is-active"></div>
          `;
          setTimeout(() => {
            this.generateQR(mesh.peerId);
          }, 1200); // Give the pulsing animation a bit longer to be appreciated
        }
      });
    }

    const peerIdDisplay = this.container.querySelector('#peer-id-display');
    if (peerIdDisplay) {
        peerIdDisplay.addEventListener('click', async () => {
            if (mesh.peerId) {
                try {
                    await navigator.clipboard.writeText(mesh.peerId);
                    const originalText = `Code: ${mesh.peerId}`;
                    peerIdDisplay.textContent = 'COPIED!';
                    peerIdDisplay.classList.add('text-[#00ff7f]');
                    peerIdDisplay.classList.remove('text-white');
                    setTimeout(() => {
                        peerIdDisplay.textContent = originalText;
                        peerIdDisplay.classList.remove('text-[#00ff7f]');
                        peerIdDisplay.classList.add('text-white');
                    }, 2000);
                } catch (err) {
                    console.error('Clipboard write failed:', err);
                }
            }
        });
    }

    const connectBtn = this.container.querySelector('#connect-btn');
    const pairingInput = this.container.querySelector('#pairing-code');
    const modal = this.container.querySelector('#gatekeeper-modal');
    const modalContent = this.container.querySelector('#gatekeeper-content');
    
    connectBtn.addEventListener('click', () => {
        const targetId = pairingInput.value.trim();
        if(targetId) {
            connectBtn.innerHTML = `
                <div class="relative w-6 h-6 mx-auto flex items-center justify-center">
                    <div class="loader" style="transform: scale(0.2); transform-origin: center; position: absolute; left: -44px; top: -44px;">
                        <div class="box1"></div>
                        <div class="box2"></div>
                        <div class="box3"></div>
                    </div>
                </div>
            `;
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
        this.container.querySelector('#gatekeeper-peer-name').textContent = `Node ${pendingPeerId.substring(0,6)}... wants to sync.`;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modalContent.classList.remove('scale-95');
        }, 10);
    });

    this.container.querySelector('#gatekeeper-approve').addEventListener('click', () => {
        if(pendingPeerId) mesh.approvePeerConnection(pendingPeerId);
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
      const peers = Array.from(mesh._connections?.keys() || []);
      
      if (peers.length === 0) {
          rosterEl.innerHTML = `
              <div class="text-center py-10 border border-dashed border-white/20 bg-[#1a0a12]/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-3xl opacity-50">
                  <p class="text-xs text-white font-mono uppercase tracking-widest">No Active Connections</p>
              </div>
          `;
          return;
      }

      rosterEl.innerHTML = peers.map(pid => `
          <div class="clay-glass-panel p-4 flex justify-between items-center clay-glass-panel">
              <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ff7f]/20 to-[#1a0a12] border border-[#00ff7f]/40 flex items-center justify-center text-[#00ff7f]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                  </div>
                  <div>
                      <p class="font-bold text-sm text-white">Peer Node</p>
                      <p class="text-[10px] text-[#00ff7f]/70 font-mono tracking-widest uppercase">${pid.substring(0,8)}...</p>
                  </div>
              </div>
              <button class="bg-[#1a0a12] border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest active:scale-90 transition-transform">Drop</button>
          </div>
      `).join('');
  }

  destroy() {
    // Cleanup event listeners
  }
}

