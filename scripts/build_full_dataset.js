import fs from 'fs';
import path from 'path';
import readline from 'readline';

const INPUT_FILE = path.join(process.cwd(), 'data', 'Extensive_A_Z_medicines_dataset_of_India.csv');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'indian_medicine_data.json');

async function processCSV() {
    console.log('[Build] Starting parsing of massive CSV dataset...');
    
    const fileStream = fs.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const records = [];
    let isFirstLine = true;
    let count = 0;

    for await (const line of rl) {
        if (isFirstLine) {
            isFirstLine = false;
            continue;
        }

        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        if (parts.length < 8) continue;

        const id = parts[0]?.replace(/"/g, '') || `id-${count}`;
        const name = parts[1]?.replace(/"/g, '').trim() || '';
        const discontinued = parts[3]?.replace(/"/g, '').trim().toUpperCase() === 'TRUE';
        
        if (discontinued) continue; // Skip discontinued meds to save space

        const manufacturer = parts[4]?.replace(/"/g, '').trim() || '';
        const packSize = parts[6]?.replace(/"/g, '').trim() || '';
        const comp1 = parts[7]?.replace(/"/g, '').trim() || '';
        const comp2 = parts[8]?.replace(/"/g, '').trim() || '';

        // Extract generic name and strength
        let genericName = [];
        let totalStrength = [];
        
        if (comp1) {
            const match1 = comp1.match(/^(.*?)(?:\((.*?)\))?$/);
            if (match1) {
                genericName.push(match1[1].trim());
                if (match1[2]) totalStrength.push(match1[2].trim());
            }
        }
        if (comp2) {
            const match2 = comp2.match(/^(.*?)(?:\((.*?)\))?$/);
            if (match2) {
                genericName.push(match2[1].trim());
                if (match2[2]) totalStrength.push(match2[2].trim());
            }
        }

        const finalGenericName = genericName.join(' + ');
        const finalStrength = totalStrength.join(' + ');

        // Extract form factor from pack size (e.g. "strip of 10 tablets" -> "tablet")
        let dosageForm = '';
        if (packSize.toLowerCase().includes('tablet')) dosageForm = 'tablet';
        else if (packSize.toLowerCase().includes('capsule')) dosageForm = 'capsule';
        else if (packSize.toLowerCase().includes('syrup')) dosageForm = 'syrup';
        else if (packSize.toLowerCase().includes('injection')) dosageForm = 'injection';
        else if (packSize.toLowerCase().includes('cream')) dosageForm = 'cream';
        else if (packSize.toLowerCase().includes('ointment')) dosageForm = 'ointment';
        else if (packSize.toLowerCase().includes('gel')) dosageForm = 'gel';
        else if (packSize.toLowerCase().includes('drops')) dosageForm = 'drops';
        else if (packSize.toLowerCase().includes('suspension')) dosageForm = 'suspension';

        records.push({
            id: `brand-${id}-${count}`, // Append count to guarantee unique primary keys in Dexie
            name,
            genericName: finalGenericName,
            manufacturer,
            strength: finalStrength,
            dosageForm,
            packSize
        });

        count++;
        if (count % 50000 === 0) {
            console.log(`[Build] Processed ${count} records...`);
        }
    }

    console.log(`[Build] Writing ${records.length} valid records to JSON...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(records));
    console.log('[Build] Finished! Generated indian_medicine_data.json');
}

processCSV().catch(console.error);
