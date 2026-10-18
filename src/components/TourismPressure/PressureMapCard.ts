import { MALAYSIA_GEO_DATA } from '../../data/malaysiaGeo';
import { STATES_OVERVIEW_DATA } from '../../data/overviewData';
import {
  type SimulationResult,
  type TpiBreakdown,
  calculateStateTpi,
  getPressureStateData,
} from './pressureData';
import { getStateFlagUrl } from './stateFlags';

export class PressureMapCard {
  public readonly element: HTMLElement;
  private selectedStateId: string = 'malaysia';
  private currentSimResult: SimulationResult | null = null;
  private onSelectStateCallback?: (stateId: string) => void;
  private tooltip!: HTMLElement;

  constructor(
    initialStateId = 'malaysia',
    onSelectState?: (stateId: string) => void
  ) {
    this.selectedStateId = initialStateId;
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'unified-map-pane';

    this.createTooltip();
    this.render();
  }

  private createTooltip(): void {
    // Remove any leftover floating tooltips
    document.querySelectorAll('.pressure-map-floating-tooltip').forEach((el) => el.remove());

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'acc-floating-tooltip pressure-map-floating-tooltip';
    this.tooltip.style.display = 'none';
    this.tooltip.style.zIndex = '9999';
    document.body.appendChild(this.tooltip);

    this.element.addEventListener('mouseleave', () => this.hideTooltip());
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  private updateTooltipPos(e: MouseEvent): void {
    if (!this.tooltip) return;
    const tooltipW = 250;
    const tooltipH = 175;
    const pad = 12;

    let x = e.clientX + pad;
    let y = e.clientY + pad;

    if (x + tooltipW > window.innerWidth - pad) {
      x = e.clientX - tooltipW - pad;
    }
    if (y + tooltipH > window.innerHeight - pad) {
      y = e.clientY - tooltipH - pad;
    }

    this.tooltip.style.left = `${Math.max(pad, x)}px`;
    this.tooltip.style.top = `${Math.max(pad, y)}px`;
  }

  private showTooltip(stateId: string, e: MouseEvent): void {
    const raw = STATES_OVERVIEW_DATA[stateId];
    if (!raw) return;

    const tpiData = this.getTpiDataForState(stateId);
    if (!tpiData) return;

    const flagUrl = getStateFlagUrl(stateId);
    const signDelta = tpiData.tpiDelta >= 0 ? '+' : '';

    const textBadgeColor = tpiData.tpi < 45 ? '#1d4ed8' : tpiData.color;
    const badgeBg = tpiData.tpi < 45 ? 'rgba(37, 99, 235, 0.1)' : `${tpiData.color}22`;

    this.tooltip.innerHTML = `
      <div class="map-tooltip-header">
        <div style="display:flex;align-items:center;gap:7px;">
          <img src="${flagUrl}" alt="${tpiData.stateName}" style="width:18px;height:12px;object-fit:cover;border-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,0.2);" />
          <span class="map-tooltip-title">${tpiData.stateName}</span>
        </div>
        <span class="map-tooltip-quadrant" style="background:${badgeBg};color:${textBadgeColor};border:1px solid ${textBadgeColor}44;">
          ${tpiData.pressureCategory}
        </span>
      </div>
      <div class="map-tooltip-body">
        <div class="map-tooltip-metric-row" style="background:rgba(15,23,42,0.04);padding:4px 6px;border-radius:4px;margin-bottom:4px;">
          <span style="font-weight:800;color:var(--text-primary);">Tourism Pressure Index:</span>
          <strong style="color:${textBadgeColor};font-size:13px;">${tpiData.tpi.toFixed(1)} / 100 (${signDelta}${tpiData.tpiDelta.toFixed(1)})</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Accommodation Score (A):</span>
          <strong>${tpiData.accommodationScore.toFixed(1)} <small style="color:var(--text-muted);font-weight:normal;">(AOR ${tpiData.scenarioAor.toFixed(1)}%)</small></strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Accessibility Gap (G):</span>
          <strong>${tpiData.accessibilityGapScore.toFixed(1)} <small style="color:var(--text-muted);font-weight:normal;">(PT ${tpiData.scenarioPt.toFixed(1)}%)</small></strong>
        </div>
        <div class="map-tooltip-metric-row" style="border-top:1px dashed var(--border-subtle);padding-top:3px;margin-top:2px;">
          <span style="color:var(--text-muted);">Reserve Exposure (Sep):</span>
          <strong style="color:#059669;">${tpiData.environmentalExposureRate.toFixed(1)}% <small style="color:var(--text-muted);font-weight:normal;">proximity</small></strong>
        </div>
      </div>
      <div class="map-tooltip-footer" style="font-size:9.5px;color:var(--text-muted);border-top:1px solid var(--border-subtle);padding-top:3px;margin-top:4px;">
        Click to sync simulator · TPI = 0.70A + 0.30G
      </div>
    `;

    this.tooltip.style.display = 'block';
    this.updateTooltipPos(e);
  }

  public setSelectedState(stateId: string): void {
    this.selectedStateId = stateId;
    this.updateMapColors();
  }

  /**
   * Dynamically called on every slider movement or preset change.
   * Updates map colors in real-time according to scenario TPI.
   */
  public updateSimulation(simResult: SimulationResult, selectedStateId: string): void {
    this.currentSimResult = simResult;
    this.selectedStateId = selectedStateId;
    this.updateMapColors();
  }

  public destroy(): void {
    if (this.tooltip) {
      this.tooltip.remove();
    }
  }

  private getTpiDataForState(stateId: string): TpiBreakdown | null {
    if (this.currentSimResult && this.currentSimResult.allStatesTpi) {
      return this.currentSimResult.allStatesTpi[stateId] || null;
    }
    const raw = STATES_OVERVIEW_DATA[stateId];
    if (!raw) return null;
    return calculateStateTpi(getPressureStateData(stateId), {
      mode: 'forecast',
      demandChangePct: 0,
      capacityChangePct: 0,
      scenarioSource: 'Status Quo Baseline',
    });
  }

  private getColorForState(stateId: string): string {
    const tpiData = this.getTpiDataForState(stateId);
    if (!tpiData) return '#bfdbfe';
    return tpiData.color;
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="pressure-map-canvas-container">
        ${this.renderMapSvg()}
      </div>

      <div class="pressure-map-legend-bar">
        ${this.renderLegend()}
      </div>
    `;

    this.attachEventListeners();
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
          style="fill: ${fill}; cursor: pointer; transition: fill 0.25s ease, filter 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease; ${
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
    return `
      <div class="pressure-legend-title-group">
        <span class="pressure-legend-title">Tourism Pressure Index (TPI):</span>
        <span class="pressure-legend-formula-tag">TPI = 0.70A + 0.30G</span>
      </div>
      <div class="pressure-legend-scale">
        <span class="pressure-legend-bound">&lt; 35 Low</span>
        <div class="pressure-legend-blocks">
          <span class="pressure-step-block" style="background:#bfdbfe;" title="Low Pressure (&lt; 35)"></span>
          <span class="pressure-step-block" style="background:#60a5fa;" title="Moderate Pressure (35–45)"></span>
          <span class="pressure-step-block" style="background:#2563eb;" title="Elevated Pressure (45–55)"></span>
          <span class="pressure-step-block" style="background:#1d4ed8;" title="High Pressure (55–65)"></span>
          <span class="pressure-step-block" style="background:#1e3a8a;" title="Critical Pressure (≥ 65)"></span>
        </div>
        <span class="pressure-legend-bound">&ge; 65 Critical</span>
      </div>
    `;
  }

  private updateMapColors(): void {
    const paths = this.element.querySelectorAll<SVGPathElement>('.pressure-state-path');
    paths.forEach((path) => {
      const stateId = path.getAttribute('data-state-id');
      if (stateId) {
        const color = this.getColorForState(stateId);
        path.setAttribute('fill', color);
        path.style.fill = color;
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
    // 1. Click on empty area in map container -> sync back to whole country
    const canvasContainer = this.element.querySelector<HTMLElement>('.pressure-map-canvas-container');
    if (canvasContainer) {
      canvasContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement | SVGElement;
        if (target.closest('.pressure-state-path')) {
          return;
        }
        if (this.selectedStateId !== 'malaysia') {
          this.selectedStateId = 'malaysia';
          this.updateMapHighlights();
          if (this.onSelectStateCallback) {
            this.onSelectStateCallback('malaysia');
          }
        }
      });
    }

    // 2. State path click & hover handlers
    const paths = this.element.querySelectorAll<SVGPathElement>('.pressure-state-path');
    paths.forEach((path) => {
      const stateId = path.getAttribute('data-state-id');
      if (!stateId) return;

      path.addEventListener('mouseenter', (e) => {
        this.showTooltip(stateId, e);
      });

      path.addEventListener('mousemove', (e) => {
        this.updateTooltipPos(e);
      });

      path.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });

      path.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.selectedStateId === stateId) {
          this.selectedStateId = 'malaysia';
        } else {
          this.selectedStateId = stateId;
        }
        this.updateMapHighlights();
        if (this.onSelectStateCallback) {
          this.onSelectStateCallback(this.selectedStateId);
        }
        this.showTooltip(this.selectedStateId === 'malaysia' ? stateId : this.selectedStateId, e);
      });
    });
  }
}
