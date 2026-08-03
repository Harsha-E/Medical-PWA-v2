import db from '../core/db.js';
import state from '../core/state.js';
import { escapeHTML } from '../core/utils.js';

export default class ClinicalLedgerView {
    constructor() {
        this.container = null;
        this.currentView = 'timeline'; // 'timeline' or 'diseases'
        
        this.timelineRecords = [];
        this.activeDiseases = [];
        this.resolvedDiseases = [];
        this.diseaseFilter = 'active'; // 'active' or 'past'
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
        let allLinks = (db.clinical_links) ? await db.clinical_links.filter(l => !l.isDeleted).toArray() : [];
        let allAnalyses = (db.clinical_analyses) ? await db.clinical_analyses.toArray() : [];

        let filtered = {
            diseases: [], allergies: [], surgeries: [], problems: [], meds: [], appts: [], history: [], analyses: []
        };

        if (this.targetUserId) {
            const tId = String(this.targetUserId);
            filtered.diseases = allDiseases.filter(d => String(d.userId) === tId);
            filtered.allergies = allAllergies.filter(a => String(a.userId) === tId);
            filtered.surgeries = allSurgeries.filter(s => String(s.userId) === tId);
            filtered.problems = allProblems.filter(p => String(p.userId) === tId);
            filtered.meds = allMeds.filter(m => String(m.userId) === tId);
            filtered.appts = allAppts.filter(a => String(a.userId) === tId);
            filtered.history = allHistory.filter(h => String(h.userId) === tId);
            filtered.analyses = allAnalyses.filter(a => String(a.userId) === tId && a.status === 'COMPLETED');
        } else {
            filtered = { diseases: allDiseases, allergies: allAllergies, surgeries: allSurgeries, problems: allProblems, meds: allMeds, appts: allAppts, history: allHistory, analyses: allAnalyses.filter(a => a.status === 'COMPLETED') };
        }

        // Get latest analysis for this user profile
        filtered.analyses.sort((a, b) => b.timestamp - a.timestamp);
        const latestAnalysis = filtered.analyses[0] || null;

        // Helper to count links for a specific entity
        const getLinkCount = (entity, id) => {
            return allLinks.filter(l => 
                (l.sourceEntity === entity && l.sourceId === id) || 
                (l.targetEntity === entity && l.targetId === id)
            ).length;
        };

        // Prepare Timeline Records
        const combined = [];
        filtered.history.forEach(h => combined.push({ id: `hist_${h.id}`, originalId: h.id, rawDate: new Date(h.date || Date.now()), entityType: h.type || 'History', title: h.title, subtitle: h.provider || 'Clinical Log', desc: h.notes, documentUrl: h.documentUrl, linkCount: getLinkCount('history', h.id) }));
        filtered.diseases.forEach(d => combined.push({ id: `dis_${d.id}`, originalId: d.id, rawDate: new Date(d.updatedAt || Date.now()), entityType: 'Disease', title: d.diseaseName, subtitle: `Stage: ${d.stage || 'Active'}`, desc: `Dr: ${d.doctor || 'Primary Care'}`, linkCount: getLinkCount('disease_ledger', d.id) }));
        
        filtered.meds.forEach(m => {
            if (m.startDate) {
                // Check if there's a warning for this medication in the latest analysis
                let insight = null;
                if (latestAnalysis && latestAnalysis.warnings && latestAnalysis.warnings.length > 0) {
                    const warning = latestAnalysis.warnings.find(w => w.drugs_involved && w.drugs_involved.some(d => d.toLowerCase() === m.name.toLowerCase() || d.toLowerCase() === (m.genericName || '').toLowerCase()));
                    if (warning) {
                        insight = {
                            analysisId: latestAnalysis.analysisId,
                            severity: warning.severity,
                            message: warning.message
                        };
                    }
                }
                
                combined.push({ 
                    id: `med_${m.id}`, originalId: m.id, rawDate: new Date(m.startDate), entityType: 'Medicine', 
                    title: m.name, subtitle: `${m.dosage} — ${m.frequency}`, desc: m.notes, 
                    linkCount: getLinkCount('medications', m.id),
                    insight 
                });
            }
        });
        
        filtered.allergies.forEach(a => combined.push({ id: `alg_${a.id}`, originalId: a.id, rawDate: new Date(a.updatedAt || Date.now()), entityType: 'Allergy', title: a.allergy, subtitle: `Severity: ${a.severity}`, desc: `Reaction: ${a.reaction}`, linkCount: getLinkCount('allergies', a.id) }));
        filtered.surgeries.forEach(s => combined.push({ id: `surg_${s.id}`, originalId: s.id, rawDate: new Date(s.date), entityType: 'Surgery', title: s.outcome, subtitle: `${s.hospital}`, desc: `Doctor: ${s.doctor}`, linkCount: getLinkCount('surgeries', s.id) }));

        combined.sort((a, b) => a.rawDate - b.rawDate); // Ascending order (oldest first)
        this.timelineRecords = combined;

        // Prepare Diseases List
        this.activeDiseases = filtered.diseases.filter(d => (d.status || '').toLowerCase() !== 'resolved');
        this.resolvedDiseases = filtered.diseases.filter(d => (d.status || '').toLowerCase() === 'resolved');
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
                        
                        <div class="segment-pill flex-1 flex items-center justify-center gap-2 py-3 px-4 md:px-8 lg:px-12 rounded-full text-[11px] font-[800] uppercase tracking-[0.2em] cursor-pointer relative z-10 transition-all duration-500 ${this.currentView === 'timeline' ? 'text-[#ffb88c] drop-shadow-[0_0_15px_rgba(255,184,140,0.4)]' : 'text-white/30'}" data-view="timeline">
                            <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            TIMELINE
                        </div>
                        <div class="segment-pill flex-1 flex items-center justify-center gap-2 py-3 px-4 md:px-8 lg:px-12 rounded-full text-[11px] font-[800] uppercase tracking-[0.2em] cursor-pointer relative z-10 transition-all duration-500 ${this.currentView === 'diseases' ? 'text-[#ffb88c] drop-shadow-[0_0_15px_rgba(255,184,140,0.4)]' : 'text-white/30'}" data-view="diseases">
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
                    
                    <div class="unified-card p-5 relative ml-12 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all hover:border-white/10 cursor-pointer group" data-action="view-detail" data-index="${index}">
                        <div class="flex items-start gap-4">
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-start mb-2">
                                    <h4 class="text-[17px] sm:text-lg font-bold text-white leading-tight tracking-wide group-hover:text-[var(--theme-accent)] transition-colors pr-2">${escapeHTML(record.title)}</h4>
                                    
                                    ${record.documentUrl ? `
                                        <button class="shrink-0 w-10 h-10 rounded-xl border border-white/10 bg-[#150a0f]/80 backdrop-blur-md text-[var(--theme-accent)] shadow-inner flex items-center justify-center hover:bg-white/5 hover:scale-105 active:scale-95 transition-all z-20" data-action="view-doc" data-url="${escapeHTML(record.documentUrl)}">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                        </button>
                                    ` : ''}
                                </div>

                                <div class="flex flex-wrap items-center gap-2 mb-3">
                                    <span class="px-2 py-0.5 rounded flex items-center justify-center bg-[var(--theme-accent-muted)] text-[var(--theme-accent)] text-[9px] uppercase font-bold tracking-widest border border-[var(--theme-border)] shadow-sm">${escapeHTML(record.entityType)}</span>
                                    
                                    ${record.subtitle ? `<span class="text-xs text-white/50 font-medium tracking-wide flex items-center gap-1.5 before:content-[''] before:block before:w-1 before:h-1 before:rounded-full before:bg-white/20">${escapeHTML(record.subtitle)}</span>` : ''}
                                    
                                    ${record.linkCount > 0 ? `<span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] uppercase font-bold tracking-widest shadow-sm flex items-center gap-1 ml-auto cursor-pointer hover:bg-blue-500/20 transition-colors" data-action="view-links" data-entity="${record.entityType}" data-id="${record.id}">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg> ${record.linkCount}
                                    </span>` : ''}
                                </div>
                                
                                ${record.desc ? `
                                    <div class="mt-3">
                                        <p class="text-sm text-white/70 leading-relaxed font-normal">${escapeHTML(record.desc)}</p>
                                    </div>
                                ` : ''}
                                
                                ${record.insight ? `
                                    <div class="mt-4 pt-3 border-t border-white/5">
                                        <div class="flex items-start gap-3 p-3 rounded-xl bg-[var(--theme-accent-muted)] border border-[var(--theme-border)]">
                                            <div class="mt-0.5 text-[var(--theme-accent)]">
                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                            </div>
                                            <div class="flex-1">
                                                <p class="text-sm font-bold text-[var(--theme-accent)] mb-1">${escapeHTML(record.insight.severity)} INTERACTION</p>
                                                <p class="text-xs text-white/80 leading-relaxed mb-3">${escapeHTML(record.insight.message)}</p>
                                                <button class="text-[10px] uppercase font-bold tracking-widest text-[var(--theme-accent)] hover:text-white transition-colors flex items-center gap-1" data-action="view-analysis" data-analysis-id="${escapeHTML(record.insight.analysisId)}">
                                                    View Clinical Details <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        return html;
    }

    renderDiseasesView() {
        const isPast = this.diseaseFilter === 'past';
        const displayList = isPast ? this.resolvedDiseases : this.activeDiseases;

        let html = `
            <div class="mb-6 px-2 flex justify-end">
                <button type="button" id="disease-filter-toggle" class="text-[var(--theme-accent)] hover:text-white transition-colors" title="Toggle Active/Past">
                    ${isPast 
                        ? `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
                        : `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>`
                    }
                </button>
            </div>
        `;

        if (displayList.length === 0) {
            html += this.renderEmptyState(isPast ? 'past' : 'diseases');
            return html;
        }

        html += `<div class="space-y-4">`;

        displayList.forEach(d => {
            const formattedDate = this.formatExactDate(d.createdAt);
            const hasDate = !!formattedDate;
            const hasStage = d.stage && d.stage.trim() !== '' && d.stage.toLowerCase() !== 'n/a';
            
            if (isPast) {
                html += `
                    <div class="unified-card disease-card-resolved p-5 cursor-pointer hover:bg-white/5 transition-colors group" data-action="view-disease" data-id="${d.id}">
                        <div class="flex justify-between items-start mb-3 pointer-events-none">
                            <h4 class="text-xl font-bold text-white/60 group-hover:text-white/80 transition-colors">${escapeHTML(d.diseaseName)}</h4>
                            <span class="px-2 py-1 rounded bg-white/5 text-white/40 text-[10px] uppercase font-bold tracking-widest border border-white/10">Resolved</span>
                        </div>
                        
                        ${(hasDate || hasStage) ? `
                        <div class="grid grid-cols-2 gap-4 mb-4 pointer-events-none">
                            ${hasDate ? `
                            <div>
                                <p class="text-[10px] text-white/40 uppercase font-mono tracking-widest mb-1">Diagnosed</p>
                                <p class="text-sm text-white/60">${formattedDate}</p>
                            </div>` : ''}
                            ${hasStage ? `
                            <div>
                                <p class="text-[10px] text-white/40 uppercase font-mono tracking-widest mb-1">Severity / Stage</p>
                                <p class="text-sm text-white/60">${escapeHTML(d.stage)}</p>
                            </div>` : ''}
                        </div>
                        ` : ''}
                        
                        ${d.notes ? `<p class="text-sm text-white/40 mb-4 pointer-events-none line-clamp-2">${escapeHTML(d.notes)}</p>` : ''}
                        
                        ${!this.isCaregiver ? `
                            <div class="flex gap-3 mt-4 pt-4 border-t border-white/5 relative z-10">
                                <button class="flex-1 py-2 rounded-lg border border-white/10 text-xs uppercase tracking-widest font-bold text-white/50 hover:bg-white/10 transition-colors" data-action="reactivate-disease" data-id="${d.id}">Reactivate</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                html += `
                    <div class="unified-card disease-card-active p-5 cursor-pointer hover:bg-white/5 transition-colors group" data-action="view-disease" data-id="${d.id}">
                        <div class="flex justify-between items-start mb-3 pointer-events-none">
                            <h4 class="text-xl font-bold text-white group-hover:text-[var(--theme-accent)] transition-colors">${escapeHTML(d.diseaseName)}</h4>
                            <span class="px-2 py-1 rounded bg-[var(--theme-accent-muted)] text-[var(--theme-accent)] text-[10px] uppercase font-bold tracking-widest border border-[var(--theme-border)]">Active</span>
                        </div>
                        
                        ${(hasDate || hasStage) ? `
                        <div class="grid grid-cols-2 gap-4 mb-4 pointer-events-none">
                            ${hasDate ? `
                            <div>
                                <p class="text-[10px] text-white/40 uppercase font-mono tracking-widest mb-1">Diagnosed</p>
                                <p class="text-sm text-white/80">${formattedDate}</p>
                            </div>` : ''}
                            ${hasStage ? `
                            <div>
                                <p class="text-[10px] text-white/40 uppercase font-mono tracking-widest mb-1">Severity / Stage</p>
                                <p class="text-sm text-white/80">${escapeHTML(d.stage)}</p>
                            </div>` : ''}
                        </div>
                        ` : ''}
                        
                        ${d.notes ? `
                            <div class="mb-4 pointer-events-none">
                                <p class="text-[10px] text-white/40 uppercase font-mono tracking-widest mb-1">Notes</p>
                                <p class="text-sm text-white/70 leading-relaxed line-clamp-2">${escapeHTML(d.notes)}</p>
                            </div>
                        ` : ''}

                        ${!this.isCaregiver ? `
                            <div class="flex gap-3 mt-4 pt-4 border-t border-white/5 relative z-10">
                                <button class="flex-1 py-2 rounded-lg border border-[var(--theme-border)] text-xs uppercase tracking-widest font-bold text-[var(--theme-accent)] hover:bg-[var(--theme-accent-muted)] transition-colors" data-action="resolve-disease" data-id="${d.id}">Mark Resolved</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        });

        html += `</div>`;
        return html;
    }

    renderEmptyState(viewType) {
        let title = 'No Medical History';
        let desc = this.isCaregiver ? 'This user has no records logged yet.' : 'Your ledger is empty. Tap the button below to log your first record.';
        
        if (viewType === 'diseases') {
            title = 'No Active Conditions';
        } else if (viewType === 'past') {
            title = 'No Past Conditions';
            desc = 'You have no resolved conditions in your ledger.';
        }

        return `
            <div class="flex flex-col items-center justify-center py-20 text-center px-4 md:px-8 lg:px-12 mt-4">
                <div class="w-20 h-20 rounded-full border border-[var(--theme-border)] bg-[var(--theme-accent-muted)] flex items-center justify-center mb-6 shadow-[0_0_30px_var(--theme-accent-glow)]">
                    <svg class="w-10 h-10 text-[var(--theme-accent)]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path d="M12 4v16m8-8H4"/>
                    </svg>
                </div>
                <h3 class="text-2xl font-bold font-display text-white mb-2">
                    ${title}
                </h3>
                <p class="text-sm text-white/50 font-mono max-w-xs mx-auto leading-relaxed">
                    ${desc}
                </p>
            </div>
        `;
    }

    setupSpineGlow() {
        const wrapper = this.container.querySelector('#timeline-wrapper');
        const progressBar = this.container.querySelector('#timeline-spine-progress');
        if (!wrapper || !progressBar) return;

        const updateGlow = () => {
            const container = this.container;
            if (!container) return;
            
            const maxScroll = container.scrollHeight - container.clientHeight;
            let percentage = 0;
            
            if (maxScroll <= 0) {
                // If there's no scroll space, just fill it to 100% so it doesn't look broken
                percentage = 100;
            } else {
                percentage = (container.scrollTop / maxScroll) * 100;
            }
            
            // Give it a minimum of 5% so it's visible at the top, max 100%
            percentage = Math.max(5, Math.min(100, percentage));
            
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

        // Filter Toggle
        this.container.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('#disease-filter-toggle');
            if (toggleBtn) {
                this.diseaseFilter = this.diseaseFilter === 'active' ? 'past' : 'active';
                const content = this.container.querySelector('#ledger-content');
                if (content && this.currentView === 'diseases') {
                    content.innerHTML = this.renderDiseasesView();
                }
            }
        });

        // FAB Click
        const fab = this.container.querySelector('#fab-add-record');
        if (fab) {
            fab.addEventListener('click', () => {
                window.location.hash = '#/add-record';
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

        // Listen for DIC analysis completed event
        document.addEventListener('medcare:analysis-completed', async (e) => {
            await this.loadData();
            const content = this.container.querySelector('#ledger-content');
            if (content) {
                content.innerHTML = this.currentView === 'timeline' ? this.renderTimelineView() : this.renderDiseasesView();
            }
            
            if (e.detail && e.detail.analysisId) {
                const insight = this.timelineRecords.find(r => r.insight && r.insight.analysisId === e.detail.analysisId)?.insight;
                if (insight && insight.severity !== 'NONE') {
                    this.showNotificationToast(insight);
                }
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

        // View Analysis Action
        this.container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="view-analysis"]');
            if (btn) {
                e.stopPropagation();
                const analysisId = btn.getAttribute('data-analysis-id');
                // Open Control Center (assumes dashboard exists)
                window.open(`${(ENV.getDicBaseUrl ? ENV.getDicBaseUrl() : ENV.DIC_BASE_URL)}/#/live/${analysisId}`, '_blank');
            }
        });

        // Resolve / Reactivate actions
        this.container.addEventListener('click', async (e) => {
            const resolveBtn = e.target.closest('[data-action="resolve-disease"]');
            const reactivateBtn = e.target.closest('[data-action="reactivate-disease"]');
            
            if (resolveBtn || reactivateBtn) {
                const { default: ClinicalLogger } = await import('../services/ClinicalLogger.js');
                
                if (resolveBtn) {
                    const id = parseInt(resolveBtn.getAttribute('data-id'));
                    await ClinicalLogger.closeDisease(id);
                    this.render(); // Re-render whole view
                }
                if (reactivateBtn) {
                    const id = parseInt(reactivateBtn.getAttribute('data-id'));
                    // Note: ClinicalLogger sets it back to Active via updateDisease
                    await ClinicalLogger.updateDisease(id, { status: 'Active' });
                    this.render();
                }
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

        // View Detail Action
        this.container.addEventListener('click', (e) => {
            const detailBtn = e.target.closest('[data-action="view-detail"]');
            const diseaseBtn = e.target.closest('[data-action="view-disease"]');

            if (detailBtn) {
                // Do not trigger if the user clicked the standalone view-doc button inside the card
                if (e.target.closest('[data-action="view-doc"]')) return;
                
                const index = parseInt(detailBtn.getAttribute('data-index'));
                const record = this.timelineRecords[index];
                if (record) {
                    this.openDetailModal(record);
                }
            } else if (diseaseBtn) {
                if (e.target.closest('button')) return; // ignore resolve/reactivate clicks

                const id = parseInt(diseaseBtn.getAttribute('data-id'));
                const record = this.timelineRecords.find(r => r.originalId === id && r.entityType === 'Disease');
                if (record) {
                    this.openDetailModal(record);
                }
            }
        });
    }

    showNotificationToast(insight) {
        const toast = document.createElement('div');
        // Determine colors based on severity
        const isCritical = insight.severity === 'CRITICAL' || insight.severity === 'HIGH';
        const colorClass = isCritical ? 'red-500' : 'yellow-500';
        const textClass = isCritical ? 'text-red-400' : 'text-yellow-400';
        const bgClass = isCritical ? 'bg-red-500/20' : 'bg-yellow-500/20';
        const hoverBgClass = isCritical ? 'hover:bg-red-500/30' : 'hover:bg-yellow-500/30';
        
        toast.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[100000] flex items-center gap-3 p-4 rounded-2xl bg-[#1a0f14]/95 backdrop-blur-xl border border-${colorClass}/30 shadow-[0_10px_40px_rgba(${isCritical?'255,0,0':'255,200,0'},0.2)] transform transition-all duration-500 translate-y-[-100%] opacity-0`;
        
        toast.innerHTML = `
            <div class="${textClass}">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <div>
                <p class="text-sm font-bold ${textClass} mb-0.5">${escapeHTML(insight.severity)} RISK DETECTED</p>
                <p class="text-xs text-white/80">${escapeHTML(insight.message).substring(0, 60)}...</p>
            </div>
            <button class="ml-4 px-3 py-1.5 rounded-lg ${bgClass} ${textClass} text-[10px] uppercase font-bold tracking-widest border border-${colorClass}/20 ${hoverBgClass}" onclick="window.open('${(ENV.getDicBaseUrl ? ENV.getDicBaseUrl() : ENV.DIC_BASE_URL)}/#/live/${escapeHTML(insight.analysisId)}', '_blank')">View</button>
        `;

        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-[-100%]', 'opacity-0');
        });
        
        // Remove after 6 seconds
        setTimeout(() => {
            toast.classList.add('translate-y-[-100%]', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 6000);
    }

    openDetailModal(record) {
        const modalId = 'timeline-detail-modal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        // Premium backdrop and positioning
        modal.className = `fixed inset-0 z-[9999] flex flex-col justify-end pt-20 pb-0 sm:p-10 transition-all duration-500 opacity-0`;
        
        // Map prefix to DB table
        let tableName = '';
        const prefixEndIndex = record.id.indexOf('_');
        const prefix = record.id.substring(0, prefixEndIndex);
        
        // Use the originalId stored during mapping to avoid string/number type mismatch errors in Dexie
        const recordId = record.originalId;

        if (prefix === 'hist') tableName = 'history';
        else if (prefix === 'dis') tableName = 'disease_ledger';
        else if (prefix === 'med') tableName = 'medications';
        else if (prefix === 'alg') tableName = 'allergies';
        else if (prefix === 'surg') tableName = 'surgeries';

        const isImage = record.documentUrl && (record.documentUrl.match(/\.(jpeg|jpg|gif|png)$/i) || record.documentUrl.includes('alt=media'));

        modal.innerHTML = `
            <!-- Translucent Backdrop -->
            <div class="absolute inset-0 bg-[#0a0407]/60 backdrop-blur-2xl transition-opacity duration-500 opacity-0" id="detail-backdrop"></div>
            
            <!-- Modal Content (Unified Card Style) -->
            <div class="relative w-full max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#150a0f]/80 backdrop-blur-3xl rounded-t-[40px] sm:rounded-[32px] border border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.6),inset_0_2px_10px_rgba(255,255,255,0.1)] overflow-hidden transform translate-y-full transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)" id="detail-card">
                
                <!-- Handle for mobile swipe down (visual only) -->
                <div class="w-full flex justify-center pt-4 pb-2 sm:hidden absolute top-0 z-50 pointer-events-none">
                    <div class="w-12 h-1.5 rounded-full bg-white/20"></div>
                </div>

                <!-- Header -->
                <div class="sticky top-0 z-40 flex items-center justify-between p-6 pt-10 sm:pt-6 border-b border-white/5 bg-gradient-to-b from-[#150a0f] to-transparent">
                    <button type="button" id="close-detail-btn" class="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 text-white/60 hover:bg-white/10 hover:text-white active:scale-95 transition-all shadow-[inset_2px_2px_4px_rgba(255,255,255,0.05),2px_2px_8px_rgba(0,0,0,0.3)] border border-white/5">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    <div class="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--theme-accent)] drop-shadow-[0_0_10px_var(--theme-accent-glow)]">Clinical Record</div>
                    <button type="button" id="delete-record-btn" class="w-12 h-12 rounded-full flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 active:scale-95 transition-all shadow-[inset_2px_2px_4px_rgba(255,255,255,0.05),2px_2px_8px_rgba(0,0,0,0.3)] border border-red-500/10" aria-label="Delete">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>

                <!-- Body -->
                <div class="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 pb-32">
                    
                    <div class="flex flex-col items-center text-center space-y-4">
                        <div class="w-20 h-20 rounded-full border border-[var(--theme-border)] bg-[var(--theme-accent-muted)] flex items-center justify-center shadow-[0_0_30px_var(--theme-accent-glow)] mb-2">
                            ${this.getIconForType(record.entityType).replace('w-5 h-5', 'w-10 h-10')}
                        </div>
                        <span class="px-4 md:px-8 lg:px-12 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-[10px] uppercase font-black tracking-[0.2em] shadow-sm">${escapeHTML(record.entityType)}</span>
                        <h2 class="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-md">${escapeHTML(record.title)}</h2>
                        ${record.subtitle ? `<h3 class="text-lg font-medium text-[var(--theme-accent)]/80">${escapeHTML(record.subtitle)}</h3>` : ''}
                        <span class="text-xs text-white/40 font-mono tracking-widest pt-2">${this.formatExactDate(record.rawDate)}</span>
                    </div>

                    ${record.desc ? `
                        <div class="unified-card p-6 mt-8 relative">
                            <h4 class="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 font-bold border-b border-white/5 pb-3">Notes & Details</h4>
                            <p class="text-base text-white/80 leading-relaxed font-medium mt-3 whitespace-pre-wrap">${escapeHTML(record.desc)}</p>
                        </div>
                    ` : ''}

                    ${record.documentUrl ? `
                        <div class="mt-8">
                            <h4 class="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4 font-bold pl-2">Attached Document</h4>
                            <div class="rounded-[24px] overflow-hidden border border-white/10 bg-black/60 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                ${isImage ? `
                                    <img src="${escapeHTML(record.documentUrl)}" alt="Document" class="w-full h-auto object-contain max-h-[60vh] transition-transform hover:scale-105 duration-700">
                                ` : `
                                    <iframe src="${escapeHTML(record.documentUrl)}" class="w-full h-[60vh] border-0" title="Document PDF"></iframe>
                                `}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Animate in
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('#detail-backdrop').classList.remove('opacity-0');
            // Using a short timeout ensures the transform transition triggers correctly on Safari
            setTimeout(() => {
                const card = modal.querySelector('#detail-card');
                if(card) {
                    // Replaced cubic-bezier(0.16, 1, 0.3, 1) inline CSS with Tailwind standard classes 
                    // for safety. We keep the transition-transform duration-500.
                    card.style.transitionTimingFunction = 'cubic-bezier(0.16, 1, 0.3, 1)';
                    card.classList.remove('translate-y-full');
                }
            }, 10);
        });

        const closeModal = () => {
            modal.querySelector('#detail-backdrop').classList.add('opacity-0');
            modal.querySelector('#detail-card').classList.add('translate-y-full');
            setTimeout(() => modal.remove(), 500);
        };

        modal.querySelector('#close-detail-btn').onclick = closeModal;
        modal.querySelector('#detail-backdrop').onclick = closeModal;

        modal.querySelector('#delete-record-btn').onclick = async () => {
            if (confirm(`Are you sure you want to delete this ${record.entityType}?`)) {
                try {
                    const { default: ClinicalLogger } = await import('../services/ClinicalLogger.js');
                    await ClinicalLogger.deleteRecord(tableName, recordId);
                    closeModal();
                    this.loadData().then(() => this.render());
                } catch (e) {
                    console.error('Failed to delete:', e);
                    alert('Deletion failed: ' + e.message);
                }
            }
        };
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
