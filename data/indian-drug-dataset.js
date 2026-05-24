/**
 * Indian Drug Dataset — Comprehensive Pharmaceutical Reference
 * Sources: CDSCO (Central Drugs Standard Control Organisation),
 *          Indian Pharmacopoeia Commission, Jan Aushadhi Scheme,
 *          NPPA Drug Price Database, WHO Essential Medicines (India-adapted)
 *
 * Structure per entry:
 *   name        — Primary INN / brand name
 *   aliases     — Common alternate spellings / brand names found on Indian labels
 *   category    — ATC-aligned therapeutic class
 *   dosageForms — Available forms on Indian market
 *   commonDoses — Typical strengths printed on blister packs / bottles
 *   unit        — Default measurement unit
 *   schedule    — Indian drug schedule (H, H1, X, G, OTC)
 *   manufacturer — Representative Indian manufacturers
 */

export const INDIAN_DRUG_DATASET = [
  { name: "Paracetamol", aliases: ["Crocin", "Dolo", "Calpol", "Fepanil", "Pacimol", "Tylenol", "PCM", "Acetaminophen", "Febrinil", "Metacin", "Pyrigesic", "Napa", "Pyremol"], category: "Analgesic / Antipyretic", dosageForms: ["Tablet", "Syrup", "Suppository", "IV Infusion", "Suspension"], commonDoses: ["125mg", "250mg", "500mg", "650mg", "1000mg"], unit: "mg", schedule: "OTC", manufacturer: ["Cipla", "GSK", "Abbott", "Zydus Cadila"] },
  { name: "Ibuprofen", aliases: ["Brufen", "Combiflam", "Nurofen", "Advil", "Ibugesic", "Bugesic", "Fenlong", "Ibuclin", "Ibudol", "Profen"], category: "NSAID / Analgesic", dosageForms: ["Tablet", "Syrup", "Gel", "Capsule"], commonDoses: ["200mg", "400mg", "600mg", "800mg"], unit: "mg", schedule: "OTC", manufacturer: ["Abbott", "Cipla", "Sun Pharma"] },
  { name: "Amoxicillin", aliases: ["Mox", "Amox", "Cilamox", "Wymox", "Novamox", "Amoxil", "Trimox", "Dispermox", "Clamox", "Amoxyclav"], category: "Antibiotic / Penicillin", dosageForms: ["Capsule", "Tablet", "Suspension", "Injection"], commonDoses: ["125mg", "250mg", "500mg", "875mg"], unit: "mg", schedule: "H", manufacturer: ["Cipla", "Ranbaxy", "Dr Reddys", "Alkem"] },
  { name: "Metformin", aliases: ["Glycomet", "Glucophage", "Bigomet", "Metlong", "Gluconorm", "Carbophage", "Walaphage", "Obimet", "Cetapin"], category: "Antidiabetic / Biguanide", dosageForms: ["Tablet", "Extended Release Tablet"], commonDoses: ["500mg", "850mg", "1000mg"], unit: "mg", schedule: "H", manufacturer: ["USV", "Sun Pharma", "Cipla", "Zydus"] },
  { name: "Atorvastatin", aliases: ["Atorva", "Lipitor", "Tonact", "Astor", "Storvas", "Aztor", "Stator", "Liponorm", "Sortis", "Atorfit"], category: "Lipid Lowering / Statin", dosageForms: ["Tablet"], commonDoses: ["5mg", "10mg", "20mg", "40mg", "80mg"], unit: "mg", schedule: "H", manufacturer: ["Cipla", "Sun Pharma", "Torrent", "Pfizer"] },
  { name: "Aspirin", aliases: ["Ecosprin", "Disprin", "Ascard", "Loprin", "Cardace", "Aspro", "Colsprin", "Sprin", "Aspirin Protect"], category: "Antiplatelet / Analgesic", dosageForms: ["Tablet", "Effervescent Tablet", "Enteric Coated Tablet"], commonDoses: ["75mg", "150mg", "325mg", "500mg", "650mg"], unit: "mg", schedule: "OTC", manufacturer: ["USV", "Bayer", "Torrent"] },
  { name: "Cetirizine", aliases: ["Cetrizine", "Cetzine", "Alerid", "Okacet", "Zyrtec", "Reactine", "Cetriz", "Allercet", "Histazine", "Levocet"], category: "Antihistamine", dosageForms: ["Tablet", "Syrup", "Drops"], commonDoses: ["5mg", "10mg"], unit: "mg", schedule: "OTC", manufacturer: ["Cipla", "Sun Pharma", "Ranbaxy"] },
  { name: "Azithromycin", aliases: ["Azithral", "Zithromax", "Azax", "Azee", "Aziwok", "Azicip", "Azikem", "Zady", "Ziromac", "Trulimax"], category: "Antibiotic / Macrolide", dosageForms: ["Tablet", "Suspension", "IV Injection"], commonDoses: ["100mg", "250mg", "500mg"], unit: "mg", schedule: "H", manufacturer: ["Cipla", "Alkem", "Wockhardt", "Sun Pharma"] },
  { name: "Omeprazole", aliases: ["Omez", "Prilosec", "Losec", "Ocid", "Omecip", "Omepral", "Omegas", "Antra", "Gastrogard", "Zerocid"], category: "Proton Pump Inhibitor", dosageForms: ["Capsule", "Tablet", "Injection"], commonDoses: ["10mg", "20mg", "40mg"], unit: "mg", schedule: "H", manufacturer: ["Dr Reddys", "Cipla", "Torrent", "Sun Pharma"] },
  { name: "Pantoprazole", aliases: ["Pantop", "Pan", "Pantocid", "Protium", "Pantodac", "Protonix", "Pantacare", "Rantec", "Acipan", "Pantosec"], category: "Proton Pump Inhibitor", dosageForms: ["Tablet", "Injection"], commonDoses: ["20mg", "40mg"], unit: "mg", schedule: "H", manufacturer: ["Zydus", "Sun Pharma", "Torrent", "Alkem"] },
  { name: "Rabeprazole", aliases: ["Rabeloc", "Rablet", "Razo", "Aciphex", "Lupirabel", "Rabicip", "Rabepan", "Hopeon", "Rabeloc"], category: "Proton Pump Inhibitor", dosageForms: ["Tablet", "Capsule"], commonDoses: ["10mg", "20mg"], unit: "mg", schedule: "H", manufacturer: ["Lupin", "Cipla", "Sun Pharma"] },
  { name: "Doxycycline", aliases: ["Doxy", "Vibramycin", "Doxylag", "Doxrid", "Doxt", "Doxibact", "Oracea", "Doxymax", "Doxicip"], category: "Antibiotic / Tetracycline", dosageForms: ["Capsule", "Tablet", "Syrup"], commonDoses: ["50mg", "100mg", "200mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma", "Cipla"] },
  { name: "Metronidazole", aliases: ["Flagyl", "Metrogyl", "Metro", "Metrozol", "Aldazole", "Metronid", "Filmet", "Metryl", "Metronid", "Aristogyl"], category: "Antiprotozoal / Antibiotic", dosageForms: ["Tablet", "Suspension", "Injection", "Gel", "Cream"], commonDoses: ["200mg", "400mg", "500mg", "800mg"], unit: "mg", schedule: "H", manufacturer: ["Abbott", "Pfizer", "Cipla", "Sun Pharma"] },
  { name: "Ciprofloxacin", aliases: ["Cipro", "Ciplox", "Cifran", "Ciprobid", "Ciprolet", "Zoxan", "Bactiflox", "Ciproz", "Neofloxin", "Probiflox"], category: "Antibiotic / Fluoroquinolone", dosageForms: ["Tablet", "Injection", "Eye Drop", "Ear Drop"], commonDoses: ["250mg", "500mg", "750mg"], unit: "mg", schedule: "H", manufacturer: ["Cipla", "Ranbaxy", "Sun Pharma", "Bayer"] },
  { name: "Levofloxacin", aliases: ["Levox", "Levoflox", "Tavanic", "Levomac", "Leflox", "L-Cin", "Lequin", "Mahaflox", "Levobact", "Neofloxacin"], category: "Antibiotic / Fluoroquinolone", dosageForms: ["Tablet", "Injection", "Eye Drop"], commonDoses: ["250mg", "500mg", "750mg"], unit: "mg", schedule: "H", manufacturer: ["Sun Pharma", "Cipla", "Sanofi"] },
  { name: "Amlodipine", aliases: ["Amlokind", "Amlopress", "Norvasc", "Amlong", "Amdepin", "Stamlo", "Amlovas", "Calcitas", "Cardibest", "Amlodac"], category: "Calcium Channel Blocker", dosageForms: ["Tablet"], commonDoses: ["2.5mg", "5mg", "10mg"], unit: "mg", schedule: "H", manufacturer: ["Cipla", "Sun Pharma", "Pfizer", "Torrent"] },
  { name: "Losartan", aliases: ["Losar", "Cozaar", "Repace", "Losacar", "Lortaan", "Rozavel", "Losamax", "Angizaar", "Losatec", "Fiboloss"], category: "ARB / Antihypertensive", dosageForms: ["Tablet"], commonDoses: ["25mg", "50mg", "100mg"], unit: "mg", schedule: "H", manufacturer: ["Cipla", "Sun Pharma", "Dr Reddys"] },
  { name: "Telmisartan", aliases: ["Telma", "Telmikind", "Micardis", "Telmee", "Telista", "Telpres", "Telmisart", "Cresar", "Pritor", "Arbitel"], category: "ARB / Antihypertensive", dosageForms: ["Tablet"], commonDoses: ["20mg", "40mg", "80mg"], unit: "mg", schedule: "H", manufacturer: ["Glenmark", "Sun Pharma", "Cipla", "Torrent"] },
  { name: "Ramipril", aliases: ["Cardace", "Altace", "Ramistar", "Ramipace", "Ramicard", "Zigpril", "Corpril", "Ramitace", "Rampril"], category: "ACE Inhibitor", dosageForms: ["Capsule", "Tablet"], commonDoses: ["1.25mg", "2.5mg", "5mg", "10mg"], unit: "mg", schedule: "H", manufacturer: ["Sanofi", "Sun Pharma", "Cipla", "USV"] },
  { name: "Enalapril", aliases: ["Vasotec", "Envas", "Enapril", "Encardil", "Enalaprilat", "Enacard", "Renitec", "Dilvas", "Converten"], category: "ACE Inhibitor", dosageForms: ["Tablet", "Injection"], commonDoses: ["2.5mg", "5mg", "10mg", "20mg"], unit: "mg", schedule: "H", manufacturer: ["Cipla", "Sun Pharma", "Torrent"] },
  { name: "Metoprolol", aliases: ["Metolar", "Lopressor", "Toprol", "Metpure", "Metocar", "Seloken", "Betaloc", "Metoblock", "Embeta", "Ronitol"], category: "Beta Blocker", dosageForms: ["Tablet", "Extended Release Tablet", "Injection"], commonDoses: ["12.5mg", "25mg", "50mg", "100mg", "200mg"], unit: "mg", schedule: "H", manufacturer: ["Sun Pharma", "AstraZeneca", "Cipla"] },
  { name: "Atenolol", aliases: ["Tenormin", "Aten", "Betacard", "Ablok", "Lopresor", "Ativan", "Tenolol", "Blocotenol", "Slowblock"], category: "Beta Blocker", dosageForms: ["Tablet"], commonDoses: ["25mg", "50mg", "100mg"], unit: "mg", schedule: "H", manufacturer: ["ICI", "Sun Pharma", "Cipla", "Zydus"] },
  { name: "Furosemide", aliases: ["Frusemide", "Lasix", "Frusenex", "Furoped", "Frusol", "Diuret", "Lasicard", "Puresis", "Frusemicor"], category: "Loop Diuretic", dosageForms: ["Tablet", "Injection", "Solution"], commonDoses: ["20mg", "40mg", "80mg"], unit: "mg", schedule: "H", manufacturer: ["Sanofi", "Sun Pharma", "Cipla"] },
  { name: "Spironolactone", aliases: ["Aldactone", "Spiroctan", "Spiro", "Aldactide", "Laractone", "Spirolang", "Spirotone", "Berlactone"], category: "Potassium Sparing Diuretic", dosageForms: ["Tablet"], commonDoses: ["25mg", "50mg", "100mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma", "Cipla"] },
  { name: "Glibenclamide", aliases: ["Glyburide", "Daonil", "Glynase", "Euglucon", "Semi-Daonil", "Glucoryl", "Glibesyn"], category: "Sulfonylurea / Antidiabetic", dosageForms: ["Tablet"], commonDoses: ["2.5mg", "5mg"], unit: "mg", schedule: "H", manufacturer: ["Sanofi", "USV", "Cipla"] },
  { name: "Glipizide", aliases: ["Glucotrol", "Minidiab", "Glitisol", "Glipid", "Minodiab", "Glibenese"], category: "Sulfonylurea / Antidiabetic", dosageForms: ["Tablet", "Extended Release"], commonDoses: ["5mg", "10mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma"] },
  { name: "Gliclazide", aliases: ["Diamicron", "Glizid", "Gliclazide MR", "Glizid MR", "Reclide", "Diaglip", "Glycoran", "Idicron"], category: "Sulfonylurea / Antidiabetic", dosageForms: ["Tablet", "Modified Release Tablet"], commonDoses: ["40mg", "80mg"], unit: "mg", schedule: "H", manufacturer: ["Servier", "Sun Pharma", "Torrent"] },
  { name: "Sitagliptin", aliases: ["Januvia", "Istavel", "Jalra", "Zita", "Sitalib", "Sitaglo", "Gliptagliptin", "Sitaxa", "Sitglip"], category: "DPP-4 Inhibitor / Antidiabetic", dosageForms: ["Tablet"], commonDoses: ["25mg", "50mg", "100mg"], unit: "mg", schedule: "H", manufacturer: ["MSD", "Sun Pharma", "Cipla"] },
  { name: "Dapagliflozin", aliases: ["Forxiga", "Dapa", "Oxra", "Dagla", "Dapafin", "Synjardy", "Dapaglu", "Dapa One"], category: "SGLT2 Inhibitor / Antidiabetic", dosageForms: ["Tablet"], commonDoses: ["5mg", "10mg"], unit: "mg", schedule: "H", manufacturer: ["AstraZeneca", "Cipla", "Sun Pharma"] },
  { name: "Empagliflozin", aliases: ["Jardiance", "Empa", "Empaglu", "Empaglif", "Empacare", "Embonate"], category: "SGLT2 Inhibitor / Antidiabetic", dosageForms: ["Tablet"], commonDoses: ["10mg", "25mg"], unit: "mg", schedule: "H", manufacturer: ["Boehringer", "Eli Lilly"] },
  { name: "Rosuvastatin", aliases: ["Crestor", "Rosuvas", "Rosuvast", "Rozavel", "Rova", "Rosucor", "Rosustat", "Zyrova", "Razel"], category: "Statin / Lipid Lowering", dosageForms: ["Tablet"], commonDoses: ["5mg", "10mg", "20mg", "40mg"], unit: "mg", schedule: "H", manufacturer: ["AstraZeneca", "Cipla", "Sun Pharma", "Torrent"] },
  { name: "Simvastatin", aliases: ["Zocor", "Simcard", "Simvotin", "Simlup", "Simlo", "Simvachol", "Vastin", "Ranzine"], category: "Statin / Lipid Lowering", dosageForms: ["Tablet"], commonDoses: ["5mg", "10mg", "20mg", "40mg", "80mg"], unit: "mg", schedule: "H", manufacturer: ["MSD", "Sun Pharma", "Cipla", "Ranbaxy"] },
  { name: "Fenofibrate", aliases: ["Tricor", "Fenolip", "Lipestat", "Fenostat", "Fenomash", "Lipicard", "Supralip", "Fenobrate"], category: "Fibrate / Lipid Lowering", dosageForms: ["Tablet", "Capsule"], commonDoses: ["67mg", "100mg", "145mg", "160mg", "200mg"], unit: "mg", schedule: "H", manufacturer: ["Abbott", "Sun Pharma", "Torrent"] },
  { name: "Clopidogrel", aliases: ["Plavix", "Clopilet", "Deplatt", "Clodrel", "Clopitorva", "Clopia", "Antiplar", "Ceruvin"], category: "Antiplatelet", dosageForms: ["Tablet"], commonDoses: ["75mg", "150mg", "300mg"], unit: "mg", schedule: "H", manufacturer: ["Sanofi", "Sun Pharma", "Torrent", "Cipla"] },
  { name: "Warfarin", aliases: ["Coumadin", "Sofarin", "Warfarin Sodium", "Warf", "Coumadine", "Marfarin"], category: "Anticoagulant", dosageForms: ["Tablet"], commonDoses: ["1mg", "2mg", "2.5mg", "5mg"], unit: "mg", schedule: "H1", manufacturer: ["Bristol Myers", "Sun Pharma"] },
  { name: "Apixaban", aliases: ["Eliquis", "Api", "Apixalin", "Abixaban", "Eliv"], category: "Direct Oral Anticoagulant", dosageForms: ["Tablet"], commonDoses: ["2.5mg", "5mg"], unit: "mg", schedule: "H", manufacturer: ["BMS", "Pfizer"] },
  { name: "Rivaroxaban", aliases: ["Xarelto", "Rivaro", "Rivaxo", "Reveltra", "Vasoka", "Xareto"], category: "Direct Oral Anticoagulant", dosageForms: ["Tablet"], commonDoses: ["2.5mg", "10mg", "15mg", "20mg"], unit: "mg", schedule: "H", manufacturer: ["Bayer", "Cipla", "Sun Pharma"] },
  { name: "Levothyroxine", aliases: ["Thyrox", "Eltroxin", "Thyronorm", "Euthyrox", "Eutrosig", "Levoxyl", "Synthroid", "T4", "Lethox"], category: "Thyroid Hormone", dosageForms: ["Tablet"], commonDoses: ["12.5mcg", "25mcg", "50mcg", "75mcg", "100mcg", "150mcg", "200mcg"], unit: "mcg", schedule: "H", manufacturer: ["Abbott", "GSK", "Sun Pharma", "Merck"] },
  { name: "Carbimazole", aliases: ["Neo Mercazole", "Carbimazol", "Carbimaz", "Thyrozol", "Methimazole"], category: "Antithyroid", dosageForms: ["Tablet"], commonDoses: ["5mg", "10mg", "20mg"], unit: "mg", schedule: "H", manufacturer: ["Abbott", "Sun Pharma"] },
  { name: "Prednisolone", aliases: ["Omnacortil", "Wysolone", "Presolone", "Delcortil", "Predsol", "Prelone", "Deltacortril", "Decorex"], category: "Corticosteroid", dosageForms: ["Tablet", "Syrup", "Eye Drop", "Injection"], commonDoses: ["1mg", "2.5mg", "5mg", "10mg", "20mg", "40mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma", "Cipla"] },
  { name: "Dexamethasone", aliases: ["Dexona", "Decadron", "Dexacort", "Dexa", "Dexade", "Dexa-Cortisyl", "Fortecortin", "Hexadrol"], category: "Corticosteroid", dosageForms: ["Tablet", "Injection", "Eye Drop", "Nasal Drop"], commonDoses: ["0.5mg", "1mg", "4mg", "8mg"], unit: "mg", schedule: "H", manufacturer: ["Sun Pharma", "Cipla", "Organon"] },
  { name: "Budesonide", aliases: ["Pulmicort", "Budecort", "Rhinocort", "Budeflam", "Budamate", "Foracort"], category: "Inhaled Corticosteroid", dosageForms: ["Inhaler", "Nebulizer Solution", "Nasal Spray"], commonDoses: ["100mcg", "200mcg", "400mcg"], unit: "mcg", schedule: "H", manufacturer: ["AstraZeneca", "Cipla", "Sun Pharma"] },
  { name: "Salbutamol", aliases: ["Albuterol", "Asthalin", "Ventolin", "Salbair", "Bronchomax", "Proventil", "Salbu", "Serobid", "Derihaler"], category: "Bronchodilator / SABA", dosageForms: ["Inhaler", "Syrup", "Tablet", "Nebulizer Solution", "Injection"], commonDoses: ["2mg", "4mg", "100mcg"], unit: "mcg", schedule: "OTC", manufacturer: ["Cipla", "GSK", "Sun Pharma"] },
  { name: "Formoterol", aliases: ["Foradil", "Foracort", "Symbicort", "Oxis", "Formatrin", "Forair", "Formonide", "Formota"], category: "Bronchodilator / LABA", dosageForms: ["Inhaler", "Capsule for Inhalation"], commonDoses: ["6mcg", "12mcg"], unit: "mcg", schedule: "H", manufacturer: ["AstraZeneca", "Cipla", "Torrent"] },
  { name: "Montelukast", aliases: ["Singulair", "Montair", "Romilast", "Montas", "Telekast", "Montico", "Lukast", "Ritemed", "Montemac"], category: "Leukotriene Antagonist", dosageForms: ["Tablet", "Chewable Tablet", "Granules"], commonDoses: ["4mg", "5mg", "10mg"], unit: "mg", schedule: "H", manufacturer: ["MSD", "Cipla", "Sun Pharma"] },
  { name: "Theophylline", aliases: ["Theobid", "Theo-24", "Theodur", "Nuelin", "Euphyllin", "Theospan", "Uniphyllin", "Slo-Phyllin"], category: "Bronchodilator / Xanthine", dosageForms: ["Tablet", "Extended Release Tablet", "Injection", "Syrup"], commonDoses: ["100mg", "200mg", "300mg", "400mg"], unit: "mg", schedule: "H", manufacturer: ["Cipla", "Sun Pharma", "Nicholas Piramal"] },
  { name: "Amoxicillin Clavulanate", aliases: ["Augmentin", "Moxclav", "Clavam", "Augpen", "Amoxiclav", "Co Amoxiclav", "Clavamox", "Clavunate", "Coamox", "Combiclav"], category: "Antibiotic / Penicillin + Beta-Lactamase Inhibitor", dosageForms: ["Tablet", "Suspension", "Injection"], commonDoses: ["375mg", "625mg", "1000mg"], unit: "mg", schedule: "H", manufacturer: ["GSK", "Cipla", "Sun Pharma", "Alkem"] },
  { name: "Cefixime", aliases: ["Taxim-O", "Cefix", "Cifex", "Cefspan", "Suprax", "Zifi", "Topcef", "Cefnor", "Cefiximab"], category: "Antibiotic / Cephalosporin", dosageForms: ["Tablet", "Suspension", "Capsule"], commonDoses: ["50mg", "100mg", "200mg", "400mg"], unit: "mg", schedule: "H", manufacturer: ["Alkem", "Sun Pharma", "Cipla", "Torrent"] },
  { name: "Cefpodoxime", aliases: ["Cepodem", "Cefpod", "Vantin", "Cepodemx", "Cepodemxo", "Cefoprox", "Ceforal", "Orelox"], category: "Antibiotic / Cephalosporin", dosageForms: ["Tablet", "Suspension"], commonDoses: ["50mg", "100mg", "200mg"], unit: "mg", schedule: "H", manufacturer: ["Cipla", "Sun Pharma", "Torrent"] },
  { name: "Ceftriaxone", aliases: ["Monocef", "Biotum", "Ceftum", "Extacef", "Oframax", "Sepcen", "Emecef", "Intacef", "Milixim"], category: "Antibiotic / Cephalosporin", dosageForms: ["Injection"], commonDoses: ["250mg", "500mg", "1000mg", "2000mg"], unit: "mg", schedule: "H", manufacturer: ["Roche", "Sun Pharma", "Cipla"] },
  { name: "Nitrofurantoin", aliases: ["Macrobid", "Macrodantin", "Furadonin", "Nitrofur", "Nifurantin", "Furadantin"], category: "Urinary Antibiotic", dosageForms: ["Capsule", "Tablet", "Suspension"], commonDoses: ["50mg", "100mg"], unit: "mg", schedule: "H", manufacturer: ["Procter & Gamble", "Sun Pharma"] },
  { name: "Trimethoprim Sulfamethoxazole", aliases: ["Cotrimoxazole", "Bactrim", "Septran", "Trimosul", "Trim", "Co-Trim", "Cotrim", "Sulfotrims", "Bactrimel"], category: "Antibiotic / Sulfonamide", dosageForms: ["Tablet", "Suspension", "Injection"], commonDoses: ["480mg", "960mg"], unit: "mg", schedule: "H", manufacturer: ["Roche", "Cipla", "Sun Pharma"] },
  { name: "Diclofenac", aliases: ["Voveran", "Voltaren", "Diclomol", "Diclogesic", "Diclovolt", "Dynapar", "Difenac", "Inflam", "Movonac", "Reactine"], category: "NSAID", dosageForms: ["Tablet", "Injection", "Gel", "Suppository", "Eye Drop"], commonDoses: ["25mg", "50mg", "75mg", "100mg"], unit: "mg", schedule: "H", manufacturer: ["Novartis", "Sun Pharma", "Cipla", "Torrent"] },
  { name: "Naproxen", aliases: ["Aleve", "Naprosyn", "Anaprox", "Naprelan", "Proxen", "Napro", "Naprox"], category: "NSAID", dosageForms: ["Tablet", "Suspension"], commonDoses: ["250mg", "375mg", "500mg"], unit: "mg", schedule: "H", manufacturer: ["Roche", "Bayer", "Sun Pharma"] },
  { name: "Tramadol", aliases: ["Tramazac", "Tramal", "Ultram", "Tramacip", "Oltram", "Contrathion", "Dolzam", "Trunal", "Ultracet"], category: "Opioid Analgesic", dosageForms: ["Tablet", "Capsule", "Injection", "Extended Release Tablet"], commonDoses: ["50mg", "100mg", "150mg", "200mg"], unit: "mg", schedule: "H", manufacturer: ["Sun Pharma", "Cipla", "USV"] },
  { name: "Codeine", aliases: ["Codeine Phosphate", "Codicept", "Ascoril C", "Phensedyl", "Tossex", "Tuspel"], category: "Opioid Analgesic / Antitussive", dosageForms: ["Tablet", "Syrup", "Injection"], commonDoses: ["15mg", "30mg", "60mg"], unit: "mg", schedule: "H1", manufacturer: ["Macfarlan Smith", "Sun Pharma"] },
  { name: "Morphine", aliases: ["MS Contin", "Morphgesic", "Sevredol", "Oramorph", "MST Continus", "Kapanol", "Morphinate"], category: "Opioid Analgesic", dosageForms: ["Tablet", "Injection", "Oral Solution"], commonDoses: ["5mg", "10mg", "15mg", "20mg", "30mg", "60mg"], unit: "mg", schedule: "X", manufacturer: ["Sun Pharma", "Neon Labs"] },
  { name: "Alprazolam", aliases: ["Xanax", "Alprax", "Alprocontin", "Alzolam", "Pacyl", "Alp", "Restyl", "Tranax", "Niravam", "Zolax"], category: "Benzodiazepine / Anxiolytic", dosageForms: ["Tablet"], commonDoses: ["0.25mg", "0.5mg", "1mg", "2mg"], unit: "mg", schedule: "H1", manufacturer: ["Pfizer", "Sun Pharma", "Torrent"] },
  { name: "Diazepam", aliases: ["Valium", "Calmpose", "Ditran", "Depaz", "Lembrol", "Diazemuls", "Paxum", "Stesolid", "Doval"], category: "Benzodiazepine / Anxiolytic", dosageForms: ["Tablet", "Injection", "Rectal Gel", "Syrup"], commonDoses: ["2mg", "5mg", "10mg"], unit: "mg", schedule: "H1", manufacturer: ["Roche", "Sun Pharma", "Cipla"] },
  { name: "Clonazepam", aliases: ["Klonopin", "Rivotril", "Petril", "Clonotril", "Klonex", "Lonazep", "Clonapax", "Clonafit"], category: "Benzodiazepine / Anticonvulsant", dosageForms: ["Tablet", "Wafer", "Injection"], commonDoses: ["0.25mg", "0.5mg", "1mg", "2mg"], unit: "mg", schedule: "H1", manufacturer: ["Roche", "Sun Pharma", "Torrent"] },
  { name: "Zolpidem", aliases: ["Ambien", "Stilnox", "Zolfresh", "Nitrest", "Zonadin", "Sove", "Zolpid", "Nocte", "Hypnomed"], category: "Non-Benzodiazepine Hypnotic", dosageForms: ["Tablet"], commonDoses: ["5mg", "10mg"], unit: "mg", schedule: "H1", manufacturer: ["Sanofi", "Sun Pharma", "Cipla"] },
  { name: "Sertraline", aliases: ["Zoloft", "Serlift", "Serenata", "Daxid", "Sertima", "Serta", "Sertralin", "Lustral", "Asentra"], category: "SSRI / Antidepressant", dosageForms: ["Tablet", "Capsule", "Oral Solution"], commonDoses: ["25mg", "50mg", "100mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma", "Cipla"] },
  { name: "Fluoxetine", aliases: ["Prozac", "Fludac", "Flunil", "Fluoxet", "Fluvoxin", "Flusol", "Depezac", "Fluoxine", "Fluoxac"], category: "SSRI / Antidepressant", dosageForms: ["Capsule", "Tablet", "Oral Solution"], commonDoses: ["10mg", "20mg", "40mg", "60mg"], unit: "mg", schedule: "H", manufacturer: ["Eli Lilly", "Sun Pharma", "Torrent"] },
  { name: "Escitalopram", aliases: ["Lexapro", "Nexito", "Stalopam", "S-Citadep", "Cipralex", "Feliz S", "Esctalprom", "Ezopam", "Espram"], category: "SSRI / Antidepressant", dosageForms: ["Tablet"], commonDoses: ["5mg", "10mg", "20mg"], unit: "mg", schedule: "H", manufacturer: ["Lundbeck", "Sun Pharma", "Cipla"] },
  { name: "Amitriptyline", aliases: ["Elavil", "Tryptomer", "Saroten", "Amitone", "Trofanil", "Redomex", "Endep", "Amineurin", "Amitril"], category: "Tricyclic Antidepressant", dosageForms: ["Tablet", "Injection"], commonDoses: ["10mg", "25mg", "50mg", "75mg", "100mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma", "Torrent"] },
  { name: "Olanzapine", aliases: ["Zyprexa", "Oleanz", "Olanzapin", "Olanex", "Lanzap", "Jolanzap", "Ozapin", "Olimelt"], category: "Atypical Antipsychotic", dosageForms: ["Tablet", "Wafer", "Injection"], commonDoses: ["2.5mg", "5mg", "7.5mg", "10mg", "15mg", "20mg"], unit: "mg", schedule: "H", manufacturer: ["Eli Lilly", "Sun Pharma", "Torrent"] },
  { name: "Risperidone", aliases: ["Risperdal", "Sizodon", "Risperidone", "Rispex", "Rispolept", "Rozidal", "Risdone", "Belivon", "Risperin"], category: "Atypical Antipsychotic", dosageForms: ["Tablet", "Oral Solution", "Injection"], commonDoses: ["0.5mg", "1mg", "2mg", "3mg", "4mg", "6mg"], unit: "mg", schedule: "H", manufacturer: ["Janssen", "Sun Pharma", "Torrent"] },
  { name: "Quetiapine", aliases: ["Seroquel", "Qutan", "Qutipin", "Quetiapina", "Atrolak", "Quetirel", "Q-Mind", "Queryline"], category: "Atypical Antipsychotic", dosageForms: ["Tablet", "Extended Release Tablet"], commonDoses: ["25mg", "50mg", "100mg", "200mg", "300mg", "400mg"], unit: "mg", schedule: "H", manufacturer: ["AstraZeneca", "Sun Pharma", "Torrent"] },
  { name: "Phenytoin", aliases: ["Dilantin", "Eptoin", "Epanutin", "Phenytex", "Phenytek", "Dilantin Kapseals"], category: "Antiepileptic / Anticonvulsant", dosageForms: ["Capsule", "Tablet", "Injection", "Suspension"], commonDoses: ["50mg", "100mg", "200mg", "300mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma", "Cipla"] },
  { name: "Carbamazepine", aliases: ["Tegretol", "Mazetol", "Tegretal", "Zen Retard", "Carbatrol", "Epitol", "Carnexiv", "Carbagen"], category: "Antiepileptic", dosageForms: ["Tablet", "Extended Release Tablet", "Syrup", "Injection"], commonDoses: ["100mg", "200mg", "400mg"], unit: "mg", schedule: "H", manufacturer: ["Novartis", "Sun Pharma", "Torrent"] },
  { name: "Valproate", aliases: ["Valparin", "Depakote", "Epilim", "Valproic Acid", "Valproate Sodium", "Valnir", "Encorate", "Depakene", "Convulex"], category: "Antiepileptic / Mood Stabilizer", dosageForms: ["Tablet", "Extended Release Tablet", "Syrup", "Injection"], commonDoses: ["200mg", "300mg", "500mg", "1000mg"], unit: "mg", schedule: "H", manufacturer: ["Abbott", "Sun Pharma", "Torrent"] },
  { name: "Lamotrigine", aliases: ["Lamictal", "Lamez", "Epitec", "Lametec", "Lamitor", "Lamotrin", "Lamotrigina"], category: "Antiepileptic", dosageForms: ["Tablet", "Dispersible Tablet"], commonDoses: ["25mg", "50mg", "100mg", "200mg"], unit: "mg", schedule: "H", manufacturer: ["GSK", "Sun Pharma", "Cipla"] },
  { name: "Levetiracetam", aliases: ["Keppra", "Levipil", "Evilex", "Levroxa", "Levetra", "Levace", "Leveron", "Elepsia"], category: "Antiepileptic", dosageForms: ["Tablet", "Extended Release Tablet", "Injection", "Oral Solution"], commonDoses: ["250mg", "500mg", "750mg", "1000mg"], unit: "mg", schedule: "H", manufacturer: ["UCB Pharma", "Sun Pharma", "Cipla"] },
  { name: "Gabapentin", aliases: ["Neurontin", "Gabantin", "Gabapin", "Gabatop", "Gabin", "Gaba", "Neurentin", "Gabamax", "Gabatol"], category: "Anticonvulsant / Neuropathic Pain", dosageForms: ["Capsule", "Tablet"], commonDoses: ["100mg", "300mg", "400mg", "600mg", "800mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma", "Intas"] },
  { name: "Pregabalin", aliases: ["Lyrica", "Pregalin", "Gabapin NT", "Pregeb", "Maxgalin", "Prebel", "Pregalin M", "Pregadoc"], category: "Anticonvulsant / Neuropathic Pain", dosageForms: ["Capsule", "Tablet"], commonDoses: ["25mg", "50mg", "75mg", "100mg", "150mg", "200mg", "225mg", "300mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma", "Cipla"] },
  { name: "Donepezil", aliases: ["Aricept", "Donecept", "Donep", "Alzil", "Donepezilum", "Aricept ODT", "Donesta"], category: "Cholinesterase Inhibitor / Dementia", dosageForms: ["Tablet", "Orally Disintegrating Tablet"], commonDoses: ["5mg", "10mg", "23mg"], unit: "mg", schedule: "H", manufacturer: ["Eisai", "Pfizer", "Sun Pharma"] },
  { name: "Memantine", aliases: ["Namenda", "Alzheimer's Drug", "Memary", "Ebixa", "Axura", "Maruxa", "Memorabel"], category: "NMDA Antagonist / Dementia", dosageForms: ["Tablet", "Oral Solution"], commonDoses: ["5mg", "10mg", "20mg"], unit: "mg", schedule: "H", manufacturer: ["Forest Labs", "Sun Pharma", "Torrent"] },
  { name: "Pantoprazole Sodium", aliases: ["Pantocid", "Pan", "Pantop", "Pantodac", "Pantera", "Protium", "Pantium", "Acipan-D"], category: "Proton Pump Inhibitor", dosageForms: ["Tablet", "Injection"], commonDoses: ["20mg", "40mg"], unit: "mg", schedule: "H", manufacturer: ["Zydus Cadila", "Sun Pharma", "Torrent"] },
  { name: "Ranitidine", aliases: ["Zantac", "Rantac", "Aciloc", "Ranitab", "Ranidom", "Histac", "Zinetac", "R-Loc", "Ranidex"], category: "H2 Receptor Antagonist", dosageForms: ["Tablet", "Syrup", "Injection"], commonDoses: ["75mg", "150mg", "300mg"], unit: "mg", schedule: "OTC", manufacturer: ["GSK", "Cipla", "Sun Pharma"] },
  { name: "Ondansetron", aliases: ["Zofran", "Emeset", "Ondansa", "Emigo", "Nausea", "Emetron", "Plemia", "Zumo", "Octonorm"], category: "Antiemetic / 5-HT3 Antagonist", dosageForms: ["Tablet", "Injection", "Oral Disintegrating Tablet"], commonDoses: ["4mg", "8mg", "16mg"], unit: "mg", schedule: "H", manufacturer: ["GSK", "Cipla", "Sun Pharma"] },
  { name: "Metoclopramide", aliases: ["Reglan", "Perinorm", "Maxolon", "Regpride", "Peri", "Metome", "Nausilen", "Emmerid"], category: "Antiemetic / Prokinetic", dosageForms: ["Tablet", "Syrup", "Injection"], commonDoses: ["5mg", "10mg"], unit: "mg", schedule: "H", manufacturer: ["Sun Pharma", "Cipla", "Pfizer"] },
  { name: "Domperidone", aliases: ["Motilium", "Domstal", "Motinorm", "Vomistop", "Dom", "Domprid", "Emeprid", "Cinet", "Peridys"], category: "Antiemetic / Prokinetic", dosageForms: ["Tablet", "Suspension", "Suppository"], commonDoses: ["5mg", "10mg"], unit: "mg", schedule: "H", manufacturer: ["Janssen", "Sun Pharma", "Cipla"] },
  { name: "Loperamide", aliases: ["Imodium", "Lopamide", "Diarlop", "Eldoper", "Loperamida", "Pepto Bismol Diarrhea"], category: "Antidiarrheal", dosageForms: ["Capsule", "Tablet", "Syrup"], commonDoses: ["2mg"], unit: "mg", schedule: "OTC", manufacturer: ["Janssen", "Sun Pharma"] },
  { name: "Bisacodyl", aliases: ["Dulcolax", "Bisacodyl", "Laxanorm", "Contalax", "Durolax", "Peristaltin", "Agilax"], category: "Stimulant Laxative", dosageForms: ["Tablet", "Suppository", "Enema"], commonDoses: ["5mg", "10mg"], unit: "mg", schedule: "OTC", manufacturer: ["Boehringer", "Sun Pharma"] },
  { name: "Lactulose", aliases: ["Duphalac", "Lactugal", "Portalak", "Lacto-Purge", "Lactulose Solution", "Laevolac", "Acilac"], category: "Osmotic Laxative", dosageForms: ["Syrup", "Solution"], commonDoses: ["3.35g/5ml"], unit: "ml", schedule: "OTC", manufacturer: ["Abbott", "Sun Pharma"] },
  { name: "Calcium Carbonate", aliases: ["Calcit", "Calcimax", "Shelcal", "Tums", "Os-Cal", "Chooz", "Caltrate", "Gemcal", "Oscal"], category: "Calcium Supplement / Antacid", dosageForms: ["Tablet", "Chewable Tablet", "Suspension"], commonDoses: ["500mg", "750mg", "1000mg", "1250mg"], unit: "mg", schedule: "OTC", manufacturer: ["Pfizer", "Sun Pharma", "Elder Pharma"] },
  { name: "Cholecalciferol", aliases: ["Vitamin D3", "Calcirol", "Tayo", "Devit D3", "D-Cal", "Arachitol", "Uprise D3", "D3 60k", "Ossopan D3"], category: "Vitamin D Supplement", dosageForms: ["Capsule", "Tablet", "Injection", "Granules", "Oral Solution"], commonDoses: ["400IU", "800IU", "1000IU", "2000IU", "60000IU"], unit: "IU", schedule: "OTC", manufacturer: ["Sun Pharma", "Abbott", "Cipla"] },
  { name: "Ferrous Sulfate", aliases: ["Fersolate", "Jectofer", "Feosol", "Fer-In-Sol", "FeSO4", "Ferfolic", "Haemofer", "Fergesic"], category: "Iron Supplement", dosageForms: ["Tablet", "Syrup", "Injection"], commonDoses: ["325mg", "200mg"], unit: "mg", schedule: "OTC", manufacturer: ["Sun Pharma", "Cipla", "Piramal"] },
  { name: "Folic Acid", aliases: ["Folate", "Folic", "Folinext", "Folifer", "Folvite", "Foladay", "Folacin", "Folbic"], category: "Vitamin B9 Supplement", dosageForms: ["Tablet", "Injection", "Syrup"], commonDoses: ["0.4mg", "0.8mg", "1mg", "5mg"], unit: "mg", schedule: "OTC", manufacturer: ["Sun Pharma", "Cipla", "Torrent"] },
  { name: "Vitamin B12", aliases: ["Cyanocobalamin", "Methylcobalamin", "Cobamin", "Mecobalamin", "B-12", "Neuroday", "Nurokind", "Methylofort"], category: "Vitamin B12 Supplement", dosageForms: ["Tablet", "Injection", "Oral Solution"], commonDoses: ["500mcg", "1000mcg", "1500mcg"], unit: "mcg", schedule: "OTC", manufacturer: ["Sun Pharma", "Cipla", "Torrent"] },
  { name: "Atenolol Chlorthalidone", aliases: ["Tenoretic", "Aten-Co", "Betacard Plus", "Atecor", "Atenorm Plus"], category: "Beta Blocker + Diuretic Combination", dosageForms: ["Tablet"], commonDoses: ["50/12.5mg", "100/25mg"], unit: "mg", schedule: "H", manufacturer: ["ICI", "Sun Pharma"] },
  { name: "Glimepiride", aliases: ["Amaryl", "Glimer", "Glucoryl M", "Glimp", "Glimy", "Azulix", "Glimisave", "Riomet Glim", "Glucored"], category: "Sulfonylurea / Antidiabetic", dosageForms: ["Tablet"], commonDoses: ["0.5mg", "1mg", "2mg", "3mg", "4mg"], unit: "mg", schedule: "H", manufacturer: ["Sanofi", "Sun Pharma", "USV"] },
  { name: "Acarbose", aliases: ["Glucobay", "Rebose", "Acarboz", "Basen", "Glucor", "Precose"], category: "Alpha Glucosidase Inhibitor / Antidiabetic", dosageForms: ["Tablet"], commonDoses: ["25mg", "50mg", "100mg"], unit: "mg", schedule: "H", manufacturer: ["Bayer", "Sun Pharma"] },
  { name: "Pioglitazone", aliases: ["Actos", "Pioglit", "Windia", "Piozone", "Avandia", "Saroglitazar", "Glizone", "Pioglar"], category: "Thiazolidinedione / Antidiabetic", dosageForms: ["Tablet"], commonDoses: ["7.5mg", "15mg", "30mg", "45mg"], unit: "mg", schedule: "H", manufacturer: ["Takeda", "Sun Pharma", "Cipla"] },
  { name: "Hydroxychloroquine", aliases: ["Plaquenil", "HCQS", "HCQ", "Hydroxychloroquin", "Quinorid", "Immuvax", "Hydroquin"], category: "Antimalarial / Disease Modifying", dosageForms: ["Tablet"], commonDoses: ["200mg", "400mg"], unit: "mg", schedule: "H", manufacturer: ["Sun Pharma", "Ipca", "Cipla"] },
  { name: "Chloroquine", aliases: ["Aralen", "Malarex", "Lariago", "Chloroquin", "Resochin", "Quinaqua", "Delagil"], category: "Antimalarial", dosageForms: ["Tablet", "Syrup", "Injection"], commonDoses: ["150mg", "250mg", "500mg"], unit: "mg", schedule: "H", manufacturer: ["Ipca", "Sun Pharma", "Cipla"] },
  { name: "Artemether Lumefantrine", aliases: ["Coartem", "Lumether", "Riamet", "Coartemether", "Arteref", "Atmet", "Artemol"], category: "Antimalarial Combination", dosageForms: ["Tablet"], commonDoses: ["20/120mg"], unit: "mg", schedule: "H", manufacturer: ["Novartis", "Ipca", "Sun Pharma"] },
  { name: "Ivermectin", aliases: ["Stromectol", "Ivectin", "Mectizan", "Ivermec", "Scabo", "Ivet", "Vermact", "Ivershine"], category: "Antiparasitic", dosageForms: ["Tablet"], commonDoses: ["3mg", "6mg", "12mg"], unit: "mg", schedule: "H", manufacturer: ["Merck", "Sun Pharma", "Cipla"] },
  { name: "Albendazole", aliases: ["Zentel", "Albenza", "Abenda", "Noworm", "Althrocin", "Almox", "Zebend", "Alworm"], category: "Antihelminthic", dosageForms: ["Tablet", "Suspension"], commonDoses: ["200mg", "400mg"], unit: "mg", schedule: "OTC", manufacturer: ["GSK", "Sun Pharma", "Cipla"] },
  { name: "Mebendazole", aliases: ["Vermox", "Mebex", "Wormin", "Mebendazol", "Pantelmin", "Ovex", "Mebdan"], category: "Antihelminthic", dosageForms: ["Tablet", "Suspension"], commonDoses: ["100mg", "500mg"], unit: "mg", schedule: "OTC", manufacturer: ["Janssen", "Sun Pharma"] },
  { name: "Fluconazole", aliases: ["Diflucan", "Flucos", "Zocon", "Forcan", "Fluzole", "Syscan", "Fluconaz", "Zocon Duo"], category: "Antifungal", dosageForms: ["Capsule", "Tablet", "Injection", "Oral Solution"], commonDoses: ["50mg", "100mg", "150mg", "200mg", "400mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma", "Cipla"] },
  { name: "Itraconazole", aliases: ["Sporanox", "Canditral", "Itracan", "Itralent", "Itrol", "Itrosit", "Itrafungol"], category: "Antifungal", dosageForms: ["Capsule", "Oral Solution", "Injection"], commonDoses: ["100mg", "200mg"], unit: "mg", schedule: "H", manufacturer: ["Janssen", "Sun Pharma", "Cipla"] },
  { name: "Terbinafine", aliases: ["Lamisil", "Terbicip", "Terbinafin", "Fungotek", "Terbinaforce", "Zimig", "Terbimax"], category: "Antifungal", dosageForms: ["Tablet", "Cream", "Solution", "Spray"], commonDoses: ["125mg", "250mg"], unit: "mg", schedule: "H", manufacturer: ["Novartis", "Sun Pharma", "Cipla"] },
  { name: "Acyclovir", aliases: ["Zovirax", "Acivir", "Acyclox", "Herpex", "Cyclovir", "Acifar", "Herperax", "Vivorax"], category: "Antiviral", dosageForms: ["Tablet", "Capsule", "Cream", "Injection", "Suspension"], commonDoses: ["200mg", "400mg", "800mg"], unit: "mg", schedule: "H", manufacturer: ["GSK", "Sun Pharma", "Cipla"] },
  { name: "Oseltamivir", aliases: ["Tamiflu", "Fluvir", "Antiflu", "Oselvir", "Viroblock", "Oseltamivirin"], category: "Antiviral / Influenza", dosageForms: ["Capsule", "Oral Suspension"], commonDoses: ["30mg", "45mg", "75mg"], unit: "mg", schedule: "H", manufacturer: ["Roche", "Sun Pharma", "Cipla"] },
  { name: "Tenofovir", aliases: ["Viread", "TDF", "Tenvir", "Tenof", "Tavin", "Ricovir", "Tenofo", "Hepbest"], category: "Antiviral / HIV", dosageForms: ["Tablet"], commonDoses: ["150mg", "200mg", "250mg", "300mg"], unit: "mg", schedule: "H", manufacturer: ["Gilead", "Sun Pharma", "Cipla"] },
  { name: "Lamivudine", aliases: ["Epivir", "3TC", "Lamivir", "Hepitec", "Zeffix", "Lamivu", "Lamivudina"], category: "Antiviral / HIV + HBV", dosageForms: ["Tablet", "Oral Solution"], commonDoses: ["100mg", "150mg", "300mg"], unit: "mg", schedule: "H", manufacturer: ["GSK", "Sun Pharma", "Cipla"] },
  { name: "Efavirenz", aliases: ["Sustiva", "Efavir", "Stocrin", "Efferven", "Viranz", "Avonza", "EFV"], category: "Antiviral / HIV NNRTI", dosageForms: ["Tablet", "Capsule"], commonDoses: ["50mg", "200mg", "600mg"], unit: "mg", schedule: "H", manufacturer: ["Bristol Myers", "Sun Pharma", "Cipla"] },
  { name: "Rifampicin", aliases: ["Rifampin", "Rifacin", "Rifadin", "Rimactane", "Rimpin", "R-Cin", "Rifamycin", "Macox", "Rimactazid"], category: "Antibiotic / Antitubercular", dosageForms: ["Capsule", "Tablet", "Injection", "Syrup"], commonDoses: ["150mg", "300mg", "450mg", "600mg"], unit: "mg", schedule: "H", manufacturer: ["Lupin", "Sun Pharma", "Cipla"] },
  { name: "Isoniazid", aliases: ["INH", "Laniazid", "Nydrazid", "Isocid", "Rimifon", "Hyzyd", "Isonazide"], category: "Antitubercular", dosageForms: ["Tablet", "Injection", "Syrup"], commonDoses: ["50mg", "100mg", "150mg", "300mg"], unit: "mg", schedule: "H", manufacturer: ["Lupin", "Sun Pharma", "Cipla"] },
  { name: "Pyrazinamide", aliases: ["PZA", "Pyrazin", "Rifater", "Pyzide", "Pyranamide", "Tebrazid"], category: "Antitubercular", dosageForms: ["Tablet"], commonDoses: ["500mg", "750mg", "1000mg"], unit: "mg", schedule: "H", manufacturer: ["Lupin", "Sun Pharma", "Cipla"] },
  { name: "Ethambutol", aliases: ["EMB", "Myambutol", "Combutol", "Ebutol", "Servambutol", "Dexambutol", "Ethamide"], category: "Antitubercular", dosageForms: ["Tablet"], commonDoses: ["200mg", "400mg", "600mg", "800mg"], unit: "mg", schedule: "H", manufacturer: ["Lupin", "Sun Pharma", "Cipla"] },
  { name: "Doxorubicin", aliases: ["Adriamycin", "Caelyx", "Myocet", "Doxolem", "Rubex"], category: "Anticancer / Anthracycline", dosageForms: ["Injection"], commonDoses: ["10mg", "20mg", "50mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma", "Cipla"] },
  { name: "Tamoxifen", aliases: ["Nolvadex", "Tamofen", "Tamox", "Onco-Tamox", "Valodex", "Nolvadex D", "Fentamox"], category: "Anticancer / SERM", dosageForms: ["Tablet"], commonDoses: ["10mg", "20mg", "40mg"], unit: "mg", schedule: "H", manufacturer: ["AstraZeneca", "Sun Pharma", "Cipla"] },
  { name: "Letrozole", aliases: ["Femara", "Letoval", "Fempro", "Aromsin", "Letronat", "Letrox", "Letrole"], category: "Anticancer / Aromatase Inhibitor", dosageForms: ["Tablet"], commonDoses: ["2.5mg"], unit: "mg", schedule: "H", manufacturer: ["Novartis", "Sun Pharma", "Cipla"] },
  { name: "Imatinib", aliases: ["Gleevec", "Glivec", "Imatib", "Veenat", "Imanib", "Imate", "Imat", "Imakrebs"], category: "Anticancer / Tyrosine Kinase Inhibitor", dosageForms: ["Tablet", "Capsule"], commonDoses: ["100mg", "400mg"], unit: "mg", schedule: "H", manufacturer: ["Novartis", "Sun Pharma", "Cipla"] },
  { name: "Ondansetron Hydrochloride", aliases: ["Zofran HCl", "Eme-Z", "Emeset Oro", "Emend", "Ondansa Oro"], category: "Antiemetic", dosageForms: ["ODT Tablet", "Injection"], commonDoses: ["4mg", "8mg"], unit: "mg", schedule: "H", manufacturer: ["GSK", "Cipla"] },
  { name: "Digoxin", aliases: ["Lanoxin", "Digosin", "Cardioxin", "Digitek", "Lanoxicaps", "Digitalis", "Lenoxin"], category: "Cardiac Glycoside", dosageForms: ["Tablet", "Injection", "Oral Solution"], commonDoses: ["0.0625mg", "0.125mg", "0.25mg"], unit: "mg", schedule: "H1", manufacturer: ["GSK", "Sun Pharma", "Cipla"] },
  { name: "Bisoprolol", aliases: ["Concor", "Biselect", "Bisocor", "Corbis", "Bisocard", "Cardivas", "Monocord", "Bisolet"], category: "Beta Blocker", dosageForms: ["Tablet"], commonDoses: ["1.25mg", "2.5mg", "5mg", "10mg"], unit: "mg", schedule: "H", manufacturer: ["Merck", "Sun Pharma", "Cipla"] },
  { name: "Carvedilol", aliases: ["Coreg", "Carvil", "Carvidon", "Carvedil", "Dilatrend", "Eucardic", "Carloc", "Carloc CR"], category: "Alpha Beta Blocker", dosageForms: ["Tablet"], commonDoses: ["3.125mg", "6.25mg", "12.5mg", "25mg"], unit: "mg", schedule: "H", manufacturer: ["GSK", "Sun Pharma", "Cipla"] },
  { name: "Valsartan", aliases: ["Diovan", "Valzaar", "Valsac", "Valsart", "Valtec", "Vamchek", "Valsartan HCT"], category: "ARB / Antihypertensive", dosageForms: ["Tablet", "Capsule"], commonDoses: ["40mg", "80mg", "160mg", "320mg"], unit: "mg", schedule: "H", manufacturer: ["Novartis", "Sun Pharma", "Cipla"] },
  { name: "Candesartan", aliases: ["Atacand", "Candesar", "Candes AT", "Cough Free", "Blopress", "Candesteran"], category: "ARB / Antihypertensive", dosageForms: ["Tablet"], commonDoses: ["4mg", "8mg", "16mg", "32mg"], unit: "mg", schedule: "H", manufacturer: ["AstraZeneca", "Sun Pharma", "Cipla"] },
  { name: "Hydrochlorothiazide", aliases: ["HCTZ", "Esidrex", "Microzide", "HydroDiuril", "Saluric", "Oretic"], category: "Thiazide Diuretic", dosageForms: ["Tablet"], commonDoses: ["12.5mg", "25mg", "50mg"], unit: "mg", schedule: "H", manufacturer: ["Merck", "Sun Pharma"] },
  { name: "Alendronate", aliases: ["Fosamax", "Alendronat", "Osteocare", "Osteofos", "Alenat", "Bifosa", "Ostobon", "Alend"], category: "Bisphosphonate", dosageForms: ["Tablet"], commonDoses: ["5mg", "10mg", "35mg", "70mg"], unit: "mg", schedule: "H", manufacturer: ["MSD", "Sun Pharma", "Cipla"] },
  { name: "Risedronate", aliases: ["Actonel", "Risofos", "Risedronic Acid", "Atelvia", "Risedron", "Bonemax"], category: "Bisphosphonate", dosageForms: ["Tablet"], commonDoses: ["5mg", "35mg", "150mg"], unit: "mg", schedule: "H", manufacturer: ["P&G", "Sun Pharma"] },
  { name: "Allopurinol", aliases: ["Zyloprim", "Allurol", "Zyloric", "Allop", "Alopurinol", "Allopurin", "Lopurin", "Zyloporic"], category: "Xanthine Oxidase Inhibitor / Gout", dosageForms: ["Tablet"], commonDoses: ["100mg", "200mg", "300mg"], unit: "mg", schedule: "H", manufacturer: ["GSK", "Sun Pharma", "Cipla"] },
  { name: "Colchicine", aliases: ["Colcrys", "Colchicum", "Colsalide", "Colcichine", "Goutnix", "Apo-Colchicine"], category: "Antigout", dosageForms: ["Tablet"], commonDoses: ["0.5mg", "0.6mg", "1mg"], unit: "mg", schedule: "H", manufacturer: ["Takeda", "Sun Pharma"] },
  { name: "Methotrexate", aliases: ["Rheumatrex", "Trexall", "Methofar", "Mexate", "Methofill", "Abitrexate", "Methofar"], category: "DMARD / Anticancer", dosageForms: ["Tablet", "Injection"], commonDoses: ["2.5mg", "5mg", "10mg", "15mg", "25mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma", "Cipla"] },
  { name: "Sulfasalazine", aliases: ["Azulfidine", "Salazopyrin", "Sulph", "Sulzine", "Symmonds", "Sulfazine"], category: "DMARD / Anti-inflammatory", dosageForms: ["Tablet", "Enema", "Suppository"], commonDoses: ["500mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma"] },
  { name: "Leflunomide", aliases: ["Arava", "Lefno", "Leflunomida", "Lefra", "Fidenas", "Leflunomid"], category: "DMARD", dosageForms: ["Tablet"], commonDoses: ["10mg", "20mg", "100mg"], unit: "mg", schedule: "H", manufacturer: ["Sanofi", "Sun Pharma", "Cipla"] },
  { name: "Insulin Regular", aliases: ["Humulin R", "Actrapid", "Novolin R", "Insugen R", "Wosulin R", "Regular Insulin", "Soluble Insulin"], category: "Short Acting Insulin", dosageForms: ["Injection", "IV Infusion"], commonDoses: ["100IU/ml"], unit: "IU", schedule: "H", manufacturer: ["Novo Nordisk", "Eli Lilly", "Biocon"] },
  { name: "Insulin NPH", aliases: ["Humulin N", "Insulatard", "Novolin N", "Insugen N", "Wosulin N", "Isophane Insulin"], category: "Intermediate Acting Insulin", dosageForms: ["Injection"], commonDoses: ["100IU/ml"], unit: "IU", schedule: "H", manufacturer: ["Novo Nordisk", "Eli Lilly", "Biocon"] },
  { name: "Insulin Glargine", aliases: ["Lantus", "Basalin", "Glaritus", "Toujeo", "Abasaglar", "Basalog", "Glargine"], category: "Long Acting Insulin", dosageForms: ["Injection"], commonDoses: ["100IU/ml"], unit: "IU", schedule: "H", manufacturer: ["Sanofi", "Biocon", "Sun Pharma"] },
  { name: "Oxytocin", aliases: ["Pitocin", "Syntocinon", "Oxytocin Injection", "Pitot", "Uteron", "Labor Inducing"], category: "Uterotonic", dosageForms: ["Injection"], commonDoses: ["5IU", "10IU"], unit: "IU", schedule: "H", manufacturer: ["Novartis", "Sun Pharma"] },
  { name: "Progesterone", aliases: ["Utrogestan", "Prometrium", "Susten", "Lutein", "Progest", "Gestorone", "Naturogest", "Crinone"], category: "Progestogen / Hormone", dosageForms: ["Capsule", "Vaginal Gel", "Injection"], commonDoses: ["100mg", "200mg", "400mg"], unit: "mg", schedule: "H", manufacturer: ["Sun Pharma", "Cipla", "Torrent"] },
  { name: "Clomiphene", aliases: ["Clomid", "Serophene", "Clomifene", "Clutone", "Siphene", "Ovofar", "Fertomid", "Clom"], category: "Ovulation Inducer / SERM", dosageForms: ["Tablet"], commonDoses: ["25mg", "50mg", "100mg"], unit: "mg", schedule: "H", manufacturer: ["MSD", "Sun Pharma", "Cipla"] },
  { name: "Mifepristone", aliases: ["RU-486", "Mifegest", "Abortion Pill", "Mifeprix", "Zacafemyl", "Korlym", "Mifekit"], category: "Antiprogestogen / Abortifacient", dosageForms: ["Tablet"], commonDoses: ["200mg", "600mg"], unit: "mg", schedule: "H1", manufacturer: ["Sun Pharma", "Cipla"] },
  { name: "Misoprostol", aliases: ["Cytotec", "Misoprost", "Misofield", "Miso Pill", "Misoone", "Gastrotec", "Misoclear"], category: "Prostaglandin / Cervical Ripening", dosageForms: ["Tablet", "Vaginal Tablet"], commonDoses: ["100mcg", "200mcg", "400mcg"], unit: "mcg", schedule: "H1", manufacturer: ["Pfizer", "Sun Pharma"] },
  { name: "ORS", aliases: ["Oral Rehydration Salts", "Electrol", "Pedialyte", "Enerlytes", "Electrobion", "Rehydrat", "Normlyte", "Nujab ORS"], category: "Rehydration Solution", dosageForms: ["Powder for Solution", "Ready Solution"], commonDoses: ["1 sachet"], unit: "g", schedule: "OTC", manufacturer: ["Sun Pharma", "Cipla", "UNICEF"] },
  { name: "Zinc Sulfate", aliases: ["Zevit", "Zinco", "Zinvit", "Z-Span", "Zincovit", "Zn Supplement", "Zinc 20", "Dezinc"], category: "Zinc Supplement", dosageForms: ["Tablet", "Syrup", "Capsule"], commonDoses: ["10mg", "20mg", "40mg", "50mg"], unit: "mg", schedule: "OTC", manufacturer: ["Sun Pharma", "Cipla"] },
  { name: "Magnesium Hydroxide", aliases: ["Milk of Magnesia", "Cremaffin", "Laxolac", "Phillips Milk", "Magnesia"], category: "Antacid / Laxative", dosageForms: ["Suspension", "Tablet"], commonDoses: ["400mg/5ml"], unit: "ml", schedule: "OTC", manufacturer: ["Pfizer", "Sun Pharma"] },
  { name: "Sodium Bicarbonate", aliases: ["Baking Soda", "Alkali", "Soda Mint", "NaHCO3", "Nabic", "Cremona", "Sodabicarb"], category: "Antacid / Urinary Alkalinizer", dosageForms: ["Tablet", "Solution", "Injection"], commonDoses: ["300mg", "600mg"], unit: "mg", schedule: "OTC", manufacturer: ["Sun Pharma"] },
  { name: "Diphenhydramine", aliases: ["Benadryl", "Diphen", "Nytol", "Sominex", "Venaday", "Difenhidramina", "Benadril", "Diphenhydra"], category: "Antihistamine / Sedative", dosageForms: ["Tablet", "Capsule", "Syrup", "Injection"], commonDoses: ["12.5mg", "25mg", "50mg"], unit: "mg", schedule: "OTC", manufacturer: ["Pfizer", "Sun Pharma"] },
  { name: "Promethazine", aliases: ["Phenergan", "Phenargan", "Promethazin", "Promthazine", "Avomine", "Atosil", "Prothazin"], category: "Antihistamine / Antiemetic", dosageForms: ["Tablet", "Syrup", "Injection", "Suppository"], commonDoses: ["10mg", "25mg", "50mg"], unit: "mg", schedule: "H", manufacturer: ["Sanofi", "Sun Pharma"] },
  { name: "Loratadine", aliases: ["Claritin", "Clarityn", "Lorfast", "Loratab", "Lorad", "Clarant", "Lorid", "Loratin"], category: "Antihistamine", dosageForms: ["Tablet", "Syrup"], commonDoses: ["5mg", "10mg"], unit: "mg", schedule: "OTC", manufacturer: ["Bayer", "Sun Pharma", "Cipla"] },
  { name: "Fexofenadine", aliases: ["Allegra", "Telfast", "Fexo", "Histafree", "Fexofen", "Fexodine", "Altifex", "Fixal"], category: "Antihistamine", dosageForms: ["Tablet"], commonDoses: ["60mg", "120mg", "180mg"], unit: "mg", schedule: "OTC", manufacturer: ["Sanofi", "Sun Pharma", "Cipla"] },
  { name: "Dextromethorphan", aliases: ["Delsym", "Robitussin DM", "Benylin", "DXM", "Tussin DM", "Pedilin DX", "Alex D"], category: "Antitussive", dosageForms: ["Syrup", "Tablet", "Lozenge"], commonDoses: ["10mg", "15mg", "20mg", "30mg"], unit: "mg", schedule: "OTC", manufacturer: ["Pfizer", "Sun Pharma"] },
  { name: "Guaifenesin", aliases: ["Mucinex", "Robitussin", "Glyceryl Guaiacolate", "Expec", "Ambrodil S", "Alex", "Benadryl Expectorant"], category: "Expectorant / Mucolytic", dosageForms: ["Tablet", "Syrup", "Extended Release Tablet"], commonDoses: ["100mg", "200mg", "400mg", "600mg", "1200mg"], unit: "mg", schedule: "OTC", manufacturer: ["Reckitt Benckiser", "Sun Pharma"] },
  { name: "Ambroxol", aliases: ["Mucosolvan", "Mucaine", "Ambrodil", "Ambrolite", "Muco Clear", "Mucosol", "Ambromucil", "Ambrex"], category: "Mucolytic / Expectorant", dosageForms: ["Tablet", "Syrup", "Injection"], commonDoses: ["15mg", "30mg", "75mg"], unit: "mg", schedule: "OTC", manufacturer: ["Boehringer", "Sun Pharma", "Cipla"] },
  { name: "Bromhexine", aliases: ["Bisolvon", "Brohist", "Bromhexin", "Brosyl", "Broplex", "Bisol", "Bromex", "Brobex"], category: "Mucolytic", dosageForms: ["Tablet", "Syrup", "Injection"], commonDoses: ["4mg", "8mg"], unit: "mg", schedule: "OTC", manufacturer: ["Boehringer", "Sun Pharma"] },
  { name: "N-Acetylcysteine", aliases: ["Mucomyst", "Acetadote", "NAC", "Fluimucil", "Solmux", "Mucolin", "Mucoflex"], category: "Mucolytic / Antidote", dosageForms: ["Tablet", "Effervescent Tablet", "Injection", "Solution"], commonDoses: ["200mg", "600mg"], unit: "mg", schedule: "H", manufacturer: ["Zambon", "Sun Pharma", "Cipla"] },
  { name: "Sucralfate", aliases: ["Carafate", "Sucralox", "Sucral", "Neogast", "Ulcosafe", "Venter", "Sucrate"], category: "Gastroprotective", dosageForms: ["Tablet", "Suspension"], commonDoses: ["500mg", "1000mg"], unit: "mg", schedule: "H", manufacturer: ["Axcan", "Sun Pharma"] },
  { name: "Misoprostol Mifepristone Combination", aliases: ["Mifekit", "Mtp Kit", "Unwanted Kit", "Combipack"], category: "Medical Termination Kit", dosageForms: ["Tablet Combination Pack"], commonDoses: ["200mg + 800mcg"], unit: "mg", schedule: "H1", manufacturer: ["Sun Pharma", "Cipla"] },
  { name: "Drotaverine", aliases: ["No-Spa", "Drotavert", "Droperine", "Spasmoproxyvon", "Droverin", "Nospa"], category: "Antispasmodic", dosageForms: ["Tablet", "Injection"], commonDoses: ["40mg", "80mg"], unit: "mg", schedule: "H", manufacturer: ["Chinoin", "Sun Pharma"] },
  { name: "Dicyclomine", aliases: ["Bentyl", "Mebeverine", "Cyclopam", "Dicyclo", "Dicetel", "Dispan", "Colimex", "Dicyclopam"], category: "Antispasmodic / Anticholinergic", dosageForms: ["Tablet", "Syrup", "Injection"], commonDoses: ["10mg", "20mg"], unit: "mg", schedule: "H", manufacturer: ["Sun Pharma", "Cipla", "Abbott"] },
  { name: "Melatonin", aliases: ["Circadin", "Slenyto", "Renamele", "Meloset", "Melatrol", "Mel-3", "Sleepformula"], category: "Sleep Hormone / Circadian Rhythm", dosageForms: ["Tablet", "Capsule"], commonDoses: ["0.5mg", "1mg", "3mg", "5mg", "10mg"], unit: "mg", schedule: "OTC", manufacturer: ["Sun Pharma", "Cipla"] },
  { name: "Vitamin C", aliases: ["Ascorbic Acid", "Celin", "Vitcee", "Limcee", "VitC", "Emergen-C", "Ascoril", "Ester-C"], category: "Vitamin C Supplement / Antioxidant", dosageForms: ["Tablet", "Effervescent Tablet", "Chewable Tablet", "Injection"], commonDoses: ["100mg", "250mg", "500mg", "1000mg"], unit: "mg", schedule: "OTC", manufacturer: ["Cipla", "Sun Pharma"] },
  { name: "Vitamin E", aliases: ["Tocopherol", "Evion", "Vitamin E Capsule", "Aqueous Vitamin E", "Enat 400", "Evion 400"], category: "Vitamin E Supplement / Antioxidant", dosageForms: ["Capsule", "Tablet", "Injection"], commonDoses: ["100IU", "200IU", "400IU", "600IU"], unit: "IU", schedule: "OTC", manufacturer: ["Merck", "Sun Pharma"] },
  { name: "Vitamin A", aliases: ["Retinol", "Akovit", "Aquasol A", "Vitamin A Palmitate", "Oleovitamin A"], category: "Vitamin A Supplement", dosageForms: ["Capsule", "Injection", "Oral Solution"], commonDoses: ["5000IU", "10000IU", "50000IU"], unit: "IU", schedule: "OTC", manufacturer: ["Sun Pharma", "Cipla"] },
  { name: "Multivitamin", aliases: ["Revital", "Supradyn", "Centrum", "Becosules", "Zincovit", "Livogen Total", "Polybion", "A to Z Tablet"], category: "Multivitamin Supplement", dosageForms: ["Tablet", "Capsule", "Syrup"], commonDoses: ["1 tablet"], unit: "g", schedule: "OTC", manufacturer: ["GSK", "Pfizer", "Sun Pharma", "Abbott"] },
  { name: "Erythropoietin", aliases: ["EPO", "Epoetin Alfa", "Erythrop", "Epofit", "Procrit", "Epogen", "Erypo", "Cresp"], category: "Erythropoiesis Stimulating Agent", dosageForms: ["Injection"], commonDoses: ["2000IU", "4000IU", "10000IU"], unit: "IU", schedule: "H", manufacturer: ["Janssen", "Sun Pharma", "Wockhardt"] },
  { name: "Filgrastim", aliases: ["Neupogen", "Grafeel", "Neukine", "Zarzio", "Zarxio", "Nivestym"], category: "G-CSF / Colony Stimulating Factor", dosageForms: ["Injection"], commonDoses: ["150mcg", "300mcg", "480mcg"], unit: "mcg", schedule: "H", manufacturer: ["Amgen", "Sun Pharma", "Cipla"] },
  { name: "Heparin", aliases: ["Hep Flush", "Monoparin", "Calciparine", "Multiparin", "Neoparin", "UFH", "Unfractionated Heparin"], category: "Anticoagulant", dosageForms: ["Injection"], commonDoses: ["1000IU/ml", "5000IU/ml", "10000IU/ml", "25000IU/ml"], unit: "IU", schedule: "H", manufacturer: ["Leo Pharma", "Sun Pharma"] },
  { name: "Enoxaparin", aliases: ["Lovenox", "Clexane", "Enoxarin", "Enclex", "Enoxaparina", "Thrombo Injekt", "Axeparin"], category: "LMWH Anticoagulant", dosageForms: ["Injection"], commonDoses: ["20mg", "40mg", "60mg", "80mg", "100mg"], unit: "mg", schedule: "H", manufacturer: ["Sanofi", "Sun Pharma", "Cipla"] },
  { name: "Ticagrelor", aliases: ["Brilinta", "Brilique", "Possia", "Ticagrelor", "Brilique"], category: "Antiplatelet / P2Y12 Inhibitor", dosageForms: ["Tablet"], commonDoses: ["60mg", "90mg"], unit: "mg", schedule: "H", manufacturer: ["AstraZeneca"] },
  { name: "Prasugrel", aliases: ["Effient", "Efient", "Prolia", "Prasugrel HCl"], category: "Antiplatelet / P2Y12 Inhibitor", dosageForms: ["Tablet"], commonDoses: ["5mg", "10mg"], unit: "mg", schedule: "H", manufacturer: ["Eli Lilly", "Daiichi Sankyo"] },
  { name: "Ivabradine", aliases: ["Corlentor", "Procoralan", "Ivabrex", "Ivabid", "Ivaheart", "Ivabradina"], category: "If Channel Blocker / Heart Failure", dosageForms: ["Tablet"], commonDoses: ["5mg", "7.5mg"], unit: "mg", schedule: "H", manufacturer: ["Servier", "Sun Pharma"] },
  { name: "Sacubitril Valsartan", aliases: ["Entresto", "Vymada", "Sacubitril", "Angionorm", "Sacuvart"], category: "ARNI / Heart Failure", dosageForms: ["Tablet"], commonDoses: ["24/26mg", "49/51mg", "97/103mg"], unit: "mg", schedule: "H", manufacturer: ["Novartis", "Sun Pharma"] },
  { name: "Etoricoxib", aliases: ["Arcoxia", "Etorica", "Nucoxia", "Etorob", "Torfix", "Etogesic", "Etolyx", "Etos"], category: "COX-2 Inhibitor / NSAID", dosageForms: ["Tablet"], commonDoses: ["30mg", "60mg", "90mg", "120mg"], unit: "mg", schedule: "H", manufacturer: ["MSD", "Sun Pharma", "Cipla"] },
  { name: "Celecoxib", aliases: ["Celebrex", "Celecox", "Celecid", "Cobix", "Celact", "Evance", "Celecaps", "Revibra"], category: "COX-2 Inhibitor / NSAID", dosageForms: ["Capsule"], commonDoses: ["100mg", "200mg", "400mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma", "Cipla"] },
  { name: "Piroxicam", aliases: ["Feldene", "Pirox", "Dolonex", "Mobilis", "Brexidol", "Roxidol", "Piroflam"], category: "NSAID / Oxicam", dosageForms: ["Capsule", "Tablet", "Gel", "Injection", "Suppository"], commonDoses: ["10mg", "20mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma"] },
  { name: "Ketorolac", aliases: ["Toradol", "Ketanov", "Ketorol", "Ketofan", "Ketobel", "Keto Inject", "Analgin"], category: "NSAID / Analgesic", dosageForms: ["Tablet", "Injection", "Eye Drop", "Nasal Spray"], commonDoses: ["10mg", "30mg"], unit: "mg", schedule: "H", manufacturer: ["Roche", "Sun Pharma", "Cipla"] },
  { name: "Dexamethasone Sodium Phosphate", aliases: ["Decadron Injection", "Dexona Injection", "Dexa IV", "Dexamethasone Phosphate"], category: "Corticosteroid Injection", dosageForms: ["Injection"], commonDoses: ["4mg/ml", "8mg/ml"], unit: "mg", schedule: "H", manufacturer: ["Sun Pharma", "Cipla"] },
  { name: "Hydrocortisone", aliases: ["Cortef", "Efcortesol", "Hydrocort", "Solu-Cortef", "Hydrocortisol", "Cortisol"], category: "Corticosteroid", dosageForms: ["Tablet", "Injection", "Cream", "Ointment"], commonDoses: ["5mg", "10mg", "20mg", "100mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma"] },
  { name: "Betamethasone", aliases: ["Betnesol", "Celestone", "Betaderm", "Betacort", "Betamax", "Beclovent", "Betneval"], category: "Corticosteroid", dosageForms: ["Tablet", "Injection", "Cream", "Lotion", "Eye Drop"], commonDoses: ["0.5mg", "1mg"], unit: "mg", schedule: "H", manufacturer: ["GSK", "Sun Pharma", "Cipla"] },
  { name: "Methylprednisolone", aliases: ["Medrol", "Solu-Medrol", "Meprednisolone", "Methpred", "Medpred", "Depo Medrol", "Methylpred"], category: "Corticosteroid", dosageForms: ["Tablet", "Injection"], commonDoses: ["4mg", "8mg", "16mg", "32mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma"] },
  { name: "Epinephrine", aliases: ["Adrenaline", "EpiPen", "Adrenalin", "Epinephrin", "Emergency Pen", "Jext"], category: "Sympathomimetic / Emergency", dosageForms: ["Injection", "Auto-Injector", "Inhaler"], commonDoses: ["0.1mg", "0.3mg", "0.5mg", "1mg"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma"] },
  { name: "Atropine", aliases: ["AtroPen", "Atropine Sulfate", "Atropen", "Atropin", "Atropt", "Minims Atropine"], category: "Anticholinergic", dosageForms: ["Injection", "Eye Drop", "Tablet"], commonDoses: ["0.4mg", "0.6mg", "1mg"], unit: "mg", schedule: "H", manufacturer: ["Sun Pharma", "Cipla"] },
  { name: "Naloxone", aliases: ["Narcan", "Evzio", "Nalox", "Prefilled Naloxone", "Opioid Antidote"], category: "Opioid Antagonist / Antidote", dosageForms: ["Injection", "Nasal Spray"], commonDoses: ["0.4mg/ml", "2mg/2ml"], unit: "mg", schedule: "H", manufacturer: ["Pfizer", "Sun Pharma"] },
  { name: "Flumazenil", aliases: ["Romazicon", "Anexate", "Flumazepil", "Lantanyl"], category: "Benzodiazepine Antagonist / Antidote", dosageForms: ["Injection"], commonDoses: ["0.1mg/ml"], unit: "mg", schedule: "H", manufacturer: ["Roche", "Sun Pharma"] },
  { name: "Activated Charcoal", aliases: ["Actidose", "CharcoAid", "Insta-Char", "Activated Carbon", "Norit", "Medicinal Charcoal"], category: "Adsorbent / Antidote", dosageForms: ["Suspension", "Tablet", "Capsule"], commonDoses: ["25g", "50g"], unit: "g", schedule: "H", manufacturer: ["Requa", "Sun Pharma"] },
  { name: "Magnesium Sulfate", aliases: ["Epsom Salt", "MgSO4", "Mag Sulfate", "Magnesium Sulphate Injection", "Eclampsia Injection"], category: "Anticonvulsant / Electrolyte", dosageForms: ["Injection", "Oral Solution"], commonDoses: ["500mg/ml", "2g/10ml"], unit: "g", schedule: "H", manufacturer: ["Sun Pharma", "Cipla"] },
  { name: "Potassium Chloride", aliases: ["KCl", "Klotrix", "Kay Cee L", "K-Dur", "Slow K", "Sando-K", "Kaon-Cl"], category: "Electrolyte Supplement", dosageForms: ["Tablet", "Injection", "Solution"], commonDoses: ["600mg", "750mg"], unit: "mg", schedule: "H", manufacturer: ["Sun Pharma", "Cipla"] },
  { name: "Sodium Chloride", aliases: ["Normal Saline", "NaCl", "NS", "Saline", "0.9% NaCl", "Isotonic Saline", "PhysiologicalSaline"], category: "IV Fluid / Electrolyte", dosageForms: ["IV Solution", "Nasal Drop", "Eye Drop"], commonDoses: ["0.9%", "0.45%", "3%"], unit: "ml", schedule: "H", manufacturer: ["Baxter", "Sun Pharma"] },
  { name: "Glucose", aliases: ["Dextrose", "D5W", "D50", "Glucose IV", "10% Glucose", "25% Glucose", "50% Glucose", "Dextrose Saline"], category: "IV Fluid / Caloric", dosageForms: ["IV Solution"], commonDoses: ["5%", "10%", "25%", "50%"], unit: "ml", schedule: "H", manufacturer: ["Baxter", "Sun Pharma"] },
  { name: "Ringer's Lactate", aliases: ["Lactated Ringer", "Hartmann Solution", "Ringer Lactate", "RL Solution", "Compound Sodium Lactate"], category: "IV Fluid", dosageForms: ["IV Solution"], commonDoses: ["500ml", "1000ml"], unit: "ml", schedule: "H", manufacturer: ["Baxter", "Sun Pharma"] },
  { name: "Pantoprazole Domperidone", aliases: ["Pan D", "Pantodac DSR", "Pankreoflat D", "Nexpro D", "Raciper D"], category: "PPI + Prokinetic Combination", dosageForms: ["Capsule", "Tablet"], commonDoses: ["40/10mg", "40/30mg"], unit: "mg", schedule: "H", manufacturer: ["Sun Pharma", "Zydus", "Torrent"] },
  { name: "Amoxicillin Cloxacillin", aliases: ["Cloxacillin", "Amoxclox", "Clox", "Cloxacillin Sodium"], category: "Antibiotic Combination", dosageForms: ["Capsule", "Suspension", "Injection"], commonDoses: ["250/250mg", "500/250mg"], unit: "mg", schedule: "H", manufacturer: ["Cipla", "Sun Pharma"] },
  { name: "Vitamin D Calcium", aliases: ["Gemcal", "Calcimax Forte", "Ossopan D3", "Shelcal HD", "OstocalD", "CalcRich D3"], category: "Calcium Vitamin D Combination", dosageForms: ["Tablet", "Chewable Tablet"], commonDoses: ["500mg/200IU", "1000mg/400IU"], unit: "mg", schedule: "OTC", manufacturer: ["Pfizer", "Sun Pharma", "Elder Pharma"] },
  { name: "Paracetamol Caffeine", aliases: ["Saridon", "Paracafe", "Caffenol", "Excedrin", "Combigesic"], category: "Analgesic Combination", dosageForms: ["Tablet"], commonDoses: ["500/65mg"], unit: "mg", schedule: "OTC", manufacturer: ["Bayer", "Sun Pharma"] },
  { name: "Epirus Edematis Cream", aliases: ["Saridon", "Paracafe", "Caffenol", "Excedrin", "Combigesic"], category: "Analgesic Combination", dosageForms: ["Tablet"], commonDoses: ["500/65mg"], unit: "mg", schedule: "OTC", manufacturer: ["Bayer", "Sun Pharma"] },
  { name: "Diclofenac Paracetamol", aliases: ["Voveran Plus", "Diclomol P", "Combiflam Plus", "Diclofen Paracetamol"], category: "NSAID + Analgesic Combination", dosageForms: ["Tablet"], commonDoses: ["50/500mg"], unit: "mg", schedule: "H", manufacturer: ["Novartis", "Sun Pharma", "Cipla"] }
];

export const DRUG_CATEGORIES = [
  "Analgesic / Antipyretic",
  "NSAID / Analgesic",
  "Antibiotic / Penicillin",
  "Antidiabetic / Biguanide",
  "Lipid Lowering / Statin",
  "Antiplatelet / Analgesic",
  "Antihistamine",
  "Antibiotic / Macrolide",
  "Proton Pump Inhibitor",
  "Calcium Channel Blocker",
  "ARB / Antihypertensive",
  "ACE Inhibitor",
  "Beta Blocker",
  "Loop Diuretic",
  "Sulfonylurea / Antidiabetic",
  "DPP-4 Inhibitor / Antidiabetic",
  "SGLT2 Inhibitor / Antidiabetic",
  "Thyroid Hormone",
  "Corticosteroid",
  "Inhaled Corticosteroid",
  "Bronchodilator / SABA",
  "Antibiotic / Fluoroquinolone",
  "Antibiotic / Cephalosporin",
  "Antifungal",
  "Antiviral",
  "Antitubercular",
  "Antiparasitic",
  "Antiepileptic",
  "Antipsychotic",
  "Antidepressant / SSRI",
  "Anxiolytic / Benzodiazepine",
  "Opioid Analgesic",
  "Cardiac Glycoside",
  "Anticoagulant",
  "Anticancer",
  "Hormone / Reproductive",
  "Electrolyte Supplement",
  "IV Fluid",
  "Vitamin / Supplement",
  "Antispasmodic",
  "Antiemetic",
  "Mucolytic / Expectorant",
  "Antidiarrheal",
  "Laxative",
  "Gastroprotective",
  "Rehydration",
  "Antidote / Emergency"
];

export const DOSAGE_UNITS = ["mg", "mcg", "g", "ml", "IU", "%", "mEq", "mmol"];

export const SCHEDULE_INFO = {
  "OTC": { label: "Over The Counter", color: "#10b981", description: "Available without prescription" },
  "H":   { label: "Schedule H", color: "#f59e0b", description: "Requires valid medical prescription" },
  "H1":  { label: "Schedule H1", color: "#ef4444", description: "Requires special prescription with additional documentation" },
  "X":   { label: "Schedule X", color: "#7c3aed", description: "Narcotic / Controlled substance — strictly regulated" },
  "G":   { label: "Schedule G", color: "#06b6d4", description: "For use under medical supervision only" }
};

export function buildSearchIndex(dataset) {
  const index = new Map();
  for (const drug of dataset) {
    const allNames = [drug.name, ...(drug.aliases || [])];
    for (const alias of allNames) {
      const key = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(drug);
    }
  }
  return index;
}

export function fuzzySearchDrugs(query, dataset, threshold = 0.45) {
  if (!query || query.length < 3) return [];
  const q = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  const results = [];
  const seen = new Set();

  for (const drug of dataset) {
    const allNames = [drug.name, ...(drug.aliases || [])];
    let bestScore = 0;

    for (const alias of allNames) {
      const a = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      const score = computeSimilarity(q, a);
      if (score > bestScore) bestScore = score;
      if (a.includes(q) || q.includes(a)) bestScore = Math.max(bestScore, 0.85);
    }

    if (bestScore >= threshold && !seen.has(drug.name)) {
      seen.add(drug.name);
      results.push({ drug, score: bestScore });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

function computeSimilarity(a, b) {
  if (a === b) return 1.0;
  if (!a.length || !b.length) return 0.0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const editDist = levenshtein(shorter, longer);
  return (longer.length - editDist) / longer.length;
}

function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export default INDIAN_DRUG_DATASET;