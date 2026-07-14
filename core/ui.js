export function showToast(msg, type = 'error') {
  const t = document.createElement('div');
  const baseClasses = "fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-mono uppercase tracking-widest z-[99999] shadow-[0_10px_35px_rgba(0,0,0,0.8),inset_2px_2px_4px_rgba(255,255,255,0.1)] transition-all backdrop-blur-xl clay-glass-panel";
  const typeClasses = type === 'error' 
    ? "bg-red-900/80 border border-red-500/40 text-red-200" 
    : "bg-success/20 border border-success/40 text-success bg-[#0a0407]/60";
  
  t.className = `${baseClasses} ${typeClasses}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/**
 * Attaches a global Pull-to-Refresh behavior to a scrolling container.
 */
export function setupPullToRefresh(scrollArea, onRefresh) {
    if (!scrollArea) return;

    let startY = 0;
    let currentY = 0;
    let isRefreshing = false;
    let ptrContainer = null;
    let isPulling = false;

    scrollArea.addEventListener('touchstart', (e) => {
        if (scrollArea.scrollTop <= 0) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });

    scrollArea.addEventListener('touchmove', (e) => {
        // Only pull if we're at the top, not already refreshing, and pulling downwards
        if (!isPulling || isRefreshing) return;
        currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 0 && scrollArea.scrollTop <= 0) {
            if (e.cancelable) e.preventDefault();
            
            if (!ptrContainer) {
                ptrContainer = document.createElement('div');
                Object.assign(ptrContainer.style, {
                    position: 'absolute',
                    top: '100px', // Just under the header height
                    left: '0',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    zIndex: '40', // Below header (usually z-50)
                    transform: 'translateY(-100px)', // Hide it underneath the header
                    transition: 'none'
                });
                
                ptrContainer.innerHTML = `
                    <div class="ptr-content px-5 py-2.5 bg-surface-elevated/80 rounded-full border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5),inset_0_2px_10px_rgba(255,255,255,0.05)] backdrop-blur-2xl flex items-center gap-3 transition-all duration-300">
                       <div class="w-6 h-6 relative flex items-center justify-center spinner-container">
                          <svg class="w-5 h-5 text-accent-primary ptr-icon transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                          </svg>
                       </div>
                       <span class="text-xs font-mono font-bold tracking-widest text-text-primary uppercase ptr-text">Pull to refresh</span>
                    </div>
                `;
                
                // Append to scrollArea parent if scrollArea has overflow hidden, otherwise inside
                scrollArea.appendChild(ptrContainer);
            }
            
            const resistance = pullDistance < 150 ? pullDistance : 150 + (pullDistance - 150) * 0.3;
            ptrContainer.style.transform = `translateY(${Math.min(resistance - 100, 40)}px)`;
            
            const icon = ptrContainer.querySelector('.ptr-icon');
            const text = ptrContainer.querySelector('.ptr-text');
            
            if (icon && text) {
                icon.style.transform = `rotate(${resistance * 2.5}deg)`;
                if (resistance > 120) {
                    text.textContent = "Release to refresh";
                    icon.classList.add('text-success');
                    icon.classList.remove('text-accent-primary');
                } else {
                    text.textContent = "Pull to refresh";
                    icon.classList.add('text-accent-primary');
                    icon.classList.remove('text-success');
                }
            }
        }
    }, { passive: false });

    scrollArea.addEventListener('touchend', async () => {
        if (!isPulling) return;
        isPulling = false;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 80 && !isRefreshing) {
            isRefreshing = true;
            if (ptrContainer) {
                ptrContainer.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                ptrContainer.style.transform = 'translateY(40px)';
                
                const icon = ptrContainer.querySelector('.ptr-icon');
                const text = ptrContainer.querySelector('.ptr-text');
                
                if (icon && text) {
                    icon.classList.add('animate-spin');
                    text.textContent = "Refreshing...";
                }
                
                const minAnimationTime = new Promise(resolve => setTimeout(resolve, 1500));
                
                // Execute callback
                if (onRefresh) {
                    await Promise.all([onRefresh(), minAnimationTime]).catch(console.warn);
                } else {
                    await minAnimationTime;
                }
                
                // Show "Refreshed!" success state
                if (icon && text) {
                    icon.classList.remove('animate-spin');
                    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>';
                    icon.setAttribute('class', 'w-5 h-5 text-success ptr-icon');
                    text.textContent = "Refreshed!";
                    text.classList.add('text-success');
                }
                
                await new Promise(resolve => setTimeout(resolve, 800)); // Hold success state briefly
                
                if (ptrContainer) {
                    ptrContainer.style.transform = 'translateY(-100px)';
                    setTimeout(() => {
                        if (ptrContainer && ptrContainer.parentNode) ptrContainer.remove();
                        ptrContainer = null;
                        isRefreshing = false;
                    }, 300);
                } else {
                    isRefreshing = false;
                }
            }
        } else if (ptrContainer) {
            ptrContainer.style.transition = 'transform 0.3s ease-out';
            ptrContainer.style.transform = 'translateY(-100px)';
            setTimeout(() => {
                if (ptrContainer && ptrContainer.parentNode) ptrContainer.remove();
                ptrContainer = null;
            }, 300);
        }
    });
}

export function appAlert(msg, title = 'Alert') {
  return new Promise(resolve => {
    const modalHtml = `
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface/80 backdrop-blur-md animate-fade-in" id="alert-modal">
        <div class="clay-modal w-full max-w-sm p-6 relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
          <h2 class="text-xl font-bold text-text-primary mb-2">${title}</h2>
          <p class="text-sm text-text-secondary mb-6">${msg}</p>
          <div class="flex gap-3">
            <button id="alert-ok" class="clay-modal-btn clay-modal-btn-primary w-full py-3 font-bold uppercase text-xs tracking-widest cursor-pointer">OK</button>
          </div>
        </div>
      </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div);

    document.getElementById('alert-ok').onclick = () => {
      div.remove();
      resolve();
    };
  });
}

