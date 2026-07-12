export default class AvatarSelector {
    constructor(options = {}) {
        this.avatars = options.avatars || [];
        this.selected = options.selected || this.avatars[0];
        this.onChange = options.onChange || (() => {});
        this.loop = options.loop !== undefined ? options.loop : true;
        this.theme = options.theme || 'dark';

        this.container = document.createElement('div');
        this.container.className = 'avatar-selector-container w-full relative overflow-hidden h-40';
        
        // CSS Variables for tuning
        this.container.style.setProperty('--avatar-scale', '1.6');
        this.container.style.setProperty('--avatar-dim', '0.4');

        this.animationFrame = null;
        this.preloadImages();
        this.render();
    }

    preloadImages() {
        this.avatars.forEach(url => {
            const img = new Image();
            img.src = url;
        });
    }

    render() {
        // If looping, we duplicate the list 5 times to simulate infinite scroll seamlessly
        const renderList = this.loop 
            ? [...this.avatars, ...this.avatars, ...this.avatars, ...this.avatars, ...this.avatars] 
            : this.avatars;

        this.container.innerHTML = `
            <style>
                .avatar-carousel-wrapper {
                    display: flex;
                    overflow-x: auto;
                    scroll-snap-type: x mandatory;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    width: 100%;
                    height: 100%;
                    align-items: center;
                    padding: 0 calc(50% - 40px);
                    -webkit-overflow-scrolling: touch;
                }
                .avatar-carousel-wrapper::-webkit-scrollbar {
                    display: none;
                }
                .avatar-item {
                    scroll-snap-align: center;
                    flex: 0 0 80px;
                    height: 80px;
                    margin: 0 12px;
                    perspective: 1000px;
                    will-change: transform, opacity;
                    cursor: pointer;
                    -webkit-tap-highlight-color: transparent;
                }
                .avatar-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    border-radius: 50%;
                    pointer-events: none;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                    background: rgba(255,255,255,0.05);
                    backdrop-filter: blur(4px);
                    border: 2px solid rgba(255,255,255,0.1);
                }
            </style>
            <div class="avatar-carousel-wrapper">
                ${renderList.map((url, i) => `
                    <div class="avatar-item" data-url="${url}">
                        <img src="${url}" alt="Avatar" loading="lazy" />
                    </div>
                `).join('')}
            </div>
        `;

        this.wrapper = this.container.querySelector('.avatar-carousel-wrapper');
        this.items = Array.from(this.wrapper.querySelectorAll('.avatar-item'));

        // Handle clicks to snap to clicked avatar
        this.items.forEach(item => {
            item.addEventListener('click', () => {
                const itemCenter = item.offsetLeft + (item.offsetWidth / 2);
                const wrapperCenter = this.wrapper.offsetWidth / 2;
                this.wrapper.scrollTo({
                    left: itemCenter - wrapperCenter,
                    behavior: 'smooth'
                });
            });
        });

        // Initialize scroll position to middle if looping
        setTimeout(() => {
            if (this.loop && this.items.length > 0) {
                const middleIndex = Math.floor(this.items.length / 2);
                const middleItem = this.items[middleIndex];
                const itemCenter = middleItem.offsetLeft + (middleItem.offsetWidth / 2);
                const wrapperCenter = this.wrapper.offsetWidth / 2;
                this.wrapper.scrollTo({
                    left: itemCenter - wrapperCenter,
                    behavior: 'instant'
                });
            }
            this.startAnimationLoop();
        }, 0);
    }

    startAnimationLoop() {
        let lastScrollLeft = -1;
        
        const update = () => {
            const scrollLeft = this.wrapper.scrollLeft;
            
            // Only recalculate if we actually scrolled
            if (scrollLeft !== lastScrollLeft) {
                lastScrollLeft = scrollLeft;
                const containerCenter = this.wrapper.offsetWidth / 2;
                const absoluteCenter = scrollLeft + containerCenter;
                
                let closestItem = null;
                let minDistance = Infinity;

                const maxDist = this.wrapper.offsetWidth / 2;

                this.items.forEach(item => {
                    const itemCenter = item.offsetLeft + (item.offsetWidth / 2);
                    const distanceFromCenter = itemCenter - absoluteCenter;
                    const absDist = Math.abs(distanceFromCenter);
                    
                    const normalizedDist = Math.min(absDist / maxDist, 1);
                    
                    // Cover flow math
                    const scale = 1.6 - (normalizedDist * 0.8); // 1.6 to 0.8
                    const rotateY = (distanceFromCenter / maxDist) * 45; // -45deg to 45deg
                    const translateY = Math.abs(distanceFromCenter / maxDist) * 10; // pushes non-center items slightly down
                    const opacity = 1 - (normalizedDist * 0.6); // 1.0 to 0.4
                    const zIndex = Math.round(100 - absDist);
                    const blur = normalizedDist * 2; // 0px to 2px blur
                    
                    item.style.transform = `scale(${scale}) translateY(${translateY}px) rotateY(${rotateY}deg)`;
                    item.style.opacity = opacity;
                    item.style.zIndex = zIndex;
                    item.querySelector('img').style.filter = `blur(${blur}px) drop-shadow(0 10px 15px rgba(0,0,0,0.4))`;
                    
                    if (absDist < minDistance) {
                        minDistance = absDist;
                        closestItem = item;
                    }
                });

                // Update selected state when snapped
                if (closestItem && minDistance < 10) {
                    const url = closestItem.getAttribute('data-url');
                    if (this.selected !== url) {
                        this.selected = url;
                        this.onChange(url);
                    }
                }

                // Invisible loop reset: if scrolled near edge, jump to middle block instantly
                if (this.loop) {
                    const totalWidth = this.wrapper.scrollWidth;
                    const blockWidth = totalWidth / 5;
                    
                    if (scrollLeft < blockWidth) {
                        this.wrapper.style.scrollBehavior = 'auto'; // ensure instant
                        this.wrapper.scrollLeft += blockWidth * 2;
                    } else if (scrollLeft > blockWidth * 4) {
                        this.wrapper.style.scrollBehavior = 'auto';
                        this.wrapper.scrollLeft -= blockWidth * 2;
                    }
                }
            }

            this.animationFrame = requestAnimationFrame(update);
        };
        update();
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}
