import { MALAYSIA_GEO_DATA } from '../../data/malaysiaGeo';
import { STATES_OVERVIEW_DATA } from '../../data/overviewData';
import { getPressureStateData, type SimulationResult } from './pressureData';
import { createInfoIcon } from '../Common/InfoTooltip';

export type PressureMapMode = 'demand' | 'accommodation';

export class PressureMapCard {
  public readonly element: HTMLElement;
  private currentMode: PressureMapMode = 'demand';
  private selectedStateId: string = 'malaysia';
  private currentSimResult: SimulationResult | null = null;
  private onSelectStateCallback?: (stateId: string) => void;
  private tooltipElement!: HTMLElement;

  constructor(
    initialStateId = 'malaysia',
    onSelectState?: (stateId: string) => void
  ) {
    this.selectedStateId = initialStateId;
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'pressure-card pressure-map-card';

    // Mount floating tooltip to document body
    document.querySelectorAll('.pressure-map-floating-tooltip').forEach((el) => el.remove());
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'pressure-map-floating-tooltip';
    this.tooltipElement.style.display = 'none';
    document.body.appendChild(this.tooltipElement);

    this.render();
  }

  public setSelectedState(stateId: string): void {
    this.selectedStateId = stateId;
    this.updateMapColors();
  }

  /**
   * Dynamically called on every slider movement or preset change.
   * Updates map colors and live scenario badge in real-time.
   */
  public updateSimulation(simResult: SimulationResult, selectedStateId: string): void {
    this.currentSimResult = simResult;
    this.selectedStateId = selectedStateId;
    this.updateMapColors();
    this.updateScenarioHeaderBadge();
  }

  public destroy(): void {
    if (this.tooltipElement && this.tooltipElement.parentElement) {
      this.tooltipElement.remove();
    }
  }

  private getColorForState(stateId: string): string {
    const raw = STATES_OVERVIEW_DATA[stateId];
    if (!raw) return '#94a3b8';

    // Check if scenario should modify this state's metrics
    let visitors = raw.domesticVisitors;
    let vtr = raw.visitorToRoomRatio;

    if (this.currentSimResult) {
      if (this.selectedStateId === 'malaysia') {
        // Whole Malaysia: all states scale by demand and capacity percentages
        visitors = Math.round(raw.domesticVisitors * (1 + this.currentSimResult.demandChangePct / 100));
        const rooms = Math.max(1, Math.round(raw.accommodationRooms * (1 + this.currentSimResult.capacityChangePct / 100)));
        vtr = Number((visitors / rooms).toFixed(1));
      } else if (stateId === this.selectedStateId) {
        // Specific selected state under What-If test
        visitors = this.currentSimResult.scenarioVisitors;
        vtr = this.currentSimResult.scenarioVtr;
      }
    }

    if (this.currentMode === 'demand') {
      if (visitors >= 30000000) return '#1e40af'; // Very High (>30M)
      if (visitors >= 20000000) return '#3b82f6'; // High (20M-30M)
      if (visitors >= 10000000) return '#60a5fa'; // Moderate (10M-20M)
      if (visitors >= 5000000) return '#93c5fd';  // Developing (5M-10M)
      return '#bfdbfe';                          // Low (<5M)
    }

    if (this.currentMode === 'accommodation') {
      if (vtr >= 1200) return '#b91c1c'; // Critical Congestion
      if (vtr >= 850) return '#ea580c';  // Elevated Strain
      if (vtr >= 600) return '#f59e0b';  // Moderate-High
      if (vtr >= 400) return '#10b981';  // Balanced
      return '#34d399';                  // Ample Capacity
    }

    return '#94a3b8';
  }

