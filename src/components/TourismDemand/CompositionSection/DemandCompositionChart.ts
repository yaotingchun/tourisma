import { COMPOSITION_TIME_SERIES } from '../../../data/tourismDemandData';
import { createInfoIcon } from '../../Common/InfoTooltip';

export type DemandMetric = 'visitors' | 'expenditure' | 'aor';

export class DemandCompositionChart {
  public readonly element: HTMLElement;
  private chartStage: HTMLElement;
  private tooltip!: HTMLElement;
  private currentMetric: DemandMetric = 'visitors';

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
    titleGroup.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <h3 class="demand-card-title">Quarterly Tourism Demand Forecast</h3>
        <span class="modelled-tag-badge" style="font-size: 11px;">Modelled (Linear Regression)</span>
      </div>
      <span class="demand-card-desc">Historical actuals (solid) & projected trajectory (dashed) to 2030 using linear regression with 95% confidence interval</span>
    `;

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
      // inline styles for now, can move to css later
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
        // update button styles
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

    const infoIcon = createInfoIcon({
      sourceOrg: 'Tourism Malaysia Econometric Unit & DOSM DTS',
      datasetName: 'Quarterly Tourism Demand & Econometric Projections (2020 – 2030)',
      referenceYear: '2026 – 2030',
      measure: 'Time-series regression model projecting quarterly visitor volume, daily expenditure yields, and hotel occupancy.',
      formula: 'Ordinary Least Squares (OLS) Linear Trend with Seasonality Fourier Decomposition & 95% Confidence Interval',
      limitations: 'Projections assume macroeconomic baseline stability; external shocks (epidemics, geopolitical unrest) are unmodeled.',
    });

    toggleContainer.appendChild(toggleGroup);
    toggleContainer.appendChild(infoIcon);

    header.appendChild(titleGroup);
    header.appendChild(toggleContainer);

    this.chartStage = document.createElement('div');
    this.chartStage.className = 'composition-chart-stage';

    // Legend
    const legend = document.createElement('div');
    legend.className = 'chart-legend-horizontal';
    legend.innerHTML = `
      <span class="legend-item-pill">
        <span style="width: 14px; height: 3px; background-color: #0b57d0; display: inline-block;"></span>
        Historical Actuals
      </span>
      <span class="legend-item-pill">
        <span style="width: 14px; height: 0px; border-top: 2px dashed #0284c7; display: inline-block;"></span>
        Projected Demand
      </span>
      <span class="legend-item-pill">
        <span style="width: 12px; height: 10px; background-color: #e0f2fe; border: 1px solid #bae6fd; display: inline-block;"></span>
        95% Confidence Band
      </span>
    `;

    this.element.appendChild(header);
    this.element.appendChild(this.chartStage);
    this.element.appendChild(legend);

    this.renderChart();
  }

  private renderChart(): void {
    const data = COMPOSITION_TIME_SERIES;

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
        maxY = 250; // Values range from RM ~136 to RM ~204 (95% CI upper bound ~219)
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

    // If AOR, only show 1 point per year (e.g., at Q1 to align with x-axis year labels)
    if (this.currentMetric === 'aor') {
        coords = coords.filter(c => c.point.quarter === 1);
    }

    const histCoords = coords.filter(c => !c.isFc);
    const forecastCoords = coords.filter(c => c.isFc);
    
    // Connect historical to forecast
    if (histCoords.length > 0 && forecastCoords.length > 0) {
      forecastCoords.unshift(histCoords[histCoords.length - 1]);
    }

    // Paths
    let histPathD = histCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    let forecastPathD = forecastCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

    // Confidence Band Area (Upper bound -> Lower bound backwards)
    let ciPathD = '';
    if (forecastCoords.length > 1) {
      ciPathD = forecastCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.yUpper.toFixed(1)}`).join(' ');
      const lowerReversed = [...forecastCoords].reverse();
      ciPathD += ' ' + lowerReversed.map((c) => `L ${c.x.toFixed(1)} ${c.yLower.toFixed(1)}`).join(' ');
      ciPathD += ' Z';
    }

    // Gridlines
    const gridLines = yTicks.map((val) => {
      const y = padTop + plotHeight - (val / maxY) * plotHeight;
      return `
        <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="#f1f5f9" stroke-width="1.2" />
        <text x="${padLeft - 10}" y="${y + 3.5}" font-size="10" fill="#94a3b8" text-anchor="end" font-weight="600">${yFormat(val)}</text>
      `;
    }).join('');

    // X Axis Labels (Every year Q1 or start/end)
    const xLabels = coords.filter((c, i) => c.point.quarter === 1 || i === coords.length - 1 || i === 0)
      .map((c) => `
        <text x="${c.x}" y="${height - 12}" font-size="10" fill="#64748b" text-anchor="middle" font-weight="600">
          ${c.point.year} ${c.point.quarter === 1 ? '' : 'Q' + c.point.quarter}
        </text>
      `).join('');

    // Horizon Marker
    let horizonMarker = '';
    const firstForecast = coords.find(c => c.isFc);
    if (firstForecast) {
      horizonMarker = `
        <line x1="${firstForecast.x}" y1="${padTop}" x2="${firstForecast.x}" y2="${padTop + plotHeight}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 4" />
        <text x="${firstForecast.x}" y="${padTop - 12}" font-size="9" fill="#64748b" text-anchor="middle" font-weight="700" letter-spacing="1.5">FORECAST HORIZON</text>
      `;
    }

    // Interactive Hover Circles
    const hoverPoints = coords.map((c, idx) => `
      <g class="chart-hover-marker" data-index="${idx}" role="button" aria-label="${c.point.period}">
        <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="14" fill="transparent" class="hover-hitbox" />
        <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="7" fill="${c.isFc ? '#bae6fd' : '#38bdf8'}" class="hover-ring" />
        <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.8" fill="${c.isFc ? '#ffffff' : '#0b57d0'}" stroke="${c.isFc ? '#0284c7' : '#ffffff'}" stroke-width="2" class="point-circle" />
      </g>
    `).join('');

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

      markers.forEach(m => m.classList.remove('active'));
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
            <span class="comp-tt-label" style="font-size: 11px; color: #64748b;">95% Confidence Bounds</span>
          </div>
          <div class="comp-tt-row" style="font-size: 11px;">
            <span class="comp-tt-label">Upper</span>
            <span class="comp-tt-val" style="color: #64748b;">${valueFormat(coord.upperVal)}</span>
          </div>
          <div class="comp-tt-row" style="font-size: 11px;">
            <span class="comp-tt-label">Lower</span>
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
      markers.forEach(m => m.classList.remove('active'));
      if (guideline) guideline.classList.remove('active');
      this.tooltip.classList.add('hidden');
    };

    markers.forEach(marker => {
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
