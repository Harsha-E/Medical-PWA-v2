import db from '../core/db.js';
import state from '../core/state.js';
import { showToast } from '../core/ui.js';
import { escapeHTML } from '../core/utils.js';
import app from '../app.js';

export default class FamilyProfilesView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';

    // Note: Since userId is not indexed in the v2 schema for the 'family' store,
    // we use filter() instead of where() to avoid Dexie index exceptions.
    const family = await db.family.filter(f => f.userId === state.user?.uid).toArray();

    this.container.innerHTML = `
      <main class="scroll-area pt-[112px] md:pt-8" style="padding-left:0; padding-right:0;">
<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">
        <div class="grid grid-cols-1 gap-8 mt-4">
            ${family.map(member => `
              <div class="clay-glass-panel p-8 flex flex-col items-center text-center shadow-xl shadow-card-shadow">
                  <div class="w-24 h-24 bg-text-primary text-surface rounded-4xl flex items-center justify-center font-display text-4xl italic mb-6 shadow-xl">
                    ${member.name ? escapeHTML(member.name)[0].toUpperCase() : '?'}
                  </div>
                  <h3 class="font-bold text-xl leading-none">${escapeHTML(member.name)}</h3>
                  <p class="text-xs text-uppercase font-bold text-primary tracking-widest mt-2 uppercase">${escapeHTML(member.relation) || 'Unknown'} &bull; DOB: ${escapeHTML(member.dob) || 'Unknown'}</p>
                  ${member.conditions ? `<p class="text-xs text-muted mt-3 max-w-[90%] mx-auto">Conditions: ${escapeHTML(member.conditions)}</p>` : ''}
                  <div class="flex gap-3 mt-8 w-full">
                      <a href="#/medical-history?familyId=${member.id}" class="flex-1 py-3 bg-surface-deep text-text-primary border border-border rounded-xl text-xs uppercase font-bold tracking-widest active:scale-95 transition-all text-center">Records</a>
                      <a href="#/medications?familyId=${member.id}" class="flex-1 py-3 bg-surface-deep text-text-primary border border-border rounded-xl text-xs uppercase font-bold tracking-widest active:scale-95 transition-all text-center">Prescriptions</a>
                  </div>
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

  _showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-mono uppercase tracking-widest z-[99999] shadow-xl transition-all ${type === 'error' ? 'bg-red-900/80 border border-red-500/40 text-red-200' : 'bg-success/10 border border-success/30 text-success'}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  attachListeners() {
    this.container.querySelector('#add-family-member')?.addEventListener('click', () => this.showAddModal());
    app.appHeader.on('add-family', () => this.showAddModal());
  }

  showAddModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-overlay-bg backdrop-blur-sm p-6';
    modal.innerHTML = `
      <div class="bg-surface-elevated border border-border p-8 rounded-3xl max-w-sm w-full shadow-2xl">
        <h3 class="text-lg font-display text-text-primary mb-6">Add Dependent</h3>
        <form id="add-family-form" class="space-y-4">
          <div>
            <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Name</label>
            <input type="text" id="f-name" required class="w-full px-4 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
          </div>
          <div>
            <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Relation</label>
            <select id="f-relation" required class="w-full px-4 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
              <option value="Child" class="bg-surface">Child</option>
              <option value="Parent" class="bg-surface">Parent</option>
              <option value="Spouse" class="bg-surface">Spouse</option>
              <option value="Other" class="bg-surface">Other</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Date of Birth</label>
            <input type="date" id="f-dob" required class="w-full px-4 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2[color-scheme:dark]">
          </div>
          <div>
            <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Known Allergies/Conditions</label>
            <textarea id="f-conditions" rows="2" class="w-full px-4 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2" placeholder="Optional"></textarea>
          </div>
          <div class="flex gap-3 mt-8">
            <button type="button" id="cancel-family" class="flex-1 py-3 rounded-xl text-text-primary text-xs uppercase font-bold tracking-widest transition-colors btn-neumorphic">Cancel</button>
            <button type="submit" class="flex-1 py-3 rounded-xl btn-neumorphic-primary -dark border  text-accent-bright text-xs uppercase font-bold tracking-widest hover:brightness-125 transition-all".replace(/s+/g, ' ').trim()>Save Node</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#cancel-family').onclick = () => modal.remove();
    modal.querySelector('#add-family-form').onsubmit = async (e) => {
      e.preventDefault();
      const name = modal.querySelector('#f-name').value.trim();
      const relation = modal.querySelector('#f-relation').value;
      const dob = modal.querySelector('#f-dob').value;
      const conditions = modal.querySelector('#f-conditions').value.trim();
      
      await db.family.add({ name, relation, dob, conditions, userId: state.user.uid });
      modal.remove();
      
      // Hard re-render to update the view seamlessly
      const fresh = new FamilyProfilesView();
      const content = await fresh.render();
      this.container.replaceWith(content);
    };
  }

  destroy() {}
}

