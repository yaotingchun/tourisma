import {
  STATE_ACCESSIBILITY_DATA,
  ACCESSIBILITY_TIERS,
  type AccessibilityMode,
  type StateAccessibilityItem,
} from '../../data/accessibilityData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class AccessibilityStackedBarChart {
  public readonly element: HTMLElement;
  private currentMode: AccessibilityMode = 'road';
  private selectedStateId: string | null = null;
  private onSelectStateCallback?: (stateId: string | null) => void;
  private onModeChangeCallback?: (mode: AccessibilityMode) => void;
  private listContainer!: HTMLElement;

  constructor(
    onSelectState?: (stateId: string | null) => void,
    onModeChange?: (mode: AccessibilityMode) => void
  ) {
    this.onSelectStateCallback = onSelectState;
    this.onModeChangeCallback = onModeChange;
    this.element = document.createElement('div');
    this.element.className = 'access-card access-stacked-bar-card';
    this.render();
  }

  public setMode(mode: AccessibilityMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;

    // Update buttons
    const btns = this.element.querySelectorAll<HTMLButtonElement>('.access-segment-btn');
    btns.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });

    // Update subtitle
    const subEl = this.element.querySelector('.stacked-bar-subtitle');
    if (subEl) {
      subEl.textContent =
        mode === 'road'
          ? 'Proportion of tourism assets across 4 road proximity tiers (≤500m, 500m-1km, 1-3km, >3km)'
          : 'Proportion of tourism assets across 4 public transport proximity tiers (≤500m, 500m-1km, 1-3km, >3km)';
    }

    this.renderRows();

    if (this.onModeChangeCallback) {
      this.onModeChangeCallback(mode);
    }
  }

  public setSelectedState(stateId: string | null): void {
    this.selectedStateId = stateId;

    const rows = this.element.querySelectorAll<HTMLElement>('.access-bar-row');
    rows.forEach((row) => {
      const rid = row.getAttribute('data-state-id');
      if (rid === this.selectedStateId) {
        row.classList.add('selected');
      } else {
        row.classList.remove('selected');
      }
    });
  }

  private render(): void {
    this.element.innerHTML = '';

    // 1. Header
    const header = document.createElement('div');
    header.className = 'access-card-header';
    header.style.flexWrap = 'wrap';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'access-card-title-group';
    titleGroup.innerHTML = `
      <div class="access-card-badge">
        <span class="access-badge-dot" style="background-color: #10b981;"></span>
        <span>100% STACKED BAR BENCHMARK</span>
      </div>
      <h3 class="access-card-title">Tourism Asset Accessibility by State</h3>
      <p class="access-card-subtitle stacked-bar-subtitle">
        ${this.currentMode === 'road' ? 'Proportion of tourism assets across 4 road proximity tiers (≤500m, 500m-1km, 1-3km, >3km)' : 'Proportion of tourism assets across 4 public transport proximity tiers (≤500m, 500m-1km, 1-3km, >3km)'}
      </p>
    `;

    const barH3 = titleGroup.querySelector('h3')!;
    const barInfoIcon = createInfoIcon({
      sourceOrg: 'DOSM GeoPadang & Tourism Malaysia POI Registry',
      datasetName: 'State Tourism Asset Accessibility Tier Distribution',
      referenceYear: '2025',
      measure: 'Stacked percentage breakdown of tourism assets across 4 proximity tiers to road or public transport per state.',
      formula: 'Tier % = (Assets in tier / Total state assets) × 100; tiers: ≤500m, 500m-1km, 1-3km, >3km',
      limitations: 'Tier thresholds are straight-line; actual walkability depends on terrain and infrastructure quality.',
    });
    barInfoIcon.style.marginLeft = '6px';
    barInfoIcon.style.verticalAlign = 'middle';
    barH3.appendChild(barInfoIcon);

    // Right header controls: 4-Tier Legend strip + Mode toggle
    const controlsWrap = document.createElement('div');
    controlsWrap.style.display = 'flex';
    controlsWrap.style.alignItems = 'center';
    controlsWrap.style.gap = '16px';
    controlsWrap.style.flexWrap = 'wrap';

    // 4-Tier Legend
    const legendStrip = document.createElement('div');
    legendStrip.className = 'access-stacked-legend-strip';
    legendStrip.innerHTML = ACCESSIBILITY_TIERS.map(
      (tier) => `
      <div class="access-stacked-legend-item" title="${tier.description}">
        <span class="access-stacked-legend-pill" style="background-color: ${tier.color};"></span>
        <span><strong>${tier.label}</strong> (${tier.threshold})</span>
      </div>
    `
    ).join('');

    // Toggle
    const toggleWrap = document.createElement('div');
    toggleWrap.className = 'access-segmented-control';

    const roadBtn = document.createElement('button');
    roadBtn.className = `access-segment-btn ${this.currentMode === 'road' ? 'active' : ''}`;
    roadBtn.setAttribute('data-mode', 'road');
    roadBtn.textContent = 'Road';
    roadBtn.addEventListener('click', () => this.setMode('road'));

    const ptBtn = document.createElement('button');
    ptBtn.className = `access-segment-btn ${this.currentMode === 'pt' ? 'active' : ''}`;
    ptBtn.setAttribute('data-mode', 'pt');
    ptBtn.textContent = 'Public Transport';
    ptBtn.addEventListener('click', () => this.setMode('pt'));

    toggleWrap.appendChild(roadBtn);
    toggleWrap.appendChild(ptBtn);

    controlsWrap.appendChild(legendStrip);
    controlsWrap.appendChild(toggleWrap);

    header.appendChild(titleGroup);
    header.appendChild(controlsWrap);
    this.element.appendChild(header);

    // 2. Rows Container
    this.listContainer = document.createElement('div');
    this.listContainer.className = 'access-stacked-bars-list';
    this.element.appendChild(this.listContainer);

    this.renderRows();
  }

  private renderRows(): void {
    this.listContainer.innerHTML = '';

    const items: StateAccessibilityItem[] = Object.values(STATE_ACCESSIBILITY_DATA);

    // Sort descending by total Good Access (<= 1 km: High + Moderate)
    items.sort((a, b) => {
      const detailA = this.currentMode === 'road' ? a.road : a.pt;
      const detailB = this.currentMode === 'road' ? b.road : b.pt;
      return detailB.goodPct - detailA.goodPct;
    });

    items.forEach((item) => {
      const detail = this.currentMode === 'road' ? item.road : item.pt;
      const isSelected = item.id === this.selectedStateId;

      const row = document.createElement('div');
      row.className = `access-bar-row ${isSelected ? 'selected' : ''}`;
      row.setAttribute('data-state-id', item.id);
      row.title = `${item.name} (${item.coreAssets} assets):\n• High Access (≤500m): ${detail.highPct}% (${detail.highCount})\n• Moderate Access (500m-1km): ${detail.moderatePct}% (${detail.moderateCount})\n• Low Access (1-3km): ${detail.lowPct}% (${detail.lowCount})\n• Remote (>3km): ${detail.remotePct}% (${detail.remoteCount})`;

      // 1. Label
      const labelCol = document.createElement('div');
      labelCol.className = 'access-bar-state-label';
      labelCol.innerHTML = `
        <span class="access-bar-state-name">${item.name}</span>
        <span class="access-bar-state-sub">${item.coreAssets.toLocaleString()} core attractions</span>
      `;

      // 2. 100% Track with 4 Tiers
      const track = document.createElement('div');
      track.className = 'access-bar-track';

      // 🟢 High Access (≤ 500 m)
      const highSegment = document.createElement('div');
      highSegment.className = 'access-bar-segment high';
      highSegment.style.width = `${detail.highPct}%`;
      highSegment.title = `High Access (≤ 500 m): ${detail.highPct.toFixed(1)}% (${detail.highCount} assets)`;
      if (detail.highPct >= 7) {
        highSegment.innerHTML = `<span class="access-segment-pct-text">${detail.highPct.toFixed(1)}%</span>`;
      }

      // 🟡 Moderate Access (> 500 m – 1 km)
      const modSegment = document.createElement('div');
      modSegment.className = 'access-bar-segment moderate';
      modSegment.style.width = `${detail.moderatePct}%`;
      modSegment.title = `Moderate Access (> 500 m – 1 km): ${detail.moderatePct.toFixed(1)}% (${detail.moderateCount} assets)`;
      if (detail.moderatePct >= 7) {
        modSegment.innerHTML = `<span class="access-segment-pct-text">${detail.moderatePct.toFixed(1)}%</span>`;
      }

      // 🟠 Low Access (> 1 – 3 km)
      const lowSegment = document.createElement('div');
      lowSegment.className = 'access-bar-segment low';
      lowSegment.style.width = `${detail.lowPct}%`;
      lowSegment.title = `Low Access (> 1 – 3 km): ${detail.lowPct.toFixed(1)}% (${detail.lowCount} assets)`;
      if (detail.lowPct >= 7) {
        lowSegment.innerHTML = `<span class="access-segment-pct-text">${detail.lowPct.toFixed(1)}%</span>`;
      }

      // 🔴 Remote (> 3 km)
      const remoteSegment = document.createElement('div');
      remoteSegment.className = 'access-bar-segment remote';
      remoteSegment.style.width = `${detail.remotePct}%`;
      remoteSegment.title = `Remote (> 3 km): ${detail.remotePct.toFixed(1)}% (${detail.remoteCount} assets)`;
      if (detail.remotePct >= 7) {
        remoteSegment.innerHTML = `<span class="access-segment-pct-text">${detail.remotePct.toFixed(1)}%</span>`;
      }

      track.appendChild(highSegment);
      track.appendChild(modSegment);
      track.appendChild(lowSegment);
      track.appendChild(remoteSegment);

      // 3. Meta Col
      const metaCol = document.createElement('div');
      metaCol.className = 'access-bar-meta-col';
      metaCol.innerHTML = `
        <span class="access-meta-good" title="Total ≤ 1 km (High + Moderate)">${detail.goodPct.toFixed(1)}%</span>
        <span class="access-meta-sep" title="Total > 1 km (Low + Remote)">/</span>
        <span class="access-meta-limited" title="Total > 1 km (Low + Remote)">${detail.limitedPct.toFixed(1)}%</span>
      `;

      row.appendChild(labelCol);
      row.appendChild(track);
      row.appendChild(metaCol);

      row.addEventListener('click', () => {
        const next = this.selectedStateId === item.id ? null : item.id;
        this.setSelectedState(next);
        if (this.onSelectStateCallback) {
          this.onSelectStateCallback(next);
        }
      });

      this.listContainer.appendChild(row);
    });
  }
}
