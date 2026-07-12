import urllib.request
import json
import os

def fetch_diseases(term):
    url = f"https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms={term}&maxList=500"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        response = urllib.request.urlopen(req)
        data = json.loads(response.read().decode('utf-8'))
        return data[3] if len(data) > 3 else []
    except Exception as e:
        print(f"Error fetching {term}: {e}")
        return []

brain_results = fetch_diseases("brain")
digestive_results = fetch_diseases("digestive")

all_results = brain_results + digestive_results
formatted_data = []
seen = set()

for row in all_results:
    if len(row) > 1:
        name = row[1]
        if name not in seen:
            seen.add(name)
            formatted_data.append({
                "english": name,
                "synonyms": []
            })

out_dir = os.path.join(os.path.dirname(__file__), "data", "scratch")
os.makedirs(out_dir, exist_ok=True)
out_file = os.path.join(out_dir, "neuro_real.json")

# Limit to 500 if that was the strict requirement, or keep all
# The prompt says "fetches the first 500 neurological and digestive diseases", meaning up to 500 of each, or 500 total. We'll save all fetched.
with open(out_file, "w", encoding='utf-8') as f:
    json.dump(formatted_data, f, indent=4)

print(f"Successfully saved {len(formatted_data)} diseases to {out_file}")
