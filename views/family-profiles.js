import db from '../core/db.js';
import state from '../core/state.js';

export default class FamilyProfilesView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';

    // Note: Since userId is not indexed in the v2 schema for the 'family' store,
    // we use filter() instead of where() to avoid Dexie index exceptions.
    const family = await db.family.filter(f => f.userId === state.user?.uid).toArray();

    this.container.innerHTML = `
      <header class="view-header px-6">
        <div class="flex flex-col">
          <span class="text-[10px] text-uppercase text-muted uppercase tracking-widest leading-none">Social Graph</span>
          <h1 class="text-xl font-display mt-1 leading-none">Network Nodes</h1>
        </div>
        <button id="add-family-btn" class="bg-primary text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-200 active:scale-90 transition-transform">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="18" y2="12"/></svg>
        </button>
      </header>

      <main class="scroll-area px-6 pt-28">
        <div class="grid grid-cols-1 gap-8 mt-4">
            ${family.map(member => `
              <div class="glass-panel p-8 flex flex-col items-center text-center shadow-xl shadow-gray-100/50">
                  <div class="w-24 h-24 bg-text-primary text-white rounded-4xl flex items-center justify-center font-display text-4xl italic mb-6 shadow-xl">
                    ${member.name ? member.name[0].toUpperCase() : '?'}
                  </div>
                  <h3 class="font-bold text-xl leading-none">${member.name}</h3>
                  <p class="text-[10px] text-uppercase font-bold text-primary tracking-widest mt-2 uppercase">${member.relation || 'Unknown'} &bull; DOB: ${member.dob || 'Unknown'}</p>
                  ${member.conditions ? `<p class="text-[10px] text-muted mt-3 max-w-[90%] mx-auto">Conditions: ${member.conditions}</p>` : ''}
                  <div class="flex gap-3 mt-8 w-full">
                      <button class="flex-1 py-3 bg-white border border-border rounded-xl text-[9px] uppercase font-bold tracking-widest active:scale-95 transition-all">Records</button>
                      <button class="flex-1 py-3 bg-white border border-border rounded-xl text-[9px] uppercase font-bold tracking-widest active:scale-95 transition-all">Prescriptions</button>
                  </div>
              </div>
            `).join('')}

            ${family.length === 0 ? `
              <div class="glass-panel p-8 flex flex-col items-center justify-center text-center opacity-60 border-dashed">
                 <div class="w-14 h-14 bg-border/20 rounded-2xl flex items-center justify-center mb-4 text-primary">
                     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                 </div>
                 <p class="text-[10px] uppercase font-bold text-muted tracking-widest leading-relaxed">Add a dependent or family member to manage their proxy records.</p>
              </div>
            ` : ''}

            <div id="add-family-member" class="glass-panel p-8 flex flex-col items-center justify-center text-center opacity-60 border-dashed hover:opacity-100 transition-opacity cursor-pointer">
                 <div class="w-14 h-14 bg-border/20 rounded-2xl flex items-center justify-center mb-4">
                     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                 </div>
                 <p class="text-[10px] uppercase font-bold text-muted tracking-widest">Connect New Node</p>
            </div>
        </div>
      </main>

      <style>
        .view-header { position: fixed; top: 0; left: 0; right: 0; height: 80px; background: rgba(250, 249, 246, 0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; z-index: 100; }
      </style>
    `;

    this.attachListeners();
    return this.container;
  }

  _showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-mono uppercase tracking-widest z-[99999] shadow-xl transition-all ${type === 'error' ? 'bg-red-900/80 border border-red-500/40 text-red-200' : 'bg-[#00ff7f]/10 border border-[#00ff7f]/30 text-[#00ff7f]'}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  attachListeners() {
    this.container.querySelector('#add-family-member')?.addEventListener('click', () => this.showAddModal());
    this.container.querySelector('#add-family-btn')?.addEventListener('click', () => this.showAddModal());
  }

  showAddModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6';
    modal.innerHTML = `
      <div class="bg-[#1a0a12] border border-[#7f2f5d]/50 p-8 rounded-3xl max-w-sm w-full shadow-2xl">
        <h3 class="text-lg font-display text-white mb-6">Add Dependent</h3>
        <form id="add-family-form" class="space-y-4">
          <div>
            <label class="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 ml-1">Name</label>
            <input type="text" id="f-name" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none">
          </div>
          <div>
            <label class="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 ml-1">Relation</label>
            <select id="f-relation" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none appearance-none">
              <option value="Child" class="bg-[#0a0407]">Child</option>
              <option value="Parent" class="bg-[#0a0407]">Parent</option>
              <option value="Spouse" class="bg-[#0a0407]">Spouse</option>
              <option value="Other" class="bg-[#0a0407]">Other</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 ml-1">Date of Birth</label>
            <input type="date" id="f-dob" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none [color-scheme:dark]">
          </div>
          <div>
            <label class="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 ml-1">Known Allergies/Conditions</label>
            <textarea id="f-conditions" rows="2" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none placeholder:text-gray-600" placeholder="Optional"></textarea>
          </div>
          <div class="flex gap-3 mt-8">
            <button type="button" id="cancel-family" class="flex-1 py-3 rounded-xl border border-[#7f2f5d]/50 text-white text-[10px] uppercase font-bold tracking-widest hover:bg-white/5 transition-colors">Cancel</button>
            <button type="submit" class="flex-1 py-3 rounded-xl bg-linear-to-r from-[#7f2f5d] to-[#4a1532] border border-[#ffb88c]/30 text-[#ffd9b5] text-[10px] uppercase font-bold tracking-widest hover:brightness-125 transition-all">Save Node</button>
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