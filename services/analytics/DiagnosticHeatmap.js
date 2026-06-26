/**
 * @fileoverview DiagnosticHeatmap.js
 * Developer diagnostic tool to visualize the real-world performance
 * of the Intelligence Agent across 100+ scans.
 * Aggregates Evidence Timelines to produce Scarcity and Capture metrics.
 */

export class DiagnosticHeatmap {
  constructor() {
    // Expected semantic regions to track
    this.regionMetrics = {
      'TEXT_BLOCK': { found: 0, total: 0, timeAcquiredMs: [], confContributions: [] },
      'MANUFACTURER_LOGO': { found: 0, total: 0, timeAcquiredMs: [], confContributions: [] },
      'DOSAGE_TEXT': { found: 0, total: 0, timeAcquiredMs: [], confContributions: [] },
      'BLISTER_CAVITY': { found: 0, total: 0, timeAcquiredMs: [], confContributions: [] }
    };
  }

  /**
   * Ingest a batch of historical scan sessions (from Dexie) to build the heatmap.
   * @param {Array<Object>} sessions - Array of completed telemetry sessions
   */
  ingestHistory(sessions) {
    if (!sessions || sessions.length === 0) return;

    sessions.forEach(session => {
      const timeline = session.timeline || [];
      
      // Track which regions were found in this specific session
      const foundInSession = new Set();

      timeline.forEach(event => {
        const type = event.event.replace('_FOUND', '');
        if (this.regionMetrics[type]) {
          foundInSession.add(type);
          this.regionMetrics[type].timeAcquiredMs.push(parseFloat(event.timeOffset) * 1000);
          
          // Mock confidence contribution for now based on attribution engine weights
          let impact = 0;
          if (type === 'TEXT_BLOCK') impact = 40;
          if (type === 'MANUFACTURER_LOGO') impact = 25;
          if (type === 'DOSAGE_TEXT') impact = 37; // Highly critical
          if (type === 'BLISTER_CAVITY') impact = 15;
          
          this.regionMetrics[type].confContributions.push(impact);
        }
      });

      // Update global totals and found counts
      Object.keys(this.regionMetrics).forEach(type => {
        this.regionMetrics[type].total++;
        if (foundInSession.has(type)) {
          this.regionMetrics[type].found++;
        }
      });
    });
  }

  /**
   * Evaluates the scarcity classification based on capture rate.
   */
  _getScarcityLabel(captureRate) {
    if (captureRate > 90) return 'Easy';
    if (captureRate > 60) return 'Moderate';
    if (captureRate > 20) return 'Rare';
    return 'Very Rare';
  }

  /**
   * Generates the visual ASCII report for developer console.
   */
  generateReport() {
    console.log('\n================ EVIDENCE HEATMAP ================');
    
    Object.keys(this.regionMetrics).forEach(type => {
      const data = this.regionMetrics[type];
      if (data.total === 0) return;

      const captureRate = Math.round((data.found / data.total) * 100);
      const failRate = 100 - captureRate;
      
      const avgTime = data.timeAcquiredMs.length > 0 
        ? (data.timeAcquiredMs.reduce((a, b) => a + b, 0) / data.timeAcquiredMs.length / 1000).toFixed(2) 
        : 'N/A';
        
      const avgImpact = data.confContributions.length > 0
        ? Math.round(data.confContributions.reduce((a, b) => a + b, 0) / data.confContributions.length)
        : 0;

      // ASCII Bar Generation
      const filledBars = Math.round(captureRate / 10);
      const emptyBars = 10 - filledBars;
      const barStr = '█'.repeat(filledBars) + '░'.repeat(emptyBars);

      console.log(`\n${type}`);
      console.log(`${barStr} ${captureRate}%`);
      console.log(`  Scarcity:          ${this._getScarcityLabel(captureRate)}`);
      console.log(`  Avg Acquisition:   ${avgTime !== 'N/A' ? avgTime + 's' : 'N/A'}`);
      console.log(`  Confidence Impact: +${avgImpact}`);
      console.log(`  Failure Frequency: ${failRate}%`);
    });
    
    console.log('==================================================\n');
  }

  /**
   * Helper to look up scarcity score for the Probability Engine
   */
  getScarcityScore(regionType) {
    const data = this.regionMetrics[regionType];
    if (!data || data.total === 0) return 'Unknown';
    const rate = Math.round((data.found / data.total) * 100);
    return this._getScarcityLabel(rate);
  }
}

export const diagnosticHeatmap = new DiagnosticHeatmap();
