import state from '../core/state.js';
import db from '../core/db.js';

export default class SettingsView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';

    const displayName = state.user?.displayName || 'Harsha Edupuganti';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase() || 'HE';
    const bloodType = state.userProfile?.profile?.bloodType || 'O+';
    
    // Emergency Data Migration
    const family = await db.family.toArray();
    const primaryContact = family.find(p => p.relationship?.toLowerCase().includes('spouse')) || family[0];
    const allergies = state.userProfile?.profile?.allergies || [];
    const conditions = state.userProfile?.profile?.conditions || [];
    const dobYear = state.userProfile?.profile?.dob ? new Date(state.userProfile.profile.dob).getFullYear() : 'N/A';

    this.container.innerHTML = `
      <header class="view-header">
        <div class="flex flex-col">
            <span class="text-xs text-uppercase text-[#ffb88c]/70 uppercase tracking-widest leading-none">Configuration</span>
            <h1 class="text-xl font-display mt-1 leading-none text-white">System Profile</h1>
        </div>
      </header>

      <main class="scroll-area px-6 pt-28 bg-[#1a0a12]">
        <div class="glass-panel p-8 mb-12 flex items-center gap-6 shadow-xl shadow-[#000]/50 border border-[#7f2f5d]/30">
          <div class="avatar-circle font-display italic text-3xl shadow-xl border border-[#ffb88c]/30 bg-gradient-to-br from-[#7f2f5d] to-[#1a0a12] text-[#ffb88c]">${initials}</div>
          <div class="flex-1">
            <p class="font-bold text-xl leading-tight text-white">${displayName}</p>
            <p class="text-xs text-uppercase font-bold text-[#ffb88c] mt-2 tracking-widest uppercase">${bloodType} Clinical Node</p>
          </div>
          <button id="edit-profile-btn" class="bg-white/5 p-3 rounded-2xl border border-[#7f2f5d]/40 shadow-sm active:scale-90 transition-all text-white backdrop-blur-md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
        </div>


        <section class="mb-10">
          <h3 class="text-xs text-uppercase font-bold text-[#ffb88c]/70 mb-4 tracking-[0.2em] px-1">Alerting Protocols</h3>
          <div class="glass-panel overflow-hidden border-[#7f2f5d]/30">
            <div class="settings-row text-white">
              <span class="text-sm font-medium">Push Notifications</span>
              <div class="toggle" data-setting="notifications"></div>
            </div>
            <div class="settings-row border-t border-[#7f2f5d]/30 text-white">
              <span class="text-sm font-medium">Refill Telemetry</span>
              <div class="toggle" data-setting="refills"></div>
            </div>
            <div class="settings-row border-t border-[#7f2f5d]/30 text-white">
              <span class="text-sm font-medium">Interaction Watchdog</span>
              <div class="toggle" data-setting="interactions"></div>
            </div>
          </div>
        </section>

        <section class="mb-10">
          <h3 class="text-xs text-uppercase font-bold text-[#ffb88c]/70 mb-4 tracking-[0.2em] px-1">Data Architecture</h3>
          <div class="glass-panel overflow-hidden border-[#7f2f5d]/30">
            <button class="settings-row w-full text-left bg-transparent border-none" id="logout-btn">
              <span class="text-sm font-medium text-[#ca5229]">Terminate Session</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ca5229" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </section>

        <div class="app-info text-center py-10 opacity-30">
          <p class="text-[8px] text-uppercase font-bold tracking-[0.4em] text-[#ffb88c]">MedCare Precision Environment &bull; v0.9.1</p>
        </div>
      </main>

      <style>
        .view-header { position: fixed; top: 0; left: 0; right: 0; height: 80px; background: rgba(26, 10, 18, 0.85); backdrop-filter: blur(24px); border-bottom: 1px solid rgba(127, 47, 93, 0.3); display: flex; align-items: center; z-index: 100; }
        .avatar-circle { width: 64px; height: 64px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; }
        .settings-row { display: flex; justify-content: space-between; align-items: center; padding: 20px; transition: background 0.2s ease; cursor: pointer; }
        .settings-row:active { background: rgba(255,255,255,0.05); }
        .toggle { width: 36px; height: 20px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; position: relative; cursor: pointer; transition: background 0.2s; }
        .toggle::after { content: ''; position: absolute; left: 2px; top: 1px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: left 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .toggle.active { background: #ca5229; border-color: #ca5229; }
        .toggle.active::after { left: 18px; }
      </style>
    `;
    

    this.applyToggleStates();
    this.attachListeners();
    return this.container;
  }

  _showToast(msg, type = 'error') {
    const t = document.createElement('div');
    t.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-mono uppercase tracking-widest z-[99999] shadow-xl transition-all ${type === 'error' ? 'bg-red-900/80 border border-red-500/40 text-red-200' : 'bg-[#00ff7f]/10 border border-[#00ff7f]/30 text-[#00ff7f]'}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }


  applyToggleStates() {
    this.container.querySelectorAll('.toggle').forEach(t => {
      const setting = t.dataset.setting;
      const isActive = localStorage.getItem(`setting-${setting}`) === 'true';
      t.classList.toggle('active', isActive);
    });
  }

  attachListeners() {
    this.container.querySelector('#edit-profile-btn')?.addEventListener('click', () => {
        const currentName = state.user?.displayName || '';
        const bloodType = state.userProfile?.profile?.bloodType || 'O+';
        
        const modalHtml = `
          <div id="profile-modal" class="fixed inset-0 z-[9999] bg-[#0a0407]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-[#1a0a12] border border-[#7f2f5d]/50 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl">
              <h2 class="text-xl font-display text-white mb-6">Edit Identity</h2>
              <div class="space-y-4">
                <div>
                  <label class="text-xs text-gray-400 uppercase tracking-widest font-bold ml-2 mb-1 block">Display Name</label>
                  <input type="text" id="prof-name" value="${currentName}" class="w-full bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ffb88c]/50">
                </div>
                <div>
                  <label class="text-xs text-gray-400 uppercase tracking-widest font-bold ml-2 mb-1 block">Blood Type</label>
                  <select id="prof-blood" class="w-full bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ffb88c]/50">
                    <option value="A+" ${bloodType==='A+'?'selected':''}>A+</option>
                    <option value="A-" ${bloodType==='A-'?'selected':''}>A-</option>
                    <option value="B+" ${bloodType==='B+'?'selected':''}>B+</option>
                    <option value="B-" ${bloodType==='B-'?'selected':''}>B-</option>
                    <option value="AB+" ${bloodType==='AB+'?'selected':''}>AB+</option>
                    <option value="AB-" ${bloodType==='AB-'?'selected':''}>AB-</option>
                    <option value="O+" ${bloodType==='O+'?'selected':''}>O+</option>
                    <option value="O-" ${bloodType==='O-'?'selected':''}>O-</option>
                  </select>
                </div>
              </div>
              <div class="flex gap-3 mt-8">
                <button id="prof-cancel" class="flex-1 py-3.5 rounded-xl border border-[#7f2f5d]/50 text-gray-400 font-bold uppercase text-xs tracking-widest hover:bg-white/5 transition-colors">Cancel</button>
                <button id="prof-save" class="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#7f2f5d] to-[#ca5229] text-white font-bold uppercase text-xs tracking-widest shadow-lg shadow-[#ca5229]/20 active:scale-95 transition-transform">Save</button>
              </div>
            </div>
          </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div);

        document.getElementById('prof-cancel').onclick = () => div.remove();
        document.getElementById('prof-save').onclick = async () => {
            const newName = document.getElementById('prof-name').value.trim();
            const newBlood = document.getElementById('prof-blood').value;
            
            if (newName) {
                const profile = await db.userProfile.get({ key: 'profile' }) || { key: 'profile', data: {} };
                profile.data = { ...profile.data, name: newName, bloodType: newBlood };
                await db.userProfile.put(profile);
                
                if (state.user) state.user.displayName = newName;
                if (!state.userProfile) state.userProfile = { profile: {} };
                state.userProfile.profile.bloodType = newBlood;
                
                div.remove();
                const newHtml = await this.render();
                this.container.parentNode.replaceChild(newHtml, this.container);
            }
        };
    });


    this.container.querySelector('#logout-btn')?.addEventListener('click', async () => {
      if (confirm('Terminate secure session?')) {
        const { auth } = await import('../core/firebase.js');
        await auth.signOut();
        window.location.hash = '#/login';
      }
    });

    this.container.querySelector('#sos-btn')?.addEventListener('click', async () => {
        if (confirm("This will broadcast a high-priority distress signal. Proceed?")) {
            const currentName = state.user?.displayName || 'User';
            const bloodType = state.userProfile?.profile?.bloodType || 'Unknown';
            const allergies = (state.userProfile?.profile?.allergies || []).join(', ') || 'None known';
            
            const msg = `EMERGENCY: ${currentName} needs immediate medical assistance.\nBlood Type: ${bloodType}\nAllergies: ${allergies}`;
            
            const fallback = () => {
                const firstContactLink = this.container.querySelector('a[href^="tel:"]');
                if (firstContactLink && firstContactLink.href !== 'tel:null') {
                    window.location.href = firstContactLink.href;
                } else {
                    if (this._showToast) this._showToast("SOS Broadcast failed. No primary contact number found.", 'error');
                }
            };

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'MEDICAL EMERGENCY',
                        text: msg
                    });
                    if (this._showToast) this._showToast("SOS Broadcast successful.", 'success');
                } catch (e) {
                    console.log("Web Share cancelled or failed.");
                    fallback();
                }
            } else {
                fallback();
            }
        }
    });

    this.container.querySelectorAll('.toggle').forEach(t => {
      t.onclick = async () => {
        const setting = t.dataset.setting;
        const wantsActive = !t.classList.contains('active');

        if (setting === 'notifications' && wantsActive) {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            this._showToast('Notification permission was denied.');
            return;
          }
        }

        t.classList.toggle('active');
        localStorage.setItem(`setting-${setting}`, t.classList.contains('active'));
      };
    });
  }

  destroy() {
    // Cleanup if necessary
  }
}