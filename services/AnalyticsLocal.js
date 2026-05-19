/**
 * @fileoverview Pure Local Analytics Engine for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module.
 * Paradigm: Pure Computation, Deterministic, Zero Side Effects.
 * * Computes adherence rates, streaks, heatmaps, and trends strictly from 
 * raw array datasets. Contains no DOM manipulation or storage calls.
 */

// ============================================================================
// CONSTANTS
// ============================================================================
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_IN_WEEK = 7;
const STATUS_TAKEN = 'taken';
const STATUS_MISSED = 'missed';
const RISK_THRESHOLD = 0.70;

class AnalyticsLocal {
    /**
     * Calculates the expected daily doses across a list of medications.
     * @private
     * @param {Array<Object>} medications 
     * @returns {number}
     */
    _getExpectedDailyDoses(medications) {
        if (!Array.isArray(medications)) return 0;
        let expected = 0;
        for (const med of medications) {
            if (med.scheduledTimes && Array.isArray(med.scheduledTimes)) {
                expected += med.scheduledTimes.length;
            } else {
                expected += 1; // Fallback default
            }
        }
        return expected;
    }

    /**
     * Strips the time component from an ISO string to return a localized YYYY-MM-DD string.
     * @private
     * @param {string|Date} dateInput 
     * @returns {string}
     */
    _toISODate(dateInput) {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    /**
     * Computes the overall and per-medication adherence rates over a specific timeframe.
     * * @example
     * const results = analyticsLocal.computeAdherenceRate(logs, meds, 30);
     * // { overall: 0.85, perMedication: Map { 1 => 0.9, 2 => 0.8 } }
     * * @param {Array<Object>} doseLogs - Raw telemetry log arrays.
     * @param {Array<Object>} medications - Active medication profiles.
     * @param {number} [days=30] - Lookback window in days.
     * @returns {{ overall: number, perMedication: Map<number|string, number> }}
     */
    computeAdherenceRate(doseLogs, medications, days = 30) {
        if (!Array.isArray(doseLogs) || !Array.isArray(medications)) {
            return { overall: 0, perMedication: new Map() };
        }

        const cutoffTime = Date.now() - (days * MS_PER_DAY);
        const validLogs = doseLogs.filter(log => {
            const logTime = new Date(log.scheduledAt || log.takenAt).getTime();
            return logTime >= cutoffTime;
        });

        let totalTaken = 0;
        let totalExpected = this._getExpectedDailyDoses(medications) * days;
        const medStats = new Map();

        // Initialize medication map
        for (const med of medications) {
            const expectedForMed = (med.scheduledTimes ? med.scheduledTimes.length : 1) * days;
            medStats.set(med.id, { taken: 0, expected: expectedForMed });
        }

        // Tally logs
        for (const log of validLogs) {
            if (log.status === STATUS_TAKEN) {
                totalTaken++;
                if (medStats.has(log.medicationId)) {
                    medStats.get(log.medicationId).taken++;
                }
            }
        }

        const overallRate = totalExpected > 0 ? Math.min(1.0, totalTaken / totalExpected) : 1.0;
        const perMedicationMap = new Map();

        for (const [medId, stats] of medStats.entries()) {
            const rate = stats.expected > 0 ? Math.min(1.0, stats.taken / stats.expected) : 1.0;
            perMedicationMap.set(medId, Number(rate.toFixed(4)));
        }

        return {
            overall: Number(overallRate.toFixed(4)),
            perMedication: perMedicationMap
        };
    }

    /**
     * Calculates user compliance streaks based on perfect execution days.
     * * @example
     * const streak = analyticsLocal.computeStreak(logs, meds);
     * // { currentStreak: 12, longestStreak: 45, lastPerfectDay: '2026-05-16' }
     * * @param {Array<Object>} doseLogs 
     * @param {Array<Object>} medications 
     * @returns {{ currentStreak: number, longestStreak: number, lastPerfectDay: string|null }}
     */
    computeStreak(doseLogs, medications) {
        if (!Array.isArray(doseLogs) || !Array.isArray(medications)) {
            return { currentStreak: 0, longestStreak: 0, lastPerfectDay: null };
        }

        const expectedDaily = this._getExpectedDailyDoses(medications);
        if (expectedDaily === 0) return { currentStreak: 0, longestStreak: 0, lastPerfectDay: null };

        // Group by day
        const logsByDay = new Map();
        for (const log of doseLogs) {
            const dayKey = this._toISODate(log.scheduledAt || log.takenAt);
            if (!dayKey) continue;
            
            if (!logsByDay.has(dayKey)) {
                logsByDay.set(dayKey, { taken: 0, missed: 0 });
            }
            if (log.status === STATUS_TAKEN) logsByDay.get(dayKey).taken++;
            if (log.status === STATUS_MISSED) logsByDay.get(dayKey).missed++;
        }

        // Determine perfect days (no misses, met expected target)
        const perfectDays = new Set();
        for (const [dayKey, counts] of logsByDay.entries()) {
            if (counts.missed === 0 && counts.taken >= expectedDaily) {
                perfectDays.add(dayKey);
            }
        }

        const sortedDates = Array.from(perfectDays).sort();
        let longestStreak = 0;
        let currentStreakCount = 0;
        let activeStreak = 0;
        let previousDateMs = 0;

        for (let i = 0; i < sortedDates.length; i++) {
            const currentDateMs = new Date(sortedDates[i]).getTime();
            
            if (i === 0 || (currentDateMs - previousDateMs) === MS_PER_DAY) {
                activeStreak++;
            } else {
                activeStreak = 1;
            }
            
            if (activeStreak > longestStreak) {
                longestStreak = activeStreak;
            }
            previousDateMs = currentDateMs;
        }

        // Evaluate current active streak backwards from today/yesterday
        const todayStr = this._toISODate(new Date());
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = this._toISODate(yesterdayDate);

        if (perfectDays.has(todayStr)) {
            currentStreakCount = 1;
            let checkDate = new Date(yesterdayDate);
            while (perfectDays.has(this._toISODate(checkDate))) {
                currentStreakCount++;
                checkDate.setDate(checkDate.getDate() - 1);
            }
        } else if (perfectDays.has(yesterdayStr)) {
            currentStreakCount = 1;
            let checkDate = new Date(yesterdayDate);
            checkDate.setDate(checkDate.getDate() - 1);
            while (perfectDays.has(this._toISODate(checkDate))) {
                currentStreakCount++;
                checkDate.setDate(checkDate.getDate() - 1);
            }
        }

        return {
            currentStreak: currentStreakCount,
            longestStreak: longestStreak,
            lastPerfectDay: sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null
        };
    }

    /**
     * Generates a 7xN matrix structured for calendar heatmap plotting.
     * Rows represent Days of Week (0=Monday, 6=Sunday).
     * Columns represent chronological weeks.
     * * @example
     * const matrix = analyticsLocal.computeMissedDoseHeatmap(logs, 4);
     * * @param {Array<Object>} doseLogs 
     * @param {number} [weeks=8] 
     * @returns {Array<Array<Object>>}
     */
    computeMissedDoseHeatmap(doseLogs, weeks = 8) {
        if (!Array.isArray(doseLogs)) return [];

        const totalDays = weeks * DAYS_IN_WEEK;
        const anchorDate = new Date();
        // Shift anchor to the most recent Sunday to align grid cleanly
        const dayOfWeek = anchorDate.getDay();
        const diff = anchorDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        anchorDate.setDate(diff);
        anchorDate.setHours(23, 59, 59, 999);

        const startDate = new Date(anchorDate.getTime() - (totalDays * MS_PER_DAY));

        // Initialize 7xN Matrix (0 = Monday, ..., 6 = Sunday)
        const matrix = Array.from({ length: DAYS_IN_WEEK }, () => new Array(weeks).fill(null));

        const logsByDay = new Map();
        for (const log of doseLogs) {
            const dayKey = this._toISODate(log.scheduledAt || log.takenAt);
            if (!logsByDay.has(dayKey)) {
                logsByDay.set(dayKey, { missed: 0, taken: 0 });
            }
            if (log.status === STATUS_TAKEN) logsByDay.get(dayKey).taken++;
            if (log.status === STATUS_MISSED) logsByDay.get(dayKey).missed++;
        }

        for (let i = 0; i < totalDays; i++) {
            const evalDate = new Date(startDate.getTime() + (i * MS_PER_DAY));
            const dayKey = this._toISODate(evalDate);
            
            // Adjust getDay() so Monday = 0, Sunday = 6
            let rowIdx = evalDate.getDay() - 1;
            if (rowIdx === -1) rowIdx = 6; 
            
            const colIdx = Math.floor(i / DAYS_IN_WEEK);

            const stats = logsByDay.get(dayKey) || { missed: 0, taken: 0 };
            const total = stats.taken + stats.missed;
            const rate = total > 0 ? stats.taken / total : 0;

            if (rowIdx >= 0 && rowIdx < DAYS_IN_WEEK && colIdx >= 0 && colIdx < weeks) {
                matrix[rowIdx][colIdx] = {
                    date: dayKey,
                    missedCount: stats.missed,
                    takenCount: stats.taken,
                    rate: Number(rate.toFixed(4))
                };
            }
        }

        return matrix;
    }

    /**
     * Groups chronological ingestion patterns by hour (0-23).
     * Designed for radial or bar chart visual distributions.
     * * @param {Array<Object>} doseLogs 
     * @returns {Array<{hour: number, count: number}>} Array of length 24.
     */
    computeDoseTimeDistribution(doseLogs) {
        const distribution = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));

