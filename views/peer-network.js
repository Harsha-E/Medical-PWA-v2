import state from '../core/state.js';
import PeerMesh from '../services/PeerMesh.js';
import QRManager from '../utils/QRManager.js';
import CaregiverPortal from '../utils/CaregiverPortal.js';
import { appConfirm } from '../utils/CustomModals.js';

export default class PeerNetworkView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';
    const displayName = state.user?.displayName || 'Unknown Node';
    const mesh = PeerMesh.getInstance();
    await mesh.init();

    this.container.innerHTML = `
      <main class="scroll-area pt-[112px] bg-transparent pb-40" style="padding-left:0; padding-right:0;">
<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">
        
        <!-- Toggle Control -->
        <div class="flex bg-surface-elevated/40 border border-border shadow-[0_8px_32px_var(--color-card-shadow)] rounded-2xl p-1 mb-8 backdrop-blur-xl">
            <button id="toggle-scan" class="flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl bg-surface-deep/50 text-primary shadow-inner transition-all">Scan</button>
            <button id="toggle-share" class="flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl text-text-secondary hover:text-text-primary transition-all btn-neumorphic">Share</button>
        </div>

        <!-- P2P SCANNING / CONNECT (Card 1) -->
        <section id="scan-section" class="mb-10 block animate-fade-in">
            <div class="clay-glass-panel p-8 text-center border-border shadow-[0_8px_32px_var(--color-card-shadow)] bg-surface-elevated/40 backdrop-blur-xl relative overflow-hidden rounded-[2rem]">
                <div class="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6 border border-primary/50 mx-auto">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="text-primary" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
                </div>
                <h2 class="text-lg font-display text-text-primary mb-2">Connect to Peer</h2>
                <p class="text-xs text-accent-primary/70 font-mono mb-8">Enter a pairing code to establish a secure, localized connection with another device.</p>
                
                <div class="flex flex-col sm:flex-row items-center gap-3 w-full">
                    <button id="start-scanner-btn" class="bg-gradient-to-r from-primary to-secondary text-text-primary px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs active:scale-95 transition-transform [0_4px_16px_var(--color-primary)] flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 btn-neumorphic">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
                        Scan QR
                    </button>
                    <div class="text-[10px] text-text-muted font-mono uppercase tracking-widest hidden sm:block">OR</div>
                    <div class="flex flex-1 w-full gap-2">
                        <input type="text" id="pairing-code" placeholder="Enter Pairing Code..." class="flex-1 min-w-0 bg-overlay-bg border border-border rounded-full px-4 py-3 text-text-primary text-xs font-mono focus:outline-none focus:border-accent-primary/50 transition-colors shadow-inner">
                        <button id="connect-btn" class="text-accent-primary px-5 py-3 rounded-full font-bold uppercase tracking-widest text-xs active:scale-95 transition-all shrink-0 btn-neumorphic">Connect</button>
                    </div>
                </div>
                <!-- Fullscreen Hover Scanner Modal -->
                <div id="hover-scanner-modal" class="fixed inset-0 z-[99999] bg-overlay-bg backdrop-blur-sm hidden flex-col items-center justify-center opacity-0 transition-opacity duration-300">
                    <div class="relative w-full max-w-sm aspect-square p-4">
                        <!-- Custom CSS Scanning Reticle overlay -->
                        <div class="absolute inset-0 z-10 pointer-events-none">
                            <div class="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                            <div class="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                            <div class="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                            <div class="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
                            <div class="absolute top-1/2 left-4 right-4 h-0.5 bg-primary/50 shadow-[0_0_10px_var(--color-primary)] animate-[ping_3s_infinite]"></div>
                        </div>
                        <!-- The html5-qrcode reader injects the video here -->
                        <div id="reader" class="w-full h-full rounded-2xl overflow-hidden bg-overlay-bg shadow-[0_0_50px_var(--color-primary)]"></div>
                    </div>
                    <button id="close-scanner-btn" class="mt-8 px-8 py-3 text-text-primary rounded-xl font-bold uppercase tracking-widest text-xs transition-all active:scale-95 btn-neumorphic">Cancel</button>
                </div>
            </div>
        </section>

        <!-- QR DETAILS (Card 2) -->
        <section id="share-section" class="mb-12 hidden animate-fade-in">
            <div class="clay-glass-panel p-8 text-center border-border shadow-[0_8px_32px_var(--color-card-shadow)] relative overflow-hidden bg-surface-elevated/40 backdrop-blur-xl rounded-[2rem]">
                <h2 class="text-lg font-display text-text-primary mb-2">My Pairing ID</h2>
                <p class="text-xs text-accent-primary/70 font-mono mb-6">Share this code or scan the QR below to establish a peer-to-peer connection with ${displayName}</p>
                
                <div id="qr-container" class="flex flex-col items-center justify-center my-4 min-h-[250px]"></div>

                <p id="peer-id-display" class="text-xs text-text-primary font-mono mt-6 tracking-[0.2em] uppercase font-bold cursor-pointer hover:text-accent-primary active:scale-95 transition-all select-none" title="Click to copy">Code: ${mesh.peerId || 'AWAITING_ID'}</p>
            </div>
        </section>

        <!-- Network Topology: Block Snapping UI -->
        <section class="mb-12">
            <div class="flex justify-between items-center mb-6 px-1">
                <h3 class="text-xs font-bold text-accent-primary/80 tracking-[0.2em] uppercase">Network Topology</h3>
                <span class="text-xs text-primary font-mono border border-primary/30 bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">Drag & Drop</span>
            </div>
            
            <div class="grid grid-cols-1 gap-4 mb-8">
                <!-- Dropzones -->
                <div class="topology-slot p-6 border-2 border-dashed border-border rounded-3xl bg-surface-elevated/20 flex flex-col items-center justify-center min-h-[100px] transition-all" data-role="parent">
                    <p class="text-xs text-text-secondary font-mono tracking-widest uppercase mb-2">Parent Node</p>
                    <div class="slot-content w-full flex flex-col gap-2"></div>
                </div>
                
                <div class="topology-slot p-6 border-2 border-dashed border-border rounded-3xl bg-surface-elevated/20 flex flex-col items-center justify-center min-h-[100px] transition-all" data-role="spouse">
                    <p class="text-xs text-text-secondary font-mono tracking-widest uppercase mb-2">Spouse Node</p>
                    <div class="slot-content w-full flex flex-col gap-2"></div>
                </div>
                
                <div class="topology-slot p-6 border-2 border-dashed border-border rounded-3xl bg-surface-elevated/20 flex flex-col items-center justify-center min-h-[100px] transition-all" data-role="child">
                    <p class="text-xs text-text-secondary font-mono tracking-widest uppercase mb-2">Child Node</p>
                    <div class="slot-content w-full flex flex-col gap-2"></div>
                </div>
            </div>

            <div class="flex justify-between items-center mb-4 px-1">
                <h3 class="text-xs font-bold text-success/80 tracking-[0.2em] uppercase">Unassigned Peers</h3>
                <span class="text-xs text-success font-mono border border-success/30 bg-success/10 px-2 py-0.5 rounded uppercase tracking-widest" id="live-count">0 Live</span>
            </div>
            
            <div id="roster-container" class="space-y-4 min-h-[100px] border border-transparent rounded-3xl p-2 transition-all">
                <!-- Peer nodes will be injected here -->
            </div>
        </section>
        
        <!-- Gatekeeper Modal (Hidden by default) -->
        <div id="gatekeeper-modal" class="fixed inset-0 z-[9999] bg-overlay-bg backdrop-blur-md hidden items-center justify-center p-6 opacity-0 transition-opacity duration-300">
            <div class="bg-surface-elevated/60 backdrop-blur-2xl border border-border rounded-[32px] p-8 max-w-sm w-full shadow-[0_8px_32px_var(--color-card-shadow)] transform scale-95 transition-transform duration-300" id="gatekeeper-content">
                <div class="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6 border border-primary/50 mx-auto">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="text-primary" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h2 class="text-2xl font-display text-text-primary text-center mb-2">Connection Request</h2>
                <p class="text-xs text-accent-primary/80 text-center font-mono mb-8" id="gatekeeper-peer-name">Unknown Device is requesting access.</p>
                
                <div class="space-y-3 mb-8">
                    <label class="flex items-center gap-3 p-4 border border-border rounded-xl bg-surface-deep cursor-pointer">
                        <input type="radio" name="permissions" value="read-only" checked class="accent-primary">
                        <div>
                            <p class="text-sm font-bold text-text-primary">Read-Only</p>
                            <p class="text-[10px] text-text-secondary font-mono mt-1">Peer can view your compliance data.</p>
                        </div>
                    </label>
                    <label class="flex items-center gap-3 p-4 border border-border rounded-xl bg-surface-deep cursor-pointer">
                        <input type="radio" name="permissions" value="request-write" class="accent-primary">
                        <div>
                            <p class="text-sm font-bold text-text-primary">Request Write Access</p>
                            <p class="text-[10px] text-text-secondary font-mono mt-1">Peer can view your data, and you request permission to edit theirs.</p>
                        </div>
                    </label>
                </div>

                <div class="flex flex-col sm:flex-row gap-3">
                    <button id="gatekeeper-deny" class="flex-1 py-4 text-text-secondary font-bold uppercase text-xs tracking-widest rounded-xl transition-colors btn-neumorphic">Deny</button>
                    <button id="gatekeeper-approve" class="flex-1 py-4 btn-neumorphic-primary font-bold uppercase text-xs tracking-widest rounded-xl".replace(/s+/g, ' ').trim()>Authorize</button>
                </div>
            </div>
        </div>

      </div></main>

      <!-- Write Access Request Modal -->
      <div id="write-request-modal" class="fixed inset-0 z-[9999] bg-overlay-bg backdrop-blur-md hidden items-center justify-center p-6 opacity-0 transition-opacity duration-300">
          <div class="bg-surface-elevated/60 backdrop-blur-2xl border border-primary/50 rounded-[32px] p-8 max-w-sm w-full shadow-[0_8px_32px_var(--color-primary)] transform scale-95 transition-transform duration-300" id="write-request-content">
              <div class="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6 border border-primary/50 mx-auto">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="text-primary" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
              <h2 class="text-2xl font-display text-text-primary text-center mb-2">Edit Access Requested</h2>
              <p class="text-xs text-accent-primary/80 text-center font-mono mb-8" id="write-request-peer-name">Unknown Device wants permission to modify your compliance data.</p>
              
              <div class="flex flex-col sm:flex-row gap-3">
                  <button id="write-request-deny" class="flex-1 py-4 text-text-secondary font-bold uppercase text-xs tracking-widest rounded-xl transition-colors btn-neumorphic">Deny</button>
                  <button id="write-request-approve" class="flex-1 py-4 btn-neumorphic-primary font-bold uppercase text-xs tracking-widest rounded-xl".replace(/s+/g, ' ').trim()>Grant</button>
              </div>
          </div>
      </div>

      <style>
        .clay-glass-panel { backdrop-filter: blur(12px); border-radius: var(--radius-lg); }

    `;

    this.attachListeners(mesh);
    this.updateRoster(mesh);
    
    // Generate QR using QRManager
    const generateQR = (id) => {
        const qrContainer = this.container.querySelector('#qr-container');
        if (qrContainer && id) {
            QRManager.generateConnectQR(qrContainer, id);
        }
    };

    if (mesh.peerId) {
        generateQR(mesh.peerId);
    }
    
    window.addEventListener('peermesh:ready', (e) => {
        generateQR(e.detail.id);
    });

    document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/peer-hub' } }));
    
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
    
    // Check for pending gatekeeper requests
    setTimeout(() => {
        if (mesh._pendingConsent && mesh._pendingConsent.size > 0) {
            const firstPendingId = Array.from(mesh._pendingConsent.keys())[0];
            window.dispatchEvent(new CustomEvent('medcare:peer-request', { detail: { peerId: firstPendingId } }));
        }
    }, 500);

    // Cleanup scanner on navigation
    window.addEventListener('hashchange', () => {
        if (this.html5QrcodeScanner) {
            this.html5QrcodeScanner.stop().catch(()=>{});
            this.html5QrcodeScanner = null;
        }
    }, { once: true });

    return this.container;
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
                await appAlert('Scanner library is loading. Please try again in a few seconds.', 'Loading');
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
                await appAlert('Camera Access Denied or Unavailable.', 'Camera Error');
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
        scanBtn.classList.add('bg-primary', 'text-text-primary', 'shadow-lg', 'shadow-primary/20');
        scanBtn.classList.remove('text-text-secondary', 'hover:text-text-primary');
        shareBtn.classList.add('text-text-secondary', 'hover:text-text-primary');
        shareBtn.classList.remove('bg-primary', 'text-text-primary', 'shadow-lg', 'shadow-primary/20');
        scanSection.classList.remove('hidden');
        scanSection.classList.add('block');
        shareSection.classList.add('hidden');
        shareSection.classList.remove('block');
      });

      shareBtn.addEventListener('click', () => {
        shareBtn.classList.add('bg-primary', 'text-text-primary', 'shadow-lg', 'shadow-primary/20');
        shareBtn.classList.remove('text-text-secondary', 'hover:text-text-primary');
        scanBtn.classList.add('text-text-secondary', 'hover:text-text-primary');
        scanBtn.classList.remove('bg-primary', 'text-text-primary', 'shadow-lg', 'shadow-primary/20');
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
            <div id="qr-loader" class="w-[224px] h-[224px] bg-surface-elevated/40 animate-pulse border-4 border-surface-deep shadow-[0_0_30px_var(--color-primary)] flex items-center justify-center" style="margin: auto;"><div class="flex space-x-2"><div class="w-3 h-3 bg-primary rounded-full animate-bounce"></div><div class="w-3 h-3 bg-primary rounded-full animate-bounce" style="animation-delay: 0.1s"></div><div class="w-3 h-3 bg-primary rounded-full animate-bounce" style="animation-delay: 0.2s"></div></div></div>
          `;
          setTimeout(() => {
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
                    peerIdDisplay.classList.add('text-success');
                    peerIdDisplay.classList.remove('text-text-primary');
                    setTimeout(() => {
                        peerIdDisplay.textContent = originalText;
                        peerIdDisplay.classList.remove('text-success');
                        peerIdDisplay.classList.add('text-text-primary');
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
        const selectedPerm = this.container.querySelector('input[name="permissions"]:checked')?.value;
        if(pendingPeerId) {
            mesh.approvePeerConnection(pendingPeerId);
            if (selectedPerm === 'request-write') {
                setTimeout(() => mesh.sendSignal(pendingPeerId, 'request-write-access'), 1000);
            }
        }
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

    // --- WRITE ACCESS PERMISSION FLOW ---
    let requestingWritePeerId = null;
    window.addEventListener('medcare:write-request', (e) => {
        requestingWritePeerId = e.detail.peerId;
        const writeModal = this.container.querySelector('#write-request-modal');
        const writeContent = this.container.querySelector('#write-request-content');
        
        const peerConn = mesh._connections.get(requestingWritePeerId);
        const name = peerConn?.metadata?.displayName || 'Unknown Device';
        
        this.container.querySelector('#write-request-peer-name').textContent = `${name} wants permission to modify your compliance data.`;
        
        writeModal.classList.remove('hidden');
        writeModal.style.display = 'flex';
        setTimeout(() => {
            writeModal.classList.remove('opacity-0');
            writeContent.classList.remove('scale-95');
        }, 10);
    });

    const closeWriteModal = () => {
        const writeModal = this.container.querySelector('#write-request-modal');
        const writeContent = this.container.querySelector('#write-request-content');
        writeModal.classList.add('opacity-0');
        writeContent.classList.add('scale-95');
        setTimeout(() => {
            writeModal.style.display = 'none';
            writeModal.classList.add('hidden');
            requestingWritePeerId = null;
        }, 300);
    };

    this.container.querySelector('#write-request-approve').addEventListener('click', async () => {
        if(requestingWritePeerId) {
            mesh.sendSignal(requestingWritePeerId, 'grant-write-access');
            const conn = mesh._connections.get(requestingWritePeerId);
            if (conn) conn.hasWriteAccess = true;
            await appAlert('Write access granted.', 'Success');
        }
        closeWriteModal();
    });

    this.container.querySelector('#write-request-deny').addEventListener('click', () => {
        if (requestingWritePeerId) {
             mesh.sendSignal(requestingWritePeerId, 'peer-dropped', { message: 'Write access request denied.' });
        }
        closeWriteModal();
    });

    window.addEventListener('medcare:write-granted', async (e) => {
        await appAlert('Your request for write access was GRANTED by the peer.', 'Access Granted');
        const conn = mesh._connections.get(e.detail.peerId);
        if (conn) conn.hasWriteAccess = true;
    });

    window.addEventListener('medcare:peer-connected', async (e) => {
        this.updateRoster(mesh);
        
        const peerId = e.detail?.peerId;
        const metadata = e.detail?.metadata;
        if (!peerId || !metadata) return;

        const peerPhone = metadata.phone;
        let peerName = metadata.displayName || 'Peer Node';
        const emergencyPhone = state.userProfile?.profile?.emergencyPhone;
        const emergencyName = state.userProfile?.profile?.emergencyName;

        // 1. Name Match Logic from Onboarding
        if (peerPhone && emergencyPhone && peerPhone === emergencyPhone) {
            if (await appConfirm(`This peer's phone number matches your emergency contact. Do you want to name this connection '${emergencyName}'?`, 'Emergency Contact Match')) {
                const conn = mesh._connections.get(peerId);
                if (conn) {
                    if (!conn.metadata) conn.metadata = {};
                    conn.metadata.displayName = emergencyName;
                    peerName = emergencyName;
                    this.updateRoster(mesh);
                }
            }
        }

        // 2. SOS Prompt
        if (await appConfirm(`Do you want to add ${peerName} to your SOS/Family Responders list?`, 'Add to SOS')) {
            if (!state.userProfile.profile.familyMembers) {
                state.userProfile.profile.familyMembers = [];
            }
            
            // Check if already exists
            const exists = state.userProfile.profile.familyMembers.find(f => f.peerId === peerId);
            if (!exists) {
                state.userProfile.profile.familyMembers.push({
                    name: peerName,
                    phone: peerPhone || '',
                    peerId: peerId
                });
                
                // Save to Firestore silently
                import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js').then(({ getFirestore, doc, setDoc }) => {
                    const db = getFirestore();
                    setDoc(doc(db, 'users', state.user.uid), { profile: state.userProfile.profile }, { merge: true }).catch(console.error);
                });
            }
        }
    });

    window.addEventListener('medcare:peer-disconnected', () => this.updateRoster(mesh));
    
    // Listen for connection drops natively
    window.addEventListener('medcare:peer-dropped', (e) => {
        this.updateRoster(mesh);
        appAlert(`Connection with node ${e.detail.peerId.substring(0,6)}... dropped: ${e.detail.message}`, 'Connection Dropped');
    });
  }

