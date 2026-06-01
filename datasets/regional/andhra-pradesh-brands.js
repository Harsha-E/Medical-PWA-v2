/**
 * @fileoverview Regional Medicine Database for Andhra Pradesh
 * Stores brands distributed heavily under regional health schemes (e.g., YSR Aarogyasri)
 * or manufactured/marketed extensively by local AP pharma distributors.
 */

/**
 * @typedef {Object} RegionalBrand
 * @property {string} id - Unique identifier
 * @property {string} name - Brand name
 * @property {string} genericName - Generic drug name
 * @property {string} manufacturer - Manufacturer name
 * @property {string[]} aliases - Alternative names
 * @property {string[]} ocrVariants - Common OCR corruptions specific to the layout
 * @property {string[]} dosageForms - e.g. ["Tablet", "Injection"]
 * @property {string[]} commonDoses - e.g. ["100mg", "250mg"]
 * @property {Object} regionMetadata - Distribution stats or regional scheme info
 */

/**
 * Regional Andhra Pradesh drug dataset
 * @type {RegionalBrand[]}
 */
export const AP_DRUG_DATASET = [
  {
    id: "ap-paracetamol-government",
    name: "AP-Govt Paracetamol",
    genericName: "Paracetamol",
    manufacturer: "Hetero Drugs",
    aliases: ["ap govt paracetamol", "ysr paracetamol", "aarogyasri paracetamol", "ap state govt supply paracetamol"],
    ocrVariants: ["AP-G0vt Paracetam0l", "AP Govt Paracctarnol"],
    dosageForms: ["Tablet", "Syrup"],
    commonDoses: ["500mg", "650mg", "125mg/5ml"],
    regionMetadata: {
      distributor: "APMSIDC (Andhra Pradesh Medical Services & Infrastructure Development Corporation)",
      schemeAvailability: "YSR Aarogyasri / PHC Free Supply",
      prominence: "High"
    }
  },
  {
    id: "ap-amoxicillin-govt",
    name: "AP-Govt Amoxicillin",
    genericName: "Amoxicillin",
    manufacturer: "MSN Laboratories",
    aliases: ["ap govt amoxicillin", "ysr amoxicillin", "apmsidc amoxicillin"],
    ocrVariants: ["AP-G0vt Am0xici11in", "AP Govt Amoxiciln"],
    dosageForms: ["Capsule", "Dry Syrup"],
    commonDoses: ["250mg", "500mg"],
    regionMetadata: {
      distributor: "APMSIDC",
      schemeAvailability: "YSR Aarogyasri / Free Supply",
      prominence: "High"
    }
  },
  {
    id: "laurus-pantoprazole",
    name: "Lauroprazole",
    genericName: "Pantoprazole",
    manufacturer: "Laurus Labs",
    aliases: ["lauroprazole 40", "laurus panto", "lauroprazole tablet"],
    ocrVariants: ["Laur0praz01e", "Lauroprazolc"],
    dosageForms: ["Tablet"],
    commonDoses: ["40mg"],
    regionMetadata: {
      distributor: "Laurus Regional Distribution Vizag",
      schemeAvailability: "Commercial & Aarogyasri Pharmacy",
      prominence: "Medium"
    }
  },
  {
    id: "hetero-pantocid-regional",
    name: "H-Pan 40",
    genericName: "Pantoprazole",
    manufacturer: "Hetero Drugs",
    aliases: ["h pan 40", "hpan 40", "h-pan generic"],
    ocrVariants: ["H-Pan 4O", "H-P4n 40"],
    dosageForms: ["Tablet", "Injection"],
    commonDoses: ["40mg"],
    regionMetadata: {
      distributor: "Hetero Healthcare AP",
      schemeAvailability: "Commercial Retailer / Scheme Formulary",
      prominence: "High"
    }
  },
  {
    id: "ap-atorvastatin-govt",
    name: "AP-Govt Atorvastatin",
    genericName: "Atorvastatin",
    manufacturer: "MSN Laboratories",
    aliases: ["ap govt atorvastatin", "ysr atorvastatin", "apmsidc atorvastatin"],
    ocrVariants: ["AP-G0vt At0rvastatin", "AP Govt Atorvastatn"],
    dosageForms: ["Tablet"],
    commonDoses: ["10mg", "20mg"],
    regionMetadata: {
      distributor: "APMSIDC",
      schemeAvailability: "Aarogyasri Chronic Care Clinic",
      prominence: "High"
    }
  },
  {
    id: "ap-metformin-govt",
    name: "AP-Govt Metformin",
    genericName: "Metformin",
    manufacturer: "Divi's Laboratories",
    aliases: ["ap govt metformin", "ysr metformin", "apmsidc metformin"],
    ocrVariants: ["AP-G0vt Metf0rmin", "AP Govt Metformn"],
    dosageForms: ["Tablet"],
    commonDoses: ["500mg", "850mg"],
    regionMetadata: {
      distributor: "APMSIDC",
      schemeAvailability: "Aarogyasri NCD Program",
      prominence: "High"
    }
  }
];

/**
 * Validates a regional brand entry schema
 * @param {any} brand - Object to validate
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function validateRegionalBrand(brand) {
  const errors = [];
  if (!brand || typeof brand !== 'object') {
    errors.push('Brand must be a valid object.');
    return { isValid: false, errors };
  }

  const requiredFields = ['id', 'name', 'genericName', 'manufacturer'];
  for (const field of requiredFields) {
    if (!brand[field] || typeof brand[field] !== 'string' || brand[field].trim() === '') {
      errors.push(`Field '${field}' is required and must be a non-empty string.`);
    }
  }

  const arrayFields = ['aliases', 'ocrVariants', 'dosageForms', 'commonDoses'];
  for (const field of arrayFields) {
    if (!Array.isArray(brand[field])) {
      errors.push(`Field '${field}' must be an array of strings.`);
    }
  }

  if (!brand.regionMetadata || typeof brand.regionMetadata !== 'object') {
    errors.push('Field \'regionMetadata\' must be a valid object.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Searches the AP regional drug dataset for a candidate term
 * @param {string} term - Search term
 * @returns {RegionalBrand[]} Matches found
 */
export function searchApBrands(term) {
  if (!term || typeof term !== 'string') return [];
  const clean = term.trim().toLowerCase();

  return AP_DRUG_DATASET.filter(brand => {
    return brand.name.toLowerCase().includes(clean) ||
           brand.genericName.toLowerCase().includes(clean) ||
           brand.manufacturer.toLowerCase().includes(clean) ||
           brand.aliases.some(alias => alias.toLowerCase().includes(clean)) ||
           brand.ocrVariants.some(variant => variant.toLowerCase().includes(clean));
  });
}
