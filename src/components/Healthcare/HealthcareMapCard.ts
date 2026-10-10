import { MALAYSIA_GEO_DATA } from '../../data/malaysiaGeo';
import {
  getStateHealthcare,
  type StateHealthcareData,
} from '../../data/healthcareData';
import { createInfoIcon } from '../Common/InfoTooltip';

export type HealthcareMapMode = 'access' | 'bor';

export class HealthcareMapCard {
  public readonly element: HTMLElement;
  private currentMode: HealthcareMapMode = 'access';
  private selectedStateId: string | null = null;
  private onSelectStateCallback?: (stateId: string | null) => void;
  private tooltipElement!: HTMLElement;
  private legendElement!: HTMLElement;

  constructor(onSelectState?: (stateId: string | null) => void) {
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'hc-card hc-map-card';

    // Tooltip mounted to document.body
    document.querySelectorAll('.hc-floating-tooltip').forEach((el) => el.remove());
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'map-floating-tooltip hc-floating-tooltip';
    this.tooltipElement.style.display = 'none';
    document.body.appendChild(this.tooltipElement);

    this.render();
  }

  public setSelectedState(stateId: string | null): void {
    this.selectedStateId = stateId;

    const paths = this.element.querySelectorAll<SVGPathElement>('.hc-state-path');
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

    if (stateId) {
      const data = getStateHealthcare(stateId);
      if (data) this.showTooltip(data);
    } else {
      this.hideTooltip();
    }
  }

