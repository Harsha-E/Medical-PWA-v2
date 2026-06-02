import * as THREE from 'three';

export class SurfaceMeshRenderer {
    constructor() {
        this.isActive = false;
    }

    init(scene) {
        // Mock surface mesh
        this.geometry = new THREE.PlaneGeometry(100, 50, 10, 5);
        this.material = new THREE.MeshBasicMaterial({ 
            color: 0xdcedc1, // Soft Cyan
            wireframe: true, 
            transparent: true, 
            opacity: 0.3 
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.visible = false;
        scene.add(this.mesh);
        this.scene = scene;
    }

    setTarget(rect) {
        this.isActive = true;
        if (this.mesh) {
            this.mesh.visible = true;
            // Scale and position based on rect
        }
    }

    clearTarget() {
        this.isActive = false;
        if (this.mesh) {
            this.mesh.visible = false;
        }
    }
}

export const surfaceMeshRenderer = new SurfaceMeshRenderer();
