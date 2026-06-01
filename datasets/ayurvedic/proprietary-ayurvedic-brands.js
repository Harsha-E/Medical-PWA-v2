/**
 * @fileoverview Proprietary Ayurvedic Brands Dataset
 * Stores manufacturer-specific Ayurvedic patent/proprietary medicines.
 */

/**
 * Array of proprietary Ayurvedic brand medicines.
 * @type {Array<import('./ayush-dataset.js').AyushMedicine>}
 */
export const PROPRIETARY_AYURVEDIC_BRANDS = [
  {
    id: "ayush:liv-52",
    name: "Liv.52",
    aliases: ["liv52", "liv 52", "liv-52 tablet", "liv.52 syrup"],
    ocrVariants: ["Liv-52", "Llv.52", "Liv52"],
    formulationType: "proprietary",
    manufacturer: "Himalaya Wellness Company",
    category: "Hepatoprotective / Liver Tonic",
    dosageForms: ["Tablet", "Syrup", "Drops"],
    keyIngredients: ["Himsra (Capparis spinosa)", "Kasani (Cichorium intybus)", "Mandur Bhasma", "Kakamachi (Solanum nigrum)"]
  },
  {
    id: "ayush:cystone",
    name: "Cystone",
    aliases: ["cystone tablet", "cystone forte", "cystone-forte"],
    ocrVariants: ["Cyst0ne", "Cystonc", "Cyston"],
    formulationType: "proprietary",
    manufacturer: "Himalaya Wellness Company",
    category: "Anti-urolithiatic / Urinary Health",
    dosageForms: ["Tablet", "Syrup"],
    keyIngredients: ["Shilapushpha (Didymocarpus pedicellata)", "Pasanabheda (Saxifraga ligulata)", "Manjistha (Rubia cordifolia)"]
  },
  {
    id: "ayush:pudin-hara",
    name: "Pudin Hara",
    aliases: ["pudin hara pearls", "pudin hara active", "pudinhara"],
    ocrVariants: ["Pudln Hara", "Pudin H4ra", "Pudinhara"],
    formulationType: "proprietary",
    manufacturer: "Dabur",
    category: "Carminative & Antispasmodic",
    dosageForms: ["Capsule", "Liquid"],
    keyIngredients: ["Pudina Satva (Mentha piperita oil)"]
  },
  {
    id: "ayush:bgr-34",
    name: "BGR-34",
    aliases: ["bgr 34", "bgr34", "bgr-34 tablet"],
    ocrVariants: ["BGR34", "B.G.R-34", "BGR-34"],
    formulationType: "proprietary",
    manufacturer: "Aimil Pharmaceuticals",
    category: "Anti-diabetic",
    dosageForms: ["Tablet"],
    keyIngredients: ["Daruharidra (Berberis aristata)", "Giloy (Tinospora cordifolia)", "Vijaysar (Pterocarpus marsupium)", "Gymnema (Gurmar)"]
  },
  {
    id: "ayush:neeri-kft",
    name: "Neeri KFT",
    aliases: ["neeri", "neeri kft syrup", "neeri tablet"],
    ocrVariants: ["Neerl KFT", "Neeri-KFT", "Neeri"],
    formulationType: "proprietary",
    manufacturer: "Aimil Pharmaceuticals",
    category: "Nephroprotective & Urinary Tract Health",
    dosageForms: ["Syrup", "Tablet"],
    keyIngredients: ["Punarnava (Boerhavia diffusa)", "Varuna (Crataeva nurvala)", "Gokhru (Tribulus terrestris)", "Kasni"]
  },
  {
    id: "ayush:septilin",
    name: "Septilin",
    aliases: ["septilin tablet", "septilin syrup", "septilin drops"],
    ocrVariants: ["Sept1lin", "Septiln", "Septllin"],
    formulationType: "proprietary",
    manufacturer: "Himalaya Wellness Company",
    category: "Immunomodulator & Anti-infective",
    dosageForms: ["Tablet", "Syrup"],
    keyIngredients: ["Guggulu (Balsamodendron mukul)", "Maharasnadi Quath", "Guduchi (Tinospora cordifolia)", "Yashtimadhu"]
  },
  {
    id: "ayush:koflet",
    name: "Koflet",
    aliases: ["koflet syrup", "koflet lozenges", "koflet-h"],
    ocrVariants: ["Kofiet", "Koflet-H", "Koflt"],
    formulationType: "proprietary",
    manufacturer: "Himalaya Wellness Company",
    category: "Cough Relief / Expectorant",
    dosageForms: ["Syrup", "Lozenge"],
    keyIngredients: ["Madhu (Honey)", "Tulasi (Ocimum sanctum)", "Yashtimadhu (Glycyrrhiza glabra)", "Vasaka"]
  }
];

/**
 * Validates a proprietary brand structure.
 * @param {any} brand - Object to validate
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function validateProprietaryBrand(brand) {
  const errors = [];
  if (!brand || typeof brand !== 'object') {
    errors.push('Proprietary brand entry must be an object.');
    return { isValid: false, errors };
  }

  const requiredStringFields = ['id', 'name', 'manufacturer', 'category'];
  for (const field of requiredStringFields) {
    if (!brand[field] || typeof brand[field] !== 'string' || brand[field].trim() === '') {
      errors.push(`Field '${field}' is required and must be a non-empty string.`);
    }
  }

  const arrayFields = ['aliases', 'dosageForms', 'keyIngredients'];
  for (const field of arrayFields) {
    if (!Array.isArray(brand[field])) {
      errors.push(`Field '${field}' must be an array of strings.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
