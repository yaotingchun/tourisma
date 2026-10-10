import { MALAYSIA_GEO_DATA } from '../../data/malaysiaGeo';
import {
  STATE_ACCESSIBILITY_DATA,
  type AccessibilityMode,
  type StateAccessibilityItem,
} from '../../data/accessibilityData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class AccessibilityMap {
  public readonly element: HTMLElement;
  private currentMode: AccessibilityMode = 'road';
  private selectedStateId: string | null = null;
  private onSelectStateCallback?: (stateId: string | null) => void;
  private onModeChangeCallback?: (mode: AccessibilityMode) => void;
  private tooltipElement!: HTMLElement;
  private legendElement!: HTMLElement;

  constructor(
    onSelectState?: (stateId: string | null) => void,
    onModeChange?: (mode: AccessibilityMode) => void
  ) {
    this.onSelectStateCallback = onSelectState;
    this.onModeChangeCallback = onModeChange;
    this.element = document.createElement('div');
    this.element.className = 'access-card access-map-card';

    // Tooltip attached to document.body to avoid overflow clipping
    document.querySelectorAll('.access-floating-tooltip').forEach((el) => el.remove());
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'access-floating-tooltip';
    this.tooltipElement.style.display = 'none';
    document.body.appendChild(this.tooltipElement);

    this.render();
  }

  private render(): void {
    this.element.innerHTML = '';

    // 1. Header with Title and Mode Toggle
    const header = document.createElement('div');
    header.className = 'access-card-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'access-card-title-group';
    titleGroup.innerHTML = `
      <div class="access-card-badge">
        <span class="access-badge-dot" style="background-color: #2563eb;"></span>
        <span>SPATIAL COVERAGE DIAGNOSTIC</span>
      </div>
      <h3 class="access-card-title map-title-text">Tourism Accessibility Map</h3>
      <p class="access-card-subtitle map-subtitle-text">
        ${this.currentMode === 'road' ? 'Core assets within 1 km of main road network' : 'Core assets within 1 km of public transport facilities'}
      </p>
    `;

    const mapH3 = titleGroup.querySelector('h3')!;
    const mapInfoIcon = createInfoIcon({
      sourceOrg: 'DOSM GeoPadang, Prasarana & Tourism Malaysia POI Registry',
      datasetName: 'Tourism Asset Road & Transit Accessibility Map',
      referenceYear: '2025',
      measure: 'Choropleth map showing percentage of state tourism assets within 1 km of road or public transit network.',
      formula: 'State Access Rate = (Assets within 1 km / Total State Assets) × 100',
      limitations: 'Proximity-based; does not factor road quality, service frequency, or seasonal closures.',
    });
    mapInfoIcon.style.marginLeft = '6px';
    mapInfoIcon.style.verticalAlign = 'middle';
    mapH3.appendChild(mapInfoIcon);

    // Segmented Mode Toggle [Road] [Public Transport]
    const toggleWrap = document.createElement('div');
    toggleWrap.className = 'access-segmented-control';
    toggleWrap.setAttribute('role', 'radiogroup');

    const roadBtn = document.createElement('button');
    roadBtn.className = `access-segment-btn ${this.currentMode === 'road' ? 'active' : ''}`;
    roadBtn.setAttribute('data-mode', 'road');
    roadBtn.textContent = 'Road Network';
    roadBtn.addEventListener('click', () => this.setMode('road'));

    const ptBtn = document.createElement('button');
    ptBtn.className = `access-segment-btn ${this.currentMode === 'pt' ? 'active' : ''}`;
    ptBtn.setAttribute('data-mode', 'pt');
    ptBtn.textContent = 'Public Transport';
    ptBtn.addEventListener('click', () => this.setMode('pt'));

    toggleWrap.appendChild(roadBtn);
    toggleWrap.appendChild(ptBtn);

    header.appendChild(titleGroup);
    header.appendChild(toggleWrap);
    this.element.appendChild(header);

    // 2. Map Stage
    const stage = document.createElement('div');
    stage.className = 'access-map-stage';

    // SVG wrapper
    const svgWrap = document.createElement('div');
    svgWrap.className = 'access-map-svg-wrap';
    svgWrap.innerHTML = this.renderMapSvg();
    stage.appendChild(svgWrap);

    // Legend
    this.legendElement = document.createElement('div');
    this.legendElement.className = 'access-map-legend';
    this.renderLegend();
    stage.appendChild(this.legendElement);

    this.element.appendChild(stage);

    this.attachSvgEvents();
  }

  public setMode(mode: AccessibilityMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;

    // Update toggle buttons
    const btns = this.element.querySelectorAll<HTMLButtonElement>('.access-segment-btn');
    btns.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });

    // Update subtitle
    const subEl = this.element.querySelector('.map-subtitle-text');
    if (subEl) {
      subEl.textContent =
        mode === 'road'
          ? 'Core assets within 1 km of main road network'
          : 'Core assets within 1 km of public transport facilities';
    }

    // Update fills
    this.updateMapColors();
    this.renderLegend();

    if (this.onModeChangeCallback) {
      this.onModeChangeCallback(mode);
    }
  }

  public setSelectedState(stateId: string | null): void {
    this.selectedStateId = stateId;

    const paths = this.element.querySelectorAll<SVGPathElement>('.access-state-path');
    paths.forEach((path) => {
      const pid = path.getAttribute('data-state-id');
      if (pid === this.selectedStateId) {
        path.classList.add('selected');
      } else {
        path.classList.remove('selected');
      }
    });
  }

  private getColorForPct(pct: number): string {
    if (this.currentMode === 'road') {
      // Royal Blue Palette
      if (pct >= 85) return '#1e3a8a';
      if (pct >= 60) return '#2563eb';
      if (pct >= 40) return '#60a5fa';
      if (pct >= 25) return '#93c5fd';
      return '#dbeafe';
    } else {
      // Emerald Green Palette
      if (pct >= 85) return '#064e3b';
      if (pct >= 60) return '#059669';
      if (pct >= 40) return '#10b981';
      if (pct >= 25) return '#6ee7b7';
      return '#d1fae5';
    }
  }

  private updateMapColors(): void {
    const paths = this.element.querySelectorAll<SVGPathElement>('.access-state-path');
    paths.forEach((path) => {
      const stateId = path.getAttribute('data-state-id');
      if (!stateId) return;
      const data = STATE_ACCESSIBILITY_DATA[stateId];
      if (data) {
        const pct = this.currentMode === 'road' ? data.roadGoodPct : data.ptGoodPct;
        path.setAttribute('fill', this.getColorForPct(pct));
      }
    });
  }

  private renderLegend(): void {
    const isRoad = this.currentMode === 'road';
    const colors = isRoad
      ? ['#dbeafe', '#93c5fd', '#60a5fa', '#2563eb', '#1e3a8a']
      : ['#d1fae5', '#6ee7b7', '#10b981', '#059669', '#064e3b'];

    this.legendElement.innerHTML = `
      <span class="access-legend-label">Accessibility Rate (≤ 1 km):</span>
      <div class="access-legend-scale">
        <span>&lt; 25%</span>
        <div class="access-legend-steps">
          ${colors.map((c) => `<div class="access-legend-block" style="background-color: ${c};"></div>`).join('')}
        </div>
        <span>85%+</span>
      </div>
    `;
  }

  private renderMapSvg(): string {
    const pathsSvg = MALAYSIA_GEO_DATA.map((geo) => {
      const data = STATE_ACCESSIBILITY_DATA[geo.id];
      const pct = data ? (this.currentMode === 'road' ? data.roadGoodPct : data.ptGoodPct) : 0;
      const fill = this.getColorForPct(pct);
      const isSelected = geo.id === this.selectedStateId;

      return `
        <path
          class="access-state-path ${isSelected ? 'selected' : ''}"
          data-state-id="${geo.id}"
          d="${geo.svgPath}"
          fill="${fill}"
        />
      `;
    }).join('');

    const keyLabels = [
      { id: 'perlis', name: 'Perlis', x: 45, y: 78 },
      { id: 'kedah', name: 'Kedah', x: 65, y: 110 },
      { id: 'penang', name: 'Penang', x: 26, y: 138 },
      { id: 'perak', name: 'Perak', x: 88, y: 180 },
      { id: 'kelantan', name: 'Kelantan', x: 136, y: 145 },
      { id: 'terengganu', name: 'Terengganu', x: 190, y: 175 },
      { id: 'pahang', name: 'Pahang', x: 165, y: 255 },
      { id: 'selangor', name: 'Selangor', x: 68, y: 275 },
      { id: 'kuala_lumpur', name: 'KL', x: 95, y: 290 },
      { id: 'negeri_sembilan', name: 'N. Sembilan', x: 98, y: 320 },
      { id: 'melaka', name: 'Melaka', x: 130, y: 350 },
      { id: 'johor', name: 'Johor', x: 195, y: 355 },
      { id: 'sarawak', name: 'Sarawak', x: 674, y: 340 },
      { id: 'sabah', name: 'Sabah', x: 840, y: 160 },
    ];

    const labelsSvg = keyLabels
      .map(
        (lbl) => `
      <text
        x="${lbl.x}"
        y="${lbl.y}"
        font-size="9"
        font-weight="750"
        fill="#0f172a"
        text-anchor="middle"
        style="pointer-events: none; paint-order: stroke; stroke: #ffffff; stroke-width: 2.5px; stroke-linejoin: round;"
      >
        ${lbl.name}
      </text>
    `
      )
      .join('');

    return `
      <svg
        viewBox="0 0 1000 440"
        preserveAspectRatio="xMidYMid meet"
        class="access-malaysia-svg"
      >
        <g class="access-paths-group">${pathsSvg}</g>
        <g class="access-labels-group">${labelsSvg}</g>
      </svg>
    `;
  }

  private attachSvgEvents(): void {
    const paths = this.element.querySelectorAll<SVGPathElement>('.access-state-path');
    const svgWrap = this.element.querySelector<HTMLElement>('.access-map-svg-wrap');

    paths.forEach((path) => {
      path.addEventListener('mouseenter', (e: MouseEvent) => {
        const stateId = path.getAttribute('data-state-id');
        if (!stateId) return;
        const data = STATE_ACCESSIBILITY_DATA[stateId];
        if (!data) return;

        this.showTooltip(data, e);
      });

      path.addEventListener('mousemove', (e: MouseEvent) => {
        this.positionTooltip(e);
      });

      path.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });

      path.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        const stateId = path.getAttribute('data-state-id');
        if (!stateId) return;

        const next = this.selectedStateId === stateId ? null : stateId;
        this.setSelectedState(next);
        if (this.onSelectStateCallback) {
          this.onSelectStateCallback(next);
        }
        const data = STATE_ACCESSIBILITY_DATA[stateId];
        if (next && data) {
          this.showTooltip(data, e);
        } else {
          this.hideTooltip();
        }
      });
    });

    // Clicking outside paths clears selection
    svgWrap?.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'path') {
        if (this.selectedStateId !== null) {
          this.setSelectedState(null);
          if (this.onSelectStateCallback) {
            this.onSelectStateCallback(null);
          }
          this.hideTooltip();
        }
      }
    });
  }

  private showTooltip(data: StateAccessibilityItem, e: MouseEvent): void {
    const detail = this.currentMode === 'road' ? data.road : data.pt;
    const modeLabel = this.currentMode === 'road' ? 'Road' : 'PT';
    const isSelected = this.selectedStateId === data.id;

    const badgeClass = detail.goodPct >= 70 ? 'high' : detail.goodPct >= 40 ? 'moderate' : 'low';

    this.tooltipElement.innerHTML = `
      <div class="map-tooltip-header">
        <span class="map-tooltip-title">${data.name}</span>
        <span class="map-tooltip-quadrant ${badgeClass}">${detail.goodPct.toFixed(1)}% ${modeLabel} Access</span>
      </div>
      <div class="map-tooltip-body">
        <div class="map-tooltip-metric-row">
          <span>Total Tourism Assets:</span>
          <strong>${data.coreAssets.toLocaleString()} assets</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Good Access (≤ 1 km):</span>
          <strong>${detail.goodPct.toFixed(1)}% (${(detail.highCount + detail.moderateCount).toLocaleString()})</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>High Access (≤ 500 m):</span>
          <strong>${detail.highPct.toFixed(1)}% (${detail.highCount.toLocaleString()})</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Moderate (500m – 1km):</span>
          <strong>${detail.moderatePct.toFixed(1)}% (${detail.moderateCount.toLocaleString()})</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Limited / Remote (&gt; 1km):</span>
          <strong>${(detail.lowPct + detail.remotePct).toFixed(1)}% (${(detail.lowCount + detail.remoteCount).toLocaleString()})</strong>
        </div>
      </div>
      <div class="map-tooltip-footer">
        ${isSelected ? '● Active state • Click to deselect' : 'Click state to filter charts →'}
      </div>
    `;
    this.tooltipElement.style.display = 'block';
    this.positionTooltip(e);
  }

  private positionTooltip(e: MouseEvent): void {
    const tooltipW = 230;
    const tooltipH = 175;
    const pad = 16;

    let x = e.clientX + 16;
    let y = e.clientY + 16;

    if (x + tooltipW > window.innerWidth - pad) {
      x = e.clientX - tooltipW - 12;
    }
    if (y + tooltipH > window.innerHeight - pad) {
      y = e.clientY - tooltipH - 12;
    }
    if (x < pad) x = pad;
    if (y < pad) y = pad;

    this.tooltipElement.style.left = `${x}px`;
    this.tooltipElement.style.top = `${y}px`;
  }

  private hideTooltip(): void {
    this.tooltipElement.style.display = 'none';
  }

  public destroy(): void {
    if (this.tooltipElement) {
      this.tooltipElement.remove();
    }
  }
}
