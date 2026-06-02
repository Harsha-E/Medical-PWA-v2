export class UsageAnalyticsEngine {
    constructor() {
        this.eventLog = [];
    }

    /**
     * Tracks a generic application metric or event
     * @param {string} event - Event name
     * @param {Object} data - Metadata
     */
    trackMetric(event, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            ...data
        };
        
        this.eventLog.push(logEntry);
        console.log(`[UsageAnalyticsEngine] Metric Tracked: ${event}`, data);
        
        // In a real application, we would batch and send these to a backend service like Mixpanel/Firebase
    }

    getLogs() {
        return this.eventLog;
    }
}

export const usageAnalyticsEngine = new UsageAnalyticsEngine();
