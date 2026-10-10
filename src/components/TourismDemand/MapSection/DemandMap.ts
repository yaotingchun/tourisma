import { MALAYSIA_GEO_DATA } from '../../../data/malaysiaGeo';
import { STATE_METRICS_DATA } from '../../../data/tourismDemandData';
import { ACCOMMODATION_DATA } from '../../../data/accommodationData';
import { createInfoIcon } from '../../Common/InfoTooltip';

export type DemandMapToggleLayer = 'volume' | 'receipts' | 'aor';

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

export class DemandMap {
  public readonly element: HTMLElement;
  private currentToggle: DemandMapToggleLayer = 'volume';
  private svgWrapper!: HTMLElement;
  private legendElement!: HTMLElement;
  private tooltip!: HTMLElement;
  private onSelectStateCallback?: (stateId: string | null) => void;
  private selectedStateId: string | null = null;

  constructor(onSelectState?: (stateId: string | null) => void) {
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'asset-card acc-map-card';
    this.element.style.height = '100%';

    this.createTooltip();
    this.render();
  }

  public setToggle(toggle: DemandMapToggleLayer): void {
    if (this.currentToggle !== toggle) {
      this.currentToggle = toggle;

      const volumeBtn = this.element.querySelector<HTMLButtonElement>('[data-toggle="volume"]');
      const receiptsBtn = this.element.querySelector<HTMLButtonElement>('[data-toggle="receipts"]');
      const aorBtn = this.element.querySelector<HTMLButtonElement>('[data-toggle="aor"]');
      
      if (volumeBtn && receiptsBtn && aorBtn) {
        volumeBtn.classList.toggle('active', toggle === 'volume');
        volumeBtn.setAttribute('aria-checked', String(toggle === 'volume'));
        receiptsBtn.classList.toggle('active', toggle === 'receipts');
        receiptsBtn.setAttribute('aria-checked', String(toggle === 'receipts'));
        aorBtn.classList.toggle('active', toggle === 'aor');
        aorBtn.setAttribute('aria-checked', String(toggle === 'aor'));
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
    document.querySelectorAll('.demand-floating-tooltip').forEach((el) => el.remove());

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'acc-floating-tooltip demand-floating-tooltip';
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

    const mapHeader = document.createElement('div');
    mapHeader.className = 'asset-card-header';
    mapHeader.innerHTML = `
      <div class="asset-card-title-group">
        <div class="asset-card-badge">
          <span class="asset-badge-dot" style="background-color: #2563eb;"></span>
          <span>DEMAND DISTRIBUTION</span>
        </div>
        <h3 class="asset-card-title map-acc-title">Tourism Volume by State</h3>
        <p class="asset-card-subtitle map-acc-sub">Geospatial distribution of tourist arrivals</p>
      </div>
      <div class="map-header-actions" style="display: flex; align-items: center; gap: 10px;">
        <div class="asset-segmented-control" role="radiogroup">
          <button type="button" class="asset-segment-btn ${this.currentToggle === 'volume' ? 'active' : ''}" data-toggle="volume" role="radio">Visitors</button>
          <button type="button" class="asset-segment-btn ${this.currentToggle === 'receipts' ? 'active' : ''}" data-toggle="receipts" role="radio">Expenditure</button>
          <button type="button" class="asset-segment-btn ${this.currentToggle === 'aor' ? 'active' : ''}" data-toggle="aor" role="radio">AOR</button>
        </div>
        <div class="map-compass-icon" title="North orientation">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#93c5fd" stroke-width="1.2" />
            <polygon points="12 4 15 12 12 10 9 12" fill="#0b57d0" />
            <polygon points="12 20 15 12 12 14 9 12" fill="#cbd5e1" />
            <text x="12" y="3.2" font-size="5" font-weight="900" fill="#0b57d0" text-anchor="middle">N</text>
          </svg>
        </div>
        <div class="demand-map-info-slot"></div>
      </div>
    `;

    const infoSlot = mapHeader.querySelector('.demand-map-info-slot');
    if (infoSlot) {
      const infoIcon = createInfoIcon({
        sourceOrg: 'Department of Statistics Malaysia (DOSM) & Tourism Malaysia',
        datasetName: 'State-Level Tourism Volume, Expenditure & Occupancy Choropleth',
        referenceYear: '2025',
        measure: 'Choropleth map visualizing domestic visitors, tourism receipts, and average hotel occupancy by state.',
        formula: 'Interactive layer switching between DTS domestic visits, expenditure, and AOR percentages',
        limitations: 'State-level aggregation; intra-state tourist dispersal (e.g. islands vs. mainland) detailed in Destination profiles.',
      });
      infoSlot.replaceWith(infoIcon);
    }

    const volumeBtn = mapHeader.querySelector<HTMLButtonElement>('[data-toggle="volume"]');
    const receiptsBtn = mapHeader.querySelector<HTMLButtonElement>('[data-toggle="receipts"]');
    const aorBtn = mapHeader.querySelector<HTMLButtonElement>('[data-toggle="aor"]');
    
    volumeBtn?.addEventListener('click', () => this.setToggle('volume'));
    receiptsBtn?.addEventListener('click', () => this.setToggle('receipts'));
    aorBtn?.addEventListener('click', () => this.setToggle('aor'));

    const mapStage = document.createElement('div');
    mapStage.className = 'acc-map-stage-container';

    this.svgWrapper = document.createElement('div');
    this.svgWrapper.className = 'acc-svg-container';
    this.svgWrapper.innerHTML = this.renderMapSvg();
    mapStage.appendChild(this.svgWrapper);

    this.legendElement = document.createElement('div');
    this.legendElement.className = 'map-legend-step-bar';
    mapStage.appendChild(this.legendElement);

    this.element.appendChild(mapHeader);
    this.element.appendChild(mapStage);

    this.updateLegend();
    this.attachEvents();
  }

  private updateLegend(): void {
    if (this.currentToggle === 'volume') {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Tourist Arrivals (Millions)</span>
        <div class="legend-scale-row">
          <span class="legend-bound">&lt; 5M</span>
          <div class="legend-step-blocks">
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #f1f5f9; border: 1px solid #cbd5e1;" title="&lt; 5M"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #bae6fd;" title="5M–10M"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #38bdf8;" title="10M–20M"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #0284c7;" title="20M–25M"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #0369a1;" title="&gt; 25M"></div>
          </div>
          <span class="legend-bound">&gt; 25M</span>
        </div>
      `;
    } else if (this.currentToggle === 'receipts') {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Tourist Expenditure (RM Billions)</span>
        <div class="legend-scale-row">
          <span class="legend-bound">&lt; 1B</span>
          <div class="legend-step-blocks">
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #fefce8; border: 1px solid #fef08a;" title="&lt; 1B"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #fde047;" title="1B–5B"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #eab308;" title="5B–10B"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #ca8a04;" title="10B–15B"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #854d0e;" title="&gt; 15B"></div>
          </div>
          <span class="legend-bound">&gt; 15B</span>
        </div>
      `;
    } else if (this.currentToggle === 'aor') {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Average Occupancy Rate (AOR)</span>
        <div class="legend-scale-row">
          <span class="legend-bound">&lt; 45%</span>
          <div class="legend-step-blocks">
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #f3e8ff; border: 1px solid #e9d5ff;" title="&lt; 45%"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #d8b4fe;" title="45–50%"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #c084fc;" title="50–55%"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #9333ea;" title="55–65%"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #6b21a8;" title="&gt; 65%"></div>
          </div>
          <span class="legend-bound">&gt; 65%</span>
        </div>
      `;
    }
  }

  private getStateMetrics(code: string) {
    const stateMap: Record<string, string> = {
      'JHR': 'Johor', 'KDH': 'Kedah', 'KTN': 'Kelantan', 'MLK': 'Melaka',
      'NSN': 'Negeri Sembilan', 'PHG': 'Pahang', 'PRK': 'Perak', 'PLS': 'Perlis',
      'PNG': 'Pulau Pinang', 'SBH': 'Sabah', 'SWK': 'Sarawak', 'SGR': 'Selangor',
      'TRG': 'Terengganu', 'KUL': 'W.P. Kuala Lumpur', 'LBN': 'W.P. Labuan', 'PJY': 'W.P. Putrajaya'
    };
    const stateName = stateMap[code];
    return STATE_METRICS_DATA.find(d => d.state === stateName);
  }

  private getAccData(code: string) {
    return ACCOMMODATION_DATA.find(d => d.code === code);
  }

  private getColor(stateCode: string): string {
    if (this.currentToggle === 'volume') {
      const data = this.getStateMetrics(stateCode);
      if (!data) return '#e2e8f0';
      const val = data.visitors;
      if (val > 25) return '#0369a1';
      if (val > 20) return '#0284c7';
      if (val > 10) return '#38bdf8';
      if (val > 5) return '#bae6fd';
      return '#f1f5f9';
    } else if (this.currentToggle === 'receipts') {
      const data = this.getStateMetrics(stateCode);
      if (!data) return '#e2e8f0';
      const val = data.receipts / 1000; // Billions
      if (val > 15) return '#854d0e';
      if (val > 10) return '#ca8a04';
      if (val > 5) return '#eab308';
      if (val > 1) return '#fde047';
      return '#fefce8';
    } else if (this.currentToggle === 'aor') {
      const data = this.getAccData(stateCode);
      if (!data) return '#e2e8f0';
      const val = data.aor;
      if (val > 65) return '#6b21a8';
      if (val > 55) return '#9333ea';
      if (val > 50) return '#c084fc';
      if (val > 45) return '#d8b4fe';
      return '#f3e8ff';
    }
    return '#e2e8f0';
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
          path.style.filter = 'brightness(1.1) drop-shadow(0 3px 8px rgba(15, 23, 42, 0.2))';
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
    const data = this.getStateMetrics(stateCode);
    const accData = this.getAccData(stateCode);
    if (!data) return;

    const isSelected = this.selectedStateId === stateCode;
    let badgeHtml = '';

    if (this.currentToggle === 'volume') {
      badgeHtml = `<span class="map-tooltip-quadrant safe">${data.visitors.toFixed(1)}M Visitors</span>`;
    } else if (this.currentToggle === 'receipts') {
      badgeHtml = `<span class="map-tooltip-quadrant moderate">RM${(data.receipts / 1000).toFixed(1)}B</span>`;
    } else if (this.currentToggle === 'aor' && accData) {
      badgeHtml = `<span class="map-tooltip-quadrant critical">${accData.aor.toFixed(1)}% AOR</span>`;
    }

    this.tooltip.innerHTML = `
      <div class="map-tooltip-header">
        <span class="map-tooltip-title">${data.state}</span>
        ${badgeHtml}
      </div>
      <div class="map-tooltip-body">
        <div class="map-tooltip-metric-row">
          <span>Visitors:</span>
          <strong>${data.visitors.toFixed(2)}M</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Receipts:</span>
          <strong>RM${(data.receipts / 1000).toFixed(2)}B</strong>
        </div>
        ${accData ? `
        <div class="map-tooltip-metric-row">
          <span>Rooms:</span>
          <strong>${accData.rooms.toLocaleString()}</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>AOR:</span>
          <strong>${accData.aor.toFixed(1)}%</strong>
        </div>
        ` : ''}
      </div>
      <div class="map-tooltip-footer">
        ${isSelected ? '● Active state • Click to deselect' : 'Click state to view tourism profile →'}
      </div>
    `;

    this.tooltip.style.display = 'block';
    this.updateTooltipPos(e);
  }

  private updateTooltipPos(e: MouseEvent): void {
    const tooltipW = 220;
    const tooltipH = 150;
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
