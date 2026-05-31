import { nlpContext } from '../services/NLPContext.js';
import state from '../core/state.js';

export default class OrchestratorView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'viewport-container view-enter pb-safe min-h-screen flex flex-col bg-[#0a0407] text-white';
    this.messages = [];
  }

  async render() {
    // Initial welcome message
    const displayName = state.user?.displayName?.split(' ')[0] || 'there';
    if (this.messages.length === 0) {
      this.messages.push({ role: 'system', text: `Hi ${displayName}, I'm your Clinical Orchestrator. You can ask me about your active medications, daily adherence, or request to pull up a discharge summary.` });
    }

    this.container.innerHTML = `
      <header class="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0407]/90 backdrop-blur-md border-b border-[#7f2f5d]/30">
        <h2 class="text-lg font-display text-white tracking-tight flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffb88c" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M12 10v12"/><path d="M5 13h14"/></svg>
          Orchestrator
        </h2>
      </header>

      <main class="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col no-scrollbar pb-32" id="chat-window">
        ${this.messages.map(msg => this._renderMessage(msg)).join('')}
      </main>

      <footer class="fixed bottom-[80px] left-0 w-full p-4 bg-gradient-to-t from-[#0a0407] to-[#0a0407]/0">
        <form id="orchestrator-form" class="relative max-w-lg mx-auto">
          <input type="text" id="query-input" placeholder="Ask about medications or documents..." autocomplete="off" class="w-full px-5 py-4 pr-14 rounded-2xl bg-[#1a0a12]/90 backdrop-blur border border-[#7f2f5d]/40 text-white placeholder-gray-500 focus:outline-none focus:border-[#ffb88c]/60 shadow-[0_8px_30px_rgb(0,0,0,0.5)] text-sm transition-colors">
          <button type="submit" class="absolute right-2 top-2 bottom-2 w-10 bg-[#7f2f5d]/20 hover:bg-[#7f2f5d]/40 rounded-xl flex items-center justify-center text-[#ffb88c] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </footer>
    `;

    this._attachListeners();
    this._scrollToBottom();
    return this.container;
  }

  _renderMessage(msg) {
    if (msg.role === 'system') {
      return `
        <div class="flex flex-col items-start max-w-[85%] self-start animate-[fadeIn_0.3s_ease-out]">
          <div class="px-5 py-3.5 bg-[#1a0a12] border border-[#7f2f5d]/30 rounded-2xl rounded-tl-sm shadow-md text-sm text-gray-200 leading-relaxed">
            ${msg.text}
          </div>
        </div>
      `;
    } else {
      return `
        <div class="flex flex-col items-end max-w-[85%] self-end ml-auto animate-[fadeIn_0.3s_ease-out]">
          <div class="px-5 py-3.5 bg-gradient-to-br from-[#7f2f5d] to-[#4a1532] text-[#ffd9b5] rounded-2xl rounded-tr-sm shadow-lg text-sm font-medium leading-relaxed">
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
      this.messages.push({ role: 'system', text: '<span class="flex gap-1 items-center"><span class="w-1.5 h-1.5 rounded-full bg-[#ffb88c] animate-bounce"></span><span class="w-1.5 h-1.5 rounded-full bg-[#ffb88c] animate-bounce" style="animation-delay:0.1s"></span><span class="w-1.5 h-1.5 rounded-full bg-[#ffb88c] animate-bounce" style="animation-delay:0.2s"></span></span>', id: loadingId });
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
