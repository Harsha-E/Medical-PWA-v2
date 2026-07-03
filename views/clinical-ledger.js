import db from '../core/db.js';
import state from '../core/state.js';
import { escapeHTML } from '../core/utils.js';
import { showToast } from '../core/ui.js';

export default class ClinicalLedgerView {
    constructor() {
        this.activeTab = 'timeline'; // 'timeline' or 'diseases'
        this.timelineData = [];
        this.diseaseData = [];
        this.attachments = [];
    }

    async loadData() {
        // Obey Caregiver Context: If activeProfileContext exists, use that ID, else use current user.
        const targetUserId = state.activeProfileContext ? state.activeProfileContext.id : state.user?.uid;
        
        // Fetch Timeline Events (Appointments & History & Medications)
        const appts = await db.appointments.filter(a => a.userId === targetUserId).toArray();
        const history = await db.history.filter(h => h.userId === targetUserId).toArray();
        const meds = await db.medications.filter(m => m.userId === targetUserId).toArray();
        
        this.attachments = await db.attachments.filter(a => a.userId === targetUserId).toArray();

        // Normalize data for timeline
        this.timelineData = [];
        appts.forEach(a => this.timelineData.push({ id: a.id, rawDate: new Date(a.date), type: 'Appointment', title: a.title, desc: `Dr. ${a.provider} at ${a.time}` }));
        history.forEach(h => this.timelineData.push({ id: h.id, rawDate: new Date(h.date), type: 'History', title: h.title, desc: h.type }));
        meds.forEach(m => {
            if (m.startDate) this.timelineData.push({ id: m.id, rawDate: new Date(m.startDate), type: 'Medication', title: m.name, desc: `Started: ${m.dosage} ${m.frequency}` });
        });

        // Sort descending
        this.timelineData.sort((a, b) => b.rawDate - a.rawDate);

        // Fetch Disease Ledger for Profile View
        this.diseaseData = await db.disease_ledger.filter(d => d.userId === targetUserId).toArray();
        
        // If empty, put some placeholders so UI isn't totally blank
        if (this.diseaseData.length === 0) {
            this.diseaseData = [
                { name: 'No Active Issues', status: 'Active Monitoring', severity: 'low' }
            ];
        }
    }

