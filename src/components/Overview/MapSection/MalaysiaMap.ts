import { MALAYSIA_GEO_DATA } from '../../../data/malaysiaGeo';
import { STATES_OVERVIEW_DATA, type StateOverviewItem } from '../../../data/overviewData';
import { createInfoIcon } from '../../Common/InfoTooltip';
// Centroid lookup for tooltip positioning (in SVG viewBox 0 0 1000 440 space)
const STATE_CENTROIDS: Record<string, { x: number; y: number }> = {};
MALAYSIA_GEO_DATA.forEach((geo) => {
  STATE_CENTROIDS[geo.id] = { x: geo.centroid.x, y: geo.centroid.y };
});

export class MalaysiaMap {
  public readonly element: HTMLElement;
  private tooltipElement: HTMLElement;
  private legendElement: HTMLElement;
  private currentMode: 'demand' | 'readiness' = 'readiness';
  private selectedStateId: string | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'malaysia-map-card';

    // Clean up any existing state detail drawer/backdrop from DOM
    document.querySelectorAll('.state-detail-drawer, .state-detail-backdrop').forEach((el) => {
      el.classList.remove('open');
      el.remove();
    });

    // Floating Tooltip
    document.querySelectorAll('.overview-floating-tooltip').forEach((el) => el.remove());
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'map-floating-tooltip overview-floating-tooltip';
    this.tooltipElement.style.display = 'none';
    document.body.appendChild(this.tooltipElement);

    // Card Header: Title + Subtitle on Left, Demand/Readiness Toggle + North Compass on Right
    const mapHeader = document.createElement('div');
    mapHeader.className = 'map-card-header-clean';
    mapHeader.innerHTML = `
      <div class="map-title-left">
        <h3 class="map-main-title">MALAYSIA TOURISM READINESS</h3>
        <span class="map-sub-title">State infrastructure readiness index (lodging, transit & capacity)</span>
      </div>
      <div class="map-header-actions">
        <div class="map-mode-toggle" role="radiogroup" aria-label="Demand and Readiness Mode Toggle">
          <button type="button" class="map-mode-btn" data-mode="demand" role="radio" aria-checked="false">Demand</button>
          <button type="button" class="map-mode-btn active" data-mode="readiness" role="radio" aria-checked="true">Readiness</button>
        </div>
        <div class="map-compass-icon" title="North orientation">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#93c5fd" stroke-width="1.2" />
            <polygon points="12 4 15 12 12 10 9 12" fill="#0b57d0" />
            <polygon points="12 20 15 12 12 14 9 12" fill="#cbd5e1" />
            <text x="12" y="3.2" font-size="5" font-weight="900" fill="#0b57d0" text-anchor="middle">N</text>
          </svg>
        </div>
        <div class="map-info-icon-slot"></div>
      </div>
    `;

    const infoSlot = mapHeader.querySelector('.map-info-icon-slot');
    if (infoSlot) {
      const infoIcon = createInfoIcon({
        sourceOrg: 'Tourisma National Spatial Framework & Multi-Agency Audits',
        datasetName: 'State Tourism Readiness & Spatial Demand Model',
        referenceYear: '2025 / 2026',
        measure: 'Multi-dimensional state tourism readiness index comprising accommodation capacity, transport links, and medical facilities.',
        formula: 'Composite Index = 0.35 × Accommodation + 0.30 × Transit Connectivity + 0.20 × Healthcare + 0.15 × Destination Assets',
        limitations: 'Readiness measures physical supply capacity; does not represent consumer sentiment or natural disaster hazards.',
      });
      infoSlot.replaceWith(infoIcon);
    }

    // Hook up toggle button clicks
    const demandBtn = mapHeader.querySelector<HTMLButtonElement>('[data-mode="demand"]');
    const readinessBtn = mapHeader.querySelector<HTMLButtonElement>('[data-mode="readiness"]');
    demandBtn?.addEventListener('click', () => this.setMode('demand'));
    readinessBtn?.addEventListener('click', () => this.setMode('readiness'));

    // Map Stage Container
    const mapStage = document.createElement('div');
    mapStage.className = 'map-stage-container';

    const svgWrapper = document.createElement('div');
    svgWrapper.className = 'svg-map-wrapper';
    svgWrapper.innerHTML = this.renderMapSvg();

    // Bottom 5-Step Legend Bar
    this.legendElement = document.createElement('div');
    this.legendElement.className = 'map-legend-step-bar';
    this.renderLegend();

    mapStage.appendChild(svgWrapper);
    mapStage.appendChild(this.legendElement);

    this.element.appendChild(mapHeader);
    this.element.appendChild(mapStage);

