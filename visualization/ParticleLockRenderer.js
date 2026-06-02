import * as THREE from 'three';

export class ParticleLockRenderer {
    constructor() {
        this.particles = [];
        this.particleCount = 200;
        this.geometry = new THREE.BufferGeometry();
        this.material = new THREE.PointsMaterial({
            color: 0xa8e6cf, // Frosted Mint
            size: 4,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        this.isActive = false;
        this.targetRect = null;
    }

    init(scene) {
        const positions = new Float32Array(this.particleCount * 3);
        const velocities = [];

        for (let i = 0; i < this.particleCount; i++) {
            // Start particles randomly scattered
            positions[i * 3] = (Math.random() - 0.5) * 1000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 1000;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 500;
            
            velocities.push({
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2,
                z: (Math.random() - 0.5) * 2
            });
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleSystem = new THREE.Points(this.geometry, this.material);
        this.velocities = velocities;
        
        scene.add(this.particleSystem);
        this.scene = scene;
    }

    /**
     * Activates the convergence field towards a detected bounding box
     */
    setTarget(rect) {
        this.targetRect = rect;
        this.isActive = true;
    }

    clearTarget() {
        this.targetRect = null;
        this.isActive = false;
    }

    update(delta) {
        if (!this.particleSystem) return;

        const positions = this.geometry.attributes.position.array;

        for (let i = 0; i < this.particleCount; i++) {
            let px = positions[i * 3];
            let py = positions[i * 3 + 1];
            let pz = positions[i * 3 + 2];

            if (this.isActive && this.targetRect) {
                // Determine target point on the rectangle's edge
                // For simplicity, we just pull them towards the center bounds
                const targetX = this.targetRect.x + (Math.random() * this.targetRect.width) - (window.innerWidth / 2);
                const targetY = -(this.targetRect.y + (Math.random() * this.targetRect.height)) + (window.innerHeight / 2);
                
                // Attraction force
                const dx = targetX - px;
                const dy = targetY - py;
                const dz = 0 - pz;
                
                this.velocities[i].x += dx * 0.05 * delta;
                this.velocities[i].y += dy * 0.05 * delta;
                this.velocities[i].z += dz * 0.05 * delta;
            }

            // Apply drag/friction
            this.velocities[i].x *= 0.9;
            this.velocities[i].y *= 0.9;
            this.velocities[i].z *= 0.9;

            // Update positions
            positions[i * 3] += this.velocities[i].x;
            positions[i * 3 + 1] += this.velocities[i].y;
            positions[i * 3 + 2] += this.velocities[i].z;
        }

        this.geometry.attributes.position.needsUpdate = true;
    }

    dispose() {
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            this.geometry.dispose();
            this.material.dispose();
            this.particleSystem = null;
        }
    }
}

export const particleLockRenderer = new ParticleLockRenderer();