    formatSmartDate(dateObj) {
        const now = new Date();
        const diffDays = Math.floor((now - dateObj) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
        if (diffDays >= 7 && diffDays < 30) return `Approx. ${Math.floor(diffDays / 7)} weeks ago`;
        
        // Default to Exact Date
        return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    async render() {
        this.container = document.createElement('div');
        this.container.className = 'container';
        
        await this.loadData();

        this.container.innerHTML = `
            <main class="scroll-area bg-transparent pb-40" style="padding-left:0; padding-right:0;">
                <div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">
                    
                    <!-- Global Controls -->
                    <div class="mb-8 space-y-4">
                        <div class="flex gap-2">
                            <input type="text" id="ledger-search" placeholder="Search records..." class="flex-1 min-w-0 bg-surface-deep border border-border rounded-xl px-4 py-3 text-text-primary text-xs font-mono focus:outline-none focus:border-accent-primary/50 transition-colors shadow-inner">
                            <select id="ledger-filter" class="w-32 bg-surface-deep border border-border rounded-xl px-2 py-3 text-text-primary text-xs font-mono focus:outline-none focus:border-accent-primary/50">
                                <option value="all">All</option>
                                <option value="surgery">Surgery</option>
                                <option value="medication">Prescriptions</option>
                                <option value="lab">Lab Reports</option>
                            </select>
                        </div>

                        <!-- Pill-shaped Toggle -->
                        <div class="flex bg-surface-elevated/40 border border-border shadow-[0_8px_32px_var(--color-card-shadow)] rounded-full p-1 backdrop-blur-xl">
                            <button class="tab-btn flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-full transition-all ${this.activeTab === 'timeline' ? 'bg-accent-primary text-surface shadow-[0_0_15px_var(--color-accent-primary)]' : 'text-text-secondary hover:text-text-primary'}" data-tab="timeline">Timeline</button>
                            <button class="tab-btn flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-full transition-all ${this.activeTab === 'diseases' ? 'bg-accent-primary text-surface shadow-[0_0_15px_var(--color-accent-primary)]' : 'text-text-secondary hover:text-text-primary'}" data-tab="diseases">Health Profile</button>
                        </div>
                    </div>

                    <!-- Tab Content Area -->
                    <div id="ledger-content" class="animate-fade-in-up">
                        ${this.activeTab === 'timeline' ? this.renderTimeline() : this.renderDiseases()}
                    </div>
                </div>
            </main>
        `;

        this.bindEvents();
        return this.container;
    }

    renderTimeline() {
        if (this.timelineData.length === 0) {
            return `<div class="text-center p-12 opacity-50"><p class="font-mono text-xs uppercase tracking-widest">No clinical history recorded.</p></div>`;
        }

        return `
            <div class="border-l-2 border-accent-primary/50 pl-6 ml-2 space-y-8 relative">
                ${this.timelineData.map(item => {
                    const hasAttachment = this.attachments.some(a => a.eventId === item.id);
                    return `
                    <div class="relative group">
                        <!-- Golden Brown Node -->
                        <div class="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-surface border-2 border-accent-primary shadow-[0_0_10px_var(--color-accent-primary)] group-hover:bg-accent-primary transition-colors"></div>
                        
                        <div class="text-accent-primary text-[10px] font-bold uppercase tracking-widest mb-1">${this.formatSmartDate(item.rawDate)} &bull; ${item.type}</div>
                        
                        <div class="clay-glass-panel p-5 border border-border shadow-[0_4px_16px_var(--color-card-shadow)] bg-surface-elevated/40 backdrop-blur-xl rounded-2xl relative overflow-hidden transition-transform hover:scale-[1.02]">
                            <h3 class="font-display text-lg text-text-primary mb-1">${escapeHTML(item.title)}</h3>
                            <p class="text-xs text-text-secondary font-mono">${escapeHTML(item.desc)}</p>
                            
                            ${hasAttachment ? `
                                <div class="mt-4 flex gap-2">
                                    <div class="w-12 h-12 rounded-lg bg-surface-deep border border-border flex items-center justify-center cursor-pointer hover:border-accent-primary transition-colors shadow-inner text-accent-primary">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    }

    renderDiseases() {
        // Grouping logic
        const activeIssues = this.diseaseData.filter(d => d.status !== 'Resolved' && d.status !== 'Past');
        const resolvedIssues = this.diseaseData.filter(d => d.status === 'Resolved' || d.status === 'Past');

        return `
            <div class="space-y-8">
                <!-- 🔴 Active Issues Bucket -->
                <div>
                    <h3 class="text-sm font-bold uppercase tracking-widest text-red-400 mb-4 pl-2 border-l-2 border-red-500">Active Issues & Risks</h3>
                    <div class="space-y-4">
                        ${activeIssues.map(item => `
                            <div class="clay-glass-panel p-5 border-l-4 border-red-500 shadow-[0_4px_16px_rgba(239,68,68,0.1)] bg-surface-elevated/40 backdrop-blur-xl rounded-2xl">
                                <h3 class="font-display text-lg text-text-primary mb-2">${escapeHTML(item.name)}</h3>
                                <div class="flex justify-between text-[10px] uppercase tracking-widest font-bold">
                                    <span class="text-text-secondary">Severity: ${item.severity || 'Unknown'}</span>
                                    <span class="text-red-400">${item.status}</span>
                                </div>
                            </div>
                        `).join('')}
                        ${activeIssues.length === 0 ? '<p class="text-xs text-text-muted italic">No active issues recorded.</p>' : ''}
                    </div>
                </div>

                <!-- 🟢 Resolved / Past History Bucket -->
                <div>
                    <h3 class="text-sm font-bold uppercase tracking-widest text-green-400 mb-4 pl-2 border-l-2 border-green-500">Resolved History</h3>
                    <div class="space-y-4">
                        ${resolvedIssues.map(item => `
                            <div class="clay-glass-panel p-5 border-l-4 border-green-500 shadow-[0_4px_16px_rgba(34,197,94,0.1)] bg-surface-elevated/40 backdrop-blur-xl rounded-2xl opacity-80">
                                <h3 class="font-display text-lg text-text-primary mb-2">${escapeHTML(item.name)}</h3>
                                <div class="flex justify-between text-[10px] uppercase tracking-widest font-bold">
                                    <span class="text-text-secondary">Diagnosed: ${item.diagnosed || 'Unknown'}</span>
                                    <span class="text-green-400">Resolved</span>
                                </div>
                            </div>
                        `).join('')}
                        ${resolvedIssues.length === 0 ? '<p class="text-xs text-text-muted italic">No past history recorded.</p>' : ''}
                    </div>
                </div>

                <button class="w-full mt-6 py-4 rounded-xl border-2 border-dashed border-[#b8860b]/30 text-[#b8860b] font-bold uppercase tracking-widest text-xs hover:bg-[#b8860b]/10 transition-colors">
                    + Log New Condition
                </button>
            </div>
        `;
    }

    bindEvents() {
        const tabs = this.container.querySelectorAll('.tab-btn');
        tabs.forEach(btn => {
            btn.onclick = async (e) => {
                this.activeTab = e.currentTarget.getAttribute('data-tab');
                const newContent = await this.render();
                // Replace in DOM if this view is currently mounted
                const viewport = document.getElementById('app-viewport');
                if (viewport) {
                    viewport.innerHTML = '';
                    viewport.appendChild(newContent);
                }
            };
        });
    }
}
