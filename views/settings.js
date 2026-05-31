import state from '../core/state.js';
import db from '../core/db.js';
import { APP_VERSION } from '../core/config.js';
import { showToast } from '../core/ui.js';
export default class SettingsView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container overflow-hidden h-full flex flex-col relative';

    const displayName = state.user?.displayName || state.userProfile?.name || state.user?.email || 'Unknown User';
    const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    const bloodType = state.userProfile?.profile?.bloodType || 'O+';
    
    // Emergency Data Migration
    const family = await db.family.toArray();
    const primaryContact = family.find(p => p.relationship?.toLowerCase().includes('spouse')) || family[0];
    const allergies = state.userProfile?.profile?.allergies || [];
    const conditions = state.userProfile?.profile?.conditions || [];
    const dobYear = state.userProfile?.profile?.dob ? new Date(state.userProfile.profile.dob).getFullYear() : 'N/A';

    this.container.innerHTML = `
      <header class="view-header z-20 bg-transparent">
        <div class="flex flex-col">
            <span class="text-xs text-uppercase text-[#ffb88c]/70 uppercase tracking-widest leading-none">Configuration</span>
            <h1 class="text-xl font-display mt-1 leading-none text-[var(--color-text-primary)]">System Profile</h1>
        </div>
      </header>

      <main class="scroll-area px-6 bg-transparent pb-40">
        <div class="clay-glass-panel p-8 mb-12 flex items-center gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 backdrop-blur-xl">
          <div class="w-20 h-20 rounded-full flex items-center justify-center font-display italic text-3xl font-bold shadow-[0_0_20px_rgba(202,82,41,0.3)] border border-[#ffb88c]/40 bg-gradient-to-br from-[#ca5229]/80 to-[#7f2f5d]/80 text-[#ffd9b5] backdrop-blur-md shrink-0 ring-4 ring-[#1a0a12]/50">${initials}</div>
          <div class="flex-1">
            <p class="font-bold text-xl leading-tight text-[var(--color-text-primary)]">${displayName}</p>
            <p class="text-xs text-uppercase font-bold text-[#ffb88c] mt-2 tracking-widest uppercase">${bloodType} Clinical Node</p>
          </div>
          <button id="edit-profile-btn" class="bg-white/5 p-3 rounded-2xl border border-[#7f2f5d]/40 shadow-sm active:scale-90 transition-all text-[var(--color-text-primary)] backdrop-blur-md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
        </div>


        <section class="mb-10">
          <h3 class="text-xs text-uppercase font-bold text-[#ffb88c]/70 mb-4 tracking-[0.2em] px-1">Alerting Protocols</h3>
          <div class="clay-glass-panel overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl">
            <div class="settings-row text-[var(--color-text-primary)]">
              <span class="text-sm font-medium">Push Notifications</span>
              <div class="toggle" data-setting="notifications"></div>
            </div>
            <div class="settings-row border-t border-[#7f2f5d]/30 text-[var(--color-text-primary)]">
              <span class="text-sm font-medium">Refill Telemetry</span>
              <div class="toggle" data-setting="refills"></div>
            </div>
            <div class="settings-row border-t border-[#7f2f5d]/30 text-[var(--color-text-primary)]">
              <span class="text-sm font-medium">Interaction Watchdog</span>
              <div class="toggle" data-setting="interactions"></div>
            </div>
          </div>
        </section>

        <section class="mb-10">
          <h3 class="text-xs text-uppercase font-bold text-[#ffb88c]/70 mb-4 tracking-[0.2em] px-1">Appearance</h3>
          <div class="clay-glass-panel overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl">
            <div class="settings-row text-[var(--color-text-primary)]" id="theme-toggle-row">
              <span class="text-sm font-medium">Light Theme</span>
              <div class="toggle" id="theme-toggle"></div>
            </div>
          </div>
        </section>

        <section class="mb-10">
          <h3 class="text-xs text-uppercase font-bold text-[#ffb88c]/70 mb-4 tracking-[0.2em] px-1">Data Architecture</h3>
          <div class="clay-glass-panel overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl">
            <button class="settings-row w-full text-left bg-transparent border-none" id="logout-btn">
              <span class="text-sm font-medium text-[#ca5229]">Terminate Session</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ca5229" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
            <button class="settings-row w-full text-left bg-transparent border-none border-t border-red-500/30" id="delete-account-btn">
              <span class="text-sm font-medium text-red-500">Purge Data & Delete Account</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </section>

        <div class="app-info text-center py-10 opacity-30">
          <p class="text-[8px] text-uppercase font-bold tracking-[0.4em] text-[#ffb88c]">MedCare Precision Environment &bull; v${APP_VERSION}</p>
        </div>
      </main>

      <style>
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




  applyToggleStates() {
    this.container.querySelectorAll('.toggle:not(#theme-toggle)').forEach(t => {
      const setting = t.dataset.setting;
      const isActive = localStorage.getItem(`setting-${setting}`) === 'true';
      t.classList.toggle('active', isActive);
    });

    const themeToggle = this.container.querySelector('#theme-toggle');
    if (themeToggle) {
      themeToggle.classList.toggle('active', state.theme === 'light');
    }
  }

  attachListeners() {
    this.container.querySelector('#edit-profile-btn')?.addEventListener('click', () => {
        const currentName = state.user?.displayName || '';
        const bloodType = state.userProfile?.profile?.bloodType || 'O+';
        const myPhone = state.userProfile?.profile?.phone || '';
        const dob = state.userProfile?.profile?.dob || '';
        const emName = state.userProfile?.profile?.emergencyName || '';
        const emPhone = state.userProfile?.profile?.emergencyPhone || '';
        
        const modalHtml = `
          <div id="profile-modal" class="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div class="bg-[var(--color-surface-elevated)]/60 backdrop-blur-2xl border border-[var(--color-border)] rounded-[2rem] p-6 w-full max-w-sm shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
              <h2 class="text-xl font-display text-[var(--color-text-primary)] mb-6">Edit Identity</h2>
              <div class="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                <div>
                  <label class="text-xs text-[var(--color-text-secondary)] uppercase tracking-widest font-bold ml-2 mb-1 block">Display Name</label>
                  <input type="text" id="prof-name" value="${currentName}" class="w-full bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[#ffb88c]/50">
                </div>
                <div>
                  <label class="text-xs text-[var(--color-text-secondary)] uppercase tracking-widest font-bold ml-2 mb-1 block">Phone (E.164)</label>
                  <input type="tel" id="prof-phone" value="${myPhone}" placeholder="+1234567890" class="w-full bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[#ffb88c]/50">
                </div>
                <div>
                  <label class="text-xs text-[var(--color-text-secondary)] uppercase tracking-widest font-bold ml-2 mb-1 block">Date of Birth</label>
                  <input type="date" id="prof-dob" value="${dob}" class="w-full bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-[var(--color-text-primary)] text-sm [color-scheme:dark] focus:outline-none focus:border-[#ffb88c]/50">
                </div>
                <div>
                  <label class="text-xs text-[var(--color-text-secondary)] uppercase tracking-widest font-bold ml-2 mb-1 block">Blood Type</label>
                  <select id="prof-blood" class="w-full bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[#ffb88c]/50">
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
                <div>
                  <label class="text-xs text-[var(--color-text-secondary)] uppercase tracking-widest font-bold ml-2 mb-1 block">Emergency Contact Name</label>
                  <input type="text" id="prof-em-name" value="${emName}" class="w-full bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[#ffb88c]/50">
                </div>
                <div>
                  <label class="text-xs text-[var(--color-text-secondary)] uppercase tracking-widest font-bold ml-2 mb-1 block">Emergency Phone (E.164)</label>
                  <input type="tel" id="prof-em-phone" value="${emPhone}" placeholder="+1234567890" class="w-full bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[#ffb88c]/50">
                </div>
              </div>
              <div class="flex gap-3 mt-8">
                <button id="prof-cancel" class="flex-1 py-3.5 rounded-xl border border-[#7f2f5d]/50 text-[var(--color-text-secondary)] font-bold uppercase text-xs tracking-widest hover:bg-white/5 transition-colors">Cancel</button>
                <button id="prof-save" class="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#7f2f5d] to-[#ca5229] text-[var(--color-text-primary)] font-bold uppercase text-xs tracking-widest shadow-lg shadow-[#ca5229]/20 active:scale-95 transition-transform">Save</button>
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
            const newPhone = document.getElementById('prof-phone').value.trim();
            const newDob = document.getElementById('prof-dob').value;
            const newEmName = document.getElementById('prof-em-name').value.trim();
            const newEmPhone = document.getElementById('prof-em-phone').value.trim();
            
            const phoneRegex = /^\+?[1-9]\d{1,14}$/;
            if (newPhone && !phoneRegex.test(newPhone)) {
                showToast('Invalid Phone: Must be E.164 format', 'error');
                return;
            }
            if (newEmPhone && !phoneRegex.test(newEmPhone)) {
                showToast('Invalid Emergency Phone: Must be E.164 format', 'error');
                return;
            }
            
            if (newName) {
                const profile = await db.userProfile.get({ key: 'profile' }) || { key: 'profile', data: {} };
                profile.data = { ...profile.data, name: newName, bloodType: newBlood, phone: newPhone, dob: newDob, emergencyName: newEmName, emergencyPhone: newEmPhone };
                await db.userProfile.put(profile);
                
                if (state.user) state.user.displayName = newName;
                if (!state.userProfile) state.userProfile = { profile: {} };
                Object.assign(state.userProfile.profile, { bloodType: newBlood, phone: newPhone, dob: newDob, emergencyName: newEmName, emergencyPhone: newEmPhone });
                
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

    this.container.querySelector('#delete-account-btn')?.addEventListener('click', async () => {
      if (confirm('CRITICAL WARNING: This will permanently delete your account, wipe all local data, and remove your cloud backups. This cannot be undone. Type "PURGE" in the next prompt to confirm.')) {
         const validation = prompt('Type PURGE to confirm deletion:');
         if (validation === 'PURGE') {
             const { auth } = await import('../core/firebase.js');
             const user = auth.currentUser;
             if (user) {
                 try {
                     await user.delete();
                     await db.delete();
                     window.location.hash = '#/register';
                     window.location.reload();
                 } catch (err) {
                     if (err.code === 'auth/requires-recent-login') {
                         alert('Security Policy: You must re-authenticate to delete your account. Please log out, log back in, and try again.');
                     } else {
                         alert('Failed to delete account: ' + err.message);
                     }
                 }
             } else {
                 await db.delete();
                 window.location.hash = '#/register';
                 window.location.reload();
             }
         }
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
                    if (this._showToast) showToast("SOS Broadcast failed. No primary contact number found.", 'error');
                }
            };

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'MEDICAL EMERGENCY',
                        text: msg
                    });
                    if (this._showToast) showToast("SOS Broadcast successful.", 'success');
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
        if (t.id === 'theme-toggle') {
          state.toggleTheme();
          t.classList.toggle('active', state.theme === 'light');
          return;
        }

        const setting = t.dataset.setting;
        const wantsActive = !t.classList.contains('active');

        if (setting === 'notifications' && wantsActive) {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            showToast('Notification permission was denied.');
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

