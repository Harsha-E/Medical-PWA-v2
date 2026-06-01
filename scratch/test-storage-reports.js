/**
 * @fileoverview Automated checks verifying the biomarker extraction, trend timeline sorting,
 * storage quota estimates, and onboarding translation results.
 */

// 1. Mock Browser Environment Globals
globalThis.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

globalThis.window = {
  location: { hash: '' },
  matchMedia() {
    return {
      matches: false,
      addEventListener() {}
    };
  }
};

globalThis.document = {
  documentElement: {
    setAttribute() {}
  }
};

// Mock navigator.storage safely
if (typeof navigator !== 'undefined') {
  try {
    navigator.storage = {
      async estimate() {
        return { usage: 60 * 1024 * 1024, quota: 100 * 1024 * 1024 };
      }
    };
  } catch (e) {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        storage: {
          async estimate() {
            return { usage: 60 * 1024 * 1024, quota: 100 * 1024 * 1024 };
          }
        }
      },
      configurable: true,
      writable: true
    });
  }
} else {
  globalThis.navigator = {
    storage: {
      async estimate() {
        return { usage: 60 * 1024 * 1024, quota: 100 * 1024 * 1024 };
      }
    }
  };
}

// 2. Dynamic imports to ensure mocks are set up first
const { default: db } = await import('../core/db.js');
const { default: state } = await import('../core/state.js');
const { default: ReportParser } = await import('../services/reports/ReportParser.js');
const { default: LabTrendAnalyzer } = await import('../services/reports/LabTrendAnalyzer.js');
const { default: StorageQuotaManager } = await import('../services/storage/StorageQuotaManager.js');
const { default: DoctorGuideEngine } = await import('../services/onboarding/DoctorGuideEngine.js');

