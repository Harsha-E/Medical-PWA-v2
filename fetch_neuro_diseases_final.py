import urllib.request
import json
import os

url = 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=brain&maxList=500'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode('utf-8'))
    
    # Extract the requested fields which are in the 4th element (index 3)
    results = data[3]
    output = []
    for row in results:
        # row[1] contains the name
        output.append({'english': row[1], 'synonyms': []})
        
    os.makedirs('data/scratch', exist_ok=True)
    with open('data/scratch/neuro_real.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
        
    print('Successfully created data/scratch/neuro_real.json with {} entries.'.format(len(output)))
except Exception as e:
    print(f"Error: {e}")
