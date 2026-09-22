import './decisionEngine.css';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface CompassInsight {
  tag: string;
  dotColor?: string;
  text: string;
  suggestedPrompt?: string;
  matchedElement?: Element;
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
  private insightBubbleElement!: HTMLElement;
  private fabWrapElement!: HTMLElement;
  private isDockedLeft: boolean = false;
  private dockResetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'hc-decision-engine-root';
    this.render();
    this.initHoverInsights();
  }

  public setDockLeft(dockLeft: boolean): void {
    if (this.isDockedLeft === dockLeft) return;
    this.isDockedLeft = dockLeft;
    if (dockLeft) {
      this.fabWrapElement.classList.add('dock-left');
      this.drawerElement.classList.add('dock-left');
    } else {
      this.fabWrapElement.classList.remove('dock-left');
      this.drawerElement.classList.remove('dock-left');
    }
  }

  private render(): void {
    this.element.innerHTML = '';

    // 1. Floating Action Button (FAB) at Bottom-Right
    const fabWrap = document.createElement('div');
    fabWrap.className = 'hc-chat-fab-wrap';
    this.fabWrapElement = fabWrap;

    // Compass Hover Insight Bubble (anchored directly above Compass robot avatar)
    this.insightBubbleElement = document.createElement('div');
    this.insightBubbleElement.className = 'hc-compass-insight-bubble';
    this.insightBubbleElement.id = 'hc-compass-insight-bubble';
    this.insightBubbleElement.innerHTML = `
      <div class="hc-insight-header">
        <div class="hc-insight-header-left">
          <span class="hc-insight-dot"></span>
          <strong class="hc-insight-brand">COMPASS</strong>
          <span class="hc-insight-sep">·</span>
          <span class="hc-insight-tag">quick insight</span>
        </div>
        <button type="button" class="hc-insight-close-btn" title="Dismiss" aria-label="Dismiss insight">✕</button>
      </div>
      <div class="hc-insight-body"></div>
    `;

    this.insightBubbleElement.querySelector('.hc-insight-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideInsight();
    });

    fabWrap.appendChild(this.insightBubbleElement);

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
      this.hideInsight();
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

    // 4-Step Decision Framework Card
    const frameworkBox = document.createElement('div');
    frameworkBox.className = 'hc-framework-banner';
    frameworkBox.innerHTML = `
      <div class="hc-welcome-header">
        <div class="hc-welcome-avatar-wrap">
          <img src="/robot-avatar.png" alt="Compass Robot" class="hc-welcome-avatar-img" />
        </div>
        <div class="hc-framework-intro">
          <strong>Hi, I am Compass!</strong>
          <p style="margin: 4px 0 0 0;">Ask about any Malaysian state, destination hotspot, or sector. Insights are synthesized using the 4-tier Strategic Protocol:</p>
        </div>
      </div>
      <div class="hc-framework-steps">
        <div class="hc-step-chip blue">
          <span class="hc-step-chip-num">1</span>
          <div>
            <span class="hc-step-chip-text">Tourism Diagnosis</span>
            <span class="hc-step-chip-sub"> — "What is happening?"</span>
          </div>
        </div>
        <div class="hc-step-chip amber">
          <span class="hc-step-chip-num">2</span>
          <div>
            <span class="hc-step-chip-text">Key Pressure Areas</span>
            <span class="hc-step-chip-sub"> — "Where is the problem?"</span>
          </div>
        </div>
        <div class="hc-step-chip indigo">
          <span class="hc-step-chip-num">3</span>
          <div>
            <span class="hc-step-chip-text">Evidence</span>
            <span class="hc-step-chip-sub"> — "Why does Tourisma say this?"</span>
          </div>
        </div>
        <div class="hc-step-chip emerald">
          <span class="hc-step-chip-num">4</span>
          <div>
            <span class="hc-step-chip-text">Planning Focus</span>
            <span class="hc-step-chip-sub"> — "What should planners investigate?"</span>
          </div>
        </div>
      </div>
    `;

    // Prompt Suggestions
    const suggestions = document.createElement('div');
    suggestions.className = 'hc-prompt-suggestions';
    suggestions.innerHTML = `
      <span class="hc-prompt-title">Sample Inquiries:</span>
      <div class="hc-prompt-pills-wrap">
        <button type="button" class="hc-prompt-pill" data-query="Provide a national tourism diagnosis for Malaysia with key pressure areas and planning focus.">🇲🇾 National Tourism Diagnosis</button>
        <button type="button" class="hc-prompt-pill" data-query="What is the tourism healthcare access and capacity pressure diagnosis for Melaka and Penang?">🏥 Healthcare & Hospital Bottlenecks</button>
        <button type="button" class="hc-prompt-pill" data-query="Which Malaysian tourism destinations face the highest ecological sensitivity and reserve proximity pressure?">🌿 Ecological Reserves at Risk</button>
        <button type="button" class="hc-prompt-pill" data-query="Provide a diagnosis on Sabah and Sarawak tourism infrastructure and remote healthcare accessibility.">🏝️ Sabah & Sarawak Spatial Diagnosis</button>
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
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned ${response.status}`);
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
      <span>Compass is synthesizing decision framework...</span>
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

    // Convert headings (e.g. ### Subheading -> <h4>Subheading</h4>)
    text = text.replace(/^#{1,6}\s+(.*)$/gm, '<h4>$1</h4>');

    // Convert bullet points (* item, - item, • item)
    text = text.replace(/^\s*[\*\-•]\s+(.*)$/gm, '<li>$1</li>');
    // Wrap adjacent <li> in <ul>
    text = text.replace(/(<li>[\s\S]*?<\/li>[\r\n]*)+/g, (m) => `\n\n<ul>\n${m}</ul>\n\n`);

    // Parse inline markdown (bold, italic, code)
    text = this.parseInlineMarkdown(text);

    // Convert into clean paragraphs or blocks
    const blocks = text.split(/\n\n+/).map((b) => {
      b = b.trim();
      if (!b) return '';
      if (b.startsWith('<ul>') || b.startsWith('<ol>') || b.startsWith('<h4>')) {
        return b.replace(/<br\s*\/?>/g, '');
      }
      return `<p>${b.replace(/\n/g, '<br/>')}</p>`;
    });

    return blocks.filter(Boolean).join('');
  }

  private formatDecisionEngineMarkdown(rawText: string): string {
    // Parse specific Decision Engine sections with cards
    const sections = [
      {
        regex: /(?:#{1,6}|\*{1,2})?\s*(?:1\.\s*)?Tourism Diagnosis[^\n]*\n?([\s\S]*?)(?=(?:#{1,6}|\*{1,2})?\s*(?:2\.\s*)?Key Pressure Areas|$)/i,
        className: 'diagnosis',
        badge: '🩺 Tourism Diagnosis ("What is happening?")',
      },
      {
        regex: /(?:#{1,6}|\*{1,2})?\s*(?:2\.\s*)?Key Pressure Areas[^\n]*\n?([\s\S]*?)(?=(?:#{1,6}|\*{1,2})?\s*(?:3\.\s*)?Evidence|$)/i,
        className: 'pressure',
        badge: '⚠️ Key Pressure Areas ("Where is the problem?")',
      },
      {
        regex: /(?:#{1,6}|\*{1,2})?\s*(?:3\.\s*)?Evidence[^\n]*\n?([\s\S]*?)(?=(?:#{1,6}|\*{1,2})?\s*(?:4\.\s*)?Planning Focus|$)/i,
        className: 'evidence',
        badge: '📊 Evidence ("Why does Tourisma say this?")',
      },
      {
        regex: /(?:#{1,6}|\*{1,2})?\s*(?:4\.\s*)?Planning Focus[^\n]*\n?([\s\S]*?)$/i,
        className: 'focus',
        badge: '🎯 Planning Focus ("What should planners investigate?")',
      },
    ];

    let hasMatchedFramework = false;
    let cardsHtml = '';

    for (const sec of sections) {
      const match = rawText.match(sec.regex);
      if (match && match[1]?.trim()) {
        hasMatchedFramework = true;
        const parsedContent = this.parseBlockMarkdown(match[1].trim());

        cardsHtml += `
          <div class="hc-decision-card ${sec.className}">
            <div class="hc-decision-card-badge">${sec.badge}</div>
            <div class="hc-decision-content">${parsedContent}</div>
          </div>
        `;
      }
    }

    if (hasMatchedFramework && cardsHtml) {
      return cardsHtml;
    }

    // Default fallback markdown formatting
    return this.parseBlockMarkdown(rawText);
  }

  private scrollToBottom(): void {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /* --------------------------------------------------------------------------
     Contextual Hover Insights System
     -------------------------------------------------------------------------- */
  public showInsight(insight: CompassInsight): void {
    if (this.isOpen) return;

    const dotEl = this.insightBubbleElement.querySelector('.hc-insight-dot') as HTMLElement;
    const tagEl = this.insightBubbleElement.querySelector('.hc-insight-tag') as HTMLElement;
    const bodyEl = this.insightBubbleElement.querySelector('.hc-insight-body') as HTMLElement;

    if (dotEl) dotEl.style.backgroundColor = insight.dotColor || '#ea580c';
    if (tagEl) tagEl.textContent = insight.tag;
    if (bodyEl) bodyEl.textContent = insight.text;

    this.insightBubbleElement.classList.add('visible');
  }

  public hideInsight(): void {
    this.insightBubbleElement.classList.remove('visible');
  }

  private initHoverInsights(): void {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let autoHideTimer: ReturnType<typeof setTimeout> | null = null;
    let lastHoveredElement: Element | null = null;

    document.addEventListener('mouseover', (event) => {
      if (this.isOpen) return;

      const rawTarget = event.target as Element | null;
      if (!rawTarget || !(rawTarget instanceof Element)) {
        if (debounceTimer) clearTimeout(debounceTimer);
        this.hideInsight();
        lastHoveredElement = null;
        return;
      }

      // Ignore hover inside the chatbot itself and sidebar navigation
      if (rawTarget.closest('.hc-decision-engine-root, .sidebar, .app-sidebar, [class*="sidebar"]')) {
        if (debounceTimer) clearTimeout(debounceTimer);
        this.hideInsight();
        lastHoveredElement = null;
        return;
      }

      const insight = this.resolveInsightForElement(rawTarget);
      if (!insight) {
        if (debounceTimer) clearTimeout(debounceTimer);
        this.hideInsight();
        lastHoveredElement = null;
        return;
      }

      const matchedEl = insight.matchedElement || rawTarget;
      if (matchedEl === lastHoveredElement) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      if (autoHideTimer) clearTimeout(autoHideTimer);

      debounceTimer = setTimeout(() => {
        lastHoveredElement = matchedEl;
        this.showInsight(insight);
      }, 50);
    });

    document.addEventListener('mouseout', (event) => {
      const related = event.relatedTarget as Element | null;
      const relatedEl = related instanceof Element ? related : null;
      if (!relatedEl || !this.resolveInsightForElement(relatedEl)) {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (autoHideTimer) clearTimeout(autoHideTimer);
        autoHideTimer = setTimeout(() => {
          this.hideInsight();
          lastHoveredElement = null;
        }, 100);
      }
    });

    // Mouse movement tracker for dodging bottom-right obstructions
    document.addEventListener('mousemove', (event) => {
      if (this.isOpen) return;

      const rawTarget = event.target as Element | null;
      if (!rawTarget || !(rawTarget instanceof Element)) return;

      const clientX = event.clientX;
      const clientY = event.clientY;
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      // Safe zones: Never move Compass if the user is hovering or approaching Compass to catch it!
      const isHoveringCompass = !!rawTarget.closest('.hc-decision-engine-root');
      const isNearLeftDockedCompass = this.isDockedLeft && clientX < 420 && clientY > winH - 190;
      const isNearRightDefaultCompass = !this.isDockedLeft && clientX > winW - 130 && clientY > winH - 130;

      if (isHoveringCompass || isNearLeftDockedCompass || isNearRightDefaultCompass) {
        if (this.dockResetTimer) {
          clearTimeout(this.dockResetTimer);
          this.dockResetTimer = null;
        }
        return;
      }

      // Check if user is hovering actual interactive content in the bottom-right area
      const isRightBottomElement = !!rawTarget.closest(
        '.pressure-chart-wrapper, .pressure-chart-svg, [class*="pressure"], .overview-lower-3col-grid > :last-child, .overview-lower-4col-grid > :last-child, .hc-bor-card, #hc-bor-bars-wrap, .sus-signals-card, .sus-radar-card'
      );

      let isCardInBottomRight = false;
      if (!isRightBottomElement) {
        const card = rawTarget.closest('.bottom-insight-card, .overview-kpi-card, .hc-benchmark-card, .card, [class*="card"]');
        if (card) {
          const rect = card.getBoundingClientRect();
          if (rect.right > winW - 460 && rect.left > winW * 0.45 && rect.bottom > winH - 340 && rect.top > winH * 0.45) {
            // Must not be in the bottom-right corner where Compass FAB lives
            if (clientX < winW - 100 || clientY < winH - 100) {
              isCardInBottomRight = true;
            }
          }
        }
      }

      if (isRightBottomElement || isCardInBottomRight) {
        if (this.dockResetTimer) {
          clearTimeout(this.dockResetTimer);
          this.dockResetTimer = null;
        }
        this.setDockLeft(true);
      } else if (this.isDockedLeft) {
        // Only return to bottom-right when the user has clearly moved away from the bottom-right content
        // and is not interacting with Compass on the left
        if (!this.dockResetTimer) {
          this.dockResetTimer = setTimeout(() => {
            this.setDockLeft(false);
            this.dockResetTimer = null;
          }, 220);
        }
      }
    });

    document.addEventListener('mouseleave', () => {
      if (this.isDockedLeft && !this.isOpen) {
        this.setDockLeft(false);
      }
    });
  }

  private resolveInsightForElement(target: Element): CompassInsight | null {
    // 1. Explicit data-compass attributes
    const explicitEl = target.closest('[data-compass-insight]') as Element | null;
    if (explicitEl) {
      return {
        tag: explicitEl.getAttribute('data-compass-tag') || 'quick insight',
        dotColor: explicitEl.getAttribute('data-compass-dot') || '#ea580c',
        text: explicitEl.getAttribute('data-compass-insight') || '',
        suggestedPrompt: explicitEl.getAttribute('data-compass-prompt') || undefined,
        matchedElement: explicitEl,
      };
    }

    // 2. Interactive Map State Paths (Overview Malaysia Map, Healthcare Map, Accessibility Map)
    const statePath = target.closest(
      'path.state-map-path, path.hc-state-path, path.access-state-path, path[data-state-id], path[id*="state-path"], [data-state-id], text.state-map-label, text[data-state-id]'
    ) as Element | null;

    if (statePath) {
      const stateId =
        statePath.getAttribute('data-state-id') ||
        statePath.getAttribute('id') ||
        statePath.textContent ||
        '';
      const insight = this.getStateInsight(stateId);
      if (insight) {
        return {
          tag: insight.tag,
          dotColor: insight.dotColor,
          text: insight.text,
          suggestedPrompt: insight.prompt,
          matchedElement: statePath,
        };
      }
    }

    // 3. Overview Vertical KPI Cards & Sparkline Graphs (Domestic Visitors, Expenditure, Stay, Occupancy)
    const vertKpi = target.closest(
      '.vertical-kpi-card, .kpi-card-left-content, [class*="vertical-kpi"], .kpi-mini-chart-wrapper, svg.kpi-sparkline-svg, [class*="sparkline"]'
    ) as Element | null;
    if (vertKpi) {
      const text = (vertKpi.textContent || '').toLowerCase();
      if (text.includes('domestic') || text.includes('visitors')) {
        return {
          tag: 'domestic volume',
          dotColor: '#2563eb',
          text: 'Domestic travel volume reached 290.1M trips (+11.5%). While sheer volume is strong, yield per visitor remains low. Focus on increasing average spend.',
          suggestedPrompt: 'Analyze Malaysia domestic tourism visitor volume and growth potential.',
          matchedElement: vertKpi,
        };
      }
      if (text.includes('expenditure') || text.includes('receipt') || text.includes('rm121')) {
        return {
          tag: 'expenditure yield',
          dotColor: '#059669',
          text: 'Tourism revenue reached RM121.3B (+13.6%). High-yield leisure corridors in Penang and Sabah drive the strongest expenditure-to-arrival conversion.',
          suggestedPrompt: 'How can Malaysia maximize tourism expenditure and yield per visitor?',
          matchedElement: vertKpi,
        };
      }
      if (text.includes('length of stay') || text.includes('stay') || text.includes('nights')) {
        return {
          tag: 'stay duration',
          dotColor: '#ea580c',
          text: 'Average stay is 2.56 nights. Domestic tourists average 1.8 nights while international tourists average 4.2 nights. Extending weekend trips is a key growth lever.',
          suggestedPrompt: 'What strategies can increase the average length of stay in Malaysian destinations?',
          matchedElement: vertKpi,
        };
      }
      if (text.includes('occupancy') || text.includes('rate') || text.includes('50.2%')) {
        return {
          tag: 'lodging utilization',
          dotColor: '#7c3aed',
          text: 'Hotel occupancy sits at 50.2% (+3.8 pp). Mid-week inventory drops below 38% in secondary states, highlighting a significant off-peak utilization gap.',
          suggestedPrompt: 'How can secondary destinations improve mid-week hotel occupancy?',
          matchedElement: vertKpi,
        };
      }
    }

    // 4. Overview Infrastructure & Environmental Gauges
    const gaugeCard = target.closest('.economic-gauge-card, [class*="gauge-card"]') as Element | null;
    if (gaugeCard) {
      const text = (gaugeCard.textContent || '').toLowerCase();
      if (text.includes('road') || text.includes('highways') || text.includes('52.1%') || text.includes('infrastructure')) {
        return {
          tag: 'road connectivity',
          dotColor: '#059669',
          text: '52.1% road access rate: Core west-coast expressways (E1/E2) are mature, but east-coast and inland bypasses require last-mile feeder improvements.',
          suggestedPrompt: 'What is the state of road connectivity to key Malaysian tourism destinations?',
          matchedElement: gaugeCard,
        };
      }
      if (text.includes('transit') || text.includes('public') || text.includes('51.5%')) {
        return {
          tag: 'public transit',
          dotColor: '#2563eb',
          text: '51.5% public transit coverage: Urban rail (LRT/MRT/ETS) excels in Klang Valley and Penang, but secondary ecotourism hubs rely heavily on private vehicles.',
          suggestedPrompt: 'How can public transit access to tourism attractions be improved in Malaysia?',
          matchedElement: gaugeCard,
        };
      }
      if (text.includes('environmental') || text.includes('sensitivity') || text.includes('exposure') || text.includes('10.6%')) {
        return {
          tag: 'eco-vulnerability',
          dotColor: '#ea580c',
          text: '10.6% of tourism assets face environmental sensitivity (monsoon surges, coastal erosion, ecological stress). Strict visitor volume caps are needed for marine parks.',
          suggestedPrompt: 'Which Malaysian tourism assets are most vulnerable to environmental pressure?',
          matchedElement: gaugeCard,
        };
      }
    }

    // 5. Overview Bottom Grid: Top Receipts by State
    const receiptRow = target.closest('.receipts-bar-row, [class*="receipts-bar"], .state-receipt-row, [class*="receipt-row"]') as Element | null;
    if (receiptRow) {
      const stateInsight = this.getStateInsight(receiptRow.getAttribute('data-state-id') || receiptRow.textContent || '');
      if (stateInsight) {
        return {
          tag: stateInsight.tag,
          dotColor: stateInsight.dotColor,
          text: stateInsight.text,
          suggestedPrompt: stateInsight.prompt,
          matchedElement: receiptRow,
        };
      }
    }

    // 6. Overview Bottom Grid: Destination Readiness Profiles
    const profileRow = target.closest('.profile-cluster-row, [class*="profile-cluster"]') as Element | null;
    if (profileRow) {
      const text = (profileRow.textContent || '').toLowerCase();
      if (text.includes('high relative demand') && text.includes('high relative readiness')) {
        return {
          tag: 'mature corridors',
          dotColor: '#059669',
          text: '37.5% of states (KL, Penang, Melaka, Selangor) have mature lodging and infrastructure, but face localized congestion during holiday surges.',
          suggestedPrompt: 'How should mature tourism corridors in Malaysia manage holiday congestion?',
          matchedElement: profileRow,
        };
      }
      if (text.includes('high relative demand') && text.includes('low relative readiness')) {
        return {
          tag: 'the bottleneck',
          dotColor: '#ea580c',
          text: 'High-risk bottleneck zone (12.5%): destinations like Langkawi and Genting experience surging visitor velocity that frequently outstrips utility and healthcare capacity.',
          suggestedPrompt: 'Which Malaysian destinations have high demand but lagging infrastructure readiness?',
          matchedElement: profileRow,
        };
      }
      if (text.includes('low relative demand') && text.includes('high relative readiness')) {
        return {
          tag: 'underutilized capacity',
          dotColor: '#2563eb',
          text: 'States with solid infrastructure (e.g. Perlis, Negeri Sembilan) that require targeted destination marketing to absorb spillover demand.',
          suggestedPrompt: 'How can underutilized states absorb spillover tourism demand?',
          matchedElement: profileRow,
        };
      }
      if (text.includes('low relative demand') && text.includes('low relative readiness')) {
        return {
          tag: 'emerging frontier',
          dotColor: '#64748b',
          text: 'Emerging frontier (37.5%): vast eco-regions (Kelantan, Sarawak interior) needing strategic foundational infrastructure before mass promotion.',
          suggestedPrompt: 'What foundational investments are needed for emerging eco-tourism states?',
          matchedElement: profileRow,
        };
      }
    }

    // 7. System Charts & Analytical Graphs (Pressure, Scenarios, Seasonality, Forecast, Portfolio)
    // 7a. Tourism Pressure / Quarterly Arrivals Curve
    const pressureEl = target.closest(
      '.pressure-chart-wrapper, .pressure-chart-svg, [class*="pressure-chart"], svg.pressure-chart-svg, path.pressure-chart-path, circle.pressure-point-circle, .bottom-insight-card'
    ) as Element | null;
    if (pressureEl) {
      const text = (pressureEl.textContent || '').toLowerCase();
      if (
        pressureEl.classList.contains('pressure-chart-wrapper') ||
        pressureEl.classList.contains('pressure-chart-svg') ||
        text.includes('tourism pressure') ||
        text.includes('quarterly arrivals')
      ) {
        return {
          tag: 'seasonality surge',
          dotColor: '#2563eb',
          text: '2025 quarterly arrival curve surges from 68.2M (Q1) to 76.5M (Q4). Year-end school breaks and festive travel create acute peak pressure. Off-peak business conventions are needed to smooth the curve.',
          suggestedPrompt: 'How can destination planners smooth seasonal arrival peaks across quarters?',
          matchedElement: pressureEl,
        };
      }
      // 7b. Growth Scenario Projection Bar Chart
      if (text.includes('growth scenario') || text.includes('scenario-bar') || text.includes('projected receipts')) {
        return {
          tag: 'growth projection',
          dotColor: '#059669',
          text: 'Growth scenario models project tourism receipts expanding from RM121.3B baseline to RM133.4B (+10%), RM139.5B (+15%), and RM145.6B (+20%) under targeted high-yield conversion.',
          suggestedPrompt: 'What interventions are required to achieve the +15% and +20% tourism growth scenarios?',
          matchedElement: pressureEl,
        };
      }
      // 7c. Seasonality Monthly Overview Line Graph
      if (text.includes('seasonality overview') || text.includes('monthly arrivals')) {
        return {
          tag: 'monthly arrival curve',
          dotColor: '#ea580c',
          text: 'Monthly arrivals exhibit dual peaks in June (mid-year breaks) and December (year-end holidays, 3.6M trips), while February and November face off-peak lulls.',
          suggestedPrompt: 'Analyze Malaysia monthly tourism arrival peaks and seasonal mitigation strategies.',
          matchedElement: pressureEl,
        };
      }
    }

    // 7d. Growth Scenario Bars Direct Hover
    const scenarioBar = target.closest(
      '.scenario-bar-col, .scenario-bar-track, .scenario-bar-fill, [class*="scenario-bar"], [class*="scenario-pill"]'
    ) as Element | null;
    if (scenarioBar) {
      return {
        tag: 'growth projection',
        dotColor: '#059669',
        text: 'Growth scenario models project tourism receipts expanding from RM121.3B baseline to RM133.4B (+10%), RM139.5B (+15%), and RM145.6B (+20%) under targeted high-yield conversion.',
        suggestedPrompt: 'What interventions are required to achieve the +15% and +20% tourism growth scenarios?',
        matchedElement: scenarioBar,
      };
    }

    // 7e. Seasonality Chart Container Direct Hover
    const seasonalityEl = target.closest(
      '.seasonality-chart-stage, .seasonality-chart-container, [class*="seasonality-chart"], svg[class*="seasonality"], .seasonality-overview-card'
    ) as Element | null;
    if (seasonalityEl) {
      return {
        tag: 'monthly arrival curve',
        dotColor: '#ea580c',
        text: 'Monthly arrivals exhibit dual peaks in June (mid-year breaks) and December (year-end holidays, 3.6M trips), while February and November face off-peak lulls.',
        suggestedPrompt: 'Analyze Malaysia monthly tourism arrival peaks and seasonal mitigation strategies.',
        matchedElement: seasonalityEl,
      };
    }

    // 7f. Destination Donut Chart
    const donutEl = target.closest('.donut-chart-container, [class*="donut-chart"], svg[class*="donut"]') as Element | null;
    if (donutEl) {
      return {
        tag: 'asset mix breakdown',
        dotColor: '#7c3aed',
        text: 'Distribution of tourism assets across major Malaysian regions: Urban clusters account for 44%, nature & adventure 29%, and cultural heritage 27%.',
        suggestedPrompt: 'What is the spatial breakdown and asset distribution across Malaysian regions?',
        matchedElement: donutEl,
      };
    }

    // 7g. Macroeconomic Share Range Chart (GDP & Employment Benchmark Bars)
    const rangeEl = target.closest('.range-chart-stage, .benchmark-gauge-wrapper, [class*="range-chart"]') as Element | null;
    if (rangeEl) {
      return {
        tag: 'economic contribution',
        dotColor: '#059669',
        text: "Tourism generates 15.4% of Malaysia's GDP (RM297.6B) and supports 21.6% of national employment (3.54M jobs), making it a high-multiplier pillar of the economy.",
        suggestedPrompt: 'Explain tourism GDP contribution and employment share in the Malaysian economy.',
        matchedElement: rangeEl,
      };
    }

    // 7h. Demand Composition & Forecast Area Chart (Tourism Demand page)
    const compositionEl = target.closest(
      '.composition-chart-stage, .composition-chart-svg, .forecast-chart-container, .chart-hover-marker, [class*="composition-chart"], [class*="forecast-chart"]'
    ) as Element | null;
    if (compositionEl) {
      return {
        tag: 'demand forecast & mix',
        dotColor: '#2563eb',
        text: 'Quarterly demand area model highlights domestic volume stabilizing near 72M trips/quarter while international inbound demand accelerates toward pre-pandemic levels.',
        suggestedPrompt: 'What is the forward demand forecast for domestic vs international tourism in Malaysia?',
        matchedElement: compositionEl,
      };
    }

    // 7i. State Portfolio Diversity Bar Chart (Tourism Assets page)
    const diversityEl = target.closest('.diversity-chart-card, .diversity-chart-wrapper, [class*="diversity-chart"]') as Element | null;
    if (diversityEl) {
      return {
        tag: 'asset diversity index',
        dotColor: '#7c3aed',
        text: 'Compares asset portfolio diversity across accommodation, F&B, attractions, and cultural sites. Highly diversified states (KL, Penang) show resilient multi-segment visitor appeal.',
        suggestedPrompt: 'Analyze state tourism asset portfolio diversity and clustering.',
        matchedElement: diversityEl,
      };
    }

    // 7j. Asset Mix Radial Ring Charts (Tourism Assets page)
    const ringEl = target.closest('.ring-chart-column, [class*="ring-chart"]') as Element | null;
    if (ringEl) {
      return {
        tag: 'sub-sector allocation',
        dotColor: '#059669',
        text: 'Radial completion rings show asset maturity across lodging (64%), gastronomy (78%), and heritage reserves (52%). Expanding eco-attraction density balances the commercial mix.',
        suggestedPrompt: 'Evaluate the asset category allocation and infrastructure balance.',
        matchedElement: ringEl,
      };
    }

    // 7k. Environmental Exposure Bar Chart (Sustainability page)
    const envBarEl = target.closest('.env-barchart-card, [class*="env-barchart"]') as Element | null;
    if (envBarEl) {
      return {
        tag: 'environmental exposure bar',
        dotColor: '#ea580c',
        text: 'Ranks state asset vulnerability against coastal erosion and biodiversity buffer zones. Pahang (39.6%) and Sabah (27.8%) register the highest eco-exposure indices.',
        suggestedPrompt: 'Which states have the highest environmental exposure and conservation risk?',
        matchedElement: envBarEl,
      };
    }

    // 8. Malaysian State Bar / Row (Healthcare & Benchmark Distribution)
    const stateEl = target.closest('[data-state-id], .hc-bar-row, .hc-bor-row, .state-row') as Element | null;
    if (stateEl) {
      const stateId = (stateEl.getAttribute('data-state-id') || stateEl.textContent || '').toLowerCase();
      const stateInsight = this.getStateInsight(stateId);
      if (stateInsight) {
        return {
          tag: stateInsight.tag,
          dotColor: stateInsight.dotColor,
          text: stateInsight.text,
          suggestedPrompt: stateInsight.prompt,
          matchedElement: stateEl,
        };
      }
    }

    // 9. Healthcare KPI Cards
    const kpiCard = target.closest('.hc-kpi-card, [class*="kpi-card"]') as Element | null;
    if (kpiCard) {
      const title = (kpiCard.querySelector('.hc-kpi-title, .kpi-title-label, [class*="title"]')?.textContent || '').toLowerCase();
      if (title.includes('facility') || title.includes('facilities')) {
        return {
          tag: 'national infrastructure',
          dotColor: '#2563eb',
          text: "Over 4,000 public and private health clinics anchor Malaysia's medical tourism network. Private clinics drive primary speed, while MOH clinics ensure rural reach.",
          suggestedPrompt: "Analyze the distribution and capacity of Malaysia's 4,000+ healthcare facilities.",
          matchedElement: kpiCard,
        };
      }
      if (title.includes('bed') && !title.includes('occupancy')) {
        return {
          tag: 'acute bed supply',
          dotColor: '#7c3aed',
          text: '45,000+ total beds nationally. Medical tourists consume ~4.8% of private hospital capacity, concentrated heavily in Penang, Melaka, and Kuala Lumpur.',
          suggestedPrompt: 'What is the hospital bed capacity and medical tourism utilization in Malaysia?',
          matchedElement: kpiCard,
        };
      }
      if (title.includes('access rate') || title.includes('proximity')) {
        return {
          tag: 'golden hour benchmark',
          dotColor: '#059669',
          text: '84.2% of core Malaysian tourism assets lie within 5km of a clinic. The 15.8% deficit represents high-yield adventure zones requiring satellite first-responder posts.',
          suggestedPrompt: 'Which tourism areas fall outside the 5km healthcare safety threshold?',
          matchedElement: kpiCard,
        };
      }
      if (title.includes('occupancy') || title.includes('bor')) {
        return {
          tag: 'capacity stress',
          dotColor: '#ea580c',
          text: 'National hospital bed occupancy averages 71.8%. Any regional spike above 80% during holiday surges strains ICU reserves and emergency responsiveness for visitors.',
          suggestedPrompt: 'How does high bed occupancy rate impact tourism safety in key destinations?',
          matchedElement: kpiCard,
        };
      }
    }

    // 10. Healthcare Benchmark Stacked Bar
    const accessCard = target.closest('.hc-access-card, #hc-stacked-bars-wrap, .hc-access-footer-strip') as Element | null;
    if (accessCard) {
      return {
        tag: 'spatial benchmark',
        dotColor: '#2563eb',
        text: 'The 100% stacked bar compares high (≤2km), moderate (2–5km), and limited (>5km) healthcare reach. Urban states exceed 95% high access, while Borneo states face geographic stretches.',
        suggestedPrompt: 'Explain the spatial healthcare access tiers for Malaysian tourism assets.',
        matchedElement: accessCard,
      };
    }

    // 11. Hospital Bed Occupancy (BOR) Card & Benchmark Line
    const borCard = target.closest('.hc-bor-card, #hc-bor-bars-wrap, .hc-bor-national-pill') as Element | null;
    if (borCard) {
      return {
        tag: 'the benchmark',
        dotColor: '#dc2626',
        text: 'The vertical dashed marker marks the national BOR baseline (71.8%). States to the right of this line operate under clinical stress, leaving less emergency headroom for holiday tourism surges.',
        suggestedPrompt: 'Which states exceed the national bed occupancy benchmark and pose tourism risks?',
        matchedElement: borCard,
      };
    }

    // 12. Healthcare GIS Map Card
    const hcMapCard = target.closest('.hc-map-card, #hc-healthcare-map') as Element | null;
    if (hcMapCard) {
      return {
        tag: 'spatial catchment',
        dotColor: '#2563eb',
        text: 'Interactive GIS view of 4,000+ facilities mapped against key tourism assets. High corridor concentration aligns with the E1 expressway, creating safety contrast against rural eco-zones.',
        suggestedPrompt: 'Explain the spatial distribution of healthcare facilities around tourism hotspots.',
        matchedElement: hcMapCard,
      };
    }

    // 13. Sustainability & Environmental Exposure Cards
    const susCard = target.closest('.sus-ring-card, .sus-exposure-card, .sus-card, .sus-radar-card, .sus-signals-card') as Element | null;
    if (susCard) {
      const isRadarOrSignals = target.closest('.sus-radar-card, .sus-signals-card');
      if (isRadarOrSignals) {
        return {
          tag: 'monsoon risk',
          dotColor: '#ea580c',
          text: 'East Coast marine parks (Tioman, Redang, Perhentian) experience severe monsoon seas from November to February. Shifting toward inland cultural corridors maintains seasonal stability.',
          suggestedPrompt: 'How does monsoon seasonality impact tourism sustainability in East Coast states?',
          matchedElement: susCard,
        };
      }
      return {
        tag: 'ecological sensitivity',
        dotColor: '#059669',
        text: 'Taman Negara and Belum-Temengor buffer zones face rising visitor density. Carrying-capacity guidelines suggest capping daily vehicle access to protect critical rainforest habitats.',
        suggestedPrompt: 'Which tourism reserves face the highest ecological sensitivity in Malaysia?',
        matchedElement: susCard,
      };
    }



    return null;
  }

  private getStateInsight(query: string): { name: string; tag: string; dotColor: string; text: string; prompt: string } | null {
    if (!query) return null;
    const clean = query
      .toLowerCase()
      .replace(/state-path-/, '')
      .replace(/hc-state-/, '')
      .replace(/access-state-/, '')
      .replace(/w\.p\.\s*/g, '')
      .replace(/pulau\s+/g, '')
      .replace(/[_\-\s]+/g, ' ')
      .trim();

    // 1. Direct dictionary match
    if (STATE_INSIGHTS[clean]) return STATE_INSIGHTS[clean];

    // 2. Direct match with underscores
    const underKey = clean.replace(/\s+/g, '_');
    if (STATE_INSIGHTS[underKey]) return STATE_INSIGHTS[underKey];

    // 3. Search key or state name inclusion
    const matchedKey = Object.keys(STATE_INSIGHTS).find((k) => {
      const entry = STATE_INSIGHTS[k];
      const entryName = entry.name.toLowerCase().replace(/w\.p\.\s*/g, '').replace(/pulau\s+/g, '').trim();
      const normK = k.replace(/_/g, ' ');
      return (
        clean === k ||
        clean === normK ||
        clean === entryName ||
        clean.includes(entryName) ||
        clean.includes(normK) ||
        (normK.length >= 3 && clean.includes(normK))
      );
    });

    return matchedKey ? STATE_INSIGHTS[matchedKey] : null;
  }
}

const STATE_INSIGHTS: Record<string, { name: string; tag: string; dotColor: string; text: string; prompt: string }> = {
  sabah: {
    name: 'Sabah',
    tag: 'premier eco-yield',
    dotColor: '#059669',
    text: 'Sabah captures RM9.8B in tourism receipts (22.4M visitors) and leads Malaysia in foreign eco-tourist yield. However, Kota Kinabalu Airport (KKIA) gate capacity and remote road transit along Mount Kinabalu remain binding constraints.',
    prompt: 'Diagnose Sabah eco-tourism carrying capacity, airport gate constraints, and visitor yield.',
  },
  sbh: {
    name: 'Sabah',
    tag: 'premier eco-yield',
    dotColor: '#059669',
    text: 'Sabah captures RM9.8B in tourism receipts (22.4M visitors) and leads Malaysia in foreign eco-tourist yield. However, Kota Kinabalu Airport (KKIA) gate capacity and remote road transit along Mount Kinabalu remain binding constraints.',
    prompt: 'Diagnose Sabah eco-tourism carrying capacity, airport gate constraints, and visitor yield.',
  },
  sarawak: {
    name: 'Sarawak',
    tag: 'eco-frontier & stay lead',
    dotColor: '#059669',
    text: "Sarawak boasts Malaysia's longest length of stay (3.10 nights) generating RM9.1B receipts across Mulu and Bako. Hinterland flight frequency (MASwings) is the primary obstacle to scaling interior eco-destinations.",
    prompt: 'Analyze Sarawak ecotourism model, 3.1-night length of stay, and rural flight connectivity.',
  },
  srw: {
    name: 'Sarawak',
    tag: 'eco-frontier & stay lead',
    dotColor: '#059669',
    text: "Sarawak boasts Malaysia's longest length of stay (3.10 nights) generating RM9.1B receipts across Mulu and Bako. Hinterland flight frequency (MASwings) is the primary obstacle to scaling interior eco-destinations.",
    prompt: 'Analyze Sarawak ecotourism model, 3.1-night length of stay, and rural flight connectivity.',
  },
  swk: {
    name: 'Sarawak',
    tag: 'eco-frontier & stay lead',
    dotColor: '#059669',
    text: "Sarawak boasts Malaysia's longest length of stay (3.10 nights) generating RM9.1B receipts across Mulu and Bako. Hinterland flight frequency (MASwings) is the primary obstacle to scaling interior eco-destinations.",
    prompt: 'Analyze Sarawak ecotourism model, 3.1-night length of stay, and rural flight connectivity.',
  },
  selangor: {
    name: 'Selangor',
    tag: 'volume gateway leader',
    dotColor: '#2563eb',
    text: 'Selangor leads national domestic tourism with 36.4M trips and RM15.8B receipts. As the primary KLIA gateway and theme park corridor, its chief growth bottleneck is suburban arterial transit during weekend peaks.',
    prompt: 'Diagnose Selangor 36.4M visitor throughput and suburban highway congestion.',
  },
  sgr: {
    name: 'Selangor',
    tag: 'volume gateway leader',
    dotColor: '#2563eb',
    text: 'Selangor leads national domestic tourism with 36.4M trips and RM15.8B receipts. As the primary KLIA gateway and theme park corridor, its chief growth bottleneck is suburban arterial transit during weekend peaks.',
    prompt: 'Diagnose Selangor 36.4M visitor throughput and suburban highway congestion.',
  },
  kuala_lumpur: {
    name: 'W.P. Kuala Lumpur',
    tag: 'revenue leader',
    dotColor: '#2563eb',
    text: 'Kuala Lumpur generates RM16.9B (highest in Malaysia) with near-perfect 99.7 infrastructure readiness. City core peak traffic and high hotel demand pressure in Bukit Bintang are key friction points.',
    prompt: 'What drives Kuala Lumpur RM16.9B tourism revenue lead and how can core congestion be reduced?',
  },
  kul: {
    name: 'W.P. Kuala Lumpur',
    tag: 'revenue leader',
    dotColor: '#2563eb',
    text: 'Kuala Lumpur generates RM16.9B (highest in Malaysia) with near-perfect 99.7 infrastructure readiness. City core peak traffic and high hotel demand pressure in Bukit Bintang are key friction points.',
    prompt: 'What drives Kuala Lumpur RM16.9B tourism revenue lead and how can core congestion be reduced?',
  },
  kl: {
    name: 'W.P. Kuala Lumpur',
    tag: 'revenue leader',
    dotColor: '#2563eb',
    text: 'Kuala Lumpur generates RM16.9B (highest in Malaysia) with near-perfect 99.7 infrastructure readiness. City core peak traffic and high hotel demand pressure in Bukit Bintang are key friction points.',
    prompt: 'What drives Kuala Lumpur RM16.9B tourism revenue lead and how can core congestion be reduced?',
  },
  penang: {
    name: 'Pulau Pinang',
    tag: 'heritage saturation',
    dotColor: '#dc2626',
    text: "Penang faces Malaysia's highest tourism pressure score (88/100) with RM8.5B receipts. George Town historic core and island hotels are near capacity; mainland Seberang Perai dispersal is recommended.",
    prompt: 'Diagnose Penang tourism carrying capacity saturation and mainland dispersal strategy.',
  },
  pulau_pinang: {
    name: 'Pulau Pinang',
    tag: 'heritage saturation',
    dotColor: '#dc2626',
    text: "Penang faces Malaysia's highest tourism pressure score (88/100) with RM8.5B receipts. George Town historic core and island hotels are near capacity; mainland Seberang Perai dispersal is recommended.",
    prompt: 'Diagnose Penang tourism carrying capacity saturation and mainland dispersal strategy.',
  },
  png: {
    name: 'Pulau Pinang',
    tag: 'heritage saturation',
    dotColor: '#dc2626',
    text: "Penang faces Malaysia's highest tourism pressure score (88/100) with RM8.5B receipts. George Town historic core and island hotels are near capacity; mainland Seberang Perai dispersal is recommended.",
    prompt: 'Diagnose Penang tourism carrying capacity saturation and mainland dispersal strategy.',
  },
  pahang: {
    name: 'Pahang',
    tag: 'highland occupancy surge',
    dotColor: '#ea580c',
    text: "Pahang records Malaysia's highest hotel occupancy (75.6%) and RM9.8B receipts. Genting and Cameron Highlands suffer acute weekend mountain road gridlock and heavy eco-trail footfall.",
    prompt: 'Evaluate Pahang 75.6% hotel occupancy and highland road transit bottlenecks.',
  },
  phg: {
    name: 'Pahang',
    tag: 'highland occupancy surge',
    dotColor: '#ea580c',
    text: "Pahang records Malaysia's highest hotel occupancy (75.6%) and RM9.8B receipts. Genting and Cameron Highlands suffer acute weekend mountain road gridlock and heavy eco-trail footfall.",
    prompt: 'Evaluate Pahang 75.6% hotel occupancy and highland road transit bottlenecks.',
  },
  johor: {
    name: 'Johor',
    tag: 'cross-border throughput',
    dotColor: '#2563eb',
    text: 'Johor generates RM8.7B receipts driven by 3.25M Singapore day-trippers and Desaru resorts. Causeway immigration throughput and highway ingress remain the critical growth throttles.',
    prompt: 'Analyze Johor cross-border visitor demand from Singapore and RTS link capacity impact.',
  },
  jhr: {
    name: 'Johor',
    tag: 'cross-border throughput',
    dotColor: '#2563eb',
    text: 'Johor generates RM8.7B receipts driven by 3.25M Singapore day-trippers and Desaru resorts. Causeway immigration throughput and highway ingress remain the critical growth throttles.',
    prompt: 'Analyze Johor cross-border visitor demand from Singapore and RTS link capacity impact.',
  },
  perak: {
    name: 'Perak',
    tag: 'culinary & heritage',
    dotColor: '#2563eb',
    text: 'Perak captures 23.6M visitors (RM8.0B receipts) centered on Ipoh food heritage and Pangkor Island. Intercity ETS rail frequency is the primary lever to turn day-trippers into multiday stays.',
    prompt: 'Analyze Perak culinary tourism demand and ETS electric train connectivity potential.',
  },
  prk: {
    name: 'Perak',
    tag: 'culinary & heritage',
    dotColor: '#2563eb',
    text: 'Perak captures 23.6M visitors (RM8.0B receipts) centered on Ipoh food heritage and Pangkor Island. Intercity ETS rail frequency is the primary lever to turn day-trippers into multiday stays.',
    prompt: 'Analyze Perak culinary tourism demand and ETS electric train connectivity potential.',
  },
  melaka: {
    name: 'Melaka',
    tag: 'weekend saturation',
    dotColor: '#dc2626',
    text: 'Melaka experiences intense weekend tourist compression (pressure score 84/100, RM8.7B receipts). Historic core vehicle congestion around Jonker Street requires park-and-ride river transit.',
    prompt: 'How can Melaka mitigate severe weekend visitor compression and historic core gridlock?',
  },
  mlk: {
    name: 'Melaka',
    tag: 'weekend saturation',
    dotColor: '#dc2626',
    text: 'Melaka experiences intense weekend tourist compression (pressure score 84/100, RM8.7B receipts). Historic core vehicle congestion around Jonker Street requires park-and-ride river transit.',
    prompt: 'How can Melaka mitigate severe weekend visitor compression and historic core gridlock?',
  },
  kedah: {
    name: 'Kedah',
    tag: 'island gateway split',
    dotColor: '#ea580c',
    text: 'Kedah generates RM5.5B receipts, heavily anchored by Langkawi duty-free geopark. Ferry terminal throughput at Kuala Kedah and mainland agro-tourism promotion are vital to spread receipts.',
    prompt: 'Evaluate Kedah tourism dual-economy: Langkawi island vs mainland rural potential.',
  },
  kdh: {
    name: 'Kedah',
    tag: 'island gateway split',
    dotColor: '#ea580c',
    text: 'Kedah generates RM5.5B receipts, heavily anchored by Langkawi duty-free geopark. Ferry terminal throughput at Kuala Kedah and mainland agro-tourism promotion are vital to spread receipts.',
    prompt: 'Evaluate Kedah tourism dual-economy: Langkawi island vs mainland rural potential.',
  },
  negeri_sembilan: {
    name: 'Negeri Sembilan',
    tag: 'coastal spillover',
    dotColor: '#2563eb',
    text: 'Negeri Sembilan draws 19.4M domestic visitors (RM6.5B receipts) focused on Port Dickson beaches. Widening coastal arterial roads and expanding premium resorts will lift modest receipts per visitor.',
    prompt: 'Analyze Negeri Sembilan coastal tourism demand and Port Dickson upgrade potential.',
  },
  nsn: {
    name: 'Negeri Sembilan',
    tag: 'coastal spillover',
    dotColor: '#2563eb',
    text: 'Negeri Sembilan draws 19.4M domestic visitors (RM6.5B receipts) focused on Port Dickson beaches. Widening coastal arterial roads and expanding premium resorts will lift modest receipts per visitor.',
    prompt: 'Analyze Negeri Sembilan coastal tourism demand and Port Dickson upgrade potential.',
  },
  terengganu: {
    name: 'Terengganu',
    tag: 'marine seasonality',
    dotColor: '#ea580c',
    text: "Terengganu's pristine marine islands (Redang, Perhentian) face sharp winter monsoon shutdowns from Nov to Feb (RM5.8B receipts). Promoting mainland craft corridors balances seasonal dips.",
    prompt: 'How can Terengganu overcome monsoon marine seasonality through inland cultural tourism?',
  },
  trg: {
    name: 'Terengganu',
    tag: 'marine seasonality',
    dotColor: '#ea580c',
    text: "Terengganu's pristine marine islands (Redang, Perhentian) face sharp winter monsoon shutdowns from Nov to Feb (RM5.8B receipts). Promoting mainland craft corridors balances seasonal dips.",
    prompt: 'How can Terengganu overcome monsoon marine seasonality through inland cultural tourism?',
  },
  kelantan: {
    name: 'Kelantan',
    tag: 'the obstacle',
    dotColor: '#ea580c',
    text: 'Kelantan holds rich Malay artisan heritage (RM5.2B receipts) but faces two structural obstacles: limited star-rated hotel rooms (6,362) and slow highway transit along the Central Spine Road.',
    prompt: 'What infrastructure and accommodation investments are required to unlock Kelantan tourism?',
  },
  ktn: {
    name: 'Kelantan',
    tag: 'the obstacle',
    dotColor: '#ea580c',
    text: 'Kelantan holds rich Malay artisan heritage (RM5.2B receipts) but faces two structural obstacles: limited star-rated hotel rooms (6,362) and slow highway transit along the Central Spine Road.',
    prompt: 'What infrastructure and accommodation investments are required to unlock Kelantan tourism?',
  },
  perlis: {
    name: 'Perlis',
    tag: 'border geopark',
    dotColor: '#64748b',
    text: 'Perlis is the rail gateway to Thailand (3.8M visitors, RM1.2B receipts). With only 1,489 hotel rooms, overnight conversion requires developing boutique ecotourism in Perlis State Park.',
    prompt: 'How can Perlis transform from a transit border corridor into an overnight eco-tourism hub?',
  },
  pls: {
    name: 'Perlis',
    tag: 'border geopark',
    dotColor: '#64748b',
    text: 'Perlis is the rail gateway to Thailand (3.8M visitors, RM1.2B receipts). With only 1,489 hotel rooms, overnight conversion requires developing boutique ecotourism in Perlis State Park.',
    prompt: 'How can Perlis transform from a transit border corridor into an overnight eco-tourism hub?',
  },
  putrajaya: {
    name: 'W.P. Putrajaya',
    tag: 'administrative mice',
    dotColor: '#2563eb',
    text: 'Putrajaya features 100% transit access and RM1.2B receipts. Its main challenge is weekday-heavy government demand; activating weekend lake cruises and cultural festivals will capture leisure visitors.',
    prompt: 'How can Putrajaya leverage its transit infrastructure to build weekend leisure tourism?',
  },
  pjy: {
    name: 'W.P. Putrajaya',
    tag: 'administrative mice',
    dotColor: '#2563eb',
    text: 'Putrajaya features 100% transit access and RM1.2B receipts. Its main challenge is weekday-heavy government demand; activating weekend lake cruises and cultural festivals will capture leisure visitors.',
    prompt: 'How can Putrajaya leverage its transit infrastructure to build weekend leisure tourism?',
  },
  labuan: {
    name: 'W.P. Labuan',
    tag: 'offshore duty-free',
    dotColor: '#0284c7',
    text: 'Labuan leads the nation in spend per visitor (RM628) with duty-free and wreck diving tourism. Constrained mainland ferry frequencies from Menumbok cap total volume at 604K visitors.',
    prompt: 'Diagnose Labuan duty-free tourism potential and maritime connectivity bottlenecks.',
  },
  lbn: {
    name: 'W.P. Labuan',
    tag: 'offshore duty-free',
    dotColor: '#0284c7',
    text: 'Labuan leads the nation in spend per visitor (RM628) with duty-free and wreck diving tourism. Constrained mainland ferry frequencies from Menumbok cap total volume at 604K visitors.',
    prompt: 'Diagnose Labuan duty-free tourism potential and maritime connectivity bottlenecks.',
  },
};
