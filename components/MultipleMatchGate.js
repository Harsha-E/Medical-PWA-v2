/**
 * MultipleMatchGate.js
 * A Premium Claymorphic modal that allows user selection when multiple drug matches are found.
 */

export default class MultipleMatchGate {
    /**
     * Spawns the multiple match selection modal.
     * @param {Array} candidates - Array of resolved drug payloads from FuzzyMatcher
     * @param {Object} originalPayload - The original OCR matchResult payload context
     * @param {Function} onSelect - Callback when user clicks a specific drug
     * @param {Function} onReject - Callback when user clicks "Edit Manually / Rescan"
     */
    static show(candidates, originalPayload, onSelect, onReject) {
        // Prevent multiple modals
        const existing = document.getElementById('multiple-match-gate-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'multiple-match-gate-overlay';
        // Deep slate frosted glass overlay
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 20, 30, 0.85); backdrop-filter: blur(12px);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000; padding: 20px; box-sizing: border-box;
            opacity: 0; transition: opacity 0.3s ease;
        `;

        const card = document.createElement('div');
        // Use global clay-glass-panel class from style.css
        card.className = 'clay-glass-panel';
        card.style.cssText = `
            padding: var(--space-lg);
            width: 90%;
            max-width: 400px;
            max-height: 85vh;
            overflow-y: auto;
            text-align: center;
            transform: translateY(20px);
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
        `;

        // 1. Group candidates by brandName to consolidate variants
        const groupedCandidates = [];
        const groupMap = new Map();
        
        candidates.forEach((aiPayload, index) => {
            const drugName = aiPayload.brandName || aiPayload.graphMatch?.name || aiPayload.name || aiPayload.genericName || 'Unknown Medicine';
            const genericName = aiPayload.genericName || aiPayload.graphMatch?.genericName || '';
            const dosage = aiPayload.dosage || aiPayload.dosageAmount || aiPayload.strength || '';
            const form = aiPayload.form || aiPayload.graphMatch?.dosageForm || aiPayload.dosageForm || '';
            const manufacturer = aiPayload.manufacturer || '';
            
            // Attempt to extract base brand name by removing mg, ml, syrup, tablet, etc.
            let baseName = drugName.replace(/\b(\d+(\.\d+)?\s*(mg|ml|mcg|g|iu|%|v\/v|w\/v)|syrup|tablet|capsule|injection|drops|ointment|cream|gel|suspension)\b/gi, '').trim();
            // If baseName becomes empty (e.g. it was just "1000mg"), fallback to drugName
            if (!baseName) baseName = drugName;
            
            const groupKey = baseName.toLowerCase();
            
            if (!groupMap.has(groupKey)) {
                const newGroup = {
                    drugName: baseName, // Use the cleaned base name for the group title
                    genericName,
                    manufacturer,
                    variants: []
                };
                groupMap.set(groupKey, newGroup);
                groupedCandidates.push(newGroup);
            }
            
            groupMap.get(groupKey).variants.push({
                index,
                dosage,
                form,
                aiPayload
            });
        });

        // 2. Generate list items for grouped candidates
        const candidatesHtml = groupedCandidates.map((group, groupIndex) => {
            const hasMultiple = group.variants.length > 1;
            
            let variantHtml = '';
            if (hasMultiple) {
                const options = group.variants.map(v => {
                    const label = `${v.form} ${v.dosage}`.trim() || 'Standard Variant';
                    return `<option value="${v.index}">${label}</option>`;
                }).join('');
                
                variantHtml = `
                    <div style="margin-top: 8px;" onclick="event.stopPropagation()">
                        <select class="variant-select" style="
                            width: 100%; padding: 8px 12px; border-radius: var(--radius-sm);
                            background: rgba(0, 0, 0, 0.2); border: 1px solid var(--color-border);
                            color: var(--color-text-primary); font-size: 14px; outline: none; cursor: pointer;
                        ">
                            ${options}
                        </select>
                    </div>
                `;
            } else {
                const v = group.variants[0];
                const label = `${v.form} ${v.dosage}`.trim();
                if (label) {
                    variantHtml = `<p style="color: var(--color-text-secondary); margin: 0; font-size: var(--text-xs);">${label}</p>`;
                }
            }

            return `
                <div class="match-candidate-btn clay-glass-panel" data-single-index="${hasMultiple ? '' : group.variants[0].index}" style="
                    padding: var(--space-md); 
                    border-radius: var(--radius-lg); 
                    margin-bottom: var(--space-md); 
                    width: 100%; 
                    text-align: left;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    transition: all 0.2s;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h3 style="color: var(--color-text-primary); font-size: var(--text-base); font-weight: bold; margin: 0 0 4px 0;">${group.drugName}</h3>
                            ${group.genericName && group.genericName !== group.drugName ? `<p style="color: var(--color-text-muted); margin: 0; font-size: 10px;">${group.genericName}</p>` : ''}
                            ${group.manufacturer ? `<p style="color: var(--color-text-muted); margin: 4px 0 0 0; font-size: 10px; font-weight: 500;">${group.manufacturer}</p>` : ''}
                        </div>
                        <button class="edit-manual-btn" style="
                            background: var(--color-surface);
                            border: 1px solid var(--color-border);
                            border-radius: 50%;
                            width: 32px;
                            height: 32px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            color: var(--color-text-secondary);
                            box-shadow: inset 2px 2px 5px rgba(255,255,255,0.05);
                            z-index: 10;
                        ">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                    </div>
                    ${variantHtml}
                    
                    ${hasMultiple ? `
                        <button class="confirm-variant-btn" style="
                            width: 100%; padding: 10px; border-radius: var(--radius-sm);
                            background: var(--color-primary); border: none; color: white;
                            font-weight: 600; cursor: pointer; font-size: 14px;
                        ">Confirm Selection</button>
                    ` : ''}
                </div>
            `;
        }).join('');

        card.innerHTML = `
            <button id="btn-rescan-match-multi" style="position: absolute; top: -15px; right: -15px; width: 36px; height: 36px; border-radius: 50%; background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text-primary); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 20; transition: transform 0.2s;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            
            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, var(--color-brand-violet), var(--color-brand-blue)); border-radius: 50%; margin: 0 auto var(--space-md) auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(124, 58, 237, 0.3), inset 2px 2px 5px rgba(255,255,255,0.4);">
                <span style="font-size: 32px; color: white;">💊</span>
            </div>
            
