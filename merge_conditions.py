import json
import os

# Load original 11k dataset
with open('data/diseases_11k.json', 'r', encoding='utf-8') as f:
    master_list = json.load(f)

# The first 50 are our carefully curated Tinglish terms, keep them at the very top.
curated_base = master_list[:50]
procedural_rest = master_list[50:]

# Load real data from subagents
real_conditions = []
scratch_dir = 'data/scratch'
for file in ['cardio_real.json', 'neuro_real.json', 'infect_real.json']:
    path = os.path.join(scratch_dir, file)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            real_conditions.extend(data)

# Remove exact duplicates (by name) from real conditions
seen = set()
unique_real = []
for c in real_conditions:
    name_lower = c['english'].lower()
    if name_lower not in seen:
        seen.add(name_lower)
        unique_real.append(c)

# Add base conditions to seen so we don't duplicate them
for c in curated_base:
    seen.add(c['english'].lower())

# Filter procedural rest to remove any that clash with real conditions
filtered_procedural = [c for c in procedural_rest if c['english'].lower() not in seen]

# Reassemble: 50 curated + ~1000 real API conditions + remaining procedural to hit 11,000
final_list = curated_base + unique_real
needed = 11000 - len(final_list)

if needed > 0:
    final_list.extend(filtered_procedural[:needed])

with open('data/diseases_11k.json', 'w', encoding='utf-8') as f:
    json.dump(final_list, f)

print(f"Merged {len(unique_real)} REAL ICD-10 conditions. Total dataset size: {len(final_list)}")
