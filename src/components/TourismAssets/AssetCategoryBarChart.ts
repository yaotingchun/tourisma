import {
  ASSET_BREAKDOWN_ALL,
  ASSET_BREAKDOWN_CORE,
  ASSET_BREAKDOWN_SUPPORTING,
  ASSET_CATEGORY_COLORS,
  type AssetCategoryItem,
} from '../../data/tourismAssetsData';
import { createInfoIcon } from '../Common/InfoTooltip';

type SegmentMode = 'all' | 'core' | 'supporting';

export class AssetCategoryBarChart {
  public readonly element: HTMLElement;
  private currentMode: SegmentMode = 'all';
  private barsContainer!: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'asset-card';
    this.render();
  }

  private render(): void {
    this.element.innerHTML = '';

    // Card Header
    const header = document.createElement('div');
    header.className = 'asset-card-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'asset-card-title-group';
    titleGroup.innerHTML = `
      <div class="asset-card-badge">
        <span class="asset-badge-dot"></span>
        <span>INVENTORY BREAKDOWN</span>
      </div>
      <h3 class="asset-card-title">Tourism Assets by Category</h3>
      <p class="asset-card-subtitle">Volume distribution across core attraction clusters and supporting services</p>
    `;

    const catH3 = titleGroup.querySelector('h3')!;
    const catInfoIcon = createInfoIcon({
      sourceOrg: 'DOSM & Tourism Malaysia POI Registry',
      datasetName: 'Tourism Asset Category Breakdown Bar Chart',
      referenceYear: '2025',
      measure: 'Horizontal bar chart showing asset counts across tourism POI categories, switchable between all, core, and supporting asset segments.',
      formula: 'Category Count = Sum of all registered POIs in that category at national or state level',
      limitations: 'Category boundaries follow Tourism Malaysia\'s official POI classification schema; cross-category assets counted once.',
    });
    catInfoIcon.style.marginLeft = '6px';
    catInfoIcon.style.verticalAlign = 'middle';
    catH3.appendChild(catInfoIcon);

    // Segmented Toggle
    const toggle = document.createElement('div');
    toggle.className = 'asset-segmented-control';
    toggle.setAttribute('role', 'radiogroup');
    toggle.setAttribute('aria-label', 'Asset Category View Toggle');

    const options: { id: SegmentMode; label: string }[] = [
      { id: 'all', label: 'All Assets' },
      { id: 'core', label: 'Core' },
      { id: 'supporting', label: 'Supporting' },
    ];

    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `asset-segment-btn ${this.currentMode === opt.id ? 'active' : ''}`;
      btn.textContent = opt.label;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(this.currentMode === opt.id));

      btn.addEventListener('click', () => {
        if (this.currentMode !== opt.id) {
          this.setMode(opt.id);
        }
      });

      toggle.appendChild(btn);
    });

    header.appendChild(titleGroup);
    header.appendChild(toggle);
    this.element.appendChild(header);

    // Bars List Container
    this.barsContainer = document.createElement('div');
    this.barsContainer.className = 'asset-category-bars-list';
    this.element.appendChild(this.barsContainer);

    this.renderBars();
  }

  public setMode(mode: SegmentMode): void {
    this.currentMode = mode;

    // Update active button state
    const buttons = this.element.querySelectorAll<HTMLButtonElement>('.asset-segment-btn');
    buttons.forEach((btn) => {
      const isActive = btn.textContent?.toLowerCase().includes(mode) || false;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', String(isActive));
    });

    this.renderBars();
  }

  private renderBars(): void {
    this.barsContainer.innerHTML = '';

    let data: AssetCategoryItem[];
    if (this.currentMode === 'core') {
      data = ASSET_BREAKDOWN_CORE;
    } else if (this.currentMode === 'supporting') {
      data = ASSET_BREAKDOWN_SUPPORTING;
    } else {
      data = ASSET_BREAKDOWN_ALL;
    }

    const maxVal = Math.max(...data.map((d) => d.count), 1);

    data.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'category-bar-row';

      // Label
      const label = document.createElement('span');
      label.className = 'category-bar-label';
      label.textContent = item.category;
      label.title = item.category;

      // Track & Fill
      const track = document.createElement('div');
      track.className = 'category-bar-track';

      const fill = document.createElement('div');
      fill.className = 'category-bar-fill';
      const color = ASSET_CATEGORY_COLORS[item.category] || '#2563eb';
      fill.style.backgroundColor = color;
      
      const widthPct = Math.max(3, (item.count / maxVal) * 100);
      fill.style.width = `${widthPct}%`;

      track.appendChild(fill);

      // Values
      const values = document.createElement('div');
      values.className = 'category-bar-values';

      const count = document.createElement('span');
      count.className = 'category-bar-count';
      count.textContent = item.count.toLocaleString();

      const pct = document.createElement('span');
      pct.className = 'category-bar-pct';
      pct.textContent = `(${item.percentage}%)`;

      values.appendChild(count);
      values.appendChild(pct);

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(values);

      this.barsContainer.appendChild(row);
    });
  }
}
