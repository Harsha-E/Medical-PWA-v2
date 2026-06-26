/**
 * family-tree.js
 * Renders spatial PeerJS connections, handles 3-second context switching,
 * profile mapping, draggable nodes, and animated data pulses.
 */

export default class FamilyTreeView {
    constructor(container) {
        this.container = container;
        window.activeProfileContext = window.activeProfileContext || 'self';
        this.pressTimer = null;
        this.dragNode = null;
        
        // Load persistent states
        this.positions = JSON.parse(localStorage.getItem('family_mesh_positions') || '{}');
        this.profiles = JSON.parse(localStorage.getItem('family_mesh_profiles') || '{}');
        
        this.render();
        this.bindGlobalEvents();
    }

    render() {
        const peers = window.familyMesh ? Array.from(window.familyMesh.connections.keys()) : [];
        const myId = window.familyMesh?.peer?.id || 'offline';

        let nodesHtml = this.createNodeHtml('self', myId, true);
        peers.forEach(peerId => {
            nodesHtml += this.createNodeHtml(peerId, peerId, false);
        });

        this.container.innerHTML = `
            <div style="padding: 20px; height: 100vh; position: relative; overflow: hidden; background: #0f172a;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 10;">
                    <div>
                        <h2 style="color: #fff; font-size: 1.5rem; margin-bottom: 5px;">Spatial Family Mesh</h2>
                        <p style="color: #94a3b8; font-size: 0.9rem;">Drag nodes. Short tap to edit profile. Long press to switch context.</p>
                    </div>
                    <button id="btn-add-member" style="background: #10b981; color: white; border: none; padding: 10px 15px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                        + Add Member
                    </button>
                </div>

                <!-- SVG Layer for Data Pulses -->
                <svg id="pulse-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;">
                    <!-- Pulses will be dynamically injected here -->
                </svg>

                <!-- Spatial Canvas for Nodes -->
                <div id="spatial-canvas" style="position: absolute; top: 100px; left: 0; right: 0; bottom: 0; z-index: 5;">
                    ${nodesHtml}
                </div>

                <!-- QR Modal (Hidden) -->
                <div id="qr-modal" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 100; align-items: center; justify-content: center; flex-direction: column;">
                    <div style="background: #1e293b; padding: 30px; border-radius: 15px; text-align: center;">
                        <h3 style="color: white; margin-top: 0;">Scan to Connect</h3>
                        <img id="qr-image" src="" style="width: 200px; height: 200px; border-radius: 10px; margin: 15px 0;">
                        <p style="color: #cbd5e1; font-size: 0.9rem; max-width: 250px;">Ask your family member to open their MedCheck scanner and point it here.</p>
                        <button id="btn-close-qr" style="margin-top: 15px; background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Close</button>
                    </div>
                </div>

                <!-- Edit Profile Modal (Hidden) -->
                <div id="profile-modal" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 100; align-items: center; justify-content: center;">
                    <div style="background: #1e293b; padding: 30px; border-radius: 15px; width: 80%; max-width: 300px;">
                        <h3 style="color: white; margin-top: 0;">Edit Profile</h3>
                        <input type="hidden" id="edit-profile-id">
                        <div style="margin-bottom: 15px;">
                            <label style="color: #94a3b8; font-size: 0.8rem; display: block; margin-bottom: 5px;">Name</label>
                            <input type="text" id="edit-profile-name" style="width: 100%; padding: 10px; border-radius: 8px; border: none; background: #334155; color: white; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="color: #94a3b8; font-size: 0.8rem; display: block; margin-bottom: 5px;">Avatar (Emoji)</label>
                            <input type="text" id="edit-profile-avatar" maxlength="2" style="width: 100%; padding: 10px; border-radius: 8px; border: none; background: #334155; color: white; box-sizing: border-box; font-size: 1.2rem; text-align: center;">
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button id="btn-save-profile" style="flex: 1; background: #10b981; color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer;">Save</button>
                            <button id="btn-cancel-profile" style="flex: 1; background: #ef4444; color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer;">Cancel</button>
                        </div>
                    </div>
                </div>

            </div>
        `;

        this.bindEvents();
    }

