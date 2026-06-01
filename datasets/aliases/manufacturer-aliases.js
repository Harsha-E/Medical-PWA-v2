/**
 * @fileoverview Manufacturer Aliases Dataset
 * Maps pharmaceutical manufacturer names to common abbreviations, corporate entities, and OCR corruption variations.
 */

/**
 * Manufacturer aliases map: official_manufacturer_name -> array_of_aliases
 * @type {Record<string, string[]>}
 */
export const MANUFACTURER_ALIASES = {
  'Cipla': ['cipla ltd', 'cipla limited', 'cipla labs', 'clpla', 'cip1a', 'cipla oncology'],
  'Sun Pharmaceutical': ['sun pharma', 'sun pharmaceuticals', 'sun pharmaceutical industries ltd', 'sun pahrma', 'sunpharma'],
  'Dr. Reddy\'s': ['dr reddy\'s laboratories', 'dr. reddys', 'dr reddy', 'dr.reddy', 'dr reddys labs', 'dr. reddy\'s laboratories ltd', 'dr.reddy\'s'],
  'Lupin': ['lupin ltd', 'lupin limited', 'lupin pharmaceuticals', 'lupine', 'lupn'],
  'Abbott': ['abbott healthcare', 'abbott laboratories', 'abbott india ltd', 'abbot', 'abbot india'],
  'GlaxoSmithKline': ['gsk', 'gsk plc', 'glaxosmithkline pharmaceuticals ltd', 'glaxo smith kline', 'glaxo', 'gsk india'],
  'Alkem Laboratories': ['alkem', 'alkem labs', 'alkem laboratories ltd', 'alkem limited'],
  'Torrent Pharmaceuticals': ['torrent', 'torrent pharma', 'torrent pharmaceuticals ltd', 'torent pharma'],
  'Intas Pharmaceuticals': ['intas', 'intas pharma', 'intas pharmaceuticals ltd', 'intas laboratories'],
  'Glenmark Pharmaceuticals': ['glenmark', 'glenmark pharma', 'glenmark pharmaceuticals ltd', 'glenmark labs'],
  'Cadila Healthcare': ['cadila', 'zydus cadila', 'zydus', 'zydus healthcare', 'cadila pharmaceuticals'],
  'Mankind Pharma': ['mankind', 'mankind pharma ltd', 'mankind pharmaceuticals'],
  'Ipca Laboratories': ['ipca', 'ipca labs', 'ipca laboratories ltd'],
  'Aurobindo Pharma': ['aurobindo', 'aurobindo pharma ltd', 'aurobindo laboratories'],
  'Biocon': ['biocon ltd', 'biocon limited', 'biocon india']
};

/**
 * Reversed lookup map: alias -> official_name
 * @type {Map<string, string>}
 */
const ALIAS_INDEX = new Map();

// Initialize index
for (const [officialName, aliases] of Object.entries(MANUFACTURER_ALIASES)) {
  ALIAS_INDEX.set(officialName.toLowerCase(), officialName);
  for (const alias of aliases) {
    ALIAS_INDEX.set(alias.toLowerCase(), officialName);
  }
}

/**
 * Resolves a manufacturer name or abbreviation to its official standardized name.
 * @param {string} rawName - Raw text or alias
 * @returns {string|null} Official manufacturer name, or null if unrecognized
 */
export function resolveManufacturerAlias(rawName) {
  if (!rawName || typeof rawName !== 'string') return null;
  const clean = rawName.trim().toLowerCase();
  
  // Exact lookup
  const match = ALIAS_INDEX.get(clean);
  if (match) return match;
  
  // Fallback: check if the raw text contains any of the known names/aliases as substrings
  for (const [alias, official] of ALIAS_INDEX.entries()) {
    if (clean.length > 3 && (clean.includes(alias) || alias.includes(clean))) {
      return official;
    }
  }

  return null;
}

/**
 * Gets list of all registered manufacturers.
 * @returns {string[]}
 */
export function getRegisteredManufacturers() {
  return Object.keys(MANUFACTURER_ALIASES);
}