            <h2 style="color: var(--color-text-primary); font-size: var(--text-xl); font-weight: 800; margin: 0 0 var(--space-xs) 0; line-height: 1.2;">Multiple Matches Found</h2>
            <p style="color: var(--color-text-secondary); font-size: var(--text-sm); margin: 0 0 var(--space-md) 0;">Please select the correct medication below:</p>
            
            <div style="width: 100%; display: flex; flex-direction: column; gap: 8px; margin-bottom: var(--space-md);">
                ${candidatesHtml}
            </div>
            
            <div style="display: flex; gap: var(--space-sm); flex-direction: row; width: 100%;">
                <button id="btn-reject-match-multi" style="flex: 1; background: var(--color-surface); color: var(--color-text-primary); border: 1px solid var(--color-border); padding: var(--space-sm); border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: bold; cursor: pointer; box-shadow: inset 2px 2px 5px rgba(255,255,255,0.05); transition: background 0.2s;">
                    Enter Manually
                </button>
            </div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // Animate In
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });

        // Hover Effects & Selection for Candidates
        const candidateBtns = card.querySelectorAll('.match-candidate-btn');
        candidateBtns.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.borderColor = 'var(--color-brand-blue)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateY(0)';
                btn.style.borderColor = 'transparent';
            });
            
            btn.addEventListener('click', (e) => {
                // Prevent trigger if they are interacting with the select dropdown directly
                if (e.target.tagName.toLowerCase() === 'select' || e.target.tagName.toLowerCase() === 'option') {
                    return;
                }
                
                let selectedIndex;
                const selectEl = btn.querySelector('.variant-select');
                if (selectEl) {
                    selectedIndex = parseInt(selectEl.value, 10);
                } else {
                    selectedIndex = parseInt(btn.getAttribute('data-single-index'), 10);
                }
                
                const selectedCandidate = candidates[selectedIndex];

                // Construct confirmed payload incorporating the original vision pipeline confidence + structure
                const confirmedPayload = {
                    ...originalPayload,
                    name: selectedCandidate.name || selectedCandidate.brandName || selectedCandidate.genericName,
                    dosage: selectedCandidate.dosage || selectedCandidate.strength,
                    form: selectedCandidate.form || selectedCandidate.dosageForm,
                    totalQuantity: selectedCandidate.totalQuantity || originalPayload.totalQuantity,
                    isAsNeeded: selectedCandidate.isAsNeeded,
                    schedule: selectedCandidate.schedule,
                    brandName: selectedCandidate.brandName,
                    genericName: selectedCandidate.genericName,
                    manufacturer: selectedCandidate.manufacturer,
                    therapeuticCategory: selectedCandidate.therapeuticCategory,
                    alternativeBrands: selectedCandidate.alternativeBrands ? selectedCandidate.alternativeBrands.join(', ') : '',
                    expiryDate: selectedCandidate.expiryDate || originalPayload.expiryDate || ''
                };

                // If they click the edit button, pass the confirmed payload to edit mode
                if (e.target.closest('.edit-manual-btn')) {
                    e.stopPropagation();
                    overlay.style.opacity = '0';
                    setTimeout(() => { 
                        overlay.remove(); 
                        // Overwrite onReject or just use a custom event/hash
                        sessionStorage.setItem('medcheck_scanned_data', JSON.stringify(confirmedPayload));
                        window.location.hash = '#/add-medication';
                    }, 300);
                    return;
                }
                
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.remove(); onSelect(confirmedPayload); }, 300);
            });
        });

        // Bind Reject/Rescan Events
        document.getElementById('btn-reject-match-multi').onclick = () => {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.remove(); onReject(originalPayload); }, 300);
        };
        
        document.getElementById('btn-rescan-match-multi').onclick = () => {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.remove(); }, 300);
        };
    }
}