    createNodeHtml(nodeId, peerId, isSelf) {
        const profile = this.profiles[nodeId] || {};
        const name = profile.name || (isSelf ? 'Me' : peerId.substring(0, 4));
        const avatar = profile.avatar || (isSelf ? '👤' : '📱');
        const pos = this.positions[nodeId] || { x: isSelf ? 150 : Math.random() * 200 + 50, y: isSelf ? 150 : Math.random() * 200 + 50 };
        
        const isActiveContext = window.activeProfileContext === nodeId;
        // Self is always online. Others check peerJS connections
        const isOnline = isSelf || (window.familyMesh && window.familyMesh.connections.has(nodeId));
        const statusColor = isOnline ? '#10b981' : '#64748b'; // Green or Gray

        return `
            <div class="family-node" data-id="${nodeId}" style="position: absolute; left: ${pos.x}px; top: ${pos.y}px; display: flex; flex-direction: column; align-items: center; cursor: grab; user-select: none; touch-action: none; z-index: 10;">
                
                ${isActiveContext ? '<div style="color: #eab308; font-size: 1.2rem; margin-bottom: -5px; animation: bounce 1s infinite;">▼</div>' : ''}
                
                <div style="position: relative;">
                    <div style="width: 70px; height: 70px; border-radius: 50%; background: ${isSelf ? '#3b82f6' : '#eab308'}; display: flex; justify-content: center; align-items: center; font-size: 2rem; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 3px solid ${isActiveContext ? '#fff' : 'transparent'}; transition: border 0.3s ease;">
                        ${avatar}
                    </div>
                    <!-- Live Status Dot -->
                    <div style="position: absolute; bottom: 2px; right: 2px; width: 14px; height: 14px; background: ${statusColor}; border-radius: 50%; border: 2px solid #0f172a;"></div>
                </div>

                <div style="color: white; margin-top: 8px; font-weight: bold; font-size: 0.9rem; background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 10px;">
                    ${name}
                </div>
            </div>
        `;
    }

    bindEvents() {
        const canvas = this.container.querySelector('#spatial-canvas');
        const nodes = this.container.querySelectorAll('.family-node');
        
        // DRAG & DROP LOGIC
        nodes.forEach(node => {
            let startX = 0, startY = 0, initialX = 0, initialY = 0;
            let isDragging = false;
            let pressTimer = null;
            let hasMoved = false;

            const onPointerDown = (e) => {
                isDragging = true;
                hasMoved = false;
                node.style.cursor = 'grabbing';
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                startX = clientX;
                startY = clientY;
                initialX = parseInt(node.style.left || 0, 10);
                initialY = parseInt(node.style.top || 0, 10);
                node.style.zIndex = 20;

                // Long Press for Context Switch (3s)
                pressTimer = setTimeout(() => {
                    if (!hasMoved) {
                        const profileId = node.getAttribute('data-id');
                        window.activeProfileContext = profileId;
                        if(navigator.vibrate) navigator.vibrate(50); 
                        this.render(); // Re-render to show flag
                    }
                }, 3000);
            };

            const onPointerMove = (e) => {
                if (!isDragging) return;
                hasMoved = true;
                clearTimeout(pressTimer); // Cancel long press if dragging
                
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const dx = clientX - startX;
                const dy = clientY - startY;
                
                const newX = initialX + dx;
                const newY = initialY + dy;
                
                node.style.left = newX + 'px';
                node.style.top = newY + 'px';
            };

            const onPointerUp = (e) => {
                if (!isDragging) return;
                isDragging = false;
                node.style.cursor = 'grab';
                node.style.zIndex = 10;
                clearTimeout(pressTimer);

                const nodeId = node.getAttribute('data-id');
                
                // Save spatial layout
                this.positions[nodeId] = { 
                    x: parseInt(node.style.left || 0, 10), 
                    y: parseInt(node.style.top || 0, 10) 
                };
                localStorage.setItem('family_mesh_positions', JSON.stringify(this.positions));

                // If it was a short tap (no movement) -> Open Edit Profile
                if (!hasMoved) {
                    this.openProfileEditor(nodeId);
                }
            };

            node.addEventListener('pointerdown', onPointerDown);
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
        });

        // QR Modal Logic
        const btnAdd = this.container.querySelector('#btn-add-member');
        const qrModal = this.container.querySelector('#qr-modal');
        const qrImage = this.container.querySelector('#qr-image');
        const btnCloseQr = this.container.querySelector('#btn-close-qr');

        btnAdd.onclick = () => {
            const myId = window.familyMesh?.peer?.id;
            if (myId) {
                qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=medcare://peer/${myId}&color=ffffff&bgcolor=1e293b`;
                qrModal.style.display = 'flex';
            } else {
                alert("You are currently offline. Cannot generate pairing code.");
            }
        };
        btnCloseQr.onclick = () => qrModal.style.display = 'none';

        // Profile Modal Logic
        const btnSaveProfile = this.container.querySelector('#btn-save-profile');
        const btnCancelProfile = this.container.querySelector('#btn-cancel-profile');
        
        btnSaveProfile.onclick = () => {
            const id = this.container.querySelector('#edit-profile-id').value;
            const name = this.container.querySelector('#edit-profile-name').value;
            const avatar = this.container.querySelector('#edit-profile-avatar').value;
            
            this.profiles[id] = { name, avatar };
            localStorage.setItem('family_mesh_profiles', JSON.stringify(this.profiles));
            this.container.querySelector('#profile-modal').style.display = 'none';
            this.render(); // Refresh UI
        };
        
        btnCancelProfile.onclick = () => {
            this.container.querySelector('#profile-modal').style.display = 'none';
        };
    }

