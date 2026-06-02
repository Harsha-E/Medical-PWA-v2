export class FailureRecoveryUI {
    constructor() {
        this.containerId = 'failure-recovery-overlay';
    }

    initContainer() {
        if (!document.getElementById(this.containerId)) {
            const container = document.createElement('div');
            container.id = this.containerId;
            container.style.position = 'absolute';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.backgroundColor = 'rgba(26, 26, 46, 0.8)'; // Sunset Obsidian with opacity
            container.style.backdropFilter = 'blur(8px)';
            container.style.zIndex = '2000';
            container.style.display = 'none';
            container.style.flexDirection = 'column';
            container.style.justifyContent = 'center';
            container.style.alignItems = 'center';
            container.style.padding = '24px';
            document.body.appendChild(container);
        }
    }

    /**
     * Displays a visual fallback when a critical component fails
     * @param {string} errorType - e.g., 'CAMERA_DENIED', 'DB_SYNC_FAIL'
     */
    displayFallback(errorType) {
        this.initContainer();
        const container = document.getElementById(this.containerId);
        
        let visual = '⚠️';
        let message = 'Something went wrong.';
        let action = 'Try Again';

        switch(errorType) {
            case 'CAMERA_DENIED':
                visual = '📷';
                message = 'We need camera access to scan medicines.';
                action = 'Open Settings';
                break;
            case 'DB_SYNC_FAIL':
                visual = '📡';
                message = 'Offline mode active. Using local knowledge.';
                action = 'Dismiss';
                break;
            case 'CRITICAL_CRASH':
                visual = '🛠️';
                message = 'The intelligence engine needs a moment.';
                action = 'Restart Scanner';
                break;
        }

        container.innerHTML = `
            <div class="clay-panel" style="padding: 32px; text-align: center; max-width: 300px;">
                <div style="font-size: 48px; margin-bottom: 16px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">${visual}</div>
                <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 500;">${message}</h3>
                <button class="clay-panel" style="
                    background: var(--soft-cyan);
                    color: var(--sunset-obsidian);
                    border: none;
                    padding: 12px 24px;
                    font-weight: 600;
                    font-size: 16px;
                    cursor: pointer;
                    width: 100%;
                ">${action}</button>
            </div>
        `;

        container.style.display = 'flex';

        // Add dismiss listener for non-critical errors
        const btn = container.querySelector('button');
        btn.addEventListener('click', () => {
            if (errorType === 'DB_SYNC_FAIL') {
                this.hideFallback();
            } else {
                console.log(`[FailureRecoveryUI] Triggering action for ${errorType}`);
                // In a real app, this would route to settings or reload
                this.hideFallback();
            }
        });
    }

    hideFallback() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.style.display = 'none';
        }
    }
}

export const failureRecoveryUI = new FailureRecoveryUI();
