/**
 * @fileoverview Local Client-Side Notification Engine.
 * Architecture: ES6 Module, Zero-Dependency.
 * Paradigm: Offline-first push notifications using native browser APIs and polling.
 */

class NotificationEngine {
  constructor() {
    /** @type {'granted'|'denied'|'default'} Current notification permission state */
    this._permission = 'default';
    
    /** @type {Map<string, number>} Active setTimeout handles mapped by jobId */
    this._scheduledJobs = new Map();
    
    /** @type {Set<string>} Tracks doses fired today to prevent double-firing from polling */
    this._firedDoses = new Set();
    
    /** @type {number|null} setInterval handle for background sync loop */
    this._pollInterval = null;

    // Check existing permissions on boot without prompting
    if ('Notification' in window) {
      this._permission = Notification.permission;
    }
  }

  /**
   * Requests system-level notification permissions from the user.
   * Gracefully handles unsupported browsers without throwing.
   * @returns {Promise<boolean>} True if permission was granted.
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('[NotificationEngine] Browser does not support Notifications API.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this._permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.warn('[NotificationEngine] Error requesting permission:', error);
      return false;
    }
  }

  /**
   * Purges existing schedules and computes the timeout sequence for all active medications.
   * @param {Object[]} medications - Array of active medication objects.
   * @returns {Promise<void>}
   */
  async scheduleAllDoses(medications = []) {
    if (!medications || medications.length === 0) return;

    this._clearAll();
    
    let scheduledCount = 0;
    
    for (const medication of medications) {
      const count = this._scheduleMedication(medication);
      scheduledCount += count;
    }

    // Schedule midnight reset job to calculate tomorrow's doses
    this._scheduleMidnightReset(medications);

  }

  /**
   * Internal routine to calculate millisecond offsets for a single medication's times.
   * @private
   * @param {Object} medication 
   * @returns {number} The amount of scheduled doses.
   */
  _scheduleMedication(medication) {
    if (!Array.isArray(medication.times) && !Array.isArray(medication.scheduledTimes)) return 0;
    
    const times = medication.times || medication.scheduledTimes;
    let scheduledCount = 0;

    const now = new Date();

    for (const timeStr of times) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      const targetTime = new Date();
      targetTime.setHours(hours, minutes, 0, 0);

      const msUntilDose = targetTime.getTime() - now.getTime();
      const jobId = `${medication.id}_${timeStr}`;

      // Only schedule if time is in the future
      if (msUntilDose > 0) {
        const timeoutId = setTimeout(() => {
          this._fireDoseReminder(medication, timeStr);
        }, msUntilDose);

        this._scheduledJobs.set(jobId, timeoutId);
        scheduledCount++;
      }
    }

    return scheduledCount;
  }

  /**
   * Schedules a background task 1 minute before midnight to queue the next day's alarms.
   * @private
   */
  _scheduleMidnightReset(medications) {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(23, 59, 0, 0);

    const msUntilMidnight = midnight.getTime() - now.getTime();
    
    if (msUntilMidnight > 0) {
      const timeoutId = setTimeout(() => {
        this._firedDoses.clear(); // Clear today's cache
        this.scheduleAllDoses(medications);
      }, msUntilMidnight);
      
      this._scheduledJobs.set('midnight_reset', timeoutId);
    }
  }

  /**
   * Triggers the native OS notification banner.
   * @private
   */
  _fireDoseReminder(medication, timeStr) {
    const jobId = `${medication.id}_${timeStr}`;
    
    // Mark as fired to prevent polling loop from triggering it again
    this._firedDoses.add(jobId);
    this._scheduledJobs.delete(jobId);

    if (this._permission !== 'granted') return;

    try {
      const notification = new Notification(`💊 Time for ${medication.name || medication.genericName}`, {
        body: `Scheduled dose: ${medication.dosage || 'Prescribed dose'}.\nTap to log it.`,
        icon: './assets/icons/icon-192.png',
        badge: './assets/icons/badge-72.png',
        tag: `dose_${medication.id}`,
        requireInteraction: true, // Keep on screen until acknowledged
        data: { medicationId: medication.id, scheduledAt: new Date().toISOString() }
      });

      notification.onclick = () => {
        window.focus();
        window.location.hash = '#/dashboard';
        notification.close();
      };

    } catch (error) {
      console.error('[NotificationEngine] Failed to fire notification:', error);
    }
  }

  /**
   * A redundancy loop. Browsers often throttle `setTimeout` for background tabs.
   * This loop runs every 60 seconds to catch any missed doses and fire them.
   * @param {Object[]} medications 
   */
  startPollingScheduler(medications = []) {
    if (this._pollInterval) this.stopPollingScheduler();

    this._pollInterval = setInterval(() => {
      const now = new Date();
      const currentTime = now.getTime();

      for (const medication of medications) {
        const times = medication.times || medication.scheduledTimes || [];
        
        for (const timeStr of times) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          
          const targetTime = new Date();
          targetTime.setHours(hours, minutes, 0, 0);
          
          const targetMs = targetTime.getTime();
          const jobId = `${medication.id}_${timeStr}`;

          // If the dose was due in the last 120 seconds AND hasn't been fired yet
          if (currentTime >= targetMs && (currentTime - targetMs) <= 120000) {
            if (!this._firedDoses.has(jobId)) {
              console.warn(`[NotificationEngine] Caught drifted alarm via polling for ${jobId}`);
              this._fireDoseReminder(medication, timeStr);
            }
          }
        }
      }
    }, 60000); // 60 seconds
  }

  /**
   * Halts the background polling loop.
   */
  stopPollingScheduler() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  /**
   * Wipes all pending timers. Used when medications are deleted/updated.
   * @private
   */
  _clearAll() {
    for (const timeoutId of this._scheduledJobs.values()) {
      clearTimeout(timeoutId);
    }
    this._scheduledJobs.clear();
  }

  /**
   * Gets the count of currently pending alarms.
   * @returns {number}
   */
  getScheduledCount() {
    return this._scheduledJobs.size;
  }

  /**
   * Developer method to verify OS-level notification permissions are working.
   */
  sendTestNotification() {
    if (this._permission !== 'granted') {
      console.warn('[NotificationEngine] Cannot test: Permission not granted.');
      return;
    }
    
    new Notification('MedCare is working!', {
      body: 'Notifications are correctly configured on this device.',
      icon: './assets/icons/icon-192.png'
    });
  }
}

export const notificationEngine = new NotificationEngine();