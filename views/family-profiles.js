import db from '../core/db.js';
import state from '../core/state.js';
import { showToast, setupPullToRefresh } from '../core/ui.js';
import { escapeHTML } from '../core/utils.js';
import app from '../app.js';
import AvatarSelector from '../components/AvatarSelector.js';

export default class FamilyProfilesView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';

    // Note: Since userId is not indexed in the v2 schema for the 'family' store,
    // we use filter() instead of where() to avoid Dexie index exceptions.
    const family = await db.family.filter(f => f.userId === state.user?.uid).toArray();

    this.container.innerHTML = `
      <main class="scroll-area pt-[112px] md:pt-8 md:pl-64 lg:pl-72 md:pt-8 md:pl-64 lg:pl-72 md:pt-8 md:pl-64" style="padding-left:0; padding-right:0;">
<div class="px-4 md:px-8 w-full h-full max-w-5xl mx-auto flex flex-col flex-1">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-4">
            ${family.map(member => `
              <div class="clay-glass-panel p-8 flex flex-col items-center text-center shadow-xl shadow-card-shadow cursor-pointer hover:scale-105 transition-transform" data-id="${member.id}">
                  ${member.avatarUrl 
                    ? `<div class="w-24 h-24 mb-6 shadow-xl rounded-full overflow-hidden border-2 border-border/50"><img src="${escapeHTML(member.avatarUrl)}" class="w-full h-full object-cover scale-[1.15] translate-y-[8%]"></div>` 
                    : `<div class="w-24 h-24 bg-text-primary text-surface rounded-4xl flex items-center justify-center font-display text-4xl italic mb-6 shadow-xl">${member.name ? escapeHTML(member.name)[0].toUpperCase() : '?'}</div>`
                  }
                  <h3 class="font-bold text-xl leading-none">${escapeHTML(member.name)}</h3>
                  <p class="text-xs text-uppercase font-bold text-primary tracking-widest mt-2 uppercase">${escapeHTML(member.relation) || 'Unknown'} &bull; DOB: ${escapeHTML(member.dob) || 'Unknown'}</p>
                  ${member.conditions ? `<p class="text-xs text-muted mt-3 max-w-[90%] mx-auto">Conditions: ${escapeHTML(member.conditions)}</p>` : ''}
              </div>
            `).join('')}

            ${family.length === 0 ? `
              <div class="clay-glass-panel p-8 flex flex-col items-center justify-center text-center opacity-60 border-dashed">
                 <div class="w-14 h-14 bg-border/20 rounded-2xl flex items-center justify-center mb-4 text-primary">
                     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                 </div>
                 <p class="text-xs uppercase font-bold text-muted tracking-widest leading-relaxed">Add a dependent or family member to manage their proxy records.</p>
              </div>
            ` : ''}

            <div id="add-family-member" class="clay-glass-panel p-8 flex flex-col items-center justify-center text-center opacity-60 border-dashed hover:opacity-100 transition-opacity cursor-pointer">
                 <div class="w-14 h-14 bg-border/20 rounded-2xl flex items-center justify-center mb-4">
                     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                 </div>
                 <p class="text-xs uppercase font-bold text-muted tracking-widest">Connect New Node</p>
            </div>
        </div>
      </div></main>

    `;

    this.attachListeners();
    return this.container;
  }



  attachListeners() {
    this.container.querySelector('#add-family-member')?.addEventListener('click', () => this.showAddModal());
    app.appHeader.on('add-family', () => this.showAddModal());

    const cards = this.container.querySelectorAll('.clay-glass-panel[data-id]');
    cards.forEach(card => {
      card.addEventListener('click', async () => {
        const id = card.getAttribute('data-id');
        const member = await db.family.get(parseInt(id, 10)); // ID is auto-increment integer
        if (member) {
          state.setActiveProfileContext(member);
          window.location.hash = '#/dashboard';
        }
      });
    });
  }

  showAddModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-overlay-bg backdrop-blur-sm p-6';
    modal.innerHTML = `
      <div class="bg-surface-elevated border border-border p-8 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col max-h-[90vh]">
        <h3 class="text-lg font-display text-text-primary mb-2">Add Dependent</h3>
        <div id="avatar-mount-point" class="mb-4 -mx-4 h-32 flex-shrink-0"></div>
        <form id="add-family-form" class="space-y-4 overflow-y-auto overflow-x-hidden p-1 scrollbar-hide">
          <div>
            <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Name</label>
            <input type="text" id="f-name" required class="w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
          </div>
          <div>
            <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Relation</label>
            <select id="f-relation" required class="w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
              <option value="Child" class="bg-surface">Child</option>
              <option value="Parent" class="bg-surface">Parent</option>
              <option value="Spouse" class="bg-surface">Spouse</option>
              <option value="Other" class="bg-surface">Other</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Date of Birth</label>
            <input type="date" id="f-dob" required class="w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2[color-scheme:dark]">
          </div>
          <div>
            <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Known Allergies/Conditions</label>
            <textarea id="f-conditions" rows="2" class="w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2" placeholder="Optional"></textarea>
          </div>
          <div class="flex gap-3 mt-8">
            <button type="button" id="cancel-family" class="flex-1 py-3 rounded-xl text-text-primary text-xs uppercase font-bold tracking-widest transition-colors btn-neumorphic">Cancel</button>
            <button type="submit" class="flex-1 py-3 rounded-xl btn-neumorphic-primary -dark border  text-accent-bright text-xs uppercase font-bold tracking-widest hover:brightness-125 transition-all".replace(/s+/g, ' ').trim()>Save Node</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    let selectedAvatar = null;
    const avatars = [
        '../assets/avatars/001-barista.png', '../assets/avatars/002-editor.png', '../assets/avatars/003-trainers.png',
        '../assets/avatars/004-woman.png', '../assets/avatars/005-teacher.png', '../assets/avatars/006-pastor.png',
        '../assets/avatars/007-muslim.png', '../assets/avatars/008-homeless.png', '../assets/avatars/009-butcher.png',
        '../assets/avatars/010-chinese.png', '../assets/avatars/011-coach.png', '../assets/avatars/012-designer.png',
        '../assets/avatars/013-doctor.png', '../assets/avatars/dad.png', '../assets/avatars/dancer.png',
        '../assets/avatars/graphic-designer.png', '../assets/avatars/man.png'
    ];
    
    const avatarSelector = new AvatarSelector({
        avatars,
        onChange: (url) => selectedAvatar = url
    });
    modal.querySelector('#avatar-mount-point').appendChild(avatarSelector.container);

    modal.querySelector('#cancel-family').onclick = () => {
        avatarSelector.destroy();
        modal.remove();
    };
    
    modal.querySelector('#add-family-form').onsubmit = async (e) => {
      e.preventDefault();
      const name = modal.querySelector('#f-name').value.trim();
      const relation = modal.querySelector('#f-relation').value;
      const dob = modal.querySelector('#f-dob').value;
      const conditions = modal.querySelector('#f-conditions').value.trim();
      
      await db.family.add({ name, relation, dob, conditions, avatarUrl: selectedAvatar, userId: state.user.uid });
      avatarSelector.destroy();
      modal.remove();
      
      // Hard re-render to update the view seamlessly
      const fresh = new FamilyProfilesView();
      const content = await fresh.render();
      this.container.replaceWith(content);
    };
  }

  destroy() {}
}

