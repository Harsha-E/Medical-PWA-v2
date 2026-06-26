export const TOURS = [
  // ── GLOBAL ONBOARDING ─────────────────────────────────────────────────────
  {
    id:   'global',
    name: 'Getting Started',
    steps: [
      {
        targetSelector:  '__center__',
        title:           'Welcome to MedCare',
        description:     'Let\'s take a quick tour so you can manage your medications confidently.',
        placement:       'center',
        characterAction: 'wave',
      },
      {
        targetSelector:  '#glass-nav',
        mobileSelector:  '#glass-nav',
        title:           'Navigation',
        description:     'Use the pill-shaped menu to jump between Dashboard, Medications, Appointments, and Emergency.',
        placement:       'top',
        characterAction: 'point',
      },
      {
        targetSelector:  '[href="#/medications"]',
        title:           'Your Medications',
        description:     'All your active drugs live here. Tap + to add one manually, or use the Vision Scanner to scan a label.',
        placement:       'bottom',
        characterAction: 'point',
      },
      {
        targetSelector:  '[href="#/scan"]',
        mobileSelector:  '[href="#/scan"]',
        title:           'Vision Scanner',
        description:     'Point your camera at any medicine label. The scanner reads the name, dosage, and frequency automatically.',
        placement:       'bottom',
        characterAction: 'point',
        isMobileOnly:    false,
      },
      {
        targetSelector:  '[href="#/appointments"]',
        title:           'Appointments',
        description:     'Schedule and track your doctor visits. You\'ll get reminder notifications before each one.',
        placement:       'bottom',
        characterAction: 'idle',
      },
      {
        targetSelector:  '[href="#/emergency"]',
        title:           'Emergency Hub',
        description:     'One tap to call your emergency contact. Your medical ID and allergies are shown instantly.',
        placement:       'top',
        characterAction: 'point',
      },
      {
        targetSelector:  '[href="#/settings"]',
        title:           'Settings',
        description:     'Update your profile, toggle light/dark theme, manage notifications, and export your health data.',
        placement:       'top',
        characterAction: 'idle',
      },
      {
        targetSelector:  '__center__',
        title:           'You\'re all set!',
        description:     'Tap any Help button at any time to get context-specific guidance on that screen.',
        placement:       'center',
        characterAction: 'celebrate',
      },
    ],
  },

  // ── DASHBOARD MINI-TOUR ───────────────────────────────────────────────────
  {
    id:   'dashboard-help',
    name: 'Dashboard Guide',
    steps: [
      {
        targetSelector:  '#compliance-status',
        title:           'Compliance Score',
        description:     'This shows how consistently you\'ve taken your medications. Aim for ≥ 80% for the green indicator.',
        placement:       'bottom',
        characterAction: 'point',
        condition:       () => !!document.querySelector('#compliance-status'),
      },
      {
        targetSelector:  '#timeline-container',
        title:           'Today\'s Doses',
        description:     'Tap a medication card to log it as taken. Green = done, orange = due soon, purple = upcoming.',
        placement:       'top',
        characterAction: 'idle',
        condition:       () => !!document.querySelector('#timeline-container'),
      },
    ],
  },

  // ── SCAN MINI-TOUR ────────────────────────────────────────────────────────
  {
    id:   'scan-help',
    name: 'Scanner Guide',
    steps: [
      {
        targetSelector:  '#sv-stage-bar',
        title:           'Pipeline Stages',
        description:     'Watch these pills light up as the scanner hunts → locks → verifies your medicine label.',
        placement:       'bottom',
        characterAction: 'point',
      },
      {
        targetSelector:  '#sv-auto-center',
        title:           'Confidence Ring',
        description:     'The ring fills as the scanner gains confidence. Tap it to nudge the scan if it stalls.',
        placement:       'top',
        characterAction: 'point',
      },
      {
        targetSelector:  '#sv-gallery',
        title:           'Gallery Upload',
        description:     'Can\'t hold the camera steady? Upload a photo from your gallery instead.',
        placement:       'top',
        characterAction: 'idle',
      },
      {
        targetSelector:  '#sv-torch',
        title:           'Torch',
        description:     'Toggle the flashlight for dimly-lit labels. Only available on rear camera.',
        placement:       'bottom',
        characterAction: 'idle',
        condition:       () => !!document.querySelector('#sv-torch'),
      },
    ],
  },

  // ── ADD-MEDICATION MINI-TOUR ──────────────────────────────────────────────
  {
    id:   'add-medication-help',
    name: 'Add Medication Guide',
    steps: [
      {
        targetSelector:  '#dosage-safety-hint',
        title:           'Dosage Safety',
        description:     'Enter the exact dosage per single dose (not daily total). We\'ll flag unsafe totals for mg drugs.',
        placement:       'bottom',
        characterAction: 'point',
        condition:       () => !!document.querySelector('#dosage-safety-hint'),
      },
      {
        targetSelector:  '#end-date-field',
        title:           'End Date',
        description:     'Always set an end date for antibiotic courses. Missed doses after the end date won\'t count against your compliance score.',
        placement:       'top',
        characterAction: 'idle',
        condition:       () => !!document.querySelector('#end-date-field'),
      },
    ],
  },
];
