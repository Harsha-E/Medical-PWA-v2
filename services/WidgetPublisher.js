import db from '../core/db.js';
import state from '../core/state.js';

export default class WidgetPublisher {
    static instance = null;

    constructor() {
        if (WidgetPublisher.instance) {
            return WidgetPublisher.instance;
        }
        WidgetPublisher.instance = this;
    }

    static getInstance() {
        if (!WidgetPublisher.instance) {
            WidgetPublisher.instance = new WidgetPublisher();
        }
        return WidgetPublisher.instance;
    }

    init() {
        // Listen to custom DOM events to trigger updates
        window.addEventListener('medicationTaken', () => this.publishMedicationsWidget());
        window.addEventListener('profileUpdated', () => this.publishEmergencyWidget());

        // Publish initially
        if ('serviceWorker' in navigator) {
            if (navigator.serviceWorker.controller) {
                this.publishMedicationsWidget();
                this.publishEmergencyWidget();
            } else {
                console.warn('[WidgetPublisher] Waiting for active Service Worker controller...');
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    this.publishMedicationsWidget();
                    this.publishEmergencyWidget();
                }, { once: true });
            }
        }
    }

    async publishMedicationsWidget() {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
            return;
        }

        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const meds = await db.medications.toArray();
            
            // Basic logic: filter medications for today and find the next pending dose
            let nextMedName = 'No Meds';
            let nextMedTime = '--:--';
            let pendingCount = 0;
            const now = new Date();
            const currentTimeStr = now.toTimeString().substring(0, 5);

            const todaysMeds = meds.filter(m => m.startDate <= todayStr && (!m.endDate || m.endDate >= todayStr));
            const upcoming = [];

            todaysMeds.forEach(m => {
                if (m.schedule) {
                    m.schedule.forEach(time => {
                        const doseId = `${m.id}_${todayStr}_${time}`;
                        const isTaken = state.logs && state.logs[doseId] && state.logs[doseId].status === 'taken';
                        if (!isTaken) {
                            pendingCount++;
                            if (time >= currentTimeStr) {
                                upcoming.push({ name: m.name, time });
                            }
                        }
                    });
                }
            });

            if (upcoming.length > 0) {
                upcoming.sort((a, b) => a.time.localeCompare(b.time));
                nextMedName = upcoming[0].name;
                nextMedTime = upcoming[0].time;
            }

            navigator.serviceWorker.controller.postMessage({
                type: 'UPDATE_WIDGET',
                tag: 'medications_today',
                payload: {
                    nextMedName,
                    nextMedTime,
                    pendingCount: pendingCount.toString()
                }
            });
            console.log('[WidgetPublisher] medications_today widget updated.');
        } catch (err) {
            console.error('[WidgetPublisher] Error publishing medications widget:', err);
        }
    }

    async publishEmergencyWidget() {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
            return;
        }

        try {
            const profile = state.userProfile || {};
            
            const payload = {
                bloodGroup: profile.bloodGroup || 'Unknown',
                criticalAllergies: profile.allergies && Array.isArray(profile.allergies) ? profile.allergies.join(', ') : 'None documented',
                emergencyContact: profile.emergencyContact || 'Not set',
                qrData: profile.sosQrBase64 || ''
            };

            navigator.serviceWorker.controller.postMessage({
                type: 'UPDATE_WIDGET',
                tag: 'emergency_id',
                payload
            });
            console.log('[WidgetPublisher] emergency_id widget updated.');
        } catch (err) {
            console.error('[WidgetPublisher] Error publishing emergency widget:', err);
        }
    }
}
