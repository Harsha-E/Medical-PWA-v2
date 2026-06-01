/**
 * @fileoverview AYUSH (Ayurveda, Yoga, Unani, Siddha, Homeopathy) Master Dataset Structure
 * Combines classical and proprietary databases and provides scalable querying,
 * validation, and batch ingestion utilities.
 */

import { CLASSICAL_FORMULATIONS } from './classical-formulations.js';
import { PROPRIETARY_AYURVEDIC_BRANDS } from './proprietary-ayurvedic-brands.js';

/**
 * @typedef {Object} AyushMedicine
 * @property {string} id - Unique identifier (e.g., "ayush:chandraprabha-vati")
 * @property {string} name - Official Sanskrit/Common name
 * @property {string[]} aliases - Vernacular/alternative spellings (Hindi, Telugu, Tamil, English)
 * @property {'classical'|'proprietary'} formulationType - Classical text formula or manufacturer brand
 * @property {string} manufacturer - Manufacturing company (e.g., "Baidyanath", "Kottakkal", "Dabur", "Patanjali")
 * @property {string} category - Therapeutic category (e.g., "Rejuvenator/Rasayana", "Digestive", "Anti-inflammatory")
 * @property {string[]} dosageForms - e.g., ["Vati/Tablet", "Churna/Powder", "Arishta/Liquid"]
 * @property {string[]} keyIngredients - Primary botanical/mineral components
 * @property {string} [classicalReference] - Text source if classical (e.g., "Sarangadhara Samhita")
 * @property {string[]} [ocrVariants] - Common OCR misreadings of the name
 */

/**
 * Global registry holding the master list of Ayurvedic medicines.
 * Initialized with imported datasets.
 * @type {AyushMedicine[]}
 */
const AYUSH_REGISTRY = [];

/**
 * Registers a batch of medicines into the AYUSH master database.
 * @param {AyushMedicine[]} medicines - Array of medicines to ingest
 * @returns {{successCount: number, failures: {item: any, errors: string[]}[]}}
 */
export function ingestAyushMedicines(medicines) {
  const result = { successCount: 0, failures: [] };
  if (!Array.isArray(medicines)) {
    result.failures.push({ item: medicines, errors: ['Input must be an array of medicine objects.'] });
    return result;
  }

  for (const item of medicines) {
    const validation = validateAyushMedicine(item);
    if (validation.isValid) {
      // Check for duplicate IDs
      const duplicateIndex = AYUSH_REGISTRY.findIndex(registered => registered.id === item.id);
      if (duplicateIndex !== -1) {
        // Update/overwrite existing
        AYUSH_REGISTRY[duplicateIndex] = item;
      } else {
        AYUSH_REGISTRY.push(item);
      }
      result.successCount++;
    } else {
      result.failures.push({ item, errors: validation.errors });
    }
  }

  return result;
}

/**
 * Validates the schema of an AYUSH medicine item.
 * @param {any} medicine - Object to validate
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function validateAyushMedicine(medicine) {
  const errors = [];
  if (!medicine || typeof medicine !== 'object') {
    errors.push('Medicine entry must be an object.');
    return { isValid: false, errors };
  }

  const requiredStringFields = ['id', 'name', 'formulationType', 'manufacturer', 'category'];
  for (const field of requiredStringFields) {
    if (!medicine[field] || typeof medicine[field] !== 'string' || medicine[field].trim() === '') {
      errors.push(`Required field '${field}' is missing or is not a non-empty string.`);
    }
  }

  if (medicine.formulationType && !['classical', 'proprietary'].includes(medicine.formulationType)) {
    errors.push("Field 'formulationType' must be either 'classical' or 'proprietary'.");
  }

  const requiredArrayFields = ['aliases', 'dosageForms', 'keyIngredients'];
  for (const field of requiredArrayFields) {
    if (!Array.isArray(medicine[field])) {
      errors.push(`Field '${field}' is required and must be an array of strings.`);
    } else if (medicine[field].some(element => typeof element !== 'string' || element.trim() === '')) {
      errors.push(`Array '${field}' must only contain non-empty strings.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Auto-ingest existing sub-datasets
ingestAyushMedicines(CLASSICAL_FORMULATIONS);
ingestAyushMedicines(PROPRIETARY_AYURVEDIC_BRANDS);

/**
 * Searches the master AYUSH dataset.
 * Supports searching by name, aliases, manufacturer, ingredients, and categories.
 * @param {string} query - The search query term
 * @param {Object} [filters] - Optional filter object
 * @param {'classical'|'proprietary'} [filters.type] - Filter by formulation type
 * @param {string} [filters.manufacturer] - Filter by manufacturer
 * @param {string} [filters.category] - Filter by therapeutic category
 * @returns {AyushMedicine[]} Match candidates
 */
export function searchAyushDataset(query, filters = {}) {
  let list = [...AYUSH_REGISTRY];

  // Apply filters
  if (filters.type) {
    list = list.filter(item => item.formulationType === filters.type);
  }
  if (filters.manufacturer) {
    const mfg = filters.manufacturer.toLowerCase();
    list = list.filter(item => item.manufacturer.toLowerCase().includes(mfg));
  }
  if (filters.category) {
    const cat = filters.category.toLowerCase();
    list = list.filter(item => item.category.toLowerCase().includes(cat));
  }

  if (!query || typeof query !== 'string') {
    return list;
  }

  const cleanQuery = query.trim().toLowerCase();

  return list.filter(item => {
    return item.name.toLowerCase().includes(cleanQuery) ||
           item.category.toLowerCase().includes(cleanQuery) ||
           item.aliases.some(alias => alias.toLowerCase().includes(cleanQuery)) ||
           item.keyIngredients.some(ing => ing.toLowerCase().includes(cleanQuery)) ||
           (item.ocrVariants && item.ocrVariants.some(v => v.toLowerCase().includes(cleanQuery))) ||
           (item.classicalReference && item.classicalReference.toLowerCase().includes(cleanQuery));
  });
}

/**
 * Gets the total count of registered medicines.
 * @returns {number}
 */
export function getRegistryCount() {
  return AYUSH_REGISTRY.length;
}

/**
 * Returns the underlying registry.
 * @returns {AyushMedicine[]}
 */
export function getMasterRegistry() {
  return AYUSH_REGISTRY;
}
