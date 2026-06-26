/**
 * @fileoverview Strip Mesh Builder
 * Constructs a Three.js PlaneGeometry displaced by a depth map and mapped with
 * the original camera frame texture.
 */
import * as THREE from 'https://esm.sh/three';

export class StripMeshBuilder {
  /**
   * Generates a displaced 3D mesh from a flat image and depth map.
   * @param {Blob|HTMLImageElement|HTMLCanvasElement} textureSource 
   * @param {Float32Array} depthMap - Normalized depth map (0.0 - 1.0)
   * @param {number} depthWidth - Width of the depth map array
   * @param {number} depthHeight - Height of the depth map array
   * @param {number} depthAmplitude - Scaling factor for Z displacement
   * @returns {Promise<THREE.Mesh>}
   */
  static async buildMesh(textureSource, depthMap, depthWidth, depthHeight, depthAmplitude = 15) {
    // 1. Create Texture
    let textureUrl;
    if (textureSource instanceof Blob) {
      textureUrl = URL.createObjectURL(textureSource);
    } else if (textureSource.toDataURL) {
      textureUrl = textureSource.toDataURL('image/png');
    } else {
      textureUrl = textureSource.src;
    }
    
    const textureLoader = new THREE.TextureLoader();
    const texture = await new Promise((resolve, reject) => {
      textureLoader.load(
        textureUrl, 
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          resolve(tex);
        },
        undefined,
        (err) => reject(new Error('Texture load failed'))
      );
    });

    // 2. Create Geometry
    // Using 64x64 segments for high-resolution displacement
    const segmentsX = 64;
    const segmentsY = 64;
    
    // Scale mesh width/height to aspect ratio of texture
    const aspect = texture.image.width / texture.image.height;
    const meshWidth = 100 * aspect;
    const meshHeight = 100;
    
    const geometry = new THREE.PlaneGeometry(meshWidth, meshHeight, segmentsX, segmentsY);

    // 3. Displace Vertices
    if (depthMap) {
      const positionAttribute = geometry.attributes.position;
      
      for (let i = 0; i < positionAttribute.count; i++) {
        const u = geometry.attributes.uv.getX(i);
        // Three.js UV y is bottom-up, our depth map is top-down
        const v = 1.0 - geometry.attributes.uv.getY(i); 
        
        const mapX = Math.floor(u * (depthWidth - 1));
        const mapY = Math.floor(v * (depthHeight - 1));
        
        const depthIdx = mapY * depthWidth + mapX;
        const depthValue = depthMap[depthIdx]; // 0.0 to 1.0
        
        // Push vertex forward based on depth
        positionAttribute.setZ(i, depthValue * depthAmplitude);
      }
      geometry.computeVertexNormals(); // Recalculate lighting normals
    }

    // 4. Create Material & Mesh
    const material = new THREE.MeshBasicMaterial({ 
      map: texture,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    if (textureSource instanceof Blob) {
      URL.revokeObjectURL(textureUrl);
    }

    return mesh;
  }
}
