/**
 * ConfirmationScreen.js
 * Intelligent, full-screen UI for grouping medication matches.
 * Features cascading dropdowns (Form -> Strength) and a sticky bottom action bar.
 */

export default class ConfirmationScreen {
    /**
     * @param {Array} matches - Array of matched drug objects from the AI/Database
     * @param {Function} onConfirm - Callback(selectedPayload)
     * @param {Function} onRescan - Callback() to resume camera
     */
    static show(matches, onConfirm, onRescan) {
        // 1. Destroy any existing instances
        const existing = document.getElementById('unified-confirmation-screen');
        if (existing) existing.remove();

        // 2. Intelligent Grouping Algorithm
        const groupedData = this._groupMatches(matches);
        const baseNames = Object.keys(groupedData);
        
        if (baseNames.length === 0) {
            onRescan(); // Failsafe
            return;
        }

        // Initialize state with the first available options
        let currentBase = baseNames[0];
        let currentForms = Object.keys(groupedData[currentBase]);
        let currentForm = currentForms[0];
        let currentStrengths = groupedData[currentBase][currentForm];
        let currentStrength = currentStrengths[0];

        // 3. Construct the Full-Screen UI
        const screen = document.createElement('div');
        screen.id = 'unified-confirmation-screen';
        screen.style.cssText = `
            position: fixed; inset: 0; z-index: 100000;
            background: #0f141e; overflow-y: auto;
            display: flex; flex-direction: column;
            font-family: 'Inter', system-ui, sans-serif;
            opacity: 0; transition: opacity 0.3s ease;
            padding-bottom: 100px; /* Space for sticky bar */
        `;

        screen.innerHTML = `
            <!-- Header -->
            <div style="padding: 40px 20px 20px 20px; text-align: center;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #1e90ff, #0984e3); color: white; display: flex; justify-content: center; align-items: center; font-size: 36px; margin: 0 auto 20px auto; box-shadow: 0 10px 25px rgba(30,144,255,0.4), inset 2px 2px 10px rgba(255,255,255,0.3);">
                    💊
                </div>
                <h1 style="color: white; font-size: 1.8rem; font-weight: 800; margin: 0 0 10px 0;">Verify Medication</h1>
                <p style="color: #a4b0be; font-size: 1rem; margin: 0;">Select the exact form and dosage you are holding.</p>
            </div>

            <!-- Master Claymorphic Card -->
            <div style="margin: 0 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 2px 2px 5px rgba(255,255,255,0.02); backdrop-filter: blur(20px);">
                
                <h2 style="color: #1e90ff; font-size: 1.5rem; font-weight: 800; margin: 0 0 5px 0;">${currentBase}</h2>
                <p style="color: #a4b0be; font-size: 0.9rem; margin: 0 0 25px 0; text-transform: capitalize;">${currentStrengths[0].payload.genericName || 'Unknown Generic'}</p>
                
                <!-- Cascading Dropdowns -->
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    
                    <!-- Form Dropdown -->
                    <div>
                        <label style="color: rgba(255,255,255,0.6); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: block;">1. Form</label>
                        <select id="select-form" style="width: 100%; appearance: none; background: rgba(0,0,0,0.3); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 16px 20px; border-radius: 16px; font-size: 1.1rem; font-weight: 600; outline: none; cursor: pointer; background-image: url('data:image/svg+xml;utf8,<svg fill=\"white\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M7 10l5 5 5-5z\"/></svg>'); background-repeat: no-repeat; background-position: right 15px center;">
                            ${currentForms.map(form => `<option value="${form}">${form}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Strength Dropdown -->
                    <div>
                        <label style="color: rgba(255,255,255,0.6); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: block;">2. Strength / Dosage</label>
                        <select id="select-strength" style="width: 100%; appearance: none; background: rgba(0,0,0,0.3); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 16px 20px; border-radius: 16px; font-size: 1.1rem; font-weight: 600; outline: none; cursor: pointer; background-image: url('data:image/svg+xml;utf8,<svg fill=\"white\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M7 10l5 5 5-5z\"/></svg>'); background-repeat: no-repeat; background-position: right 15px center;">
                            ${currentStrengths.map((s, i) => `<option value="${i}">${s.strength}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Sticky Bottom Action Bar -->
            <div style="position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(15, 20, 30, 0.85); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.05); padding: 20px; padding-bottom: max(20px, env(safe-area-inset-bottom)); box-sizing: border-box; display: flex; gap: 15px;">
                <button id="btn-rescan" style="flex: 1; padding: 18px; border-radius: 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #a4b0be; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: all 0.2s;">
                    ↺ Rescan
                </button>
                <button id="btn-confirm" style="flex: 1.5; padding: 18px; border-radius: 20px; background: linear-gradient(135deg, #2ed573, #2bad5b); border: none; color: white; font-size: 1.1rem; font-weight: bold; cursor: pointer; box-shadow: 0 10px 20px rgba(46, 213, 115, 0.3), inset 2px 2px 5px rgba(255,255,255,0.2);">
                    Confirm & Add ✓
                </button>
            </div>
        `;

        document.body.appendChild(screen);

        // Animate In
        requestAnimationFrame(() => { screen.style.opacity = '1'; });

        // --- Logic Bindings ---
        const formSelect = screen.querySelector('#select-form');
        const strengthSelect = screen.querySelector('#select-strength');

        // Dynamic Cascading Dropdown Logic
        formSelect.addEventListener('change', (e) => {
            currentForm = e.target.value;
            currentStrengths = groupedData[currentBase][currentForm];
            
            // Re-render strength options
            strengthSelect.innerHTML = currentStrengths.map((s, i) => `<option value="${i}">${s.strength}</option>`).join('');
            currentStrength = currentStrengths[0];
        });

        strengthSelect.addEventListener('change', (e) => {
            currentStrength = currentStrengths[parseInt(e.target.value)];
        });

        // --- Action Buttons ---
        screen.querySelector('#btn-confirm').onclick = () => {
            screen.style.opacity = '0';
            setTimeout(() => {
                screen.remove();
                // Return the actual exact payload the user selected
                const finalPayload = currentStrength.payload;
                onConfirm(finalPayload);
            }, 300);
        };

        screen.querySelector('#btn-rescan').onclick = () => {
            screen.style.opacity = '0';
            setTimeout(() => {
                screen.remove();
                onRescan(); // Drops them right back to the camera
            }, 300);
        };
    }

    /**
     * Intelligent Grouping Algorithm
     * Transforms flat array: [ {name: 'Fepanil Infusion', dosage: '1000mg', form: 'Injection'}, ... ]
     * Into grouped object: { "Fepanil": { "Injection": [ {strength: "1000mg", payload: {...}} ] } }
     */
    static _groupMatches(matches) {
        const grouped = {};

        // Ensure we always have an array
        const dataArray = Array.isArray(matches) ? matches : [matches];

        dataArray.forEach(match => {
            // Standardize extracted keys (handle both DB schemas and raw AI outputs)
            const brand = match.brandName || match.name || match.genericName || "Unknown";
            // Strip out common form/dosage words from the base name to keep it clean (e.g., "Fepanil Infusion" -> "Fepanil")
            const baseName = brand.split(' ')[0]; 
            
            const form = match.dosageForm || match.form || "Tablet"; // Default to Tablet if missing
            const strength = match.strength || match.dosageAmount || match.dosage?.rawText || "Standard Dose";

            if (!grouped[baseName]) grouped[baseName] = {};
            if (!grouped[baseName][form]) grouped[baseName][form] = [];

            // Prevent exact duplicates in the dropdown
            const isDuplicate = grouped[baseName][form].some(item => item.strength === strength);
            if (!isDuplicate) {
                grouped[baseName][form].push({
                    strength: strength,
                    payload: match // Keep a reference to the original payload for the DB
                });
            }
        });

        return grouped;
    }
}
