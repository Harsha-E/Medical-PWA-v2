/**
 * clinical-ledger.js
 * Replaces the old appointment screen.
 * Features a Dual-Tab layout: Chronological Timeline & Active Disease Registry.
 */

export default class ClinicalLedgerView {
    constructor() {
        this.activeTab = 'timeline'; // 'timeline' or 'diseases'
        
        // Mock Data for structural layout
        this.timelineData = [
            { date: 'Today, 8:00 AM', type: 'Medication', title: 'Fepanil 500mg', desc: 'Marked as Taken' },
            { date: 'Approx. Jan 2025', type: 'Symptom', title: 'Severe Migraine', desc: 'Lasted 3 days' }
        ];
        
        this.diseaseData = [
            { name: 'Hypertension', diagnosed: '2023', status: 'Active Monitoring' },
            { name: 'Penicillin Allergy', diagnosed: 'Childhood', status: 'Severe / Anaphylaxis' }
        ];

    }

    render() {
        this.container = document.createElement('div');
        this.container.className = 'container';
        this.container.innerHTML = `
            <div style="padding: 20px; padding-bottom: 120px; min-height: 100vh; overflow-y: auto;">
                
                <!-- Header & Export -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h1 style="font-size: 1.8rem; font-weight: 800; margin: 0;">Clinical Ledger</h1>
                    <button id="btn-export" style="background: rgba(30, 144, 255, 0.15); color: #1e90ff; border: 1px solid rgba(30,144,255,0.3); padding: 8px 16px; border-radius: 20px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                        📄 Export PDF
                    </button>
                </div>

                <!-- Custom Dual-Tab Switcher -->
                <div style="display: flex; background: rgba(0,0,0,0.3); border-radius: 16px; padding: 4px; margin-bottom: 30px;">
                    <button class="tab-btn ${this.activeTab === 'timeline' ? 'active-tab' : ''}" data-tab="timeline" style="flex: 1; padding: 12px; border-radius: 12px; border: none; font-weight: 600; color: ${this.activeTab === 'timeline' ? '#fff' : '#a4b0be'}; background: ${this.activeTab === 'timeline' ? '#22273b' : 'transparent'}; box-shadow: ${this.activeTab === 'timeline' ? '0 4px 10px rgba(0,0,0,0.3)' : 'none'}; transition: all 0.2s;">
                        Timeline
                    </button>
                    <button class="tab-btn ${this.activeTab === 'diseases' ? 'active-tab' : ''}" data-tab="diseases" style="flex: 1; padding: 12px; border-radius: 12px; border: none; font-weight: 600; color: ${this.activeTab === 'diseases' ? '#fff' : '#a4b0be'}; background: ${this.activeTab === 'diseases' ? '#22273b' : 'transparent'}; box-shadow: ${this.activeTab === 'diseases' ? '0 4px 10px rgba(0,0,0,0.3)' : 'none'}; transition: all 0.2s;">
                        Active Diseases
                    </button>
                </div>

                <!-- Tab Content Area -->
                <div id="ledger-content">
                    ${this.activeTab === 'timeline' ? this.renderTimeline() : this.renderDiseases()}
                </div>
            </div>
        `;

        this.bindEvents();
    }

    renderTimeline() {
        return `
            <div style="border-left: 2px solid rgba(255,255,255,0.1); padding-left: 20px; margin-left: 10px;">
                ${this.timelineData.map(item => `
                    <div style="position: relative; margin-bottom: 25px;">
                        <div style="position: absolute; left: -27px; top: 5px; width: 12px; height: 12px; border-radius: 50%; background: #1e90ff; box-shadow: 0 0 10px rgba(30,144,255,0.5);"></div>
                        <div style="color: #1e90ff; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">${item.date}</div>
                        <div class="clay-card" style="padding: 16px;">
                            <h3 style="margin: 0 0 4px 0; font-size: 1.1rem;">${item.title}</h3>
                            <p style="margin: 0; color: #a4b0be; font-size: 0.9rem;">${item.desc}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderDiseases() {
        return `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                ${this.diseaseData.map(item => `
                    <div class="clay-card" style="padding: 20px; border-left: 4px solid #ff4757;">
                        <h3 style="margin: 0 0 8px 0; font-size: 1.2rem;">${item.name}</h3>
                        <div style="display: flex; justify-content: space-between; color: #a4b0be; font-size: 0.9rem;">
                            <span>Diagnosed: ${item.diagnosed}</span>
                            <span style="color: #ff4757; font-weight: bold;">${item.status}</span>
                        </div>
                    </div>
                `).join('')}
                
                <button style="margin-top: 10px; width: 100%; padding: 16px; border-radius: 20px; border: 2px dashed rgba(255,255,255,0.1); background: transparent; color: #fff; font-weight: bold; font-size: 1rem;">
                    + Log New Condition
                </button>
            </div>
        `;
    }

    bindEvents() {
        const tabs = this.container.querySelectorAll('.tab-btn');
        tabs.forEach(btn => {
            btn.onclick = (e) => {
                this.activeTab = e.currentTarget.getAttribute('data-tab');
                this.render(); // Re-render toggles the active tab UI
            };
        });

        const exportBtn = this.container.querySelector('#btn-export');
        exportBtn.onclick = () => {
            alert("This will trigger html2canvas and jsPDF to download a clinical summary report.");
        };
        
        return this.container;
    }
}
