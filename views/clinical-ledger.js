import db from '../core/db.js';
import state from '../core/state.js';
import { escapeHTML } from '../core/utils.js';
import AddRecordModal from '../components/AddRecordModal.js';

export default class ClinicalLedgerView {
    constructor() {
        this.container = null;
        this.currentView = 'timeline'; // 'timeline' or 'diseases'
        
        this.timelineRecords = [];
        this.activeDiseases = [];
        this.resolvedDiseases = [];
        this.isCaregiver = false;
        this.targetUserId = null;
    }

    formatRelativeTime(dateInput) {
        if (!dateInput) return 'Recently';
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return 'Recently';

        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }

    formatExactDate(dateInput) {
        if (!dateInput) return '';
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    getMonthYear(dateInput) {
        if (!dateInput) return '';
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    getIconForType(type) {
        const svgBase = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--theme-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">`;
        switch (type.toLowerCase()) {
            case 'medicine':
            case 'medication':
                return `${svgBase}<path d="M10.5 20.5l-6-6a4.5 4.5 0 1 1 6.4-6.4l6 6a4.5 4.5 0 1 1-6.4 6.4z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>`;
            case 'lab':
            case 'report':
            case 'history':
                return `${svgBase}<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
            case 'surgery':
            case 'admission':
                return `${svgBase}<path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/><path d="M10 9h4"/><path d="M12 7v4"/></svg>`;
            case 'disease':
            case 'allergy':
                return `${svgBase}<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
            default:
                return `${svgBase}<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
        }
    }

    async loadData() {
        this.targetUserId = state.activeProfileContext ? (state.activeProfileContext.id || state.activeProfileContext) : (state.user && state.user.uid ? state.user.uid : null);
        this.isCaregiver = !!state.activeProfileContext;
        
        let allDiseases = db.disease_ledger ? await db.disease_ledger.filter(d => !d.isDeleted).toArray() : [];
        let allAllergies = await db.allergies.filter(a => !a.isDeleted).toArray();
        let allSurgeries = await db.surgeries.filter(s => !s.isDeleted).toArray();
        let allProblems = await db.active_problems.filter(p => !p.isDeleted).toArray();
        let allMeds = await db.medications.filter(m => !m.isDeleted).toArray();
        let allAppts = await db.appointments.filter(a => !a.isDeleted).toArray();
        let allHistory = await db.history.filter(h => !h.isDeleted).toArray();

        let filtered = {
            diseases: [], allergies: [], surgeries: [], problems: [], meds: [], appts: [], history: []
        };

        if (this.targetUserId) {
            filtered.diseases = allDiseases.filter(d => d.userId === this.targetUserId);
            filtered.allergies = allAllergies.filter(a => a.userId === this.targetUserId);
            filtered.surgeries = allSurgeries.filter(s => s.userId === this.targetUserId);
            filtered.problems = allProblems.filter(p => p.userId === this.targetUserId);
            filtered.meds = allMeds.filter(m => m.userId === this.targetUserId);
            filtered.appts = allAppts.filter(a => a.userId === this.targetUserId);
            filtered.history = allHistory.filter(h => h.userId === this.targetUserId);
        } else {
            filtered = { diseases: allDiseases, allergies: allAllergies, surgeries: allSurgeries, problems: allProblems, meds: allMeds, appts: allAppts, history: allHistory };
        }

        // Prepare Timeline Records
        const combined = [];
        filtered.history.forEach(h => combined.push({ id: `hist_${h.id}`, rawDate: new Date(h.date || Date.now()), entityType: h.type || 'History', title: h.title, subtitle: h.provider || 'Clinical Log', desc: h.notes, documentUrl: h.documentUrl }));
        filtered.diseases.forEach(d => combined.push({ id: `dis_${d.id}`, rawDate: new Date(d.updatedAt || Date.now()), entityType: 'Disease', title: d.diseaseName, subtitle: `Stage: ${d.stage || 'Active'}`, desc: `Dr: ${d.doctor || 'Primary Care'}` }));
        filtered.meds.forEach(m => {
            if (m.startDate) combined.push({ id: `med_${m.id}`, rawDate: new Date(m.startDate), entityType: 'Medicine', title: m.name, subtitle: `${m.dosage} — ${m.frequency}`, desc: m.notes });
        });
        filtered.allergies.forEach(a => combined.push({ id: `alg_${a.id}`, rawDate: new Date(a.updatedAt || Date.now()), entityType: 'Allergy', title: a.allergy, subtitle: `Severity: ${a.severity}`, desc: `Reaction: ${a.reaction}` }));
        filtered.surgeries.forEach(s => combined.push({ id: `surg_${s.id}`, rawDate: new Date(s.date), entityType: 'Surgery', title: s.outcome, subtitle: `${s.hospital}`, desc: `Doctor: ${s.doctor}` }));

        combined.sort((a, b) => b.rawDate - a.rawDate);
        this.timelineRecords = combined;

        // Prepare Diseases List
        this.activeDiseases = filtered.diseases.filter(d => d.status !== 'Resolved');
        this.resolvedDiseases = filtered.diseases.filter(d => d.status === 'Resolved');
    }

    async uploadToSupabase(file) {
        if (!file) return null;
        try {
            const SUPABASE_URL = 'https://ujiviocutexqbigsorol.supabase.co';
            const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaXZpb2N1dGV4cWJpZ3Nvcm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzU4NzgsImV4cCI6MjA5NzQ1MTg3OH0.AR7N-h-FJ5iE12EUqp3j8HyuskOoU1od8XekcbqtX-4';
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

            const response = await fetch(`${SUPABASE_URL}/storage/v1/object/medical-records/${fileName}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'apikey': SUPABASE_KEY,
                    'Content-Type': file.type || 'application/octet-stream'
                },
                body: file
            });

            if (response.ok) {
                return `${SUPABASE_URL}/storage/v1/object/public/medical-records/${fileName}`;
            }
        } catch (e) {
            console.warn('[Supabase Storage] Upload failed:', e);
        }
        return URL.createObjectURL(file);
    }

    async render() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'w-full h-full overflow-y-auto relative min-h-screen font-sans bg-[#0a0407]/90 backdrop-blur-2xl md:backdrop-blur-3xl';
        }

        await this.loadData();

        const themeClass = this.isCaregiver ? 'theme-caregiver' : 'theme-self';

        const styles = `
            <style>
                :root {
                    --theme-accent: #ffb88c;
                    --theme-accent-glow: rgba(255, 184, 140, 0.4);
                    --theme-accent-muted: rgba(255, 184, 140, 0.1);
                    --theme-border: rgba(255, 184, 140, 0.2);
                }
                
                .theme-caregiver {
                    --theme-accent: #7f2f5d;
                    --theme-accent-glow: rgba(127, 47, 93, 0.6);
                    --theme-accent-muted: rgba(127, 47, 93, 0.15);
                    --theme-border: rgba(127, 47, 93, 0.35);
                }

                .unified-card {
                    background: rgba(255, 255, 255, 0.02);
                    backdrop-filter: blur(24px) saturate(150%);
                    -webkit-backdrop-filter: blur(24px) saturate(150%);
                    border-radius: 32px;
                    box-shadow: 
                        16px 16px 32px rgba(0, 0, 0, 0.5),
                        inset 4px 4px 12px rgba(255, 255, 255, 0.05),
                        inset -4px -4px 12px rgba(0, 0, 0, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.04);
                    padding: 24px;
                    margin-bottom: 24px;
                    position: relative;
                    z-index: 10;
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .unified-card:hover {
                    box-shadow: 
                        -4px -4px 10px rgba(255, 255, 255, 0.03),
                        10px 10px 24px rgba(0, 0, 0, 0.9),
                        inset 1px 1px 2px rgba(255, 255, 255, 0.05),
                        0 0 15px var(--theme-accent-muted);
                }

                .disease-card-active {
                    border: 1px solid var(--theme-accent);
                    box-shadow: 
                        0 0 15px var(--theme-accent-muted),
                        inset 0 0 20px var(--theme-accent-muted);
                }

                .disease-card-resolved {
                    opacity: 0.7;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                /* Sticky Header & Toggle */
                .sticky-header {
                    /* Not sticky anymore to match mockup style */
                    z-index: 50;
                    padding-bottom: 1rem;
                }

                /* Relume Timeline */
                .timeline-wrapper {
                    position: relative;
                    padding-left: 2rem;
                    padding-top: 1rem;
                    padding-bottom: 2rem;
                }

                .timeline-spine {
                    position: absolute;
                    left: 28px; /* Offset to center relative to wrapper padding */
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: rgba(255,255,255,0.1);
                    overflow: hidden;
                }
                
                .timeline-spine-progress {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: var(--scroll-progress, 0%);
                    background: var(--theme-accent);
                    box-shadow: 0 0 10px var(--theme-accent);
                    transition: height 0.1s ease-out;
                }

                .timeline-month-header {
                    position: sticky;
                    top: 80px; /* Below the main sticky header */
                    z-index: 30;
                    display: inline-block;
                    background: #1a0f14;
                    padding: 4px 12px;
                    border-radius: 12px;
                    border: 1px solid var(--theme-border);
                    color: var(--theme-accent);
                    font-weight: bold;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-left: -20px; /* Pull left over spine */
                    margin-bottom: 1.5rem;
                    margin-top: 1.5rem;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                }

                .timeline-node-container {
                    position: relative;
                    margin-bottom: 2.5rem;
                    padding-left: 1.5rem;
                }

                .timeline-node-icon {
                    position: absolute;
                    left: -20px; /* Center on spine */
                    top: 0;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #11090d;
                    border: 2px solid var(--theme-accent);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    box-shadow: 
                        0 0 10px var(--theme-accent-glow),
                        inset 2px 2px 6px rgba(0,0,0,0.8);
                }

                .timeline-relative-date {
                    position: absolute;
                    right: 100%;
                    margin-right: 32px;
                    top: 8px;
                    width: max-content;
                    font-size: 0.7rem;
                    color: rgba(255,255,255,0.5);
                    font-family: monospace;
                    text-align: right;
                }
                
                @media (max-width: 640px) {
                    .timeline-relative-date {
                        position: static;
                        display: block;
                        margin-right: 0;
                        margin-bottom: 4px;
                        text-align: left;
                    }
                }

                /* Document Viewer Modal */
                #document-viewer-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(20px);
                    display: flex;
                    flex-direction: column;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                }
                #document-viewer-modal.active {
                    opacity: 1;
                    pointer-events: auto;
                }
                
                /* FAB */
                .fab-add {
                    position: fixed;
                    bottom: 100px;
                    right: 24px;
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: var(--theme-accent);
                    color: #0a0407;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 24px var(--theme-accent-glow);
                    cursor: pointer;
                    z-index: 9000;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .fab-add:hover {
                    transform: scale(1.05);
                    box-shadow: 0 12px 30px var(--theme-accent-glow);
                }
                
                /* Animations */
                .view-slide-fade {
                    animation: slideFadeIn 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }
                
                @keyframes slideFadeIn {
                    from { opacity: 0; transform: translateX(12px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            </style>
        `;

        this.container.innerHTML = `
            ${styles}
            <!-- Gradient background layer -->
            <div class="fixed inset-0 z-0 pointer-events-none" style="background: radial-gradient(circle at 100% 0%, rgba(255, 184, 140, 0.12) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(127, 47, 93, 0.08) 0%, transparent 50%) #0a0407;"></div>
            <!-- Frosted glass blur layer -->
            <div class="fixed inset-0 z-[1] pointer-events-none backdrop-blur-3xl bg-[#0a0407]/40"></div>
            
            <div class="${themeClass} relative z-10 min-h-screen text-[#fefcff] pb-40 pt-24">
                
                <!-- View Toggle -->
                <div class="max-w-sm mx-auto px-6 mb-10">
                    <div class="w-full relative flex p-1.5 bg-[#0a0407]/40 backdrop-blur-2xl border border-white/5 rounded-full shadow-[inset_6px_6px_12px_rgba(0,0,0,0.8),inset_-4px_-4px_10px_rgba(255,255,255,0.04)]">
                        <div class="segment-slider absolute top-1.5 bottom-1.5 bg-white/5 rounded-full border border-white/10 shadow-[4px_4px_12px_rgba(0,0,0,0.5),inset_1px_1px_2px_rgba(255,255,255,0.2)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" style="${this.currentView === 'timeline' ? 'left: 6px; right: 50%;' : 'left: 50%; right: 6px;'}"></div>
                        
                        <div class="segment-pill flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full text-[11px] font-[800] uppercase tracking-[0.2em] cursor-pointer relative z-10 transition-all duration-500 ${this.currentView === 'timeline' ? 'text-[#ffb88c] drop-shadow-[0_0_15px_rgba(255,184,140,0.4)]' : 'text-white/30'}" data-view="timeline">
                            <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            TIMELINE
                        </div>
                        <div class="segment-pill flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full text-[11px] font-[800] uppercase tracking-[0.2em] cursor-pointer relative z-10 transition-all duration-500 ${this.currentView === 'diseases' ? 'text-[#ffb88c] drop-shadow-[0_0_15px_rgba(255,184,140,0.4)]' : 'text-white/30'}" data-view="diseases">
                            <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>
                            DISEASES
                        </div>
                    </div>
                </div>

                <!-- Main Content Area -->
                <main id="ledger-content" class="max-w-4xl mx-auto px-6 view-slide-fade">
                    ${this.currentView === 'timeline' ? this.renderTimelineView() : this.renderDiseasesView()}
                </main>

                <!-- Document Viewer Modal -->
                <div id="document-viewer-modal">
                    <div class="flex justify-between items-center p-4 border-b border-white/10">
                        <h3 class="text-white font-bold tracking-widest text-sm uppercase">Document Viewer</h3>
                        <button id="close-viewer-btn" class="text-white/60 hover:text-white p-2">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="flex-1 p-4 flex items-center justify-center overflow-hidden" id="document-viewer-content">
                        <!-- Object injected here -->
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        
        // Setup Intersection Observer for spine glow if in timeline view
        if (this.currentView === 'timeline') {
            this.setupSpineGlow();
        }

        return this.container;
    }

    renderTimelineView() {
        if (this.timelineRecords.length === 0) {
            return this.renderEmptyState('timeline');
        }

        let html = `<div class="timeline-wrapper" id="timeline-wrapper">
                        <div class="timeline-spine">
                            <div class="timeline-spine-progress" id="timeline-spine-progress"></div>
                        </div>`;
        let currentMonth = null;

        this.timelineRecords.forEach((record, index) => {
            const recMonth = this.getMonthYear(record.rawDate);
            
            if (recMonth !== currentMonth) {
                html += `<div class="timeline-month-header">${escapeHTML(recMonth)}</div>`;
                currentMonth = recMonth;
            }

            html += `
                <div class="timeline-node-container" data-index="${index}">
                    <div class="flex justify-between items-end mb-2 w-full pl-16">
                        <div class="text-[10px] text-white/50 font-mono uppercase tracking-widest">${this.formatRelativeTime(record.rawDate)} • ${this.formatExactDate(record.rawDate)}</div>
                        <div class="text-[10px] text-[var(--theme-accent)] font-mono uppercase tracking-widest">${this.formatRelativeTime(record.rawDate)}</div>
                    </div>
                    
                    <div class="timeline-node-icon">
                        ${this.getIconForType(record.entityType)}
                    </div>
                    
                    <div class="unified-card p-5 relative ml-14">
                        ${record.documentUrl ? `
                            <button class="absolute right-5 top-5 bottom-5 w-14 rounded-[18px] border border-white/5 bg-[#150a0f] text-[var(--theme-accent)] shadow-[2px_2px_8px_rgba(0,0,0,0.5),-1px_-1px_3px_rgba(255,255,255,0.03),inset_1px_1px_2px_rgba(255,255,255,0.02)] flex items-center justify-center active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)] active:translate-y-[1px] transition-all z-20" data-action="view-doc" data-url="${escapeHTML(record.documentUrl)}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            </button>
                        ` : ''}

                        <div class="pr-16">
                            <h4 class="text-lg font-bold text-white leading-tight mb-2">${escapeHTML(record.title)}</h4>
                            <div class="flex items-center gap-2 mb-4">
                                <span class="px-2 py-0.5 rounded bg-[var(--theme-accent-muted)] text-[var(--theme-accent)] text-[9px] uppercase font-bold tracking-widest">${escapeHTML(record.entityType)}</span>
                                <span class="text-[10px] text-white/50 font-medium">• ${escapeHTML(record.subtitle || '')}</span>
                            </div>
                            
                            ${record.desc ? `<p class="text-sm text-white/80 leading-relaxed mb-1">${escapeHTML(record.desc)}</p>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        return html;
    }

    renderDiseasesView() {
        if (this.activeDiseases.length === 0 && this.resolvedDiseases.length === 0) {
            return this.renderEmptyState('diseases');
        }

        let html = `<div class="space-y-6">`;

        // Active Diseases
        if (this.activeDiseases.length > 0) {
            html += `<h3 class="text-xs font-mono text-[var(--theme-accent)] uppercase tracking-widest px-2">Active Conditions</h3>
                     <div class="space-y-4">`;
            
            this.activeDiseases.forEach(d => {
                html += `
                    <div class="unified-card disease-card-active p-5">
                        <div class="flex justify-between items-start mb-3">
                            <h4 class="text-xl font-bold text-white">${escapeHTML(d.diseaseName)}</h4>
                            <span class="px-2 py-1 rounded bg-[var(--theme-accent-muted)] text-[var(--theme-accent)] text-[10px] uppercase font-bold tracking-widest border border-[var(--theme-border)]">Active</span>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p class="text-[10px] text-white/40 uppercase font-mono tracking-widest mb-1">Diagnosed</p>
                                <p class="text-sm text-white/80">${this.formatExactDate(d.createdAt)}</p>
                            </div>
                            <div>
                                <p class="text-[10px] text-white/40 uppercase font-mono tracking-widest mb-1">Severity / Stage</p>
                                <p class="text-sm text-white/80">${escapeHTML(d.stage || 'N/A')}</p>
                            </div>
                        </div>
                        
                        ${d.notes ? `
                            <div class="mb-4">
                                <p class="text-[10px] text-white/40 uppercase font-mono tracking-widest mb-1">Notes</p>
                                <p class="text-sm text-white/70 leading-relaxed">${escapeHTML(d.notes)}</p>
                            </div>
                        ` : ''}

                        ${!this.isCaregiver ? `
                            <div class="flex gap-3 mt-4 pt-4 border-t border-white/5">
                                <button class="flex-1 py-2 rounded-lg border border-[var(--theme-border)] text-xs uppercase tracking-widest font-bold text-[var(--theme-accent)] hover:bg-[var(--theme-accent-muted)] transition-colors" data-action="resolve-disease" data-id="${d.id}">Mark Resolved</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            html += `</div>`;
        }

        // Resolved Diseases
        if (this.resolvedDiseases.length > 0) {
            html += `<h3 class="text-xs font-mono text-white/40 uppercase tracking-widest px-2 mt-8">Resolved Conditions</h3>
                     <div class="space-y-4">`;
            
            this.resolvedDiseases.forEach(d => {
                html += `
                    <div class="unified-card disease-card-resolved p-5">
                        <div class="flex justify-between items-start mb-3">
                            <h4 class="text-xl font-bold text-white/60">${escapeHTML(d.diseaseName)}</h4>
                            <span class="px-2 py-1 rounded bg-white/5 text-white/40 text-[10px] uppercase font-bold tracking-widest border border-white/10">Resolved</span>
                        </div>
                        <p class="text-sm text-white/40 mb-4">${escapeHTML(d.notes || 'No notes available.')}</p>
                        
                        ${!this.isCaregiver ? `
                            <div class="flex gap-3 mt-4 pt-4 border-t border-white/5">
                                <button class="flex-1 py-2 rounded-lg border border-white/10 text-xs uppercase tracking-widest font-bold text-white/50 hover:bg-white/5 transition-colors" data-action="reactivate-disease" data-id="${d.id}">Reactivate</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            html += `</div>`;
        }

        html += `</div>`;
        return html;
    }

    renderEmptyState(viewType) {
        return `
            <div class="flex flex-col items-center justify-center py-20 text-center px-4 md:px-8 lg:px-12">
                <div class="w-20 h-20 rounded-full border border-[var(--theme-border)] bg-[var(--theme-accent-muted)] flex items-center justify-center mb-6 shadow-[0_0_30px_var(--theme-accent-glow)]">
                    <svg class="w-10 h-10 text-[var(--theme-accent)]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path d="M12 4v16m8-8H4"/>
                    </svg>
                </div>
                <h3 class="text-2xl font-bold font-display text-white mb-2">
                    ${viewType === 'timeline' ? 'No Medical History' : 'No Active Conditions'}
                </h3>
                <p class="text-sm text-white/50 font-mono max-w-xs mx-auto leading-relaxed">
                    ${this.isCaregiver ? 'This user has no records logged yet.' : 'Your ledger is empty. Tap the button below to log your first record.'}
                </p>
            </div>
        `;
    }

    setupSpineGlow() {
        const wrapper = this.container.querySelector('#timeline-wrapper');
        const progressBar = this.container.querySelector('#timeline-spine-progress');
        if (!wrapper || !progressBar) return;

        const updateGlow = () => {
            const rect = wrapper.getBoundingClientRect();
            // Calculate how far the wrapper has scrolled past the top of the viewport (offset by 200px for visual weight)
            const scrollPx = (window.innerHeight / 2) - rect.top; 
            const totalHeight = rect.height;
            
            let percentage = (scrollPx / totalHeight) * 100;
            percentage = Math.max(0, Math.min(100, percentage));
            
            progressBar.style.height = `${percentage}%`;
        };

        // Use the container (or window if document scroll) for scroll tracking
        this.container.addEventListener('scroll', updateGlow, { passive: true });
        window.addEventListener('scroll', updateGlow, { passive: true });
        
        // Trigger once on mount
        setTimeout(updateGlow, 100);
    }

    bindEvents() {
        // Toggle Segmented Control
        const segments = this.container.querySelectorAll('.segment-pill');
        segments.forEach(seg => {
            seg.addEventListener('click', async (e) => {
                const targetView = seg.getAttribute('data-view');
                if (targetView === this.currentView) return;
                
                this.currentView = targetView;
                const content = this.container.querySelector('#ledger-content');
                const slider = this.container.querySelector('.segment-slider');
                
                // Update Slider
                if (targetView === 'timeline') {
                    slider.style.left = '6px';
                    slider.style.right = '50%';
                } else {
                    slider.style.left = '50%';
                    slider.style.right = '6px';
                }
                
                segments.forEach(s => {
                    s.classList.remove('text-[#ffb88c]', 'drop-shadow-[0_0_15px_rgba(255,184,140,0.4)]');
                    s.classList.add('text-white/30');
                });
                seg.classList.remove('text-white/30');
                seg.classList.add('text-[#ffb88c]', 'drop-shadow-[0_0_15px_rgba(255,184,140,0.4)]');

                // Animate out
                content.style.opacity = '0';
                content.style.transform = 'translateX(-12px)';
                
                setTimeout(async () => {
                    content.innerHTML = targetView === 'timeline' ? this.renderTimelineView() : this.renderDiseasesView();
                    
                    if (targetView === 'timeline') this.setupSpineGlow();
                    
                    // Reset animation classes for slide-fade-in
                    content.classList.remove('view-slide-fade');
                    void content.offsetWidth; // Trigger reflow
                    content.classList.add('view-slide-fade');
                    content.style.opacity = '';
                    content.style.transform = '';
                }, 200);
            });
        });

        // FAB Click
        const fab = this.container.querySelector('#fab-add-record');
        if (fab) {
            fab.addEventListener('click', () => {
                new AddRecordModal();
            });
        }

        // Listen for global ledger update event from the Smart Form
        document.addEventListener('ledgerUpdated', async () => {
            await this.loadData();
            const content = this.container.querySelector('#ledger-content');
            if (content) {
                content.innerHTML = this.currentView === 'timeline' ? this.renderTimelineView() : this.renderDiseasesView();
            }
        });

        // View Document Action
        this.container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="view-doc"]');
            if (btn) {
                const url = btn.getAttribute('data-url');
                this.openDocumentViewer(url);
            }
        });

        // Resolve / Reactivate actions
        this.container.addEventListener('click', async (e) => {
            const resolveBtn = e.target.closest('[data-action="resolve-disease"]');
            const reactivateBtn = e.target.closest('[data-action="reactivate-disease"]');
            
            if (resolveBtn) {
                const id = parseInt(resolveBtn.getAttribute('data-id'));
                await db.disease_ledger.update(id, { status: 'Resolved', updatedAt: Date.now() });
                this.render(); // Re-render whole view
            }
            if (reactivateBtn) {
                const id = parseInt(reactivateBtn.getAttribute('data-id'));
                await db.disease_ledger.update(id, { status: 'Active', updatedAt: Date.now() });
                this.render();
            }
        });

        // Document Viewer Close
        const closeViewerBtn = this.container.querySelector('#close-viewer-btn');
        if (closeViewerBtn) {
            closeViewerBtn.addEventListener('click', () => {
                const modal = this.container.querySelector('#document-viewer-modal');
                modal.classList.remove('active');
                this.container.querySelector('#document-viewer-content').innerHTML = ''; // clear object
            });
        }
    }

    openDocumentViewer(url) {
        const modal = this.container.querySelector('#document-viewer-modal');
        const content = this.container.querySelector('#document-viewer-content');
        
        // HTML5 Object tag for handling PDF and Images
        content.innerHTML = `<object data="${url}" type="application/pdf" width="100%" height="100%" class="rounded-lg border border-white/10 bg-white/5">
            <div class="flex flex-col items-center justify-center h-full text-center p-6">
                <p class="text-white/60 mb-4">Unable to display document in-app.</p>
                <a href="${url}" target="_blank" class="px-6 py-2 rounded-full bg-[var(--theme-accent)] text-black font-bold uppercase text-xs tracking-widest">Open externally</a>
            </div>
        </object>`;
        
        modal.classList.add('active');
    }
}