    openProfileEditor(nodeId) {
        const modal = this.container.querySelector('#profile-modal');
        const profile = this.profiles[nodeId] || {};
        
        this.container.querySelector('#edit-profile-id').value = nodeId;
        this.container.querySelector('#edit-profile-name').value = profile.name || (nodeId === 'self' ? 'Me' : nodeId.substring(0,4));
        this.container.querySelector('#edit-profile-avatar').value = profile.avatar || (nodeId === 'self' ? '👤' : '📱');
        
        modal.style.display = 'flex';
    }

    bindGlobalEvents() {
        // We only want to bind these once, but render gets called often.
        // We ensure we don't duplicate listeners by removing old ones or checking flags.
        if (this._hasGlobalEvents) return;
        this._hasGlobalEvents = true;

        const drawPulse = (fromId, toId, color) => {
            const svg = document.getElementById('pulse-layer');
            const nodeFrom = document.querySelector(`.family-node[data-id="${fromId}"]`);
            const nodeTo = document.querySelector(`.family-node[data-id="${toId}"]`);
            
            if (!svg || !nodeFrom || !nodeTo) return;

            // Get center coordinates of nodes (offsetting the absolute parent)
            const fromX = parseInt(nodeFrom.style.left) + 35;
            const fromY = parseInt(nodeFrom.style.top) + 35;
            const toX = parseInt(nodeTo.style.left) + 35;
            const toY = parseInt(nodeTo.style.top) + 35;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', fromX);
            circle.setAttribute('cy', fromY);
            circle.setAttribute('r', '5');
            circle.setAttribute('fill', color);
            circle.setAttribute('filter', 'drop-shadow(0px 0px 5px '+color+')');
            svg.appendChild(circle);

            // Animate
            const anim = circle.animate([
                { cx: fromX, cy: fromY, opacity: 1 },
                { cx: toX, cy: toY, opacity: 0 }
            ], {
                duration: 800,
                easing: 'ease-out'
            });

            anim.onfinish = () => {
                circle.remove();
            };
        };

        window.addEventListener('peermesh:data-sent', (e) => {
            console.log("Visual Pulse Outbound");
            drawPulse('self', e.detail.to, '#10b981'); // Green outbound pulse
        });

        window.addEventListener('peermesh:data-received', (e) => {
            console.log("Visual Pulse Inbound");
            drawPulse(e.detail.from, 'self', '#3b82f6'); // Blue inbound pulse
        });
    }
}