        if (!Array.isArray(doseLogs)) return distribution;

        for (const log of doseLogs) {
            if (log.status === STATUS_TAKEN && log.takenAt) {
                const dateObj = new Date(log.takenAt);
                if (!isNaN(dateObj.getTime())) {
                    const hour = dateObj.getHours();
                    if (hour >= 0 && hour <= 23) {
                        distribution[hour].count++;
                    }
                }
            }
        }

        return distribution;
    }

    /**
     * Computes localized adherence ratios bucketted chronologically by week.
     * * @param {Array<Object>} doseLogs 
     * @param {Array<Object>} medications 
     * @param {number} [weeks=8] 
     * @returns {Array<{weekLabel: string, rate: number, weekStart: string}>}
     */
    computeTrendLine(doseLogs, medications, weeks = 8) {
        if (!Array.isArray(doseLogs) || !Array.isArray(medications)) return [];

        const trendData = [];
        const expectedWeekly = this._getExpectedDailyDoses(medications) * DAYS_IN_WEEK;
        const now = new Date();

        for (let i = weeks - 1; i >= 0; i--) {
            const weekEndMs = now.getTime() - (i * DAYS_IN_WEEK * MS_PER_DAY);
            const weekStartMs = weekEndMs - (DAYS_IN_WEEK * MS_PER_DAY);
            const startObj = new Date(weekStartMs);

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const weekLabel = `Week of ${monthNames[startObj.getMonth()]} ${startObj.getDate()}`;

            let takenThisWeek = 0;
            
            for (const log of doseLogs) {
                const logTime = new Date(log.scheduledAt || log.takenAt).getTime();
                if (logTime >= weekStartMs && logTime < weekEndMs && log.status === STATUS_TAKEN) {
                    takenThisWeek++;
                }
            }

            const rate = expectedWeekly > 0 ? Math.min(1.0, takenThisWeek / expectedWeekly) : 1.0;
            
            trendData.push({
                weekLabel: weekLabel,
                rate: Number(rate.toFixed(4)),
                weekStart: this._toISODate(startObj)
            });
        }

        return trendData;
    }

    /**
     * Cross-references the 7-day adherence vectors to identify critically low compliance.
     * * @param {Array<Object>} doseLogs 
     * @param {Array<Object>} medications 
     * @returns {Array<{medication: Object, rate: number, missedCount: number}>}
     */
    identifyRiskyMedications(doseLogs, medications) {
        if (!Array.isArray(doseLogs) || !Array.isArray(medications)) return [];

        const recentLogs = doseLogs.filter(log => {
            const logTime = new Date(log.scheduledAt || log.takenAt).getTime();
            return logTime >= Date.now() - (7 * MS_PER_DAY);
        });

        const riskyList = [];

        for (const med of medications) {
            const medLogs = recentLogs.filter(l => l.medicationId === med.id);
            const expected = (med.scheduledTimes ? med.scheduledTimes.length : 1) * 7;
            
            let taken = 0;
            let missed = 0;

            for (const log of medLogs) {
                if (log.status === STATUS_TAKEN) taken++;
                if (log.status === STATUS_MISSED) missed++;
            }

            const rate = expected > 0 ? Math.min(1.0, taken / expected) : 1.0;

            if (rate < RISK_THRESHOLD) {
                riskyList.push({
                    medication: med,
                    rate: Number(rate.toFixed(4)),
                    missedCount: missed
                });
            }
        }

        // Sort ascending (worst adherence first)
        return riskyList.sort((a, b) => a.rate - b.rate);
    }

    /**
     * Translates strict mathematical analytics outputs into conversational, human-readable insights.
     * * @param {{overall: number, perMedication: Map}} adherenceData 
     * @param {Array<{medication: Object, rate: number}>} riskyMedications 
     * @returns {Array<string>}
     */
    generateInsightMessages(adherenceData, riskyMedications = []) {
        const insights = [];

        if (!adherenceData || typeof adherenceData.overall !== 'number') {
            return ["Insufficient data to generate clinical insights."];
        }

        const percentage = Math.round(adherenceData.overall * 100);

        // Tier 1: Overall Baseline Message
        if (adherenceData.overall > 0.90) {
            insights.push(`Excellent execution! You've successfully recorded ${percentage}% of your scheduled doses.`);
        } else if (adherenceData.overall > 0.70) {
            insights.push(`Good progress. Your overall adherence stands at ${percentage}%. Stay consistent.`);
        } else if (adherenceData.overall > 0.50) {
            insights.push(`Your adherence has dropped to ${percentage}%. Consider setting more aggressive alarms or consulting your physician.`);
        } else {
            insights.push(`Critical warning: Your adherence is severely low (${percentage}%). Please contact your healthcare provider regarding your current routine.`);
        }

        // Tier 2: Specific Risk Indicators
        if (Array.isArray(riskyMedications)) {
            for (const risk of riskyMedications) {
                const medName = risk.medication?.name || 'Unknown Medication';
                const riskPct = Math.round(risk.rate * 100);
                insights.push(`Action Required: ${medName} compliance is exceptionally low (${riskPct}%).`);
            }
        }

        return insights;
    }
}

// Export singleton engine instance for offline analytics processing
export const analyticsLocal = new AnalyticsLocal();