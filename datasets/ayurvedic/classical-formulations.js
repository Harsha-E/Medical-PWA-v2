/**
 * @fileoverview Classical Ayurvedic Formulations Dataset
 * Contains standardized classical recipes from authoritative Ayurvedic pharmacopoeias.
 */

/**
 * Array of classical Ayurvedic formulations.
 * Supports categories: churna, vati, rasa, asava, arishta, ghrita, taila, etc.
 * @type {Array<import('./ayush-dataset.js').AyushMedicine>}
 */
export const CLASSICAL_FORMULATIONS = [
  {
    id: "ayush:chandraprabha-vati",
    name: "Chandraprabha Vati",
    aliases: ["chandraprabha bati", "candraprabha vati", "chandraprabha", "cp vati"],
    ocrVariants: ["Chandraprabha Vatl", "Candraprabha Vati", "Chandra prabha"],
    formulationType: "classical",
    manufacturer: "Baidyanath",
    category: "Urinary & Rejuvenative (Prameha/Rasayana)",
    dosageForms: ["Vati/Tablet"],
    keyIngredients: ["Shilajit", "Guggulu", "Karpur", "Vacha", "Musta", "Amla", "Haritaki"],
    classicalReference: "Bhaishajya Ratnavali / Sarangadhara Samhita"
  },
  {
    id: "ayush:triphala-churna",
    name: "Triphala Churna",
    aliases: ["triphala powder", "trifala churna", "triphala choornam"],
    ocrVariants: ["Triphaia Churna", "Trlfala Churna", "Triphala Churnam"],
    formulationType: "classical",
    manufacturer: "Dabur",
    category: "Digestive & Laxative (Anulomana)",
    dosageForms: ["Churna/Powder"],
    keyIngredients: ["Amla (Phyllanthus emblica)", "Bibhitaki (Terminalia bellirica)", "Haritaki (Terminalia chebula)"],
    classicalReference: "Charaka Samhita / Bhaishajya Ratnavali"
  },
  {
    id: "ayush:laxmivilas-ras",
    name: "Laxmivilas Ras (Nardiya)",
    aliases: ["laxmi vilas rasa", "lakshmivilas ras", "narediya laxmivilas"],
    ocrVariants: ["Laxmivllas Ras", "Lakshmlvilas Ras", "Laxmi Vilas"],
    formulationType: "classical",
    manufacturer: "Patanjali Divya Pharmacy",
    category: "Respiratory & Cardio-protective (Kasa/Swasa)",
    dosageForms: ["Rasa/Tablet (Herbo-mineral)"],
    keyIngredients: ["Shuddha Parada", "Shuddha Gandhaka", "Abhraka Bhasma", "Jatiphala", "Shuddha Datura"],
    classicalReference: "Bhaishajya Ratnavali"
  },
  {
    id: "ayush:dashmoolarishta",
    name: "Dashmoolarishta",
    aliases: ["dashmularishta", "dasamularista", "dashmoola arishta"],
    ocrVariants: ["Dashm001arishta", "Dasamoolarishtam", "Dashmularisht"],
    formulationType: "classical",
    manufacturer: "Kottakkal Arya Vaidya Sala",
    category: "Post-natal & Restorative (Vata Vyadhi)",
    dosageForms: ["Arishta/Fermented Liquid"],
    keyIngredients: ["Agnimantha", "Shyonaka", "Gambhari", "Patala", "Shalaparni", "Prishniparni"],
    classicalReference: "Sarangadhara Samhita / Bhaishajya Ratnavali"
  },
  {
    id: "ayush:kumaryasava",
    name: "Kumaryasava",
    aliases: ["kumari asava", "kumaryasavam", "kumarayasava"],
    ocrVariants: ["Kumaryasav4", "Kumari Asavam", "Kurnaryasava"],
    formulationType: "classical",
    manufacturer: "Sandu",
    category: "Hepatic & Digestive Stimulant (Yakrit/Pliha)",
    dosageForms: ["Asava/Fermented Liquid"],
    keyIngredients: ["Kumari (Aloe vera)", "Haritaki", "Dhataki", "Jatiphala", "Loha Bhasma"],
    classicalReference: "Sarangadhara Samhita"
  },
  {
    id: "ayush:brahmi-ghrita",
    name: "Brahmi Ghrita",
    aliases: ["brahmi ghee", "brahmi gritham", "brahmyadi ghrita"],
    ocrVariants: ["Brahml Ghrita", "Brahmi Ghritha", "Brahmi ghee"],
    formulationType: "classical",
    manufacturer: "Kottakkal Arya Vaidya Sala",
    category: "Cognitive Enhancer & Nootropic (Medhya Rasayana)",
    dosageForms: ["Ghrita/Medicated Ghee"],
    keyIngredients: ["Brahmi (Bacopa monnieri)", "Vacha", "Kushtha", "Shankhapushpi", "Purified Cow Ghee"],
    classicalReference: "Ashtanga Hridaya"
  },
  {
    id: "ayush:anu-taila",
    name: "Anu Taila",
    aliases: ["anu tailam", "anu oil", "anuthailam"],
    ocrVariants: ["Anu Tai1a", "Anu Thailam", "Anu Oil"],
    formulationType: "classical",
    manufacturer: "Kottakkal Arya Vaidya Sala",
    category: "Nasal Drops & ENT Health (Nasya/Urdhwajatrugata)",
    dosageForms: ["Taila/Medicated Oil"],
    keyIngredients: ["Jivanti", "Jalada", "Devadaru", "Daruharidra", "Yashtimadhu", "Sesame Oil"],
    classicalReference: "Ashtanga Hridaya / Charaka Samhita"
  },
  {
    id: "ayush:yogaraj-guggulu",
    name: "Yogaraj Guggulu",
    aliases: ["yogaraja guggulu", "yograj guggul", "yogaraja gulgulu"],
    ocrVariants: ["Yograj Guggui", "Yogaraja Guggulu", "Yogaraj Guggulu"],
    formulationType: "classical",
    manufacturer: "Baidyanath",
    category: "Joint Pain & Anti-rheumatic (Amavata/Sandhigata Vata)",
    dosageForms: ["Vati/Tablet"],
    keyIngredients: ["Shuddha Guggulu", "Chitraka", "Pippali", "Jeeraka", "Vidanga", "Haritaki"],
    classicalReference: "Sarangadhara Samhita"
  }
];