updateRoster(mesh) {
      const rosterEl = this.container.querySelector('#roster-container');
      const liveCountEl = this.container.querySelector('#live-count');
      const peers = Array.from(mesh._connections?.entries() || []);
      
      if (liveCountEl) liveCountEl.innerText = `${peers.length} Live`;

      if (peers.length === 0) {
          rosterEl.innerHTML = `
              <div class="text-center py-10 border border-dashed border-border bg-surface-elevated/40 backdrop-blur-xl shadow-[0_8px_32px_var(--color-card-shadow)] rounded-3xl opacity-50">
                  <p class="text-xs text-text-primary font-mono uppercase tracking-widest">No Active Connections</p>
              </div>
          `;
          return;
      }

      // Render draggable blocks
      rosterEl.innerHTML = peers.map(([pid, conn]) => {
          const pName = conn?.metadata?.displayName || 'Peer Node';
          return `
          <div draggable="true" data-peer-id="${pid}" data-peer-name="${pName}" class="peer-block clay-glass-panel p-4 flex justify-between items-center cursor-move hover:border-primary transition-all active:scale-95">
              <div class="flex items-center gap-4 pointer-events-none">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-success/20 to-surface-elevated border border-success/40 flex items-center justify-center text-success">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                  </div>
                  <div>
                      <p class="font-bold text-sm text-text-primary">${pName}</p>
                      <p class="text-[10px] text-success/70 font-mono tracking-widest uppercase">${pid.substring(0,8)}...</p>
                  </div>
              </div>
              <div class="flex gap-2">
                  <button data-portal-pid="${pid}" data-portal-name="${pName}" class="text-primary px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest active:scale-90 transition-transform btn-neumorphic">Portal</button>
                  <button data-drop-pid="${pid}" class="text-danger px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest active:scale-90 transition-transform btn-neumorphic">Drop</button>
              </div>
          </div>
      `}).join('');

      // Portal logic
      rosterEl.querySelectorAll('[data-portal-pid]').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const pid = e.target.getAttribute('data-portal-pid');
              const pname = e.target.getAttribute('data-portal-name');
              CaregiverPortal.enterPortal(pid, pname);
          });
      });

      // Drop (Disconnect) logic
      rosterEl.querySelectorAll('[data-drop-pid]').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const dropId = e.target.getAttribute('data-drop-pid');
              mesh.disconnectPeer(dropId);
          });
      });
      
      this.initDragAndDrop();
  }

  initDragAndDrop() {
      const blocks = this.container.querySelectorAll('.peer-block');
      const slots = this.container.querySelectorAll('.topology-slot');
      
      blocks.forEach(block => {
          block.addEventListener('dragstart', (e) => {
              e.dataTransfer.setData('text/plain', e.target.getAttribute('data-peer-id'));
              e.target.style.opacity = '0.5';
          });
          block.addEventListener('dragend', (e) => {
              e.target.style.opacity = '1';
          });
      });

      slots.forEach(slot => {
          slot.addEventListener('dragover', (e) => {
              e.preventDefault(); // Necessary to allow dropping
              slot.classList.add('bg-primary/20', 'border-primary');
          });
          slot.addEventListener('dragleave', (e) => {
              slot.classList.remove('bg-primary/20', 'border-primary');
          });
          slot.addEventListener('drop', (e) => {
              e.preventDefault();
              slot.classList.remove('bg-primary/20', 'border-primary');
              const pid = e.dataTransfer.getData('text/plain');
              const block = this.container.querySelector(`.peer-block[data-peer-id="${pid}"]`);
              
              if (block) {
                  const contentDiv = slot.querySelector('.slot-content');
                  contentDiv.appendChild(block);
                  
                  // Automatically enter portal on snap
                  const pname = block.getAttribute('data-peer-name');
                  setTimeout(() => {
                      CaregiverPortal.enterPortal(pid, pname);
                  }, 300);
              }
          });
      });
  }
  destroy() {
    // Cleanup event listeners
  }
}

