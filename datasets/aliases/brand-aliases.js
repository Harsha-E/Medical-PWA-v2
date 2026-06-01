/**
 * @fileoverview Brand Aliases Dataset
 * Stores alternate names, spelling variations, regional names, and OCR corruptions for common medicine brands.
 */

/**
 * Brand aliases map: official_brand_name -> array_of_aliases
 * @type {Record<string, string[]>}
 */
export const BRAND_ALIASES = {
  'Dolo 650': ['dolo650', 'dolo-650', 'dolow 650', 'dolo 65o', 'dolo 65O', 'dolo65o', 'dollo 650'],
  'Calpol': ['calpol 500', 'calpol 650', 'cellpol', 'calpole', 'calpol plus', 'calpal'],
  'Crocin': ['crocin 650', 'crocin advance', 'crocin pain relief', 'crocine', 'crocyn'],
  'Augmentin': ['augmentin 625', 'augmentin duo', 'agumentin', 'augmantin', 'augment1n'],
  'Pan-D': ['pan d', 'pand', 'pan-d capsule', 'pan.d', 'pan d caps'],
  'Pantocid': ['pantocid 40', 'pantocid-hp', 'pantecid', 'pantocyd'],
  'Montek-LC': ['montek lc', 'montek-lc tablet', 'montek lc tab', 'montel-lc', 'montek.lc'],
  'Allegra': ['allegra 120', 'allegra 180', 'allegra-m', 'alegra', 'allegrah'],
  'Limcee': ['limcee chewable', 'limce', 'limc', 'limcee-c'],
  'Becosules': ['becosule', 'becosules capsules', 'becosules-z', 'becasules'],
  'Metrogyl': ['metrogyl 400', 'metrogyl iv', 'metrogil', 'metrogyl-dF'],
  'Zantac': ['zantac 150', 'zantac 300', 'zantack', 'zantec'],
  'Omez': ['omez 20', 'omez-d', 'omez instad', 'omiz', 'omz'],
  'Voveran': ['voveran sr', 'voveran emulgel', 'voveran 50', 'voveron', 'voveran-sr'],
};

/**
 * Maps official brand names (lowercased) to their generic ingredients.
 * @type {Record<string, string>}
 */
export const BRAND_TO_GENERIC = {
  'dolo 650': 'paracetamol',
  'calpol': 'paracetamol',
  'crocin': 'paracetamol',
  'augmentin': 'amoxicillin + clavulanic acid',
  'pan-d': 'pantoprazole + domperidone',
  'pantocid': 'pantoprazole',
  'montek-lc': 'levocetirizine + montelukast',
  'allegra': 'fexofenadine',
  'limcee': 'ascorbic acid',
  'becosules': 'vitamin b-complex',
  'metrogyl': 'metronidazole',
  'zantac': 'ranitidine',
  'omez': 'omeprazole',
  'voveran': 'diclofenac',
  'combiflam': 'ibuprofen + paracetamol'
};


/**
 * Reversed lookup index: alias -> official_brand_name
 * @type {Map<string, string>}
 */
const ALIAS_INDEX = new Map();

// Initialize the index for O(1) lookups
for (const [officialName, aliases] of Object.entries(BRAND_ALIASES)) {
  ALIAS_INDEX.set(officialName.toLowerCase(), officialName);
  for (const alias of aliases) {
    ALIAS_INDEX.set(alias.toLowerCase(), officialName);
  }
}

/**
 * Resolves a brand alias to its official brand name.
 * @param {string} alias - The raw or corrupted brand name
 * @returns {string|null} The official brand name, or null if not found
 */
export function resolveBrandAlias(alias) {
  if (!alias || typeof alias !== 'string') return null;
  const clean = alias.trim().toLowerCase();
  return ALIAS_INDEX.get(clean) || null;
}

/**
 * Validates whether a brand entry is properly structured.
 * @param {string} brandName - Official brand name
 * @param {string[]} aliases - Array of aliases to validate
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function validateBrandEntry(brandName, aliases) {
  const errors = [];
  if (!brandName || typeof brandName !== 'string' || brandName.trim() === '') {
    errors.push('Official brand name must be a non-empty string.');
  }
  if (!Array.isArray(aliases)) {
    errors.push('Aliases must be an array of strings.');
  } else {
    for (let i = 0; i < aliases.length; i++) {
      if (typeof aliases[i] !== 'string' || aliases[i].trim() === '') {
        errors.push(`Alias at index ${i} is not a valid string.`);
      }
    }
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Dynamically expands the brand aliases registry at runtime.
 * @param {string} officialBrandName - The destination brand name
 * @param {string[]} newAliases - List of new aliases to register
 * @returns {boolean} True if successfully added
 */
export function registerBrandAliases(officialBrandName, newAliases) {
  const validation = validateBrandEntry(officialBrandName, newAliases);
  if (!validation.isValid) {
    console.error('Failed to register brand aliases:', validation.errors);
    return false;
  }

  const normalizedOfficial = officialBrandName.trim();
  const currentAliases = BRAND_ALIASES[normalizedOfficial] || [];
  
  BRAND_ALIASES[normalizedOfficial] = [...new Set([...currentAliases, ...newAliases])];
  
  // Update flat index
  ALIAS_INDEX.set(normalizedOfficial.toLowerCase(), normalizedOfficial);
  for (const alias of newAliases) {
    ALIAS_INDEX.set(alias.trim().toLowerCase(), normalizedOfficial);
  }
  return true;
}
