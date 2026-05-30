import db from '../core/db.js';
import state from '../core/state.js';

export default class AppointmentsView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';

    const appointments = await db.appointments.toArray();
    appointments.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const now = new Date();
    const upcoming = appointments.filter(a => new Date(a.date) >= now);
    const past = appointments.filter(a => new Date(a.date) < now);

    const renderAppt = (appt, isUpcoming) => `
      <div class="glass-panel p-6 mb-4 ${!isUpcoming ? 'opacity-60 border-[#7f2f5d]/30 bg-white/5' : 'border-[#ca5229]/50 bg-gradient-to-br from-white/5 to-[#ca5229]/10 shadow-lg shadow-[#ca5229]/10'} text-white transition-all">
          <div class="flex justify-between items-start mb-4">
              <div>
                  ${isUpcoming ? `<span class="text-xs font-bold text-[#ffb88c] uppercase tracking-widest bg-[#ca5229]/20 px-2 py-1 rounded-lg border border-[#ca5229]/30">Scheduled</span>` : ''}
                  <h4 class="${isUpcoming ? 'text-2xl mt-4 text-[#ffb88c]' : 'text-lg text-white'} font-display italic">${appt.title}</h4>
              </div>
              <div class="text-right">
                  <p class="${isUpcoming ? 'text-xl text-white' : 'text-sm text-[#ffb88c]/80'} font-bold leading-none">${appt.time || '--:--'}</p>
                  <p class="text-xs uppercase font-bold text-[#ffb88c]/60 mt-2 tracking-widest">${new Date(appt.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' }).toUpperCase()}</p>
              </div>
          </div>
          <div class="flex items-center gap-3 pt-4 border-t ${isUpcoming ? 'border-[#ca5229]/30' : 'border-[#7f2f5d]/30'}">
              <div class="w-10 h-10 rounded-xl bg-[#1a0a12] border border-[#7f2f5d]/40 flex items-center justify-center shadow-sm text-[#ffb88c]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div>
                  <p class="text-xs font-bold text-white/90">${appt.provider || 'Unknown Provider'}</p>
              </div>
          </div>
      </div>
    `;

    this.container.innerHTML = `
      <header class="view-header px-6">
        <div class="flex flex-col">
          <span class="text-xs text-uppercase text-[#ffb88c]/70 uppercase font-bold tracking-widest leading-none">Clinical Calendar</span>
          <h1 class="text-2xl font-display mt-1 text-white leading-none">Appointments</h1>
        </div>
        <div class="flex gap-2">
          <a href="#/calendar" class="bg-[#1a0a12] border border-[#7f2f5d]/50 text-[#ffb88c] px-3 h-11 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </a>
          <button id="add-appointment-btn" class="bg-gradient-to-br from-[#7f2f5d] to-[#ca5229] border border-[#ffb88c]/30 text-[#ffb88c] w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-[#ca5229]/20 active:scale-90 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </header>

      <main class="scroll-area px-6 pt-28 pb-12 bg-[#1a0a12]">
        <section class="mb-12">
            <h3 class="text-xs text-uppercase font-bold text-[#ffb88c]/70 mb-6 tracking-[0.2em] px-1 uppercase">Upcoming</h3>
            ${upcoming.length ? upcoming.map(a => renderAppt(a, true)).join('') : '<p class="text-xs text-[#ffb88c]/50 font-display italic pl-1">No upcoming appointments.</p>'}
        </section>

        <section class="mb-12">
            <h3 class="text-xs text-uppercase font-bold text-[#ffb88c]/70 mb-6 tracking-[0.2em] px-1 uppercase">Past Consultations</h3>
            <div class="space-y-4">
                ${past.length ? past.map(a => renderAppt(a, false)).join('') : '<p class="text-xs text-[#ffb88c]/50 font-display italic pl-1">No past history found.</p>'}
            </div>
        </section>
      </main>

      <style>
        .view-header { position: fixed; top: 0; left: 0; right: 0; height: 80px; background: rgba(26, 10, 18, 0.85); backdrop-filter: blur(24px); border-bottom: 1px solid rgba(127, 47, 93, 0.3); display: flex; align-items: center; justify-content: space-between; z-index: 100; }
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
    this.container.querySelector('#add-appointment-btn').addEventListener('click', () => {
        const modalHtml = `
          <div id="appt-modal" class="fixed inset-0 z-[9999] bg-[#0a0407]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-[#1a0a12] border border-[#7f2f5d]/50 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl">
              <h2 class="text-xl font-display text-white mb-6">New Appointment</h2>
              <div class="space-y-4">
                <input type="text" id="appt-title" placeholder="Title (e.g., Dentist)" class="w-full bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ffb88c]/50">
                <input type="text" id="appt-provider" placeholder="Provider (e.g., Dr. Smith)" class="w-full bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ffb88c]/50">
                <input type="date" id="appt-date" class="w-full bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ffb88c]/50" style="color-scheme: dark;">
                <input type="time" id="appt-time" class="w-full bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ffb88c]/50" style="color-scheme: dark;">
              </div>
              <div class="flex gap-3 mt-8">
                <button id="appt-cancel" class="flex-1 py-3.5 rounded-xl border border-[#7f2f5d]/50 text-gray-400 font-bold uppercase text-xs tracking-widest hover:bg-white/5 transition-colors">Cancel</button>
                <button id="appt-save" class="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#7f2f5d] to-[#ca5229] text-white font-bold uppercase text-xs tracking-widest shadow-lg shadow-[#ca5229]/20 active:scale-95 transition-transform">Save</button>
              </div>
            </div>
          </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div);

        document.getElementById('appt-cancel').onclick = () => div.remove();
        document.getElementById('appt-save').onclick = async () => {
          const title = document.getElementById('appt-title').value.trim();
          const provider = document.getElementById('appt-provider').value.trim();
          const date = document.getElementById('appt-date').value;
          const time = document.getElementById('appt-time').value;

          if (!title || !provider || !date || !time) {
            this._showToast('Please fill all fields', 'error');
            return;
          }

          const newAppointment = { userId: state.user?.uid || 'anonymous', title, provider, date, time };
          try {
              await db.appointments.add(newAppointment);
              this._showToast('Appointment added.');
              div.remove();
              const newHtml = await this.render();
              this.container.parentNode.replaceChild(newHtml, this.container);
          } catch (e) {
              this._showToast('Failed to add appointment', 'error');
              console.error(e);
          }
        };
    });
  }

  destroy() {}
}