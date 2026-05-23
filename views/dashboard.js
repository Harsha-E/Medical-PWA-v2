import db from '../core/db.js';
import state from '../core/state.js';

export default class DashboardView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container !pt-0 !mt-0 h-full'; // Ensure no layout bleeding

    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';

    let meds = [], appts = [], familyCount = 0, historyCount = 0, allDoses = [];
    let databaseTimedOut = false;

    try {
      const localDataFetch = async () => {
        return {
          medications: await db.medications.toArray(),
          appointments: await db.appointments.toArray(),
          family: await db.family.count(),
          history: await db.history.count(),
          doses: await db.doses.toArray()
        };
      };

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
        console.warn('[Diagnostics] IndexedDB connection timed out.');
      }
    } catch (dbError) {
      console.error('[Diagnostics] Local ledger failure:', dbError);
    }

    const todayStr = now.toISOString().split('T')[0];
    const todayDoses = allDoses.filter(d => d.takenAt && d.takenAt.startsWith(todayStr));
    
    // FIX 1: Create a Composite Set of "ID-Time" to track specific slots
    const takenSlots = new Set(
      todayDoses
        .filter(d => d.status === 'taken' || !d.skipped)
        .map(d => `${d.medicationId}-${d.scheduledTime}`)
    );

    const schedule = meds.flatMap(m => {
      const times = Array.isArray(m.times) && m.times.length > 0 ? m.times : ['08:00'];
      return times.map(t => {
        const [h, min] = t.split(':').map(Number);
        const d = new Date(); d.setHours(h, min, 0, 0);
        return {
          id: m.id, name: m.name, dosage: m.dosage,
          dosageUnit: m.dosageUnit || 'mg', time: t, date: d,
          // FIX 2: Check the exact ID and Time combination
          taken: takenSlots.has(`${m.id}-${t}`)
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
      <header class="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-[#0a0407]/90 backdrop-blur-md border-b border-[#7f2f5d]/30 mb-6">
        <div class="flex flex-col">
          <span class="text-[10px] text-[#ffb88c] uppercase tracking-widest leading-none">Diagnostic Deck</span>
          <h1 class="text-xl font-bold text-white mt-1 leading-none">Good ${greeting}, ${displayName}</h1>
        </div>
      </header>

      <main class="scroll-area px-6 pb-28 relative overflow-hidden" id="dashboard-main">
        ${databaseTimedOut ? `
          <div class="glass-panel p-4 mb-6 border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs rounded-xl flex items-center gap-3">
            <svg class="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
            <p>Database is syncing background indices.</p>
          </div>
        ` : ''}

        <section class="mb-10">
          <h2 class="text-[10px] text-gray-400 font-bold mb-6 tracking-[0.2em] px-1 uppercase">Active Pharmacopoeia</h2>
          <div class="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
            ${meds.length > 0 ? meds.map(m => `
              <div class="bg-[#1a0a12]/80 backdrop-blur-md border border-[#7f2f5d]/40 rounded-3xl p-5 min-w-[150px] flex flex-col justify-between shrink-0 shadow-lg cursor-pointer hover:border-[#ffb88c]/50 transition-all" data-action="edit-med" data-id="${m.id}">
                <div class="w-10 h-10 rounded-2xl bg-[#7f2f5d]/20 border border-[#7f2f5d]/50 flex items-center justify-center mb-6">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffb88c" stroke-width="2.5"><path d="M10.5 3.5a2.121 2.121 0 0 1 3 0l7 7a2.121 2.121 0 0 1 0 3l-7 7a2.121 2.121 0 0 1-3 0l-7-7a2.121 2.121 0 0 1 0-3l7-7Z"/><path d="m8.5 15.5 7-7"/></svg>
                </div>
                <div>
                  <p class="text-sm font-bold text-white leading-tight">${m.name}</p>
                  <p class="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">${m.dosage} ${m.dosageUnit || 'mg'}</p>
                </div>
              </div>
            `).join('') : `
              <div class="bg-[#1a0a12]/50 border border-[#7f2f5d]/30 rounded-3xl p-8 w-full text-center">
                <p class="text-[10px] text-gray-500 uppercase font-bold tracking-widest">No active medications.</p>
              </div>
            `}
            <div id="add-med-btn" class="bg-[#0a0407] border-dashed border-2 border-[#7f2f5d]/50 rounded-3xl p-4 min-w-[110px] flex flex-col items-center justify-center shrink-0 cursor-pointer hover:bg-[#7f2f5d]/10 transition-colors">
              <div class="w-10 h-10 rounded-full border border-[#ffb88c]/40 flex items-center justify-center mb-3 text-[#ffb88c]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <p class="text-[10px] text-gray-400 uppercase font-bold tracking-widest text-center">New Agent</p>
            </div>
          </div>
        </section>

        <div data-action="nav-calendar" class="group relative bg-gradient-to-br from-[#1a0a12] to-[#0a0407] border border-[#7f2f5d]/40 rounded-[2rem] p-6 mb-10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden cursor-pointer hover:border-[#ffb88c]/50 transition-all duration-500">
          
          <div class="absolute -right-12 -top-12 w-40 h-40 bg-[#7f2f5d]/20 blur-3xl rounded-full group-hover:bg-[#ffb88c]/20 transition-all duration-700"></div>
          
          <div class="flex justify-between items-start mb-6 relative z-10">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <div id="compliance-dot" class="w-1.5 h-1.5 rounded-full ${adherence >= 80 ? 'bg-green-500' : 'bg-amber-500'} animate-pulse"></div>
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Compliance & Planner</span>
              </div>
              <div class="flex items-baseline gap-2">
                <p id="compliance-percentage" class="text-4xl font-bold text-white tracking-tight">${adherence}%</p>
                <span id="compliance-status" class="text-xs font-bold ${adherence >= 80 ? 'text-green-400' : 'text-amber-400'} uppercase tracking-widest">${adherence >= 80 ? 'Optimal' : 'Review'}</span>
              </div>
            </div>
            
            <div class="w-12 h-12 rounded-2xl bg-[#7f2f5d]/20 border border-[#7f2f5d]/50 flex items-center justify-center text-[#ffb88c] group-hover:scale-110 group-hover:bg-[#7f2f5d]/40 transition-all duration-300 shadow-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
            </div>
          </div>

          <div class="w-full h-2 bg-[#0a0407] rounded-full overflow-hidden relative z-10 border border-[#7f2f5d]/30">
            <div id="compliance-bar" class="h-full bg-gradient-to-r from-[#7f2f5d] to-[#ffb88c] transition-all duration-1000 relative" style="width: ${adherence}%">
               <div class="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>
        </div>

        <section class="mb-12">
        <div class="flex items-end justify-between mb-8 px-2 border-b border-[#7f2f5d]/30 pb-4">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffb88c" stroke-width="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <h2 class="text-[10px] text-[#ffb88c] font-bold tracking-[0.2em] uppercase">Today's Protocol</h2>
            </div>
            <p class="text-lg font-bold text-white tracking-tight">${today}</p>
          </div>
          
          <div class="relative z-50" id="filter-dropdown-container">
            <button id="timeline-filter-btn" class="w-8 h-8 rounded-full bg-[#1a0a12] border border-[#7f2f5d]/50 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#ffb88c]/50 transition-all active:scale-95">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
            </button>
            
            <div id="timeline-filter-menu" class="absolute right-0 top-10 w-48 bg-[#1a0a12]/95 backdrop-blur-xl border border-[#7f2f5d]/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden opacity-0 pointer-events-none transform -translate-y-2 transition-all duration-200">
              <div class="p-2 flex flex-col gap-1">
                <button class="filter-option text-left px-4 py-2.5 text-[10px] font-bold text-[#ffb88c] bg-[#7f2f5d]/20 rounded-xl transition-colors uppercase tracking-widest" data-filter="all">Show All</button>
                <button class="filter-option text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-[#7f2f5d]/20 rounded-xl transition-colors uppercase tracking-widest" data-filter="upcoming">Upcoming</button>
                <button class="filter-option text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-[#7f2f5d]/20 rounded-xl transition-colors uppercase tracking-widest" data-filter="missed">Missed</button>
              </div>
            </div>
          </div>
        </div>

          <div class="relative pl-6 border-l-2 border-[#7f2f5d]/30 space-y-8">
            ${schedule.length > 0 ? schedule.map(dose => {
              // Determine current status
              let itemStatus = 'upcoming';
              if (dose.taken) itemStatus = 'taken';
              else if (dose.date < now) itemStatus = 'missed';

              return `
              <div class="relative timeline-item transition-all duration-300 transform origin-top" data-status="${itemStatus}">
                <div class="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-[#0a0407] ${dose.taken ? 'bg-green-500' : Math.abs(dose.date - now) < 3600000 ? 'bg-[#ffb88c] animate-pulse' : 'bg-[#7f2f5d]'}"></div>
                <div class="${dose.taken ? 'opacity-50' : ''}">
                  <div class="flex justify-between items-start mb-2">
                    <div>
                      <span class="text-[10px] font-bold text-[#ffb88c] uppercase tracking-widest leading-none">${dose.time}</span>
                      <h3 class="text-base font-bold text-white mt-1">${dose.name}</h3>
                    </div>
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${dose.dosage}</span>
                  </div>
                  ${dose.taken
                    ? `<div class="flex items-center gap-1.5 mt-2"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg><span class="text-[9px] font-bold text-green-400 uppercase tracking-widest">Taken</span></div>`
                    // FIX 3: Inject the specific 'data-time' into the button
                    : `<button class="confirm-dose-btn w-full mt-3 py-3 bg-[#1a0a12] border border-[#7f2f5d]/50 rounded-xl text-[10px] font-bold text-[#ffb88c] uppercase tracking-[0.2em] hover:bg-[#7f2f5d]/30 transition-all active:scale-[0.98]" data-med-id="${dose.id}" data-time="${dose.time}">Mark as Taken</button>`
                  }
                </div>
              </div>
            `}).join('') : `
              <div class="py-8 text-center bg-[#1a0a12]/50 border border-[#7f2f5d]/30 rounded-3xl">
                <p class="text-xs text-gray-500 font-mono uppercase tracking-widest">No scheduled doses.</p>
                <button id="schedule-empty-add-btn" class="text-[#ffb88c] text-xs font-bold mt-2 uppercase">Add medication</button>
              </div>
            `}
          </div>
        </section>
      </main>
    `;

    this.attachListeners();
    return this.container;
  }

  attachListeners() {
    this.container.addEventListener('click', async (e) => {
      // 1. Toggle Filter Menu
      const filterBtn = e.target.closest('#timeline-filter-btn');
      if (filterBtn) {
        const menu = this.container.querySelector('#timeline-filter-menu');
        menu.classList.toggle('opacity-0');
        menu.classList.toggle('pointer-events-none');
        menu.classList.toggle('-translate-y-2');
        return; // Stop execution so menu stays open
      }

      // 2. Handle Filter Selection
      const filterOption = e.target.closest('.filter-option');
      if (filterOption) {
        const filterTarget = filterOption.dataset.filter;
        
        // Loop through all schedule items and show/hide them based on data-status
        this.container.querySelectorAll('.timeline-item').forEach(item => {
          if (filterTarget === 'all' || item.dataset.status === filterTarget) {
            item.style.display = 'block';
            setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'scaleY(1)'; }, 10);
          } else {
            item.style.opacity = '0'; 
            item.style.transform = 'scaleY(0.9)';
            setTimeout(() => { item.style.display = 'none'; }, 200);
          }
        });

        // Update Button Active States
        this.container.querySelectorAll('.filter-option').forEach(opt => {
          opt.classList.remove('text-[#ffb88c]', 'bg-[#7f2f5d]/20');
          opt.classList.add('text-gray-400');
        });
        filterOption.classList.remove('text-gray-400');
        filterOption.classList.add('text-[#ffb88c]', 'bg-[#7f2f5d]/20');

        // Close the menu automatically
        const menu = this.container.querySelector('#timeline-filter-menu');
        menu.classList.add('opacity-0', 'pointer-events-none', '-translate-y-2');
        return;
      }

      // 3. Auto-close Menu if clicked outside
      if (!e.target.closest('#filter-dropdown-container')) {
        const menu = this.container.querySelector('#timeline-filter-menu');
        if (menu && !menu.classList.contains('opacity-0')) {
          menu.classList.add('opacity-0', 'pointer-events-none', '-translate-y-2');
        }
      }

      const btn = e.target.closest('.confirm-dose-btn');
      if (btn) {
        e.preventDefault();
        
        // 1. Immediately provide visual feedback and disable the button
        btn.innerHTML = '<span class="animate-pulse">Marking...</span>';
        btn.disabled = true;

        const id = parseInt(btn.dataset.medId);
        const timeSlot = btn.dataset.time;

        try {
          // 2. Save to database in the background
          const doseData = { 
            medicationId: id, 
            scheduledTime: timeSlot, 
            takenAt: new Date().toISOString(), 
            status: 'taken', 
            userId: state.user.uid 
          };
          await db.doses.add(doseData);
          
          // 3. SURGICAL DOM UPDATE: Replace ONLY the button with the "Taken" checkmark
          const parentContainer = btn.parentElement;
          const successHTML = `
            <div class="flex items-center gap-1.5 mt-2 animate-[fadeIn_0.3s_ease-out]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              <span class="text-[9px] font-bold text-green-400 uppercase tracking-widest">Taken</span>
            </div>
          `;
          btn.outerHTML = successHTML;
          parentContainer.parentElement.querySelector('.absolute').classList.replace('bg-[#ffb88c]', 'bg-green-500');
          parentContainer.parentElement.querySelector('.absolute').classList.replace('bg-[#7f2f5d]', 'bg-green-500');
          parentContainer.parentElement.querySelector('.absolute').classList.remove('animate-pulse');
          parentContainer.classList.add('opacity-50', 'transition-opacity', 'duration-500');

          // --- ADD THIS NEW RECALCULATION BLOCK ---
          // 2. Recalculate Compliance Math instantly
          const meds = await db.medications.toArray();
          const allDoses = await db.doses.toArray();
          const todayStr = new Date().toISOString().split('T')[0];
          
          const takenSlots = new Set(
            allDoses.filter(d => d.takenAt && d.takenAt.startsWith(todayStr) && d.status === 'taken')
                    .map(d => `${d.medicationId}-${d.scheduledTime}`)
          );

          let expectedDoses = 0;
          let takenCount = 0;

          meds.forEach(m => {
            const times = Array.isArray(m.times) && m.times.length > 0 ? m.times : ['08:00'];
            times.forEach(t => {
              expectedDoses++;
              if (takenSlots.has(`${m.id}-${t}`)) takenCount++;
            });
          });

          const newAdherence = expectedDoses > 0 ? Math.round((takenCount / expectedDoses) * 100) : 0;

          // 3. Inject new math into the UI elements dynamically
          const pctEl = this.container.querySelector('#compliance-percentage');
          const statusEl = this.container.querySelector('#compliance-status');
          const barEl = this.container.querySelector('#compliance-bar');
          const dotEl = this.container.querySelector('#compliance-dot');

          if (pctEl) pctEl.textContent = `${newAdherence}%`;
          if (barEl) barEl.style.width = `${newAdherence}%`;
          
          if (statusEl && dotEl) {
            if (newAdherence >= 80) {
              statusEl.textContent = 'Optimal';
              statusEl.className = 'text-xs font-bold text-green-400 uppercase tracking-widest';
              dotEl.className = 'w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse';
            } else {
              statusEl.textContent = 'Review';
              statusEl.className = 'text-xs font-bold text-amber-400 uppercase tracking-widest';
              dotEl.className = 'w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse';
            }
          }
          // -----------------------------------------

        } catch (err) {
          console.error('[Dashboard] Error saving dose:', err);
          btn.innerHTML = 'Retry';
          btn.disabled = false;
        }
        return;
      }

      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.dataset.action;
        if (action === 'edit-med') window.location.hash = `#/edit/${actionEl.dataset.id}`;
        // Add the new Calendar routing handler here
        if (action === 'nav-calendar') window.location.hash = '#/calendar';
      }

      if (e.target.closest('#add-med-btn') || e.target.closest('#schedule-empty-add-btn')) {
        window.location.hash = '#/add';
      }
    });
  }

  destroy() {}
}