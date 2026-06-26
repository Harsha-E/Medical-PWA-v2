/**
 * timeline.js
 * Renders local JSON disease history in a vertical timeline.
 * Features Doctor Mode for high-contrast, read-only clinical viewing.
 */

export default class MedicalTimelineView {
    constructor(container) {
        this.container = container;
        this.isDoctorMode = false;
        
        // In production, fetch this from IndexedDB via services/HistoryManager.js
        this.localHistory = [
            { date: '2026-05-10', condition: 'Heart Failure', status: 'Active', meds: ['Atorvastatin'] },
            { date: '2025-11-22', condition: 'Hypertension', status: 'Active', meds: ['Lisinopril'] },
            { date: '2023-01-15', condition: 'Pneumonia', status: 'Resolved', meds: [] }
        ];

        this.render();
    }

    render() {
        // Toggle UI logic based on Doctor Mode state
        const bgColor = this.isDoctorMode ? '#ffffff' : 'transparent';
        const textColor = this.isDoctorMode ? '#000000' : '#ffffff';
        const docClass = this.isDoctorMode ? 'doctor-mode-active' : '';

        let timelineHtml = `<div style="border-left: 3px solid #1e90ff; margin-left: 20px; padding-left: 20px;">`;
        
        this.localHistory.forEach(record => {
            const statusColor = record.status === 'Active' ? '#ff4757' : '#2ed573';
            
            timelineHtml += `
                <div style="position: relative; margin-bottom: 30px; color: ${textColor};">
                    <!-- Timeline Dot -->
                    <div style="position: absolute; left: -28.5px; top: 0; width: 14px; height: 14px; border-radius: 50%; background: ${statusColor}; border: 3px solid ${this.isDoctorMode ? '#fff' : '#22273b'};"></div>
                    
                    <div style="font-weight: 800; font-size: 1.2rem;">${record.condition}</div>
                    <div style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 8px;">Date: ${record.date} • <span style="color: ${statusColor}; font-weight: bold;">${record.status}</span></div>
                    
                    <!-- Only show action buttons if NOT in doctor mode -->
                    ${!this.isDoctorMode ? `<button style="background: rgba(255,255,255,0.1); color: white; border: none; padding: 5px 10px; border-radius: 8px; font-size: 0.8rem; cursor: pointer;">Edit Record</button>` : ''}
                    
                    ${record.meds.length > 0 ? `<div style="margin-top: 10px; padding: 10px; background: ${this.isDoctorMode ? '#f1f2f6' : 'rgba(0,0,0,0.2)'}; border-radius: 8px; font-size: 0.9rem;">Related Meds: ${record.meds.join(', ')}</div>` : ''}
                </div>
            `;
        });
        timelineHtml += `</div>`;

        this.container.innerHTML = `
            <div class="${docClass}" style="padding: 20px; background: ${bgColor}; border-radius: 20px; transition: all 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h2 style="color: ${textColor}; margin: 0; font-size: 1.8rem;">Clinical History</h2>
                    
                    <!-- Doctor Mode Toggle -->
                    <button id="toggle-doctor-mode" style="background: ${this.isDoctorMode ? '#ff4757' : '#1e90ff'}; color: white; border: none; padding: 10px 20px; border-radius: 30px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                        ${this.isDoctorMode ? 'Exit Doctor Mode' : '🧑⚕️ Doctor Mode'}
                    </button>
                </div>
                
                ${timelineHtml}
            </div>
        `;

        this.container.querySelector('#toggle-doctor-mode').onclick = () => {
            this.isDoctorMode = !this.isDoctorMode;
            this.render();
        };
    }
}
