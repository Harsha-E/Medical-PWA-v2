/**
 * @fileoverview Walkthrough Manager Service
 * Orchestrates step-by-step guided visual walkthrough overlays for first-time users.
 */

export default class WalkthroughManager {
  constructor(storageKey = 'medcare_walkthrough_completed') {
    this.storageKey = storageKey;
  }

  /**
   * Checks if user has completed the onboarding dashboard walkthrough.
   * @returns {boolean}
   */
  isWalkthroughCompleted() {
    return localStorage.getItem(this.storageKey) === 'true';
  }

  /**
   * Sets the walkthrough state to completed.
   * @returns {void}
   */
  completeWalkthrough() {
    localStorage.setItem(this.storageKey, 'true');
  }

  /**
   * Generates step descriptions for the main dashboard elements.
   * @returns {Array<{elementSelector: string, title: string, text: string}>}
   */
  getSteps() {
    return [
      {
        elementSelector: '#dashboard-schedule-section',
        title: 'Taking Medicines',
        text: 'This card tells you which medicines are remaining for today. Tap the checkboxes to mark them as taken.'
      },
      {
        elementSelector: '#dashboard-followup-section',
        title: 'Regular Health Checks',
        text: 'Log your HbA1c, Blood Pressure, and TSH readings here, or scan report documents to extract them.'
      },
      {
        elementSelector: '#dashboard-progress-section',
        title: 'Health Progress',
        text: 'Review this panel to track your weekly taken ratio and view your HbA1c progress chart.'
      }
    ];
  }
}
