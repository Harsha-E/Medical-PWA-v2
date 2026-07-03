import db from '../core/db.js';
import state from '../core/state.js';
import { escapeHTML } from '../core/utils.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import ReportStorageManager from '../services/reports/ReportStorageManager.js';
import ReportParser from '../services/reports/ReportParser.js';
import WalkthroughEngine from '../experience/WalkthroughEngine.js';
import FeatureDiscoveryEngine from '../services/onboarding/FeatureDiscoveryEngine.js';
import { guidanceEngine } from '../experience/GuidanceEngine.js';
import { visualLanguageEngine } from '../experience/VisualLanguageEngine.js';
import { clayComponentSystem } from '../experience/ClayComponentSystem.js';

export default class DashboardView {
  async render() {
    visualLanguageEngine.applyTheme();
    
    this.container = document.createElement('div');
    this.container.className = 'w-full h-full flex flex-col overflow-hidden';

    // Instantly return skeleton structure to router without blocking
    this.container.innerHTML = this._getSkeletonUI();

    // Setup inactivity monitor (Disabled during scan)
    this._resetInactivityTimerBound = () => {
      // guidanceEngine.monitorInactivity('dashboard');
    };

    // Trigger independent async loads
    this._loadDashboardData();
    this.attachListeners();
    return this.container;
  }

  async _loadDashboardData() {
    try {
      const medsPromise = db.medications.toArray().catch(e => {
          console.error('[Diagnostics] Local ledger failure:', e);
          return [];
      });
      const dosesPromise = db.doses.toArray().catch(() => []);
      const historyPromise = db.history.toArray().catch(() => []);
      const familyPromise = db.family.toArray().catch(() => []);

      const [meds, doses, history, family] = await Promise.all([
        medsPromise,
        dosesPromise,
        historyPromise,
        familyPromise
      ]);

      this._renderDashboardWidgets(meds, doses, history, family);

      // Trigger Onboarding Walkthrough if not completed (Disabled for now)
      // this.walkthrough = new WalkthroughManager();
      // if (!this.walkthrough.isWalkthroughCompleted()) {
      //   // Start walkthrough after a brief delay for UI parsing
      //   setTimeout(() => this._startDashboardWalkthrough(), 1200);
      // }

      // Trigger Feature Discovery
      const discoveryEngine = new FeatureDiscoveryEngine();
      discoveryEngine.shouldDiscover('scanner').then(unlocked => {
        if (unlocked) {
          this._showDiscoveryTip('scanner', 'New Feature Unlocked: Vision Scanner! You can scan prescription labels to add medicines automatically.');
          discoveryEngine.markAsDiscovered('scanner');
        }
      });

      // Start inactivity monitoring
      this._resetInactivityTimerBound();
      document.addEventListener('click', this._resetInactivityTimerBound);
      document.addEventListener('keydown', this._resetInactivityTimerBound);

      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
      const displayName = state.user?.displayName?.split(' ')[0] || 'User';
      document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/dashboard', title: `Good ${greeting}, ${displayName}` } }));
    } catch (err) {
      console.error('[Dashboard] Data loading failure:', err);
    }
  }

  _renderDashboardWidgets(meds, doses, history, family) {
    const mainContent = this.container.querySelector('#dashboard-main-content');
    if (!mainContent) return;

    // --- 1. Notification Banner Logic ---
    const isNotificationsEnabled = localStorage.getItem('setting-notifications') !== 'false';
    const currentMedsCount = meds.length;
    const lastMedsCount = Number(localStorage.getItem('medications-count-last') || 0);
    if (currentMedsCount > lastMedsCount) {
      localStorage.removeItem('notifications-banner-dismissed');
      localStorage.setItem('medications-count-last', currentMedsCount.toString());
    }

    let showBanner = false;
    if (!isNotificationsEnabled) {
      const dismissedAt = localStorage.getItem('notifications-banner-dismissed');
      if (!dismissedAt) {
        showBanner = true;
      } else {
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - Number(dismissedAt) > thirtyDays) {
          showBanner = true;
        }
      }
    }

