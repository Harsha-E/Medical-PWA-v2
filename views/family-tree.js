/**
 * family-tree.js
 * Renders spatial PeerJS connections and handles 3-second context switching.
 */

export default class FamilyTreeView {
    constructor(container) {
        this.container = container;
        window.activeProfileContext = window.activeProfileContext || 'self';
        this.pressTimer = null;
        this.render();
    }

    render() {
        // Assume window.familyMesh holds your PeerMeshV2 connections
        const peers = window.familyMesh ? Array.from(window.familyMesh.connections.keys()) : [];

        let nodesHtml = `
            <div class="family-node ${window.activeProfileContext === 'self' ? 'active-context-node' : ''}" data-id="self" style="padding: 20px; border-radius: 50%; background: #2c3e50; color: white; display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; margin: 10px; cursor: pointer; user-select: none;">
                Me
            </div>
        `;

        peers.forEach(peerId => {
            const shortId = peerId.substring(0, 4);
            const isActive = window.activeProfileContext === peerId ? 'active-context-node' : '';
            nodesHtml += `
                <div class="family-node ${isActive}" data-id="${peerId}" style="padding: 20px; border-radius: 50%; background: #e1b12c; color: white; display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; margin: 10px; cursor: pointer; user-select: none; box-shadow: inset 2px 2px 5px rgba(255,255,255,0.4), 4px 4px 10px rgba(0,0,0,0.3);">
                    ${shortId}
                </div>
            `;
        });

        this.container.innerHTML = `
            <div style="padding: 20px;">
                <h2 style="color: #fff; font-size: 1.5rem; margin-bottom: 20px;">Family Mesh</h2>
                <p style="color: #a4b0be; font-size: 0.9rem; margin-bottom: 20px;">Press and hold a profile for 3 seconds to switch scanning context.</p>
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; padding: 20px; background: rgba(30, 40, 50, 0.5); border-radius: 20px;">
                    ${nodesHtml}
                </div>
            </div>
        `;

        this.bindLongPressEvents();
    }

    bindLongPressEvents() {
        const nodes = this.container.querySelectorAll('.family-node');
        
        nodes.forEach(node => {
            const startPress = (e) => {
                e.preventDefault();
                // 3-second long press
                this.pressTimer = setTimeout(() => {
                    const profileId = node.getAttribute('data-id');
                    window.activeProfileContext = profileId;
                    console.log(`[Family Tree] Switched active context to: ${profileId}`);
                    
                    // Vibrate device for tactile feedback if supported
                    if(navigator.vibrate) navigator.vibrate(50); 
                    
                    this.render(); // Re-render to show the triangular flag
                }, 3000);
            };

            const cancelPress = () => {
                clearTimeout(this.pressTimer);
            };

            node.addEventListener('touchstart', startPress, {passive: false});
            node.addEventListener('touchend', cancelPress);
            node.addEventListener('touchmove', cancelPress);
            
            // Mouse fallbacks for testing on PC
            node.addEventListener('mousedown', startPress);
            node.addEventListener('mouseup', cancelPress);
            node.addEventListener('mouseleave', cancelPress);
        });
    }
}
