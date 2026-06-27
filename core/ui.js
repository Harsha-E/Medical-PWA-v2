export function showToast(msg, type = 'error') {
  const t = document.createElement('div');
  t.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-mono uppercase tracking-widest z-[99999] shadow-xl transition-all ${type === 'error' ? 'bg-red-900/80 border border-red-500/40 text-red-200' : 'bg-success/10 border border-success/30 text-success'}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
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
