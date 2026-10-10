import {
  STATE_PORTFOLIO_DIVERSITY_DATA,
  type StatePortfolioDiversityItem,
  type StatePortfolioDiversitySegment,
} from '../../data/tourismAssetsData';
import { createInfoIcon } from '../Common/InfoTooltip';

type SortMode =
  | 'total'
  | 'Attractions & Landmarks'
  | 'Heritage & Culture'
  | 'Nature & Outdoors'
  | 'Museums & Galleries';

interface SortOptionItem {
  id: SortMode;
  label: string;
  shortLabel: string;
  dotColor: string;
}

const SORT_OPTIONS: SortOptionItem[] = [
  { id: 'total', label: 'Total Assets', shortLabel: 'Total Core', dotColor: '#2563eb' },
  { id: 'Attractions & Landmarks', label: 'Attractions', shortLabel: 'Attractions', dotColor: '#2f4fa8' },
  { id: 'Heritage & Culture', label: 'Heritage', shortLabel: 'Heritage', dotColor: '#169d74' },
  { id: 'Nature & Outdoors', label: 'Nature', shortLabel: 'Nature', dotColor: '#dc8522' },
  { id: 'Museums & Galleries', label: 'Museums', shortLabel: 'Museums', dotColor: '#209aa4' },
];

interface CategoryMeta {
  name: string;
  color: string;
  count: number;
  percentage: number;
}

const CATEGORY_META: CategoryMeta[] = [
  { name: 'Attractions & Landmarks', color: '#2f4fa8', count: 1044, percentage: 19.0 },
  { name: 'Heritage & Culture', color: '#169d74', count: 1868, percentage: 34.0 },
  { name: 'Museums & Galleries', color: '#209aa4', count: 356, percentage: 6.5 },
  { name: 'Amusement & Wildlife', color: '#7c3aed', count: 147, percentage: 2.7 },
  { name: 'Nature & Outdoors', color: '#dc8522', count: 2076, percentage: 37.8 },
];

export class StatePortfolioDiversityChart {
  public readonly element: HTMLElement;
  private selectedStateId: string | null = null;
  private currentSort: SortMode = 'total';
  private hoveredCategory: string | null = null;
  private onSelectStateCallback?: (stateId: string | null) => void;
  private rowsContainer!: HTMLElement;
  private headerResetBtnWrap!: HTMLElement;
  private sortControlContainer!: HTMLElement;
  private subtitleEl!: HTMLElement;
  private scaleTotalCol!: HTMLElement;
  private tooltipEl!: HTMLElement;

  constructor(onSelectState?: (stateId: string | null) => void) {
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'asset-card diversity-chart-card';
    this.render();
  }

  public setSelectedState(stateId: string | null): void {
    this.selectedStateId = stateId;
    this.updateSelectionUi();
  }

  private updateSelectionUi(): void {
    const rows = this.rowsContainer.querySelectorAll<HTMLElement>('.diversity-row');
    rows.forEach((row) => {
      const rowId = row.getAttribute('data-state-id');
      const isSelected = !!(this.selectedStateId && rowId === this.selectedStateId);
      row.classList.toggle('selected', isSelected);
    });

    // Update Reset button in header
    if (this.headerResetBtnWrap) {
      if (this.selectedStateId) {
        const item = STATE_PORTFOLIO_DIVERSITY_DATA.find((d) => d.id === this.selectedStateId);
        const stateName = item ? item.state : this.selectedStateId;
        this.headerResetBtnWrap.innerHTML = `
          <button type="button" class="diversity-reset-filter-btn" title="Click to clear state filter and return to national view">
            <span class="diversity-filter-dot"></span>
            <span>Filtered: <strong>${stateName}</strong></span>
            <span class="diversity-filter-close">×</span>
          </button>
        `;
        const btn = this.headerResetBtnWrap.querySelector('button');
        btn?.addEventListener('click', () => {
          this.setSelectedState(null);
          if (this.onSelectStateCallback) {
            this.onSelectStateCallback(null);
          }
        });
      } else {
        this.headerResetBtnWrap.innerHTML = '';
      }
    }
  }

