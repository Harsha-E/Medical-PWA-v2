import db from '../core/db.js';
import state from '../core/state.js';
import { showToast, setupPullToRefresh } from '../core/ui.js';
import { escapeHTML } from '../core/utils.js';
import app from '../app.js';

export default class AppointmentsView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'w-full h-full flex flex-col overflow-hidden';

    // Immediate skeleton before async data
    this.container.innerHTML = `
      <main class="flex-1 overflow-y-auto md:px-12 pt-[112px] md:pt-8 md:pl-64 lg:pl-72 md:pt-8 md:pl-64 lg:pl-72 md:pt-8 pb-28 w-full max-w-7xl mx-auto md:grid md:grid-cols-2 md:gap-12" style="padding-left:0; padding-right:0;">
<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">
        <div>
          <div class="skeleton" style="height:12px; width:100px; margin-bottom:20px;"></div>
          <div class="skeleton skeleton-card" style="height:130px; margin-bottom:16px;"></div>
          <div class="skeleton skeleton-card" style="height:130px; margin-bottom:16px;"></div>
        </div>
        <div class="hidden md:block">
          <div class="skeleton" style="height:12px; width:80px; margin-bottom:20px;"></div>
          <div class="skeleton skeleton-card" style="height:100px; opacity:0.6;"></div>
        </div>
      </div></main>
    `;

    const appointments = await db.appointments.toArray();
    appointments.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const now = new Date();
    const upcoming = appointments.filter(a => new Date(a.date) >= now);
    const past = appointments.filter(a => new Date(a.date) < now);

    const renderAppt = (appt, isUpcoming) => `
      <div class="clay-glass-panel p-6 mb-4 ${!isUpcoming ? 'opacity-60 border-border bg-surface-elevated/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]' : 'border-primary/50 bg-surface-elevated/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]'} text-text-primary transition-all rounded-2xl">
          <div class="flex justify-between items-start mb-4">
              <div>
                  ${isUpcoming ? `<span class="text-xs font-bold text-accent-primary uppercase tracking-widest bg-primary/20 px-2 py-1 rounded-lg border border-primary/30">Scheduled</span>` : ''}
                  <h4 class="${isUpcoming ? 'text-2xl mt-4 text-accent-primary' : 'text-lg text-text-primary'} font-display italic">${escapeHTML(appt.title)}</h4>
              </div>
              <div class="text-right">
                  <p class="${isUpcoming ? 'text-xl text-text-primary' : 'text-sm text-accent-primary/80'} font-bold leading-none">${escapeHTML(appt.time) || '--:--'}</p>
                  <p class="text-xs uppercase font-bold text-accent-primary/60 mt-2 tracking-widest">${new Date(appt.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' }).toUpperCase()}</p>
              </div>
          </div>
          <div class="flex flex-col gap-2 pt-4 border-t ${isUpcoming ? 'border-primary/30' : 'border-border'}">
              <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center shadow-sm text-accent-primary">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div>
                      <p class="text-xs font-bold text-text-primary/90">${escapeHTML(appt.provider) || 'Unknown Provider'}</p>
                  </div>
              </div>
              ${appt.location ? `<p class="text-xs text-text-secondary font-mono mt-1 ml-13">📍 ${escapeHTML(appt.location)}</p>` : ''}
              ${appt.notes ? `<p class="text-xs text-text-muted italic mt-1 ml-13">📝 ${escapeHTML(appt.notes)}</p>` : ''}
              ${appt.reminder ? `<p class="text-xs text-success/70 font-bold uppercase tracking-widest mt-1 ml-13">⏰ Reminder Active</p>` : ''}
          </div>
      </div>
    `;

    this.container.innerHTML = `
      <main class="flex-1 overflow-y-auto md:px-12 pt-[112px] md:pt-8 md:pl-64 lg:pl-72 md:pt-8 md:pl-64 lg:pl-72 md:pt-8 pb-28 w-full max-w-7xl mx-auto md:grid md:grid-cols-2 md:gap-12" style="padding-left:0; padding-right:0;">
<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">
        <section class="mb-12">
            <h3 class="text-xs text-uppercase font-bold text-accent-primary/70 mb-6 tracking-[0.2em] px-1 uppercase">Upcoming</h3>
            <div class="space-y-4">
                ${upcoming.length ? upcoming.map(a => renderAppt(a, true)).join('') : '<p class="text-xs text-accent-primary/50 font-display italic pl-1">No upcoming appointments.</p>'}
            </div>
        </section>

        <section class="mb-12">
            <h3 class="text-xs text-uppercase font-bold text-accent-primary/70 mb-6 tracking-[0.2em] px-1 uppercase">Past Consultations</h3>
            <div class="space-y-4">
                ${past.length ? past.map(a => renderAppt(a, false)).join('') : '<p class="text-xs text-accent-primary/50 font-display italic pl-1">No past history found.</p>'}
            </div>
        </section>
      </div></main>

    `;

    document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/appointments' } }));
    this.attachListeners();
    return this.container;
  }

  attachListeners() {
    app.appHeader.on('add-appt', () => {
        const modalHtml = `
          <div id="appt-modal" class="fixed inset-0 z-[9999] bg-overlay-bg backdrop-blur-md flex items-center justify-center p-4">
            <div class="bg-surface-elevated/60 backdrop-blur-2xl border border-border rounded-[2rem] p-6 w-full max-w-sm shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
              <h2 class="text-xl font-display text-text-primary mb-6">New Appointment</h2>
              <div class="space-y-4">
                <input type="text" id="appt-title" placeholder="Title (e.g., Dentist)" class="w-full btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                <input type="text" id="appt-provider" placeholder="Provider (e.g., Dr. Smith)" class="w-full btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                <input type="text" id="appt-location" placeholder="Location or Link" class="w-full btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                <div class="flex gap-2">
                  <input type="date" id="appt-date" class="flex-1 btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2" style="color-scheme: dark;">
                  <input type="time" id="appt-time" class="flex-1 btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2" style="color-scheme: dark;">
                </div>
                <textarea id="appt-notes" placeholder="Pre-appointment notes..." rows="2" class="w-full btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2"></textarea>
                <label class="flex items-center gap-3 text-text-primary text-sm cursor-pointer mt-2">
                  <input type="checkbox" id="appt-reminder" class="w-4 h-4 accent-accent-primary">
                  Set Reminder Notification
                </label>
              </div>
              <div class="flex gap-3 mt-8">
                <button id="appt-cancel" class="flex-1 py-3.5 rounded-xl text-text-secondary font-bold uppercase text-xs tracking-widest transition-colors btn-neumorphic">Cancel</button>
                <button id="appt-save" class="flex-1 py-3.5 rounded-xl btn-neumorphic-primary font-bold uppercase text-xs tracking-widest".replace(/s+/g, ' ').trim()>Save</button>
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
          const location = document.getElementById('appt-location').value.trim();
          const date = document.getElementById('appt-date').value;
          const time = document.getElementById('appt-time').value;
          const notes = document.getElementById('appt-notes').value.trim();
          const reminder = document.getElementById('appt-reminder').checked;

          if (!title || !provider || !date || !time) {
            showToast('Please fill all required fields (Title, Provider, Date, Time)', 'error');
            return;
          }

          const newAppointment = { userId: state.user?.uid || 'anonymous', title, provider, location, date, time, notes, reminder };
          try {
              await db.appointments.add(newAppointment);
              showToast('Appointment added.');
              div.remove();
              const newHtml = await this.render();
              this.container.parentNode.replaceChild(newHtml, this.container);
          } catch (e) {
              showToast('Failed to add appointment', 'error');
              console.error(e);
          }
        };
    });
  }

  destroy() {}
}

