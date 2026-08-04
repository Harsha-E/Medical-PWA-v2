/**
 * ProfileHealthCard.js - MedCheck Actionable Clinical Profile Health Card
 * Rendered on Dashboard to surface itemized profile status with direct 1-click action buttons.
 */
import state from '../core/state.js';

export default class ProfileHealthCard {
  constructor() {
    this.userProfile = state.userProfile || {};
    this.p = this.userProfile.profile || {};
  }

  render() {
    const p = this.p;

    const items = [
      {
        key: 'identity',
        label: 'Identity',
        complete: Boolean(this.userProfile.name || p.fullName),
        missingText: 'Name & DOB missing',
        route: '#/onboarding?step=2'
      },
      {
        key: 'conditions',
        label: 'Health Conditions',
        complete: Boolean(p.active_conditions && p.active_conditions.length > 0),
        missingText: 'No conditions logged',
        route: '#/onboarding?step=4'
      },
      {
        key: 'allergies',
        label: 'Allergies',
        complete: Boolean((p.known_allergies && p.known_allergies.length > 0) || (p.allergies && p.allergies.length > 0)),
        missingText: 'No allergies specified',
        route: '#/onboarding?step=5'
      },
      {
        key: 'lifestyle',
        label: 'Lifestyle & Habits',
        complete: Boolean(p.lifestyle && (p.lifestyle.smoking || p.lifestyle.alcohol)),
        missingText: 'Habits not recorded',
        route: '#/onboarding?step=7'
      },
      {
        key: 'emergency',
        label: 'Emergency Contact',
        complete: Boolean(p.emergencyContact && p.emergencyContact.phone),
        missingText: 'Contact missing',
        route: '#/onboarding?step=9'
      },
      {
        key: 'medications',
        label: 'Daily Medicines',
        complete: Boolean(p.activeMeds && p.activeMeds.length > 0),
        missingText: 'Baseline meds missing',
        route: '#/onboarding?step=10'
      }
    ];

    const completedCount = items.filter(i => i.complete).length;
    const totalCount = items.length;
    const percentage = Math.round((completedCount / totalCount) * 100);

    const card = document.createElement('div');
    card.className = 'glass-card clinical-profile-health-card';
    card.style.cssText = `
      background: rgba(20, 25, 40, 0.7);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 20px;
      margin-bottom: 20px;
      color: #fff;
    `;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(30, 144, 255, 0.15); color: #1e90ff; display: flex; align-items: center; justify-content: center; font-size: 18px;">
            🏥
          </div>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #fff;">Clinical Profile Health</h3>
            <span style="font-size: 12px; color: #94a3b8;">${percentage}% Complete • ${completedCount}/${totalCount} sections verified</span>
          </div>
        </div>
        <div style="width: 48px; height: 48px; border-radius: 50%; background: conic-gradient(#1e90ff ${percentage}%, rgba(255,255,255,0.1) 0%); display: flex; align-items: center; justify-content: center;">
          <div style="width: 38px; height: 38px; border-radius: 50%; background: #141928; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #38bdf8;">
            ${percentage}%
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
        ${items.map(item => `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 12px; font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 6px;">
                ${item.complete ? '✅' : '⚠️'} ${item.label}
              </div>
              <div style="font-size: 10px; color: ${item.complete ? '#34d399' : '#f59e0b'}; margin-top: 2px;">
                ${item.complete ? 'Verified' : item.missingText}
              </div>
            </div>
            <a href="${item.route}" style="font-size: 11px; font-weight: 700; text-decoration: none; color: ${item.complete ? '#94a3b8' : '#38bdf8'}; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); transition: all 0.2s;">
              ${item.complete ? 'Review →' : 'Add →'}
            </a>
          </div>
        `).join('')}
      </div>
    `;

    return card;
  }
}
