export class ClayComponentSystem {
    
    /**
     * Renders a 3D clay 'Orb' used for medicine reminders or status
     * @param {string} type - e.g., 'pill', 'capsule', 'drop'
     * @param {string} state - e.g., 'active', 'snoozed', 'completed'
     */
    renderOrb(type, state) {
        const orbContainer = document.createElement('div');
        orbContainer.className = `clay-panel clay-orb state-${state}`;
        
        // Inline styles specifically for the orb dimensions to keep logic encapsulated
        orbContainer.style.width = '80px';
        orbContainer.style.height = '80px';
        orbContainer.style.borderRadius = '50%';
        orbContainer.style.display = 'flex';
        orbContainer.style.justifyContent = 'center';
        orbContainer.style.alignItems = 'center';
        
        // Example icon/text based on state
        orbContainer.innerHTML = `
            <span style="font-size: 32px; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.3));">
                ${type === 'pill' ? '💊' : '💧'}
            </span>
        `;
        
        return orbContainer;
    }

    /**
     * Renders a 'Medicine Passport' - a visual card replacing text lists
     * @param {Object} data - Medicine details
     */
    renderPassport(data) {
        const passport = document.createElement('div');
        passport.className = 'clay-panel medicine-passport';
        passport.style.padding = '24px';
        passport.style.display = 'flex';
        passport.style.flexDirection = 'column';
        passport.style.gap = '16px';

        // "Visual First, Text Second" rule applied here:
        // We use visual badges instead of text lists
        
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.innerHTML = `
            <h2 style="margin:0; font-size: 24px; font-weight: 600;">${data.name || 'Unknown'}</h2>
            <div class="clay-badge" style="
                background: var(--frosted-mint); 
                color: var(--sunset-obsidian); 
                padding: 4px 12px; 
                border-radius: 20px; 
                font-weight: 600; 
                box-shadow: inset 1px 1px 2px rgba(255,255,255,0.8), 2px 2px 5px rgba(0,0,0,0.2);
            ">
                ${data.strength || ''}
            </div>
        `;

        const purposeVisual = document.createElement('div');
        purposeVisual.innerHTML = `
            <span style="display:block; font-size:12px; color:var(--text-secondary); margin-bottom:4px;">Purpose</span>
            <div style="font-size: 18px;">🛡️ ${data.therapeuticCategory || 'Unknown'}</div>
        `;

        passport.appendChild(header);
        passport.appendChild(purposeVisual);
        
        return passport;
    }

    /**
     * Renders a small clay chip for ingredients or interactions
     */
    renderBrandChip(text, icon = '✨') {
        const chip = document.createElement('div');
        chip.className = 'clay-panel clay-chip';
        chip.style.padding = '8px 16px';
        chip.style.borderRadius = '20px';
        chip.style.display = 'inline-flex';
        chip.style.alignItems = 'center';
        chip.style.gap = '8px';
        chip.style.fontSize = '14px';
        chip.innerHTML = `<span>${icon}</span><span>${text}</span>`;
        return chip;
    }
}

export const clayComponentSystem = new ClayComponentSystem();