  private updateScenarioHeaderBadge(): void {
    const badgeContainer = this.element.querySelector<HTMLElement>('#map-live-scenario-badge');
    if (!badgeContainer) return;

    if (this.currentSimResult && (this.currentSimResult.demandChangePct !== 0 || this.currentSimResult.capacityChangePct !== 0)) {
      const dSign = this.currentSimResult.demandChangePct >= 0 ? '+' : '';
      const cSign = this.currentSimResult.capacityChangePct >= 0 ? '+' : '';
      badgeContainer.style.display = 'inline-flex';
      badgeContainer.innerHTML = `
        <span class="live-dot"></span>
        <span>Scenario Active: ${dSign}${this.currentSimResult.demandChangePct}% Demand · ${cSign}${this.currentSimResult.capacityChangePct}% Capacity</span>
      `;
    } else {
      badgeContainer.style.display = 'none';
    }
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="pressure-card-header">
        <div class="pressure-card-title-group">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div class="pressure-card-badge">
              <span class="pressure-badge-dot"></span>
              <span>SPATIAL DISTRIBUTION</span>
            </div>
            <div id="map-live-scenario-badge" class="pressure-scenario-live-badge" style="display: none;"></div>
          </div>
          <h3 class="pressure-card-title">Where do demand and system constraints overlap?</h3>
          <p class="pressure-card-subtitle">Geospatial distribution of visitor volume and accommodation pressure ratios</p>
        </div>

        <div class="pressure-card-actions">
          <div class="pressure-segmented-control" role="radiogroup">
            <button class="pressure-segment-btn ${this.currentMode === 'demand' ? 'active' : ''}" data-mode="demand">
              Demand
            </button>
            <button class="pressure-segment-btn ${this.currentMode === 'accommodation' ? 'active' : ''}" data-mode="accommodation">
              Accommodation Pressure Proxy
            </button>
          </div>
          <div class="map-compass-icon" title="North orientation" style="display: flex; align-items: center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#93c5fd" stroke-width="1.2" />
              <polygon points="12 4 15 12 12 10 9 12" fill="#0b57d0" />
              <polygon points="12 20 15 12 12 14 9 12" fill="#cbd5e1" />
              <text x="12" y="3.2" font-size="5" font-weight="900" fill="#0b57d0" text-anchor="middle">N</text>
            </svg>
          </div>
          <div id="pressure-map-info-placeholder"></div>
        </div>
      </div>

      <div class="pressure-map-canvas-container">
        ${this.renderMapSvg()}
      </div>

      <div class="pressure-map-legend-bar">
        ${this.renderLegend()}
      </div>
    `;

    const infoSlot = this.element.querySelector('#pressure-map-info-placeholder');
    if (infoSlot) {
      const infoIcon = createInfoIcon({
        sourceOrg: 'Tourisma Spatial Diagnostic Engine & Multi-Agency Registries',
        datasetName: 'Geospatial Tourism Demand & Accommodation Pressure Surface',
        referenceYear: '2025 / 2026',
        measure: 'Geographic distribution of visitor volume and accommodation room pressure across all 16 states & federal territories.',
        formula: 'Visitor Volume = Domestic + International Guests; Pressure Ratio = Total Annual Visitors / Registered Room Supply',
        limitations: 'Spatial choropleth aggregated at administrative state level; localized municipal hotspots displayed in Destination tab.',
      });
      infoSlot.replaceWith(infoIcon);
    }

    this.attachEventListeners();
    this.updateScenarioHeaderBadge();
  }

  private renderMapSvg(): string {
    const pathsSvg = MALAYSIA_GEO_DATA.map((geo) => {
      const fill = this.getColorForState(geo.id);
      const isSelected = geo.id === this.selectedStateId;

      return `
        <path
          class="pressure-state-path ${isSelected ? 'selected' : ''}"
          data-state-id="${geo.id}"
          d="${geo.svgPath}"
          fill="${fill}"
          stroke="${isSelected ? '#0f172a' : '#ffffff'}"
          stroke-width="${isSelected ? '2.4' : '1.1'}"
          stroke-linejoin="round"
          style="cursor: pointer; transition: fill 0.25s ease, filter 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease; ${
            isSelected ? 'filter: drop-shadow(0 4px 10px rgba(15, 23, 42, 0.45));' : ''
          }"
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
        class="pressure-map-state-label"
        font-size="9.5"
        font-weight="750"
        fill="#0f172a"
        text-anchor="middle"
        style="pointer-events: none; paint-order: stroke; stroke: #ffffff; stroke-width: 3px; stroke-linejoin: round;"
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
        class="pressure-malaysia-svg"
      >
        <g class="pressure-paths-group">${pathsSvg}</g>
        <g class="pressure-labels-group">${labelsSvg}</g>
      </svg>
    `;
  }

  private renderLegend(): string {
    if (this.currentMode === 'demand') {
      return `
        <span style="font-weight: 700; color: var(--text-secondary);">Relative Visitor Demand:</span>
        <div class="legend-items-list">
          <div class="legend-item"><span class="legend-swatch" style="background: #1e40af;"></span> &gt; 30M High Volume</div>
          <div class="legend-item"><span class="legend-swatch" style="background: #3b82f6;"></span> 20M – 30M Substantial</div>
          <div class="legend-item"><span class="legend-swatch" style="background: #60a5fa;"></span> 10M – 20M Moderate</div>
          <div class="legend-item"><span class="legend-swatch" style="background: #bfdbfe;"></span> &lt; 10M Developing</div>
        </div>
      `;
    }

    return `
      <span style="font-weight: 700; color: var(--text-secondary);">Accommodation Pressure Proxy (VTR):</span>
      <div class="legend-items-list">
        <div class="legend-item"><span class="legend-swatch" style="background: #b91c1c;"></span> &gt; 1,200 / room (Critical)</div>
        <div class="legend-item"><span class="legend-swatch" style="background: #ea580c;"></span> 850 – 1,200 (Elevated)</div>
        <div class="legend-item"><span class="legend-swatch" style="background: #f59e0b;"></span> 600 – 850 (Moderate-High)</div>
        <div class="legend-item"><span class="legend-swatch" style="background: #10b981;"></span> &lt; 600 (Balanced)</div>
      </div>
    `;
  }

  private updateMapColors(): void {
    const paths = this.element.querySelectorAll<SVGPathElement>('.pressure-state-path');
    paths.forEach((path) => {
      const stateId = path.getAttribute('data-state-id');
      if (stateId) {
        path.setAttribute('fill', this.getColorForState(stateId));
      }
    });
    this.updateMapHighlights();
  }

  private updateMapHighlights(): void {
    const paths = this.element.querySelectorAll<SVGPathElement>('.pressure-state-path');
    paths.forEach((path) => {
      const pid = path.getAttribute('data-state-id');
      const isSelected = pid === this.selectedStateId;
      if (isSelected) {
        path.classList.add('selected');
        path.style.stroke = '#0f172a';
        path.style.strokeWidth = '2.4';
        path.style.filter = 'drop-shadow(0 4px 10px rgba(15, 23, 42, 0.45))';
      } else {
        path.classList.remove('selected');
        path.style.stroke = '#ffffff';
        path.style.strokeWidth = '1.1';
        path.style.filter = 'none';
      }
    });
  }

  private attachEventListeners(): void {
    const modeBtns = this.element.querySelectorAll<HTMLButtonElement>('.pressure-segment-btn');
    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode') as PressureMapMode;
        if (mode && mode !== this.currentMode) {
          this.currentMode = mode;
          this.render();
        }
      });
    });

    const paths = this.element.querySelectorAll<SVGPathElement>('.pressure-state-path');
    paths.forEach((path) => {
      const stateId = path.getAttribute('data-state-id');
      if (!stateId) return;

      path.addEventListener('click', () => {
        this.selectedStateId = stateId;
        this.updateMapHighlights();
        if (this.onSelectStateCallback) {
          this.onSelectStateCallback(stateId);
        }
      });

      path.addEventListener('mouseenter', (e) => {
        this.showTooltip(stateId, e);
      });

      path.addEventListener('mousemove', (e) => {
        this.positionTooltip(e);
      });

      path.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    });
  }

  private showTooltip(stateId: string, event: MouseEvent): void {
    const data = getPressureStateData(stateId);
    if (!data || !this.tooltipElement) return;

    // Determine if state is influenced by current scenario
    let isScenarioActive = false;
    let scenVis = data.domesticVisitors;
    let scenVtr = data.visitorToRoomRatio;
    let demandChange = 0;

    if (this.currentSimResult) {
      if (this.selectedStateId === 'malaysia') {
        isScenarioActive = true;
        demandChange = this.currentSimResult.demandChangePct;
        scenVis = Math.round(data.domesticVisitors * (1 + demandChange / 100));
        const rooms = Math.max(1, Math.round(data.accommodationRooms * (1 + this.currentSimResult.capacityChangePct / 100)));
        scenVtr = Number((scenVis / rooms).toFixed(1));
      } else if (stateId === this.selectedStateId) {
        isScenarioActive = true;
        demandChange = this.currentSimResult.demandChangePct;
        scenVis = this.currentSimResult.scenarioVisitors;
        scenVtr = this.currentSimResult.scenarioVtr;
      }
    }

    const scenVisM = (scenVis / 1e6).toFixed(2);
    const dSign = demandChange >= 0 ? '+' : '';

    this.tooltipElement.innerHTML = `
      <div class="pressure-tooltip-title">
        <span>${data.name}</span>
        <span style="font-size: 10px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px;">${data.code}</span>
      </div>
      <div class="pressure-tooltip-row">
        <span class="label">Observed Demand:</span>
        <span class="val">${data.domesticVisitorsM.toFixed(2)}M visitors</span>
      </div>
      ${
        isScenarioActive && this.currentSimResult && (this.currentSimResult.demandChangePct !== 0 || this.currentSimResult.capacityChangePct !== 0)
          ? `
        <div class="pressure-tooltip-row" style="background: rgba(37, 99, 235, 0.2); padding: 2px 4px; border-radius: 4px; margin: 2px 0;">
          <span class="label" style="color: #93c5fd;">⚡ Scenario Demand:</span>
          <span class="val" style="color: #60a5fa;">${scenVisM}M (${dSign}${demandChange}%)</span>
        </div>
      `
          : ''
      }
      <div class="pressure-tooltip-row">
        <span class="label">Observed AOR:</span>
        <span class="val">${data.aorPct.toFixed(1)}%</span>
      </div>
      <div class="pressure-tooltip-row">
        <span class="label">Visitor / Room (VTR):</span>
        <span class="val">${data.visitorToRoomRatio.toFixed(1)} / room</span>
      </div>
      ${
        isScenarioActive && this.currentSimResult && (this.currentSimResult.demandChangePct !== 0 || this.currentSimResult.capacityChangePct !== 0)
          ? `
        <div class="pressure-tooltip-row" style="background: rgba(245, 158, 11, 0.2); padding: 2px 4px; border-radius: 4px; margin: 2px 0;">
          <span class="label" style="color: #fde68a;">⚡ Scenario VTR:</span>
          <span class="val" style="color: #fbbf24;">${scenVtr.toFixed(1)} / room</span>
        </div>
      `
          : ''
      }
      <div class="pressure-tooltip-row">
        <span class="label">Road Access:</span>
        <span class="val">${data.roadAccessRate.toFixed(1)}%</span>
      </div>
      <div class="pressure-tooltip-row">
        <span class="label">PT Access:</span>
        <span class="val">${data.ptAccessRate.toFixed(1)}%</span>
      </div>
      <div class="pressure-tooltip-row">
        <span class="label">Reserve Proximity:</span>
        <span class="val">${data.environmentalExposureRate.toFixed(1)}%</span>
      </div>
    `;

    this.tooltipElement.style.display = 'block';
    this.positionTooltip(event);
  }

  private positionTooltip(event: MouseEvent): void {
    if (!this.tooltipElement) return;
    const offset = 14;
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    let left = event.clientX + offset;
    let top = event.clientY + offset;

    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = event.clientX - tooltipRect.width - offset;
    }
    if (top + tooltipRect.height > window.innerHeight - 10) {
      top = event.clientY - tooltipRect.height - offset;
    }

    this.tooltipElement.style.left = `${left}px`;
    this.tooltipElement.style.top = `${top}px`;
  }

  private hideTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.style.display = 'none';
    }
  }
}
