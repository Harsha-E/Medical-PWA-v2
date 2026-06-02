export class GuidanceEngine {
    constructor() {
        this.containerId = 'doctor-bubble-container';
        this.contextDictionary = {
            'scan-view': 'Position the medicine strip inside the camera frame.',
            'dashboard': 'Here is your daily health summary.',
            'family-hub': 'Tap a family member to see their shared medicines.',
            'reports-vault': 'Upload physical reports to track biomarkers over time.',
            'add-medication': 'Need help? You can tap the "Scan" icon to fill medicine details automatically.'
        };
        this.inactivityTimer = null;
    }

    /**
     * Injects the Doctor Bubble container into the DOM if it doesn't exist
     */
    initContainer() {
        if (!document.getElementById(this.containerId)) {
            const container = document.createElement('div');
            container.id = this.containerId;
            container.style.position = 'fixed';
            container.style.bottom = '120px';
            container.style.left = '50%';
            container.style.transform = 'translateX(-50%)';
            container.style.zIndex = '1000';
            container.style.transition = 'all 0.3s ease';
            container.style.opacity = '0';
            container.style.pointerEvents = 'none';
            document.body.appendChild(container);
        }
    }

    /**
     * Displays a short, one-sentence conversational prompt
     * @param {string} message - Max one sentence
     * @param {number} duration - Time in ms before fading out
     */
    promptGuidance(message, duration = 3000) {
        this.initContainer();
        const container = document.getElementById(this.containerId);
        
        // Use clay-panel for the bubble
        container.innerHTML = `
            <div class="clay-panel" style="padding: 12px 24px; display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">👨‍⚕️</span>
                <span style="font-weight: 500;">${message}</span>
            </div>
        `;
        
        // Fade in
        container.style.opacity = '1';
        container.style.transform = 'translateX(-50%) translateY(0)';

        // Clear existing timeout to prevent flickering
        if (this.timeoutId) clearTimeout(this.timeoutId);

        // Fade out
        this.timeoutId = setTimeout(() => {
            container.style.opacity = '0';
            container.style.transform = 'translateX(-50%) translateY(10px)';
        }, duration);
    }

    /**
     * Translates a technical recovery strategy into a one-sentence visual prompt
     * @param {string} recoveryStrategy - e.g., 'STRATEGY_TILT_AWAY', 'STRATEGY_FLATTEN_STRIP'
     */
    provideVisualCoaching(recoveryStrategy) {
        if (!recoveryStrategy) return;

        let message = '';
        switch (recoveryStrategy) {
            case 'STRATEGY_TILT_AWAY':
                message = 'Tilt the strip slightly to remove glare.';
                break;
            case 'STRATEGY_HOLD_STEADY':
                message = 'Hold steady, focusing...';
                break;
            case 'STRATEGY_FLATTEN_STRIP':
                message = 'Flatten the strip on a table.';
                break;
            case 'STRATEGY_REPOSITION':
                message = 'Move the strip into the center frame.';
                break;
            default:
                message = 'Adjust the medicine strip.';
        }

        this.promptGuidance(message, 2500);
    }

    /**
     * Shows a contextual help bubble based on the current UI node
     * @param {string} nodeId - The identifier for the current view or component
     */
    showContextHelp(nodeId) {
        const helpText = this.contextDictionary[nodeId] || 'Need some help? Contact support.';
        this.promptGuidance(helpText, 4000);
    }

    /**
     * Starts tracking user idle state.
     * @param {string} pageContext
     * @param {number} [timeoutMs=15000]
     */
    monitorInactivity(pageContext, timeoutMs = 15000) {
        this.resetTimer();
        const tip = this.contextDictionary[pageContext];
        if (!tip) return;

        this.inactivityTimer = setTimeout(() => {
            this.promptGuidance(tip, 5000);
        }, timeoutMs);
    }

    resetTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    }
}

export const guidanceEngine = new GuidanceEngine();
