/**
 * @fileoverview Contextual Help System Service
 * Analyzes user interactions and idle durations to present supportive,
 * context-appropriate tips and reduce tech friction.
 */

export default class ContextualHelpSystem {
  constructor() {
    this.inactivityTimer = null;
  }

  /**
   * Starts tracking user idle state. If user remains inactive on a form or card,
   * fires a callback with a helpful tip.
   * @param {string} pageContext - e.g., 'dashboard', 'add-medication'
   * @param {Function} triggerTipCallback - Receives simplified tip string
   * @param {number} [timeoutMs=15000] - 15 seconds of inactivity
   */
  monitorInactivity(pageContext, triggerTipCallback, timeoutMs = 15000) {
    this.resetTimer();

    const tips = {
      'dashboard': 'Tip: You can tap the round status ring to mark a medicine as taken directly!',
      'add-medication': 'Need help? You can tap the "Scan" icon at the bottom to fill medicine details automatically by taking a photo of the label.',
      'reports': 'Tip: Uploading a new lab report (like HbA1c or BP) helps you see your health journey progress in the chart.'
    };

    const tip = tips[pageContext];
    if (!tip) return;

    this.inactivityTimer = setTimeout(() => {
      triggerTipCallback(tip);
    }, timeoutMs);
  }

  /**
   * Clears active inactivity tracking timers.
   */
  resetTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }
}
