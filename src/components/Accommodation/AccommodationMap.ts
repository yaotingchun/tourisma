import { MALAYSIA_GEO_DATA } from '../../data/malaysiaGeo';
import { ACCOMMODATION_DATA } from '../../data/accommodationData';
import { createInfoIcon } from '../Common/InfoTooltip';

export type MapToggleLayer = 'aor' | 'ratio';

interface KeyStateLabel {
  id: string;
  name: string;
  x: number;
  y: number;
}

const KEY_STATE_LABELS: KeyStateLabel[] = [
  { id: 'PLS', name: 'Perlis', x: 45, y: 78 },
  { id: 'KDH', name: 'Kedah', x: 65, y: 110 },
  { id: 'PNG', name: 'Penang', x: 26, y: 138 },
  { id: 'PRK', name: 'Perak', x: 88, y: 180 },
  { id: 'KTN', name: 'Kelantan', x: 136, y: 145 },
  { id: 'TRG', name: 'Terengganu', x: 190, y: 175 },
  { id: 'PHG', name: 'Pahang', x: 165, y: 255 },
  { id: 'SGR', name: 'Selangor', x: 68, y: 275 },
  { id: 'KUL', name: 'KL', x: 95, y: 290 },
  { id: 'NSN', name: 'N. Sembilan', x: 98, y: 320 },
  { id: 'MLK', name: 'Melaka', x: 130, y: 350 },
  { id: 'JHR', name: 'Johor', x: 195, y: 355 },
  { id: 'SWK', name: 'Sarawak', x: 674, y: 340 },
  { id: 'SBH', name: 'Sabah', x: 840, y: 160 },
];

export class AccommodationMap {
  public readonly element: HTMLElement;
  private currentToggle: MapToggleLayer = 'aor';
  private svgWrapper!: HTMLElement;
  private legendElement!: HTMLElement;
  private tooltip!: HTMLElement;
  private onSelectStateCallback?: (stateId: string | null) => void;
  private selectedStateId: string | null = null;

  constructor(onSelectState?: (stateId: string | null) => void) {
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'asset-card acc-map-card';

    this.createTooltip();
    this.render();
  }

  public setToggle(toggle: MapToggleLayer): void {
    if (this.currentToggle !== toggle) {
      this.currentToggle = toggle;

      // Update segmented button styles
      const aorBtn = this.element.querySelector<HTMLButtonElement>('[data-toggle="aor"]');
      const ratioBtn = this.element.querySelector<HTMLButtonElement>('[data-toggle="ratio"]');
      if (aorBtn && ratioBtn) {
        aorBtn.classList.toggle('active', toggle === 'aor');
        aorBtn.setAttribute('aria-checked', String(toggle === 'aor'));
        ratioBtn.classList.toggle('active', toggle === 'ratio');
        ratioBtn.setAttribute('aria-checked', String(toggle === 'ratio'));
      }

      this.updateMapColors();
      this.updateLegend();
    }
  }

  public setSelectedState(stateId: string | null): void {
    if (this.selectedStateId !== stateId) {
      this.selectedStateId = stateId;
      this.updateMapColors();
    }
  }

