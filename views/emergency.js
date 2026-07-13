import state from '../core/state.js';
import db from '../core/db.js';

export default class EmergencyView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';
    
    // Emergency Data
    const bloodType = state.userProfile?.profile?.bloodType || 'O+';
    const allergies = state.userProfile?.profile?.allergies || [];
    const conditions = state.userProfile?.profile?.conditions || [];
    const dobYear = state.userProfile?.profile?.dob ? new Date(state.userProfile.profile.dob).getFullYear() : 'N/A';
    
    // Real Primary Responder from Onboarding Profile Data
    const primaryName = state.userProfile?.profile?.emergencyName || 'Unknown Responder';
    const primaryPhone = state.userProfile?.profile?.emergencyPhone || '';
    const myPhone = state.userProfile?.profile?.phone || '';

    this.container.innerHTML = `
      <main class="scroll-area bg-surface-elevated" style="padding-left:0; padding-right:0; padding-top:96px;">
<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">
        
        <!-- Broadcast SOS Action (Absolute Highest Priority) -->
        <section class="mb-10">
            <button id="sos-btn" class="w-full py-6 bg-gradient-to-r from-danger to-red-900 text-text-primary rounded-[2rem] font-black uppercase tracking-[0.4em] active:scale-95 transition-transform text-xs flex items-center justify-center gap-3 btn-neumorphic">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Broadcast SOS Signal
            </button>
        </section>

        <!-- Emergency Identity Module -->
        <section class="mb-10">
            <div class="bg-gradient-to-br from-secondary to-primary-dark p-8 rounded-[40px] text-text-primary shadow-2xl shadow-primary/10 overflow-hidden relative border border-primary/20">
                <div class="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-accent-primary">
                    <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 2a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h5a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2h5a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5a2 2 0 0 1-2-2V4a2 2 0 0 0-2-2h-4Z"/></svg>
                </div>
                
                <h3 class="text-xs font-bold text-accent-primary mb-6 tracking-[0.2em] uppercase">Emergency Identity (Protocol 00-ID)</h3>

                <div class="grid grid-cols-2 gap-y-8 gap-x-4 mb-4 relative z-10">
                    <div>
                        <span class="text-xs font-bold text-accent-primary/50 tracking-widest block mb-2 leading-none uppercase">Blood Group</span>
                        <p class="text-xl font-bold leading-none text-text-primary">${bloodType}</p>
                    </div>
                    <div>
                        <span class="text-xs font-bold text-accent-primary/50 tracking-widest block mb-2 leading-none uppercase">Epoch</span>
                        <p class="text-xl font-bold leading-none text-text-primary">${dobYear}</p>
                    </div>
                    <div class="col-span-2">
                        <span class="text-xs font-bold text-accent-primary/50 tracking-widest block mb-2 leading-none uppercase">Systemic Conditions</span>
                        <p class="text-sm font-bold leading-relaxed text-text-primary">${conditions.length ? conditions.join(', ') : 'NONE RECORDED'}</p>
                    </div>
                    <div class="col-span-2">
                        <span class="text-xs font-bold text-accent-primary/50 tracking-widest block mb-2 leading-none uppercase">Agent Sensitivities</span>
                        <p class="text-sm font-bold text-accent-primary leading-relaxed">${allergies.length ? allergies.join(', ').toUpperCase() : 'NONE RECORDED'}</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Patient Contact -->
        ${myPhone ? `
        <section class="mb-8">
          <div class="clay-glass-panel p-5 bg-surface-elevated/60 border border-border shadow-xl rounded-2xl flex justify-between items-center">
            <div>
              <p class="text-xs text-accent-primary/70 uppercase font-bold tracking-widest leading-none mb-1">Patient Phone</p>
              <p class="font-bold text-lg text-text-primary">${myPhone}</p>
            </div>
            <a href="tel:${myPhone}" class="w-12 h-12 bg-primary/20 text-accent-primary rounded-2xl flex items-center justify-center border border-primary/40 active:scale-90 transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </a>
          </div>
        </section>
        ` : ''}

        <!-- Primary Responders -->
        <section class="mb-12">
            <h3 class="text-xs font-bold text-primary mb-4 tracking-[0.2em] px-1 uppercase">Primary Responders</h3>
            <div class="space-y-4">
                <div class="clay-glass-panel p-5 flex justify-between items-center bg-surface-deep border-border shadow-xl shadow-card-shadow">
                    <div>
                        <p class="font-bold text-sm text-text-primary">${primaryName}</p>
                        <p class="text-xs text-accent-primary/60 mt-1 font-medium uppercase tracking-widest leading-none">Primary Contact &bull; ${primaryPhone}</p>
                    </div>
                    <a href="tel:${primaryPhone}" class="w-10 h-10 bg-gradient-to-br from-secondary to-primary text-text-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 border border-border active:scale-90 transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </a>
                </div>
                ${(state.userProfile?.profile?.familyMembers || []).map(fm => `
                <div class="clay-glass-panel p-5 flex justify-between items-center bg-surface-elevated/40 border-border shadow-[0_8px_32px_var(--color-card-shadow)]">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-success/20 to-surface-elevated border border-success/40 flex items-center justify-center text-success">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/></svg>
                        </div>
                        <div>
                            <p class="font-bold text-sm text-text-primary">${fm.name}</p>
                            <p class="text-[10px] text-success/70 mt-1 font-mono uppercase tracking-widest leading-none">Linked SOS Peer &bull; ${fm.phone}</p>
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
      </div></main>

      <style>
        .clay-glass-panel { backdrop-filter: blur(12px); border-radius: var(--radius-lg); }
      </style>
    `;

    this.attachListeners();
    return this.container;
  }

  attachListeners() {
    this.container.querySelector('#sos-btn')?.addEventListener('click', () => this.dispatchSOS());
    this.container.querySelector('#hydra-help-btn')?.addEventListener('click', () => {
        const overlay = this.container.querySelector('#hydra-onboarding-overlay');
        if(overlay) overlay.classList.remove('opacity-0', 'pointer-events-none');
    });
    this.container.querySelector('#close-help-btn')?.addEventListener('click', () => {
        const overlay = this.container.querySelector('#hydra-onboarding-overlay');
        if(overlay) overlay.classList.add('opacity-0', 'pointer-events-none');
    });

    // Mesh Events
    this._handlePeerConnected = () => {
        const badge = this.container.querySelector('#hydra-status-badge');
        if (badge) {
            badge.textContent = 'Connected';
            badge.className = 'px-3 py-1 text-[10px] uppercase tracking-widest rounded-full bg-success/20 border border-success text-success';
        }
    };
    this._handlePeerDisconnected = () => {
        const badge = this.container.querySelector('#hydra-status-badge');
        if (badge) {
            badge.textContent = 'Offline';
            badge.className = 'px-3 py-1 text-[10px] uppercase tracking-widest rounded-full bg-surface-elevated border border-border text-text-muted';
        }
    };
    this._handlePeerRequest = () => {
        const badge = this.container.querySelector('#hydra-status-badge');
        if (badge) {
            badge.textContent = 'Connecting...';
            badge.className = 'px-3 py-1 text-[10px] uppercase tracking-widest rounded-full bg-warning/20 border border-warning text-warning';
        }
    };

    window.addEventListener('medcare:peer-connected', this._handlePeerConnected);
    window.addEventListener('medcare:peer-disconnected', this._handlePeerDisconnected);
    window.addEventListener('medcare:peer-request', this._handlePeerRequest);

    this.initMesh();
  }

  async initMesh() {
    try {
        if (!window.QRCode) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const mesh = window.familyMesh;
        if (!mesh) return;

        const qrContainer = this.container.querySelector('#hydra-qr-container');
        if (!qrContainer) return; // Prevent crash if UI doesn't have the QR container

        qrContainer.innerHTML = ''; // clear loader

        if (mesh.peerId) {
            const qrUri = `medcare://peer-connect?id=${mesh.peerId}`; 
            const canvas = document.createElement('canvas');
            window.QRCode.toCanvas(canvas, qrUri, { width: 200, color: { dark: '#000000', light: '#ffffff' }, margin: 2 }, (error) => {
                if (!error) qrContainer.appendChild(canvas);
                else console.error('QR Error:', error);
            });
        } else {
            qrContainer.innerHTML = '<span class="text-xs text-danger text-center px-4 md:px-8 lg:px-12">Failed to acquire Peer ID. Please check your network connection.</span>';
        }
    } catch (e) {
        console.error('Mesh Init Error:', e);
    }
  }

  async dispatchSOS() {
    const btn = this.container.querySelector('#sos-btn');
    
    // UI: Start Location Phase
    btn.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            LOCATING...
        </div>
    `;

    // 1. Acquire Geolocation
    let locationStr = 'Unknown Location';
    let mapsLink = '';
    try {
        const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        mapsLink = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        locationStr = mapsLink;
    } catch (e) {
        console.warn('[SOS] Geolocation failed:', e);
    }

    // UI: Start Dispatch Phase
    btn.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            DISPATCHING...
        </div>
    `;

    const primaryPhone = state.userProfile?.profile?.emergencyPhone || '';
    const familyPhones = (state.userProfile?.profile?.familyMembers || []).map(fm => fm.phone).filter(Boolean);
    
    // Combine phones, stripping any non-numeric characters for URI compliance if needed (keeping +)
    const allPhones = [primaryPhone, ...familyPhones].filter(Boolean).join(',');

    const bloodType = state.userProfile?.profile?.bloodType || 'Unknown';
    const message = `EMERGENCY SOS: I need immediate medical assistance. Blood Type: ${bloodType}. ${locationStr !== 'Unknown Location' ? 'Location: ' + locationStr : ''}`;

    // Internal Broadcast for Peer Network auto-linking
    window.dispatchEvent(new CustomEvent('medcare:sos-broadcast', { detail: { message, location: mapsLink } }));

    // Clean the primary phone number for WhatsApp deep link
    let cleanPrimaryPhone = primaryPhone ? primaryPhone.replace(/[^\d+]/g, '') : '';
    // Ensure it starts with +91 if Indian number and missing country code (basic heuristic)
    if (cleanPrimaryPhone.length === 10 && !cleanPrimaryPhone.startsWith('+')) {
        cleanPrimaryPhone = '+91' + cleanPrimaryPhone;
    }

    let dispatched = false;

    // 1. Try WhatsApp Teleport (Primary Responder)
    if (cleanPrimaryPhone) {
        // Use wa.me deep link
        const waUrl = `https://wa.me/${cleanPrimaryPhone.replace('+', '')}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
        dispatched = true;
    } 
    // 2. Native Web Share API as Fallback
    else if (navigator.share) {
        try {
            await navigator.share({
                title: 'EMERGENCY SOS',
                text: message,
            });
            dispatched = true;
        } catch (e) {
            console.warn('[SOS] Web Share aborted or failed:', e);
            if (e.name === 'AbortError') {
                dispatched = true;
            }
        }
    }

    // 3. Fallback to SMS Scheme
    if (!dispatched && allPhones) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const separator = isIOS ? '&' : '?';
        window.location.href = `sms:${allPhones}${separator}body=${encodeURIComponent(message)}`;
        dispatched = true;
    } 
    // 4. Ultimate Fallback to Phone Call
    else if (!dispatched && primaryPhone) {
        window.location.href = `tel:${primaryPhone}`;
        dispatched = true;
    }

    // UI: Final Dispatched State
    btn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        SOS DISPATCHED
    `;
    btn.classList.replace('from-danger', 'from-green-600');
    btn.classList.replace('to-danger', 'to-green-800');
    btn.classList.replace('shadow-danger/40', 'shadow-green-900/40');
    btn.classList.replace('border-danger/40', 'border-green-500/40');
  }

  destroy() {
    // Cleanup
    window.removeEventListener('medcare:peer-connected', this._handlePeerConnected);
    window.removeEventListener('medcare:peer-disconnected', this._handlePeerDisconnected);
    window.removeEventListener('medcare:peer-request', this._handlePeerRequest);
  }
}
