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

        const drugName = aiPayload.brandName || aiPayload.graphMatch?.name || aiPayload.genericName || 'Unknown Medicine';
        const genericName = aiPayload.graphMatch?.genericName || aiPayload.genericName || '';
        const dosage = aiPayload.dosageAmount || aiPayload.dosage || '';
        const form = aiPayload.graphMatch?.dosageForm || aiPayload.form || '';

        const card = document.createElement('div');
        // Premium Claymorphism Card
        card.style.cssText = `
            background: #1e2435;
            border-radius: 32px;
            padding: 30px;
            width: 100%;
            max-width: 400px;
            box-shadow: inset 2px 2px 5px rgba(255,255,255,0.05), 10px 10px 30px rgba(0,0,0,0.5);
            text-align: center;
            transform: translateY(20px);
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 1px solid rgba(255,255,255,0.05);
        `;

        card.innerHTML = `
            <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #1e90ff, #0984e3); border-radius: 50%; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 20px rgba(30, 144, 255, 0.3), inset 2px 2px 5px rgba(255,255,255,0.4);">
                <span style="font-size: 32px; color: white;">🤖</span>
            </div>
            
            <h3 style="color: rgba(255,255,255,0.6); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 5px;">AI Match Detected</h3>
            <h2 style="color: white; font-size: 1.8rem; font-weight: 800; margin: 0 0 10px 0;">${drugName}</h2>
            
            <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 16px; margin-bottom: 25px;">
                <p style="color: #a4b0be; margin: 0 0 5px 0; font-size: 0.95rem;"><strong>Generic:</strong> ${genericName || 'N/A'}</p>
                <p style="color: #a4b0be; margin: 0; font-size: 0.95rem;"><strong>Dosage:</strong> ${dosage} ${form}</p>
            </div>

            <p style="color: white; margin-bottom: 20px; font-weight: 600;">Is this correct?</p>
            
            <div style="display: flex; gap: 15px; flex-direction: column;">
                <button id="btn-confirm-match" style="background: #2ed573; color: white; border: none; padding: 18px; border-radius: 20px; font-size: 1.1rem; font-weight: bold; cursor: pointer; box-shadow: 0 10px 20px rgba(46, 213, 115, 0.3), inset 2px 2px 5px rgba(255,255,255,0.3);">
                    Yes, Confirm & Add
                </button>
                <button id="btn-reject-match" style="background: #2c3e50; color: #a4b0be; border: none; padding: 18px; border-radius: 20px; font-size: 1.1rem; font-weight: bold; cursor: pointer; box-shadow: inset 2px 2px 5px rgba(255,255,255,0.05);">
                    No, Edit Manually
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
    }
}
