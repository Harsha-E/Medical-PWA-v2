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

    this.container.innerHTML = `
      <header class="view-header">
        <div class="flex flex-col">
          <span class="text-xs text-[#ffb88c]/70 uppercase font-bold tracking-widest leading-none">Critical</span>
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
                
                <h3 class="text-xs font-bold text-[#ffb88c] mb-6 tracking-[0.2em] uppercase">Emergency Identity (Protocol 00-ID)</h3>

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
            <h3 class="text-xs font-bold text-[#ca5229] mb-4 tracking-[0.2em] px-1 uppercase">Primary Responders</h3>
            <div class="space-y-4">
                <div class="clay-glass-panel p-5 flex justify-between items-center bg-white/5 border-[#7f2f5d]/40 shadow-xl shadow-[#000]">
                    <div>
                        <p class="font-bold text-sm text-white">${primaryName}</p>
                        <p class="text-xs text-[#ffb88c]/60 mt-1 font-medium uppercase tracking-widest leading-none">Primary Contact &bull; ${primaryPhone}</p>
                    </div>
                    <a href="tel:${primaryPhone}" class="w-10 h-10 bg-gradient-to-br from-[#7f2f5d] to-[#ca5229] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#ca5229]/20 border border-white/20 active:scale-90 transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </a>
                </div>
                ${(state.userProfile?.profile?.familyMembers || []).map(fm => `
                <div class="clay-glass-panel p-5 flex justify-between items-center bg-[#1a0a12]/40 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ff7f]/20 to-[#1a0a12] border border-[#00ff7f]/40 flex items-center justify-center text-[#00ff7f]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/></svg>
                        </div>
                        <div>
                            <p class="font-bold text-sm text-white">${fm.name}</p>
                            <p class="text-[10px] text-[#00ff7f]/70 mt-1 font-mono uppercase tracking-widest leading-none">Linked SOS Peer &bull; ${fm.phone}</p>
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        </section>
      </main>

      <style>
        .view-header { position: fixed; top: 0; left: 0; right: 0; height: 80px; backdrop-filter: blur(24px); display: flex; align-items: center; z-index: 100; }
        .clay-glass-panel { backdrop-filter: blur(12px); border-radius: var(--radius-lg); }
      </style>
    `;

    this.attachListeners();
    return this.container;
  }

  attachListeners() {
    this.container.querySelector('#sos-btn').addEventListener('click', () => this.dispatchSOS());
  }

  async dispatchSOS() {
    const btn = this.container.querySelector('#sos-btn');
    
    // UI: Start Location Phase
    btn.innerHTML = \`
        <div class="flex items-center gap-2">
            <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            LOCATING...
        </div>
    \`;

    // 1. Acquire Geolocation
    let locationStr = 'Unknown Location';
    let mapsLink = '';
    try {
        const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        mapsLink = \`https://maps.google.com/?q=\${pos.coords.latitude},\${pos.coords.longitude}\`;
        locationStr = mapsLink;
    } catch (e) {
        console.warn('[SOS] Geolocation failed:', e);
    }

    // UI: Start Dispatch Phase
    btn.innerHTML = \`
        <div class="flex items-center gap-2">
            <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            DISPATCHING...
        </div>
    \`;

    const primaryPhone = state.userProfile?.profile?.emergencyPhone || '';
    const familyPhones = (state.userProfile?.profile?.familyMembers || []).map(fm => fm.phone).filter(Boolean);
    
    // Combine phones, stripping any non-numeric characters for URI compliance if needed (keeping +)
    const allPhones = [primaryPhone, ...familyPhones].filter(Boolean).join(',');

    const bloodType = state.userProfile?.profile?.bloodType || 'Unknown';
    const message = \`EMERGENCY SOS: I need immediate medical assistance. Blood Type: \${bloodType}. \${locationStr !== 'Unknown Location' ? 'Location: ' + locationStr : ''}\`;

    // Internal Broadcast for Peer Network auto-linking
    window.dispatchEvent(new CustomEvent('medcare:sos-broadcast', { detail: { message, location: mapsLink } }));

    let dispatched = false;

    // 2. Native Web Share API (Primary method for mobile)
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'EMERGENCY SOS',
                text: message,
            });
            dispatched = true;
        } catch (e) {
            console.warn('[SOS] Web Share aborted or failed:', e);
            if (e.name === 'AbortError') {
                dispatched = true; // User intentionally cancelled, don't fallback to force SMS
            }
        }
    }

    // 3. Fallback to SMS Scheme
    if (!dispatched && allPhones) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const separator = isIOS ? '&' : '?';
        window.location.href = \`sms:\${allPhones}\${separator}body=\${encodeURIComponent(message)}\`;
        dispatched = true;
    } 
    // 4. Ultimate Fallback to Phone Call
    else if (!dispatched && primaryPhone) {
        window.location.href = \`tel:\${primaryPhone}\`;
        dispatched = true;
    }

    // UI: Final Dispatched State
    btn.innerHTML = \`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        SOS DISPATCHED
    \`;
    btn.classList.replace('from-[#ef4444]', 'from-green-600');
    btn.classList.replace('to-[#991b1b]', 'to-green-800');
    btn.classList.replace('shadow-[#ef4444]/40', 'shadow-green-900/40');
    btn.classList.replace('border-[#ef4444]/40', 'border-green-500/40');
  }

  destroy() {
    // Cleanup
  }
}

