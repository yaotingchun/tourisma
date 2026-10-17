import { MALAYSIA_GEO_DATA } from '../../data/malaysiaGeo';
import { STATES_OVERVIEW_DATA } from '../../data/overviewData';
import { type SimulationResult } from './pressureData';

export class PressureMapCard {
  public readonly element: HTMLElement;
  private selectedStateId: string = 'malaysia';
  private currentSimResult: SimulationResult | null = null;
  private onSelectStateCallback?: (stateId: string) => void;

  constructor(
    initialStateId = 'malaysia',
    onSelectState?: (stateId: string) => void
  ) {
    this.selectedStateId = initialStateId;
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'unified-map-pane';

    // Remove any leftover floating tooltips
    document.querySelectorAll('.pressure-map-floating-tooltip').forEach((el) => el.remove());

    this.render();
  }

  public setSelectedState(stateId: string): void {
    this.selectedStateId = stateId;
    this.updateMapColors();
  }

  /**
   * Dynamically called on every slider movement or preset change.
   * Updates map colors in real-time.
   */
  public updateSimulation(simResult: SimulationResult, selectedStateId: string): void {
    this.currentSimResult = simResult;
    this.selectedStateId = selectedStateId;
    this.updateMapColors();
  }

  public destroy(): void {
    // No-op cleanup
  }

  private getColorForState(stateId: string): string {
    const raw = STATES_OVERVIEW_DATA[stateId];
    if (!raw) return '#94a3b8';

    let visitors = raw.domesticVisitors;

    if (this.currentSimResult) {
      if (this.selectedStateId === 'malaysia') {
        // Whole Malaysia: all states scale by demand change percentage
        visitors = Math.round(raw.domesticVisitors * (1 + this.currentSimResult.demandChangePct / 100));
      } else if (stateId === this.selectedStateId) {
        // Specific selected state under What-If test
        visitors = this.currentSimResult.scenarioVisitors;
      }
    }

    if (visitors >= 30000000) return '#1e40af'; // Very High (>30M)
    if (visitors >= 20000000) return '#3b82f6'; // High (20M-30M)
    if (visitors >= 10000000) return '#60a5fa'; // Moderate (10M-20M)
    if (visitors >= 5000000) return '#93c5fd';  // Developing (5M-10M)
    return '#bfdbfe';                          // Low (<5M)
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
    return `
      <span class="pressure-legend-title">Visitor Demand:</span>
      <div class="pressure-legend-scale">
        <span class="pressure-legend-bound">&lt; 5M</span>
        <div class="pressure-legend-blocks">
          <span class="pressure-step-block" style="background:#bfdbfe;" title="Low (&lt; 5M)"></span>
          <span class="pressure-step-block" style="background:#93c5fd;" title="Developing (5M–10M)"></span>
          <span class="pressure-step-block" style="background:#60a5fa;" title="Moderate (10M–20M)"></span>
          <span class="pressure-step-block" style="background:#3b82f6;" title="High (20M–30M)"></span>
          <span class="pressure-step-block" style="background:#1e40af;" title="Very High (&gt; 30M)"></span>
        </div>
        <span class="pressure-legend-bound">&gt; 30M</span>
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

    // 2. State path click handlers (select state or toggle)
    const paths = this.element.querySelectorAll<SVGPathElement>('.pressure-state-path');
    paths.forEach((path) => {
      const stateId = path.getAttribute('data-state-id');
      if (!stateId) return;

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
      });
    });
  }
}