export function appConfirm(msg, title = 'Confirm') {
  return new Promise(resolve => {
    const modalHtml = `
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface/80 backdrop-blur-md animate-fade-in" id="confirm-modal">
        <div class="clay-modal w-full max-w-sm p-6 relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
          <h2 class="text-xl font-bold text-text-primary mb-2">${title}</h2>
          <p class="text-sm text-text-secondary mb-6">${msg}</p>
          <div class="flex gap-3">
            <button id="confirm-cancel" class="clay-modal-btn flex-1 py-3 text-text-secondary font-bold uppercase text-xs tracking-widest cursor-pointer">Cancel</button>
            <button id="confirm-ok" class="clay-modal-btn clay-modal-btn-primary flex-1 py-3 font-bold uppercase text-xs tracking-widest cursor-pointer">Confirm</button>
          </div>
        </div>
      </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div);

    document.getElementById('confirm-cancel').onclick = () => {
      div.remove();
      resolve(false);
    };
    document.getElementById('confirm-ok').onclick = () => {
      div.remove();
      resolve(true);
    };
  });
}

export function appPrompt(msg, title = 'Prompt') {
  return new Promise(resolve => {
    const modalHtml = `
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface/80 backdrop-blur-md animate-fade-in" id="prompt-modal">
        <div class="clay-modal w-full max-w-sm p-6 relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
          <h2 class="text-xl font-bold text-text-primary mb-2">${title}</h2>
          <p class="text-sm text-text-secondary mb-4">${msg}</p>
          <input type="text" id="prompt-input" class="w-full bg-surface-deep border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent-primary/50 mb-6 shadow-inner">
          <div class="flex gap-3">
            <button id="prompt-cancel" class="clay-modal-btn flex-1 py-3 text-text-secondary font-bold uppercase text-xs tracking-widest cursor-pointer">Cancel</button>
            <button id="prompt-ok" class="clay-modal-btn clay-modal-btn-primary flex-1 py-3 font-bold uppercase text-xs tracking-widest cursor-pointer">OK</button>
          </div>
        </div>
      </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
    document.getElementById('prompt-input').focus();

    document.getElementById('prompt-cancel').onclick = () => {
      div.remove();
      resolve(null);
    };
    document.getElementById('prompt-ok').onclick = () => {
      const val = document.getElementById('prompt-input').value;
      div.remove();
      resolve(val);
    };
  });
}
