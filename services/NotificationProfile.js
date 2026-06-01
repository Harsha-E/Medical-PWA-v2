/**
 * @fileoverview Notification Profile Service — Smart Notification Optimizer
 * Tracks notification interaction history (opens, dismisses, timing)
 * and learns optimal reminder times to adapt notification schedules dynamically.
 */

export default class NotificationProfile {
  constructor(storageKey = 'medcare_notification_profile') {
    this.storageKey = storageKey;
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          interactions: parsed.interactions || [],
          optimalHours: parsed.optimalHours || {}
        };
      }
    } catch (e) {
      console.warn('[NotificationProfile] Failed to load:', e);
    }
    return { interactions: [], optimalHours: {} };
  }

  _save(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('[NotificationProfile] Failed to save:', e);
    }
  }

  /**
   * Records a notification event.
   * @param {string} category - 'morning'|'evening'|'report'|'alert'
   * @param {'open'|'dismiss'|'ignore'} action
   * @param {number} [timestamp]
   */
  recordInteraction(category, action, timestamp = Date.now()) {
    const data = this._load();
    data.interactions.push({ category, action, timestamp });

    if (data.interactions.length > 100) {
      data.interactions.shift();
    }

    this._recalculateOptimalTimes(data);
    this._save(data);
  }

  /**
   * Recalculates optimal delivery hours based on actual user actions.
   * @private
   */
  _recalculateOptimalTimes(data) {
    const opensByCategory = {};
    
    for (const inter of data.interactions) {
      if (inter.action !== 'open') continue;
      const cat = inter.category || 'default';
      const hour = new Date(inter.timestamp).getHours();
      
      if (!opensByCategory[cat]) opensByCategory[cat] = {};
      opensByCategory[cat][hour] = (opensByCategory[cat][hour] || 0) + 1;
    }

    for (const [cat, hourCounts] of Object.entries(opensByCategory)) {
      let maxCount = 0;
      let peakHour = null;
      for (const [hourStr, count] of Object.entries(hourCounts)) {
        const countInt = Number(count);
        if (countInt > maxCount) {
          maxCount = countInt;
          peakHour = Number(hourStr);
        }
      }
      if (peakHour !== null) {
        data.optimalHours[cat] = peakHour;
      }
    }
  }

  /**
   * Returns the optimal hour for a given notification type.
   * @param {string} category - 'morning'|'evening'|'report'|'alert'
   * @param {number} defaultHour
   * @returns {number} Optimal hour (0-23)
   */
  getOptimalHour(category, defaultHour) {
    const data = this._load();
    const learned = data.optimalHours[category];
    if (learned !== undefined) {
      return learned;
    }
    return defaultHour;
  }

  /**
   * Returns learned statistics summary.
   * @returns {Object}
   */
  getLearningReport() {
    const data = this._load();
    const report = {
      totalInteractions: data.interactions.length,
      optimalHours: { ...data.optimalHours },
      openRates: {}
    };

    const counts = {};
    for (const inter of data.interactions) {
      const cat = inter.category;
      if (!counts[cat]) counts[cat] = { total: 0, open: 0 };
      counts[cat].total++;
      if (inter.action === 'open') counts[cat].open++;
    }

    for (const [cat, item] of Object.entries(counts)) {
      report.openRates[cat] = Math.round((item.open / item.total) * 100);
    }

    return report;
  }
}