    let bannerHTML = '';
    if (showBanner) {
      bannerHTML = `
        <div id="notifications-disabled-banner" class="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 flex items-start justify-between gap-3 animate-fade-in relative overflow-hidden backdrop-blur-md">
          <div class="flex gap-3">
            <div class="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </div>
            <div>
              <p class="text-xs font-bold text-text-primary uppercase tracking-wider">Medicine Reminders Off</p>
              <p class="text-[11px] text-text-secondary mt-1 leading-relaxed">Medicine reminders are currently turned off. Turn them on in settings if you'd like help remembering medicines and health checks.</p>
            </div>
          </div>
          <button id="dismiss-banner-btn" class="text-text-secondary hover:text-text-primary p-1 rounded-lg transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
    }

    // --- 2. Today's Schedule Calculations ---
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayDoses = doses.filter(d => d.takenAt && d.takenAt.startsWith(todayStr));
    const takenSlots = new Set(
      todayDoses.filter(d => d.status === 'taken' || !d.skipped).map(d => `${d.medicationId}-${d.scheduledTime}`)
    );

    const schedule = meds.flatMap(m => {
      if (m.active === false) return [];
      if (m.startDate && todayStr < m.startDate) return [];
      if (m.endDate && todayStr > m.endDate) return [];

      const times = Array.isArray(m.times) && m.times.length > 0 ? m.times : ['08:00'];
      return times.map(t => {
        const [h, min] = t.split(':').map(Number);
        const d = new Date();
        d.setHours(h, min, 0, 0);
        return {
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          dosageUnit: m.dosageUnit || 'mg',
          time: t,
          date: d,
          taken: takenSlots.has(`${m.id}-${t}`)
        };
      });
    }).sort((a, b) => a.date - b.date);

    const remainingCount = schedule.filter(d => !d.taken).length;

    // --- 3. Next Reminder Calculations ---
    const nextDose = schedule.find(d => d.date >= now && !d.taken);
    let nextReminderHTML = '';
    if (nextDose) {
      nextReminderHTML = `
        <div class="clay-glass-panel rounded-3xl p-6 relative overflow-hidden animate-fade-in group">
          <div class="absolute -right-8 -top-8 w-24 h-24 bg-accent-primary/10 rounded-full blur-2xl group-hover:bg-accent-primary/20 transition-all duration-500"></div>
          <div class="flex justify-between items-start relative z-10">
            <div>
              <span class="text-xs font-bold text-accent-primary uppercase tracking-[0.2em] mb-1 block">Next Medicine</span>
              <h3 class="text-xl font-bold text-text-primary leading-tight mt-1">${escapeHTML(nextDose.name)}</h3>
              <p class="text-xs text-text-secondary mt-1.5 uppercase font-bold tracking-widest">${escapeHTML(nextDose.dosage)} ${escapeHTML(nextDose.dosageUnit)} at ${escapeHTML(nextDose.time)}</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
          </div>
        </div>
      `;
    } else if (schedule.length > 0) {
      nextReminderHTML = `
        <div class="clay-glass-panel rounded-3xl p-6 text-center animate-fade-in">
          <div class="w-10 h-10 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mx-auto mb-3 text-success">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p class="text-xs text-text-secondary font-bold uppercase tracking-widest">All medicines taken for today!</p>
        </div>
      `;
    } else {
      nextReminderHTML = `
        <div class="clay-glass-panel rounded-3xl p-6 text-center animate-fade-in">
          <div class="w-10 h-10 rounded-full bg-text-muted/10 border border-text-muted/20 flex items-center justify-center mx-auto mb-3 text-text-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </div>
          <p class="text-xs text-text-secondary font-bold uppercase tracking-widest">No scheduled medicines today</p>
        </div>
      `;
    }

    // --- 4. Recent Health Reports ---
    const currentMonthStr = todayStr.substring(0, 7);
    const reportsThisMonth = history.filter(r => r.type === 'Report' && r.date && r.date.startsWith(currentMonthStr)).length;

    // --- 5. Family Updates (Refill alerts & dependencies) ---
    const lowStockMeds = meds.filter(m => m.active !== false && m.totalQuantity !== undefined && m.refillThreshold !== undefined && m.totalQuantity <= m.refillThreshold);
    let familyAlertsHTML = '';
    if (lowStockMeds.length > 0) {
      familyAlertsHTML = lowStockMeds.map(m => `
        <div class="flex items-start gap-3 p-3 bg-warning/5 border border-warning/20 rounded-xl">
          <div class="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning shrink-0 mt-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>
          </div>
          <div>
            <p class="text-xs font-bold text-text-primary">Stock Alert: ${escapeHTML(m.name)}</p>
            <p class="text-[10px] text-text-secondary mt-0.5">Only ${m.totalQuantity} table${m.totalQuantity !== 1 ? 'ts' : ''} left. A refill is due soon.</p>
          </div>
        </div>
      `).join('');
    } else if (family.length > 0) {
      familyAlertsHTML = `
        <div class="flex items-center gap-3 p-3 bg-success/5 border border-success/15 rounded-xl">
          <div class="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center text-success shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p class="text-[11px] text-text-secondary leading-relaxed">All family medicine stocks look healthy!</p>
        </div>
      `;
    } else {
      familyAlertsHTML = `
        <div class="text-center py-4 opacity-50">
          <p class="text-[11px] text-text-muted uppercase tracking-widest font-bold">No active family nodes</p>
          <a href="#/family-profiles" class="text-[10px] text-accent-primary font-bold uppercase tracking-widest mt-1 inline-block hover:underline">Add family member</a>
        </div>
      `;
    }

    // --- 6. Monthly Health Follow-Up ---
    const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastHbA1c = sortedHistory.find(r => r.metrics?.hba1c !== undefined || (r.title && r.title.toLowerCase().includes('hba1c')));
    const lastBP = sortedHistory.find(r => (r.metrics?.systolic !== undefined && r.metrics?.diastolic !== undefined) || (r.title && r.title.toLowerCase().includes('bp')));
    const lastThyroid = sortedHistory.find(r => r.metrics?.tsh !== undefined || (r.title && r.title.toLowerCase().includes('tsh') || r.title && r.title.toLowerCase().includes('thyroid')));

    const getDaysAgo = (dateStr) => {
      if (!dateStr) return null;
      const diffTime = Math.abs(new Date() - new Date(dateStr));
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getMonthsAgo = (dateStr) => {
      if (!dateStr) return null;
      const diffTime = Math.abs(new Date() - new Date(dateStr));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.floor(diffDays / 30);
    };

    const formatDaysStr = (days) => {
      if (days === null) return 'Never';
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      return `${days} days ago`;
    };

    const formatMonthsStr = (months, days) => {
      if (months === null) return 'Never';
      if (days < 30) {
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return `${days} days ago`;
      }
      if (months === 1) return '1 month ago';
      return `${months} months ago`;
    };

    const hba1cDays = getDaysAgo(lastHbA1c?.date);
    const bpDays = getDaysAgo(lastBP?.date);
    const thyroidMonths = getMonthsAgo(lastThyroid?.date);
    const thyroidDays = getDaysAgo(lastThyroid?.date);

    const hba1cStr = formatDaysStr(hba1cDays);
    const bpStr = formatDaysStr(bpDays);
    const thyroidStr = formatMonthsStr(thyroidMonths, thyroidDays);

    // --- 7. Health Progress (Streaks Replacement) ---
    let weekExpected = 0;
    let weekTaken = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      meds.forEach(m => {
        if (m.active !== false) {
          if (m.startDate && dateStr < m.startDate) return;
          if (m.endDate && dateStr > m.endDate) return;
          const times = Array.isArray(m.times) ? m.times.length : 1;
          weekExpected += times;
        }
      });

      const dosesOnDay = doses.filter(dose => dose.takenAt && dose.takenAt.startsWith(dateStr) && dose.status === 'taken');
      weekTaken += dosesOnDay.length;
    }
    const weeklyPct = weekExpected > 0 ? Math.round((weekTaken / weekExpected) * 100) : 0;

    const currentYear = new Date().getFullYear().toString();
    const reportsThisYear = history.filter(r => 
      (r.type === 'Report' || r.type === 'Disease' || r.type === 'Surgery' || r.type === 'Vaccination') && 
      r.date && r.date.startsWith(currentYear)
    ).length;

    const hba1cTrend = history
      .filter(r => r.metrics?.hba1c !== undefined)
      .map(r => ({ date: r.date, value: r.metrics.hba1c }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (hba1cTrend.length === 0) {
      for (const r of history) {
        if (r.type === 'Report' && r.title && r.title.toLowerCase().includes('hba1c')) {
          const valMatch = r.title.match(/(\d+(?:\.\d+)?)/);
          if (valMatch) {
            hba1cTrend.push({ date: r.date, value: parseFloat(valMatch[1]) });
          }
        }
      }
      hba1cTrend.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Assemble final HTML inside the container
    mainContent.innerHTML = `
      ${bannerHTML}
      <div class="md:grid md:grid-cols-12 md:gap-10 md:items-start w-full">
        <!-- Left Column -->
        <div class="md:col-span-7 lg:col-span-8 flex flex-col gap-8">
          
          <!-- Today's Medicines Widget -->
          <section id="dashboard-schedule-section" class="clay-glass-panel rounded-3xl p-6 relative">
            <div class="flex items-center justify-between mb-6 pb-2 border-b border-border">
              <div>
                <h2 class="text-xs text-accent-primary font-bold tracking-[0.2em] uppercase">Taking Medicines</h2>
                <p class="text-[10px] text-text-secondary uppercase tracking-wider font-bold mt-1">
                  ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <span class="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${remainingCount > 0 ? 'bg-accent-soft/30 text-accent-primary' : (schedule.length > 0 ? 'bg-success/20 text-success' : 'bg-surface-deep text-text-secondary')}">
                ${remainingCount > 0 ? `${remainingCount} Remaining` : (schedule.length > 0 ? 'All Taken!' : 'No Schedule')}
              </span>
            </div>

            <div class="space-y-4">
              ${schedule.length > 0 ? schedule.map(dose => `
                <div class="flex items-center justify-between p-4 bg-surface/50 border ${dose.taken ? 'border-success/30 bg-success/5' : 'border-border'} rounded-2xl transition-all duration-300 ${dose.taken ? 'opacity-70' : ''}">
                  <div class="flex items-center gap-4">
                    <div class="checkbox-container cursor-pointer" data-med-id="${dose.id}" data-time="${dose.time}" data-taken="${dose.taken}">
                      ${clayComponentSystem.renderOrb(dose.dosageUnit?.toLowerCase() === 'ml' ? 'drop' : 'pill', dose.taken ? 'completed' : 'active').outerHTML}
                    </div>
                    <div>
                      <p class="text-sm font-bold text-text-primary ${dose.taken ? 'line-through text-text-muted' : ''}">${escapeHTML(dose.name)}</p>
                      <p class="text-[10px] text-text-secondary mt-0.5 uppercase tracking-widest font-bold">${escapeHTML(dose.time)} &bull; ${escapeHTML(dose.dosage)} ${escapeHTML(dose.dosageUnit)}</p>
                    </div>
                  </div>
                </div>
              `).join('') : `
                <div class="py-8 text-center border border-dashed border-border rounded-3xl">
                  <p class="text-xs text-text-muted font-mono uppercase tracking-widest">No scheduled doses today.</p>
                  <a href="#/add-medication" class="text-accent-primary text-xs font-bold mt-2 uppercase inline-block hover:underline">Add medication</a>
                </div>
              `}
            </div>
          </section>

          <!-- Next Reminder Widget -->
          <section id="dashboard-next-reminder">
            ${nextReminderHTML}
          </section>

          <!-- Monthly Health Follow-Up Widget -->
          <section id="dashboard-followup-section">
            <div class="clay-glass-panel rounded-3xl p-6">
              <h3 class="text-xs font-bold text-text-secondary uppercase tracking-[0.2em] mb-4 pb-2 border-b border-border">Monthly Health Follow-Up</h3>
              <div class="space-y-4">
                <!-- HbA1c row -->
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-bold text-text-primary">HbA1c Level</p>
                    <p class="text-xs text-text-secondary mt-0.5">Last test: ${hba1cStr}</p>
                  </div>
                  <button class="add-followup-btn px-4 py-2 rounded-xl text-xs font-bold text-accent-primary uppercase tracking-widest border border-accent-primary/20 hover:border-accent-primary hover:bg-accent-soft/10 transition-all active:scale-95" data-type="hba1c">
                    Add
                  </button>
                </div>
                <!-- BP row -->
                <div class="flex items-center justify-between border-t border-border pt-4">
                  <div>
                    <p class="text-sm font-bold text-text-primary">Blood Pressure</p>
                    <p class="text-xs text-text-secondary mt-0.5">Last reading: ${bpStr}</p>
                  </div>
                  <button class="add-followup-btn px-4 py-2 rounded-xl text-xs font-bold text-accent-primary uppercase tracking-widest border border-accent-primary/20 hover:border-accent-primary hover:bg-accent-soft/10 transition-all active:scale-95" data-type="bp">
                    Add
                  </button>
                </div>
                <!-- Thyroid row -->
                <div class="flex items-center justify-between border-t border-border pt-4">
                  <div>
                    <p class="text-sm font-bold text-text-primary">Thyroid (TSH)</p>
                    <p class="text-xs text-text-secondary mt-0.5">Last test: ${thyroidStr}</p>
                  </div>
                  <button class="add-followup-btn px-4 py-2 rounded-xl text-xs font-bold text-accent-primary uppercase tracking-widest border border-accent-primary/20 hover:border-accent-primary hover:bg-accent-soft/10 transition-all active:scale-95" data-type="thyroid">
                    Add
                  </button>
                </div>
              </div>
            </div>
          </section>

        </div>

        <!-- Right Column -->
        <div class="md:col-span-5 lg:col-span-4 mt-10 md:mt-0 flex flex-col gap-6">
          
          <!-- Health Progress (Streaks Replacement) Widget -->
          <section id="dashboard-progress-section">
            <div class="clay-glass-panel rounded-3xl p-6 overflow-hidden">
              <h3 class="text-xs font-bold text-text-secondary uppercase tracking-[0.2em] mb-5 pb-2 border-b border-border">Health Progress</h3>
              
              <div class="space-y-6">
                <!-- Medicines Taken This Week -->
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-text-secondary uppercase tracking-widest">Taking Medicines This Week</span>
                    <span class="text-xs font-bold text-success uppercase tracking-widest">${weekTaken} / ${weekExpected}</span>
                  </div>
                  <div class="w-full h-2 bg-surface rounded-full overflow-hidden border border-border">
                    <div class="h-full bg-gradient-to-r from-secondary to-accent-primary transition-all duration-1000 relative" style="width: ${weeklyPct}%">
                      <div class="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                </div>

                <!-- Reports Added This Year -->
                <div class="flex justify-between items-center border-t border-border pt-4">
                  <span class="text-xs font-bold text-text-secondary uppercase tracking-widest">Reports Added This Year</span>
                  <span class="text-xs font-bold text-accent-primary uppercase tracking-widest">${reportsThisYear} report${reportsThisYear !== 1 ? 's' : ''}</span>
                </div>

                <!-- Health Journey -->
                <div class="border-t border-border pt-4">
                  <span class="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3 block">Health Journey (HbA1c)</span>
                  <div class="w-full h-32 flex items-center justify-center bg-surface-deep/30 rounded-2xl border border-border/50 p-2 overflow-hidden relative">
                    ${this._renderHbA1cChart(hba1cTrend)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Family Updates Widget -->
          <section id="dashboard-family-section">
            <div class="clay-glass-panel rounded-3xl p-6">
              <div class="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <h3 class="text-xs font-bold text-text-secondary uppercase tracking-[0.2em]">Family Updates</h3>
                <a href="#/peer-hub" class="text-[10px] font-bold text-accent-primary uppercase tracking-widest hover:text-text-primary">Manage Network</a>
              </div>
              <div class="space-y-3">
                ${familyAlertsHTML}
              </div>
            </div>
          </section>

          <!-- Recent Health Reports Widget -->
          <section id="dashboard-recent-reports-section">
            <div class="clay-glass-panel rounded-2xl p-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-secondary/15 border border-border flex items-center justify-center text-accent-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div>
                  <p class="text-xs font-bold text-text-primary uppercase tracking-wider">Recent Reports</p>
                  <p class="text-[11px] text-text-secondary mt-0.5">${reportsThisMonth} report${reportsThisMonth !== 1 ? 's' : ''} added this month</p>
                </div>
              </div>
              <a href="#/reports" class="text-xs font-bold text-accent-primary hover:text-text-primary uppercase tracking-widest transition-colors">View</a>
            </div>
          </section>

        </div>
      </div>
    `;
  }

  _renderHbA1cChart(trend) {
    if (!trend || trend.length === 0) {
      return `<p class="text-[11px] text-text-muted uppercase font-bold tracking-widest">No HbA1c records yet</p>`;
    }
    
    if (trend.length === 1) {
      const date = new Date(trend[0].date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return `
        <div class="flex flex-col items-center justify-center">
          <span class="text-2xl font-bold text-accent-primary">${trend[0].value}%</span>
          <span class="text-[10px] text-text-secondary uppercase tracking-widest mt-1">First reading: ${date}</span>
        </div>
      `;
    }

    const vals = trend.map(t => t.value);
    let minVal = Math.min(...vals) - 0.5;
    let maxVal = Math.max(...vals) + 0.5;
    if (maxVal === minVal) {
      maxVal = minVal + 1.0;
      minVal = minVal - 1.0;
    }

    const width = 280;
    const height = 70;
    const paddingX = 30;
    const paddingY = 15;

    const points = trend.map((t, i) => {
      const x = paddingX + (i / (trend.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - ((t.value - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
      return { x, y, val: t.value, date: t.date };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    const svgContent = `
      <svg width="100%" height="100%" viewBox="0 0 ${width} ${height + 20}" class="overflow-visible">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-accent-primary)" stop-opacity="0.25"></stop>
            <stop offset="100%" stop-color="var(--color-accent-primary)" stop-opacity="0.00"></stop>
          </linearGradient>
        </defs>
        
        <path d="${areaD}" fill="url(#chartGrad)" />
        <path d="${pathD}" fill="none" stroke="var(--color-accent-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        
        ${points.map(p => `
          <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="var(--color-accent-primary)" stroke="white" stroke-width="1.5"></circle>
          <text x="${p.x}" y="${p.y - 7}" text-anchor="middle" font-size="8" font-weight="bold" fill="white">${p.val}%</text>
          <text x="${p.x}" y="${height + 10}" text-anchor="middle" font-size="8" fill="var(--color-text-secondary)" font-weight="bold" class="uppercase tracking-wider">
            ${new Date(p.date).toLocaleDateString('en-US', { month: 'short' })}
          </text>
        `).join('')}
      </svg>
    `;

    return svgContent;
  }

  _startDashboardWalkthrough() {
    const steps = this.walkthrough.getSteps();
    let currentStep = 0;

    const overlay = document.createElement('div');
    overlay.id = 'walkthrough-overlay';
    overlay.className = 'fixed inset-0 z-[99999] bg-black/60 pointer-events-auto transition-opacity duration-300 flex items-center justify-center p-6';
    
    const bubble = document.createElement('div');
    bubble.className = 'clay-glass-panel bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-elevated)] p-6 rounded-[2rem] max-w-sm w-full shadow-[inset_2px_2px_4px_rgba(255,255,255,0.05),_inset_-2px_-2px_4px_rgba(0,0,0,0.5),_0_20px_40px_rgba(0,0,0,0.7)] backdrop-blur-3xl animate-[slideUpFade_0.3s_ease-out] border-t border-[var(--color-primary)]/20 relative';
    overlay.appendChild(bubble);
    document.body.appendChild(overlay);

    const renderStep = () => {
      const step = steps[currentStep];
      const targetEl = document.querySelector(step.elementSelector);
      
      document.querySelectorAll('.walkthrough-highlight').forEach(el => {
        el.classList.remove('walkthrough-highlight', 'ring-4', 'ring-accent-primary', 'relative', 'z-[100000]', 'bg-surface-elevated');
      });

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('walkthrough-highlight', 'ring-4', 'ring-accent-primary', 'relative', 'z-[100000]');
      }

      bubble.innerHTML = `
        <h4 class="text-sm font-bold text-accent-primary uppercase tracking-widest mb-2">${step.title}</h4>
        <p class="text-xs text-text-secondary leading-relaxed mb-6">${step.text}</p>
        
        <div class="flex justify-between items-center">
          <span class="text-[10px] text-text-muted font-bold tracking-wider">${currentStep + 1} of ${steps.length}</span>
          <div class="flex gap-2">
            <button id="skip-walkthrough" class="px-3 py-1.5 rounded-xl text-[10px] font-bold text-text-muted uppercase tracking-widest hover:text-text-primary transition-colors">Skip</button>
            <button id="next-walkthrough" class="px-4 py-1.5 rounded-xl bg-primary text-text-primary text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all">
              ${currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      `;

      bubble.querySelector('#skip-walkthrough').onclick = () => endWalkthrough();
      bubble.querySelector('#next-walkthrough').onclick = () => {
        if (currentStep < steps.length - 1) {
          currentStep++;
          renderStep();
        } else {
          endWalkthrough();
        }
      };
    };

    const endWalkthrough = () => {
      document.querySelectorAll('.walkthrough-highlight').forEach(el => {
        el.classList.remove('walkthrough-highlight', 'ring-4', 'ring-accent-primary', 'relative', 'z-[100000]');
      });
      overlay.remove();
      this.walkthrough.completeWalkthrough();
      this._showNotification('Walkthrough completed! Enjoy using MedCare.');
    };

    renderStep();
  }

  _showDiscoveryTip(featureName, message) {
    const tip = document.createElement('div');
    tip.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-sm bg-gradient-to-br from-accent-soft/40 to-secondary/15 border border-accent-primary/40 rounded-3xl p-5 shadow-[0_10px_35px_rgba(0,0,0,0.5)] z-[9999] backdrop-blur-xl animate-[slideUpFade_0.3s_ease-out] flex gap-3';
    tip.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary shrink-0 mt-0.5 animate-bounce">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 012-2h2M21 7V5a2 2 0 00-2-2h-2M3 17v2a2 2 0 002 2h2M21 17v2a2 2 0 01-2 2h-2M9 9h6v6H9z"></path></svg>
      </div>
      <div>
        <h4 class="text-xs font-bold text-text-primary uppercase tracking-wider">Feature Discovered!</h4>
        <p class="text-[11px] text-text-secondary mt-1 leading-relaxed">${message}</p>
        <button id="close-discovery" class="mt-3 px-3 py-1 bg-accent-primary/10 border border-accent-primary/20 rounded-lg text-[9px] font-bold text-accent-primary uppercase tracking-widest active:scale-95 transition-all">Dismiss</button>
      </div>
    `;
    document.body.appendChild(tip);
    tip.querySelector('#close-discovery').onclick = () => {
      tip.style.opacity = '0';
      setTimeout(() => tip.remove(), 300);
    };
  }

  showFollowupModal(type) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-overlay-bg backdrop-blur-md p-6 animate-fade-in';
    
    let valueLabel = '';
    let step = 'any';
    let placeholder = '';
    if (type === 'hba1c') {
      valueLabel = 'HbA1c Percentage (%)';
      step = '0.1';
      placeholder = 'e.g. 5.7';
    } else if (type === 'bp') {
      valueLabel = 'Blood Pressure (e.g. 120/80)';
      placeholder = 'e.g. 120/80';
    } else if (type === 'thyroid') {
      valueLabel = 'TSH Level (uIU/mL)';
      step = '0.01';
      placeholder = 'e.g. 2.45';
    }

    modal.innerHTML = `
      <div class="clay-glass-panel bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-elevated)] p-6 rounded-[2rem] max-w-sm w-full shadow-[inset_2px_2px_4px_rgba(255,255,255,0.05),_inset_-2px_-2px_4px_rgba(0,0,0,0.5),_0_20px_40px_rgba(0,0,0,0.7)] backdrop-blur-3xl animate-[slideUpFade_0.3s_ease-out] border-t border-[var(--color-primary)]/20">
        <h3 class="text-lg font-bold text-text-primary uppercase tracking-wider mb-4">Log ${type.toUpperCase()}</h3>
        
        <form id="followup-form" class="space-y-4">
          <div>
            <label class="block text-[10px] text-text-secondary uppercase tracking-widest mb-1 font-bold">Date of Reading</label>
            <input type="date" id="fo-date" required value="${new Date().toISOString().split('T')[0]}" class="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-deep text-text-primary font-bold text-xs uppercase tracking-widest [color-scheme:dark]">
          </div>
          
          <div>
            <label class="block text-[10px] text-text-secondary uppercase tracking-widest mb-1 font-bold">${valueLabel}</label>
            <input type="${type === 'bp' ? 'text' : 'number'}" id="fo-value" required step="${step}" placeholder="${placeholder}" class="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-deep text-text-primary font-bold text-xs uppercase tracking-widest">
          </div>

          <div>
            <label class="block text-[10px] text-text-secondary uppercase tracking-widest mb-1 font-bold">Lab / Provider</label>
            <input type="text" id="fo-provider" placeholder="e.g. Self-Reported" class="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-deep text-text-primary font-bold text-xs uppercase tracking-widest">
          </div>

          <div class="border-t border-border pt-4">
            <label class="block text-[10px] text-text-secondary uppercase tracking-widest mb-1 font-bold">Scan Lab Report Document (Optional)</label>
            <input type="file" id="fo-file" accept="image/*,application/pdf" class="w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-accent-soft/20 file:text-accent-primary hover:file:bg-accent-soft/30 file:cursor-pointer">
            
            <div id="ocr-simulation-container" class="hidden mt-3 space-y-2">
              <label class="block text-[10px] text-text-secondary uppercase tracking-widest font-bold">Document text (Simulated OCR)</label>
              <textarea id="fo-ocr-text" rows="2" class="w-full p-2 rounded-xl border border-border bg-surface-deep text-text-secondary font-mono text-[9px]" placeholder="Type or edit simulated OCR text here..."></textarea>
              <button type="button" id="parse-ocr-btn" class="w-full py-2 rounded-xl bg-accent-soft/20 text-accent-primary border border-accent-primary/20 text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all">Parse OCR Text</button>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button type="button" id="cancel-followup" class="flex-1 py-3 rounded-xl text-text-primary text-xs uppercase font-bold tracking-widest transition-colors btn-neumorphic">Cancel</button>
            <button type="submit" class="flex-1 py-3 rounded-xl bg-primary text-text-primary border border-border text-xs uppercase font-bold tracking-widest hover:brightness-125 transition-all">Save</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const fileInput = modal.querySelector('#fo-file');
    const ocrContainer = modal.querySelector('#ocr-simulation-container');
    const ocrTextarea = modal.querySelector('#fo-ocr-text');
    const parseOcrBtn = modal.querySelector('#parse-ocr-btn');
    const valueInput = modal.querySelector('#fo-value');

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        ocrContainer.classList.remove('hidden');
        if (type === 'hba1c') {
          ocrTextarea.value = `LAB REPORT\nPatient: John Doe\nTest Name: Hemoglobin A1c (HbA1c)\nResult: 6.8 %\nReference Range: 4.0 - 5.6 %`;
        } else if (type === 'bp') {
          ocrTextarea.value = `DIAGNOSTIC REPORT\nVital Signs:\nBlood Pressure (BP): 130 / 85 mmHg\nPulse: 72 bpm`;
        } else if (type === 'thyroid') {
          ocrTextarea.value = `THYROID PROFILE\nTSH level: 4.2 uIU/mL\nFT4: 1.2 ng/dL`;
        }
      } else {
        ocrContainer.classList.add('hidden');
      }
    });

    parseOcrBtn.addEventListener('click', () => {
      const text = ocrTextarea.value;
      const parser = new ReportParser();
      const parsed = parser.parseOcrText(text);
      
      if (type === 'hba1c' && parsed.hba1c !== undefined) {
        valueInput.value = parsed.hba1c;
        this._showNotification('OCR Parsed: HbA1c ' + parsed.hba1c + '%');
      } else if (type === 'bp' && parsed.systolic !== undefined && parsed.diastolic !== undefined) {
        valueInput.value = `${parsed.systolic}/${parsed.diastolic}`;
        this._showNotification(`OCR Parsed: BP ${parsed.systolic}/${parsed.diastolic}`);
      } else if (type === 'thyroid' && parsed.tsh !== undefined) {
        valueInput.value = parsed.tsh;
        this._showNotification('OCR Parsed: TSH ' + parsed.tsh);
      } else {
        this._showNotification('OCR parsing failed. Please adjust manually.', 'error');
      }
    });

    modal.querySelector('#cancel-followup').onclick = () => modal.remove();
    modal.querySelector('#followup-form').onsubmit = async (e) => {
      e.preventDefault();
      
      const dateVal = modal.querySelector('#fo-date').value;
      const rawVal = valueInput.value.trim();
      const providerVal = modal.querySelector('#fo-provider').value.trim() || 'Self-Reported';
      const file = fileInput.files[0];

      const metrics = {};
      if (type === 'hba1c') {
        metrics.hba1c = parseFloat(rawVal);
      } else if (type === 'bp') {
        const parts = rawVal.split('/');
        metrics.systolic = parseInt(parts[0], 10);
        metrics.diastolic = parseInt(parts[1] || '80', 10);
      } else if (type === 'thyroid') {
        metrics.tsh = parseFloat(rawVal);
      }

      try {
        if (file) {
          const parsedMeta = {
            date: dateVal,
            title: `${type.toUpperCase()} Report: ${rawVal}`,
            provider: providerVal,
            notes: `Logged via Monthly Health Follow-Up (Scanned)`,
            metrics
          };
          const storageMgr = new ReportStorageManager();
          await storageMgr.saveReport(file, parsedMeta);
          this._showNotification('Document and reading uploaded successfully.');
        } else {
          await db.history.add({
            userId: state.user?.uid || 'anonymous',
            type: 'Report',
            date: dateVal,
            title: `${type.toUpperCase()} Reading: ${rawVal}`,
            provider: providerVal,
            notes: `Manually logged via Monthly Health Follow-Up`,
            metrics
          });
          this._showNotification('Reading saved successfully.');
        }

        modal.remove();
        await this._loadDashboardData();
      } catch (err) {
        console.error(err);
        this._showNotification('Error saving followup: ' + err.message, 'error');
      }
    };
  }

  _showNotification(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest z-[99999] shadow-xl transition-all ${type === 'error' ? 'bg-red-900/80 border border-red-500/40 text-red-200' : 'bg-success/10 border border-success/30 text-success bg-surface-elevated/90 backdrop-blur-md'}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 300);
    }, 3000);
  }

  attachListeners() {
    this.container.addEventListener('click', async (e) => {
      // 1. Dismiss Notification Banner
      const dismissBtn = e.target.closest('#dismiss-banner-btn');
      if (dismissBtn) {
        localStorage.setItem('notifications-banner-dismissed', Date.now().toString());
        const banner = this.container.querySelector('#notifications-disabled-banner');
        if (banner) {
          banner.style.opacity = '0';
          banner.style.height = '0';
          banner.style.padding = '0';
          banner.style.marginBottom = '0';
          setTimeout(() => banner.remove(), 300);
        }
        return;
      }

      // 2. Click on a Checkbox Container to Toggle Dose Taken State
      const checkbox = e.target.closest('.checkbox-container');
      if (checkbox) {
        e.preventDefault();
        const id = parseInt(checkbox.dataset.medId);
        const timeSlot = checkbox.dataset.time;
        const taken = checkbox.dataset.taken === 'true';

        if (!taken) {
          // Mark as Taken
          checkbox.innerHTML = '<span class="animate-pulse w-3 h-3 bg-accent-primary rounded-full"></span>';
          checkbox.style.pointerEvents = 'none';

          try {
            const doseData = { 
              customId: `${id}_${timeSlot}_${new Date().toISOString().split('T')[0]}`,
              medicationId: id, 
              scheduledTime: timeSlot, 
              takenAt: new Date().toISOString(), 
              status: 'taken', 
              userId: state.user?.uid || 'anonymous'
            };
            await db.doses.add(doseData);

            // Quantity decrement and refill alerts
            const medRecord = await db.medications.get(id);
            if (medRecord && medRecord.totalQuantity !== undefined && medRecord.totalQuantity > 0) {
              medRecord.totalQuantity -= 1;
              await db.medications.update(id, { totalQuantity: medRecord.totalQuantity });
              
              try {
                const firestoreDb = getFirestore();
                await setDoc(doc(firestoreDb, 'medications', id.toString()), { totalQuantity: medRecord.totalQuantity }, { merge: true });
              } catch (fsErr) {}

              if (medRecord.refillThreshold !== undefined && medRecord.totalQuantity <= medRecord.refillThreshold) {
                this._showNotification(`Refill Alert: ${medRecord.name} is running low (${medRecord.totalQuantity} left).`, 'error');
              }
            }
          } catch (err) {
            console.error('[Dashboard] Error marking dose taken:', err);
          }
        } else {
          // Undo Dose (Mark as Untaken)
          checkbox.innerHTML = '<span class="animate-pulse w-3 h-3 bg-red-500 rounded-full"></span>';
          checkbox.style.pointerEvents = 'none';

          try {
            const nowUndo = new Date();
            const todayStr = `${nowUndo.getFullYear()}-${String(nowUndo.getMonth() + 1).padStart(2, '0')}-${String(nowUndo.getDate()).padStart(2, '0')}`;
            const allDoses = await db.doses.toArray();
            const doseToDelete = allDoses.find(d => 
              d.medicationId === id && 
              d.scheduledTime === timeSlot && 
              d.takenAt && d.takenAt.startsWith(todayStr)
            );
            
            if (doseToDelete && doseToDelete.id) {
              await db.doses.delete(doseToDelete.id);
            }
          } catch (err) {
            console.error('[Dashboard] Error undoing dose:', err);
          }
        }

        // Refresh UI
        await this._loadDashboardData();
        return;
      }

      // 3. Click on a Follow-up Add Button
      const followupBtn = e.target.closest('.add-followup-btn');
      if (followupBtn) {
        const type = followupBtn.dataset.type;
        this.showFollowupModal(type);
        return;
      }

      // 4. Click actions
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.dataset.action;
        if (action === 'edit-med') window.location.hash = `#/add-medication/edit/${actionEl.dataset.id}`;
        if (action === 'nav-calendar') window.location.hash = '#/calendar';
      }
    });

    // Pull-to-refresh logic
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
            if (e.cancelable) e.preventDefault();
            
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
                
                ptrContainer.innerHTML = `
                    <div class="p-3 bg-surface-elevated rounded-3xl border border-border shadow-[0_10px_30px_var(--color-card-shadow)] backdrop-blur-xl relative overflow-hidden" style="box-shadow: inset 0 2px 10px var(--color-border), 0 10px 30px var(--color-card-shadow);">
                       <div class="w-8 h-8 relative flex items-center justify-center spinner-container">
                          <div class="w-2.5 h-2.5 bg-primary-dark rounded-full absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_15px_var(--color-primary-dark)]"></div>
                          <div class="w-2.5 h-2.5 bg-secondary rounded-full absolute bottom-0 left-0 shadow-[0_0_15px_var(--color-secondary)]"></div>
                          <div class="w-2.5 h-2.5 bg-accent-primary rounded-full absolute bottom-0 right-0 shadow-[0_0_15px_var(--color-accent-primary)]"></div>
                       </div>
                    </div>
                `;
                this.container.appendChild(ptrContainer);
            }
            
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
                
                const minAnimationTime = new Promise(resolve => setTimeout(resolve, 1500));
                const syncData = async () => {
                    if (navigator.onLine && state.user) {
                        await state.hydrate(state.user).catch(console.warn);
                    }
                    await this._loadDashboardData();
                };
                
                await Promise.all([syncData(), minAnimationTime]);
                ptrContainer.style.transform = 'translateY(-100px)';
                setTimeout(() => {
                    if (ptrContainer && ptrContainer.parentNode) ptrContainer.remove();
                    ptrContainer = null;
                    isRefreshing = false;
                }, 400);
            }
        } else if (ptrContainer) {
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
    const card = (height = '140px') => `
      <div class="skeleton skeleton-card" style="height:${height}; width:100%; border-radius:1.5rem; margin-bottom:16px;"></div>
    `;
    return `
      <!-- Header removed -->
      <div class="flex-1 overflow-y-auto px-6 md:px-12 pt-[112px] md:pt-8 pb-28 w-full max-w-7xl mx-auto" id="dashboard-main-content" style="overscroll-behavior-y: none;">
        <div class="md:grid md:grid-cols-12 md:gap-10 md:items-start w-full">
          <!-- Left Column -->
          <div class="md:col-span-7 lg:col-span-8 flex flex-col gap-8">
            ${card('200px')}
            ${card('100px')}
            ${card('160px')}
          </div>
          <!-- Right Column -->
          <div class="md:col-span-5 lg:col-span-4 mt-10 md:mt-0 flex flex-col gap-6">
            ${card('250px')}
            ${card('140px')}
            ${card('80px')}
          </div>
        </div>
      </div>
    `;
  }

  destroy() {
    if (this.helpSystem) {
      this.helpSystem.resetTimer();
    }
    document.removeEventListener('click', this._resetInactivityTimerBound);
    document.removeEventListener('keydown', this._resetInactivityTimerBound);
  }
}