  private getSubtitleText(): string {
    if (this.currentSort === 'total') {
      return '100% stacked horizontal distribution across all 16 states & federal territories (sorted by total core assets)';
    }
    return `100% stacked horizontal distribution across all 16 states & federal territories (ranked by ${this.currentSort} volume)`;
  }

  public setSortMode(mode: SortMode): void {
    this.currentSort = mode;

    // Update buttons UI
    const buttons = this.sortControlContainer.querySelectorAll<HTMLButtonElement>('.diversity-sort-btn');
    buttons.forEach((btn) => {
      const btnId = btn.getAttribute('data-sort-id');
      const isActive = btnId === mode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', String(isActive));
    });

    // Update subtitle text
    if (this.subtitleEl) {
      this.subtitleEl.textContent = this.getSubtitleText();
    }

    // Update scale header total column label
    if (this.scaleTotalCol) {
      const opt = SORT_OPTIONS.find((o) => o.id === mode);
      this.scaleTotalCol.textContent = mode === 'total' ? 'Total Core' : `${opt?.shortLabel || 'Core'} Sites`;
    }

    // Highlight category in bars if sorted by category
    this.hoveredCategory = mode === 'total' ? null : mode;
    this.updateCategoryHighlights();

    // Re-render rows
    this.renderChartRows();
  }

  private render(): void {
    this.element.innerHTML = '';

    // 1. Header with Badge, Title, Subtitle, and Controls
    const header = document.createElement('div');
    header.className = 'asset-card-header diversity-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'asset-card-title-group';

    const badge = document.createElement('div');
    badge.className = 'asset-card-badge';
    badge.innerHTML = `
      <span class="asset-badge-dot" style="background-color: #dc8522;"></span>
      <span>PORTFOLIO DIVERSITY</span>
    `;

    const title = document.createElement('h3');
    title.className = 'asset-card-title';
    title.textContent = 'State Attraction Portfolio Diversity by Category';

    this.subtitleEl = document.createElement('p');
    this.subtitleEl.className = 'asset-card-subtitle';
    this.subtitleEl.textContent = this.getSubtitleText();

    titleGroup.appendChild(badge);
    titleGroup.appendChild(title);
    titleGroup.appendChild(this.subtitleEl);

    // Controls on the right (Filter reset + Sort button group)
    const controlsWrap = document.createElement('div');
    controlsWrap.className = 'diversity-header-controls';

    // State Filter Reset Container
    this.headerResetBtnWrap = document.createElement('div');
    this.headerResetBtnWrap.className = 'diversity-reset-wrap';

    // Sort buttons: Total + 4 Categories
    this.sortControlContainer = document.createElement('div');
    this.sortControlContainer.className = 'asset-segmented-control diversity-sort-control';
    this.sortControlContainer.setAttribute('role', 'radiogroup');
    this.sortControlContainer.setAttribute('aria-label', 'Sort state attraction diversity');

    SORT_OPTIONS.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `diversity-sort-btn ${this.currentSort === opt.id ? 'active' : ''}`;
      btn.setAttribute('data-sort-id', opt.id);
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(this.currentSort === opt.id));
      btn.title = opt.id === 'total' ? 'Sort by total core assets count' : `Sort by number of ${opt.id} sites`;

      btn.innerHTML = `
        <span class="diversity-btn-dot" style="background-color: ${opt.dotColor};"></span>
        <span>${opt.label}</span>
      `;

      btn.addEventListener('click', () => {
        this.setSortMode(opt.id);
      });

