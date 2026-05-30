/**
 * @fileoverview Interactive Compliance Calendar View
 * Dynamically reconstructs historical schedules to calculate adherence.
 */
import db from '../core/db.js';
import state from '../core/state.js';

export default class CalendarView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'container !pt-0 !mt-0 h-full flex flex-col relative';
    this.currentDate = new Date();
    this.viewMode = 'month';
    this.allDoses = [];
    this.meds = [];
  }

  async render() {
    try {
      this.meds = await db.medications.toArray();
      this.allDoses = await db.doses.toArray();
    } catch (e) {
      console.error('[Calendar] Database fetch failed', e);
    }
    this.updateUI();
    return this.container;
  }

  updateUI() {
    if (this.viewMode === 'year') {
      this.renderYearView();
    } else {
      this.renderMonthView();
    }
  }

  getAdherenceStats(dateStr) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (new Date(dateStr) > new Date(todayStr + 'T23:59:59')) {
      return { status: 'future', expected: 0, taken: 0 };
    }

    const dayDoses = this.allDoses.filter(d => d.takenAt && d.takenAt.startsWith(dateStr));
    const takenSlots = new Set(dayDoses.filter(d => d.status === 'taken').map(d => `${d.medicationId}-${d.scheduledTime}`));

    let expected = 0;
    let taken = 0;

    // STRICT BOUNDARY CHECK: Only include medications that existed on or before this day
    const activeMeds = this.meds.filter(m => {
      const medStart = m.startDate || (m.createdAt ? m.createdAt.split('T')[0] : '2000-01-01');
      return medStart <= dateStr;
    });

    activeMeds.forEach(m => {
      const times = Array.isArray(m.times) && m.times.length > 0 ? m.times : ['08:00'];
      times.forEach(t => {
        expected++;
        if (takenSlots.has(`${m.id}-${t}`)) taken++;
      });
    });

    let status = 'missed'; // Red
    if (expected === 0) status = 'empty';
    else if (taken === expected) status = 'optimal'; // Green
    else if (taken > 0) status = 'partial'; // Amber

    return { status, expected, taken };
  }

  // --- VIEW 1: MONTHLY GRID ---
  renderMonthView() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthName = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    let gridHTML = `<div class="grid grid-cols-7 gap-2 mb-2 text-center">
      ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="text-xs font-bold text-gray-500 uppercase tracking-widest pb-2">${d}</div>`).join('')}
    </div><div class="grid grid-cols-7 gap-2 lg:gap-3">`;

    for (let i = 0; i < firstDayOfMonth; i++) {
      gridHTML += `<div class="aspect-square rounded-full bg-transparent"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const stats = this.getAdherenceStats(dateStr);
      
      let ringClass = 'border-[#7f2f5d]/20'; 
      let bgIcon = '';
      
      if (stats.status !== 'empty' && stats.status !== 'future') {
        if (stats.status === 'optimal') {
          // Organic, randomized "Highlighter Dab" behind the number
          ringClass = 'border-transparent';
          const r = (range) => (Math.random() * range) - (range / 2);
          const rot = r(90);
          
          bgIcon = `
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] bg-green-500/25 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] z-0" style="transform: rotate(${rot}deg) scale(${1 + (Math.random() * 0.1)}); box-shadow: inset 0 0 10px rgba(16,185,129,0.2);"></div>
          `;
        } else {
          const isPartial = stats.status === 'partial';
          ringClass = `border-transparent ${isPartial ? 'bg-amber-500/5' : 'bg-red-500/5'}`;
          const colorClass = isPartial ? 'text-amber-500/90' : 'text-red-500/90';
          
          const r = (range) => (Math.random() * range) - (range / 2);
          const rot = r(50); 
          
          bgIcon = `
            <svg class="absolute inset-0 w-[140%] h-[140%] -left-[20%] -top-[20%] ${colorClass} pointer-events-none z-0" style="transform: rotate(${rot}deg);" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M ${65 + r(20)} ${15 + r(20)} C ${10 + r(30)} ${5 + r(30)}, ${-10 + r(30)} ${95 + r(30)}, ${50 + r(20)} ${95 + r(15)} C ${105 + r(30)} ${90 + r(30)}, ${105 + r(30)} ${15 + r(30)}, ${40 + r(25)} ${15 + r(20)} C ${20 + r(20)} ${15 + r(20)}, ${10 + r(20)} ${35 + r(20)}, ${15 + r(15)} ${50 + r(20)}" />
            </svg>
          `;
        }
      }

      // Generate randomized "Handwritten" styling for the numbers
      const numRot = (Math.random() * 12) - 6; // Tilt up to 6 degrees left or right
      const numTx = (Math.random() * 4) - 2; // Shift slightly horizontally
      const numTy = (Math.random() * 4) - 2; // Shift slightly vertically
      const handStyle = `transform: rotate(${numRot}deg) translate(${numTx}px, ${numTy}px); font-family: 'Segoe Print', 'Bradley Hand', 'Chalkboard SE', 'Comic Sans MS', cursive;`;

      gridHTML += `
        <div class="calendar-day aspect-square rounded-full bg-[#1a0a12]/60 border-2 ${ringClass} flex flex-col items-center justify-center relative cursor-pointer hover:bg-[#7f2f5d]/40 transition-all ${isToday && ringClass.includes('7f2f') ? 'bg-[#7f2f5d]/30' : ''}" data-date="${dateStr}">
          ${bgIcon}
          <span class="text-base relative z-10 ${isToday ? 'text-[#ffb88c] font-bold' : (stats.status === 'optimal') ? 'text-green-400 font-bold' : 'text-gray-300'}" style="${handStyle}">${day}</span>
          ${isToday ? `<div class="absolute -bottom-1 w-2 h-2 bg-[#ffb88c] rounded-full animate-pulse shadow-[0_0_8px_#ffb88c] z-10"></div>` : ''}
        </div>
      `;
    }
    gridHTML += `</div>`;

    this.renderBaseLayout(monthName, gridHTML);
  }

  // --- VIEW 2: YEARLY GRID (Zoomed Out) ---
  renderYearView() {
    const year = this.currentDate.getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let gridHTML = `<div class="grid grid-cols-3 gap-4">`;
    
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      let monthExpected = 0;
      let monthTaken = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const stats = this.getAdherenceStats(dateStr);
        monthExpected += stats.expected;
        monthTaken += stats.taken;
      }

      const adherence = monthExpected > 0 ? Math.round((monthTaken / monthExpected) * 100) : 0;
      let ringColor = 'border-[#7f2f5d]/30 text-gray-400';
      if (monthExpected > 0) {
        if (adherence >= 90) ringColor = 'border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
        else if (adherence >= 50) ringColor = 'border-amber-500/50 text-amber-400';
        else ringColor = 'border-red-500/50 text-red-400';
      }

      // Add the handwritten aesthetic to the zoomed-out year view as well
      const rot = (Math.random() * 8) - 4;
      const handStyle = `transform: rotate(${rot}deg); font-family: 'Segoe Print', 'Bradley Hand', 'Chalkboard SE', 'Comic Sans MS', cursive;`;

      gridHTML += `
        <div class="month-selector aspect-square rounded-[2rem] bg-[#1a0a12]/60 border-2 ${ringColor} flex flex-col items-center justify-center cursor-pointer hover:bg-[#7f2f5d]/20 transition-all group" data-month="${m}">
          <span class="text-base tracking-widest group-hover:text-white transition-colors" style="${handStyle}">${months[m]}</span>
          <span class="text-[12px] mt-1 opacity-80" style="${handStyle}">${monthExpected > 0 ? `${adherence}%` : '---'}</span>
        </div>
      `;
    }
    gridHTML += `</div>`;

    this.renderBaseLayout(year.toString(), gridHTML);
  }

  renderBaseLayout(title, gridHTML) {
    this.container.innerHTML = `
      <header class="sticky top-0 left-0 w-full z-40 flex items-center justify-between px-4 py-4 bg-[#0a0407]/90 backdrop-blur-md border-b border-[#7f2f5d]/30 mb-6 transition-all duration-300">
        <button onclick="window.history.back()" class="flex items-center gap-2 text-[#ffb88c] hover:brightness-125 transition-all">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span class="text-sm font-bold uppercase tracking-widest">Back</span>
        </button>
        <div class="flex flex-col items-center cursor-pointer group" id="toggle-view-btn">
          <span class="text-xs text-gray-400 uppercase tracking-widest leading-none group-hover:text-[#ffb88c] transition-colors">Compliance</span>
          <h2 class="text-lg font-bold text-white tracking-tight mt-1 group-hover:text-[#ffb88c] transition-colors flex items-center gap-2">
            ${title}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="${this.viewMode === 'year' ? 'rotate-180' : ''} transition-transform"><path d="M6 9l6 6 6-6"/></svg>
          </h2>
        </div>
        <div class="w-16"></div>
      </header>

      <main class="flex-1 px-6 pb-28 max-w-xl mx-auto w-full flex flex-col">
        <div class="flex items-center justify-between bg-[#1a0a12]/80 backdrop-blur-md border border-[#7f2f5d]/40 rounded-3xl p-4 mb-8 shadow-lg">
          <button id="prev-period" class="w-10 h-10 rounded-2xl bg-[#0a0407] border border-[#7f2f5d]/50 flex items-center justify-center text-[#ffb88c] active:scale-95 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h3 class="text-base font-bold text-white uppercase tracking-widest">${title}</h3>
          <button id="next-period" class="w-10 h-10 rounded-2xl bg-[#0a0407] border border-[#7f2f5d]/50 flex items-center justify-center text-[#ffb88c] active:scale-95 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <div id="calendar-swipe-zone" class="bg-[#1a0a12]/40 backdrop-blur-sm border border-[#7f2f5d]/20 rounded-[2rem] p-4 lg:p-6 flex-1 shadow-2xl relative overflow-hidden">
          ${gridHTML}
        </div>

        ${this.viewMode === 'month' ? `
          <div class="mt-8 flex justify-center gap-5 px-2">
            <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg></div><span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Optimal</span></div>
            <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-full border border-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]"></div><span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Partial</span></div>
            <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-full border border-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div><span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Missed</span></div>
          </div>
        ` : ''}
      </main>

      <div id="day-modal" class="fixed inset-0 z-[9999] bg-[#0a0407]/80 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300 flex items-end justify-center">
        <div id="day-modal-sheet" class="w-full max-w-xl bg-[#1a0a12] border-t border-[#7f2f5d]/40 rounded-t-[2rem] p-6 pb-24 shadow-2xl transform translate-y-full transition-transform duration-300 max-h-[85vh] flex flex-col">
          <div class="flex justify-between items-center mb-6">
            <h3 id="day-modal-title" class="text-lg font-bold text-white tracking-tight"></h3>
            <button id="close-modal-btn" class="w-8 h-8 rounded-full bg-[#0a0407] border border-[#7f2f5d]/50 flex items-center justify-center text-gray-400 active:scale-90 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div id="day-modal-list" class="flex-1 overflow-y-auto space-y-3 pb-8 no-scrollbar"></div>
        </div>
      </div>
    `;

    this.attachListeners();
  }

  attachListeners() {
    // Top-level delegator for Editable Database Toggles with Haptics
    this.container.addEventListener('click', async (e) => {
      const toggleBtn = e.target.closest('.toggle-historical-dose');
      if (toggleBtn) {
        const id = parseInt(toggleBtn.dataset.id);
        const timeSlot = toggleBtn.dataset.time;
        const dateStr = toggleBtn.dataset.date;
        const action = toggleBtn.dataset.action;

        // UI Optimistic Update & Haptic Feedback
        toggleBtn.style.opacity = '0.5';
        toggleBtn.style.pointerEvents = 'none';
        
        if (navigator.vibrate) {
          // Double buzz for mark (success), single low buzz for unmark
          navigator.vibrate(action === 'mark' ? [30, 50, 30] : [40]);
        }

        try {
          if (action === 'mark') {
            await db.doses.add({
              medicationId: id,
              scheduledTime: timeSlot,
              takenAt: `${dateStr}T${timeSlot}:00.000Z`, 
              status: 'taken',
              userId: state.user?.uid || 'anonymous'
            });
          } else if (action === 'unmark') {
            // FIX: Find ALL matching doses (including legacy ones without time slots) and nuke them
            const dayDoses = this.allDoses.filter(d => d.takenAt && d.takenAt.startsWith(dateStr));
            const existingDoses = dayDoses.filter(d => 
              d.medicationId === id && 
              (d.scheduledTime === timeSlot || !d.scheduledTime) && 
              d.status === 'taken'
            );
            
            for (let ed of existingDoses) {
              if (ed.id) await db.doses.delete(ed.id);
            }
          }

          // Force fresh fetch to ensure UI perfectly matches database
          this.allDoses = await db.doses.toArray();
          this.updateUI(); 
          this.showDayDetails(dateStr); // Redraw modal with new state
        } catch (err) {
          console.error('[Calendar] Error editing historical dose', err);
          toggleBtn.style.opacity = '1';
          toggleBtn.style.pointerEvents = 'auto';
        }
      }
    });

    // Period Pagination
    this.container.querySelector('#prev-period')?.addEventListener('click', () => {
      if (this.viewMode === 'month') this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      else this.currentDate.setFullYear(this.currentDate.getFullYear() - 1);
      this.updateUI();
    });

    this.container.querySelector('#next-period')?.addEventListener('click', () => {
      if (this.viewMode === 'month') this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      else this.currentDate.setFullYear(this.currentDate.getFullYear() + 1);
      this.updateUI();
    });

    // Touch Swipe Gestures
    const swipeZone = this.container.querySelector('#calendar-swipe-zone');
    if (swipeZone) {
      let touchStartX = 0;
      let touchStartY = 0;

      swipeZone.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });

      swipeZone.addEventListener('touchend', e => {
        const deltaX = e.changedTouches[0].screenX - touchStartX;
        const deltaY = e.changedTouches[0].screenY - touchStartY;

        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          const isNext = deltaX < 0; // Swiping left pulls the next view in
          if (this.viewMode === 'month') this.currentDate.setMonth(this.currentDate.getMonth() + (isNext ? 1 : -1));
          else this.currentDate.setFullYear(this.currentDate.getFullYear() + (isNext ? 1 : -1));
          this.updateUI();
        }
      }, { passive: true });
    }

    // View Toggle
    this.container.querySelector('#toggle-view-btn')?.addEventListener('click', () => {
      this.viewMode = this.viewMode === 'month' ? 'year' : 'month';
      this.updateUI();
    });

    // Day Detail Clicks
    this.container.querySelectorAll('.calendar-day').forEach(el => {
      el.addEventListener('click', (e) => this.showDayDetails(e.currentTarget.dataset.date));
    });

    // Month Selection from Year View
    this.container.querySelectorAll('.month-selector').forEach(el => {
      el.addEventListener('click', (e) => {
        const m = parseInt(e.currentTarget.dataset.month, 10);
        this.currentDate.setMonth(m);
        this.viewMode = 'month';
        this.updateUI();
      });
    });

    // Modal Close
    this.container.querySelector('#close-modal-btn')?.addEventListener('click', () => this.hideModal());
    this.container.querySelector('#day-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'day-modal') this.hideModal();
    });
  }

  showDayDetails(dateStr) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr > todayStr) return; // Prevent opening future days

    const modal = this.container.querySelector('#day-modal');
    const sheet = this.container.querySelector('#day-modal-sheet');
    const title = this.container.querySelector('#day-modal-title');
    const list = this.container.querySelector('#day-modal-list');

    const dateObj = new Date(dateStr + 'T12:00:00');
    title.innerHTML = `${dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} <span class="ml-2 px-2 py-1 bg-[#7f2f5d]/20 text-[#ffb88c] text-xs rounded-lg border border-[#7f2f5d]/40 uppercase tracking-widest align-middle">Editor</span>`;

    const dayDoses = this.allDoses.filter(d => d.takenAt && d.takenAt.startsWith(dateStr));
    const takenSlots = new Set(dayDoses.filter(d => d.status === 'taken').map(d => `${d.medicationId}-${d.scheduledTime}`));

    const activeMeds = this.meds.filter(m => {
      const medStart = m.startDate || (m.createdAt ? m.createdAt.split('T')[0] : '2000-01-01');
      return medStart <= dateStr;
    });

    const schedule = activeMeds.flatMap(m => {
      const times = Array.isArray(m.times) && m.times.length > 0 ? m.times : ['08:00'];
      return times.map(t => ({
        id: m.id, name: m.name, dosage: m.dosage, time: t,
        taken: takenSlots.has(`${m.id}-${t}`)
      }));
    }).sort((a,b) => a.time.localeCompare(b.time));

    if (schedule.length === 0) {
      list.innerHTML = '<div class="py-12 text-center border border-dashed border-[#7f2f5d]/30 rounded-3xl"><p class="text-xs text-gray-500 uppercase tracking-widest font-bold">No protocol logged</p></div>';
    } else {
      // UPGRADED HAPTIC TOGGLE UI
      list.innerHTML = schedule.map(dose => `
        <div class="flex justify-between items-center bg-[#0a0407]/80 border ${dose.taken ? 'border-green-500/30' : 'border-[#7f2f5d]/30'} rounded-2xl p-4 transition-all duration-300">
          <div>
            <span class="text-xs font-bold ${dose.taken ? 'text-green-400' : 'text-gray-500'} uppercase tracking-widest transition-colors duration-300">${dose.time}</span>
            <h4 class="text-sm font-bold ${dose.taken ? 'text-white' : 'text-gray-400'} mt-0.5 transition-colors duration-300">${dose.name} <span class="text-xs text-gray-600 font-normal ml-1 tracking-widest">${dose.dosage}</span></h4>
          </div>
          
          <div class="relative inline-flex items-center cursor-pointer toggle-historical-dose group" data-id="${dose.id}" data-time="${dose.time}" data-date="${dateStr}" data-action="${dose.taken ? 'unmark' : 'mark'}">
            <div class="w-14 h-8 rounded-full transition-colors duration-300 ease-in-out relative flex items-center shadow-inner ${dose.taken ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/10 border-red-500/30'} border">
              <div class="w-6 h-6 rounded-full absolute transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center shadow-md ${dose.taken ? 'translate-x-7 bg-green-500' : 'translate-x-1 bg-red-500/80'}">
                 ${dose.taken 
                   ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0407" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` 
                   : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a0a12" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
                 }
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }

    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100');
    sheet.classList.remove('translate-y-full');
    sheet.classList.add('translate-y-0');
  }

  hideModal() {
    const modal = this.container.querySelector('#day-modal');
    const sheet = this.container.querySelector('#day-modal-sheet');
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0', 'pointer-events-none');
    sheet.classList.remove('translate-y-0');
    sheet.classList.add('translate-y-full');
  }

  destroy() {}
}