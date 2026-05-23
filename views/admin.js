import { db, auth } from '../core/firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export default class AdminView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';

    // Role guard
    const user = auth.currentUser;
    if (!user) {
      window.location.hash = '#/login';
      return this.container;
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const role = userDoc.exists() ? userDoc.data().role : 'user';
    if (role !== 'admin') {
      this.container.innerHTML = `
        <div class="h-screen flex flex-col items-center justify-center px-8 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="1.5" class="mb-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <h2 class="text-2xl font-display italic mb-2">Access Denied</h2>
          <p class="text-xs text-muted">Administrator privilege required.</p>
          <button onclick="history.back()" class="btn-primary mt-8 px-8">Go Back</button>
        </div>`;
      return this.container;
    }

    this.container.innerHTML = `
      <header class="view-header">
        <button class="back-btn" onclick="history.back()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div class="flex flex-col items-center">
          <span class="text-[10px] text-muted uppercase tracking-widest leading-none">Super-User Console</span>
          <h1 class="text-lg font-display mt-1 leading-none">Admin Portal</h1>
        </div>
        <div style="width:44px"></div>
      </header>

      <main class="scroll-area px-6 pt-28 pb-12">
        <div class="grid grid-cols-2 gap-4 mb-10">
          <div class="glass-panel p-5">
            <span class="text-[10px] font-bold text-muted uppercase tracking-widest block mb-2">Total Users</span>
            <p class="text-3xl font-display text-primary" id="user-count">...</p>
          </div>
          <div class="glass-panel p-5">
            <span class="text-[10px] font-bold text-muted uppercase tracking-widest block mb-2">Medications</span>
            <p class="text-3xl font-display text-blue-500" id="med-count">...</p>
          </div>
        </div>

        <section>
          <h2 class="text-[10px] text-muted font-bold mb-6 tracking-[0.2em] px-1 uppercase">User Registry</h2>
          <div id="user-list" class="space-y-4">
            <p class="text-xs text-muted italic">Loading...</p>
          </div>
        </section>
      </main>
    `;

    this.loadData();
    return this.container;
  }

  async loadData() {
    try {
      const [userSnap, medSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'medications'))
      ]);

      this.container.querySelector('#user-count').textContent = userSnap.size;
      this.container.querySelector('#med-count').textContent = medSnap.size;

      const list = this.container.querySelector('#user-list');
      if (userSnap.empty) {
        list.innerHTML = '<p class="text-xs text-muted italic">No users found.</p>';
        return;
      }
      list.innerHTML = userSnap.docs.map(d => {
        const u = d.data();
        return `
          <div class="glass-panel p-4 flex justify-between items-center bg-white">
            <div>
              <p class="font-bold text-sm leading-none">${u.name || 'Unknown'}</p>
              <p class="text-[10px] text-muted mt-1 uppercase tracking-tighter">${u.email || ''}</p>
            </div>
            <span class="text-[9px] font-bold px-2 py-1 bg-primary/10 text-primary rounded-lg uppercase tracking-widest">${u.role || 'user'}</span>
          </div>`;
      }).join('');
    } catch (e) {
      console.error(e);
      this.container.querySelector('#user-list').innerHTML = `<p class="text-xs text-red-500">Access Denied: ${e.message}</p>`;
    }
  }
}