      this.sortControlContainer.appendChild(btn);
    });

    controlsWrap.appendChild(this.headerResetBtnWrap);
    controlsWrap.appendChild(this.sortControlContainer);

    const infoIcon = createInfoIcon({
      sourceOrg: 'MOTAC National Attraction Registry & State Tourism Boards',
      datasetName: 'State Attraction Portfolio Category Distribution Stack',
      referenceYear: '2025 / 2026',
      measure: 'Proportional and absolute breakdown of 5,491 core attractions across 5 primary categories in all 16 states.',
      formula: 'Stacked category segments: Attractions & Landmarks, Heritage & Culture, Nature, Museums, and Wildlife',
      limitations: 'Attractions classified by dominant operational primary focus; interactive sorting dynamically reorganizes rank order.',
    });
    controlsWrap.appendChild(infoIcon);

    header.appendChild(titleGroup);
    header.appendChild(controlsWrap);
    this.element.appendChild(header);

    // 2. Interactive Category Legend Bar
    const legendEl = document.createElement('div');
    legendEl.className = 'diversity-legend-bar';
    legendEl.setAttribute('role', 'list');
    legendEl.setAttribute('aria-label', 'Attraction Category Legend');

    CATEGORY_META.forEach((cat) => {
      const item = document.createElement('div');
      item.className = 'diversity-legend-item';
      item.setAttribute('role', 'listitem');
      item.setAttribute('data-category', cat.name);
      item.title = `Click to sort by ${cat.name}, or hover to highlight`;

      item.innerHTML = `
        <span class="diversity-legend-swatch" style="background-color: ${cat.color};"></span>
        <span class="diversity-legend-name">${cat.name}</span>
        <span class="diversity-legend-stat">${cat.count.toLocaleString()} (${cat.percentage}%)</span>
      `;

      item.addEventListener('mouseenter', () => {
        this.setHoveredCategory(cat.name);
      });

      item.addEventListener('mouseleave', () => {
        this.setHoveredCategory(this.currentSort === 'total' ? null : this.currentSort);
      });

      item.addEventListener('click', () => {
        if (this.currentSort === cat.name) {
          this.setSortMode('total');
        } else {
          this.setSortMode(cat.name as SortMode);
        }
      });

      legendEl.appendChild(item);
    });

    this.element.appendChild(legendEl);

    // 3. Chart Container with 0-100% Scale Header and Rows
    const chartWrap = document.createElement('div');
    chartWrap.className = 'diversity-chart-wrapper';

    // Scale Header Row (0%, 20%, 40%, 60%, 80%, 100%)
    const scaleHeader = document.createElement('div');
    scaleHeader.className = 'diversity-scale-row';

    const scaleStateCol = document.createElement('div');
    scaleStateCol.className = 'diversity-scale-state-col';
    scaleStateCol.textContent = 'State / Territory';

    const scaleTrackCol = document.createElement('div');
    scaleTrackCol.className = 'diversity-scale-track-col';
    scaleTrackCol.innerHTML = `
      <span class="scale-tick" style="left: 0%;">0%</span>
      <span class="scale-tick" style="left: 20%;">20%</span>
      <span class="scale-tick" style="left: 40%;">40%</span>
      <span class="scale-tick" style="left: 60%;">60%</span>
      <span class="scale-tick" style="left: 80%;">80%</span>
      <span class="scale-tick" style="left: 100%;">100%</span>
    `;

    this.scaleTotalCol = document.createElement('div');
    this.scaleTotalCol.className = 'diversity-scale-total-col';
    this.scaleTotalCol.textContent = 'Total Core';

    scaleHeader.appendChild(scaleStateCol);
    scaleHeader.appendChild(scaleTrackCol);
    scaleHeader.appendChild(this.scaleTotalCol);
    chartWrap.appendChild(scaleHeader);

    // Rows Container
    this.rowsContainer = document.createElement('div');
    this.rowsContainer.className = 'diversity-rows-container';
    chartWrap.appendChild(this.rowsContainer);

    this.element.appendChild(chartWrap);

    // 4. Floating Tooltip Element
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'diversity-tooltip';
    this.tooltipEl.style.display = 'none';
    document.body.appendChild(this.tooltipEl);

    // Render initial rows
    this.renderChartRows();
  }

  private setHoveredCategory(category: string | null): void {
    this.hoveredCategory = category;
    this.updateCategoryHighlights();
  }

  private updateCategoryHighlights(): void {
    const category = this.hoveredCategory;

    // Update legend active styling
    const legendItems = this.element.querySelectorAll<HTMLElement>('.diversity-legend-item');
    legendItems.forEach((item) => {
      const cat = item.getAttribute('data-category');
      if (!category) {
        item.classList.remove('active', 'dimmed');
      } else if (cat === category) {
        item.classList.add('active');
        item.classList.remove('dimmed');
      } else {
        item.classList.remove('active');
        item.classList.add('dimmed');
      }
    });

    // Update segment highlighting
    const segments = this.rowsContainer.querySelectorAll<HTMLElement>('.diversity-bar-segment');
    segments.forEach((seg) => {
      const cat = seg.getAttribute('data-category');
      if (!category) {
        seg.classList.remove('highlighted', 'dimmed');
      } else if (cat === category) {
        seg.classList.add('highlighted');
        seg.classList.remove('dimmed');
      } else {
        seg.classList.remove('highlighted');
        seg.classList.add('dimmed');
      }
    });
  }

  private getSortedData(): StatePortfolioDiversityItem[] {
    const data = [...STATE_PORTFOLIO_DIVERSITY_DATA];

    if (this.currentSort === 'total') {
      return data.sort((a, b) => b.totalCoreAssets - a.totalCoreAssets);
    }

    const targetCategory = this.currentSort;
    return data.sort((a, b) => {
      const aSeg = a.segments.find((s) => s.category === targetCategory);
      const bSeg = b.segments.find((s) => s.category === targetCategory);
      const aCount = aSeg?.count || 0;
      const bCount = bSeg?.count || 0;
      if (bCount !== aCount) {
        return bCount - aCount;
      }
      return b.totalCoreAssets - a.totalCoreAssets;
    });
  }

  private renderChartRows(): void {
    this.rowsContainer.innerHTML = '';
    const sortedData = this.getSortedData();

    sortedData.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'diversity-row';
      row.setAttribute('data-state-id', item.id);
      row.setAttribute('data-state-name', item.state);

      const isSelected = this.selectedStateId === item.id;
      if (isSelected) {
        row.classList.add('selected');
      }

      // State Label
      const labelCol = document.createElement('div');
      labelCol.className = 'diversity-state-col';
      labelCol.innerHTML = `
        <span class="diversity-row-index">${index + 1}.</span>
        <span class="diversity-row-name" title="${item.state}">${item.state}</span>
      `;

      // Stacked Bar Track with grid lines
      const trackCol = document.createElement('div');
      trackCol.className = 'diversity-bar-track-col';

      // Background grid lines at 20%, 40%, 60%, 80%
      const gridLines = document.createElement('div');
      gridLines.className = 'diversity-grid-lines';
      gridLines.innerHTML = `
        <span class="grid-line" style="left: 20%;"></span>
        <span class="grid-line" style="left: 40%;"></span>
        <span class="grid-line" style="left: 60%;"></span>
        <span class="grid-line" style="left: 80%;"></span>
      `;
      trackCol.appendChild(gridLines);

      // The 100% Stacked Bar
      const bar = document.createElement('div');
      bar.className = 'diversity-stacked-bar';

      item.segments.forEach((seg) => {
        if (seg.count <= 0) return;

        const segmentEl = document.createElement('div');
        segmentEl.className = 'diversity-bar-segment';
        segmentEl.style.flex = `${seg.count} 1 0%`;
        segmentEl.style.backgroundColor = seg.color;
        segmentEl.setAttribute('data-category', seg.category);

        if (this.hoveredCategory) {
          if (seg.category === this.hoveredCategory) {
            segmentEl.classList.add('highlighted');
          } else {
            segmentEl.classList.add('dimmed');
          }
        }

        // Show percentage text inside segment if width is wide enough (>= 6%)
        if (seg.percentage >= 6.0) {
          const label = document.createElement('span');
          label.className = 'diversity-segment-pct';
          label.textContent = `${seg.percentage}%`;
          segmentEl.appendChild(label);
        }

        // Segment mouse events for tooltip
        segmentEl.addEventListener('mouseenter', (e) => {
          this.showTooltip(e, item, seg);
        });

        segmentEl.addEventListener('mousemove', (e) => {
          this.moveTooltip(e);
        });

        segmentEl.addEventListener('mouseleave', () => {
          this.hideTooltip();
        });

        bar.appendChild(segmentEl);
      });

      trackCol.appendChild(bar);

      // Total / Sorted Count Column
      const totalCol = document.createElement('div');
      totalCol.className = 'diversity-total-col';

      if (this.currentSort === 'total') {
        totalCol.innerHTML = `
          <span class="diversity-total-count">${item.totalCoreAssets.toLocaleString()}</span>
          <span class="diversity-total-unit">sites</span>
        `;
        totalCol.title = `${item.state}: ${item.totalCoreAssets.toLocaleString()} total core assets`;
      } else {
        const seg = item.segments.find((s) => s.category === this.currentSort);
        const count = seg ? seg.count : 0;
        const pct = seg ? seg.percentage : 0;
        totalCol.innerHTML = `
          <span class="diversity-total-count">${count.toLocaleString()}</span>
          <span class="diversity-total-unit" style="color: #64748b; font-size: 10.5px;">(${pct}%)</span>
        `;
        totalCol.title = `${item.state}: ${count.toLocaleString()} ${this.currentSort} sites (${pct}% of core portfolio)`;
      }

      row.appendChild(labelCol);
      row.appendChild(trackCol);
      row.appendChild(totalCol);

      // Click row to toggle state selection
      row.addEventListener('click', () => {
        const nextState = this.selectedStateId === item.id ? null : item.id;
        this.setSelectedState(nextState);
        if (this.onSelectStateCallback) {
          this.onSelectStateCallback(nextState);
        }
      });

      this.rowsContainer.appendChild(row);
    });

    this.updateSelectionUi();
  }

  private showTooltip(e: MouseEvent, item: StatePortfolioDiversityItem, seg: StatePortfolioDiversitySegment): void {
    this.tooltipEl.innerHTML = `
      <div class="diversity-tooltip-header">
        <span class="diversity-tooltip-state">${item.state}</span>
        <span class="diversity-tooltip-total">${item.totalCoreAssets.toLocaleString()} core sites</span>
      </div>
      <div class="diversity-tooltip-body">
        <div class="diversity-tooltip-category-row">
          <span class="diversity-tooltip-dot" style="background-color: ${seg.color};"></span>
          <span class="diversity-tooltip-cat-name">${seg.category}</span>
        </div>
        <div class="diversity-tooltip-stat-row">
          <span class="diversity-tooltip-val"><strong>${seg.count.toLocaleString()}</strong> sites</span>
          <span class="diversity-tooltip-pct">${seg.percentage}%</span>
        </div>
      </div>
      <div class="diversity-tooltip-footer">Click state row to filter map & twin ring charts</div>
    `;
    this.tooltipEl.style.display = 'block';
    this.moveTooltip(e);
  }

  private moveTooltip(e: MouseEvent): void {
    const offset = 14;
    let left = e.clientX + offset;
    let top = e.clientY + offset;

    const tooltipRect = this.tooltipEl.getBoundingClientRect();
    if (left + tooltipRect.width > window.innerWidth - 12) {
      left = e.clientX - tooltipRect.width - offset;
    }
    if (top + tooltipRect.height > window.innerHeight - 12) {
      top = e.clientY - tooltipRect.height - offset;
    }

    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
  }

  private hideTooltip(): void {
    this.tooltipEl.style.display = 'none';
  }

  public destroy(): void {
    if (this.tooltipEl && this.tooltipEl.parentNode) {
      this.tooltipEl.parentNode.removeChild(this.tooltipEl);
    }
  }
}
