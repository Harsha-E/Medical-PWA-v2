import db from '../core/db.js';
import state from '../core/state.js';

export default class DashboardView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';

    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';

    // Declarations for dataset targets
    let meds = [], appts = [], familyCount = 0, historyCount = 0, allDoses = [];
    let databaseTimedOut = false;

    try {
      // Bundle queries inside an unblocked execution promise
      const localDataFetch = async () => {
        return {
          medications: await db.medications.toArray(),
          appointments: await db.appointments.toArray(),
          family: await db.family.count(),
          history: await db.history.count(),
          doses: await db.doses.toArray()
        };
      };

      // 1.5 Second Database lock fallback
      const localTimeout = new Promise(resolve => setTimeout(() => resolve(null), 1500));
      const dataset = await Promise.race([localDataFetch(), localTimeout]);

      if (dataset) {
        meds = dataset.medications;
        appts = dataset.appointments;
        familyCount = dataset.family;
        historyCount = dataset.history;
        allDoses = dataset.doses;
      } else {
        databaseTimedOut = true;
        console.warn('[Diagnostics] IndexedDB connection timed out. Rendering safety fallback layer.');
      }
    } catch (dbError) {
      console.error('[Diagnostics] Local ledger accessibility failure:', dbError);
    }

    const todayStr = now.toISOString().split('T')[0];
    const todayDoses = allDoses.filter(d => d.takenAt && d.takenAt.startsWith(todayStr));
    const takenIds = new Set(todayDoses.filter(d => d.status === 'taken' || !d.skipped).map(d => d.medicationId));

    const schedule = meds.flatMap(m => {
      const times = Array.isArray(m.times) ? m.times : ['08:00'];
      return times.map(t => {
        const [h, min] = t.split(':').map(Number);
        const d = new Date(); d.setHours(h, min, 0, 0);
        return {
          id: m.id, name: m.name, dosage: m.dosage,
          dosageUnit: m.dosageUnit || 'mg', time: t, date: d,
          taken: takenIds.has(m.id)
        };
      });
    }).sort((a, b) => a.date - b.date);

    const totalScheduled = schedule.length;
    const totalTaken = schedule.filter(d => d.taken).length;
    const adherence = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;

    appts.sort((a, b) => new Date(a.date) - new Date(b.date));
    const nextAppt = appts.find(a => new Date(a.date) >= now);
    const nextApptLabel = nextAppt
      ? new Date(nextAppt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
      : 'None';

    const displayName = state.user?.displayName?.split(' ')[0] || 'User';

    this.container.innerHTML = `
      <header class="view-header">
        <div class="flex flex-col">
          <span class="text-[10px] text-muted uppercase tracking-widest leading-none">Diagnostic Deck</span>
          <h1 class="text-xl font-display mt-1 leading-none">Good ${greeting}, ${displayName}</h1>
        </div>
        <button class="w-11 h-11 rounded-xl flex items-center justify-center bg-white border border-border shadow-sm active:scale-95 transition-transform">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </button>
      </header>

      <main class="scroll-area px-6 pt-28 relative overflow-hidden" id="dashboard-main">
        <div class="absolute inset-0 pointer-events-none -z-10 opacity-40">
          <div class="fluid-gradient fluid-1"></div>
          <div class="fluid-gradient fluid-2"></div>
          <div class="fluid-gradient fluid-3"></div>
        </div>

        ${databaseTimedOut ? `
          <div class="glass-panel p-4 mb-6 border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs rounded-xl flex items-center gap-3">
            <svg class="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
            <p>Local cache is expanding schema indices. Data content may temporarily appear unpopulated until cross-tab sync stabilizes.</p>
          </div>
        ` : ''}

        <section class="mb-10">
          <h2 class="text-[10px] text-muted font-bold mb-6 tracking-[0.2em] px-1 uppercase">Active Pharmacopoeia</h2>
          <div class="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
            ${meds.length > 0 ? meds.map(m => `
              <div class="glass-panel p-5 min-w-37.5 flex flex-col justify-between shrink-0 shadow-xl shadow-gray-100/50 cursor-pointer" data-action="edit-med" data-id="${m.id}">
                <div class="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5"><path d="M10.5 3.5a2.121 2.121 0 0 1 3 0l7 7a2.121 2.121 0 0 1 0 3l-7 7a2.121 2.121 0 0 1-3 0l-7-7a2.121 2.121 0 0 1 0-3l7-7Z"/><path d="m8.5 15.5 7-7"/></svg>
                </div>
                <div>
                  <p class="text-sm font-bold leading-tight">${m.name}</p>
                  <p class="text-[10px] text-muted mt-1 uppercase font-bold tracking-widest">${m.dosage}</p>
                </div>
              </div>
            `).join('') : `
              <div class="glass-panel p-8 w-full text-center">
                <p class="text-[10px] text-muted uppercase font-bold tracking-widest">No active medications.</p>
              </div>
            `}
            <div id="add-med-btn" class="glass-panel p-4 min-w-27.5 flex flex-col items-center justify-center shrink-0 border-dashed border-2 border-border cursor-pointer">
              <div class="w-10 h-10 rounded-full border border-border flex items-center justify-center mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <p class="text-[10px] text-muted uppercase font-bold tracking-widest text-center">New Agent</p>
            </div>
          </div>
        </section>

        <div class="glass-panel p-6 mb-10 shadow-xl shadow-gray-100/50">
          <div class="flex justify-between items-end mb-6">
            <div>
              <span class="text-[10px] font-bold text-muted uppercase tracking-widest">Compliance Analytics</span>
              <p class="text-4xl font-display text-primary mt-2">${adherence}% <span class="text-sm font-sans font-bold text-muted">Today</span></p>
            </div>
            <div class="text-right">
              <span class="text-[10px] font-bold text-muted uppercase tracking-widest">Status</span>
              <div class="flex items-center gap-2 mt-2">
                <div class="w-2 h-2 ${adherence >= 80 ? 'bg-success' : 'bg-warning'} rounded-full animate-pulse"></div>
                <p class="text-[10px] font-bold ${adherence >= 80 ? 'text-success' : 'text-warning'} uppercase tracking-widest">${adherence >= 80 ? 'Optimal' : 'Needs Attention'}</p>
              </div>
            </div>
          </div>
          <div class="w-full h-1.5 bg-border rounded-full overflow-hidden">
            <div class="h-full bg-primary transition-all duration-700" style="width: ${adherence}%"></div>
          </div>
        </div>

        <section class="mb-12">
          <div class="flex justify-between items-center mb-8 px-1">
            <h2 class="text-[10px] text-muted font-bold tracking-[0.2em] uppercase">Today's Schedule</h2>
            <span class="text-[10px] font-bold text-primary uppercase tracking-widest">${today}</span>
          </div>

          <div class="intervention-timeline">
            ${schedule.length > 0 ? schedule.map(dose => `
              <div class="timeline-entry">
                <div class="timeline-stem"></div>
                <div class="timeline-indicator-wrapper">
                  <div class="timeline-indicator ${dose.taken ? 'verified' : Math.abs(dose.date - now) < 3600000 ? 'imminent' : ''}">
                    <div class="indicator-inner"></div>
                  </div>
                </div>
                <div class="timeline-content ${dose.taken ? 'opacity-60' : ''}">
                  <div class="flex justify-between items-start mb-2">
                    <div>
                      <span class="text-[9px] font-bold text-primary/60 uppercase tracking-widest leading-none">${dose.time}</span>
                      <h3 class="text-lg font-display italic mt-1">${dose.name}</h3>
                    </div>
                    <span class="text-[10px] font-bold text-muted uppercase tracking-widest">${dose.dosage}</span>
                  </div>
                  ${dose.taken
                    ? `<div class="flex items-center gap-1.5 mt-3"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg><span class="text-[9px] font-bold text-success uppercase tracking-widest">Taken</span></div>`
                    : `<button class="confirm-dose-btn w-full mt-4 py-3 bg-white border border-border rounded-xl text-[9px] font-bold text-primary uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all shadow-sm active:scale-[0.98]" data-med-id="${dose.id}">Mark as Taken</button>`
                  }
                </div>
              </div>
            `).join('') : `
              <div class="py-12 text-center glass-panel">
                <p class="text-sm text-muted font-display italic opacity-50">No scheduled doses.</p>
                <button id="schedule-empty-add-btn" class="text-primary mt-2">Add a medication</button>
              </div>
            `}
          </div>
        </section>

        <section class="mb-12">
          <h2 class="text-[10px] text-muted font-bold mb-4 tracking-[0.2em] px-1 uppercase">Operational Modules</h2>
          <div class="grid grid-cols-2 gap-4">
            <div data-action="nav-appointments" class="glass-panel p-5 aspect-square flex flex-col justify-between cursor-pointer">
              <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <p class="text-xs font-bold">Appointments</p>
                <p class="text-[9px] text-muted leading-tight mt-1 uppercase font-bold tracking-widest">Next: ${nextApptLabel}</p>
              </div>
            </div>
            <div data-action="nav-history" class="glass-panel p-5 aspect-square flex flex-col justify-between cursor-pointer">
              <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div>
                <p class="text-xs font-bold">History</p>
                <p class="text-[9px] text-muted leading-tight mt-1 uppercase font-bold tracking-widest">${historyCount} Records</p>
              </div>
            </div>
            <div data-action="nav-family" class="glass-panel p-5 aspect-square flex flex-col justify-between cursor-pointer">
              <div class="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <p class="text-xs font-bold">Family</p>
                <p class="text-[9px] text-muted leading-tight mt-1 uppercase font-bold tracking-widest">${familyCount} Profiles</p>
              </div>
            </div>
            <div data-action="nav-emergency" class="glass-panel p-5 aspect-square flex flex-col justify-between cursor-pointer bg-red-600 border-none shadow-lg shadow-red-200">
              <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M11 2a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h5a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2h5a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5a2 2 0 0 1-2-2V4a2 2 0 0 0-2-2h-4Z"/></svg>
              </div>
              <div>
                <p class="text-xs font-bold text-white uppercase tracking-widest">Emergency</p>
                <p class="text-[9px] text-white/60 mt-1 uppercase font-bold tracking-widest">Health Card</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>
        .fluid-gradient { position:absolute; border-radius:50%; filter:blur(80px); mix-blend-mode:multiply; animation:float-fluid 20s infinite alternate cubic-bezier(0.45,0,0.55,1); }
        .fluid-1 { width:400px;height:400px;background:rgba(242,107,60,0.15);top:-100px;left:-100px; }
        .fluid-2 { width:300px;height:300px;background:rgba(176,224,230,0.2);bottom:10%;right:-50px;animation-delay:-5s; }
        .fluid-3 { width:250px;height:250px;background:rgba(255,255,255,0.3);top:30%;left:20%;animation-delay:-10s; }
        @keyframes float-fluid { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 33%{transform:translate(30px,-50px) rotate(120deg) scale(1.1)} 66%{transform:translate(-20px,20px) rotate(240deg) scale(0.9)} 100%{transform:translate(0,0) rotate(360deg) scale(1)} }
        .intervention-timeline { position:relative; padding-left:24px; }
        .timeline-entry { position:relative; padding-bottom:48px; }
        .timeline-entry:last-child { padding-bottom:0; }
        .timeline-stem { position:absolute;left:-11px;top:12px;bottom:0;width:2px;background:var(--color-border);opacity:0.5; }
        .timeline-entry:last-child .timeline-stem { display:none; }
        .timeline-indicator-wrapper { position:absolute;left:-24px;top:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center; }
        .timeline-indicator { width:10px;height:10px;border-radius:50%;background:var(--color-border);border:2px solid white;transition:all 0.4s; }
        .timeline-indicator.verified { background:var(--color-success);border-color:var(--color-success);box-shadow:0 0 0 4px rgba(16,185,129,0.1); }
        .timeline-indicator.imminent { background:var(--color-primary);border-color:white;box-shadow:0 0 0 6px rgba(242,107,60,0.15);transform:scale(1.2); }
        .timeline-content { padding-left:16px; }
      </style>
    `;

    this.attachListeners();
    return this.container;
  }

  attachListeners() {
    this.container.addEventListener('click', async (e) => {
      const btn = e.target.closest('.confirm-dose-btn');
      if (btn) {
        const id = parseInt(btn.dataset.medId);
        try {
          await db.doses.add({ medicationId: id, takenAt: new Date().toISOString(), status: 'taken', userId: state.user.uid });
          const fresh = new DashboardView();
          const content = await fresh.render();
          this.container.replaceWith(content);
        } catch (err) {
          console.error('[Dashboard] Error saving dose to IndexedDB:', err);
        }
        return;
      }

      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.dataset.action;
        if (action === 'edit-med') window.location.hash = `#/edit/${actionEl.dataset.id}`;
        else if (action === 'nav-appointments') window.location.hash = '#/appointments';
        else if (action === 'nav-history') window.location.hash = '#/history';
        else if (action === 'nav-family') window.location.hash = '#/family';
        else if (action === 'nav-emergency') window.location.hash = '#/emergency';
      }

      if (e.target.closest('#add-med-btn') || e.target.closest('#schedule-empty-add-btn')) {
        window.location.hash = '#/add';
      }
    });
  }

  destroy() {}
}