import db from '../core/db.js';
import state from '../core/state.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export default class DashboardView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'w-full h-full flex flex-col overflow-hidden';

    // Instantly return skeleton structure to router without blocking
    this.container.innerHTML = this._getSkeletonUI();

    // Trigger independent async loads
    this._loadDashboardData();
    this.attachListeners();
    return this.container;
  }

  async _loadDashboardData() {
    // Trigger header load immediately
    this._loadHeader();

    // Fire off independent database queries
    const medsPromise = db.medications.toArray().catch(e => {
        console.error('[Diagnostics] Local ledger failure:', e);
        return [];
    });
    const dosesPromise = db.doses.toArray().catch(() => []);
    
    // Feed promises into independent rendering streams and await them
    await Promise.all([
      this._loadMedsStrip(medsPromise),
      this._loadScheduleList(medsPromise, dosesPromise),
      this._loadCompliance(medsPromise, dosesPromise)
    ]);
  }

  async _loadHeader() {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
    const displayName = state.user?.displayName?.split(' ')[0] || 'User';

    const header = this.container.querySelector('#dashboard-header');
    const fullHeader = this.container.querySelector('header');
    if (header) {
      header.innerHTML = `
        <div class="flex flex-col animate-fade-in">
          <span class="text-[10px] text-[#ffb88c] uppercase tracking-widest leading-none mb-1 opacity-80">Dashboard</span>
          <h1 class="font-bold text-white leading-none">Good ${greeting}, ${displayName}</h1>
        </div>
      `;
    }
    
    // Check if the add button is already injected
    if (fullHeader && !fullHeader.querySelector('#add-med-btn')) {
       const btnHTML = `
         <button id="add-med-btn" class="header-btn ml-auto">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffd9b5" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
         </button>
       `;
       fullHeader.insertAdjacentHTML('beforeend', btnHTML);
       
       fullHeader.querySelector('#add-med-btn').addEventListener('click', () => {
         window.location.hash = '#/add-medication';
       });
    }
  }

  async _loadMedsStrip(medsPromise) {
    const meds = await medsPromise;
    const section = this.container.querySelector('#dashboard-meds-section');
    if (!section) return;

    section.innerHTML = `
      <h2 class="text-xs text-gray-400 font-bold mb-6 tracking-[0.2em] px-1 uppercase animate-fade-in">Current Medications</h2>
      <div class="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6 md:-mx-0 md:px-0 animate-fade-in">
        ${meds.length > 0 ? meds.map(m => `
          <div class="bg-[#1a0a12]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 min-w-[150px] flex flex-col justify-between shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.5)] cursor-pointer hover:border-[#ffb88c]/50 transition-all" data-action="edit-med" data-id="${m.id}">
            <div class="w-10 h-10 rounded-2xl bg-[#7f2f5d]/20 border border-[#7f2f5d]/50 flex items-center justify-center mb-6">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffb88c" stroke-width="2.5"><path d="M10.5 3.5a2.121 2.121 0 0 1 3 0l7 7a2.121 2.121 0 0 1 0 3l-7 7a2.121 2.121 0 0 1-3 0l-7-7a2.121 2.121 0 0 1 0-3l7-7Z"/><path d="m8.5 15.5 7-7"/></svg>
            </div>
            <div>
              <p class="text-sm font-bold text-white leading-tight">${m.name}</p>
              <p class="text-xs text-gray-400 mt-1 uppercase font-bold tracking-widest">${m.dosage} ${m.dosageUnit || 'mg'}</p>
            </div>
          </div>
        `).join('') : `
          <div class="bg-[#1a0a12]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <p class="text-xs text-gray-500 uppercase font-bold tracking-widest">No active medications.</p>
          </div>
        `}
        <a href="#/add-medication" id="add-med-btn" class="bg-[#1a0a12]/20 backdrop-blur-md border-dashed border-2 border-white/20 rounded-3xl p-4 min-w-[110px] flex flex-col items-center justify-center shrink-0 cursor-pointer hover:bg-white/5 transition-colors">
          <div class="w-10 h-10 rounded-full border border-[#ffb88c]/40 flex items-center justify-center mb-3 text-[#ffb88c]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <p class="text-xs text-gray-400 uppercase font-bold tracking-widest text-center">Add Med</p>
        </a>
      </div>
    `;
  }

  async _loadScheduleList(medsPromise, dosesPromise) {
    const [meds, allDoses] = await Promise.all([medsPromise, dosesPromise]);
    const section = this.container.querySelector('#dashboard-schedule-section');
    if (!section) return;

    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayDoses = allDoses.filter(d => d.takenAt && d.takenAt.startsWith(todayStr));
    
    const takenSlots = new Set(
      todayDoses.filter(d => d.status === 'taken' || !d.skipped).map(d => `${d.medicationId}-${d.scheduledTime}`)
    );

    const schedule = meds.flatMap(m => {
      const times = Array.isArray(m.times) && m.times.length > 0 ? m.times : ['08:00'];
      return times.map(t => {
        const [h, min] = t.split(':').map(Number);
        const d = new Date(); d.setHours(h, min, 0, 0);
        return {
          id: m.id, name: m.name, dosage: m.dosage,
          dosageUnit: m.dosageUnit || 'mg', time: t, date: d,
          taken: takenSlots.has(`${m.id}-${t}`)
        };
      });
    }).sort((a, b) => a.date - b.date);

    section.innerHTML = `
      <div class="flex items-end justify-between mb-8 px-2 border-b border-[#7f2f5d]/30 pb-4 animate-fade-in">
        <div>
          <div class="flex items-center gap-2 mb-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffb88c" stroke-width="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <h2 class="text-xs text-[#ffb88c] font-bold tracking-[0.2em] uppercase">Daily Schedule</h2>
          </div>
          <p class="text-lg font-bold text-white tracking-tight">${today}</p>
        </div>
        
        <div class="relative z-50" id="filter-dropdown-container">
          <button id="timeline-filter-btn" class="w-8 h-8 rounded-full bg-[#1a0a12] border border-[#7f2f5d]/50 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#ffb88c]/50 transition-all active:scale-95">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
          </button>
          
          <div id="timeline-filter-menu" class="absolute right-0 top-10 w-48 bg-[#1a0a12]/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden opacity-0 pointer-events-none transform -translate-y-2 transition-all duration-200">
            <div class="p-2 flex flex-col gap-1">
              <button class="filter-option text-left px-4 py-2.5 text-xs font-bold text-[#ffb88c] bg-[#7f2f5d]/20 rounded-xl transition-colors uppercase tracking-widest" data-filter="all">Show All</button>
              <button class="filter-option text-left px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-[#7f2f5d]/20 rounded-xl transition-colors uppercase tracking-widest" data-filter="upcoming">Upcoming</button>
              <button class="filter-option text-left px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-[#7f2f5d]/20 rounded-xl transition-colors uppercase tracking-widest" data-filter="missed">Missed</button>
            </div>
          </div>
        </div>
      </div>

      <div class="relative pl-6 border-l-2 border-[#7f2f5d]/30 space-y-8 animate-fade-in">
        ${schedule.length > 0 ? schedule.map(dose => {
          let itemStatus = 'upcoming';
          if (dose.taken) itemStatus = 'taken';
          else if (dose.date < now) itemStatus = 'missed';

          return `
          <div class="relative timeline-item transition-all duration-300 transform origin-top" data-status="${itemStatus}">
            <div class="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-[#0a0407] ${dose.taken ? 'bg-green-500' : Math.abs(dose.date - now) < 3600000 ? 'bg-[#ffb88c] animate-pulse' : 'bg-[#7f2f5d]'}"></div>
            <div class="${dose.taken ? 'opacity-50' : ''}">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <span class="text-xs font-bold text-[#ffb88c] uppercase tracking-widest leading-none">${dose.time}</span>
                  <h3 class="text-base font-bold text-white mt-1">${dose.name}</h3>
                </div>
                <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">${dose.dosage}</span>
              </div>
              ${dose.taken
                ? `<div class="flex items-center gap-2 mt-2">
                     <div class="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-lg">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                       <span class="text-xs font-bold text-green-400 uppercase tracking-widest">Taken</span>
                     </div>
                     <button class="undo-dose-btn px-3 py-1 bg-[#1a0a12] border border-[#7f2f5d]/50 rounded-lg text-xs font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors" data-med-id="${dose.id}" data-time="${dose.time}">Undo</button>
                   </div>`
                : `<button class="confirm-dose-btn w-full mt-3 py-3 bg-[#1a0a12] border border-[#7f2f5d]/50 rounded-xl text-xs font-bold text-[#ffb88c] uppercase tracking-[0.2em] hover:bg-[#7f2f5d]/30 transition-all active:scale-[0.98]" data-med-id="${dose.id}" data-time="${dose.time}">Mark as Taken</button>`
              }
            </div>
          </div>
        `}).join('') : `
          <div class="py-8 text-center clay-glass-panel rounded-3xl">
            <p class="text-xs text-gray-500 font-mono uppercase tracking-widest">No scheduled doses.</p>
            <button id="schedule-empty-add-btn" class="text-[#ffb88c] text-xs font-bold mt-2 uppercase">Add medication</button>
          </div>
        `}
      </div>
    `;
  }

  async _loadCompliance(medsPromise, dosesPromise) {
    const [meds, allDoses] = await Promise.all([medsPromise, dosesPromise]);
    const col = this.container.querySelector('#dashboard-right-column');
    if (!col) return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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

    const adherence = expectedDoses > 0 ? Math.round((takenCount / expectedDoses) * 100) : 0;

    col.innerHTML = `
      <div data-action="nav-calendar" class="group relative bg-[#1a0a12]/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden cursor-pointer hover:border-[#ffb88c]/50 transition-all duration-500 animate-fade-in">
        <div class="absolute -right-12 -top-12 w-40 h-40 bg-[#7f2f5d]/20 blur-3xl rounded-full group-hover:bg-[#ffb88c]/20 transition-all duration-700"></div>
        <div class="flex justify-between items-start mb-6 relative z-10">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <div id="compliance-dot" class="w-1.5 h-1.5 rounded-full ${adherence >= 80 ? 'bg-green-500' : 'bg-amber-500'} animate-pulse"></div>
              <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Compliance</span>
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
        <div class="mt-5 text-right relative z-10">
          <a href="#/reports" class="text-xs font-bold text-[#ffb88c] hover:text-white uppercase tracking-widest border-b border-[#ffb88c]/30 pb-1 transition-colors">View Full Report &rarr;</a>
        </div>
      </div>
    `;
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

          // 2.5 Handle Quantity Decrement and Refill Alerts
          const medRecord = await db.medications.get(id);
          if (medRecord && medRecord.totalQuantity !== undefined && medRecord.totalQuantity > 0) {
            medRecord.totalQuantity -= 1;
            await db.medications.update(id, { totalQuantity: medRecord.totalQuantity });
            
            try {
              const firestoreDb = getFirestore();
              await setDoc(doc(firestoreDb, 'medications', id.toString()), { totalQuantity: medRecord.totalQuantity }, { merge: true });
            } catch (fsErr) {
              // Ignore cloud sync error for this background task
            }

            if (medRecord.refillThreshold !== undefined && medRecord.totalQuantity <= medRecord.refillThreshold) {
              // Show an inline toast/alert
              const alertHTML = document.createElement('div');
              alertHTML.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-amber-500/90 text-white px-6 py-3 rounded-2xl shadow-xl z-[9999] text-xs font-bold tracking-widest uppercase animate-[slideUpFade_0.3s_ease-out] flex items-center gap-3 backdrop-blur-md';
              alertHTML.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg> Refill Alert: ${medRecord.name} is running low (${medRecord.totalQuantity} left).`;
              document.body.appendChild(alertHTML);
              setTimeout(() => {
                alertHTML.style.opacity = '0';
                setTimeout(() => alertHTML.remove(), 300);
              }, 5000);
            }
          }
          
          // 3. SURGICAL DOM UPDATE: Replace ONLY the button with the "Taken" checkmark and Undo button
          const parentContainer = btn.parentElement;
          const successHTML = `
            <div class="flex items-center gap-2 mt-2 animate-[fadeIn_0.3s_ease-out]">
              <div class="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                <span class="text-xs font-bold text-green-400 uppercase tracking-widest">Taken</span>
              </div>
              <button class="undo-dose-btn px-3 py-1 bg-[#1a0a12] border border-[#7f2f5d]/50 rounded-lg text-xs font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors" data-med-id="${id}" data-time="${timeSlot}">Undo</button>
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
          const nowCalc = new Date();
          const todayStr = `${nowCalc.getFullYear()}-${String(nowCalc.getMonth() + 1).padStart(2, '0')}-${String(nowCalc.getDate()).padStart(2, '0')}`;
          
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
        if (action === 'edit-med') window.location.hash = `#/add-medication/edit/${actionEl.dataset.id}`;
        // Add the new Calendar routing handler here
        if (action === 'nav-calendar') window.location.hash = '#/calendar';
      }

      const undoBtn = e.target.closest('.undo-dose-btn');
      if (undoBtn) {
        e.preventDefault();
        undoBtn.disabled = true;
        undoBtn.textContent = '...';

        const id = parseInt(undoBtn.dataset.medId);
        const timeSlot = undoBtn.dataset.time;
        const nowUndo = new Date();
        const todayStr = `${nowUndo.getFullYear()}-${String(nowUndo.getMonth() + 1).padStart(2, '0')}-${String(nowUndo.getDate()).padStart(2, '0')}`;
        
        try {
          // Find and delete the dose record for today
          const allDoses = await db.doses.toArray();
          const doseToDelete = allDoses.find(d => 
            d.medicationId === id && 
            d.scheduledTime === timeSlot && 
            d.takenAt && d.takenAt.startsWith(todayStr)
          );
          
          if (doseToDelete && doseToDelete.id) {
            await db.doses.delete(doseToDelete.id);
            // Optionally restore inventory here if we want to be highly accurate
          }

          // Trigger a full re-render to cleanly restore the original state and math
          this.render().then(newDOM => {
            this.container.innerHTML = newDOM.innerHTML;
            this.attachListeners();
          });
          
        } catch (err) {
          console.error('[Dashboard] Error undoing dose:', err);
          undoBtn.disabled = false;
          undoBtn.textContent = 'Undo';
        }
        return;
      }

      if (e.target.closest('#schedule-empty-add-btn')) {
        window.location.hash = '#/add-medication';
      }
    });

    // Custom Pull-to-Refresh Logic
    const scrollArea = this.container.querySelector('#dashboard-main-content');
    if (!scrollArea) return;

    let startY = 0;
    let currentY = 0;
    let isRefreshing = false;
    let ptrContainer = null;
    let isPulling = false;

    scrollArea.addEventListener('touchstart', (e) => {
        if (scrollArea.scrollTop <= 0) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });

    scrollArea.addEventListener('touchmove', (e) => {
        if (!isPulling || isRefreshing) return;
        
        currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 0 && scrollArea.scrollTop <= 0) {
            if (e.cancelable) e.preventDefault(); // Block native refresh
            
            if (!ptrContainer) {
                ptrContainer = document.createElement('div');
                Object.assign(ptrContainer.style, {
                    position: 'absolute',
                    top: '0px',
                    left: '0',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    zIndex: '100',
                    transform: 'translateY(-80px)',
                    transition: 'none'
                });
                
                // Claymorphism refresh UI
                ptrContainer.innerHTML = `
                    <div class="p-3 bg-gradient-to-br from-[#1a0a12] to-[#0a0407] rounded-3xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl relative overflow-hidden" style="box-shadow: inset 0 2px 10px rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.8);">
                       <div class="w-8 h-8 relative flex items-center justify-center spinner-container">
                          <div class="w-2.5 h-2.5 bg-[#ca5229] rounded-full absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_15px_#ca5229]"></div>
                          <div class="w-2.5 h-2.5 bg-[#7f2f5d] rounded-full absolute bottom-0 left-0 shadow-[0_0_15px_#7f2f5d]"></div>
                          <div class="w-2.5 h-2.5 bg-[#ffb88c] rounded-full absolute bottom-0 right-0 shadow-[0_0_15px_#ffb88c]"></div>
                       </div>
                    </div>
                `;
                this.container.appendChild(ptrContainer);
            }
            
            // Exponential decay for realistic pull resistance
            const resistance = pullDistance < 150 ? pullDistance : 150 + (pullDistance - 150) * 0.3;
            ptrContainer.style.transform = `translateY(${Math.min(resistance - 80, 40)}px)`;
            
            const spinner = ptrContainer.querySelector('.spinner-container');
            if (spinner) {
                spinner.style.transform = `rotate(${resistance * 2}deg) scale(${Math.min(resistance / 100, 1)})`;
            }
        }
    }, { passive: false });

    scrollArea.addEventListener('touchend', async () => {
        if (!isPulling) return;
        isPulling = false;
        
        const pullDistance = currentY - startY;
        
        if (pullDistance > 80 && !isRefreshing) {
            isRefreshing = true;
            
            if (ptrContainer) {
                ptrContainer.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                ptrContainer.style.transform = 'translateY(40px)';
                
                const spinner = ptrContainer.querySelector('.spinner-container');
                if (spinner) {
                    spinner.classList.add('animate-spin');
                    spinner.style.animationDuration = '0.8s';
                }
                
                // Trigger reload with a guaranteed minimum display time for realistic UX
                const minAnimationTime = new Promise(resolve => setTimeout(resolve, 1500));
                
                const syncData = async () => {
                    // Pull latest cloud profile data if online
                    if (navigator.onLine && state.user) {
                        await state.hydrate(state.user).catch(console.warn);
                    }
                    // Re-render local dashboard views
                    await this._loadDashboardData();
                };
                
                // Await both real data fetch and the UX animation delay
                await Promise.all([syncData(), minAnimationTime]);
                
                // Hide
                ptrContainer.style.transform = 'translateY(-100px)';
                setTimeout(() => {
                    if (ptrContainer && ptrContainer.parentNode) ptrContainer.remove();
                    ptrContainer = null;
                    isRefreshing = false;
                }, 400);
            }
        } else if (ptrContainer) {
            // Cancel refresh
            ptrContainer.style.transition = 'transform 0.3s ease-out';
            ptrContainer.style.transform = 'translateY(-100px)';
            setTimeout(() => {
                if (ptrContainer && ptrContainer.parentNode) ptrContainer.remove();
                ptrContainer = null;
            }, 300);
        }
    });
  }

  _getSkeletonUI() {
    const medCard = () => `
      <div class="skeleton skeleton-xl" style="min-width:150px; height:160px; flex-shrink:0;"></div>
    `;
    const scheduleRow = () => `
      <div style="display:flex; align-items:center; gap:16px; padding:16px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
        <div class="skeleton skeleton-round" style="width:40px; height:40px; flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="skeleton" style="height:14px; width:55%; margin-bottom:8px;"></div>
          <div class="skeleton" style="height:11px; width:35%;"></div>
        </div>
        <div class="skeleton skeleton-round" style="width:72px; height:32px;"></div>
      </div>
    `;
    return `
      <!-- Header -->
      <header class="view-header">
        <div id="dashboard-header">
          <div class="skeleton" style="height:10px; width:80px; margin-bottom:10px;"></div>
          <div class="skeleton" style="height:22px; width:180px;"></div>
        </div>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto px-6 md:px-12 pt-6 pb-28 w-full max-w-7xl mx-auto" id="dashboard-main-content" style="overscroll-behavior-y: none;">
        <div class="md:grid md:grid-cols-12 md:gap-10 md:items-start">
          <!-- Left Column -->
          <div class="md:col-span-7 lg:col-span-8 flex flex-col gap-10">
            <section id="dashboard-meds-section">
              <!-- Section label -->
              <div class="skeleton" style="height:10px; width:130px; margin-bottom:24px;"></div>
  
              <!-- Meds horizontal strip -->
              <div style="display:flex; gap:16px; overflow:hidden;">
                ${medCard()}${medCard()}${medCard()}
              </div>
            </section>

            <section id="dashboard-schedule-section">
              <!-- Section label -->
              <div class="skeleton" style="height:10px; width:110px; margin-bottom:32px;"></div>
  
              <!-- Schedule rows -->
              <div>
                ${scheduleRow()}${scheduleRow()}${scheduleRow()}
              </div>
            </section>
          </div>

          <!-- Right Column -->
          <div class="md:col-span-5 lg:col-span-4 mt-10 md:mt-0 flex flex-col gap-6" id="dashboard-right-column">
            <!-- Compliance Card Skeleton -->
            <div class="skeleton skeleton-card" style="height:180px; width:100%; border-radius:2rem;"></div>
          </div>
        </div>
      </div>
    `;
  }

  destroy() {}
}

