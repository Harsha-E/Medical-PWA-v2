import state from '../core/state.js';
import db from '../core/db.js';
import { APP_VERSION } from '../core/config.js';
import { showToast, appAlert, appConfirm, appPrompt, setupPullToRefresh } from '../core/ui.js';
import { explainabilityMode } from '../visualization/ExplainabilityMode.js';
import CanonicalContextBuilder from '../core/CanonicalContextBuilder.js';
export default class SettingsView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container overflow-hidden h-full flex flex-col relative';
    this.container.innerHTML = `
      <main class="scroll-area pt-24 md:pt-8 md:px-8 bg-transparent pb-40">
        <div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">
          <div class="skeleton skeleton-xl mb-8" style="height:120px;"></div>
          <div class="skeleton skeleton-card mb-6" style="height:160px;"></div>
        </div>
      </main>
    `;

    this._loadSettingsData();
    return this.container;
  }

  async _loadSettingsData() {
    const displayName = state.user?.displayName || state.userProfile?.name || state.user?.email || 'Unknown User';
    const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    const bloodType = state.userProfile?.profile?.bloodType || 'O+';
    const avatarUrl = state.userProfile?.profile?.avatar;
    
    // Compute dynamic health profile completion status
    const medications = await db.medications.filter(m => !m.isDeleted).toArray();
    const completeness = CanonicalContextBuilder.calculateCompleteness(state.userProfile, medications);
    const lastUpdateDate = state.userProfile?.lastClinicalUpdate ? new Date(state.userProfile.lastClinicalUpdate).toLocaleDateString() : 'Never';

    this.container.innerHTML = `
      <main class="scroll-area pt-24 md:pt-8 md:px-8 bg-transparent pb-40" >
<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">
        <div class="clay-glass-panel p-8 mb-10 flex items-center gap-4 shadow-[0_8px_32px_var(--color-card-shadow)] border-border backdrop-blur-xl relative z-10">
          <a href="#/avatar-setup" class="w-20 h-20 rounded-full flex items-center justify-center font-display italic text-3xl font-bold shadow-[0_0_20px_var(--color-primary)] border border-accent-primary/40 bg-gradient-to-br from-primary/80 to-secondary/80 text-accent-bright backdrop-blur-md shrink-0 ring-4 ring-surface-elevated/50 hover:scale-105 transition-transform overflow-hidden relative group">
            ${avatarUrl 
              ? `<img src="${avatarUrl}" class="w-full h-full object-cover scale-[1.15] translate-y-[8%]" alt="Avatar">` 
              : `${initials}`}
            <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-white"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </div>
          </a>
          <a href="#/emergency" class="flex-1 block min-w-0 hover:opacity-80 transition-opacity pl-2">
            <p class="font-bold text-xl leading-tight text-text-primary truncate">${displayName}</p>
            <p class="text-xs text-text-muted mt-1 truncate">${state.user?.email || 'No email linked'}</p>
            <p class="text-sm text-text-secondary mt-1 truncate">${state.userProfile?.profile?.phone || 'Phone not set'}</p>
            <p class="text-[10px] font-bold text-accent-primary mt-2 tracking-widest uppercase truncate">${bloodType} Clinical Node</p>
          </a>
          <a href="#/onboarding" id="edit-profile-btn" class="shrink-0 p-3 rounded-2xl active:scale-90 transition-all text-text-primary backdrop-blur-md relative z-20 btn-neumorphic flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </a>
        </div>

        <!-- Clinical Profile Health Card -->
        <section class="mb-10">
          <h3 class="text-xs text-uppercase font-bold text-accent-primary/70 mb-4 tracking-[0.2em] px-1">Clinical Profile Health Card</h3>
          <div class="clay-glass-panel p-6 border border-border bg-surface-elevated/40 backdrop-blur-xl shadow-[0_8px_32px_var(--color-card-shadow)] rounded-2xl">
            <div class="flex justify-between items-center mb-4">
              <div>
                <h4 class="font-bold text-base text-text-primary">Clinical Readiness Score</h4>
                <p class="text-xs text-text-muted">Last Updated: ${lastUpdateDate}</p>
              </div>
              <div class="px-3 py-1.5 rounded-xl bg-primary/20 text-primary border border-primary/30 font-mono font-bold text-sm">
                ${completeness.overallPercentage}%
              </div>
            </div>
            
            <div class="space-y-3 mb-6 font-mono text-xs">
              <div class="flex justify-between items-center p-3 rounded-xl bg-surface/50 border border-border">
                <span class="text-text-primary">${completeness.identity.label}</span>
                <span class="${completeness.identity.complete ? 'text-green-400 font-bold' : 'text-amber-400 font-bold'}">${completeness.identity.complete ? '✅ Complete' : '⚠️ Incomplete'}</span>
              </div>
              <div class="flex justify-between items-center p-3 rounded-xl bg-surface/50 border border-border">
                <span class="text-text-primary">${completeness.medical.label}</span>
                <span class="${completeness.medical.complete ? 'text-green-400 font-bold' : 'text-amber-400 font-bold'}">${completeness.medical.complete ? '✅ Complete' : '⚠️ Missing Organ Status'}</span>
              </div>
              <div class="flex justify-between items-center p-3 rounded-xl bg-surface/50 border border-border">
                <span class="text-text-primary">${completeness.lifestyle.label}</span>
                <span class="${completeness.lifestyle.complete ? 'text-green-400 font-bold' : 'text-amber-400 font-bold'}">${completeness.lifestyle.complete ? '✅ Complete' : '⚠️ Missing Lifestyle'}</span>
              </div>
              <div class="flex justify-between items-center p-3 rounded-xl bg-surface/50 border border-border">
                <span class="text-text-primary">${completeness.emergency.label}</span>
                <span class="${completeness.emergency.complete ? 'text-green-400 font-bold' : 'text-amber-400 font-bold'}">${completeness.emergency.complete ? '✅ Complete' : '⚠️ Incomplete'}</span>
              </div>
              <div class="flex justify-between items-center p-3 rounded-xl bg-surface/50 border border-border">
                <span class="text-text-primary">${completeness.medications.label}</span>
                <span class="${completeness.medications.complete ? 'text-green-400 font-bold' : 'text-amber-400 font-bold'}">${completeness.medications.complete ? '✅ Complete' : '⚠️ Empty List'}</span>
              </div>
            </div>

            <a href="#/onboarding" class="w-full py-4 rounded-xl bg-gradient-to-r from-primary/20 to-surface-elevated text-primary font-bold text-xs uppercase tracking-widest border border-primary/20 hover:border-primary/40 flex items-center justify-center gap-2 block text-center">
              Review & Update Profile
            </a>
          </div>
        </section>
          <div class="clay-glass-panel overflow-hidden border border-border bg-surface-elevated/40 backdrop-blur-xl shadow-[0_8px_32px_var(--color-card-shadow)] rounded-2xl">
            <div class="settings-row text-text-primary">
              <span class="text-sm font-medium">Push Notifications</span>
              <div class="toggle" data-setting="notifications"></div>
            </div>
            <div class="settings-row border-t border-border text-text-primary">
              <span class="text-sm font-medium">Refill Telemetry</span>
              <div class="toggle" data-setting="refills"></div>
            </div>

          </div>
        </section>


        

        <section class="mb-10">
          <h3 class="text-xs text-uppercase font-bold text-accent-primary/70 mb-4 tracking-[0.2em] px-1">Data Architecture</h3>
          <div class="clay-glass-panel overflow-hidden border border-border bg-surface-elevated/40 backdrop-blur-xl shadow-[0_8px_32px_var(--color-card-shadow)] rounded-2xl flex flex-col">
            <button class="flex items-center justify-between w-full px-5 py-4 bg-transparent border-none hover:bg-primary/10 transition-colors active:bg-primary/20" id="logout-btn">
              <span class="text-sm font-bold tracking-wide text-primary uppercase">Terminate Session</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="text-primary opacity-80" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
            <button class="flex items-center justify-between w-full px-5 py-4 bg-transparent border-none border-t border-red-500/30 hover:bg-red-500/10 transition-colors active:bg-red-500/20" id="delete-account-btn">
              <span class="text-sm font-bold tracking-wide text-danger uppercase">Purge Data & Delete Account</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="text-danger opacity-80" stroke-width="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </section>

        <div class="app-info text-center py-10 opacity-30">
          <p class="text-[8px] text-uppercase font-bold tracking-[0.4em] text-accent-primary">MedCare Precision Environment &bull; v${APP_VERSION}</p>
        </div>
      </div></main>

      <style>
        .settings-row { display: flex; justify-content: space-between; align-items: center; padding: 20px; transition: background 0.2s ease; cursor: pointer; }
        .settings-row:active { background: var(--color-accent-soft); }
        .toggle { width: 36px; height: 20px; background: var(--color-input-bg); border: 1px solid var(--color-border); border-radius: 10px; position: relative; cursor: pointer; transition: background 0.2s; }
        .toggle::after { content: ''; position: absolute; left: 2px; top: 1px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: left 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .toggle.active { background: var(--color-primary); border-color: var(--color-primary); }
        .toggle.active::after { left: 18px; }
      </style>
    `;
    
    document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/settings' } }));

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
          <div id="profile-modal" class="fixed inset-0 z-[9999] bg-overlay-bg backdrop-blur-md flex items-center justify-center p-4">
            <div class="bg-surface-elevated/60 backdrop-blur-2xl border border-border rounded-[2rem] p-6 w-full max-w-sm shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
              <h2 class="text-xl font-display text-text-primary mb-6">Edit Identity</h2>
              <div class="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                <div>
                  <label class="text-xs text-text-secondary uppercase tracking-widest font-bold ml-2 mb-1 block">Display Name</label>
                  <input type="text" id="prof-name" value="${currentName}" class="w-full btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                </div>
                <div>
                  <label class="text-xs text-text-secondary uppercase tracking-widest font-bold ml-2 mb-1 block">Phone (E.164)</label>
                  <input type="tel" id="prof-phone" value="${myPhone}" placeholder="+1234567890" class="w-full btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                </div>
                <div>
                  <label class="text-xs text-text-secondary uppercase tracking-widest font-bold ml-2 mb-1 block">Date of Birth</label>
                  <input type="date" id="prof-dob" value="${dob}" class="w-full btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2[color-scheme:dark] focus:outline-none focus:border-accent-primary/50">
                </div>
                <div>
                  <label class="text-xs text-text-secondary uppercase tracking-widest font-bold ml-2 mb-1 block">Blood Type</label>
                  <select id="prof-blood" class="w-full btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
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
                  <label class="text-xs text-text-secondary uppercase tracking-widest font-bold ml-2 mb-1 block">Emergency Contact Name</label>
                  <input type="text" id="prof-em-name" value="${emName}" class="w-full btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                </div>
                <div>
                  <label class="text-xs text-text-secondary uppercase tracking-widest font-bold ml-2 mb-1 block">Emergency Phone (E.164)</label>
                  <input type="tel" id="prof-em-phone" value="${emPhone}" placeholder="+1234567890" class="w-full btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                </div>
              </div>
              <div class="flex gap-3 mt-8">
                <button id="prof-cancel" class="flex-1 py-3.5 rounded-xl text-text-secondary font-bold uppercase text-xs tracking-widest transition-colors btn-neumorphic">Cancel</button>
                <button id="prof-save" class="flex-1 py-3.5 rounded-xl btn-neumorphic-primary font-bold uppercase text-xs tracking-widest".replace(/s+/g, ' ').trim()>Save</button>
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
                state.userProfile.name = newName; // Ensure root name updates
                Object.assign(state.userProfile.profile, { name: newName, bloodType: newBlood, phone: newPhone, dob: newDob, emergencyName: newEmName, emergencyPhone: newEmPhone });
                
                // Sync to Firestore
                try {
                    const { db: firestoreDB, auth } = await import('../core/firebase.js');
                    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
                    if (auth.currentUser) {
                        await setDoc(doc(firestoreDB, 'users', auth.currentUser.uid), {
                            name: newName,
                            profile: state.userProfile.profile
                        }, { merge: true });
                    }
                } catch(e) {
                    console.error('Failed to sync profile to cloud', e);
                }
                
                div.remove();
                const oldContainer = this.container;
                const newHtml = await this.render();
                if (oldContainer && oldContainer.parentNode) {
                    oldContainer.parentNode.replaceChild(newHtml, oldContainer);
                }
            }
        };
    });


    this.container.querySelector('#logout-btn')?.addEventListener('click', async () => {
      const modalHtml = `
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface/80 backdrop-blur-md animate-fade-in" id="logout-modal">
          <div class="bg-surface-elevated border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
            <h2 class="text-xl font-bold text-text-primary mb-2">Terminate Session</h2>
            <p class="text-sm text-text-secondary mb-6">Are you sure you want to securely log out of your account?</p>
            <div class="flex gap-3">
              <button id="logout-cancel" class="flex-1 py-3 rounded-xl text-text-secondary font-bold uppercase text-xs tracking-widest transition-colors btn-neumorphic">Cancel</button>
              <button id="logout-confirm" class="flex-1 py-3 rounded-xl btn-neumorphic-primary font-bold uppercase text-xs tracking-widest".replace(/s+/g, ' ').trim()>Terminate</button>
            </div>
          </div>
        </div>
      `;
      const div = document.createElement('div');
      div.innerHTML = modalHtml;
      document.body.appendChild(div);

      document.getElementById('logout-cancel').onclick = () => div.remove();
      document.getElementById('logout-confirm').onclick = async () => {
        div.remove();
        const { auth } = await import('../core/firebase.js');
        await auth.signOut();
        window.location.hash = '#/login';
      };
    });

    this.container.querySelector('#delete-account-btn')?.addEventListener('click', async () => {
      if (await appConfirm('CRITICAL WARNING: This will permanently delete your account, wipe all local data, and remove your cloud backups. This cannot be undone. Type "PURGE" in the next prompt to confirm.', 'Critical Warning')) {
         const validation = await appPrompt('Type PURGE to confirm deletion:', 'Confirm Purge');
         if (validation === 'PURGE') {
             const { auth, db: firestoreDB } = await import('../core/firebase.js');
             const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
             const user = auth.currentUser;
             if (user) {
                    try {
                        const uid = user.uid;
                        const collectionsToPurge = [
                            'medications', 'doses', 'history', 'family', 'appointments',
                            'prescriptions', 'reminders', 'disease_ledger', 'attachments',
                            'interactions', 'allergies', 'surgeries', 'active_problems'
                        ];

                        const deleteBtn = document.getElementById('delete-account-btn');
                        if (deleteBtn) {
                            deleteBtn.innerHTML = '<span class="text-sm font-bold tracking-wide text-danger uppercase">Purging Cloud Data...</span>';
                            deleteBtn.disabled = true;
                        }

                        // 1. Delete Cloud Data FIRST (Subcollections)
                        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
                        for (const colName of collectionsToPurge) {
                            try {
                                const colRef = collection(firestoreDB, 'users', uid, colName);
                                const querySnapshot = await getDocs(colRef);
                                const deletePromises = [];
                                querySnapshot.forEach((documentSnap) => {
                                    deletePromises.push(deleteDoc(documentSnap.ref));
                                });
                                await Promise.all(deletePromises);
                            } catch (subErr) {
                                console.warn(`Could not delete subcollection ${colName}:`, subErr);
                            }
                        }

                        // 2. Delete Root User Document
                        try {
                            await deleteDoc(doc(firestoreDB, 'users', uid));
                        } catch (cloudErr) {
                            console.warn("Could not delete root cloud data:", cloudErr);
                        }

                        // 3. Wipe Service Worker Caches & Unregister
                        if (deleteBtn) deleteBtn.innerHTML = '<span class="text-sm font-bold tracking-wide text-danger uppercase">Wiping Local Caches...</span>';
                        if ('serviceWorker' in navigator) {
                            const regs = await navigator.serviceWorker.getRegistrations();
                            for(let reg of regs) { await reg.unregister(); }
                        }
                        if ('caches' in window) {
                            const keys = await caches.keys();
                            for(let key of keys) { await caches.delete(key); }
                        }
                        
                        // 4. Clear Storage
                        localStorage.clear();
                        sessionStorage.clear();

                        // 5. Delete Local IndexedDB Completely
                        if (deleteBtn) deleteBtn.innerHTML = '<span class="text-sm font-bold tracking-wide text-danger uppercase">Destroying Local Databases...</span>';
                        try {
                            if (db.isOpen()) {
                                db.close();
                            }
                            await db.delete();
                            
                            if (window.indexedDB && window.indexedDB.databases) {
                                const idbs = await window.indexedDB.databases();
                                for (const idb of idbs) {
                                    window.indexedDB.deleteDatabase(idb.name);
                                }
                            }
                        } catch (dbErr) {
                            console.warn("Could not delete IndexedDB immediately:", dbErr);
                        }

                        // 6. Delete Auth User and explicitly sign out
                        if (deleteBtn) deleteBtn.innerHTML = '<span class="text-sm font-bold tracking-wide text-danger uppercase">Terminating Auth Session...</span>';
                        await user.delete();
                        await auth.signOut();
                        
                        window.location.hash = '#/landing';
                        setTimeout(() => window.location.reload(), 100);
                   } catch (err) {
                       if (err.code === 'auth/requires-recent-login') {
                           await appAlert('Security Policy: You must re-authenticate to delete your account. Please log out, log back in, and try again.', 'Authentication Required');
                       } else {
                           await appAlert('Failed to delete account: ' + err.message, 'Error');
                       }
                   }
               } else {
                   // Wipe caches even if user is not authed
                   if ('serviceWorker' in navigator) {
                       const regs = await navigator.serviceWorker.getRegistrations();
                       for(let reg of regs) { await reg.unregister(); }
                   }
                   if ('caches' in window) {
                       const keys = await caches.keys();
                       for(let key of keys) { await caches.delete(key); }
                   }
                   await db.delete();
                 window.location.hash = '#/landing';
                 window.location.reload();
             }
         }
      }
    });

    this.container.querySelector('#sos-btn')?.addEventListener('click', async () => {
        if (await appConfirm('This will broadcast a high-priority distress signal. Proceed?', 'SOS Broadcast')) {
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


    this.container.querySelectorAll('.toggle:not(#theme-toggle)').forEach(t => {
      t.onclick = async () => {

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

