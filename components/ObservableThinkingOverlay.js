/**
 * @fileoverview ObservableThinkingOverlay.js
 * The AR-style UI that renders the "Wave strip naturally" UX.
 * It visualizes the WorldModel state, Spatial Anchors, and Evidence attribution
 * directly over the camera feed.
 */

import { worldModel } from '../services/intelligence/WorldModel.js';
import { entityLifecycleManager, EntityState } from '../services/intelligence/EntityLifecycleManager.js';

export class ObservableThinkingOverlay {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.activeEntityId = null;
    this.isRendering = false;
  }

  start(entityId) {
    this.activeEntityId = entityId;
    this.isRendering = true;
    this._renderLoop();
  }

  stop() {
    this.isRendering = false;
    this.activeEntityId = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _renderLoop() {
    if (!this.isRendering) return;

    this._draw();
    requestAnimationFrame(() => this._renderLoop());
  }

  _draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (!this.activeEntityId) return;
    
    const entity = worldModel.getEntity(this.activeEntityId);
    if (!entity) return;

    const state = entityLifecycleManager.getState(this.activeEntityId);

    // 1. Draw UX Guidance (Wave naturally)
    this._drawGuidanceText(state);

    // 2. Draw World Model Stats (Coverage, Regions)
    this._drawEntityStats(entity);
    
    // 3. Draw Spatial Anchors (if implemented in UI)
    // this._drawSpatialAnchors(entity);
  }

  _drawGuidanceText(state) {
    this.ctx.fillStyle = '#00FFCC';
    this.ctx.font = '24px monospace';
    this.ctx.textAlign = 'center';
    
    let text = '';
    if (state === EntityState.ACQUIRED) text = 'Lock Established. Move object naturally.';
    else if (state === EntityState.SCANNING) text = 'Waving... Gathering evidence.';
    else if (state === EntityState.REASONING) text = 'Analyzing hypotheses...';
    else if (state === EntityState.IDENTIFIED) text = 'Identification Complete.';

    this.ctx.fillText(text, this.canvas.width / 2, 50);
  }

  _drawEntityStats(entity) {
    // Calculate stats based on WorldModel regions
    let textRegions = 0;
    let blisterRegions = 0;
    let hasManufacturer = false;
    let hasDosage = false;

    entity.regions.forEach(region => {
      if (region.type === 'TEXT_BLOCK') textRegions++;
      if (region.type === 'BLISTER_CAVITY') blisterRegions++;
      if (region.type === 'MANUFACTURER_LOGO') hasManufacturer = true;
      if (region.type === 'DOSAGE_TEXT') hasDosage = true;
    });

    // Simulated expected totals for the UI
    const expectedText = 12;
    const expectedBlisters = 16;
    
    // Calculate synthetic coverage for the demo UX
    const coverage = Math.min(100, Math.floor(((textRegions/expectedText) + (blisterRegions/expectedBlisters)) * 50));

    // Draw Stats Box
    const startX = 20;
    const startY = 100;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(startX, startY, 300, 180);
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'left';

    this.ctx.fillText(`Coverage: ${coverage}%`, startX + 15, startY + 30);
    this.ctx.fillText(`Text Regions: ${textRegions}/${expectedText}`, startX + 15, startY + 60);
    this.ctx.fillText(`Blister Regions: ${blisterRegions}/${expectedBlisters}`, startX + 15, startY + 90);
    
    this.ctx.fillStyle = hasManufacturer ? '#00FF00' : '#FF4444';
    this.ctx.fillText(`Manufacturer Region: ${hasManufacturer ? 'Found' : 'Missing'}`, startX + 15, startY + 120);

    this.ctx.fillStyle = hasDosage ? '#00FF00' : '#FF4444';
    this.ctx.fillText(`Dosage Region: ${hasDosage ? 'Found' : 'Missing'}`, startX + 15, startY + 150);
  }
}