    this.attachSvgEventListeners();
  }

  public setMode(mode: 'demand' | 'readiness'): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;

    // 1. Toggle Button UI
    const demandBtn = this.element.querySelector<HTMLButtonElement>('[data-mode="demand"]');
    const readinessBtn = this.element.querySelector<HTMLButtonElement>('[data-mode="readiness"]');

    if (demandBtn && readinessBtn) {
      demandBtn.classList.toggle('active', mode === 'demand');
      demandBtn.setAttribute('aria-checked', String(mode === 'demand'));
      readinessBtn.classList.toggle('active', mode === 'readiness');
      readinessBtn.setAttribute('aria-checked', String(mode === 'readiness'));
    }

    // 2. Title & Subtitle
    const titleEl = this.element.querySelector<HTMLElement>('.map-main-title');
    const subTitleEl = this.element.querySelector<HTMLElement>('.map-sub-title');
    if (titleEl) {
      titleEl.textContent = mode === 'demand' ? 'MALAYSIA TOURISM DEMAND' : 'MALAYSIA TOURISM READINESS';
    }
    if (subTitleEl) {
      subTitleEl.textContent =
        mode === 'demand'
          ? 'Visitor demand index by state (volume, receipts & market pull)'
          : 'State infrastructure readiness index (lodging, transit & capacity)';
    }

    // 3. Update Path Fills with smooth transition
    MALAYSIA_GEO_DATA.forEach((geo) => {
      const path = this.element.querySelector<SVGPathElement>(`#state-path-${geo.id}`);
      const data = STATES_OVERVIEW_DATA[geo.id];
      if (path && data) {
        path.setAttribute('fill', this.getColorForScore(data, mode));
      }
    });

    // 4. Update Legend
    this.renderLegend();
  }

  private getColorForScore(data: StateOverviewItem | undefined, mode: 'demand' | 'readiness'): string {
    if (!data) return mode === 'demand' ? '#e0e7ff' : '#bfdbfe';

    if (mode === 'demand') {
      const s = data.demandScore;
      if (s >= 70) return '#3730a3'; // Indigo Very High (KL 98.8, Selangor 73.4)
      if (s >= 40) return '#4f46e5'; // Indigo High (Pahang 47.5, Sabah 46.4, Sarawak 41.3, Johor 41.3, Penang 40.9)
      if (s >= 25) return '#818cf8'; // Indigo Moderate (Melaka 39.8, Perak 39.2, NS 31.1, Kedah 29.6, Terengganu 25.4)
      if (s >= 10) return '#a5b4fc'; // Indigo Moderate-Low (Kelantan 20.6)
      return '#e0e7ff';              // Indigo Low (Perlis 4.6, Putrajaya 4.6, Labuan 0.1)
    } else {
      const s = data.readinessScore;
      if (s >= 60) return '#1d4ed8'; // Royal Blue Very High (KL 99.7, Melaka 60.4)
      if (s >= 35) return '#2563eb'; // Blue High (Putrajaya 47.5, Penang 46.7)
      if (s >= 20) return '#60a5fa'; // Moderate Blue (Selangor 27.9, Johor 24.5)
      if (s >= 12) return '#93c5fd'; // Light Blue (Sabah 19.8, Perak 18.3, Pahang 17.9, Sarawak 17.9, NS 17.8, Kedah 13.5)
      return '#bfdbfe';              // Soft Blue Low (Perlis 11.6, Labuan 8.7, Terengganu 8.3, Kelantan 6.9)
    }
  }

  private renderLegend(): void {
    if (!this.legendElement) return;

    if (this.currentMode === 'demand') {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Tourism Demand Index</span>
        <div class="legend-scale-row">
          <span class="legend-scale-text">Low (&lt;10)</span>
          <div class="legend-step-blocks">
            <span class="step-block" style="background:#e0e7ff;" title="Low (&lt;10)"></span>
            <span class="step-block" style="background:#a5b4fc;" title="Moderate-Low (10–24)"></span>
            <span class="step-block" style="background:#818cf8;" title="Moderate (25–39)"></span>
            <span class="step-block" style="background:#4f46e5;" title="High (40–69)"></span>
            <span class="step-block" style="background:#3730a3;" title="Very High (70+)"></span>
          </div>
          <span class="legend-scale-text">High (70+)</span>
        </div>
      `;
    } else {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Readiness Index</span>
        <div class="legend-scale-row">
          <span class="legend-scale-text">Low (&lt;12)</span>
          <div class="legend-step-blocks">
            <span class="step-block" style="background:#bfdbfe;" title="Low (&lt;12)"></span>
            <span class="step-block" style="background:#93c5fd;" title="Moderate-Low (12–19)"></span>
            <span class="step-block" style="background:#60a5fa;" title="Moderate (20–34)"></span>
            <span class="step-block" style="background:#2563eb;" title="High (35–59)"></span>
            <span class="step-block" style="background:#1d4ed8;" title="Very High (60+)"></span>
          </div>
          <span class="legend-scale-text">High (60+)</span>
        </div>
      `;
    }
  }

  private renderMapSvg(): string {
    const pathsSvg = MALAYSIA_GEO_DATA.map((geo) => {
      const data: StateOverviewItem | undefined = STATES_OVERVIEW_DATA[geo.id];
      const fill = this.getColorForScore(data, this.currentMode);

      return `
        <path
          id="state-path-${geo.id}"
          class="state-map-path"
          data-state-id="${geo.id}"
          d="${geo.svgPath}"
          fill="${fill}"
          stroke="#ffffff"
          stroke-width="1.1"
          stroke-linejoin="round"
          style="cursor: pointer; transition: fill 0.25s ease, filter 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease;"
        />
      `;
    }).join('');

    // State labels positioned inside their landmass
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
        class="map-state-label-text"
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
        class="main-malaysia-svg"
      >
        <g class="paths-group">${pathsSvg}</g>
        <g class="labels-group">${labelsSvg}</g>
      </svg>
    `;
  }

  /** Convert an SVG-space point (in viewBox coords) to pixel position relative to mapStage */
  private svgPointToPixel(svgX: number, svgY: number): { px: number; py: number } {
    const svg = this.element.querySelector<SVGSVGElement>('.main-malaysia-svg');
    if (!svg) return { px: 0, py: 0 };

    const pt = svg.createSVGPoint();
    pt.x = svgX;
    pt.y = svgY;

    const ctm = svg.getScreenCTM();
    if (!ctm) return { px: 0, py: 0 };

    const screenPt = pt.matrixTransform(ctm);

    // Convert screen coords to position relative to map-stage-container
    const stageEl = this.element.querySelector<HTMLElement>('.map-stage-container');
    if (!stageEl) return { px: 0, py: 0 };
    const stageRect = stageEl.getBoundingClientRect();

    return {
      px: screenPt.x - stageRect.left,
      py: screenPt.y - stageRect.top,
    };
  }

  public setSelectedState(stateId: string | null): void {
    this.selectedStateId = stateId;

    const paths = this.element.querySelectorAll<SVGPathElement>('.state-map-path');
    paths.forEach((path) => {
      const pid = path.getAttribute('data-state-id');
      if (pid === this.selectedStateId) {
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

  private attachSvgEventListeners(): void {
    const paths = this.element.querySelectorAll<SVGPathElement>('.state-map-path');
    const svgWrapper = this.element.querySelector<HTMLElement>('.svg-map-wrapper');

    paths.forEach((path) => {
      const stateId = path.getAttribute('data-state-id');
      if (!stateId) return;

      path.addEventListener('mouseenter', (e: MouseEvent) => {
        if (stateId !== this.selectedStateId) {
          path.style.filter = 'brightness(1.12) drop-shadow(0 3px 8px rgba(11, 87, 208, 0.35))';
          path.style.stroke = '#0f172a';
          path.style.strokeWidth = '1.8';
        }
        this.showTooltip(stateId, e);
      });

      path.addEventListener('mousemove', (e: MouseEvent) => {
        this.updateTooltipPos(e);
      });

      path.addEventListener('mouseleave', () => {
        if (stateId === this.selectedStateId) {
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

      path.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        const next = this.selectedStateId === stateId ? null : stateId;
        this.setSelectedState(next);
        if (next) {
          this.showTooltip(stateId, e);
        } else {
          this.hideTooltip();
        }
      });
    });

    // Clicking outside paths on canvas clears selection
    svgWrapper?.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'path') {
        if (this.selectedStateId !== null) {
          this.setSelectedState(null);
          this.hideTooltip();
        }
      }
    });
  }

  private showTooltip(stateId: string, e?: MouseEvent): void {
    const data: StateOverviewItem | undefined = STATES_OVERVIEW_DATA[stateId];
    if (!data) return;

    const isDemand = this.currentMode === 'demand';
    const activeMetricLabel = isDemand ? 'Demand Index' : 'Readiness Index';
    const activeMetricVal = Math.round(isDemand ? data.demandScore : data.readinessScore);
    const isSelected = this.selectedStateId === stateId;

    this.tooltipElement.innerHTML = `
      <div class="map-tooltip-header">
        <span class="map-tooltip-title">${data.name}</span>
        <span class="map-tooltip-quadrant">${data.quadrant}</span>
      </div>
      <div class="map-tooltip-body">
        <div class="map-tooltip-metric-row">
          <span>${activeMetricLabel}:</span>
          <strong>${activeMetricVal}</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Domestic Visitors:</span>
          <strong>${data.domesticVisitorsM}M</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Tourism Receipts:</span>
          <strong>RM${data.receiptsRmB}B (RM${data.receiptsPerVisitor}/visitor)</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Avg. Length of Stay:</span>
          <strong>${data.alos} nights</strong>
        </div>
      </div>
      <div class="map-tooltip-footer">
        ${isSelected ? '● Active state • Click to deselect' : (isDemand ? 'Ranked by total visitor demand & receipts' : 'Ranked by infrastructure capacity & lodging')}
      </div>
    `;

    this.tooltipElement.style.display = 'block';

    if (e) {
      this.updateTooltipPos(e);
    } else {
      const centroid = STATE_CENTROIDS[stateId];
      if (centroid) {
        const { px, py } = this.svgPointToPixel(centroid.x, centroid.y);
        const stageEl = this.element.querySelector<HTMLElement>('.map-stage-container');
        const stageRect = stageEl?.getBoundingClientRect();
        if (stageRect) {
          this.tooltipElement.style.left = `${stageRect.left + px + 14}px`;
          this.tooltipElement.style.top = `${stageRect.top + py - 40}px`;
        }
      }
    }
  }

  private updateTooltipPos(e: MouseEvent): void {
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
