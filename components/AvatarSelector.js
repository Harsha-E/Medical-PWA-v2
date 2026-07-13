/**
 * MedCare | Avatar Selector Carousel (Inertial Physics Engine)
 * Samsung Gallery-style scrolling component
 */

export default class AvatarSelector {
    constructor(container, avatars, options = {}) {
        this.container = container;
        this.avatars = avatars;
        this.options = Object.assign({
            itemWidth: 120,
            spacing: 20,
            onChange: (selectedAvatarUrl) => {},
            initialIndex: 0
        }, options);

        this.items = [];
        this.isDragging = false;
        this.startX = 0;
        this.currentX = 0;
        this.targetX = 0;
        this.velocity = 0;
        this.lastTime = 0;
        this.lastX = 0;
        this.animationFrame = null;
        
        this.totalItems = this.avatars.length;
        this.itemTotalWidth = this.options.itemWidth + this.options.spacing;
        this.maxScroll = (this.totalItems - 1) * this.itemTotalWidth;
        this.selectedIndex = this.options.initialIndex;
        
        // Start off at the initial index
        this.currentX = -this.selectedIndex * this.itemTotalWidth;
        this.targetX = this.currentX;

        this._buildUI();
        this._attachEvents();
        this._updateLoop();
    }

    _buildUI() {
        this.container.innerHTML = '';
        this.container.className = (this.container.className || '') + ' relative overflow-hidden w-full h-48 select-none touch-none my-auto';
        
        this.track = document.createElement('div');
        this.track.className = 'absolute top-0 left-0 w-full h-full';
        this.track.style.willChange = 'transform';
        
        this.container.appendChild(this.track);

        this.avatars.forEach((avatar, index) => {
            const item = document.createElement('div');
            item.className = 'absolute top-1/2 left-1/2 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-transparent overflow-hidden shadow-xl transition-colors';
            item.style.marginTop = '-3rem';
            item.style.marginLeft = '-3rem'; // Center alignment offset (48px for w-24)
            if (window.innerWidth >= 640) { // sm breakpoint adjust
                item.style.marginTop = '-3.5rem';
                item.style.marginLeft = '-3.5rem';
            }
            item.style.transformOrigin = 'center center';
            item.style.willChange = 'transform, opacity, z-index';
            
            const img = document.createElement('img');
            img.src = avatar;
            img.className = 'w-full h-full object-cover scale-[1.15] translate-y-[8%] pointer-events-none';
            item.appendChild(img);
            
            this.track.appendChild(item);
            this.items.push(item);
        });
        
        // Initial render frame
        this._renderItems(this.currentX);
    }

    _attachEvents() {
        this.onDragStart = this._onDragStart.bind(this);
        this.onDragMove = this._onDragMove.bind(this);
        this.onDragEnd = this._onDragEnd.bind(this);

        this.container.addEventListener('touchstart', this.onDragStart, { passive: false });
        window.addEventListener('touchmove', this.onDragMove, { passive: false });
        window.addEventListener('touchend', this.onDragEnd);

        this.container.addEventListener('mousedown', this.onDragStart);
        window.addEventListener('mousemove', this.onDragMove);
        window.addEventListener('mouseup', this.onDragEnd);
    }

    _onDragStart(e) {
        this.isDragging = true;
        this.velocity = 0;
        this.startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        this.lastX = this.startX;
        this.lastTime = performance.now();
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    _onDragMove(e) {
        if (!this.isDragging) return;
        e.preventDefault(); // prevent native scroll

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const deltaX = clientX - this.lastX;
        const now = performance.now();
        const deltaTime = Math.max(now - this.lastTime, 1);

        this.currentX += deltaX;
        
        // Add resistance if dragging past boundaries
        if (this.currentX > 0) {
            this.currentX -= deltaX * 0.7; // Resistance on left
        } else if (this.currentX < -this.maxScroll) {
            this.currentX -= deltaX * 0.7; // Resistance on right
        }

        this.targetX = this.currentX;
        this.velocity = deltaX / deltaTime; // px per ms

        this.lastX = clientX;
        this.lastTime = now;
        
        this._renderItems(this.currentX);
    }

    _onDragEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        
        // Apply momentum
        this.targetX = this.currentX + (this.velocity * 150); // Momentum multiplier

        // Snap to bounds
        if (this.targetX > 0) {
            this.targetX = 0;
        } else if (this.targetX < -this.maxScroll) {
            this.targetX = -this.maxScroll;
        } else {
            // Snap to nearest item
            const nearestIndex = Math.round(Math.abs(this.targetX) / this.itemTotalWidth);
            this.targetX = -nearestIndex * this.itemTotalWidth;
        }

        this._updateLoop();
    }

    _updateLoop() {
        if (this.isDragging) return;

        // Smooth decay towards target (ease-out)
        this.currentX += (this.targetX - this.currentX) * 0.1;
        
        this._renderItems(this.currentX);

        // Check if we arrived at target
        if (Math.abs(this.targetX - this.currentX) > 0.5) {
            this.animationFrame = requestAnimationFrame(this._updateLoop.bind(this));
        } else {
            this.currentX = this.targetX;
            this._renderItems(this.currentX);
            this._fireChange();
        }
    }

    _renderItems(scrollX) {
        const centerOffset = this.container.offsetWidth / 2;
        
        this.items.forEach((item, index) => {
            // Calculate base position of item relative to track center
            const itemBaseX = index * this.itemTotalWidth;
            
            // Calculate absolute position on screen (relative to center point)
            const absoluteX = itemBaseX + scrollX;
            
            // Distance from center (0 = perfectly centered)
            const distanceFromCenter = Math.abs(absoluteX);
            
            // Normalised distance (0 to 1 based on item width)
            const normalizedDist = Math.min(distanceFromCenter / (this.itemTotalWidth * 1.5), 1);
            
            // Calculate styles based on distance
            const scale = 1 - (normalizedDist * 0.35); // Center is 1, edges shrink down to 0.65
            const opacity = 1 - (normalizedDist * 0.6); // Center is 1, edges fade out
            const zIndex = 100 - Math.round(distanceFromCenter);
            
            // Apply transform
            item.style.transform = `translateX(${absoluteX}px) scale(${scale})`;
            item.style.opacity = opacity;
            item.style.zIndex = zIndex;
            
            // Visual highlight for the centered item
            if (distanceFromCenter < this.itemTotalWidth * 0.4) {
                item.classList.add('border-accent-primary', 'shadow-[0_0_20px_rgba(255,184,140,0.5)]');
                item.classList.remove('border-transparent', 'shadow-xl');
            } else {
                item.classList.remove('border-accent-primary', 'shadow-[0_0_20px_rgba(255,184,140,0.5)]');
                item.classList.add('border-transparent', 'shadow-xl');
            }
        });
    }

    _fireChange() {
        const newIndex = Math.round(Math.abs(this.currentX) / this.itemTotalWidth);
        if (this.selectedIndex !== newIndex && newIndex >= 0 && newIndex < this.totalItems) {
            this.selectedIndex = newIndex;
            const selectedUrl = this.avatars[this.selectedIndex];
            this.options.onChange(selectedUrl);
        }
    }

    destroy() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.container.removeEventListener('touchstart', this.onDragStart);
        window.removeEventListener('touchmove', this.onDragMove);
        window.removeEventListener('touchend', this.onDragEnd);
        this.container.removeEventListener('mousedown', this.onDragStart);
        window.removeEventListener('mousemove', this.onDragMove);
        window.removeEventListener('mouseup', this.onDragEnd);
        this.container.innerHTML = '';
    }
}
