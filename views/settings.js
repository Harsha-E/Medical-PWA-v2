import state from '../core/state.js';
import db from '../core/db.js';

export default class SettingsView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';

    const displayName = state.user?.displayName || 'Harsha Edupuganti';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase() || 'HE';
    const bloodType = state.userProfile?.profile?.bloodType || 'O+';

    this.container.innerHTML = `
      <header class="view-header">
        <div class="flex flex-col">
            <span class="text-[10px] text-uppercase text-muted uppercase tracking-widest leading-none">Configuration</span>
            <h1 class="text-xl font-display mt-1 leading-none">System Profile</h1>
        </div>
      </header>

      <main class="scroll-area px-6 pt-28">
        <div class="glass-panel p-8 mb-12 flex items-center gap-6 shadow-xl shadow-gray-100/50">
          <div class="avatar-circle font-display italic text-3xl shadow-xl border-4 border-white/20">${initials}</div>
          <div class="flex-1">
            <p class="font-bold text-xl leading-tight">${displayName}</p>
            <p class="text-[10px] text-uppercase font-bold text-primary mt-2 tracking-widest uppercase">${bloodType} Clinical Node</p>
          </div>
          <button id="edit-profile-btn" class="bg-white p-3 rounded-2xl border border-border shadow-sm active:scale-90 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
        </div>

        <section class="mb-10">
          <h3 class="text-[10px] text-uppercase font-bold text-muted mb-4 tracking-[0.2em] px-1 uppercase">Visual Architecture</h3>
          <div class="glass-panel p-4 flex gap-4">
              <div id="theme-light" class="theme-option flex-1 p-4 rounded-xl border-2 border-primary bg-white flex flex-col items-center cursor-pointer">
                  <div class="w-10 h-10 rounded-full bg-border/20 mb-3"></div>
                  <p class="text-[10px] font-bold uppercase tracking-widest">Clinical Light</p>
              </div>
              <div id="theme-dark" class="theme-option flex-1 p-4 rounded-xl border border-border bg-gray-900 flex flex-col items-center opacity-40 cursor-pointer">
                  <div class="w-10 h-10 rounded-full bg-white/10 mb-3"></div>
                  <p class="text-[10px] font-bold uppercase tracking-widest text-white/60">Midnight Node</p>
              </div>
          </div>
        </section>

        <section class="mb-10">
          <h3 class="text-[10px] text-uppercase font-bold text-muted mb-4 tracking-[0.2em] px-1">Alerting Protocols</h3>
          <div class="glass-panel overflow-hidden">
            <div class="settings-row">
              <span class="text-sm font-medium">Push Notifications</span>
              <div class="toggle" data-setting="notifications"></div>
            </div>
            <div class="settings-row border-t border-border">
              <span class="text-sm font-medium">Refill Telemetry</span>
              <div class="toggle" data-setting="refills"></div>
            </div>
            <div class="settings-row border-t border-border">
              <span class="text-sm font-medium">Interaction Watchdog</span>
              <div class="toggle" data-setting="interactions"></div>
            </div>
          </div>
        </section>

        <section class="mb-10">
          <h3 class="text-[10px] text-uppercase font-bold text-muted mb-4 tracking-[0.2em] px-1">Data Architecture</h3>
          <div class="glass-panel overflow-hidden">
            <button class="settings-row w-full text-left bg-transparent border-none" id="logout-btn">
              <span class="text-sm font-medium text-red-500">Terminate Session</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </section>

        <div class="app-info text-center py-10 opacity-40">
          <p class="text-[8px] text-uppercase font-bold tracking-[0.4em]">MedCare Precision Environment &bull; v0.9.1</p>
        </div>
      </main>

      <style>
        .view-header { position: fixed; top: 0; left: 0; right: 0; height: 80px; background: rgba(250, 249, 246, 0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--color-border); display: flex; align-items: center; z-index: 100; }
        .avatar-circle { width: 64px; height: 64px; border-radius: var(--radius-lg); background: var(--color-text-primary); color: white; display: flex; align-items: center; justify-content: center; }
        .settings-row { display: flex; justify-content: space-between; align-items: center; padding: 20px; transition: background 0.2s ease; cursor: pointer; }
        .settings-row:active { background: rgba(0,0,0,0.02); }
        .toggle { width: 36px; height: 20px; background: #e5e7eb; border-radius: 10px; position: relative; cursor: pointer; transition: background 0.2s; }
        .toggle::after { content: ''; position: absolute; left: 2px; top: 2px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: left 0.2s; }
        .toggle.active { background: var(--color-primary); }
        .toggle.active::after { left: 18px; }
      </style>
    `;
    
    this.applyTheme();
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

  applyTheme() {
    const theme = localStorage.getItem('medcare-theme') || 'light';
    document.body.classList.toggle('dark-theme', theme === 'dark');
    this.updateThemeButtons(theme);
  }

  updateThemeButtons(theme) {
    const lightOption = this.container.querySelector('#theme-light');
    const darkOption = this.container.querySelector('#theme-dark');
    if (!lightOption || !darkOption) return;

    if (theme === 'dark') {
        lightOption.classList.add('opacity-40');
        lightOption.classList.remove('border-primary', 'bg-white');
        darkOption.classList.remove('opacity-40');
        darkOption.classList.add('border-primary');
    } else {
        darkOption.classList.add('opacity-40');
        darkOption.classList.remove('border-primary');
        lightOption.classList.remove('opacity-40');
        lightOption.classList.add('border-primary', 'bg-white');
    }
  }

  applyToggleStates() {
    this.container.querySelectorAll('.toggle').forEach(t => {
      const setting = t.dataset.setting;
      const isActive = localStorage.getItem(`setting-${setting}`) === 'true';
      t.classList.toggle('active', isActive);
    });
  }

  attachListeners() {
    this.container.querySelector('#edit-profile-btn')?.addEventListener('click', async () => {
        const currentName = state.user?.displayName || '';
        const newName = prompt("Enter new name:", currentName);
        if (newName && newName !== currentName) {
            const profile = await db.userProfile.get({ key: 'profile' }) || { key: 'profile' };
            profile.data = { ...profile.data, name: newName };
            await db.userProfile.put(profile);
            window.location.reload();
        }
    });

    this.container.querySelectorAll('.theme-option').forEach(el => {
      el.addEventListener('click', () => {
        const theme = el.id === 'theme-dark' ? 'dark' : 'light';
        localStorage.setItem('medcare-theme', theme);
        this.applyTheme();
      });
    });

    this.container.querySelector('#logout-btn')?.addEventListener('click', async () => {
      if (confirm('Terminate secure session?')) {
        const { auth } = await import('../core/firebase.js');
        await auth.signOut();
        window.location.hash = '#/login';
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