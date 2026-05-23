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
      <div class="glass-panel p-6 mb-4 ${!isUpcoming ? 'opacity-60' : 'border-primary bg-primary/5 shadow-xl shadow-orange-50'}">
          <div class="flex justify-between items-start mb-4">
              <div>
                  ${isUpcoming ? `<span class="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-lg">Scheduled</span>` : ''}
                  <h4 class="${isUpcoming ? 'text-2xl mt-4' : 'text-lg'} font-display italic">${appt.title}</h4>
              </div>
              <div class="text-right">
                  <p class="${isUpcoming ? 'text-xl' : 'text-sm'} font-bold leading-none">${appt.time || '--:--'}</p>
                  <p class="text-[9px] uppercase font-bold text-muted mt-2 tracking-widest">${new Date(appt.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' }).toUpperCase()}</p>
              </div>
          </div>
          <div class="flex items-center gap-3 pt-4 border-t ${isUpcoming ? 'border-primary/20' : 'border-border'}">
              <div class="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div>
                  <p class="text-xs font-bold text-text-primary">${appt.provider || 'Unknown Provider'}</p>
              </div>
          </div>
      </div>
    `;

    this.container.innerHTML = `
      <header class="view-header px-6">
        <div class="flex flex-col">
          <span class="text-xs text-uppercase text-muted uppercase">Clinical Calendar</span>
          <h1 class="text-2xl font-display mt-1">Appointments</h1>
        </div>
        <button id="add-appointment-btn" class="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </header>

      <main class="scroll-area px-6 pt-28 pb-12">
        <section class="mb-12">
            <h3 class="text-[10px] text-uppercase font-bold text-muted mb-6 tracking-[0.2em] px-1 uppercase">Upcoming</h3>
            ${upcoming.length ? upcoming.map(a => renderAppt(a, true)).join('') : '<p class="text-xs text-muted font-display italic pl-1">No upcoming appointments.</p>'}
        </section>

        <section class="mb-12">
            <h3 class="text-[10px] text-uppercase font-bold text-muted mb-6 tracking-[0.2em]">Past Consultations</h3>
            <div class="space-y-4">
                ${past.length ? past.map(a => renderAppt(a, false)).join('') : '<p class="text-xs text-muted font-display italic pl-1">No past history found.</p>'}
            </div>
        </section>
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
    this.container.querySelector('#add-appointment-btn').addEventListener('click', async () => {
        const title = prompt("Appointment title (e.g., 'Dentist Checkup'):");
        if (!title) return;
        const provider = prompt("Provider (e.g., 'Dental Care Clinic'):");
        if (!provider) return;
        const date = prompt("Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
        if (!date) return;
        const time = prompt("Time (HH:MM):", "10:00");
        if (!time) return;

        const newAppointment = { userId: state.user.uid, title, provider, date, time };
        try {
            await db.appointments.add(newAppointment);
            this._showToast('Appointment added.');
            setTimeout(() => window.location.reload(), 1000);
        } catch (e) {
            this._showToast('Failed to add appointment', 'error');
            console.error(e);
        }
    });
  }

  destroy() {}
}