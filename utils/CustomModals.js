/**
 * CustomModals.js
 * Replaces native alert() and confirm() with non-blocking, Promise-based Claymorphism modals.
 */

export async function appConfirm(title, message) {
    return new Promise((resolve) => {
        // 1. Clean up any existing modals to prevent stacking
        const existingOverlay = document.getElementById('clay-confirm-overlay');
        if (existingOverlay) existingOverlay.remove();

        // 2. Create the Overlay (Frosted Glass)
        const overlay = document.createElement('div');
        overlay.id = 'clay-confirm-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 20, 30, 0.7); backdrop-filter: blur(12px);
            display: flex; align-items: center; justify-content: center;
            z-index: 99999; opacity: 0; transition: opacity 0.3s ease;
            font-family: 'Inter', sans-serif;
        `;

        // 3. Create the Claymorphism Card
        const card = document.createElement('div');
        // Reusing your global .clay-card class styles programmatically
        card.style.cssText = `
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: inset 2px 2px 5px rgba(255,255,255,0.05), 0 8px 32px 0 rgba(0, 0, 0, 0.5);
            border-radius: 24px; padding: 30px; width: 90%; max-width: 400px;
            text-align: center; transform: translateY(20px);
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        card.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 10px;">🔗</div>
            <h2 style="color: white; font-size: 1.5rem; font-weight: 800; margin: 0 0 10px 0;">${title}</h2>
            <p style="color: rgba(255,255,255,0.7); font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px;">${message}</p>
            
            <div style="display: flex; gap: 15px;">
                <button id="btn-clay-reject" style="flex: 1; padding: 15px; border-radius: 16px; background: rgba(255, 71, 87, 0.1); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.3); font-weight: bold; cursor: pointer; transition: all 0.2s;">
                    Reject
                </button>
                <button id="btn-clay-accept" style="flex: 1; padding: 15px; border-radius: 16px; background: #1e90ff; color: white; border: none; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(30, 144, 255, 0.3), inset 2px 2px 5px rgba(255,255,255,0.2); transition: all 0.2s;">
                    Accept
                </button>
            </div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // 4. Trigger Enter Animation
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });

        // 5. Handle Exit Animation and Promise Resolution
        const cleanupAndResolve = (result) => {
            overlay.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                overlay.remove();
                resolve(result); // Return true or false back to peer-network.js
            }, 300);
        };

        document.getElementById('btn-clay-accept').onclick = () => cleanupAndResolve(true);
        document.getElementById('btn-clay-reject').onclick = () => cleanupAndResolve(false);
    });
}
