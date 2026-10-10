import { MALAYSIA_GEO_DATA } from '../../data/malaysiaGeo';
import {
  type StateEnvironmentData,
  getStateEnvironment,
} from '../../data/environmentData';
import { createInfoIcon } from '../Common/InfoTooltip';

// Centroid lookup for tooltip positioning
const STATE_CENTROIDS: Record<string, { x: number; y: number }> = {};
MALAYSIA_GEO_DATA.forEach((geo) => {
  STATE_CENTROIDS[geo.id] = { x: geo.centroid.x, y: geo.centroid.y };
});

export type MapLayer = 'overall' | 'inside' | 'land' | 'marine';

export class EnvironmentMapCard {
  public readonly element: HTMLElement;
  private currentLayer: MapLayer = 'overall';
  private selectedStateId: string | null = null;
  private tooltipElement!: HTMLElement;
  private legendElement!: HTMLElement;
  private onSelectStateCallback?: (stateId: string | null) => void;

  constructor(onSelectState?: (stateId: string | null) => void) {
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'asset-card asset-density-map-card env-map-card';

    // Clean up any stale floating tooltip
    document.querySelectorAll('.env-floating-tooltip').forEach((el) => el.remove());
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'map-floating-tooltip env-floating-tooltip';
    this.tooltipElement.style.display = 'none';
    document.body.appendChild(this.tooltipElement);

    this.render();
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

    if (this.tooltipElement) {
      if (stateId) {
        this.showTooltip(stateId);
      } else {
        this.hideTooltip();
      }
    }
  }