  private createTooltip(): void {
    document.querySelectorAll('.acc-floating-tooltip').forEach((el) => el.remove());

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'acc-floating-tooltip';
    this.tooltip.style.display = 'none';
    document.body.appendChild(this.tooltip);

    this.element.addEventListener('mouseleave', () => this.hideTooltip());
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  private render(): void {
    this.element.innerHTML = '';

    // 1. Card Header: Title group on Left, Segmented toggle + compass on Right
    const mapHeader = document.createElement('div');
    mapHeader.className = 'asset-card-header';
    mapHeader.innerHTML = `
      <div class="asset-card-title-group">
        <div class="asset-card-badge">
          <span class="asset-badge-dot" style="background-color: #2563eb;"></span>
          <span>SPATIAL CONCENTRATION</span>
        </div>
        <h3 class="asset-card-title map-acc-title">Accommodation Capacity & Utilisation Map</h3>
        <p class="asset-card-subtitle map-acc-sub">Geospatial distribution of available inventory and resulting demand pressure</p>
      </div>
      <div class="map-header-actions" style="display: flex; align-items: center; gap: 10px;">
        <div class="asset-segmented-control" role="radiogroup" aria-label="Capacity and Utilisation Metric Toggle">
          <button type="button" class="asset-segment-btn ${this.currentToggle === 'aor' ? 'active' : ''}" data-toggle="aor" role="radio" aria-checked="${this.currentToggle === 'aor'}">Average Occupancy Rate</button>
          <button type="button" class="asset-segment-btn ${this.currentToggle === 'ratio' ? 'active' : ''}" data-toggle="ratio" role="radio" aria-checked="${this.currentToggle === 'ratio'}">Visitor-to-Room Ratio</button>
        </div>
        <div class="map-compass-icon" title="North orientation">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#93c5fd" stroke-width="1.2" />
            <polygon points="12 4 15 12 12 10 9 12" fill="#0b57d0" />
            <polygon points="12 20 15 12 12 14 9 12" fill="#cbd5e1" />
            <text x="12" y="3.2" font-size="5" font-weight="900" fill="#0b57d0" text-anchor="middle">N</text>
          </svg>
        </div>
      </div>
    `;

    const accMapH3 = mapHeader.querySelector('h3')!;
    const accMapInfoIcon = createInfoIcon({
      sourceOrg: 'Tourism Malaysia & NAPIC Commercial Property Monitor',
      datasetName: 'Accommodation Capacity & Utilisation Choropleth Map',
      referenceYear: '2025',
      measure: 'State choropleth showing either Average Occupancy Rate (AOR) or Visitor-to-Room Ratio per state, togglable via segmented control.',
      formula: 'AOR Mode: AOR = (Occupied Nights / Available Nights) \u00d7 100 | Ratio Mode: Visitor-to-Room Ratio = Annual Visitors / Total Rooms',
      limitations: 'State averages mask intra-state variation between urban centres and rural areas.',
    });
    accMapInfoIcon.style.marginLeft = '6px';
    accMapInfoIcon.style.verticalAlign = 'middle';
    accMapH3.appendChild(accMapInfoIcon);

    // Hook up segmented button clicks
    const aorBtn = mapHeader.querySelector<HTMLButtonElement>('[data-toggle="aor"]');
    const ratioBtn = mapHeader.querySelector<HTMLButtonElement>('[data-toggle="ratio"]');
    aorBtn?.addEventListener('click', () => this.setToggle('aor'));
    ratioBtn?.addEventListener('click', () => this.setToggle('ratio'));

    // 2. Map Stage Container
    const mapStage = document.createElement('div');
    mapStage.className = 'acc-map-stage-container';

    this.svgWrapper = document.createElement('div');
    this.svgWrapper.className = 'acc-svg-container';
    this.svgWrapper.innerHTML = this.renderMapSvg();
    mapStage.appendChild(this.svgWrapper);

    // 3. Legend Step Bar
    this.legendElement = document.createElement('div');
    this.legendElement.className = 'map-legend-step-bar';
    mapStage.appendChild(this.legendElement);

    this.element.appendChild(mapHeader);
    this.element.appendChild(mapStage);

    this.updateLegend();
    this.attachEvents();
  }

  private updateLegend(): void {
    if (this.currentToggle === 'aor') {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Average Occupancy Rate (AOR)</span>
        <div class="legend-scale-row">
          <span class="legend-bound">&lt; 45%</span>
          <div class="legend-step-blocks">
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #f1f5f9; border: 1px solid #cbd5e1;" title="&lt; 45%"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #bae6fd;" title="45–50%"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #38bdf8;" title="50–55%"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #0284c7;" title="55–65%"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #0369a1;" title="&gt; 65%"></div>
          </div>
          <span class="legend-bound">&gt; 65%</span>
        </div>
      `;
    } else {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Visitor-to-Room Ratio</span>
        <div class="legend-scale-row">
          <span class="legend-bound">&lt; 500</span>
          <div class="legend-step-blocks">
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #fef3c7; border: 1px solid #fde68a;" title="&lt; 500"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #fcd34d;" title="500–700"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #f59e0b;" title="700–1,000"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #ea580c;" title="1,000–1,500"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #9a3412;" title="&gt; 1,500"></div>
          </div>
          <span class="legend-bound">&gt; 1,500</span>
        </div>
      `;
    }
  }

  private getColor(stateCode: string): string {
    const data = ACCOMMODATION_DATA.find((d) => d.code === stateCode || d.id === stateCode);
    if (!data) return '#e2e8f0';

    if (this.currentToggle === 'aor') {
      const val = data.aor;
      if (val > 65) return '#0369a1';
      if (val > 55) return '#0284c7';
      if (val > 50) return '#38bdf8';
      if (val > 45) return '#bae6fd';
      return '#f1f5f9';
    } else {
      const ratio = (data.visitors * 1000000) / data.rooms;
      if (ratio > 1500) return '#9a3412';
      if (ratio > 1000) return '#ea580c';
      if (ratio > 700) return '#f59e0b';
      if (ratio > 500) return '#fcd34d';
      return '#fef3c7';
    }
  }

  private renderMapSvg(): string {
    const paths = MALAYSIA_GEO_DATA.map((geo) => {
      const fill = this.getColor(geo.code);
      const isSelected = this.selectedStateId === geo.code;

      return `
        <path
          d="${geo.svgPath}"
          data-state-id="${geo.code}"
          fill="${fill}"
          stroke="${isSelected ? '#0f172a' : '#ffffff'}"
          stroke-width="${isSelected ? '2.4' : '1.1'}"
          stroke-linejoin="round"
          class="acc-map-path ${isSelected ? 'selected' : ''}"
          style="cursor: pointer; transition: fill 0.25s ease, filter 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease; ${
            isSelected ? 'filter: drop-shadow(0 4px 10px rgba(15, 23, 42, 0.45));' : ''
          }"
        />
      `;
    }).join('');

    const labels = KEY_STATE_LABELS.map((lbl) => `
      <text
        x="${lbl.x}"
        y="${lbl.y}"
        class="acc-map-state-label"
        font-size="9.5"
        font-weight="750"
        fill="#0f172a"
        text-anchor="middle"
        style="pointer-events: none; paint-order: stroke; stroke: #ffffff; stroke-width: 3px; stroke-linejoin: round;"
      >${lbl.name}</text>
    `).join('');

    return `
      <svg viewBox="0 0 1000 440" preserveAspectRatio="xMidYMid meet" class="acc-map-svg">
        <g id="acc-states-group">${paths}</g>
        <g id="acc-labels-group">${labels}</g>
      </svg>
    `;
  }

  private updateMapColors(): void {
    const paths = this.svgWrapper.querySelectorAll<SVGPathElement>('.acc-map-path');
    paths.forEach((path) => {
      const stateCode = path.getAttribute('data-state-id');
      if (!stateCode) return;
      path.setAttribute('fill', this.getColor(stateCode));
      const isSelected = this.selectedStateId === stateCode;
      path.classList.toggle('selected', isSelected);
      if (isSelected) {
        path.style.stroke = '#0f172a';
        path.style.strokeWidth = '2.4';
        path.style.filter = 'drop-shadow(0 4px 10px rgba(15, 23, 42, 0.45))';
      } else {
        path.style.stroke = '#ffffff';
        path.style.strokeWidth = '1.1';
        path.style.filter = 'none';
      }
    });
  }

  private attachEvents(): void {
    const paths = this.svgWrapper.querySelectorAll<SVGPathElement>('.acc-map-path');

    paths.forEach((path) => {
      const stateCode = path.getAttribute('data-state-id');
      if (!stateCode) return;

      path.addEventListener('mouseenter', (e) => {
        if (stateCode !== this.selectedStateId) {
          path.style.filter = 'brightness(1.1) drop-shadow(0 3px 8px rgba(11, 87, 208, 0.35))';
          path.style.stroke = '#0f172a';
          path.style.strokeWidth = '1.8';
        }
        this.showTooltip(stateCode, e as MouseEvent);
      });

      path.addEventListener('mousemove', (e) => {
        this.updateTooltipPos(e as MouseEvent);
      });

      path.addEventListener('mouseleave', () => {
        if (stateCode === this.selectedStateId) {
          path.style.stroke = '#0f172a';
          path.style.strokeWidth = '2.4';
          path.style.filter = 'drop-shadow(0 4px 10px rgba(15, 23, 42, 0.45))';
        } else {
          path.style.filter = 'none';
          path.style.stroke = '#ffffff';
          path.style.strokeWidth = '1.1';
        }
        this.hideTooltip();
      });

      path.addEventListener('click', (e) => {
        e.stopPropagation();
        const nextSelected = this.selectedStateId === stateCode ? null : stateCode;
        this.setSelectedState(nextSelected);
        if (this.onSelectStateCallback) {
          this.onSelectStateCallback(nextSelected);
        }
        if (nextSelected) {
          this.showTooltip(stateCode, e as MouseEvent);
        } else {
          this.hideTooltip();
        }
      });
    });

    // Clicking outside paths clears selection
    this.svgWrapper.addEventListener('click', (e) => {
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

  private showTooltip(stateCode: string, e: MouseEvent): void {
    const data = ACCOMMODATION_DATA.find((d) => d.code === stateCode || d.id === stateCode);
    if (!data) return;

    const ratio = Math.round((data.visitors * 1000000) / data.rooms);
    const isSelected = this.selectedStateId === stateCode;

    let badgeClass = 'safe';
    let badgeText = '';
    if (this.currentToggle === 'aor') {
      badgeClass = data.aor >= 65 ? 'critical' : data.aor >= 50 ? 'moderate' : 'safe';
      badgeText = `${data.aor.toFixed(1)}% AOR`;
    } else {
      badgeClass = ratio >= 1000 ? 'critical' : ratio >= 700 ? 'moderate' : 'safe';
      badgeText = `${ratio.toLocaleString()} / rm`;
    }

    this.tooltip.innerHTML = `
      <div class="map-tooltip-header">
        <span class="map-tooltip-title">${data.name}</span>
        <span class="map-tooltip-quadrant ${badgeClass}">${badgeText}</span>
      </div>
      <div class="map-tooltip-body">
        <div class="map-tooltip-metric-row">
          <span>Room Inventory:</span>
          <strong>${data.rooms.toLocaleString()} rooms</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Annual Visitors:</span>
          <strong>${data.visitors.toFixed(2)}M visitors</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Average Occupancy:</span>
          <strong>${data.aor.toFixed(1)}% AOR</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Visitor / Room Ratio:</span>
          <strong>${ratio.toLocaleString()} / room</strong>
        </div>
      </div>
      <div class="map-tooltip-footer">
        ${isSelected ? '● Active state • Click to deselect' : 'Click state to view capacity details →'}
      </div>
    `;

    this.tooltip.style.display = 'block';
    this.updateTooltipPos(e);
  }

  private updateTooltipPos(e: MouseEvent): void {
    const tooltipW = 230;
    const tooltipH = 170;
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

    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  public destroy(): void {
    if (this.tooltip) {
      this.tooltip.remove();
    }
  }
}
