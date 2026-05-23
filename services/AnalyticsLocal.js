/**
 * @fileoverview Local Analytics and Adherence Computation Engine.
 * Architecture: ES6 Module, Pure Functions.
 * Paradigm: Zero-dependency mathematical processing of raw health data logs.
 */

class AnalyticsLocal {
  
  /**
   * Computes the overall and per-medication adherence rate over a specific timeframe.
   * @param {Object[]} doseLogs - Array of raw dose log objects from the database.
   * @param {Object[]} medications - Array of active medication objects.
   * @param {number} [days=30] - The lookback period in days.
   * @returns {Object} { overall: number, perMedication: Map<number, number> }
   * @example
   * const rates = analyticsLocal.computeAdherenceRate(logs, meds, 30);
   * console.log(rates.overall); // e.g., 0.85 (85%)
   */
  computeAdherenceRate(doseLogs = [], medications = [], days = 30) {
    if (!medications.length) return { overall: 0, perMedication: new Map() };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTime = cutoffDate.getTime();

    // Filter logs to the timeframe
    const recentLogs = doseLogs.filter(log => {
      if (!log.takenAt) return false;
      return new Date(log.takenAt).getTime() >= cutoffTime;
    });

    let totalTaken = 0;
    let totalScheduled = 0;
    const perMedication = new Map();

    for (const med of medications) {
      // Calculate how many times it SHOULD have been taken in the period
      // (Based on the length of the times array * number of days)
      const timesPerDay = (med.times || med.scheduledTimes || ['08:00']).length;
      
      // Calculate active days within the window (simplified: assumes active for full window)
      // A more complex system would check med.startDate, but we use full days for MVP.
      const expectedDoses = timesPerDay * days;
      totalScheduled += expectedDoses;

      // Count actual taken doses for this specific medication
      const takenDoses = recentLogs.filter(log => 
        log.medicationId === med.id && (log.status === 'taken' || !log.skipped)
      ).length;

      totalTaken += takenDoses;

      // Calculate per-med percentage (clamped 0 to 1)
      const medRate = expectedDoses > 0 ? Math.min(takenDoses / expectedDoses, 1) : 0;
      perMedication.set(med.id, parseFloat(medRate.toFixed(2)));
    }

    const overallRate = totalScheduled > 0 ? Math.min(totalTaken / totalScheduled, 1) : 0;

    return {
      overall: parseFloat(overallRate.toFixed(2)),
      perMedication
    };
  }

  /**
   * Calculates the current and longest consecutive days of perfect adherence.
   * A "perfect day" is one where at least 1 medication was taken, and 0 were missed/skipped.
   * @param {Object[]} doseLogs 
   * @param {Object[]} medications 
   * @returns {Object} { currentStreak: number, longestStreak: number, lastPerfectDay: string|null }
   */
  computeStreak(doseLogs = [], medications = []) {
    if (!doseLogs.length) return { currentStreak: 0, longestStreak: 0, lastPerfectDay: null };

    // Group logs by local date string (YYYY-MM-DD)
    const logsByDay = new Map();
    for (const log of doseLogs) {
      if (!log.takenAt) continue;
      const dateStr = log.takenAt.split('T')[0];
      if (!logsByDay.has(dateStr)) logsByDay.set(dateStr, []);
      logsByDay.get(dateStr).push(log);
    }

    // Sort dates descending (newest first)
    const sortedDates = Array.from(logsByDay.keys()).sort((a, b) => b.localeCompare(a));
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastPerfectDay = null;
    let isCurrentBroken = false;

    // Check consecutive days backwards
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      const dailyLogs = logsByDay.get(date);
      
      const taken = dailyLogs.filter(l => l.status === 'taken' || !l.skipped).length;
      const missed = dailyLogs.filter(l => l.status === 'missed' || l.skipped).length;

      const isPerfect = taken > 0 && missed === 0;

      if (isPerfect) {
        if (!lastPerfectDay) lastPerfectDay = date;
        tempStreak++;
        
        // Only count towards current streak if the chain hasn't broken 
        // and it starts today or yesterday
        if (!isCurrentBroken && (date === todayStr || date === yesterdayStr || currentStreak > 0)) {
          currentStreak++;
        }
      } else {
        isCurrentBroken = true; // Chain broken for current streak
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 0; // Reset for historical longest streak tracking
      }
    }