  public hideTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.style.display = 'none';
    }
  }

  private render(): void {
    this.element.innerHTML = '';

    // 1. Card Header: Title on Left, Layer Toggle + Compass on Right
    const header = document.createElement('div');
    header.className = 'asset-card-header env-map-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'asset-card-title-group';
    titleGroup.innerHTML = `
      <div class="asset-card-badge">
        <span class="asset-badge-dot" style="background-color: #059669;"></span>
        <span>SPATIAL CONSERVATION DIAGNOSTIC</span>
      </div>
      <h3 class="asset-card-title map-density-title">MALAYSIA ENVIRONMENTAL SENSITIVITY</h3>
      <p class="asset-card-subtitle map-density-sub">Geospatial proximity to 485 terrestrial forest reserves and marine sanctuaries</p>
    `;

    const envMapH3 = titleGroup.querySelector('h3')!;
    const envMapInfoIcon = createInfoIcon({
      sourceOrg: 'DOE Malaysia, PERHILITAN & Department of Marine Park Malaysia',
      datasetName: 'Tourism Asset Environmental Sensitivity Choropleth Map',
      referenceYear: '2025',
      measure: 'State choropleth mapping % of tourism assets exposed to terrestrial/marine protected area buffers across 4 switchable layers.',
      formula: 'Exposure % = (Exposed Assets / Total State Assets) × 100; layers: Overall, Inside Reserves, Land Eco-Buffer, Marine & Reef',
      limitations: 'Static spatial layers; seasonal protected zone closures and dynamic boundary changes not reflected.',
    });
    envMapInfoIcon.style.marginLeft = '6px';
    envMapInfoIcon.style.verticalAlign = 'middle';
    envMapH3.appendChild(envMapInfoIcon);

    // Layer Controls & Compass
    const headerActions = document.createElement('div');
    headerActions.className = 'map-header-actions';
    headerActions.style.cssText = 'display: flex; align-items: center; gap: 10px; flex-wrap: wrap;';

    const segmentedWrap = document.createElement('div');
    segmentedWrap.className = 'asset-segmented-control env-segmented-control';
    segmentedWrap.setAttribute('role', 'radiogroup');
    segmentedWrap.setAttribute('aria-label', 'Environment Map Layer');

    const layers: { id: MapLayer; label: string }[] = [
      { id: 'overall', label: 'Overall Exposure %' },
      { id: 'inside', label: 'Inside Reserves' },
      { id: 'land', label: 'Land Eco-Buffer' },
      { id: 'marine', label: 'Marine & Reef' },
    ];

    layers.forEach((l) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `asset-segment-btn ${this.currentLayer === l.id ? 'active' : ''}`;
      btn.setAttribute('data-layer', l.id);
      btn.textContent = l.label;
      btn.addEventListener('click', () => this.setLayer(l.id));
      segmentedWrap.appendChild(btn);
    });

    const compassIcon = document.createElement('div');
    compassIcon.className = 'map-compass-icon';
    compassIcon.title = 'North orientation';
    compassIcon.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#a7f3d0" stroke-width="1.2" />
        <polygon points="12 4 15 12 12 10 9 12" fill="#059669" />
        <polygon points="12 20 15 12 12 14 9 12" fill="#cbd5e1" />
        <text x="12" y="3.2" font-size="5" font-weight="900" fill="#059669" text-anchor="middle">N</text>
      </svg>
    `;

    headerActions.appendChild(segmentedWrap);
    headerActions.appendChild(compassIcon);

    header.appendChild(titleGroup);
    header.appendChild(headerActions);

    // 2. Map Stage Container
    const mapStage = document.createElement('div');
    mapStage.className = 'map-stage-container env-map-stage-container';

    const svgWrapper = document.createElement('div');
    svgWrapper.className = 'svg-map-wrapper env-svg-map-wrapper';
    svgWrapper.innerHTML = this.renderMapSvg();

    // Bottom 5-Step Legend Bar (matching Tourism Asset layout)
    this.legendElement = document.createElement('div');
    this.legendElement.className = 'map-legend-step-bar env-map-legend-step-bar';
    this.renderLegend();

    mapStage.appendChild(svgWrapper);
    mapStage.appendChild(this.legendElement);

    this.element.appendChild(header);
    this.element.appendChild(mapStage);

    this.attachSvgEventListeners();
  }

  public setLayer(layer: MapLayer): void {
    if (this.currentLayer === layer) return;
    this.currentLayer = layer;

    // Update active button state
    const btns = this.element.querySelectorAll<HTMLButtonElement>('.asset-segmented-control .asset-segment-btn');
    btns.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-layer') === layer);
    });

    // Update subtitle description
    const subEl = this.element.querySelector<HTMLElement>('.map-density-sub');
    if (subEl) {
      if (layer === 'overall') {
        subEl.textContent = 'Combined spatial exposure to gazetted conservation areas & buffers';
      } else if (layer === 'inside') {
        subEl.textContent = 'Assets directly sited inside national parks and forest reserves';
      } else if (layer === 'land') {
        subEl.textContent = 'Terrestrial forest reserve & national park proximity exposure';
      } else {
        subEl.textContent = 'Marine park, island sanctuary & coral ecosystem proximity exposure';
      }
    }

    // Update path colors & legend
    this.updateMapColors();
    this.renderLegend();
  }

  private getColor(data?: StateEnvironmentData): string {
    if (!data) return '#e2e8f0';

    if (this.currentLayer === 'overall') {
      const pct = data.exposurePct;
      if (pct > 25) return '#ef4444';
      if (pct > 15) return '#fb923c';
      if (pct > 5) return '#fde047';
      if (pct > 2) return '#a7f3d0';
      return '#ecfdf5';
    }

    if (this.currentLayer === 'inside') {
      const cnt = data.inside;
      if (cnt > 150) return '#991b1b';
      if (cnt > 80) return '#dc2626';
      if (cnt > 20) return '#f87171';
      if (cnt > 0) return '#fecaca';
      return '#f1f5f9';
    }

    if (this.currentLayer === 'land') {
      const pct = data.land.percent;
      if (pct > 25) return '#14532d';
      if (pct > 15) return '#16a34a';
      if (pct > 5) return '#4ade80';
      if (pct > 2) return '#bbf7d0';
      return '#f0fdf4';
    }

    // Marine
    const pct = data.marine.percent;
    if (pct > 10) return '#0369a1';
    if (pct > 5) return '#0284c7';
    if (pct > 2) return '#38bdf8';
    if (pct > 0) return '#bae6fd';
    return '#f8fafc';
  }

  private updateMapColors(): void {
    const paths = this.element.querySelectorAll<SVGPathElement>('.state-map-path');
    paths.forEach((path) => {
      const stateId = path.getAttribute('data-state-id');
      if (!stateId) return;
      const data = getStateEnvironment(stateId);
      path.setAttribute('fill', this.getColor(data));
    });
  }

  private renderLegend(): void {
    if (this.currentLayer === 'overall') {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Combined Sensitivity Rate (Inside + Near Buffer)</span>
        <div class="legend-scale-row">
          <span class="legend-bound">&lt; 2%</span>
          <div class="legend-step-blocks">
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #ecfdf5; border: 1px solid #d1fae5;" title="Safe (< 2%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #a7f3d0;" title="Minimal (2–5%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #fde047;" title="Moderate (5–15%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #fb923c;" title="High (15–25%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #ef4444;" title="Critical Buffer (> 25%)"></div>
          </div>
          <span class="legend-bound">&gt; 25%</span>
        </div>
      `;
    } else if (this.currentLayer === 'inside') {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Assets Physically Inside Protected Reserves</span>
        <div class="legend-scale-row">
          <span class="legend-bound">0</span>
          <div class="legend-step-blocks">
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #f1f5f9; border: 1px solid #e2e8f0;" title="0 assets"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #fecaca;" title="1–20 assets"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #f87171;" title="21–80 assets"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #dc2626;" title="81–150 assets"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #991b1b;" title="> 150 assets"></div>
          </div>
          <span class="legend-bound">&gt; 150</span>
        </div>
      `;
    } else if (this.currentLayer === 'land') {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Terrestrial & Forest Reserve Proximity</span>
        <div class="legend-scale-row">
          <span class="legend-bound">&lt; 2%</span>
          <div class="legend-step-blocks">
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #f0fdf4; border: 1px solid #dcfce7;" title="Minimal (< 2%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #bbf7d0;" title="Low (2–5%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #4ade80;" title="Moderate (5–15%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #16a34a;" title="High (15–25%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #14532d;" title="Deep Forest (> 25%)"></div>
          </div>
          <span class="legend-bound">&gt; 25%</span>
        </div>
      `;
    } else {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Marine Park & Island Reef Proximity</span>
        <div class="legend-scale-row">
          <span class="legend-bound">0%</span>
          <div class="legend-step-blocks">
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #f8fafc; border: 1px solid #e2e8f0;" title="Landlocked (0%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #bae6fd;" title="Minimal (< 2%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #38bdf8;" title="Coastal (2–5%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #0284c7;" title="Active Marine (5–10%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #0369a1;" title="Coral Hotspot (> 10%)"></div>
          </div>
          <span class="legend-bound">&gt; 10%</span>
        </div>
      `;
    }
  }

  private renderMapSvg(): string {
    const pathsSvg = MALAYSIA_GEO_DATA.map((geo) => {
      const data = getStateEnvironment(geo.id);
      const fill = this.getColor(data);
      const isSelected = geo.id === this.selectedStateId;

      return `
        <path
          class="state-map-path ${isSelected ? 'selected' : ''}"
          data-state-id="${geo.id}"
          d="${geo.svgPath}"
          fill="${fill}"
          stroke="${isSelected ? '#0f172a' : '#ffffff'}"
          stroke-width="${isSelected ? '2.4' : '1.1'}"
          stroke-linejoin="round"
          style="cursor: pointer; transition: fill 0.25s ease, filter 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease; ${isSelected ? 'filter: drop-shadow(0 4px 10px rgba(15, 23, 42, 0.45));' : ''}"
        />
      `;
    }).join('');

    // Exact state labels matching TourismAssetDensityMap
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
        class="main-malaysia-svg env-main-malaysia-svg"
      >
        <g class="paths-group">${pathsSvg}</g>
        <g class="labels-group">${labelsSvg}</g>
      </svg>
    `;
  }

  private svgPointToPixel(svgX: number, svgY: number): { px: number; py: number } {
    const svg = this.element.querySelector<SVGSVGElement>('.main-malaysia-svg');
    if (!svg) return { px: 0, py: 0 };

    const pt = svg.createSVGPoint();
    pt.x = svgX;
    pt.y = svgY;

    const ctm = svg.getScreenCTM();
    if (!ctm) return { px: 0, py: 0 };

    const screenPt = pt.matrixTransform(ctm);
    const stageEl = this.element.querySelector<HTMLElement>('.map-stage-container');
    if (!stageEl) return { px: 0, py: 0 };
    const stageRect = stageEl.getBoundingClientRect();

    return {
      px: screenPt.x - stageRect.left,
      py: screenPt.y - stageRect.top,
    };
  }

  private attachSvgEventListeners(): void {
    const paths = this.element.querySelectorAll<SVGPathElement>('.state-map-path');
    const svgWrapper = this.element.querySelector<HTMLElement>('.env-svg-map-wrapper');

    paths.forEach((path) => {
      const stateId = path.getAttribute('data-state-id');
      if (!stateId) return;

      path.addEventListener('mouseenter', (e: MouseEvent) => {
        if (stateId !== this.selectedStateId) {
          path.style.filter = 'brightness(1.1) drop-shadow(0 3px 8px rgba(5, 150, 105, 0.4))';
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
        const nextSelected = this.selectedStateId === stateId ? null : stateId;
        this.setSelectedState(nextSelected);
        if (this.onSelectStateCallback) {
          this.onSelectStateCallback(nextSelected);
        }
        if (nextSelected) {
          this.showTooltip(stateId, e);
        } else {
          this.hideTooltip();
        }
      });
    });

    // Clicking outside paths clears selection
    svgWrapper?.addEventListener('click', (e: MouseEvent) => {
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

  private getSeverityClass(pct: number): string {
    if (pct > 25) return 'critical';
    if (pct > 15) return 'high';
    if (pct > 5) return 'moderate';
    return 'safe';
  }

  private showTooltip(stateId: string, e?: MouseEvent): void {
    const data = getStateEnvironment(stateId);
    if (!data) return;

    const isSelected = this.selectedStateId === stateId;
    const severityClass = this.getSeverityClass(data.exposurePct);

    this.tooltipElement.innerHTML = `
      <div class="map-tooltip-header">
        <span class="map-tooltip-title">${data.name}</span>
        <span class="map-tooltip-quadrant ${severityClass}">${data.exposurePct}% Combined</span>
      </div>
      <div class="map-tooltip-body">
        <div class="map-tooltip-metric-row">
          <span>Total Screened Assets:</span>
          <strong>${data.totalAssets.toLocaleString()} assets</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Combined Exposure:</span>
          <strong>${data.exposurePct}% (${data.totalExposed.toLocaleString()})</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Land Eco-Exposure:</span>
          <strong>${data.land.percent}% (${data.land.exposed.toLocaleString()})</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Marine Eco-Exposure:</span>
          <strong>${data.marine.percent}% (${data.marine.exposed.toLocaleString()})</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Inside Reserves:</span>
          <strong>${data.inside.toLocaleString()} assets</strong>
        </div>
      </div>
      <div class="map-tooltip-footer">
        ${isSelected ? '● Active state • Click to deselect' : 'Click state to filter charts →'}
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
    const tooltipH = 185;
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

  public destroy(): void {
    if (this.tooltipElement) {
      this.tooltipElement.remove();
    }
  }
}
