import { ATTRACTIONS_DATA, searchAttractions, type AttractionItem } from '../../data/attractionsData';

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
          placeholder="Search individual attraction (e.g., Cameron Highlands Tea Plantation, Batu Caves, Mount Kinabalu...)"
          aria-label="Search attraction"
          autocomplete="off"
          value="${initialAttraction.name}"
        />
        <button type="button" class="dest-search-clear" aria-label="Clear search" style="display: none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="dest-search-dropdown" style="display: none;" role="listbox"></div>
      </div>

      <div class="dest-search-chips-row">
        <span class="dest-chips-label">Popular Locations:</span>
        <div class="dest-chips-list">
          <button type="button" class="dest-chip active" data-id="cameron_highlands_tea">🍵 Cameron Highlands</button>
          <button type="button" class="dest-chip" data-id="batu_caves">🪨 Batu Caves</button>
          <button type="button" class="dest-chip" data-id="mount_kinabalu">⛰️ Mount Kinabalu</button>
          <button type="button" class="dest-chip" data-id="taman_negara">🌿 Taman Negara</button>
          <button type="button" class="dest-chip" data-id="langkawi_skybridge">🌉 Langkawi Sky Bridge</button>
          <button type="button" class="dest-chip" data-id="georgetown_heritage">🏛️ George Town Heritage</button>
          <button type="button" class="dest-chip" data-id="sunway_lagoon">🎢 Sunway Lagoon</button>
          <button type="button" class="dest-chip" data-id="bako_national_park">🐾 Bako National Park</button>
          <button type="button" class="dest-chip" data-id="melaka_stadthuys">🏰 The Stadthuys</button>
          <button type="button" class="dest-chip" data-id="perhentian_islands">🏖️ Perhentian Islands</button>
        </div>
      </div>
    `;

    this.inputElement = this.element.querySelector<HTMLInputElement>('.dest-search-input')!;
    this.dropdownElement = this.element.querySelector<HTMLElement>('.dest-search-dropdown')!;
    this.clearBtn = this.element.querySelector<HTMLButtonElement>('.dest-search-clear')!;

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
          this.updateActiveChip(match.id);
          this.inputElement.value = match.name;
          this.clearBtn.style.display = 'block';
          this.closeDropdown();
          this.onSelectCallback(match);
        }
      });
    });
  }

  private handleInput(): void {
    const val = this.inputElement.value.trim();
    this.clearBtn.style.display = val.length > 0 ? 'block' : 'none';
    this.currentMatches = searchAttractions(val, 25);
    this.renderDropdown();
  }

  private renderDropdown(): void {
    if (this.currentMatches.length === 0) {
      this.dropdownElement.innerHTML = `
        <div class="dest-dropdown-empty">
          <span>No attractions found matching "${this.inputElement.value}".</span>
          <span style="font-size: 0.72rem; color: #94a3b8; display: block; margin-top: 4px;">Try searching "Bako", "Cameron", "Batu Caves", "Kinabalu", "Langkawi", or any Malaysian location</span>
        </div>
      `;
      this.dropdownElement.style.display = 'block';
      return;
    }

    this.dropdownElement.innerHTML = this.currentMatches
      .map(
        (item, idx) => `
      <div class="dest-dropdown-item ${idx === this.highlightedIndex ? 'highlighted' : ''}" data-index="${idx}">
        <div class="dest-dropdown-item-left">
          <div class="dest-dropdown-name">${item.name}</div>
          <div class="dest-dropdown-sub">${item.district}, ${item.stateName} • <span class="dest-dropdown-subcat">${item.subcategory}</span></div>
        </div>
        <span class="dest-dropdown-badge">${item.category}</span>
      </div>
    `
      )
      .join('');

    this.dropdownElement.style.display = 'block';

    // Click on item
    const items = this.dropdownElement.querySelectorAll<HTMLElement>('.dest-dropdown-item');
    items.forEach((it) => {
      it.addEventListener('click', () => {
        const idx = parseInt(it.getAttribute('data-index') || '0', 10);
        const selected = this.currentMatches[idx];
        if (selected) {
          this.inputElement.value = selected.name;
          this.updateActiveChip(selected.id);
          this.closeDropdown();
          this.onSelectCallback(selected);
        }
      });
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.dropdownElement.style.display === 'none') return;

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
        this.inputElement.value = selected.name;
        this.updateActiveChip(selected.id);
        this.closeDropdown();
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
