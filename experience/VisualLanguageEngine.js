export class VisualLanguageEngine {
    constructor() {
        this.palette = {
            frostedMint: '#a8e6cf',
            softCyan: '#dcedc1',
            sunsetObsidian: '#1a1a2e',
            clayHighlight: 'rgba(255, 255, 255, 0.4)',
            clayShadow: 'rgba(0, 0, 0, 0.15)',
            textPrimary: '#ffffff',
            textSecondary: '#a0a0b0'
        };

        this.currentTheme = 'medical-intelligence';
    }

    /**
     * Injects core CSS variables into the document root to drive the Claymorphism UI
     */
    applyTheme() {
        const root = document.documentElement;
        root.style.setProperty('--frosted-mint', this.palette.frostedMint);
        root.style.setProperty('--soft-cyan', this.palette.softCyan);
        root.style.setProperty('--sunset-obsidian', this.palette.sunsetObsidian);
        root.style.setProperty('--clay-highlight', this.palette.clayHighlight);
        root.style.setProperty('--clay-shadow', this.palette.clayShadow);
        root.style.setProperty('--text-primary', this.palette.textPrimary);
        root.style.setProperty('--text-secondary', this.palette.textSecondary);

        // Define the global claymorphism base utility class dynamically
        const style = document.createElement('style');
        style.innerHTML = `
            .clay-panel {
                background: linear-gradient(145deg, rgba(255,255,255,0.05), rgba(0,0,0,0.1));
                backdrop-filter: blur(12px);
                border-radius: 24px;
                border: 1px solid rgba(255,255,255,0.1);
                box-shadow: 
                    8px 8px 16px var(--clay-shadow), 
                    -8px -8px 16px var(--clay-highlight),
                    inset 2px 2px 4px rgba(255,255,255,0.2),
                    inset -2px -2px 4px rgba(0,0,0,0.1);
                color: var(--text-primary);
                transition: all 0.3s ease;
            }
            .clay-panel:active {
                box-shadow: 
                    inset 8px 8px 16px var(--clay-shadow), 
                    inset -8px -8px 16px var(--clay-highlight);
            }
        `;
        document.head.appendChild(style);
        
        console.log('[VisualLanguageEngine] Applied Premium Claymorphism Theme');
    }

    getPalette() {
        return this.palette;
    }
}

export const visualLanguageEngine = new VisualLanguageEngine();
