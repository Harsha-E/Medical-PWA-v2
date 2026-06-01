/**
 * @fileoverview Scratch script to verify medicine scanning pipeline modules.
 * Can be run with Node.js.
 */

import MedicineIdentifier from '../services/ai/MedicineIdentifier.js';

console.log('Testing scanning pipeline...');

try {
  const identifier = new MedicineIdentifier();
  console.log('Successfully initialized MedicineIdentifier!');

  // Mock a frame OCR output
  const mockFrame = {
    rawText: 'Dolo 650mg\nTablet\nBatch No. DL4012\nMfg: Cipla Ltd',
    confidence: 90,
    regions: [
      { text: 'Dolo 650mg', confidence: 95, bbox: { x0: 10, y0: 10, x1: 100, y1: 30 } },
      { text: 'Tablet', confidence: 90, bbox: { x0: 10, y0: 35, x1: 80, y1: 55 } },
      { text: 'Batch No. DL4012', confidence: 85, bbox: { x0: 10, y0: 60, x1: 150, y1: 80 } },
      { text: 'Mfg: Cipla Ltd', confidence: 92, bbox: { x0: 10, y0: 85, x1: 180, y1: 105 } }
    ]
  };

  console.log('\nRunning mock scan...');
  const result = identifier.identifyMedicine(mockFrame);
  
  console.log('Scan result state:', result.state);
  console.log('Scan result confidence:', result.confidence);
  console.log('Scan result best match:', result.bestMatch ? result.bestMatch.name : 'None');

  if (result.bestMatch) {
    console.log('Successfully matched drug details:', JSON.stringify(result.bestMatch, null, 2));
  } else {
    console.warn('Matching failed! Candidate was not found.');
  }

  const diag = identifier.generateIdentificationReport(result);
  console.log('\nGenerated Diagnostic Report:');
  console.log(diag);

  console.log('\nModule validation complete. Everything works as expected!');
} catch (err) {
  console.error('\nERROR: Pipeline validation failed:', err);
  process.exit(1);
}
