export class MedicalDisclaimerManager {
    constructor() {
        this.storageKey = 'medcare_disclaimer_accepted';
    }

    /**
     * Checks if the user has accepted the medical disclaimer
     */
    hasAcceptedDisclaimer() {
        return localStorage.getItem(this.storageKey) === 'true';
    }

    /**
     * Logs the acceptance of the medical disclaimer
     */
    confirmDisclaimerAcceptance() {
        localStorage.setItem(this.storageKey, 'true');
        console.log('[MedicalDisclaimerManager] Disclaimer accepted.');
    }

    /**
     * Resets the acceptance state (useful for updates or testing)
     */
    resetAcceptance() {
        localStorage.removeItem(this.storageKey);
    }
}

export const medicalDisclaimerManager = new MedicalDisclaimerManager();
