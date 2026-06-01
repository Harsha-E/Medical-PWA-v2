/**
 * @fileoverview Regional Manufacturer Registry (with focus on Southern/AP Phama Hubs)
 * Supports registry of regional players in India, handling aliases and name normalization.
 */

import { resolveManufacturerAlias } from '../aliases/manufacturer-aliases.js';

/**
 * Regional Manufacturer List (Andhra Pradesh, Telangana, Southern India Hubs)
 * @type {Array<{name: string, headquarters: string, state: string, aliases: string[], licenseType: string}>}
 */
export const REGIONAL_MANUFACTURERS = [
  {
    name: 'Hetero Drugs',
    headquarters: 'Hyderabad',
    state: 'Telangana',
    aliases: ['hetero', 'hetero drugs ltd', 'hetero healthcare', 'hetero labs', 'hetero life sciences'],
    licenseType: 'Formulation & API'
  },
  {
    name: 'MSN Laboratories',
    headquarters: 'Hyderabad',
    state: 'Telangana',
    aliases: ['msn', 'msn labs', 'msn laboratories pvt ltd', 'msn pharma'],
    licenseType: 'Formulation & API'
  },
  {
    name: 'Natco Pharma',
    headquarters: 'Hyderabad',
    state: 'Telangana',
    aliases: ['natco', 'natco pharma ltd', 'natco organies'],
    licenseType: 'Specialty Formulations'
  },
  {
    name: 'Divi\'s Laboratories',
    headquarters: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    aliases: ['divis', 'divis labs', 'divi\'s laboratories ltd', 'divis pharma'],
    licenseType: 'API & Intermediates'
  },
  {
    name: 'Granules India',
    headquarters: 'Hyderabad',
    state: 'Telangana',
    aliases: ['granules', 'granules india ltd', 'granules pharma'],
    licenseType: 'Formulation & API'
  },
  {
    name: 'Aurobindo Pharma',
    headquarters: 'Hyderabad',
    state: 'Telangana',
    aliases: ['aurobindo', 'aurobindo pharma ltd', 'aurobindo laboratories'],
    licenseType: 'API & Formulation'
  },
  {
    name: 'Suven Life Sciences',
    headquarters: 'Hyderabad',
    state: 'Telangana',
    aliases: ['suven', 'suven life', 'suven life sciences ltd'],
    licenseType: 'Specialty API'
  },
  {
    name: 'Shilpa Medicare',
    headquarters: 'Raichur/Vizag',
    state: 'Karnataka/AP',
    aliases: ['shilpa', 'shilpa medicare ltd', 'shilpa pharma'],
    licenseType: 'Oncology APIs'
  },
  {
    name: 'Laurus Labs',
    headquarters: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    aliases: ['laurus', 'laurus labs ltd', 'laurus synthesis', 'laurus pharma'],
    licenseType: 'API & Formulations'
  },
  {
    name: 'Gland Pharma',
    headquarters: 'Hyderabad',
    state: 'Telangana',
    aliases: ['gland', 'gland pharma ltd', 'gland injectables'],
    licenseType: 'Injectables Specialist'
  }
];

// Flat alias index for O(1) regional searches
const REGIONAL_ALIAS_INDEX = new Map();
for (const manufacturer of REGIONAL_MANUFACTURERS) {
  REGIONAL_ALIAS_INDEX.set(manufacturer.name.toLowerCase(), manufacturer);
  for (const alias of manufacturer.aliases) {
    REGIONAL_ALIAS_INDEX.set(alias.toLowerCase(), manufacturer);
  }
}

/**
 * Resolves a manufacturer to either a global manufacturer or a regional one.
 * @param {string} rawName - Raw text or alias
 * @returns {string|null} The resolved official name
 */
export function resolveRegionalManufacturer(rawName) {
  if (!rawName || typeof rawName !== 'string') return null;
  const clean = rawName.trim().toLowerCase();
  
  // 1. Check local regional index first
  const regionalMatch = REGIONAL_ALIAS_INDEX.get(clean);
  if (regionalMatch) {
    return regionalMatch.name;
  }
  
  // 2. Substring matching for regional
  for (const [alias, mfgObj] of REGIONAL_ALIAS_INDEX.entries()) {
    if (clean.length > 3 && (clean.includes(alias) || alias.includes(clean))) {
      return mfgObj.name;
    }
  }

  // 3. Fallback to global manufacturer aliases
  return resolveManufacturerAlias(rawName);
}

/**
 * Retrieves manufacturers filtered by Indian state.
 * @param {string} state - State name (e.g. "Andhra Pradesh")
 * @returns {Array<typeof REGIONAL_MANUFACTURERS[0]>}
 */
export function getManufacturersByState(state) {
  if (!state || typeof state !== 'string') return [];
  const searchState = state.trim().toLowerCase();
  return REGIONAL_MANUFACTURERS.filter(m => m.state.toLowerCase() === searchState);
}
