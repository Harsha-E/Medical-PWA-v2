export class LiveEvidencePipeline {
    constructor() {
        this.containerId = 'live-evidence-pipeline';
        this.checkpoints = {
            contours: { label: 'Strip Contours Detected', status: 'pending' },
            shape: { label: 'Tablet Shape Verified', status: 'pending' },
            text: { label: 'Brand Text OCR', status: 'pending' },
            dosage: { label: 'Dosage Verified', status: 'pending' },
            packaging: { label: 'Packaging Layout Matched', status: 'pending' }
        };
    }

    initContainer() {
        if (!document.getElementById(this.containerId)) {
            const container = document.createElement('div');
            container.id = this.containerId;
            container.className = 'clay-panel';
            container.style.position = 'absolute';
            container.style.top = '120px';
            container.style.left = '32px';
            container.style.padding = '24px';
            container.style.width = '300px';
            container.style.zIndex = '1500';
            container.style.display = 'none';
            container.style.flexDirection = 'column';
            container.style.gap = '12px';
            
            const header = document.createElement('h3');
            header.innerText = 'Teacher Mode: Live Evidence';
            header.style.margin = '0 0 16px 0';
            header.style.fontSize = '16px';
            header.style.color = 'var(--soft-cyan)';
            
            container.appendChild(header);
            
            // Build checklist DOM
            Object.keys(this.checkpoints).forEach(key => {
                const item = document.createElement('div');
                item.id = `evidence-item-${key}`;
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.gap = '12px';
                item.style.fontSize = '14px';
                
                item.innerHTML = `
                    <span class="status-icon" style="font-size: 18px;">⏳</span>
                    <span class="status-label" style="color: var(--text-secondary); transition: color 0.3s;">${this.checkpoints[key].label}</span>
                `;
                container.appendChild(item);
            });

            document.body.appendChild(container);
        }
    }

    /**
     * Updates the pipeline checklist
     * @param {Object} updates - e.g. { contours: 'pass', text: 'fail' }
     */
    updatePipelineCheckpoints(updates) {
        this.initContainer();
        
        Object.keys(updates).forEach(key => {
            if (this.checkpoints[key]) {
                this.checkpoints[key].status = updates[key];
                
                const item = document.getElementById(`evidence-item-${key}`);
                if (item) {
                    const icon = item.querySelector('.status-icon');
                    const label = item.querySelector('.status-label');
                    
                    if (updates[key] === 'pass') {
                        icon.innerText = '✅';
                        label.style.color = 'var(--text-primary)';
                    } else if (updates[key] === 'fail') {
                        icon.innerText = '❌';
                        label.style.color = '#ef476f';
                    } else if (updates[key] === 'working') {
                        icon.innerText = '🔄';
                        label.style.color = 'var(--soft-cyan)';
                    }
                }
            }
        });
    }

    toggleVisibility(show) {
        this.initContainer();
        const container = document.getElementById(this.containerId);
        container.style.display = show ? 'flex' : 'none';
    }
}

export const liveEvidencePipeline = new LiveEvidencePipeline();
