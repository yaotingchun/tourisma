import './decisionEngine.css';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export class DecisionEngineChatbot {
  public readonly element: HTMLElement;
  private isOpen: boolean = false;
  private isLoading: boolean = false;
  private messages: ChatMessage[] = [];
  private drawerElement!: HTMLElement;
  private messagesContainer!: HTMLElement;
  private inputElement!: HTMLTextAreaElement;
  private sendButton!: HTMLButtonElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'hc-decision-engine-root';
    this.render();
  }

  private render(): void {
    this.element.innerHTML = '';

    // 1. Floating Action Button (FAB) at Bottom-Right
    const fabWrap = document.createElement('div');
    fabWrap.className = 'hc-chat-fab-wrap';

    const fabBtn = document.createElement('button');
    fabBtn.type = 'button';
    fabBtn.className = 'hc-chat-fab';
    fabBtn.setAttribute('aria-label', 'Open Compass AI Copilot');
    fabBtn.title = 'Compass • Tourisma Spatial Copilot';
    fabBtn.innerHTML = `
      <img src="/robot-avatar.png" alt="Compass Robot" class="hc-fab-avatar-img" />
    `;

    fabBtn.addEventListener('click', () => this.toggleChat());
    fabWrap.appendChild(fabBtn);

    // 2. Chat Window Drawer
    this.drawerElement = document.createElement('div');
    this.drawerElement.className = 'hc-chat-drawer closed';

    // Header
    const header = document.createElement('div');
    header.className = 'hc-chat-header';
    header.innerHTML = `
      <div class="hc-chat-header-left">
        <div class="hc-chat-avatar">
          <img src="/robot-avatar.png" alt="Compass Robot" class="hc-chat-avatar-img" />
        </div>
        <div class="hc-chat-header-title-wrap">
          <h4 class="hc-chat-header-title">Compass</h4>
          <span class="hc-chat-header-sub">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399; display: inline-block;"></span>
            Tourisma Spatial Copilot
          </span>
        </div>
      </div>
      <div class="hc-chat-header-actions">
        <button type="button" class="hc-chat-icon-btn" id="hc-chat-clear" title="Clear Conversation">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
        <button type="button" class="hc-chat-icon-btn" id="hc-chat-close" title="Minimize Window">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    header.querySelector('#hc-chat-close')?.addEventListener('click', () => this.toggleChat(false));
    header.querySelector('#hc-chat-clear')?.addEventListener('click', () => this.clearChat());

    // Messages Container
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'hc-chat-body';
    this.renderWelcome();

    // Footer & Input
    const footer = document.createElement('div');
    footer.className = 'hc-chat-footer';

    const inputRow = document.createElement('div');
    inputRow.className = 'hc-chat-input-row';

    this.inputElement = document.createElement('textarea');
    this.inputElement.className = 'hc-chat-textarea';
    this.inputElement.placeholder = 'Ask a question or request a destination diagnosis...';
    this.inputElement.rows = 1;

    this.inputElement.addEventListener('input', () => {
      this.inputElement.style.height = 'auto';
      this.inputElement.style.height = `${Math.min(this.inputElement.scrollHeight, 90)}px`;
    });

    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.sendButton = document.createElement('button');
    this.sendButton.type = 'button';
    this.sendButton.className = 'hc-chat-send-btn';
    this.sendButton.title = 'Send query to Decision Engine';
    this.sendButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    `;
    this.sendButton.addEventListener('click', () => this.sendMessage());

    inputRow.appendChild(this.inputElement);
    inputRow.appendChild(this.sendButton);

    const disclaimer = document.createElement('span');
    disclaimer.className = 'hc-chat-disclaimer';
    disclaimer.textContent = 'Decisions synthesized with Tourisma spatial indicators.';

    footer.appendChild(inputRow);
    footer.appendChild(disclaimer);

    this.drawerElement.appendChild(header);
    this.drawerElement.appendChild(this.messagesContainer);
    this.drawerElement.appendChild(footer);

    this.element.appendChild(fabWrap);
    this.element.appendChild(this.drawerElement);
  }

  public toggleChat(forceState?: boolean): void {
    this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
    if (this.isOpen) {
      this.drawerElement.classList.remove('closed');
      setTimeout(() => this.inputElement.focus(), 150);
    } else {
      this.drawerElement.classList.add('closed');
    }
  }

  private clearChat(): void {
    this.messages = [];
    this.messagesContainer.innerHTML = '';
    this.renderWelcome();
  }

  private renderWelcome(): void {
    const welcomeWrap = document.createElement('div');
    welcomeWrap.className = 'hc-welcome-wrap';

    // Copilot Overview & Capabilities Card
    const frameworkBox = document.createElement('div');
    frameworkBox.className = 'hc-framework-banner';
    frameworkBox.innerHTML = `
      <div class="hc-welcome-header">
        <div class="hc-welcome-avatar-wrap">
          <img src="/robot-avatar.png" alt="Compass Robot" class="hc-welcome-avatar-img" />
        </div>
        <div class="hc-framework-intro">
          <strong>Hi, I am Compass!</strong>
          <p style="margin: 4px 0 0 0;">Your strategic AI Copilot for Malaysia tourism analytics. Ask questions about state trends, healthcare accessibility, accommodation capacity, and ecological footprint.</p>
        </div>
      </div>
      <div class="hc-framework-capabilities">
        <div class="hc-cap-chip">
          <span class="hc-cap-icon">⚡</span>
          <span>Fast, concise spatial insights</span>
        </div>
        <div class="hc-cap-chip">
          <span class="hc-cap-icon">🏥</span>
          <span>Healthcare access & hospital buffers</span>
        </div>
        <div class="hc-cap-chip">
          <span class="hc-cap-icon">🏨</span>
          <span>Accommodation & demand capacity</span>
        </div>
        <div class="hc-cap-chip">
          <span class="hc-cap-icon">🌿</span>
          <span>Ecological & protected reserve risks</span>
        </div>
      </div>
    `;

    // Prompt Suggestions
    const suggestions = document.createElement('div');
    suggestions.className = 'hc-prompt-suggestions';
    suggestions.innerHTML = `
      <span class="hc-prompt-title">Sample Inquiries:</span>
      <div class="hc-prompt-pills-wrap">
        <button type="button" class="hc-prompt-pill" data-query="What is Malaysia's overall tourism demand and accommodation capacity status?">🇲🇾 National Tourism Overview</button>
        <button type="button" class="hc-prompt-pill" data-query="Which states have healthcare and hospital accessibility bottlenecks for tourists?">🏥 Healthcare & Hospital Bottlenecks</button>
        <button type="button" class="hc-prompt-pill" data-query="Which tourism destinations face high ecological sensitivity and reserve proximity risks?">🌿 Ecological Reserves at Risk</button>
        <button type="button" class="hc-prompt-pill" data-query="Compare tourism infrastructure and healthcare accessibility between Sabah and Sarawak.">🏝️ Sabah & Sarawak Comparison</button>
      </div>
    `;

    suggestions.querySelectorAll('.hc-prompt-pill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const q = target.getAttribute('data-query');
        if (q) {
          this.sendMessage(q);
        }
      });
    });

    welcomeWrap.appendChild(frameworkBox);
    welcomeWrap.appendChild(suggestions);
    this.messagesContainer.appendChild(welcomeWrap);
  }

  private async sendMessage(customText?: string): Promise<void> {
    const text = customText !== undefined ? customText.trim() : this.inputElement.value.trim();
    if (!text || this.isLoading) return;

    if (customText === undefined) {
      this.inputElement.value = '';
    }
    this.inputElement.style.height = 'auto';

    // Append User Message
    const userMsg: ChatMessage = {
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    this.messages.push(userMsg);
    this.appendMessageUI(userMsg);

    this.isLoading = true;
    this.sendButton.disabled = true;
    const thinkingEl = this.showThinking();

    try {
      const response = await fetch('/api/decision-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          history: this.messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (!response.ok) {
        let errDetail = `Server returned ${response.status}`;
        const rawText = await response.text().catch(() => '');
        try {
          const errJson = JSON.parse(rawText);
          if (errJson && errJson.error) {
            errDetail = errJson.error;
          }
        } catch {
          if (rawText) {
            errDetail = rawText.slice(0, 200);
          }
        }
        throw new Error(errDetail);
      }

      const data = await response.json();
      const botText = data.response || 'No response returned by Compass.';

      const botMsg: ChatMessage = {
        role: 'model',
        text: botText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      this.messages.push(botMsg);
      thinkingEl.remove();
      this.appendMessageUI(botMsg);
    } catch (err: unknown) {
      thinkingEl.remove();
      const errorMsg = err instanceof Error ? err.message : String(err);
      const fallbackMsg: ChatMessage = {
        role: 'model',
        text: `⚠️ **Compass Notice**: Unable to complete query.\n\n*Error details:* ${errorMsg}\n\nPlease verify credentials or check connection.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      this.appendMessageUI(fallbackMsg);
    } finally {
      this.isLoading = false;
      this.sendButton.disabled = false;
      this.scrollToBottom();
    }
  }

  private showThinking(): HTMLElement {
    const thinkingEl = document.createElement('div');
    thinkingEl.className = 'hc-thinking-indicator';
    thinkingEl.innerHTML = `
      <div class="hc-msg-bot-avatar">
        <img src="/robot-avatar.png" alt="Compass Robot" class="hc-msg-bot-avatar-img hc-avatar-thinking" />
      </div>
      <div class="hc-thinking-dots">
        <span class="hc-thinking-dot"></span>
        <span class="hc-thinking-dot"></span>
        <span class="hc-thinking-dot"></span>
      </div>
      <span>Compass is analyzing insights...</span>
    `;
    this.messagesContainer.appendChild(thinkingEl);
    this.scrollToBottom();
    return thinkingEl;
  }

  private appendMessageUI(msg: ChatMessage): void {
    const row = document.createElement('div');
    row.className = `hc-msg-row ${msg.role === 'user' ? 'user' : 'bot'}`;

    if (msg.role === 'model') {
      const avatarEl = document.createElement('div');
      avatarEl.className = 'hc-msg-bot-avatar';
      avatarEl.innerHTML = `<img src="/robot-avatar.png" alt="Compass Robot" class="hc-msg-bot-avatar-img" />`;
      row.appendChild(avatarEl);
    }

    const contentWrap = document.createElement('div');
    contentWrap.className = 'hc-msg-content-wrap';

    const bubble = document.createElement('div');
    bubble.className = 'hc-msg-bubble';

    if (msg.role === 'user') {
      bubble.textContent = msg.text;
    } else {
      bubble.innerHTML = this.formatDecisionEngineMarkdown(msg.text);
    }

    const time = document.createElement('span');
    time.className = 'hc-msg-time';
    time.textContent = msg.timestamp;

    contentWrap.appendChild(bubble);
    contentWrap.appendChild(time);
    row.appendChild(contentWrap);

    this.messagesContainer.appendChild(row);
    this.scrollToBottom();
  }

  private parseInlineMarkdown(str: string): string {
    let res = str;
    // Inline code: `code`
    res = res.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold + Italic: ***text*** or ___text___
    res = res.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    res = res.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
    // Bold: **text** or __text__
    res = res.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    res = res.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // Italic: *text* or _text_
    res = res.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    res = res.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');
    // Clean up any remaining unparsed stray asterisks around words
    res = res.replace(/\*\*/g, '');
    return res;
  }

  private parseBlockMarkdown(content: string): string {
    let text = content.trim();

    // 1. If an inline bullet was placed directly after a colon (e.g. "Sabah: * Connectivity: ..."), break it onto a new line
    text = text.replace(/:\s*[\*\-•]\s+/g, ':\n* ');

    // 2. Identify major topic headers ending with a colon on their own line (e.g. "Tourism Infrastructure:", "Healthcare Accessibility:")
    // and promote them to <h3>
    const majorThemes = [
      'Tourism Infrastructure',
      'Healthcare Accessibility',
      'Tourism Demand',
      'Accommodation Capacity',
      'Environmental Sensitivity',
      'Ecological Sensitivity',
      'Key Pressure Areas',
      'Economic Contribution',
      'Spatial Accessibility'
    ];
    const themeRegex = new RegExp(`^(?:#{1,3}\\s+|\\*\\*)?(${majorThemes.join('|')})(?::)?(?:\\*\\*)?$`, 'gim');
    text = text.replace(themeRegex, '<h3>$1</h3>');

    // 3. Convert explicit markdown headings
    text = text.replace(/^#{1,3}\s+(.*)$/gm, '<h3>$1</h3>');
    text = text.replace(/^#{4,6}\s+(.*)$/gm, '<h4>$1</h4>');

    // 4. Convert standalone regional / state subheadings (e.g. "Sabah:", "Sarawak:", "East Malaysia:") to <h4>
    text = text.replace(/^(?:\*\*)?([A-Z][A-Za-z0-9\s&(),\/\-]{1,35}:)(?:\*\*)?$/gm, '<h4>$1</h4>');

    // 5. Auto-bullet unbulleted attribute lines (e.g. "Accommodation: ...", "Attractions: ...", "Remote Areas: ...")
    text = text.replace(/^(?!\s*<h[1-6]>|\s*[\*\-•#])\s*([A-Z][A-Za-z0-9\s\/&]{2,25}:)\s+/gm, '* **$1** ');

    // 6. Merge multi-line bullets where continuation lines follow a bullet label
    text = text.replace(/(^[\*\-•]\s+.*)\n(\s{2,}|\t)([^\*\-•#\n].*)/gm, '$1 $3');

    // 7. Convert bullet points (* item, - item, • item)
    text = text.replace(/^\s*[\*\-•]\s+(.*)$/gm, '<li>$1</li>');
    // Wrap adjacent <li> in <ul>
    text = text.replace(/(<li>[\s\S]*?<\/li>[\r\n]*)+/g, (m) => `\n\n<ul>\n${m}</ul>\n\n`);

    // 8. Parse inline markdown (bold, italic, code)
    text = this.parseInlineMarkdown(text);
    text = text.replace(/<strong><strong>(.*?)<\/strong><\/strong>/g, '<strong>$1</strong>');

    // 9. Convert into clean paragraphs or blocks
    const blocks = text.split(/\n\n+/).map((b) => {
      b = b.trim();
      if (!b) return '';
      if (b.startsWith('<ul>') || b.startsWith('<ol>') || b.startsWith('<h')) {
        return b.replace(/<br\s*\/?>/g, '');
      }
      return `<p>${b.replace(/\n/g, '<br/>')}</p>`;
    });

    return blocks.filter(Boolean).join('');
  }

  private formatDecisionEngineMarkdown(rawText: string): string {
    return this.parseBlockMarkdown(rawText);
  }

  private scrollToBottom(): void {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
}
