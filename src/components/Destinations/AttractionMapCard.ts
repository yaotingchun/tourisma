import { MALAYSIA_GEO_DATA } from '../../data/malaysiaGeo';
import type { AttractionItem } from '../../data/attractionsData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class AttractionMapCard {
  public readonly element: HTMLElement;
  private currentAttraction: AttractionItem;
  private onSelectStateCallback?: (stateId: string) => void;
  private tooltipElement!: HTMLElement;

  constructor(
    initialAttraction: AttractionItem,
    onSelectState?: (stateId: string) => void
  ) {
    this.currentAttraction = initialAttraction;
    this.onSelectStateCallback = onSelectState;

    this.element = document.createElement('div');
    this.element.className = 'dest-card dest-map-card';

    // Tooltip mounted to document.body
    document.querySelectorAll('.dest-map-tooltip').forEach((el) => el.remove());
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'map-floating-tooltip dest-map-tooltip';
    this.tooltipElement.style.display = 'none';
    document.body.appendChild(this.tooltipElement);

    this.render();
  }

  public setAttraction(attraction: AttractionItem): void {
    this.currentAttraction = attraction;
    this.updateMap();
  }

  private render(): void {
    this.element.innerHTML = '';

    // Card Header
    const header = document.createElement('div');
    header.className = 'dest-card-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'dest-card-title-group';
    titleGroup.innerHTML = `
      <div class="dest-card-badge">
        <span class="dest-badge-dot" style="background-color: #0b57d0;"></span>
        <span>SPATIAL LOCATION READINESS MAP</span>
      </div>
      <h3 class="dest-card-title">Geospatial Attraction Positioning</h3>
      <p class="dest-card-desc">Geographic pin and state host boundary across Peninsular & Borneo territories</p>
    `;

    const actions = document.createElement('div');
    actions.className = 'dest-map-header-actions';
    actions.style.display = 'flex';
    actions.style.alignItems = 'center';
    actions.style.gap = '10px';

    const infoIcon = createInfoIcon({
      sourceOrg: 'Department of Statistics Malaysia (DOSM) & OpenStreetMap GIS',
      datasetName: 'National Tourism Asset Inventory & State Administrative Boundaries',
      referenceYear: '2025 / 2026',
      measure: 'Spatial coordinates of core tourist attractions mapped against official state jurisdictions.',
      limitations: 'Attraction point represents centroid coordinates; complex large attractions may span wider spatial grounds.',
    });

    const compass = document.createElement('div');
    compass.className = 'map-compass-icon';
    compass.title = 'North orientation';
    compass.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#93c5fd" stroke-width="1.2" />
        <polygon points="12 4 15 12 12 10 9 12" fill="#0b57d0" />
        <polygon points="12 20 15 12 12 14 9 12" fill="#cbd5e1" />
        <text x="12" y="3.2" font-size="5" font-weight="900" fill="#0b57d0" text-anchor="middle">N</text>
      </svg>
    `;

    actions.appendChild(infoIcon);
    actions.appendChild(compass);

    header.appendChild(titleGroup);
    header.appendChild(actions);
    this.element.appendChild(header);

    // Map Stage
    const stage = document.createElement('div');
    stage.className = 'dest-map-stage';
    stage.innerHTML = this.renderMapSvg();
    this.element.appendChild(stage);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'dest-map-legend';
    legend.innerHTML = `
      <div class="dest-map-legend-item">
        <span class="dest-legend-swatch host-state"></span>
        <span>Host State (${this.currentAttraction.stateName})</span>
      </div>
      <div class="dest-map-legend-item">
        <span class="dest-legend-swatch other-states"></span>
        <span>Other States</span>
      </div>
      <div class="dest-map-legend-item">
        <span class="dest-legend-pin-dot"></span>
        <span>Attraction Pin Marker</span>
      </div>
    `;
    this.element.appendChild(legend);

    this.attachSvgListeners();
  }

  private renderMapSvg(): string {
    const hostId = this.currentAttraction.stateId;

    const pathsSvg = MALAYSIA_GEO_DATA.map((geo) => {
      const isHost = geo.id === hostId;
      const fill = isHost ? '#0284c7' : '#e2e8f0';
      const stroke = isHost ? '#0369a1' : '#cbd5e1';
      const strokeWidth = isHost ? '2.0' : '1.0';

      return `
        <path
          class="dest-state-path ${isHost ? 'host-selected' : ''}"
          data-state-id="${geo.id}"
          data-state-name="${geo.name}"
          d="${geo.svgPath}"
          fill="${fill}"
          stroke="${stroke}"
          stroke-width="${strokeWidth}"
          stroke-linejoin="round"
          style="cursor: pointer; transition: fill 0.25s ease, filter 0.25s ease, stroke 0.25s ease;"
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
        class="dest-map-state-label ${lbl.id === hostId ? 'host-label' : ''}"
        font-size="9"
        font-weight="750"
        fill="${lbl.id === hostId ? '#0f172a' : '#64748b'}"
        text-anchor="middle"
        style="pointer-events: none; paint-order: stroke; stroke: #ffffff; stroke-width: 3px; stroke-linejoin: round;"
      >
        ${lbl.name}
      </text>
    `
      )
      .join('');

    const pinX = this.currentAttraction.svgCoordinates.x;
    const pinY = this.currentAttraction.svgCoordinates.y;

    const pinSvg = `
      <g class="dest-clean-pin" transform="translate(${pinX}, ${pinY})">
        <title>${this.currentAttraction.name} (${this.currentAttraction.district}, ${this.currentAttraction.stateName})</title>
        <!-- Ground anchor shadow -->
        <ellipse cx="0" cy="1" rx="4" ry="1.8" fill="#0f172a" opacity="0.28" />
        <!-- Pin Marker: tip at exactly (0, 0) -->
        <path
          d="M 0 0 C -2 -3.5 -7 -8.5 -7 -13 A 7 7 0 1 1 7 -13 C 7 -8.5 2 -3.5 0 0 Z"
          fill="#dc2626"
          stroke="#ffffff"
          stroke-width="1.6"
          stroke-linejoin="round"
        />
        <!-- Center core dot -->
        <circle cx="0" cy="-13" r="2.5" fill="#ffffff" />
      </g>
    `;

    return `
      <svg
        viewBox="0 0 1000 440"
        preserveAspectRatio="xMidYMid meet"
        class="dest-malaysia-svg"
      >
        <defs>
          <radialGradient id="hostGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0" />
          </radialGradient>
        </defs>
        <g class="dest-paths-group">${pathsSvg}</g>
        <g class="dest-labels-group">${labelsSvg}</g>
        <g class="dest-pin-layer">${pinSvg}</g>
      </svg>
    `;
  }

  private attachSvgListeners(): void {
    const paths = this.element.querySelectorAll<SVGPathElement>('.dest-state-path');
    paths.forEach((path) => {
      path.addEventListener('mouseenter', (e) => {
        const stateId = path.getAttribute('data-state-id');
        const stateName = path.getAttribute('data-state-name');
        const isHost = stateId === this.currentAttraction.stateId;

        path.style.stroke = '#0f172a';
        path.style.strokeWidth = '2.2';

        this.tooltipElement.innerHTML = `
          <div style="font-weight: 750; font-size: 0.82rem; color: #0f172a;">${stateName}</div>
          <div style="font-size: 0.72rem; color: ${isHost ? '#0369a1' : '#64748b'}; margin-top: 2px;">
            ${isHost ? '📍 Host State for ' + this.currentAttraction.name : 'State boundary'}
          </div>
        `;
        this.tooltipElement.style.display = 'block';
        this.tooltipElement.style.left = `${e.clientX + 14}px`;
        this.tooltipElement.style.top = `${e.clientY + 14}px`;
      });

      path.addEventListener('mousemove', (e) => {
        this.tooltipElement.style.left = `${e.clientX + 14}px`;
        this.tooltipElement.style.top = `${e.clientY + 14}px`;
      });

      path.addEventListener('mouseleave', () => {
        const stateId = path.getAttribute('data-state-id');
        const isHost = stateId === this.currentAttraction.stateId;
        path.style.stroke = isHost ? '#0369a1' : '#cbd5e1';
        path.style.strokeWidth = isHost ? '2.0' : '1.0';
        this.tooltipElement.style.display = 'none';
      });

      path.addEventListener('click', () => {
        const stateId = path.getAttribute('data-state-id');
        if (stateId && this.onSelectStateCallback) {
          this.onSelectStateCallback(stateId);
        }
      });
    });
  }

  private updateMap(): void {
    const stage = this.element.querySelector('.dest-map-stage');
    if (stage) {
      stage.innerHTML = this.renderMapSvg();
      this.attachSvgListeners();
    }

    const legendHostSpan = this.element.querySelector('.dest-map-legend-item span:last-child');
    if (legendHostSpan) {
      legendHostSpan.textContent = `Host State (${this.currentAttraction.stateName})`;
    }
  }
}
