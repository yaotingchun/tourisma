import { MALAYSIA_GEO_DATA } from '../../data/malaysiaGeo';
import {
  STATE_ASSET_DENSITY_DATA,
  type StateAssetDensityItem,
} from '../../data/tourismAssetsData';
import { createInfoIcon } from '../Common/InfoTooltip';

// Centroid lookup for tooltip positioning
const STATE_CENTROIDS: Record<string, { x: number; y: number }> = {};
MALAYSIA_GEO_DATA.forEach((geo) => {
  STATE_CENTROIDS[geo.id] = { x: geo.centroid.x, y: geo.centroid.y };
});

export type DensityMapMode = 'density' | 'volume';

export class TourismAssetDensityMap {
  public readonly element: HTMLElement;
  private tooltipElement: HTMLElement;
  private legendElement: HTMLElement;
  private currentMode: DensityMapMode = 'density';
  private selectedStateId: string | null = null;
  private onSelectStateCallback?: (stateId: string | null) => void;

  constructor(onSelectState?: (stateId: string | null) => void) {
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'asset-card asset-density-map-card';

    // Clean up any existing state detail drawer/backdrop from DOM
    document.querySelectorAll('.state-detail-drawer, .state-detail-backdrop').forEach((el) => {
      el.classList.remove('open');
      el.remove();
    });

    // Floating Tooltip
    document.querySelectorAll('.asset-density-map-card-tooltip').forEach((el) => el.remove());
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'map-floating-tooltip asset-density-map-card-tooltip';
    this.tooltipElement.style.display = 'none';
    document.body.appendChild(this.tooltipElement);

    // Card Header: Title + Subtitle on Left, Mode Toggle + Compass on Right
    const mapHeader = document.createElement('div');
    mapHeader.className = 'asset-card-header';
    mapHeader.innerHTML = `
      <div class="asset-card-title-group">
        <div class="asset-card-badge">
          <span class="asset-badge-dot" style="background-color: #2563eb;"></span>
          <span>SPATIAL CONCENTRATION</span>
        </div>
        <h3 class="asset-card-title map-density-title">MALAYSIA CORE ASSET DENSITY</h3>
        <p class="asset-card-subtitle map-density-sub">Core tourist attractions per 1,000 km² by state</p>
      </div>
      <div class="map-header-actions" style="display: flex; align-items: center; gap: 10px;">
        <div class="asset-segmented-control" role="radiogroup" aria-label="Density and Volume Toggle">
          <button type="button" class="asset-segment-btn active" data-mode="density" role="radio" aria-checked="true">Core Asset Density</button>
          <button type="button" class="asset-segment-btn" data-mode="volume" role="radio" aria-checked="false">Core Volume</button>
        </div>
        <div class="map-compass-icon" title="North orientation">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#93c5fd" stroke-width="1.2" />
            <polygon points="12 4 15 12 12 10 9 12" fill="#0b57d0" />
            <polygon points="12 20 15 12 12 14 9 12" fill="#cbd5e1" />
            <text x="12" y="3.2" font-size="5" font-weight="900" fill="#0b57d0" text-anchor="middle">N</text>
          </svg>
        </div>
        <div class="asset-map-info-slot"></div>
      </div>
    `;

    const infoSlot = mapHeader.querySelector('.asset-map-info-slot');
    if (infoSlot) {
      const infoIcon = createInfoIcon({
        sourceOrg: 'MOTAC & OpenStreetMap Spatial Geographic Database',
        datasetName: 'State Core Tourism Asset Spatial Density & Distribution',
        referenceYear: '2025 / 2026',
        measure: 'Choropleth density of verified core attractions per 1,000 km² land area and absolute state counts.',
        formula: 'Asset Density = (Total Core Attractions / State Land Area in km²) × 1,000',
        limitations: 'Land area figures from DOSM; urban city-states (e.g. KL, Penang) exhibit naturally concentrated densities.',
      });
      infoSlot.replaceWith(infoIcon);
    }

    // Hook up toggle button clicks
    const densityBtn = mapHeader.querySelector<HTMLButtonElement>('[data-mode="density"]');
    const volumeBtn = mapHeader.querySelector<HTMLButtonElement>('[data-mode="volume"]');
    densityBtn?.addEventListener('click', () => this.setMode('density'));
    volumeBtn?.addEventListener('click', () => this.setMode('volume'));

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

  public setMode(mode: DensityMapMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;

    // 1. Toggle Button UI
    const densityBtn = this.element.querySelector<HTMLButtonElement>('[data-mode="density"]');
    const volumeBtn = this.element.querySelector<HTMLButtonElement>('[data-mode="volume"]');

    if (densityBtn && volumeBtn) {
      densityBtn.classList.toggle('active', mode === 'density');
      densityBtn.setAttribute('aria-checked', String(mode === 'density'));
      volumeBtn.classList.toggle('active', mode === 'volume');
      volumeBtn.setAttribute('aria-checked', String(mode === 'volume'));
    }

    // 2. Title & Subtitle
    const titleEl = this.element.querySelector<HTMLElement>('.map-density-title');
    const subEl = this.element.querySelector<HTMLElement>('.map-density-sub');

    if (mode === 'density') {
      if (titleEl) titleEl.textContent = 'MALAYSIA CORE ASSET DENSITY';
      if (subEl) subEl.textContent = 'Core tourist attractions per 1,000 km² by state';
    } else {
      if (titleEl) titleEl.textContent = 'MALAYSIA CORE ATTRACTION VOLUME';
      if (subEl) subEl.textContent = 'Total count of core destination assets by state';
    }

    // 3. Re-fill Paths
    this.updateMapColors();

    // 4. Update Legend
    this.renderLegend();
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

  private getColorForState(data: StateAssetDensityItem): string {
    if (this.currentMode === 'density') {
      const d = data.coreDensity;
      if (d >= 300) return '#1e3a8a'; // Deep Navy (Ultra-High: KL, Melaka, Labuan, Penang)
      if (d >= 100) return '#2563eb'; // Royal Blue (High: Putrajaya)
      if (d >= 30) return '#60a5fa';  // Medium Blue (Moderate-High: Selangor, Kedah)
      if (d >= 15) return '#93c5fd';  // Soft Sky (Moderate: N. Sembilan, Terengganu, Perak, Johor, Perlis)
      return '#dbeafe';               // Light Ice Blue (Extensive: Kelantan, Pahang, Sabah, Sarawak)
    } else {
      const v = data.coreAssets;
      if (v >= 600) return '#1e3a8a'; // 600+ (Melaka 1,202)
      if (v >= 400) return '#2563eb'; // 400-599 (Selangor, Sarawak, Pahang, Sabah, Perak)
      if (v >= 300) return '#60a5fa'; // 300-399 (Penang, Johor, Kedah)
      if (v >= 100) return '#93c5fd'; // 100-299 (Terengganu, KL, Kelantan, N. Sembilan)
      return '#dbeafe';               // <100 (Labuan, Perlis, Putrajaya)
    }
  }

  private updateMapColors(): void {
    const paths = this.element.querySelectorAll<SVGPathElement>('.state-map-path');
    paths.forEach((path) => {
      const stateId = path.getAttribute('data-state-id');
      if (!stateId) return;
      const data = STATE_ASSET_DENSITY_DATA[stateId];
      if (data) {
        path.setAttribute('fill', this.getColorForState(data));
      }
    });
  }

  private renderLegend(): void {
    if (this.currentMode === 'density') {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Core Asset Density (Sites / 1,000 km²)</span>
        <div class="legend-scale-row">
          <span class="legend-bound">&lt; 15</span>
          <div class="legend-step-blocks">
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #dbeafe;" title="Extensive / Natural (&lt; 15)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #93c5fd;" title="Moderate (15–30)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #60a5fa;" title="Moderate-High (30–100)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #2563eb;" title="High (100–300)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #1e3a8a;" title="Ultra-High (300+)"></div>
          </div>
          <span class="legend-bound">300+</span>
        </div>
      `;
    } else {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Core Attraction Volume (Total Sites)</span>
        <div class="legend-scale-row">
          <span class="legend-bound">&lt; 100</span>
          <div class="legend-step-blocks">
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #dbeafe;" title="&lt; 100 sites"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #93c5fd;" title="100 – 299 sites"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #60a5fa;" title="300 – 399 sites"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #2563eb;" title="400 – 599 sites"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #1e3a8a;" title="600+ sites"></div>
          </div>
          <span class="legend-bound">600+</span>
        </div>
      `;
    }
  }

  private renderMapSvg(): string {
    const pathsSvg = MALAYSIA_GEO_DATA.map((geo) => {
      const data = STATE_ASSET_DENSITY_DATA[geo.id];
      const fill = data ? this.getColorForState(data) : '#e2e8f0';

      return `
        <path
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

    // Clicking on canvas outside paths clears selection
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

  private showTooltip(stateId: string, e?: MouseEvent): void {
    const data = STATE_ASSET_DENSITY_DATA[stateId];
    if (!data) return;

    const isSelected = this.selectedStateId === stateId;

    this.tooltipElement.innerHTML = `
      <div class="map-tooltip-header">
        <span class="map-tooltip-title">${data.name}</span>
        <span class="map-tooltip-quadrant">${data.coreDensity >= 100 ? 'High Density' : data.coreDensity >= 25 ? 'Moderate Density' : 'Extensive'}</span>
      </div>
      <div class="map-tooltip-body">
        <div class="map-tooltip-metric-row">
          <span>Core Asset Density:</span>
          <strong>${data.coreDensity} / 1,000 km²</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Core Attractions:</span>
          <strong>${data.coreAssets.toLocaleString()} sites</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Supporting Assets:</span>
          <strong>${data.supportingAssets.toLocaleString()} assets</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Total Tourism Assets:</span>
          <strong>${data.totalAssets.toLocaleString()} assets</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Land Area:</span>
          <strong>${data.landAreaKm2.toLocaleString()} km²</strong>
        </div>
      </div>
      <div class="map-tooltip-footer" style="color: ${isSelected ? '#059669' : '#2563eb'}; font-weight: 600; font-size: 11px; margin-top: 6px; padding-top: 5px; border-top: 1px solid #f1f5f9;">
        ${isSelected ? '● Active state • Click to deselect' : 'Click state to view ring chart →'}
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
