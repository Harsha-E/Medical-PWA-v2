/**
 * @fileoverview Lab Trend Analyzer Service
 * Gathers historical self-reported and scanned lab values from the database
 * and generates clean health progress trends and timelines.
 */

import db from '../../core/db.js';
import state from '../../core/state.js';

export default class LabTrendAnalyzer {
  /**
   * Retrieves user's HbA1c measurement logs sorted by date.
   * @returns {Promise<Array<{date: string, value: number}>>}
   */
  async getHbA1cTrend() {
    const userId = state.user?.uid || 'anonymous';
    const records = await db.history
      .where('userId')
      .equals(userId)
      .toArray();

    const trend = [];
    for (const r of records) {
      if (r.metrics && typeof r.metrics.hba1c === 'number') {
        trend.push({ date: r.date, value: r.metrics.hba1c });
      } else if (r.type === 'Report' && r.title && r.title.toLowerCase().includes('hba1c')) {
        // Fallback: extract value if saved in title like "HbA1c 8.1"
        const valMatch = r.title.match(/(\d+(?:\.\d+)?)/);
        if (valMatch) {
          trend.push({ date: r.date, value: parseFloat(valMatch[1]) });
        }
      }
    }

    return trend.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Generates a monthly map of HbA1c values for the linear progress timeline.
   * @returns {Promise<Array<{month: string, value: number}>>}
   */
  async getHealthJourney() {
    const trend = await this.getHbA1cTrend();
    return trend.map(item => {
      const dateObj = new Date(item.date);
      const monthStr = dateObj.toLocaleDateString('en-US', { month: 'long' });
      return {
        month: monthStr,
        value: item.value
      };
    });
  }

  /**
   * Gets stats on total reports added in the current calendar year.
   * @returns {Promise<number>}
   */
  async getReportsAddedThisYear() {
    const userId = state.user?.uid || 'anonymous';
    const currentYear = new Date().getFullYear().toString();
    const records = await db.history
      .where('userId')
      .equals(userId)
      .toArray();

    return records.filter(r => 
      (r.type === 'Report' || r.type === 'Disease' || r.type === 'Surgery' || r.type === 'Vaccination') && 
      r.date && r.date.startsWith(currentYear)
    ).length;
  }
}
