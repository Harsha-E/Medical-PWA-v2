/**
 * ConfirmationGate.js
 * A Premium Claymorphic modal that forces user verification of AI OCR results.
 */

export default class ConfirmationGate {
    /**
     * Spawns the confirmation modal.
     * @param {Object} aiPayload - The resolved payload from FuzzyMatcher
     * @param {Function} onConfirm - Callback when user clicks "Confirm"
     * @param {Function} onReject - Callback when user clicks "Edit Manually / Rescan"
     */
    static show(aiPayload, onConfirm, onReject) {
        // Prevent multiple modals
        const existing = document.getElementById('confirmation-gate-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'confirmation-gate-overlay';
        // Deep slate frosted glass overlay
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 20, 30, 0.85); backdrop-filter: blur(12px);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000; padding: 20px; box-sizing: border-box;
            opacity: 0; transition: opacity 0.3s ease;
        `;

        const drugName = aiPayload.brandName || aiPayload.graphMatch?.name || aiPayload.name || aiPayload.genericName || 'Unknown Medicine';
        const genericName = aiPayload.genericName || aiPayload.graphMatch?.genericName || '';
        const dosage = aiPayload.dosage || aiPayload.dosageAmount || '';
        const form = aiPayload.form || aiPayload.graphMatch?.dosageForm || '';
        const manufacturer = aiPayload.manufacturer || '';
        const schedule = aiPayload.schedule || '';
        const expiryDate = aiPayload.expiryDate || '';
        
        const badges = [];
        if (schedule) badges.push(`<span style="background: var(--color-warning); color: #000; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-right: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${schedule}</span>`);
        if (aiPayload.confidence) badges.push(`<span style="background: rgba(16, 185, 129, 0.1); color: var(--color-success); border: 1px solid var(--color-success); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${Math.round(aiPayload.confidence * 100)}% Match</span>`);

        const badgesHtml = badges.length ? `<div style="margin-bottom: var(--space-sm); display: flex; justify-content: center; align-items: center;">${badges.join('')}</div>` : '';

        const card = document.createElement('div');
        // Use global clay-glass-panel class from style.css
        card.className = 'clay-glass-panel';
        card.style.cssText = `
            padding: var(--space-lg);
            width: 90%;
            max-width: 350px;
            text-align: center;
            transform: translateY(20px);
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
        `;

        card.innerHTML = `
            <!-- Top Right Rescan/Close Button -->
            <button id="btn-rescan-match" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; color: var(--color-text-muted); font-size: 24px; cursor: pointer; transition: color 0.2s;">
                ↻
            </button>
            
            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-indigo)); border-radius: var(--radius-full); margin: 0 auto var(--space-md) auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3), inset 2px 2px 5px rgba(255,255,255,0.4);">
                <span style="font-size: 24px; color: white;">✨</span>
            </div>
            
            <h2 style="color: var(--color-text-primary); font-size: var(--text-xl); font-weight: 800; margin: 0 0 var(--space-xs) 0; line-height: 1.2;">${drugName}</h2>
            ${badgesHtml}
            
            <div style="background: rgba(127, 47, 93, 0.05); padding: var(--space-md); border-radius: var(--radius-sm); margin-bottom: var(--space-md); width: 100%; border: 1px solid var(--color-border); box-shadow: inset 2px 2px 5px rgba(0,0,0,0.05); text-align: left;">
                <p style="color: var(--color-text-primary); margin: 0; font-size: var(--text-sm);"><strong>Compound:</strong> <span style="color: var(--color-text-secondary);">${genericName || 'N/A'}</span></p>
                <p style="color: var(--color-text-primary); margin: 6px 0 0 0; font-size: var(--text-sm);"><strong>Dosage:</strong> <span style="color: var(--color-text-secondary);">${dosage} ${form}</span></p>
                ${manufacturer ? `<p style="color: var(--color-text-primary); margin: 6px 0 0 0; font-size: var(--text-sm);"><strong>Mfg:</strong> <span style="color: var(--color-text-secondary);">${manufacturer}</span></p>` : ''}
                ${expiryDate ? `<p style="color: var(--color-danger); margin: 6px 0 0 0; font-size: var(--text-sm);"><strong>Expires:</strong> <span>${expiryDate}</span></p>` : ''}
            </div>
            
            <div style="display: flex; gap: var(--space-sm); flex-direction: row; width: 100%;">
                <button id="btn-reject-match" style="flex: 1; background: var(--color-surface); color: var(--color-text-primary); border: 1px solid var(--color-border); padding: var(--space-sm); border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: bold; cursor: pointer; box-shadow: inset 2px 2px 5px rgba(255,255,255,0.05); transition: background 0.2s;">
                    Edit
                </button>
                <button id="btn-confirm-match" style="flex: 2; background: var(--color-success); color: white; border: none; padding: var(--space-sm); border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2), inset 2px 2px 5px rgba(255,255,255,0.3); transition: transform 0.2s;">
                    Confirm
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

        // Bind Events
        document.getElementById('btn-confirm-match').onclick = () => {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.remove(); onConfirm(aiPayload); }, 300);
        };

        document.getElementById('btn-reject-match').onclick = () => {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.remove(); onReject(aiPayload); }, 300);
        };
        
        document.getElementById('btn-rescan-match').onclick = () => {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.remove(); }, 300);
        };
    }
}
