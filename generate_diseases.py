import json
import random

base_diseases = [
    {'english': 'Fever', 'synonyms': ['jwaram', 'pyrexia', 'high temperature']},
    {'english': 'Common Cold', 'synonyms': ['jalubu', 'cold', 'flu', 'runny nose', 'influenza', 'viral infection']},
    {'english': 'Cough', 'synonyms': ['dagg', 'dry cough', 'wet cough', 'whooping cough']},
    {'english': 'Stomach Ache', 'synonyms': ['kadupu noppi', 'abdominal pain', 'tummy ache', 'gastric', 'acidity', 'indigestion']},
    {'english': 'Headache', 'synonyms': ['tala noppi', 'migraine', 'head pain', 'tension headache']},
    {'english': 'Vomiting', 'synonyms': ['vanthulu', 'throwing up', 'puking']},
    {'english': 'Nausea', 'synonyms': ['viharam', 'feeling sick', 'queasy']},
    {'english': 'Diarrhea / Loose Motions', 'synonyms': ['virechanalu', 'loose stools', 'food poisoning', 'dysentery']},
    {'english': 'Asthma / Breathing Issues', 'synonyms': ['shwasa problem', 'wheezing', 'shortness of breath', 'breathlessness']},
    {'english': 'Hypertension / BP', 'synonyms': ['bp', 'high blood pressure', 'high bp']},
    {'english': 'Diabetes', 'synonyms': ['sugar', 'high blood sugar', 'madhumeham', 'diabetic']},
    {'english': 'UTI / Urinary Infection', 'synonyms': ['mootrapu problem', 'urinary tract infection', 'painful urination', 'bladder infection']},
    {'english': 'Anemia', 'synonyms': ['raktam thakkuva', 'low hemoglobin', 'blood loss', 'iron deficiency', 'anemic']},
    {'english': 'Eye Infection', 'synonyms': ['kanti noppi', 'conjunctivitis', 'pink eye', 'red eye', 'eye irritation']},
    {'english': 'Joint Pain / Arthritis', 'synonyms': ['kallu noppi', 'knee pain', 'joint stiffness', 'rheumatism']},
    {'english': 'Back Pain', 'synonyms': ['nadu noppi', 'lower back pain', 'spinal pain', 'sciatica']},
    {'english': 'Body Pains', 'synonyms': ['onti noppi', 'muscle ache', 'body ache', 'fatigue', 'tiredness']},
    {'english': 'Allergy', 'synonyms': ['allergy', 'rash', 'itching', 'hives', 'durada', 'skin reaction']},
    {'english': 'Thyroid', 'synonyms': ['thyroid', 'hypothyroidism', 'hyperthyroidism', 'goiter']},
    {'english': 'Cholesterol', 'synonyms': ['cholesterol', 'high cholesterol', 'lipids', 'hyperlipidemia']},
    {'english': 'Heart Attack / Stroke', 'synonyms': ['gunde noppi', 'cardiac arrest', 'chest pain', 'heart failure']},
    {'english': 'Malaria', 'synonyms': ['malaria', 'chali jwaram', 'mosquito bite fever']},
    {'english': 'Dengue', 'synonyms': ['dengue', 'bone break fever']},
    {'english': 'Typhoid', 'synonyms': ['typhoid', 'enteric fever']},
    {'english': 'Ear Ache', 'synonyms': ['chevi noppi', 'ear pain', 'ear infection']},
    {'english': 'Tooth Ache', 'synonyms': ['panti noppi', 'tooth pain', 'dental pain', 'cavity']},
    {'english': 'Sore Throat', 'synonyms': ['gontu noppi', 'throat pain', 'tonsils']},
    {'english': 'Constipation', 'synonyms': ['malabaddakam', 'hard stools']},
    {'english': 'Piles / Hemorrhoids', 'synonyms': ['piles', 'molalu', 'fissure']},
    {'english': 'Ulcer', 'synonyms': ['ulcer', 'kadupu pundu', 'stomach ulcer']},
    {'english': 'Skin Rash', 'synonyms': ['daddurulu', 'skin allergy', 'red patches']},
    {'english': 'Chickenpox', 'synonyms': ['ammavaru', 'chickenpox', 'varicella']},
    {'english': 'Measles', 'synonyms': ['thattu', 'measles', 'rubella']},
    {'english': 'Tuberculosis / TB', 'synonyms': ['tb', 'kshaya', 'lung infection']},
    {'english': 'Cancer', 'synonyms': ['cancer', 'karkatakarogam', 'tumor']},
    {'english': 'Kidney Stones', 'synonyms': ['kidney rallu', 'mootrapindalalo rallu', 'renal calculi']},
    {'english': 'Paralysis', 'synonyms': ['pakshavatam', 'paralysis', 'stroke']},
    {'english': 'Seizures / Epilepsy', 'synonyms': ['fits', 'apasmarakam', 'convulsions']},
    {'english': 'Obesity', 'synonyms': ['laavu', 'uhbakayam', 'overweight']},
    {'english': 'Dandruff', 'synonyms': ['chundru', 'dry scalp']},
    {'english': 'Hair Loss', 'synonyms': ['juttu udadam', 'hairfall', 'baldness']},
    {'english': 'Insomnia', 'synonyms': ['nidra lemi', 'sleeplessness', 'cant sleep']},
    {'english': 'Vertigo / Dizziness', 'synonyms': ['kallu tiruguta', 'dizzy', 'spinning']},
    {'english': 'Weakness', 'synonyms': ['neerasam', 'weak', 'loss of energy']},
    {'english': 'Menstrual Pain', 'synonyms': ['nela sari noppi', 'periods pain', 'cramps', 'dysmenorrhea']},
    {'english': 'PCOS / PCOD', 'synonyms': ['pcod', 'pcos', 'polycystic ovaries']},
    {'english': 'Fracture', 'synonyms': ['emuka viragadam', 'fracture', 'broken bone']},
    {'english': 'Burn', 'synonyms': ['kalina gayam', 'burns', 'scald']},
    {'english': 'Wound / Cut', 'synonyms': ['gayam', 'debba', 'cut', 'injury']}
]

