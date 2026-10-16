import {
  FORECAST_MODELS_DATA,
  FORECAST_MODEL_SPECS,
  type ForecastModelId,
} from '../../../data/tourismDemandData';
import { createInfoIcon } from '../../Common/InfoTooltip';

export type DemandMetric = 'visitors' | 'expenditure' | 'aor';

function getPillIconSvg(iconType: string): string {
  switch (iconType) {
    case 'trend':
      return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`;
    case 'holiday':
      return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
    case 'uncertainty':
      return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
    case 'features':
      return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>`;
    case 'accuracy':
      return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`;
    case 'performance':
      return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path></svg>`;
    case 'complex':
      return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>`;
    case 'generalisation':
      return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
    case 'baseline':
    default:
      return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
  }
}

export class DemandCompositionChart {
  public readonly element: HTMLElement;
  private chartStage: HTMLElement;
  private tooltip!: HTMLElement;
  private currentMetric: DemandMetric = 'visitors';
  private currentModel: ForecastModelId = 'prophet';
  private subtitleEl: HTMLElement;
  private featuresRowEl: HTMLElement;
  private infoContainer: HTMLElement;
  private legendEl: HTMLElement;
  private currentModelBtnText!: HTMLElement;
  private dropdownBtn!: HTMLButtonElement;
  private dropdownMenu!: HTMLElement;
  private isDropdownOpen: boolean = false;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'demand-card';

    // Header
    const header = document.createElement('div');
    header.className = 'demand-card-header';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'flex-start';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'demand-card-title-group';

    // Title row with dropdown selector
    const titleRow = document.createElement('div');
    titleRow.style.display = 'flex';
    titleRow.style.alignItems = 'center';
    titleRow.style.gap = '8px';
    titleRow.style.flexWrap = 'wrap';

    const titleH3 = document.createElement('h3');
    titleH3.className = 'demand-card-title';
    titleH3.textContent = 'Quarterly Tourism Demand Forecast';

    // Custom Forecast Model Dropdown Component
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'forecast-model-dropdown-container';

    this.dropdownBtn = document.createElement('button');
    this.dropdownBtn.type = 'button';
    this.dropdownBtn.className = 'forecast-model-dropdown-btn';
    this.dropdownBtn.setAttribute('aria-haspopup', 'true');
    this.dropdownBtn.setAttribute('aria-expanded', 'false');
    this.dropdownBtn.setAttribute('title', 'Change forecasting model');
    this.dropdownBtn.innerHTML = `
      <span class="model-btn-label-prefix">Model:</span>
      <span class="model-btn-current-name">${FORECAST_MODEL_SPECS[this.currentModel]?.name || 'Prophet'}</span>
      <span class="model-btn-chevron">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </span>
    `;
    this.currentModelBtnText = this.dropdownBtn.querySelector('.model-btn-current-name') as HTMLElement;

    // Custom Menu Panel
    this.dropdownMenu = document.createElement('div');
    this.dropdownMenu.className = 'forecast-model-menu-panel hidden';

    const menuHeader = document.createElement('div');
    menuHeader.className = 'forecast-model-menu-header';
    menuHeader.innerHTML = `
      <span>Forecasting Models</span>
    `;
    this.dropdownMenu.appendChild(menuHeader);

    // List models with Prophet at the top (no accuracy ranking or metrics)
    const modelIds: ForecastModelId[] = ['prophet', 'xgboost', 'random_forest', 'linear'];

    modelIds.forEach((id) => {
      const spec = FORECAST_MODEL_SPECS[id];

      const itemBtn = document.createElement('button');
      itemBtn.type = 'button';
      itemBtn.className = `forecast-model-menu-item ${this.currentModel === id ? 'is-selected' : ''}`;
      itemBtn.dataset.modelId = id;
      itemBtn.innerHTML = `
        <div class="model-item-info">
          <div class="model-item-title-row">
            <span class="model-item-name">${spec?.name || id}</span>
          </div>
        </div>
        <span class="model-item-check">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
      `;

      itemBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectModel(id);
      });

      this.dropdownMenu.appendChild(itemBtn);
    });

    this.dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (this.isDropdownOpen && !dropdownContainer.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isDropdownOpen) {
        this.closeDropdown();
      }
    });

    dropdownContainer.appendChild(this.dropdownBtn);
    dropdownContainer.appendChild(this.dropdownMenu);

    titleRow.appendChild(titleH3);
    titleRow.appendChild(dropdownContainer);

    // Feature Badges (Prophet, Random Forest, XGBoost tags)
    this.featuresRowEl = document.createElement('div');
    this.featuresRowEl.className = 'model-features-row';

    // Dynamic Subtitle
    this.subtitleEl = document.createElement('span');
    this.subtitleEl.className = 'demand-card-desc';

    titleGroup.appendChild(titleRow);
    titleGroup.appendChild(this.featuresRowEl);
    titleGroup.appendChild(this.subtitleEl);

    // Segmented Control for Metric Toggle
    const toggleContainer = document.createElement('div');
    toggleContainer.style.display = 'flex';
    toggleContainer.style.alignItems = 'center';
    toggleContainer.style.gap = '10px';

    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'demand-metric-toggle';
    toggleGroup.style.display = 'flex';
    toggleGroup.style.gap = '4px';
    toggleGroup.style.background = '#f1f5f9';
    toggleGroup.style.padding = '4px';
    toggleGroup.style.borderRadius = '8px';

    const createToggleBtn = (id: DemandMetric, label: string, isActive: boolean) => {
      const btn = document.createElement('button');
      btn.className = `metric-toggle-btn ${isActive ? 'active' : ''}`;
      btn.textContent = label;
      btn.dataset.metric = id;
      Object.assign(btn.style, {
        border: 'none',
        background: isActive ? '#ffffff' : 'transparent',
        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: isActive ? '600' : '500',
        color: isActive ? '#0f172a' : '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      });
      btn.addEventListener('click', () => {
        this.currentMetric = id;
        Array.from(toggleGroup.children).forEach(child => {
          const cBtn = child as HTMLButtonElement;
          const isBtnActive = cBtn.dataset.metric === id;
          cBtn.style.background = isBtnActive ? '#ffffff' : 'transparent';
          cBtn.style.boxShadow = isBtnActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
          cBtn.style.fontWeight = isBtnActive ? '600' : '500';
          cBtn.style.color = isBtnActive ? '#0f172a' : '#64748b';
        });
        this.renderChart();
      });
      return btn;
    };

    toggleGroup.appendChild(createToggleBtn('visitors', 'Visitor', true));
    toggleGroup.appendChild(createToggleBtn('expenditure', 'Expenditure / Day', false));
    toggleGroup.appendChild(createToggleBtn('aor', 'Occupancy Rate (AOR)', false));

    this.infoContainer = document.createElement('div');
    this.infoContainer.style.display = 'flex';
    this.infoContainer.style.alignItems = 'center';

    toggleContainer.appendChild(toggleGroup);
    toggleContainer.appendChild(this.infoContainer);

    header.appendChild(titleGroup);
    header.appendChild(toggleContainer);

    this.chartStage = document.createElement('div');
    this.chartStage.className = 'composition-chart-stage';

    // Legend
    this.legendEl = document.createElement('div');
    this.legendEl.className = 'chart-legend-horizontal';

    this.element.appendChild(header);
    this.element.appendChild(this.chartStage);
    this.element.appendChild(this.legendEl);

    // Initial render
    this.updateModelDisplay();
    this.renderChart();
  }

  private toggleDropdown(): void {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  private openDropdown(): void {
    this.isDropdownOpen = true;
    this.dropdownBtn.classList.add('is-open');
    this.dropdownBtn.setAttribute('aria-expanded', 'true');
    this.dropdownMenu.classList.remove('hidden');
  }

  private closeDropdown(): void {
    this.isDropdownOpen = false;
    this.dropdownBtn.classList.remove('is-open');
    this.dropdownBtn.setAttribute('aria-expanded', 'false');
    this.dropdownMenu.classList.add('hidden');
  }

  private selectModel(modelId: ForecastModelId): void {
    if (this.currentModel === modelId) {
      this.closeDropdown();
      return;
    }
    this.currentModel = modelId;
    const spec = FORECAST_MODEL_SPECS[modelId];
    if (this.currentModelBtnText && spec) {
      this.currentModelBtnText.textContent = spec.name;
    }

    // Update active highlight classes on menu items
    const items = this.dropdownMenu.querySelectorAll('.forecast-model-menu-item');
    items.forEach((it) => {
      const el = it as HTMLElement;
      if (el.dataset.modelId === modelId) {
        el.classList.add('is-selected');
      } else {
        el.classList.remove('is-selected');
      }
    });

    this.closeDropdown();
    this.updateModelDisplay();
    this.renderChart();
  }

  private updateModelDisplay(): void {
    const spec = FORECAST_MODEL_SPECS[this.currentModel];
    if (!spec) return;

    // Update subtitle tagline
    this.subtitleEl.textContent = spec.tagline;

    // Update feature pills
    this.featuresRowEl.innerHTML = spec.pills
      .map(
        (p) => `
        <span class="model-pill-chip">
          ${getPillIconSvg(p.iconType)}
          <span>${p.label}</span>
        </span>
      `
      )
      .join('');

    // Update Info Icon Tooltip with dynamic model specs
    this.infoContainer.innerHTML = '';
    const infoIcon = createInfoIcon({
      sourceOrg: 'Tourism Malaysia Econometric Unit & DOSM DTS',
      datasetName: `Quarterly Tourism Demand Forecast (${spec.name})`,
      referenceYear: '2026 – 2030',
      measure: `Predictive model projecting quarterly domestic visitor volume, daily expenditure yields, and hotel occupancy under ${spec.name}.`,
      formula: spec.formula,
      limitations: spec.limitations.join('; '),
    });
    this.infoContainer.appendChild(infoIcon);

    // Update Legend
    this.legendEl.innerHTML = `
      <span class="legend-item-pill">
        <span style="width: 14px; height: 3px; background-color: #0b57d0; display: inline-block;"></span>
        Historical Actuals
      </span>
      <span class="legend-item-pill">
        <span style="width: 14px; height: 0px; border-top: 2px dashed #0284c7; display: inline-block;"></span>
        Projected Demand (${spec.name})
      </span>
      <span class="legend-item-pill">
        <span style="width: 12px; height: 10px; background-color: #e0f2fe; border: 1px solid #bae6fd; display: inline-block;"></span>
        95% Confidence Band
      </span>
    `;
  }

  private renderChart(): void {
    const spec = FORECAST_MODEL_SPECS[this.currentModel] || FORECAST_MODEL_SPECS.linear;
    const data = FORECAST_MODELS_DATA[this.currentModel] || FORECAST_MODELS_DATA.linear;

    if (!data || data.length === 0) {
      this.chartStage.innerHTML = `
        <div class="demand-empty-state">
          <span class="demand-empty-state-title">No forecast data available</span>
        </div>
      `;
      return;
    }

    const width = 960;
    const height = 360;
    const padLeft = 60;
    const padRight = 28;
    const padTop = 32;
    const padBottom = 42;

    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    let maxY = 150;
    let yTicks = [0, 30, 60, 90, 120, 150];
    let yFormat = (val: number) => val + 'M';

    if (this.currentMetric === 'expenditure') {
      maxY = 250;
      yTicks = [0, 50, 100, 150, 200, 250];
      yFormat = (val: number) => 'RM ' + val;
    } else if (this.currentMetric === 'aor') {
      maxY = 100;
      yTicks = [0, 25, 50, 75, 100];
      yFormat = (val: number) => val + '%';
    }

    const stepX = plotWidth / (data.length - 1);

    let coords = data.map((p, i) => {
      const x = padLeft + i * stepX;

      let yVal = 0;
      let lowerVal = 0;
      let upperVal = 0;
      let isFc = false;

      if (this.currentMetric === 'visitors') {
        yVal = p.domestic;
        lowerVal = p.lowerBound || yVal;
        upperVal = p.upperBound || yVal;
        isFc = !!p.isForecast;
      } else if (this.currentMetric === 'expenditure') {
        yVal = p.expenditure || 0;
        lowerVal = p.expenditureLower || yVal;
        upperVal = p.expenditureUpper || yVal;
        isFc = !!p.isForecast;
      } else if (this.currentMetric === 'aor') {
        yVal = p.aor || 0;
        lowerVal = p.aorLower || yVal;
        upperVal = p.aorUpper || yVal;
        isFc = !!p.isAorForecast;
      }

      const y = padTop + plotHeight - (yVal / maxY) * plotHeight;
      const yLower = isFc ? padTop + plotHeight - (lowerVal / maxY) * plotHeight : y;
      const yUpper = isFc ? padTop + plotHeight - (upperVal / maxY) * plotHeight : y;
      return { x, y, yLower, yUpper, yVal, lowerVal, upperVal, isFc, point: p };
    });

    // If AOR, only show 1 point per year (at Q1 to align with x-axis year labels)
    if (this.currentMetric === 'aor') {
      coords = coords.filter((c) => c.point.quarter === 1);
    }

    const histCoords = coords.filter((c) => !c.isFc);
    const forecastCoords = coords.filter((c) => c.isFc);

    // Connect historical to forecast
    if (histCoords.length > 0 && forecastCoords.length > 0) {
      forecastCoords.unshift(histCoords[histCoords.length - 1]);
    }

    // Paths
    const histPathD = histCoords
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');
    const forecastPathD = forecastCoords
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');

    // Confidence Band Area (Upper bound -> Lower bound backwards)
    let ciPathD = '';
    if (forecastCoords.length > 1) {
      ciPathD = forecastCoords
        .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.yUpper.toFixed(1)}`)
        .join(' ');
      const lowerReversed = [...forecastCoords].reverse();
      ciPathD += ' ' + lowerReversed.map((c) => `L ${c.x.toFixed(1)} ${c.yLower.toFixed(1)}`).join(' ');
      ciPathD += ' Z';
    }

    // Gridlines
    const gridLines = yTicks
      .map((val) => {
        const y = padTop + plotHeight - (val / maxY) * plotHeight;
        return `
        <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="#f1f5f9" stroke-width="1.2" />
        <text x="${padLeft - 10}" y="${y + 3.5}" font-size="10" fill="#94a3b8" text-anchor="end" font-weight="600">${yFormat(val)}</text>
      `;
      })
      .join('');

    // X Axis Labels (Every year Q1 or start/end)
    const xLabels = coords
      .filter((c, i) => c.point.quarter === 1 || i === coords.length - 1 || i === 0)
      .map(
        (c) => `
        <text x="${c.x}" y="${height - 12}" font-size="10" fill="#64748b" text-anchor="middle" font-weight="600">
          ${c.point.year} ${c.point.quarter === 1 ? '' : 'Q' + c.point.quarter}
        </text>
      `
      )
      .join('');

    // Horizon Marker
    let horizonMarker = '';
    const firstForecast = coords.find((c) => c.isFc);
    if (firstForecast) {
      horizonMarker = `
        <line x1="${firstForecast.x}" y1="${padTop}" x2="${firstForecast.x}" y2="${padTop + plotHeight}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 4" />
        <text x="${firstForecast.x}" y="${padTop - 12}" font-size="9" fill="#64748b" text-anchor="middle" font-weight="700" letter-spacing="1.5">FORECAST HORIZON</text>
      `;
    }

    // Interactive Hover Circles
    const hoverPoints = coords
      .map(
        (c, idx) => `
      <g class="chart-hover-marker" data-index="${idx}" role="button" aria-label="${c.point.period}">
        <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="14" fill="transparent" class="hover-hitbox" />
        <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="7" fill="${c.isFc ? '#bae6fd' : '#38bdf8'}" class="hover-ring" />
        <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.8" fill="${c.isFc ? '#ffffff' : '#0b57d0'}" stroke="${c.isFc ? '#0284c7' : '#ffffff'}" stroke-width="2" class="point-circle" />
      </g>
    `
      )
      .join('');

    this.chartStage.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="composition-chart-svg" aria-label="Tourism Demand Forecast Chart">
        <g class="grid-layer">${gridLines}</g>
        
        <!-- Forecast Confidence Band -->
        ${ciPathD ? `<path d="${ciPathD}" fill="#e0f2fe" fill-opacity="0.6" />` : ''}
        
        <!-- Horizon Line -->
        ${horizonMarker}
        
        <!-- Forecast Line -->
        ${forecastPathD ? `<path d="${forecastPathD}" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="6 4" stroke-linecap="round" stroke-linejoin="round" />` : ''}
        
        <!-- Historical Line -->
        ${histPathD ? `<path d="${histPathD}" fill="none" stroke="#0b57d0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />` : ''}
        
        <g class="x-axis-layer">${xLabels}</g>
        
        <!-- Guideline (for hover) -->
        <line class="composition-guideline" x1="0" y1="${padTop}" x2="0" y2="${padTop + plotHeight}" />
        
        <g class="markers-layer">${hoverPoints}</g>
      </svg>
    `;

    // Tooltip logic
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'composition-tooltip hidden';
    }
    this.chartStage.appendChild(this.tooltip);

    const guideline = this.chartStage.querySelector('.composition-guideline') as SVGLineElement | null;
    const markers = this.chartStage.querySelectorAll('.chart-hover-marker');

    const showTooltipForCoord = (idx: number, markerEl?: Element) => {
      const coord = coords[idx];
      if (!coord) return;

      markers.forEach((m) => m.classList.remove('active'));
      const activeMarker = markerEl || markers[idx];
      if (activeMarker) activeMarker.classList.add('active');

      if (guideline) {
        guideline.setAttribute('x1', coord.x.toFixed(1));
        guideline.setAttribute('x2', coord.x.toFixed(1));
        guideline.classList.add('active');
      }

      const p = coord.point;
      const typeLabel = coord.isFc ? 'Projected' : 'Actual';

      let metricName = 'Demand';
      let valueFormat = (val: number) => val.toFixed(2) + 'M';

      if (this.currentMetric === 'expenditure') {
        metricName = 'Expenditure/Day';
        valueFormat = (val: number) => 'RM ' + val.toFixed(2);
      } else if (this.currentMetric === 'aor') {
        metricName = 'Occupancy Rate';
        valueFormat = (val: number) => val.toFixed(1) + '%';
      }

      let extraHtml = '';
      if (coord.isFc) {
        extraHtml = `
          <div class="comp-tt-row" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e2e8f0;">
            <span class="comp-tt-label" style="font-size: 11px; color: #64748b;">95% Confidence Bounds (${spec.name})</span>
          </div>
          <div class="comp-tt-row" style="font-size: 11px;">
            <span class="comp-tt-label">Upper Bound</span>
            <span class="comp-tt-val" style="color: #64748b;">${valueFormat(coord.upperVal)}</span>
          </div>
          <div class="comp-tt-row" style="font-size: 11px;">
            <span class="comp-tt-label">Lower Bound</span>
            <span class="comp-tt-val" style="color: #64748b;">${valueFormat(coord.lowerVal)}</span>
          </div>
        `;
      }

      this.tooltip.innerHTML = `
        <div class="composition-tooltip-header">
          <span class="comp-tt-badge ${coord.isFc ? 'forecast-badge' : ''}">${p.year} Q${p.quarter}</span>
          <span class="comp-tt-period">${p.period}</span>
        </div>
        <div class="composition-tooltip-body">
          <div class="comp-tt-row">
            <span class="comp-tt-label">
              <span class="legend-dot domestic" style="${coord.isFc ? 'background-color: transparent; border: 2px solid #0284c7;' : ''}"></span> ${typeLabel} ${metricName}
            </span>
            <span class="comp-tt-val" style="${coord.isFc ? 'color: #0284c7;' : ''}">${valueFormat(coord.yVal)}</span>
          </div>
          ${
            coord.isFc
              ? `
            <div class="comp-tt-row" style="font-size: 11px; margin-top: 2px; color: #0284c7;">
              <span class="comp-tt-label" style="color: #64748b;">Model</span>
              <span class="comp-tt-val" style="font-weight: 700;">${spec.name}</span>
            </div>
          `
              : ''
          }
          ${extraHtml}
        </div>
      `;

      this.tooltip.classList.remove('hidden');

      const stageRect = this.chartStage.getBoundingClientRect();
      const circleEl = (activeMarker || this.chartStage).querySelector('.point-circle') as SVGCircleElement | null;
      if (circleEl) {
        const circleRect = circleEl.getBoundingClientRect();
        const relX = circleRect.left - stageRect.left + circleRect.width / 2;
        const relY = circleRect.top - stageRect.top;

        this.tooltip.style.left = `${relX}px`;
        this.tooltip.style.top = `${relY - 10}px`;

        if (relX < 110) {
          this.tooltip.style.transform = 'translate(-15%, -100%)';
        } else if (relX > stageRect.width - 110) {
          this.tooltip.style.transform = 'translate(-85%, -100%)';
        } else {
          this.tooltip.style.transform = 'translate(-50%, -100%)';
        }
      }
    };

    const hideTooltip = () => {
      markers.forEach((m) => m.classList.remove('active'));
      if (guideline) guideline.classList.remove('active');
      this.tooltip.classList.add('hidden');
    };

    markers.forEach((marker) => {
      const idx = parseInt(marker.getAttribute('data-index') || '0', 10);
      marker.addEventListener('mouseenter', () => showTooltipForCoord(idx, marker));
      marker.addEventListener('mouseleave', hideTooltip);
      marker.addEventListener('touchstart', (e) => {
        e.preventDefault();
        showTooltipForCoord(idx, marker);
      }, { passive: false });
    });

    const svgEl = this.chartStage.querySelector('svg');
    if (svgEl) svgEl.addEventListener('mouseleave', hideTooltip);
  }
}
