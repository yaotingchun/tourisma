import {
  STATE_ENVIRONMENT_LIST,
  type StateEnvironmentData,
} from '../../data/environmentData';
import { createInfoIcon } from '../Common/InfoTooltip';

export type BarMetricMode = 'count' | 'percent';
export type BarSortMode = 'total' | 'land' | 'marine' | 'name';

export class EnvironmentExposureBarChart {
  public readonly element: HTMLElement;
  private metricMode: BarMetricMode = 'count';
  private sortMode: BarSortMode = 'total';
  private selectedStateId: string | null = null;
  private barsContainer!: HTMLElement;
  private tooltip!: HTMLElement;
  private onSelectStateCallback?: (stateId: string) => void;

  constructor(onSelectState?: (stateId: string) => void) {
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'asset-card env-barchart-card';

    this.createTooltip();
    this.render();
  }

  private createTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'env-floating-tooltip';
    this.tooltip.style.display = 'none';
    document.body.appendChild(this.tooltip);

    // Hide tooltip whenever mouse leaves the chart container
    this.element.addEventListener('mouseleave', () => this.hideTooltip());
  }

  public hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  public setSelectedState(stateId: string | null): void {
    this.selectedStateId = stateId;
    this.hideTooltip();
    this.updateBars();
  }

  private render(): void {
    this.element.innerHTML = '';

    // Card Header
    const header = document.createElement('div');
    header.className = 'asset-card-header env-bar-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'asset-card-title-group';
    titleGroup.innerHTML = `
      <div class="asset-card-badge">
        <span class="asset-badge-dot" style="background-color: #0284c7;"></span>
        <span>STATE COMPARATIVE DIAGNOSTIC</span>
      </div>
      <h3 class="asset-card-title">ENVIRONMENTAL EXPOSURE BY STATE (LAND & MARINE)</h3>
      <p class="asset-card-subtitle">Comparative side-by-side asset exposure to terrestrial conservation reserves vs marine & reef parks</p>
    `;

    const barH3 = titleGroup.querySelector('h3')!;
    const barInfoIcon = createInfoIcon({
      sourceOrg: 'Forestry Department Malaysia & Department of Marine Park Malaysia',
      datasetName: 'State Land & Marine Eco-Exposure Bar Chart',
      referenceYear: '2025',
      measure: 'Side-by-side horizontal bar chart showing tourism asset counts or % exposed to terrestrial (green) and marine (blue) protected areas per state.',
      formula: 'Land Exposure = Assets within 500m of terrestrial reserve | Marine Exposure = Assets within 1km of marine park boundary',
      limitations: 'Dual-exposure assets (both land and marine) may be counted in both categories; not mutually exclusive.',
    });
    barInfoIcon.style.marginLeft = '6px';
    barInfoIcon.style.verticalAlign = 'middle';
    barH3.appendChild(barInfoIcon);

    // Right-side Controls
    const controlsWrap = document.createElement('div');
    controlsWrap.className = 'env-bar-controls-wrap';

    // Metric Mode Toggle (Count vs %)
    const metricToggle = document.createElement('div');
    metricToggle.className = 'asset-segmented-control env-segmented-control';
    metricToggle.innerHTML = `
      <button class="asset-segment-btn ${this.metricMode === 'count' ? 'active' : ''}" data-mode="count">Asset Count</button>
      <button class="asset-segment-btn ${this.metricMode === 'percent' ? 'active' : ''}" data-mode="percent">Percentage (%)</button>
    `;
    metricToggle.querySelectorAll('.asset-segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode') as BarMetricMode;
        if (mode && this.metricMode !== mode) {
          this.metricMode = mode;
          metricToggle.querySelectorAll('.asset-segment-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.updateBars();
        }
      });
    });

    // Sort Dropdown
    const sortSelect = document.createElement('select');
    sortSelect.className = 'env-sort-select';
    sortSelect.innerHTML = `
      <option value="total" ${this.sortMode === 'total' ? 'selected' : ''}>Sort: Total Exposure</option>
      <option value="land" ${this.sortMode === 'land' ? 'selected' : ''}>Sort: Land Eco-Exposure</option>
      <option value="marine" ${this.sortMode === 'marine' ? 'selected' : ''}>Sort: Marine Eco-Exposure</option>
      <option value="name" ${this.sortMode === 'name' ? 'selected' : ''}>Sort: State Name (A–Z)</option>
    `;
    sortSelect.addEventListener('change', () => {
      this.sortMode = sortSelect.value as BarSortMode;
      this.updateBars();
    });

    controlsWrap.appendChild(metricToggle);
    controlsWrap.appendChild(sortSelect);

    header.appendChild(titleGroup);
    header.appendChild(controlsWrap);

    // Legend Strip
    const legendStrip = document.createElement('div');
    legendStrip.className = 'env-bar-legend-strip';
    legendStrip.innerHTML = `
      <div class="env-bar-legend-item">
        <span class="env-series-dot land"></span>
        <strong>Land Environmental Exposure</strong>
        <span class="env-legend-sub">(Forest Reserves, National Parks, Wildlife Sanctuaries)</span>
      </div>
      <div class="env-bar-legend-item">
        <span class="env-series-dot marine"></span>
        <strong>Marine Environmental Exposure</strong>
        <span class="env-legend-sub">(Marine Parks, Coastal Protected Areas, Turtle Sanctuaries)</span>
      </div>
    `;

    // Column Headers above the bars
    const columnHeaderRow = document.createElement('div');
    columnHeaderRow.className = 'env-bar-header-row';
    columnHeaderRow.innerHTML = `
      <span>State & Total Assets</span>
      <span>Ecosystem Proximity Distribution (Land vs Marine)</span>
      <span style="text-align: right;">Total Exposed</span>
    `;

    // Bars Container
    this.barsContainer = document.createElement('div');
    this.barsContainer.className = 'env-bars-list-container';

    this.element.appendChild(header);
    this.element.appendChild(legendStrip);
    this.element.appendChild(columnHeaderRow);
    this.element.appendChild(this.barsContainer);

    this.updateBars();
  }

  private getSortedData(): StateEnvironmentData[] {
    const list = [...STATE_ENVIRONMENT_LIST];
    if (this.sortMode === 'total') {
      if (this.metricMode === 'percent') {
        return list.sort((a, b) => b.exposurePct - a.exposurePct);
      }
      return list.sort((a, b) => b.totalExposed - a.totalExposed);
    }
    if (this.sortMode === 'land') {
      if (this.metricMode === 'percent') {
        return list.sort((a, b) => b.land.percent - a.land.percent);
      }
      return list.sort((a, b) => b.land.exposed - a.land.exposed);
    }
    if (this.sortMode === 'marine') {
      if (this.metricMode === 'percent') {
        return list.sort((a, b) => b.marine.percent - a.marine.percent);
      }
      return list.sort((a, b) => b.marine.exposed - a.marine.exposed);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  private getSeverityClass(pct: number): string {
    if (pct > 25) return 'critical';
    if (pct > 15) return 'high';
    if (pct > 5) return 'moderate';
    return 'safe';
  }

  private updateBars(): void {
    const data = this.getSortedData();

    // Determine max value for scale normalization
    let maxVal = 1;
    if (this.metricMode === 'count') {
      data.forEach((s) => {
        if (s.land.exposed > maxVal) maxVal = s.land.exposed;
        if (s.marine.exposed > maxVal) maxVal = s.marine.exposed;
      });
    } else {
      data.forEach((s) => {
        if (s.land.percent > maxVal) maxVal = s.land.percent;
        if (s.marine.percent > maxVal) maxVal = s.marine.percent;
      });
      maxVal = Math.max(maxVal * 1.05, 35);
    }

    this.barsContainer.innerHTML = '';

    data.forEach((state) => {
      const isSelected = this.selectedStateId === state.id;
      const severityClass = this.getSeverityClass(state.exposurePct);

      const row = document.createElement('div');
      row.className = `env-bar-row ${isSelected ? 'selected' : ''}`;
      row.setAttribute('data-state-id', state.id);

      const landVal = this.metricMode === 'count' ? state.land.exposed : state.land.percent;
      const marineVal = this.metricMode === 'count' ? state.marine.exposed : state.marine.percent;

      const landWidthPct = maxVal > 0 ? Math.min((landVal / maxVal) * 100, 100) : 0;
      const marineWidthPct = maxVal > 0 ? Math.min((marineVal / maxVal) * 100, 100) : 0;

      const landMetricHtml = this.metricMode === 'count'
        ? `<strong>${state.land.exposed.toLocaleString()}</strong> <span class="env-series-val-sub">(${state.land.percent}%)</span>`
        : `<strong>${state.land.percent.toFixed(1)}%</strong> <span class="env-series-val-sub">(${state.land.exposed.toLocaleString()})</span>`;

      const marineMetricHtml = this.metricMode === 'count'
        ? `<strong>${state.marine.exposed.toLocaleString()}</strong> <span class="env-series-val-sub">(${state.marine.percent}%)</span>`
        : `<strong>${state.marine.percent.toFixed(1)}%</strong> <span class="env-series-val-sub">(${state.marine.exposed.toLocaleString()})</span>`;

      row.innerHTML = `
        <div class="env-bar-state-label">
          <span class="env-state-code-badge">${state.code}</span>
          <div class="env-state-name-wrap">
            <span class="env-bar-state-name">${state.name}</span>
            <span class="env-bar-state-total">${state.totalAssets.toLocaleString()} total assets</span>
          </div>
        </div>

        <div class="env-bar-track-group">
          <!-- Land Line -->
          <div class="env-series-line">
            <div class="env-series-tag land">
              <span class="env-series-dot land"></span>
              <span>Land</span>
            </div>
            <div class="env-series-track">
              <div class="env-series-fill land" style="width: ${landWidthPct}%;"></div>
            </div>
            <div class="env-series-val land ${state.land.exposed === 0 ? 'zero' : ''}">
              ${landMetricHtml}
            </div>
          </div>

          <!-- Marine Line -->
          <div class="env-series-line">
            <div class="env-series-tag marine">
              <span class="env-series-dot marine"></span>
              <span>Marine</span>
            </div>
            <div class="env-series-track">
              <div class="env-series-fill marine" style="width: ${marineWidthPct}%;"></div>
            </div>
            <div class="env-series-val marine ${state.marine.exposed === 0 ? 'zero' : ''}">
              ${marineMetricHtml}
            </div>
          </div>
        </div>

        <div class="env-bar-total-col" title="Total Exposed Assets (${state.exposurePct}% of state)">
          <span class="env-total-num">${state.totalExposed.toLocaleString()}</span>
          <span class="env-total-severity-badge ${severityClass}">${state.exposurePct}%</span>
        </div>
      `;

      // Hover Tooltip with Neater, Structured UI
      row.addEventListener('mouseenter', (e) => {
        this.renderTooltip(state, isSelected);
        this.tooltip.style.display = 'block';
        this.updateTooltipPos(e as MouseEvent);
      });

      row.addEventListener('mousemove', (e) => this.updateTooltipPos(e as MouseEvent));
      row.addEventListener('mouseleave', () => {
        this.tooltip.style.display = 'none';
      });

      row.addEventListener('click', () => {
        this.hideTooltip();
        this.selectedStateId = this.selectedStateId === state.id ? null : state.id;
        this.updateBars();
        if (this.onSelectStateCallback) {
          this.onSelectStateCallback(state.id);
        }
      });

      this.barsContainer.appendChild(row);
    });
  }

  private renderTooltip(state: StateEnvironmentData, isSelected: boolean): void {
    const severityClass = this.getSeverityClass(state.exposurePct);

    this.tooltip.innerHTML = `
      <div class="map-tooltip-header">
        <span class="map-tooltip-title">${state.name}</span>
        <span class="map-tooltip-quadrant ${severityClass}">${state.exposurePct}% Combined</span>
      </div>
      <div class="map-tooltip-body">
        <div class="map-tooltip-metric-row">
          <span>Total Screened Assets:</span>
          <strong>${state.totalAssets.toLocaleString()} assets</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Combined Exposure:</span>
          <strong>${state.exposurePct}% (${state.totalExposed.toLocaleString()})</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Land Eco-Exposure:</span>
          <strong>${state.land.percent}% (${state.land.exposed.toLocaleString()})</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Marine Eco-Exposure:</span>
          <strong>${state.marine.percent}% (${state.marine.exposed.toLocaleString()})</strong>
        </div>
        <div class="map-tooltip-metric-row">
          <span>Inside Reserves:</span>
          <strong>${state.inside.toLocaleString()} assets</strong>
        </div>
      </div>
      <div class="map-tooltip-footer">
        ${isSelected ? '● Active state • Click to deselect' : 'Click state to filter map & proximity ring →'}
      </div>
    `;
  }

  private updateTooltipPos(e: MouseEvent): void {
    const pad = 16;
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const tw = tooltipRect.width || 220;
    const th = tooltipRect.height || 180;

    let x = e.clientX + pad;
    let y = e.clientY + pad;

    // Viewport right edge overflow check
    if (x + tw > window.innerWidth - pad) {
      x = e.clientX - tw - pad;
    }

    // Viewport bottom edge overflow check
    // Viewport bottom edge overflow check
    if (y + th > window.innerHeight - pad) {
      y = e.clientY - th - pad;
    }

    if (y < pad) {
      y = pad;
    }

    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }
}
