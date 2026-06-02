export class CoverageVisualizer {
    constructor() {
        this.containerId = 'coverage-visualizer';
    }

    initContainer() {
        if (!document.getElementById(this.containerId)) {
            const container = document.createElement('div');
            container.id = this.containerId;
            container.style.position = 'absolute';
            container.style.bottom = '32px';
            container.style.right = '32px';
            container.style.width = '60px';
            container.style.height = '120px';
            container.style.borderRadius = '30px';
            container.style.border = '2px solid rgba(255, 255, 255, 0.2)';
            container.style.overflow = 'hidden';
            container.style.backgroundColor = 'rgba(0,0,0,0.2)';
            container.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
            container.style.zIndex = '500';
            
            // The fill element
            const fill = document.createElement('div');
            fill.id = 'coverage-fill';
            fill.style.position = 'absolute';
            fill.style.bottom = '0';
            fill.style.left = '0';
            fill.style.width = '100%';
            fill.style.height = '0%';
            fill.style.backgroundColor = 'var(--frosted-mint)';
            fill.style.transition = 'height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            fill.style.boxShadow = 'inset 0 4px 6px rgba(255,255,255,0.5)';
            
            container.appendChild(fill);
            document.body.appendChild(container);
        }
    }

    /**
     * Updates the Mini Medicine Model fill level
     * @param {number} percentage - Coverage percentage (0-100)
     */
    updateCoverage(percentage) {
        this.initContainer();
        const fill = document.getElementById('coverage-fill');
        
        // Ensure percentage is bounded
        const bounded = Math.max(0, Math.min(100, percentage));
        
        fill.style.height = `${bounded}%`;

        // Change color based on completion
        if (bounded >= 90) {
            fill.style.backgroundColor = 'var(--frosted-mint)'; // Verified
        } else if (bounded >= 60) {
            fill.style.backgroundColor = 'var(--soft-cyan)'; // Getting there
        } else {
            fill.style.backgroundColor = '#ffd166'; // Needs more scan data
        }
    }

    hide() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.style.display = 'none';
        }
    }
}

export const coverageVisualizer = new CoverageVisualizer();
