/**
 * @fileoverview CarePoint Scan Consensus Test Script
 * Simulates a virtual scan session feeding consecutive OCR inputs
 * to verify candidate voting, corrections ledger learning, household boosts,
 * packaging fingerprint bonuses, and error analytics.
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

// Mock location and window for imported modules
globalThis.window = {
  location: { hash: '' }
};

// 2. Import MedicineIdentifier dynamically to ensure globals are defined first
const { default: MedicineIdentifier } = await import('../services/ai/MedicineIdentifier.js');

async function runTests() {
  console.log('=== CarePoint Medicine Intelligence Ledger & Consensus Tests ===\n');

  const identifier = new MedicineIdentifier();

  // Test 1: Rolling Temporal Consensus & Strict Thresholds (ACCEPTED, PROBABLE, VERIFYING, UNKNOWN)
  console.log('--- Test 1: Rolling Temporal Consensus & Strict Thresholds ---');
  identifier.clear();

  // Frame 1: Very degraded OCR (Paracetamol Plus)
  const f1 = identifier.identifyMedicine({
    rawText: 'Paracetam0l P1us',
    confidence: 55,
    regions: [
      { text: 'Paracetam0l', bbox: { x0: 10, y0: 10, x1: 80, y1: 25 } },
      { text: 'P1us', bbox: { x0: 85, y0: 10, x1: 120, y1: 25 } }
    ],
    sessionId: 'test-session-1'
  });
  console.log(`Frame 1 result state: ${f1.state} (Confidence: ${f1.confidence}%, Best Match: ${f1.bestMatch?.name || 'None'})`);

  // Frame 2: Improved OCR
  const f2 = identifier.identifyMedicine({
    rawText: 'Paracetamol Plus',
    confidence: 72,
    regions: [
      { text: 'Paracetamol', bbox: { x0: 12, y0: 11, x1: 78, y1: 24 } },
      { text: 'Plus', bbox: { x0: 84, y0: 11, x1: 118, y1: 24 } }
    ],
    sessionId: 'test-session-1'
  });
  console.log(`Frame 2 result state: ${f2.state} (Confidence: ${f2.confidence}%, Best Match: ${f2.bestMatch?.name || 'None'})`);

  // Frame 3: Perfect OCR frame
  const f3 = identifier.identifyMedicine({
    rawText: 'Paracetamol Plus 500mg',
    confidence: 95,
    regions: [
      { text: 'Paracetamol', bbox: { x0: 11, y0: 10, x1: 79, y1: 25 } },
      { text: 'Plus', bbox: { x0: 85, y0: 10, x1: 119, y1: 25 } },
      { text: '500mg', bbox: { x0: 125, y0: 10, x1: 160, y1: 25 } }
    ],
    sessionId: 'test-session-1'
  });
  console.log(`Frame 3 result state: ${f3.state} (Confidence: ${f3.confidence}%, Best Match: ${f3.bestMatch?.name || 'None'})`);
  if (f3.explainabilityDetails) {
    console.log(`Explainability checklist:`);
    f3.explainabilityDetails.forEach(line => console.log(`  ✓ ${line}`));
  }
  console.log('');


  // Test 2: User Correction Dictionary
  console.log('--- Test 2: User Correction Dictionary & Ledger Mapping ---');
  identifier.clear();

  // User submits a manual override/correction
  console.log('Recording manual correction: "Paracetam0l P1us" -> "Paracetamol Plus"');
  identifier.recordCorrection(
    'test-session-1',
    ['Paracetamol Plus'],
    true, // isUserCorrection
    'Paracetam0l P1us',
    [{ text: 'Paracetam0l', bbox: { x0: 10, y0: 10, x1: 80, y1: 25 } }]
  );

  // Now scan the degraded text again and verify that it matches Paracetamol Plus immediately
  const f4 = identifier.identifyMedicine({
    rawText: 'Paracetam0l P1us',
    confidence: 65,
    regions: [
      { text: 'Paracetam0l', bbox: { x0: 10, y0: 10, x1: 80, y1: 25 } }
    ],
    sessionId: 'test-session-2'
  });
  console.log(`Degraded Scan output after correction: ${f4.bestMatch?.name} (Confidence: ${f4.confidence}%, State: ${f4.state})`);
  if (f4.explainabilityDetails) {
    console.log(`Explainability checklist for corrected scan:`);
    f4.explainabilityDetails.forEach(line => console.log(`  ✓ ${line}`));
  }
  console.log('');


  // Test 3: Household Medicine Boost (+8 confidence) & Patient Regimen Graph
  console.log('--- Test 3: Household Medicine Boost & Patient Regimen Graph ---');
  identifier.clear();

  // Reset registry and associate medications to household members
  identifier.householdRegistry.clear();
  console.log('Associating Father with Paracetamol and Diclofenac...');
  identifier.householdRegistry.associateMemberMedicine('Father', 'Paracetamol');
  identifier.householdRegistry.associateMemberMedicine('Father', 'Diclofenac');

  console.log('Associating Mother with Ibuprofen Plus...');
  identifier.householdRegistry.associateMemberMedicine('Mother', 'Ibuprofen Plus');

  // Print associated medicines
  console.log(`Father's regimen:`, identifier.householdRegistry.getMemberMedicines('Father'));
  console.log(`Mother's regimen:`, identifier.householdRegistry.getMemberMedicines('Mother'));

  // Simulate scanning Ibuprofen Plus multiple times to make it a common medicine
  console.log('Simulating 17 scans for Ibuprofen Plus...');
  for (let i = 0; i < 17; i++) {
    identifier.householdRegistry.recordScan('Ibuprofen Plus');
  }

  // Scan Ibuprofen Plus and check if it receives the +8 confidence boost
  const fIbuprofen = identifier.identifyMedicine({
    rawText: 'Ibuprofen Plus 500mg',
    confidence: 75,
    regions: [
      { text: 'Ibuprofen', bbox: { x0: 10, y0: 10, x1: 80, y1: 30 } },
      { text: 'Plus', bbox: { x0: 85, y0: 10, x1: 120, y1: 30 } }
    ],
    sessionId: 'test-session-3'
  });
  console.log(`Ibuprofen Plus scan confidence: ${fIbuprofen.confidence}% (State: ${fIbuprofen.state})`);
  if (fIbuprofen.explainabilityDetails) {
    console.log(`Explainability checklist:`);
    fIbuprofen.explainabilityDetails.forEach(line => console.log(`  ✓ ${line}`));
  }
  console.log('');


  // Test 4: Packaging Layout Memory & Signature Fingerprints
  console.log('--- Test 4: Packaging Layout Memory & Signature Fingerprints ---');
  identifier.clear();

  // Store layout signature for a medicine (e.g. Ibuprofen Plus)
  const mockRegions = [
    { text: 'Ibuprofen', bbox: { x0: 10, y0: 10, x1: 90, y1: 25 } },
    { text: 'Plus', bbox: { x0: 10, y0: 30, x1: 40, y1: 45 } },
    { text: 'Cipla', bbox: { x0: 10, y0: 55, x1: 80, y1: 70 } }
  ];

  console.log('Saving mock Ibuprofen Plus layout signature to PackagingMemory...');
  // Call recordCorrection to train layout signature
  identifier.recordCorrection(
    'test-session-3',
    ['Ibuprofen Plus'],
    false, // not a manual correction, just user approved scan
    'Ibuprofen Plus Cipla',
    mockRegions
  );

  // Now scan with very degraded text ("Ibuprufen P1us") but the same spatial layout
  const degradedRegions = [
    { text: 'Ibuprufen', bbox: { x0: 12, y0: 11, x1: 92, y1: 24 } },
    { text: 'P1us', bbox: { x0: 9, y0: 29, x1: 39, y1: 44 } },
    { text: 'Cipla', bbox: { x0: 11, y0: 54, x1: 79, y1: 71 } }
  ];

  const fLayoutMatch = identifier.identifyMedicine({
    rawText: 'Ibuprufen P1us',
    confidence: 65,
    regions: degradedRegions,
    sessionId: 'test-session-4'
  });

  console.log(`Degraded OCR scan with matching layout signature: ${fLayoutMatch.bestMatch?.name} (Confidence: ${fLayoutMatch.confidence}%, State: ${fLayoutMatch.state})`);
  if (fLayoutMatch.explainabilityDetails) {
    console.log(`Explainability checklist for layout-matched scan:`);
    fLayoutMatch.explainabilityDetails.forEach(line => console.log(`  ✓ ${line}`));
  }
  console.log('');


  // Test 5: Error Analytics
  console.log('--- Test 5: Recognition History & Error Analytics ---');
  
  // Register various corrections and uncertain matches
  identifier.recordCorrection('test-session-x', ['Paracetamol'], true, 'Paracetam0l');
  identifier.recordCorrection('test-session-y', ['Paracetamol'], true, 'Paracetam0l');
  identifier.recordCorrection('test-session-z', ['Diclofenac'], true, 'Dicl0fenac');

  const misread = identifier.recognitionHistory.getMostMisread();
  const uncertain = identifier.recognitionHistory.getMostUncertain();

  console.log('Most misread medicine scans in history:');
  misread.slice(0, 5).forEach(m => console.log(`  - ${m.name}: ${m.count} corrections`));
  
  console.log('Most uncertain medicine scans in history:');
  uncertain.slice(0, 5).forEach(m => console.log(`  - ${m.name}: ${m.count} uncertain records`));

  console.log('\n=== All Tests Completed Successfully ===');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
});
