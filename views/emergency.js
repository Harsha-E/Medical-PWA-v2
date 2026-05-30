import state from '../core/state.js';
import db from '../core/db.js';
import PeerMesh from '../services/PeerMesh.js';
import QRCode from 'https://esm.sh/qrcode@1.5.3';

export default class EmergencyView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';
    
    // We repurpose the EmergencyView component into the Mesh Hub (Peer Network Connector)
    const displayName = state.user?.displayName || 'Unknown Node';
    const mesh = PeerMesh.getInstance();
    
    // Emergency Data
    const bloodType = state.userProfile?.profile?.bloodType || 'O+';
    const family = await db.family.toArray();
    const primaryContact = family.find(p => p.relationship?.toLowerCase().includes('spouse')) || family[0];
    const allergies = state.userProfile?.profile?.allergies || [];
    const conditions = state.userProfile?.profile?.conditions || [];
    const dobYear = state.userProfile?.profile?.dob ? new Date(state.userProfile.profile.dob).getFullYear() : 'N/A';
    
    await mesh.init();

    this.container.innerHTML = `
      <header class="view-header bg-gradient-to-r from-[#1a0a12] to-[#4a1532] border-b border-[#7f2f5d]/40 justify-between px-6 shadow-xl shadow-[#ca5229]/5">
        <div class="flex flex-col">
          <span class="text-xs text-uppercase text-[#ffb88c]/70 uppercase font-bold tracking-widest leading-none">Critical</span>
          <h1 class="text-xl font-display mt-1 text-white leading-none">Emergency Hub</h1>
        </div>
      </header>

      <main class="scroll-area px-6 pt-28 bg-[#1a0a12] pb-24">
        
        <!-- Broadcast SOS Action (Absolute Highest Priority) -->
        <section class="mb-10">
            <button id="sos-btn" class="w-full py-6 bg-gradient-to-r from-[#ef4444] to-[#991b1b] text-white border border-[#ef4444]/40 rounded-[2rem] font-black uppercase tracking-[0.4em] shadow-2xl shadow-[#ef4444]/40 active:scale-95 transition-transform text-xs flex items-center justify-center gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Broadcast SOS Signal
            </button>
        </section>

        <!-- Emergency Identity Module -->
        <section class="mb-10">
            <div class="bg-gradient-to-br from-[#7f2f5d] to-[#4a1532] p-8 rounded-[40px] text-white shadow-2xl shadow-[#ca5229]/10 overflow-hidden relative border border-[#ca5229]/20">
                <div class="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-[#ffb88c]">
                    <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 2a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h5a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2h5a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5a2 2 0 0 1-2-2V4a2 2 0 0 0-2-2h-4Z"/></svg>
                </div>
                
                <h3 class="text-xs text-uppercase font-bold text-[#ffb88c] mb-6 tracking-[0.2em] uppercase">Emergency Identity (Protocol 00-ID)</h3>

                <div class="grid grid-cols-2 gap-y-8 gap-x-4 mb-4 relative z-10">
                    <div>
                        <span class="text-xs font-bold text-[#ffb88c]/50 tracking-widest block mb-2 leading-none uppercase">Blood Group</span>
                        <p class="text-xl font-bold leading-none text-white">${bloodType}</p>
                    </div>
                    <div>
                        <span class="text-xs font-bold text-[#ffb88c]/50 tracking-widest block mb-2 leading-none uppercase">Epoch</span>
                        <p class="text-xl font-bold leading-none text-white">${dobYear}</p>
                    </div>
                    <div class="col-span-2">
                        <span class="text-xs font-bold text-[#ffb88c]/50 tracking-widest block mb-2 leading-none uppercase">Systemic Conditions</span>
                        <p class="text-sm font-bold leading-relaxed text-white">${conditions.length ? conditions.join(', ') : 'NONE RECORDED'}</p>
                    </div>
                    <div class="col-span-2">
                        <span class="text-xs font-bold text-[#ffb88c]/50 tracking-widest block mb-2 leading-none uppercase">Agent Sensitivities</span>
                        <p class="text-sm font-bold text-[#ffb88c] leading-relaxed">${allergies.length ? allergies.join(', ').toUpperCase() : 'NONE RECORDED'}</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Primary Responders -->
        <section class="mb-12">
            <h3 class="text-xs text-uppercase font-bold text-[#ca5229] mb-4 tracking-[0.2em] px-1 uppercase">Primary Responders</h3>
            <div class="space-y-4">
                ${primaryContact ? `
                    <div class="glass-panel p-5 flex justify-between items-center bg-white/5 border-[#7f2f5d]/40 shadow-xl shadow-[#000]">
                        <div>
                            <p class="font-bold text-sm text-white">${primaryContact.name}</p>
                            <p class="text-xs text-[#ffb88c]/60 mt-1 font-medium uppercase tracking-widest leading-none">${primaryContact.relationship} Node &bull; ${primaryContact.phone || 'N/A'}</p>
                        </div>
                        <a href="tel:${primaryContact.phone}" class="w-10 h-10 bg-gradient-to-br from-[#7f2f5d] to-[#ca5229] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#ca5229]/20 border border-white/20 active:scale-90 transition-all">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </a>
                    </div>
                ` : ''}
                <div class="glass-panel p-5 flex justify-between items-center bg-white/5 border-[#7f2f5d]/40 shadow-xl shadow-[#000]">
                    <div>
                        <p class="font-bold text-sm text-white">Dr. Rajesh Kumar</p>
                        <p class="text-xs text-[#ffb88c]/60 mt-1 font-medium uppercase tracking-widest leading-none">Clinical Admin &bull; +91 12XXX XXX90</p>
                    </div>
                    <a href="tel:+911234567890" class="w-10 h-10 bg-gradient-to-br from-[#7f2f5d] to-[#ca5229] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#ca5229]/20 border border-white/20 active:scale-90 transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </a>
                </div>
            </div>
        </section>

        <!-- The Handshake: Connection interface -->
        <section class="mb-10 relative">
            <div class="glass-panel p-8 text-center border-[#7f2f5d]/40 shadow-2xl overflow-hidden relative">
                <div class="absolute inset-0 bg-gradient-to-br from-[#7f2f5d]/20 to-[#ca5229]/10 pointer-events-none"></div>
                <h2 class="text-xl font-display text-white mb-2 relative z-10">The Handshake</h2>
                <p class="text-xs text-[#ffb88c]/70 font-mono mb-6 relative z-10">Scan this code to establish a peer-to-peer connection with ${displayName}</p>
                
                <div id="qr-container" class="bg-white p-4 rounded-3xl inline-block shadow-lg border border-white/20 relative z-10 min-h-[200px] min-w-[200px] flex items-center justify-center">
                    <div class="loader">
                      <div class="box1"></div>
                      <div class="box2"></div>
                      <div class="box3"></div>
                    </div>
                </div>

                <div class="mt-8 flex gap-3 relative z-10">
                    <input type="text" id="pairing-code" placeholder="Enter Pairing Code..." class="flex-1 bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-white text-xs font-mono focus:outline-none focus:border-[#ffb88c]/50 transition-colors">
                    <button id="connect-btn" class="bg-[#ca5229] text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs active:scale-95 transition-transform shadow-lg shadow-[#ca5229]/20">Connect</button>
                </div>
            </div>
        </section>

        <!-- The Roster: Connected peers -->
        <section>
            <div class="flex justify-between items-center mb-6 px-1">
                <h3 class="text-xs text-uppercase font-bold text-[#ffb88c]/80 tracking-[0.2em] uppercase">The Roster (Connected Peers)</h3>
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
                            <p class="text-xs text-[#ffb88c]/60">Peer can view your medical history.</p>
                        </div>
                    </label>
                    <label class="flex items-center gap-3 p-4 border border-[#7f2f5d]/50 rounded-xl bg-white/5 cursor-pointer">
                        <input type="radio" name="permissions" value="edit" class="accent-[#ca5229]">
                        <div>
                            <p class="text-sm font-bold text-white">Editor</p>
                            <p class="text-xs text-red-400/80">Peer can modify your records.</p>
                        </div>
                    </label>
                </div>

                <div class="flex gap-3">
                    <button id="gatekeeper-decline" class="flex-1 py-4 rounded-xl border border-white/10 text-white text-xs uppercase font-bold tracking-widest hover:bg-white/5 active:scale-95 transition-all">Decline</button>
                    <button id="gatekeeper-accept" class="flex-1 py-4 rounded-xl bg-[#ca5229] text-white text-xs uppercase font-bold tracking-widest shadow-lg shadow-[#ca5229]/30 active:scale-95 transition-all">Accept</button>
                </div>
            </div>
        </div>
      </main>

      <style>
        .view-header { position: fixed; top: 0; left: 0; right: 0; height: 80px; display: flex; align-items: center; z-index: 1000; }
        .peer-node { animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .loader {
          width: 112px;
          height: 112px;
          transform: scale(0.6);
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
      </style>
    `;

    // Render QR Code after a delay to simulate loading or let optimistic rendering shine
    setTimeout(async () => {
        const qrUri = `medcare://peer-connect?id=${mesh.myId}&name=${encodeURIComponent(displayName)}`;
        const qrContainer = this.container.querySelector('#qr-container');
        try {
          const url = await QRCode.toDataURL(qrUri, {
            width: 200,
            margin: 2,
            color: { dark: '#1a0a12', light: '#ffffff' }
          });
          qrContainer.innerHTML = `<img src="${url}" alt="Peer Pairing QR Code" class="w-full h-auto rounded-xl animate-[fadeIn_0.5s_ease-in]">`;
        } catch (err) {
          console.error('Failed to generate QR Code', err);
          qrContainer.innerHTML = `<div class="text-red-500 p-4 font-mono text-xs">Failed to generate QR.</div>`;
        }
    }, 1500);
    // Canvas was handled by the animated skeleton loader.

    this.attachListeners();
    this.renderRoster();
    
    // Listen for incoming requests
    this._reqHandler = (e) => this.showGatekeeper(e.detail);
    window.addEventListener('medcare:peer-request', this._reqHandler);

    this._connectedHandler = () => this.renderRoster();
    window.addEventListener('medcare:peer-connected', this._connectedHandler);

    return this.container;
  }

  showGatekeeper({ peerId, connLabel }) {
      this._pendingPeerId = peerId;
      const modal = this.container.querySelector('#gatekeeper-modal');
      const content = this.container.querySelector('#gatekeeper-content');
      this.container.querySelector('#gatekeeper-peer-name').textContent = `${connLabel} is requesting access to your node.`;
      
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      // small delay for transition
      requestAnimationFrame(() => {
          modal.classList.remove('opacity-0');
          content.classList.remove('scale-95');
      });
  }

  hideGatekeeper() {
      const modal = this.container.querySelector('#gatekeeper-modal');
      const content = this.container.querySelector('#gatekeeper-content');
      modal.classList.add('opacity-0');
      content.classList.add('scale-95');
      setTimeout(() => {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
          this._pendingPeerId = null;
      }, 300);
  }

  renderRoster() {
      const roster = this.container.querySelector('#roster-container');
      const mesh = PeerMesh.getInstance();
      
      // Temporary mocked peers for visualization until WebRTC connects
      const peers = Array.from(mesh._connections.values());
      
      if (peers.length === 0) {
          // Keep the empty state
          return;
      }

      roster.innerHTML = '';
      peers.forEach(peer => {
          const name = peer.metadata?.displayName || 'Unknown Peer';
          const initials = name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
          const p = document.createElement('div');
          p.className = 'peer-node glass-panel p-5 flex items-center justify-between border-[#7f2f5d]/30 shadow-xl cursor-pointer hover:bg-white/5 transition-colors';
          p.innerHTML = `
              <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-full bg-gradient-to-br from-[#7f2f5d] to-[#ca5229] border border-white/20 flex items-center justify-center text-white font-display italic font-bold shadow-lg shadow-[#ca5229]/20">${initials}</div>
                  <div>
                      <p class="font-bold text-white text-base">${name}</p>
                      <p class="text-xs text-[#ffb88c]/70 font-mono uppercase tracking-widest">Connected &bull; Read-Only</p>
                  </div>
              </div>
              <button class="text-white bg-white/10 p-2 rounded-full border border-white/10 view-peer-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
          `;
          
          p.addEventListener('click', () => {
              // Trigger Context Switcher (Phase 2)
              window.dispatchEvent(new CustomEvent('peer:context-enter', { detail: { peerId: peer.peer, name, color: '#ca5229' } }));
          });
          roster.appendChild(p);
      });
  }

  attachListeners() {
      this.container.querySelector('#connect-btn').addEventListener('click', async () => {
          const code = this.container.querySelector('#pairing-code').value.trim();
          if (!code) return this._showToast('Enter a valid pairing code.', 'error');
          const mesh = PeerMesh.getInstance();
          try {
              await mesh.connectToPeer(code);
              this._showToast('Connection requested...', 'success');
          } catch (e) {
              this._showToast('Failed to connect.', 'error');
          }
      });

      this.container.querySelector('#gatekeeper-decline').addEventListener('click', () => {
          if (this._pendingPeerId) {
              PeerMesh.getInstance()._pendingConsent.delete(this._pendingPeerId);
          }
          this.hideGatekeeper();
      });

      this.container.querySelector('#gatekeeper-accept').addEventListener('click', async () => {
          if (this._pendingPeerId) {
              try {
                  const mesh = PeerMesh.getInstance();
                  await mesh.approvePeerConnection(this._pendingPeerId);
                  this._showToast("Connection Established", "success");
                  this.renderRoster();
              } catch (e) {
                  this._showToast("Biometric consent failed.");
              }
          }
          this.hideGatekeeper();
      });

      this.container.querySelector('#connect-btn').addEventListener('click', () => {
          const code = this.container.querySelector('#pairing-code').value;
          if (!code) return this._showToast("Enter a pairing code");
          this._showToast("Connecting...", "success");
          // Logic for outbound connection goes here
      });
  }

  _showToast(msg, type = 'error') {
    const t = document.createElement('div');
    t.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-mono uppercase tracking-widest z-[99999] shadow-xl transition-all ${type === 'error' ? 'bg-red-900/80 border border-red-500/40 text-red-200' : 'bg-[#00ff7f]/10 border border-[#00ff7f]/30 text-[#00ff7f]'}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  destroy() {
      if (this._reqHandler) {
          window.removeEventListener('medcare:peer-request', this._reqHandler);
      }
  }
}