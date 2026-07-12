import urllib.request
import json
import os
import urllib.parse

def fetch_data(term):
    url = f"https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms={urllib.parse.quote(term)}&maxList=500"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
        results = []
        if len(data) >= 4:
            for item in data[3]:
                name = item[1] if len(item) > 1 else ""
                results.append({'english': name, 'synonyms': []})
        return results
    except Exception as e:
        print(f"Error fetching {term}: {e}")
        return []

def main():
    print("Fetching infections...")
    infections = fetch_data("infection")
    print("Fetching endocrine disorders...")
    endocrine = fetch_data("endocrine")
    
    all_diseases = infections + endocrine
    unique_names = set()
    final_list = []
    
    for d in all_diseases:
        if d['english'] and d['english'] not in unique_names:
            unique_names.add(d['english'])
            final_list.append(d)
            
    os.makedirs('data/scratch', exist_ok=True)
    out_path = 'data/scratch/infect_real.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully saved {len(final_list)} unique items to {out_path}")

if __name__ == '__main__':
    main()
