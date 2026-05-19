/**
 * @fileoverview Client-Side Notification Engine for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module.
 * Paradigm: Offline-First Local Scheduling & Throttling Resilience.
 * * Manages dose reminder notifications using the native browser Notification API.
 * Employs a hybrid approach of exact setTimeouts and a polling fallback loop
 * to guarantee delivery even if the browser throttles background tab timers.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const SCHEDULER_POLL_INTERVAL_MS = 60000; // 60 seconds
const DRIFT_TOLERANCE_WINDOW_MS = 120000; // 120 seconds maximum accepted timer drift
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const NOTIFICATION_ICON_PATH = './assets/icons/icon-192x192.png';
const NOTIFICATION_BADGE_PATH = './assets/icons/icon-192x192.png'; // Fallback to icon if badge missing

/**
 * @typedef {Object} MedicationSchedule
 * @property {string|number} id
 * @property {string} name
 * @property {string} dosage
 * @property {string[]} scheduledTimes - Array of "HH:MM" 24h formatted strings.
 * @property {string[]} [activeDays] - Array of day strings like 'mon', 'tue'.
 */

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class NotificationEngine {
    constructor() {
        /**
         * The current system permission state for the Notification API.
         * @private
         * @type {NotificationPermission|'unsupported'}
         */
        this._permission = this._checkSupport() ? Notification.permission : 'unsupported';

        /**
         * Tracks active precise timeout handles.
         * Key: `${medicationId}_${timeStr}`
         * Value: Timeout ID
         * @private
         * @type {Map<string, number>}
         */
        this._scheduledJobs = new Map();

        /**
         * Tracks specific dose alerts that have already fired today to prevent double-firing 
         * between the timeout queue and the polling fallback loop.
         * @private
         * @type {Set<string>}
         */
        this._firedToday = new Set();

        /**
         * Handle for the background drift-correction polling loop.
         * @private
         * @type {number|null}
         */
        this._pollInterval = null;

        /**
         * Handle for the midnight reset cron task.
         * @private
         * @type {number|null}
         */
        this._midnightResetJob = null;
    }

    /**
     * Safely verifies if the native Notification API is supported by the client environment.
     * @private
     * @returns {boolean}
     */
    _checkSupport() {
        return typeof window !== 'undefined' && 'Notification' in window;
    }

    /**
     * Requests explicit permission from the user to display system-level alerts.
     * Fails gracefully without throwing if the API is restricted or unsupported.
     * @returns {Promise<boolean>} True if permission is granted.
     */
    async requestPermission() {
        if (!this._checkSupport()) {
            console.warn('[NotificationEngine] Notification API is not supported on this device/browser.');
            return false;
        }

        try {
            // Browsers may automatically reject if not triggered by a direct user gesture
            const permissionResult = await Notification.requestPermission();
            this._permission = permissionResult;
            
            if (permissionResult === 'granted') {
                console.log('[NotificationEngine] System notification access granted.');
                return true;
            } else {
                console.warn(`[NotificationEngine] System notification access ${permissionResult}. Core functionality will continue silently.`);
                return false;
            }
        } catch (error) {
            console.error('[NotificationEngine:requestPermission] Permission request failed:', error);
            return false;
        }
    }

    /**
     * Clears previous schedules and calculates explicit timeouts for all active medications.
     * @param {MedicationSchedule[]} medications - Array of active medication profiles.
     * @returns {Promise<void>}
     */
    async scheduleAllDoses(medications) {
        try {
            this._clearAll();
            
            // Clear the daily fired tracking Set to allow new alarms
            this._firedToday.clear();

            if (!Array.isArray(medications) || medications.length === 0) {
                console.log('[NotificationEngine] No medications provided for scheduling. Engine idle.');
                return;
            }

            for (const medication of medications) {
                this._scheduleMedication(medication);
            }

            this._scheduleMidnightReset(medications);
            
            console.log(`[NotificationEngine] Synchronized. ${this.getScheduledCount()} exact dose alerts scheduled for today.`);

        } catch (error) {
            console.error('[NotificationEngine:scheduleAllDoses] Critical failure scheduling matrix:', error);
        }
    }

    /**
     * Parses a specific medication's timing arrays and sets up JavaScript timeouts.
     * @private
     * @param {MedicationSchedule} medication 
     */
    _scheduleMedication(medication) {
        if (!medication || !Array.isArray(medication.scheduledTimes)) return;

        const currentSystemTime = new Date();
        const currentDayIndex = currentSystemTime.getDay();
        const activeDaysMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const currentDayString = activeDaysMap[currentDayIndex];

        // Ensure medication is scheduled for today if day-constraints exist
        if (medication.activeDays && Array.isArray(medication.activeDays)) {
            if (!medication.activeDays.includes(currentDayString)) {
                return; // Medication is not active on this day of the week
            }
        }

        for (const timeString of medication.scheduledTimes) {
            try {
                const [hoursTarget, minutesTarget] = timeString.split(':').map(Number);
                
                const targetDate = new Date();
                targetDate.setHours(hoursTarget, minutesTarget, 0, 0);

                const millisecondsUntilDose = targetDate.getTime() - currentSystemTime.getTime();

                // Only schedule if the time has not already passed today
                if (millisecondsUntilDose > 0) {
                    const jobIdentifier = `${medication.id}_${timeString}`;
                    
                    const timeoutHandle = setTimeout(() => {
                        this._fireDoseReminder(medication, timeString);
                    }, millisecondsUntilDose);

                    this._scheduledJobs.set(jobIdentifier, timeoutHandle);
                }
            } catch (parseError) {
                console.warn(`[NotificationEngine] Failed to parse schedule string "${timeString}" for medication ${medication.id}`, parseError);
            }
        }
    }

    /**
     * Schedules a background task to rebuild the notification queue 1 minute before midnight.
     * Ensures continuous rolling schedules across day boundaries.
     * @private
     * @param {MedicationSchedule[]} activeMedications 
     */
    _scheduleMidnightReset(activeMedications) {
        if (this._midnightResetJob) {
            clearTimeout(this._midnightResetJob);
        }

        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        
        // Execute reset sequence 60 seconds prior to midnight
        const msUntilReset = (midnight.getTime() - now.getTime()) - SCHEDULER_POLL_INTERVAL_MS;

        if (msUntilReset > 0) {
            this._midnightResetJob = setTimeout(() => {
                console.log('[NotificationEngine] Executing midnight cron reset sequence.');
                this.scheduleAllDoses(activeMedications);
            }, msUntilReset);
        }
    }

    /**
     * Assembles and triggers the physical system notification payload.
     * @private
     * @param {MedicationSchedule} medication - The active drug payload.
     * @param {string} timeString - The specific execution time string (HH:MM) to log tracking keys.
     */
    _fireDoseReminder(medication, timeString) {
        const fireSignature = `${medication.id}_${timeString}`;
        
        if (this._firedToday.has(fireSignature)) {
            return; // Prevent duplicate firing from overlapping polling triggers
        }

        if (this._permission !== 'granted' || !this._checkSupport()) {
            // Silently mark as fired to prevent further polling attempts today
            this._firedToday.add(fireSignature);
            return; 
        }

        try {
            const notificationTitle = `💊 Time for ${medication.name}`;
            const notificationOptions = {
                body: `Scheduled dose: ${medication.dosage}. Tap to log it.`,
                icon: NOTIFICATION_ICON_PATH,
                badge: NOTIFICATION_BADGE_PATH,
                tag: `dose_${medication.id}`, // Groups identical alerts, overwriting stale ones
                requireInteraction: false, // Standard alert, avoids blocking the OS indefinitely
                data: {
                    medicationId: medication.id,
                    scheduledAt: new Date().toISOString()
                }
            };

            const systemAlert = new Notification(notificationTitle, notificationOptions);

            systemAlert.onclick = (event) => {
                event.preventDefault();
                
                // Focus the parent Window/PWA context if minimized
                if (typeof window !== 'undefined') {
                    window.focus();
                    window.location.hash = '#/dashboard';
                }
                
                systemAlert.close();
            };

            this._firedToday.add(fireSignature);
            console.log(`[NotificationEngine] Alert deployed for: ${medication.name}`);

        } catch (alertError) {
            console.error('[NotificationEngine:_fireDoseReminder] Failed to deploy system alert:', alertError);
        }
    }

    /**
     * Initializes a defensive 60-second polling loop.
     * If iOS/Android pauses background `setTimeout` threads, this loop catches missed alarms
     * immediately when the app regains priority focus.
     * @param {MedicationSchedule[]} medications 
     */
    startPollingScheduler(medications) {
        this.stopPollingScheduler();

        if (!Array.isArray(medications) || medications.length === 0) return;

        this._pollInterval = setInterval(() => {
            try {
                const currentSystemTime = new Date();
                const currentTimestamp = currentSystemTime.getTime();
                
                const currentDayIndex = currentSystemTime.getDay();
                const activeDaysMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                const currentDayString = activeDaysMap[currentDayIndex];

                for (const medication of medications) {
                    if (medication.activeDays && Array.isArray(medication.activeDays)) {
                        if (!medication.activeDays.includes(currentDayString)) continue;
                    }

                    for (const timeString of (medication.scheduledTimes || [])) {
                        const [hoursTarget, minutesTarget] = timeString.split(':').map(Number);
                        
                        const targetDate = new Date();
                        targetDate.setHours(hoursTarget, minutesTarget, 0, 0);
                        const targetTimestamp = targetDate.getTime();

                        const timeDifference = currentTimestamp - targetTimestamp;

                        // Identify alarms that are past due, but still within the acceptable 2-minute drift window
                        if (timeDifference >= 0 && timeDifference <= DRIFT_TOLERANCE_WINDOW_MS) {
                            const fireSignature = `${medication.id}_${timeString}`;
                            
                            // If the precise setTimeout failed to fire due to throttling, fire it now
                            if (!this._firedToday.has(fireSignature)) {
                                console.warn(`[NotificationEngine] Thread drift detected for ${medication.name}. Firing via fallback polling.`);
                                this._fireDoseReminder(medication, timeString);
                            }
                        }
                    }
                }
            } catch (pollError) {
                console.error('[NotificationEngine:startPollingScheduler] Integrity loop encountered an error:', pollError);
            }
        }, SCHEDULER_POLL_INTERVAL_MS);

        console.log('[NotificationEngine] Defensive background polling matrix active.');
    }

    /**
     * Halts the defensive background polling loop to conserve battery.
     */
    stopPollingScheduler() {
        if (this._pollInterval !== null) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
            console.log('[NotificationEngine] Defensive background polling matrix halted.');
        }
    }

    /**
     * Cancels all pending timeouts and clears the active job map.
     * @private
     */
    _clearAll() {
        for (const timeoutHandle of this._scheduledJobs.values()) {
            clearTimeout(timeoutHandle);
        }
        this._scheduledJobs.clear();
        
        if (this._midnightResetJob) {
            clearTimeout(this._midnightResetJob);
            this._midnightResetJob = null;
        }
    }

    /**
     * Retrieves the total number of explicitly scheduled JavaScript timeouts currently pending.
     * @returns {number}
     */
    getScheduledCount() {
        return this._scheduledJobs.size;
    }

    /**
     * Deploys an immediate system alert to verify API permissions and structural functionality.
     * Primarily utilized by the Admin Simulation view.
     * @returns {Promise<void>}
     */
    async sendTestNotification() {
        if (!this._checkSupport()) {
            console.warn('[NotificationEngine] Testing blocked: API unsupported.');
            return;
        }

        if (this._permission !== 'granted') {
            console.warn('[NotificationEngine] Testing blocked: Lacking system permissions. Requesting...');
            const granted = await this.requestPermission();
            if (!granted) return;
        }

        try {
            const testAlert = new Notification('✅ System Diagnostics', {
                body: 'MedCare notification routing is fully operational.',
                icon: NOTIFICATION_ICON_PATH,
                badge: NOTIFICATION_BADGE_PATH,
                tag: 'system_test',
                requireInteraction: false
            });

            testAlert.onclick = () => {
                if (typeof window !== 'undefined') window.focus();
                testAlert.close();
            };

            console.log('[NotificationEngine] Diagnostic payload deployed successfully.');

        } catch (testError) {
            console.error('[NotificationEngine:sendTestNotification] Diagnostic deployment failed:', testError);
        }
    }
}

// Export singleton instance of Notification Engine
export const notificationEngine = new NotificationEngine();