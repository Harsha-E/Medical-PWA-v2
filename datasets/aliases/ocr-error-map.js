/**
 * @fileoverview OCR Error Map and Normalizer for Medicine Labels
 * Handles common OCR substitutions (0/O, 1/I/l, 5/S), spacing errors, and spelling variants.
 */

/**
 * Character substitution map for standard OCR errors
 * @type {Record<string, string>}
 */
export const CHARACTER_SUBSTITUTIONS = {
  '0': 'O', // When expecting letters, 0 is often O
  '1': 'I', // When expecting letters, 1 is often I or l
  'l': 'I',
  '|': 'I',
  '5': 'S', // When expecting letters, 5 is often S
  '8': 'B', // When expecting letters, 8 is often B
  'vv': 'w',
  'rn': 'm', // OCR "rn" -> "m"
  'cl': 'd', // OCR "cl" -> "d"
};

/**
 * Map of common OCR word corruption patterns to their correct drug terms.
 * @type {Record<string, string>}
 */
export const COMMON_OCR_CORRECTIONS = {
  // Brand/Generic names common typos
  'paracetam0i': 'paracetamol',
  'paracctarnol': 'paracetamol',
  'paraeetamol': 'paracetamol',
  'paracetam': 'paracetamol',
  'paracetml': 'paracetamol',
  
  'ibupr0fen': 'ibuprofen',
  'ibuprofcn': 'ibuprofen',
  'ibuprfen': 'ibuprofen',
  
  'dici0fenac': 'diclofenac',
  'diclofcnac': 'diclofenac',
  'dlelofenae': 'diclofenac',
  
  'aceci0fenac': 'aceclofenac',
  'accclofcnac': 'aceclofenac',
  'aeeelofenae': 'aceclofenac',
  
  'nimesulide': 'nimesulide',
  'nimesuiide': 'nimesulide',
  'nirncsulidc': 'nimesulide',
  'nlmesullde': 'nimesulide',
  
  'napr0xen': 'naproxen',
  'naproxcn': 'naproxen',
  
  'ket0r0iac': 'ketorolac',
  'kctorolac': 'ketorolac',
  'ketorolae': 'ketorolac',
  
  'ceiec0xib': 'celecoxib',
  'cclccoxib': 'celecoxib',
  'celeeoxlb': 'celecoxib',
  
  'et0ric0xib': 'etoricoxib',
  'etorleoxlb': 'etoricoxib',
  
  'tramad0i': 'tramadol',
  'trarnadol': 'tramadol',
  
  'tapentad0i': 'tapentadol',
  'tapcntadol': 'tapentadol',
  
  'm0rphine': 'morphine',
  'morphinc': 'morphine',
  'morphlne': 'morphine',
  
  'c0deine': 'codeine',
  'codcinc': 'codeine',
  'codelne': 'codeine',
  
  'asplrin': 'aspirin',
  'asprm': 'aspirin',
  
  'ci0pid0grei': 'clopidogrel',
  'clopidogrcl': 'clopidogrel',
  'clopldogrel': 'clopidogrel',
  
  'ticagreio0r': 'ticagrelor',
  'ticagrclor': 'ticagrelor',
  'tleagrelor': 'ticagrelor',
  
  'prasugrei': 'prasugrel',
  'prasugrcl': 'prasugrel',
  
  'warfarln': 'warfarin',
  'warfrn': 'warfarin',
  
  'rivar0xaban': 'rivaroxaban',
  'riivaroxaban': 'rivaroxaban',
  'rlvaroxaban': 'rivaroxaban',
  
  // Dosage form common typos
  'tabiet': 'tablet',
  'tabicts': 'tablets',
  'tab1et': 'tablet',
  'capsu1e': 'capsule',
  'capsuies': 'capsules',
  'syrp': 'syrup',
  'susp': 'suspension',
  'inj': 'injection',
  
  // Manufacturer common typos
  'clpia': 'cipla',
  'clp1a': 'cipla',
  'sunpharma': 'sun pharma',
  'drreddy': "dr reddy's",
  'drreddys': "dr reddy's",
  'gsk': 'glaxosmithkline',
  'glaxo': 'glaxosmithkline'
};

/**
 * Spacing corrections to normalize word boundaries.
 * @type {Array<{pattern: RegExp, replacement: string}>}
 */
export const SPACING_PATTERNS = [
  // Normalizing dosage representation e.g. "500 mg" -> "500mg" or "500   mg" -> "500mg"
  { pattern: /(\d+)\s+(mg|mcg|g|ml|tab|cap|caps|tabs)\b/gi, replacement: '$1$2' },
  // Normalizing ratios/percentages e.g. "0.5 %" -> "0.5%"
  { pattern: /(\d+(?:\.\d+)?)\s*%/g, replacement: '$1%' },
  // Remove spaces around hyphens in drug names like "Amoxycillin-Clavulanic"
  { pattern: /(\w+)\s*-\s*(\w+)/g, replacement: '$1-$2' },
  // Clean up punctuation clusters
  { pattern: /[.,;:_|\-\\/]{2,}/g, replacement: ' ' }
];

/**
 * Normalizes text by applying character substitutions, spacing rules, and dictionary corrections.
 * @param {string} text - Raw OCR text block or line
 * @returns {string} Fully corrected and normalized text
 */
export function correctOcrText(text) {
  if (!text || typeof text !== 'string') return '';
  
  let normalized = text.toLowerCase().trim();

  // 1. Apply spacing and formatting patterns
  for (const rule of SPACING_PATTERNS) {
    normalized = normalized.replace(rule.pattern, rule.replacement);
  }

  // 2. Perform word-by-word token corrections
  const words = normalized.split(/\s+/);
  const correctedWords = words.map(word => {
    // Exact match correction
    if (COMMON_OCR_CORRECTIONS[word]) {
      return COMMON_OCR_CORRECTIONS[word];
    }
    
    // Strip trailing/leading punctuation for dictionary checks
    const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
    if (COMMON_OCR_CORRECTIONS[cleanWord]) {
      return word.replace(cleanWord, COMMON_OCR_CORRECTIONS[cleanWord]);
    }

    return word;
  });

  return correctedWords.join(' ');
}

/**
 * Corrects individual characters inside a token if numeric-alpha substitutions are expected.
 * @param {string} token - The alphanumeric string
 * @param {'alpha'|'numeric'} mode - The expected character class
 * @returns {string}
 */
export function correctCharacters(token, mode = 'alpha') {
  if (!token) return '';
  
  return token.split('').map(char => {
    if (mode === 'alpha') {
      // If we expect letters but got numbers
      return CHARACTER_SUBSTITUTIONS[char] || char;
    } else if (mode === 'numeric') {
      // If we expect numbers but got letters
      if (char === 'O' || char === 'o') return '0';
      if (char === 'I' || char === 'i' || char === 'l' || char === '|') return '1';
      if (char === 'S' || char === 's') return '5';
      if (char === 'B' || char === 'b') return '8';
      if (char === 'G' || char === 'g') return '6';
      if (char === 'T' || char === 't') return '7';
      if (char === 'Z' || char === 'z') return '2';
    }
    return char;
  }).join('');
}