    if (tempStreak > longestStreak) longestStreak = tempStreak;

    return {
      currentStreak,
      longestStreak,
      lastPerfectDay
    };
  }

  /**
   * Generates weekly adherence rates to render a trend line chart.
   * @param {Object[]} doseLogs 
   * @param {Object[]} medications 
   * @param {number} [weeks=8] 
   * @returns {Object[]} Array of week data objects { weekLabel, rate }
   */
  computeTrendLine(doseLogs = [], medications = [], weeks = 8) {
    const trendData = [];
    const now = new Date();

    for (let w = weeks - 1; w >= 0; w--) {
      // Define week boundaries
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (w * 7) - 7);
      
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (w * 7));

      // Filter logs for this specific week
      const weeklyLogs = doseLogs.filter(log => {
        if (!log.takenAt) return false;
        const logTime = new Date(log.takenAt).getTime();
        return logTime > weekStart.getTime() && logTime <= weekEnd.getTime();
      });

      // Calculate adherence for just this 7 day slice
      const weeklyRates = this.computeAdherenceRate(weeklyLogs, medications, 7);
      
      trendData.push({
        weekLabel: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        rate: weeklyRates.overall,
        weekStart: weekStart.toISOString()
      });
    }

    return trendData;
  }

  /**
   * Identifies medications with poor adherence that require intervention.
   * @param {Object[]} doseLogs 
   * @param {Object[]} medications 
   * @returns {Object[]} Array of risky medications sorted by worst rate.
   */
  identifyRiskyMedications(doseLogs = [], medications = []) {
    // Look at the last 7 days specifically for acute risk
    const recentRates = this.computeAdherenceRate(doseLogs, medications, 7);
    const riskyMeds = [];

    for (const med of medications) {
      const rate = recentRates.perMedication.get(med.id);
      // Anything below 70% adherence is considered a clinical risk
      if (rate !== undefined && rate < 0.70) {
        riskyMeds.push({
          medication: med,
          rate: rate
        });
      }
    }

    // Sort ascending (lowest adherence first)
    return riskyMeds.sort((a, b) => a.rate - b.rate);
  }

  /**
   * Generates human-readable actionable insights based on mathematical data.
   * @param {Object} adherenceData - The output from computeAdherenceRate()
   * @returns {string[]} Array of insight strings.
   */
  generateInsightMessages(adherenceData) {
    if (!adherenceData) return ["Start logging your doses to see insights here."];
    
    const messages = [];
    const { overall, perMedication } = adherenceData;
    const overallPercent = Math.round(overall * 100);

    // 1. Overall Message
    if (overall >= 0.9) {
      messages.push(`Excellent! You've taken ${overallPercent}% of your scheduled doses.`);
    } else if (overall >= 0.7) {
      messages.push(`Good progress. You're at ${overallPercent}% adherence. Keep it up!`);
    } else if (overall > 0.5) {
      messages.push(`You've missed several doses recently (${overallPercent}% adherence). Try setting alarms.`);
    } else if (overall > 0) {
      messages.push(`Your adherence needs attention (${overallPercent}%). Please consult your doctor if you're experiencing side effects.`);
    } else {
      messages.push("No doses logged yet. Tap 'Mark as Taken' on the dashboard to begin.");
    }

    // 2. Add a specific warning if any single medication is dragging the score down
    let worstMedId = null;
    let worstRate = 1;
    
    perMedication.forEach((rate, medId) => {
      if (rate < worstRate) {
        worstRate = rate;
        worstMedId = medId;
      }
    });

    if (worstRate < 0.6 && overall > 0) {
      messages.push(`Tip: You seem to be struggling with one specific medication. Check your schedule or consider adjusting the reminder time.`);
    }

    return messages;
  }
}

export const analyticsLocal = new AnalyticsLocal();