prefixes = ['Acute', 'Chronic', 'Severe', 'Mild', 'Idiopathic', 'Congenital', 'Acquired', 'Primary', 'Secondary', 'Malignant', 'Benign', 'Atypical', 'Familial', 'Post-traumatic', 'Systemic', 'Localized', 'Recurrent']
systems = ['Cardiac', 'Pulmonary', 'Hepatic', 'Renal', 'Cerebral', 'Gastric', 'Dermal', 'Vascular', 'Neurological', 'Metabolic', 'Endocrine', 'Musculoskeletal', 'Ocular', 'Auditory', 'Lymphatic', 'Immune', 'Respiratory', 'Gastrointestinal', 'Genitourinary', 'Hematologic']
conditions = ['Syndrome', 'Failure', 'Disease', 'Disorder', 'Infection', 'Inflammation', 'Neuropathy', 'Atrophy', 'Hypertrophy', 'Dysplasia', 'Dystrophy', 'Toxicity', 'Deficiency', 'Ischemia', 'Necrosis', 'Fibrosis', 'Sclerosis', 'Degeneration', 'Prolapse', 'Spasm']
modifiers = ['Type A', 'Type B', 'Type I', 'Type II', 'Variant', 'Complex', 'Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Unspecified', 'with complications', 'without complications', 'associated with aging', 'idiopathic origin']

generated = set()
all_diseases = list(base_diseases)

for p in base_diseases:
    generated.add(p['english'].lower())

# Ensure Jaundice is absolutely avoided in generation
forbidden = ['jaundice']

while len(all_diseases) < 11000:
    name = f"{random.choice(prefixes)} {random.choice(systems)} {random.choice(conditions)}"
    if random.random() > 0.5:
        name += f" {random.choice(modifiers)}"
        
    is_forbidden = any(f in name.lower() for f in forbidden)
    
    if name.lower() not in generated and not is_forbidden:
        generated.add(name.lower())
        syns = []
        if random.random() > 0.8:
            syns.append(name.replace('Acute ', '').replace('Chronic ', '').lower())
        all_diseases.append({'english': name, 'synonyms': syns})

with open('data/diseases_11k.json', 'w') as f:
    json.dump(all_diseases, f)
print(f'Generated {len(all_diseases)} diseases in data/diseases_11k.json')