  public hideTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.style.display = 'none';
    }
  }

  public setMode(mode: HealthcareMapMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;

    // Update toggle button active states
    const btns = this.element.querySelectorAll<HTMLButtonElement>('.hc-segment-btn');
    btns.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });

    // Update subtitle text
    const subEl = this.element.querySelector<HTMLElement>('.hc-map-subtitle');
    if (subEl) {
      subEl.textContent =
        mode === 'access'
          ? 'Share of core tourism assets within ≤ 5 km of primary healthcare facilities'
          : 'State hospital bed occupancy rate (clinical utilisation load)';
    }

    this.updateMapColors();
    this.renderLegend();
  }

  private getColorForState(data: StateHealthcareData): string {
    if (this.currentMode === 'access') {
      const rate = data.healthcareAccessRate5km;
      if (rate >= 90) return '#047857'; // Deep Emerald (Melaka 100%, Putrajaya 100%, Penang 99.4%, KL 99.2%)
      if (rate >= 75) return '#059669'; // Emerald (Selangor 88.5%, Perlis 78.3%)
      if (rate >= 60) return '#10b981'; // Medium Emerald (Kedah 66.8%)
      if (rate >= 45) return '#6ee7b7'; // Light Emerald (Johor 59.5%, Perak 53.6%, Kelantan 51.4%, Terengganu 49.6%, Labuan 47.2%)
      return '#d1fae5';               // Soft Mint (<45%: Pahang 42.1%, Sabah 38.4%, Sarawak 35.1%)
    } else {
      const bor = data.bedOccupancyRate;
      if (bor >= 75) return '#b91c1c'; // Critical / High Load
      if (bor >= 65) return '#ea580c'; // Elevated
      if (bor >= 55) return '#f59e0b'; // Moderate
      if (bor >= 45) return '#38bdf8'; // Comfortable
      return '#bae6fd';               // Headroom (<45%)
    }
  }

  private updateMapColors(): void {
    const paths = this.element.querySelectorAll<SVGPathElement>('.hc-state-path');
    paths.forEach((path) => {
      const stateId = path.getAttribute('data-state-id');
      if (!stateId) return;
      const data = getStateHealthcare(stateId);
      if (data) {
        path.setAttribute('fill', this.getColorForState(data));
      }
    });
  }

  private renderLegend(): void {
    if (!this.legendElement) return;

    if (this.currentMode === 'access') {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Healthcare Access Rate (≤ 5 km)</span>
        <div class="legend-scale-row">
          <span class="legend-bound">&lt; 45%</span>
          <div class="legend-step-blocks">
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #d1fae5;" title="Extensive (&lt; 45%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #6ee7b7;" title="Moderate (45–60%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #10b981;" title="Moderate-High (60–75%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #059669;" title="High (75–90%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #047857;" title="Ultra-High (90%+) "></div>
          </div>
          <span class="legend-bound">90%+</span>
        </div>
      `;
    } else {
      this.legendElement.innerHTML = `
        <span class="legend-label-readiness">Bed Occupancy Rate (BOR)</span>
        <div class="legend-scale-row">
          <span class="legend-bound">&lt; 45%</span>
          <div class="legend-step-blocks">
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #bae6fd;" title="Headroom (&lt; 45%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #38bdf8;" title="Comfortable (45–55%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #f59e0b;" title="Moderate (55–65%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #ea580c;" title="Elevated (65–75%)"></div>
            <div class="step-block" style="width: 24px; height: 10px; border-radius: 2px; background-color: #b91c1c;" title="Critical / High Load (75%+)"></div>
          </div>
          <span class="legend-bound">75%+</span>
        </div>
      `;
    }
  }

  private renderMapSvg(): string {
    const pathsSvg = MALAYSIA_GEO_DATA.map((geo) => {
      const data = getStateHealthcare(geo.id);
      const fill = data ? this.getColorForState(data) : '#e2e8f0';
      const isSelected = geo.id === this.selectedStateId;

      return `
        <path
          class="hc-state-path ${isSelected ? 'selected' : ''}"
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
        class="hc-map-state-label"
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
        class="hc-malaysia-svg"
      >
        <g class="hc-paths-group">${pathsSvg}</g>
        <g class="hc-labels-group">${labelsSvg}</g>
      </svg>
    `;
  }

  private render(): void {
    this.element.innerHTML = '';

    // 1. Header with Badge, Title, Segmented Toggle & Compass
    const header = document.createElement('div');
    header.className = 'hc-card-header hc-map-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'hc-card-title-group';
    titleGroup.innerHTML = `
      <div class="hc-card-badge">
        <span class="hc-badge-dot" style="background-color: #059669;"></span>
        <span>SPATIAL CONGRUENCE DIAGNOSTIC</span>
      </div>
      <h3 class="hc-card-title">MALAYSIA HEALTHCARE ACCESS & CAPACITY</h3>
      <p class="hc-card-subtitle hc-map-subtitle">
        ${this.currentMode === 'access' ? 'Share of core tourism assets within ≤ 5 km of primary healthcare facilities' : 'State hospital bed occupancy rate (clinical utilisation load)'}
      </p>
    `;

    const hcMapH3 = titleGroup.querySelector('h3')!;
    const hcMapInfoIcon = createInfoIcon({
      sourceOrg: 'Ministry of Health Malaysia (MOH) & DOSM GeoPadang',
      datasetName: 'Healthcare Access & Bed Occupancy Choropleth Map',
      referenceYear: '2025',
      measure: 'State choropleth showing healthcare access rate (% tourism assets within 5 km of facility) or Bed Occupancy Rate.',
      formula: 'Access Rate = (Tourism assets ≤5km / Total assets) × 100 | BOR = (Patient Bed Days / Available Bed Days) × 100',
      limitations: 'Access rate uses straight-line proximity; BOR is a state average masking facility-level variation.',
    });
    hcMapInfoIcon.style.marginLeft = '6px';
    hcMapInfoIcon.style.verticalAlign = 'middle';
    hcMapH3.appendChild(hcMapInfoIcon);

    // Segmented Mode Toggle + Compass
    const headerActions = document.createElement('div');
    headerActions.className = 'hc-header-actions';

    const toggleWrap = document.createElement('div');
    toggleWrap.className = 'hc-segmented-control';
    toggleWrap.setAttribute('role', 'radiogroup');

    const accessBtn = document.createElement('button');
    accessBtn.className = `hc-segment-btn ${this.currentMode === 'access' ? 'active' : ''}`;
    accessBtn.setAttribute('data-mode', 'access');
    accessBtn.textContent = 'Healthcare Access (≤5km)';
    accessBtn.addEventListener('click', () => this.setMode('access'));

    const borBtn = document.createElement('button');
    borBtn.className = `hc-segment-btn ${this.currentMode === 'bor' ? 'active' : ''}`;
    borBtn.setAttribute('data-mode', 'bor');
    borBtn.textContent = 'Bed Occupancy (BOR)';
    borBtn.addEventListener('click', () => this.setMode('bor'));

    toggleWrap.appendChild(accessBtn);
    toggleWrap.appendChild(borBtn);

    const compassIcon = document.createElement('div');
    compassIcon.className = 'hc-compass-icon';
    compassIcon.title = 'North orientation';
    compassIcon.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#a7f3d0" stroke-width="1.2" />
        <polygon points="12 4 15 12 12 10 9 12" fill="#059669" />
        <polygon points="12 20 15 12 12 14 9 12" fill="#cbd5e1" />
        <text x="12" y="3.2" font-size="5" font-weight="900" fill="#059669" text-anchor="middle">N</text>
      </svg>
    `;

    headerActions.appendChild(toggleWrap);
    headerActions.appendChild(compassIcon);

    header.appendChild(titleGroup);
    header.appendChild(headerActions);
    this.element.appendChild(header);

    // 2. Map Stage
    const stage = document.createElement('div');
    stage.className = 'hc-map-stage';

    const svgWrap = document.createElement('div');
    svgWrap.className = 'hc-map-svg-wrap';
    svgWrap.innerHTML = this.renderMapSvg();
    stage.appendChild(svgWrap);

    // 3. Legend Step Bar
    this.legendElement = document.createElement('div');
    this.legendElement.className = 'map-legend-step-bar hc-map-legend';
    this.renderLegend();
    stage.appendChild(this.legendElement);

    this.element.appendChild(stage);

    this.attachSvgEvents();
  }

  private attachSvgEvents(): void {
    const paths = this.element.querySelectorAll<SVGPathElement>('.hc-state-path');
    const svgWrap = this.element.querySelector<HTMLElement>('.hc-map-svg-wrap');

    paths.forEach((path) => {
      const stateId = path.getAttribute('data-state-id');
      if (!stateId) return;

      path.addEventListener('mouseenter', (e: MouseEvent) => {
        if (stateId !== this.selectedStateId) {
          path.style.filter = 'brightness(1.12) drop-shadow(0 3px 8px rgba(5, 150, 105, 0.4))';
          path.style.stroke = '#0f172a';
          path.style.strokeWidth = '1.8';
        }
        const data = getStateHealthcare(stateId);
        if (data) this.showTooltip(data, e);
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
        if (this.onSelectStateCallback) {
          this.onSelectStateCallback(next);
        }
        const data = getStateHealthcare(stateId);
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

  private showTooltip(data: StateHealthcareData, e?: MouseEvent): void {
    const isSelected = this.selectedStateId === data.stateId;
    const isAccess = this.currentMode === 'access';

    const badgeClass = isAccess
      ? data.healthcareAccessRate5km >= 90
        ? 'safe'
        : data.healthcareAccessRate5km >= 60
        ? 'moderate'
        : 'critical'
      : data.bedOccupancyRate >= 75
      ? 'critical'
      : data.bedOccupancyRate >= 55
      ? 'moderate'
      : 'safe';

    const badgeText = isAccess
      ? `${data.healthcareAccessRate5km.toFixed(1)}% Access (≤5km)`
      : `${data.bedOccupancyRate.toFixed(1)}% BOR`;

    this.tooltipElement.innerHTML = `
      <div class="map-tooltip-header">
        <span class="map-tooltip-title">${data.stateName}</span>
        <span class="map-tooltip-quadrant ${badgeClass}">${badgeText}</span>
      </div>
      <div class="map-tooltip-body">
        <div class="map-tooltip-metric-row">
          <span>Healthcare Access (≤ 5km):</span>
          <strong>${data.healthcareAccessRate5km.toFixed(1)}%</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Primary Reach (≤ 2km):</span>
          <strong>${data.primaryAccessTiers.highPct.toFixed(1)}% (${data.primaryAccessTiers.highCount} assets)</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Healthcare Facilities:</span>
          <strong>${data.totalFacilities} (${data.hospitals} Hosp, ${data.clinics} Clin)</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Hospital Beds:</span>
          <strong>${data.totalBeds.toLocaleString()} (${data.bedsIcu} ICU)</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Bed Occupancy Rate:</span>
          <strong>${data.bedOccupancyRate.toFixed(1)}% BOR</strong>
        </div>
      </div>
      <div class="map-tooltip-footer">
        ${isSelected ? '● Active state • Click to deselect' : 'Click state to filter charts →'}
      </div>
    `;

    this.tooltipElement.style.display = 'block';
    if (e) {
      this.updateTooltipPos(e);
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

