import { nlpContext } from '../services/NLPContext.js';
import state from '../core/state.js';

export default class OrchestratorView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'viewport-container pb-safe min-h-screen flex flex-col bg-surface text-text-primary';
    this.messages = [];
  }

  async render() {
    // Initial welcome message
    const displayName = state.user?.displayName?.split(' ')[0] || 'there';
    if (this.messages.length === 0) {
      this.messages.push({ role: 'system', text: `Hi ${displayName}, I'm your Clinical Orchestrator. You can ask me about your active medications, daily adherence, or request to pull up a discharge summary.` });
    }

    this.container.innerHTML = `
      <main class="flex-1 overflow-y-auto pt-[112px] space-y-6 flex flex-col no-scrollbar pb-32" style="padding-left:0; padding-right:0;">
<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1" id="chat-window">
        ${this.messages.map(msg => this._renderMessage(msg)).join('')}
      </div></main>

      <footer class="fixed bottom-[80px] left-0 w-full p-4 bg-gradient-to-t from-surface to-surface/0">
        <form id="orchestrator-form" class="relative max-w-lg mx-auto">
          <input type="text" id="query-input" placeholder="Ask about medications or documents..." autocomplete="off" class="w-full px-5 py-4 pr-14 rounded-2xl bg-surface-elevated/90 backdrop-blur border border-border text-text-primary placeholder-gray-500 focus:outline-none focus:border-accent-primary/60 shadow-[0_8px_30px_rgb(0,0,0,0.5)] text-sm transition-colors">
          <button type="submit" class="absolute right-2 top-2 bottom-2 w-10 bg-secondary/20 rounded-xl flex items-center justify-center text-accent-primary transition-all btn-neumorphic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </footer>
    `;

    document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/orchestrator' } }));
    this._attachListeners();
    this._scrollToBottom();
    return this.container;
  }

  _renderMessage(msg) {
    if (msg.role === 'system') {
      return `
        <div class="flex flex-col items-start max-w-[85%] self-start animate-[fadeIn_0.3s_ease-out]">
          <div class="px-5 py-3.5 bg-surface-elevated border border-border rounded-2xl rounded-tl-sm shadow-md text-sm text-text-primary leading-relaxed">
            ${msg.text}
          </div>
        </div>
      `;
    } else {
      return `
        <div class="flex flex-col items-end max-w-[85%] self-end ml-auto animate-[fadeIn_0.3s_ease-out]">
          <div class="px-5 py-3.5 bg-gradient-to-br from-secondary to-surface-deep text-accent-bright rounded-2xl rounded-tr-sm shadow-lg text-sm font-medium leading-relaxed">
            ${msg.text}
          </div>
        </div>
      `;
    }
  }

  _attachListeners() {
    const form = this.container.querySelector('#orchestrator-form');
    const input = this.container.querySelector('#query-input');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      // 1. Add user message
      this.messages.push({ role: 'user', text });
      input.value = '';
      this._updateChat();

      // 2. Add loading state
      const loadingId = Date.now();
      this.messages.push({ role: 'system', text: '<span class="flex gap-1 items-center"><span class="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce"></span><span class="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce" style="animation-delay:0.1s"></span><span class="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce" style="animation-delay:0.2s"></span></span>', id: loadingId });
      this._updateChat();

      // 3. Process query
      try {
        const response = await nlpContext.processQuery(text);
        
        // Remove loading state & add response
        this.messages = this.messages.filter(m => m.id !== loadingId);
        this.messages.push({ role: 'system', text: response });
      } catch (err) {
        this.messages = this.messages.filter(m => m.id !== loadingId);
        this.messages.push({ role: 'system', text: 'Sorry, I encountered an internal error processing that request.' });
      }
      
      this._updateChat();
    });
  }

  _updateChat() {
    const chatWindow = this.container.querySelector('#chat-window');
    if (chatWindow) {
      chatWindow.innerHTML = this.messages.map(msg => this._renderMessage(msg)).join('');
      this._scrollToBottom();
    }
  }

  _scrollToBottom() {
    requestAnimationFrame(() => {
      const chatWindow = this.container.querySelector('#chat-window');
      if (chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight;
    });
  }
}