// Set mock user state
state.user = { uid: 'test-user', email: 'test@example.com' };

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ Passed: ${message}`);
}

async function runTests() {
  console.log('==================================================');
  console.log('  CarePoint Services Automated Integration Tests  ');
  console.log('==================================================\n');

  // ----------------------------------------------------
  // TEST 1: ReportParser OCR Extractions
  // ----------------------------------------------------
  console.log('--- Test 1: ReportParser OCR Extractions ---');
  const parser = new ReportParser();

  // Test HbA1c
  const hba1cOcr = "Lab Results Summary: HbA1c level: 6.8% for patient John.";
  const hba1cParsed = parser.parseOcrText(hba1cOcr);
  assert(hba1cParsed.hba1c === 6.8, `HbA1c extracted correctly: ${hba1cParsed.hba1c}%`);

  // Test HbA1c Fallback (no percent sign)
  const hba1cFallbackOcr = "HbA1c level: 5.7. Follow-up in 3 months.";
  const hba1cFallbackParsed = parser.parseOcrText(hba1cFallbackOcr);
  assert(hba1cFallbackParsed.hba1c === 5.7, `HbA1c fallback extracted correctly: ${hba1cFallbackParsed.hba1c}%`);

  // Test Blood Pressure
  const bpOcr = "Vitals check - BP: 130 / 85 mmHg. Pulse is normal.";
  const bpParsed = parser.parseOcrText(bpOcr);
  assert(bpParsed.systolic === 130 && bpParsed.diastolic === 85, `BP parsed correctly: ${bpParsed.systolic}/${bpParsed.diastolic}`);

  // Test Thyroid TSH
  const tshOcr = "Thyroid scan. TSH: 2.45 uIU/mL. Free T4 is 1.1.";
  const tshParsed = parser.parseOcrText(tshOcr);
  assert(tshParsed.tsh === 2.45, `Thyroid TSH extracted correctly: ${tshParsed.tsh}`);
  console.log('');

  // ----------------------------------------------------
  // TEST 2: LabTrendAnalyzer Progress Calculations & Sorting
  // ----------------------------------------------------
  console.log('--- Test 2: LabTrendAnalyzer Progress Calculations & Sorting ---');
  const trendAnalyzer = new LabTrendAnalyzer();

  // Clear mock history database
  db.history.records = [];

  // Seed history records in non-chronological order
  await db.history.add({
    userId: 'test-user',
    type: 'Report',
    date: '2026-03-15',
    title: 'March HbA1c',
    metrics: { hba1c: 7.2 }
  });

  await db.history.add({
    userId: 'test-user',
    type: 'Report',
    date: '2026-06-01',
    title: 'June HbA1c',
    metrics: { hba1c: 6.0 }
  });

  await db.history.add({
    userId: 'test-user',
    type: 'Report',
    date: '2026-01-10',
    title: 'January HbA1c',
    metrics: { hba1c: 8.5 }
  });

  // Verify trend calculation and ascending chronological sorting
  const hba1cTrend = await trendAnalyzer.getHbA1cTrend();
  assert(hba1cTrend.length === 3, `Trend array contains exactly 3 entries`);
  assert(hba1cTrend[0].date === '2026-01-10' && hba1cTrend[0].value === 8.5, `First chronological item is January: ${hba1cTrend[0].value}`);
  assert(hba1cTrend[1].date === '2026-03-15' && hba1cTrend[1].value === 7.2, `Second chronological item is March: ${hba1cTrend[1].value}`);
  assert(hba1cTrend[2].date === '2026-06-01' && hba1cTrend[2].value === 6.0, `Third chronological item is June: ${hba1cTrend[2].value}`);

  // Verify health journey mapping
  const healthJourney = await trendAnalyzer.getHealthJourney();
  assert(healthJourney[0].month === 'January' && healthJourney[0].value === 8.5, `Journey month name mapped: ${healthJourney[0].month}`);

  // Verify reports added this year
  const reportsThisYear = await trendAnalyzer.getReportsAddedThisYear();
  assert(reportsThisYear === 3, `Reports added this year: ${reportsThisYear}`);
  console.log('');

  // ----------------------------------------------------
  // TEST 3: StorageQuotaManager Estimates
  // ----------------------------------------------------
  console.log('--- Test 3: StorageQuotaManager Estimates ---');
  const quotaManager = new StorageQuotaManager();

  const estimate = await quotaManager.getStorageEstimate();
  assert(estimate.percentageUsed === 60.00, `Storage percentage used is 60%`);
  
  const isRunningLowLow = await quotaManager.isStorageRunningLow(80);
  assert(isRunningLowLow === false, `Storage is NOT running low on 80% threshold`);

  const isRunningLowHigh = await quotaManager.isStorageRunningLow(50);
  assert(isRunningLowHigh === true, `Storage IS running low on 50% threshold`);
  console.log('');

  // ----------------------------------------------------
  // TEST 4: DoctorGuideEngine Plain English Translations
  // ----------------------------------------------------
  console.log('--- Test 4: DoctorGuideEngine Translations ---');
  const translator = new DoctorGuideEngine();

  // Test exact jargon words
  assert(translator.translate('adherence') === 'taking medicines regularly', `adherence -> taking medicines regularly`);
  assert(translator.translate('dyspnea') === 'difficulty breathing', `dyspnea -> difficulty breathing`);
  assert(translator.translate('hypertension') === 'high blood pressure', `hypertension -> high blood pressure`);

  // Test matching sentence replacement
  const complexSentence = "Patient shows symptoms of dyspnea and hypertension. Adherence must be maintained.";
  const simplifiedSentence = translator.translate(complexSentence);
  assert(
    simplifiedSentence === "Patient shows symptoms of difficulty breathing and high blood pressure. taking medicines regularly must be maintained.",
    `Complex sentence translated to simple English: "${simplifiedSentence}"`
  );

  console.log('\n==================================================');
  console.log('         All Automated Checks Passed!             ');
  console.log('==================================================');
}

runTests().catch(err => {
  console.error('\n❌ Test Execution Failed:', err);
  process.exit(1);
});
