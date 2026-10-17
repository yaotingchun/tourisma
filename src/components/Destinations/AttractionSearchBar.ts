import {
  ATTRACTIONS_DATA,
  searchAttractions,
  type AttractionItem,
} from '../../data/attractionsData';

export class AttractionSearchBar {
  public readonly element: HTMLElement;
  private inputElement!: HTMLInputElement;
  private dropdownElement!: HTMLElement;
  private clearBtn!: HTMLButtonElement;
  private onSelectCallback: (attraction: AttractionItem) => void;
  private highlightedIndex: number = -1;
  private currentMatches: AttractionItem[] = [];

  constructor(
    initialAttraction: AttractionItem,
    onSelect: (attraction: AttractionItem) => void
  ) {
    this.onSelectCallback = onSelect;
    this.element = document.createElement('div');
    this.element.className = 'dest-search-container';

    this.render(initialAttraction);
  }

  public setAttraction(attraction: AttractionItem): void {
    if (this.inputElement) {
      this.inputElement.value = attraction.name;
    }
    this.updateActiveChip(attraction.id);
    this.closeDropdown();
  }

  private render(initialAttraction: AttractionItem): void {
    this.element.innerHTML = `
      <div class="dest-search-input-wrapper">
        <span class="dest-search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
        <input
          type="text"
          class="dest-search-input"
          placeholder="Search individual attraction (e.g., Pulau Redang, Cameron Highlands, Batu Caves, Mount Kinabalu, KLCC...)"
          aria-label="Search attraction"
          autocomplete="off"
          value="${initialAttraction.name}"
        />
        <button type="button" class="dest-search-clear" aria-label="Clear search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="dest-search-dropdown" style="display: none;" role="listbox"></div>
      </div>

      <div class="dest-search-chips-row">
        <span class="dest-chips-label">Popular:</span>
        <div class="dest-chips-list">
          <button type="button" class="dest-chip" data-id="pulau_redang">🏝️ Pulau Redang</button>
          <button type="button" class="dest-chip" data-id="petronas_twin_towers">🏢 Petronas Twin Towers</button>
          <button type="button" class="dest-chip active" data-id="cameron_highlands_tea">🍵 Cameron Highlands</button>
          <button type="button" class="dest-chip" data-id="batu_caves">🪨 Batu Caves</button>
          <button type="button" class="dest-chip" data-id="mount_kinabalu">⛰️ Mount Kinabalu</button>
        </div>
      </div>
    `;

    this.inputElement = this.element.querySelector<HTMLInputElement>('.dest-search-input')!;
    this.dropdownElement = this.element.querySelector<HTMLElement>('.dest-search-dropdown')!;
    this.clearBtn = this.element.querySelector<HTMLButtonElement>('.dest-search-clear')!;

    this.clearBtn.style.display = this.inputElement.value.trim().length > 0 ? 'flex' : 'none';

    // Event listeners
    this.inputElement.addEventListener('input', () => this.handleInput());
    this.inputElement.addEventListener('focus', () => this.handleInput());
    this.inputElement.addEventListener('keydown', (e) => this.handleKeyDown(e));

    this.clearBtn.addEventListener('click', () => {
      this.inputElement.value = '';
      this.clearBtn.style.display = 'none';
      this.inputElement.focus();
      this.handleInput();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });

    // Quick chips
    const chips = this.element.querySelectorAll<HTMLButtonElement>('.dest-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const id = chip.getAttribute('data-id');
        const match = ATTRACTIONS_DATA.find((a) => a.id === id);
        if (match) {
          this.setAttraction(match);
          this.onSelectCallback(match);
        }
      });
    });

    this.updateActiveChip(initialAttraction.id);
  }

  private handleInput(): void {
    const val = this.inputElement.value.trim();
    this.clearBtn.style.display = val.length > 0 ? 'flex' : 'none';
    this.currentMatches = searchAttractions(val, 10);
    this.renderDropdown();
  }

  private renderDropdown(): void {
    const val = this.inputElement.value.trim();

    if (this.currentMatches.length === 0) {
      this.dropdownElement.innerHTML = `
        <div class="dest-dropdown-empty">
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">
            No attractions found matching "${val}".
          </div>
          <span style="font-size: 0.76rem; color: #64748b; display: block; margin-top: 4px;">
            Try searching <strong>"Pulau Redang"</strong>, <strong>"Tioman"</strong>, <strong>"Batu Caves"</strong>, <strong>"Kinabalu"</strong>, <strong>"Langkawi"</strong>, <strong>"KLCC"</strong>, or any Malaysian location
          </span>
        </div>
      `;
      this.dropdownElement.style.display = 'block';
      return;
    }

    const countHeader = `
      <div class="dest-dropdown-header">
        <span class="dest-dropdown-header-title">
          ${val ? `Matching "${val}"` : 'All Locations'}
        </span>
        <span class="dest-dropdown-header-count">
          ${this.currentMatches.length} destination${this.currentMatches.length === 1 ? '' : 's'} found
        </span>
      </div>
    `;

    const itemsHtml = this.currentMatches
      .map((item, idx) => {
        const isHighlighted = idx === this.highlightedIndex;
        const categoryColor =
          item.category === 'Natural Sanctuary'
            ? '#059669'
            : item.category === 'Core Attraction'
            ? '#0284c7'
            : item.category === 'Supporting Heritage'
            ? '#d97706'
            : '#7c3aed';

        const categoryBg =
          item.category === 'Natural Sanctuary'
            ? '#ecfdf5'
            : item.category === 'Core Attraction'
            ? '#f0f9ff'
            : item.category === 'Supporting Heritage'
            ? '#fffbeb'
            : '#f5f3ff';

        return `
        <div class="dest-dropdown-item ${isHighlighted ? 'highlighted' : ''}" data-index="${idx}">
          <div class="dest-dropdown-item-left">
            <div class="dest-dropdown-name">${item.name}</div>
            <div class="dest-dropdown-sub">
              📍 ${item.district}, ${item.stateName} • <span class="dest-dropdown-subcat">${item.subcategory}</span>
            </div>
          </div>
          <div class="dest-dropdown-item-right">
            <span class="dest-dropdown-badge" style="color: ${categoryColor}; background-color: ${categoryBg}; border: 1px solid ${categoryColor}25;">
              ${item.category}
            </span>
          </div>
        </div>
      `;
      })
      .join('');

    this.dropdownElement.innerHTML = `
      ${countHeader}
      <div class="dest-dropdown-scrollable">
        ${itemsHtml}
      </div>
    `;

    this.dropdownElement.style.display = 'block';

    // Click on item
    const items = this.dropdownElement.querySelectorAll<HTMLElement>('.dest-dropdown-item');
    items.forEach((it) => {
      it.addEventListener('click', () => {
        const idx = parseInt(it.getAttribute('data-index') || '0', 10);
        const selected = this.currentMatches[idx];
        if (selected) {
          this.setAttraction(selected);
          this.onSelectCallback(selected);
        }
      });
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.dropdownElement.style.display === 'none') {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        this.handleInput();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.currentMatches.length - 1);
      this.updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
      this.updateHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.highlightedIndex >= 0 && this.highlightedIndex < this.currentMatches.length) {
        const selected = this.currentMatches[this.highlightedIndex];
        this.setAttraction(selected);
        this.onSelectCallback(selected);
      }
    } else if (e.key === 'Escape') {
      this.closeDropdown();
    }
  }

  private updateHighlight(): void {
    const items = this.dropdownElement.querySelectorAll<HTMLElement>('.dest-dropdown-item');
    items.forEach((it, idx) => {
      it.classList.toggle('highlighted', idx === this.highlightedIndex);
      if (idx === this.highlightedIndex) {
        it.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  private closeDropdown(): void {
    this.dropdownElement.style.display = 'none';
    this.highlightedIndex = -1;
  }

  private updateActiveChip(attractionId: string): void {
    const chips = this.element.querySelectorAll<HTMLButtonElement>('.dest-chip');
    chips.forEach((c) => {
      c.classList.toggle('active', c.getAttribute('data-id') === attractionId);
    });
  }
}
