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
            
            const groupKey = drugName.toLowerCase();
            
            if (!groupMap.has(groupKey)) {
                const newGroup = {
                    drugName,
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
                <div class="match-candidate-btn" data-single-index="${hasMultiple ? '' : group.variants[0].index}" style="
                    background: rgba(255, 255, 255, 0.05); 
                    padding: var(--space-md); 
                    border-radius: var(--radius-md); 
                    margin-bottom: var(--space-sm); 
                    width: 100%; 
                    border: 1px solid var(--color-border); 
                    box-shadow: inset 2px 2px 5px rgba(0,0,0,0.05); 
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s;
                ">
                    <h3 style="color: var(--color-text-primary); font-size: var(--text-base); font-weight: bold; margin: 0 0 4px 0;">${group.drugName}</h3>
                    ${variantHtml}
                    ${group.genericName && group.genericName !== group.drugName ? `<p style="color: var(--color-text-muted); margin: 4px 0 0 0; font-size: 10px;">${group.genericName}</p>` : ''}
                    ${group.manufacturer ? `<p style="color: var(--color-text-muted); margin: 4px 0 0 0; font-size: 10px; font-weight: 500;">${group.manufacturer}</p>` : ''}
                    
                    ${hasMultiple ? `
                        <button class="confirm-variant-btn" style="
                            margin-top: 12px; width: 100%; padding: 8px; border-radius: var(--radius-sm);
                            background: var(--color-brand-blue); border: none; color: white;
                            font-weight: 600; cursor: pointer; font-size: 14px;
                            box-shadow: inset 2px 2px 5px rgba(255,255,255,0.1);
                        ">Confirm Selection</button>
                    ` : ''}
                </div>
            `;
        }).join('');

        card.innerHTML = `
            <button id="btn-rescan-match-multi" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; color: var(--color-text-muted); font-size: 24px; cursor: pointer; transition: color 0.2s;">
                ↻
            </button>
            
            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, var(--color-brand-violet), var(--color-brand-blue)); border-radius: var(--radius-full); margin: 0 auto var(--space-md) auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(124, 58, 237, 0.3), inset 2px 2px 5px rgba(255,255,255,0.4);">
                <span style="font-size: 24px; color: white;">🤔</span>
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
                btn.style.background = 'rgba(255, 255, 255, 0.1)';
                btn.style.borderColor = 'var(--color-brand-blue)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'rgba(255, 255, 255, 0.05)';
                btn.style.borderColor = 'var(--color-border)';
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
