import { QUARTERLY_PRESSURE_DATA, type QuarterlyPressurePoint } from '../../../data/overviewData';
import { createInfoIcon } from '../../Common/InfoTooltip';

export class TourismPressureCard {
  public readonly element: HTMLElement;
  private data: QuarterlyPressurePoint[];
  private tooltipEl!: HTMLElement;

  constructor(data: QuarterlyPressurePoint[] = QUARTERLY_PRESSURE_DATA) {
    this.element = document.createElement('div');
    this.element.className = 'bottom-insight-card';
    this.data = data;
    this.render();
  }

  public updateData(data: QuarterlyPressurePoint[]): void {
    this.data = data;
    this.render();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="bottom-card-header flex-between" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
        <div class="pressure-header-left">
          <h3 class="bottom-card-title">TOURISM PRESSURE</h3>
          <span class="bottom-card-subtitle">2025 Quarterly arrivals (M)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="pressure-chart-legend">
            <span class="legend-item-solid"><span class="solid-line-icon"></span> 2025 (290.1M)</span>
          </div>
          <div class="overview-pressure-info-slot"></div>
        </div>
      </div>
      <div class="pressure-chart-wrapper" style="position: relative; overflow: visible;">
        ${this.renderChartSvg()}
        <div class="pressure-chart-tooltip" style="display: none;"></div>
      </div>
    `;

    const infoSlot = this.element.querySelector('.overview-pressure-info-slot');
    if (infoSlot) {
      const infoIcon = createInfoIcon({
        sourceOrg: 'Tourism Malaysia & Department of Statistics Malaysia (DOSM)',
        datasetName: 'Quarterly Tourism Seasonality & Arrival Velocity',
        referenceYear: '2025',
        measure: 'Quarter-by-quarter visitor arrivals demonstrating national peak and low season velocity curve.',
        formula: 'Sum of monthly domestic and international arrivals grouped into calendar quarters Q1-Q4',
        limitations: 'Seasonal spikes heavily correlated with school term breaks and festive holiday calendars.',
      });
      infoSlot.replaceWith(infoIcon);
    }

    this.tooltipEl = this.element.querySelector<HTMLElement>('.pressure-chart-tooltip')!;
    this.attachHoverListeners();
  }

  private renderChartSvg(): string {
    const currentSeries = this.data.map((d) => d.currentYearM);
    const quarters = this.data.map((d) => d.quarter || d.month || 'Q');

    const width = 280;
    const height = 115;
    const padLeft = 24;
    const padRight = 14;
    const padTop = 14;
    const padBottom = 22;

    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    // Focused 2025 scale (60M to 76M) gives the seasonal curve natural amplitude and clarity
    const minVal = 60.0;
    const maxVal = 76.0;
    const range = maxVal - minVal;

    const getX = (idx: number) => padLeft + (idx / (quarters.length - 1)) * chartW;
    const getY = (val: number) => padTop + chartH - ((Math.max(minVal, Math.min(maxVal, val)) - minVal) / range) * chartH;

    // Y-Axis Ticks & Grid Lines [60, 65, 70, 75]
    const yTicks = [60, 65, 70, 75];
    const yGridLines = yTicks
      .map((t) => {
        const y = getY(t);
        return `
          <line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${(width - padRight).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#f1f5f9" stroke-width="1" />
          <text x="${(padLeft - 4).toFixed(1)}" y="${(y + 3).toFixed(1)}" font-size="7" fill="#94a3b8" text-anchor="end">${t}</text>
        `;
      })
      .join('');

    // X-Axis Quarter Labels
    const xLabels = quarters
      .map((q, idx) => {
        const x = getX(idx);
        return `<text x="${x.toFixed(1)}" y="${(height - 5).toFixed(1)}" font-size="7.5" font-weight="700" fill="#64748b" text-anchor="middle">${q}</text>`;
      })
      .join('');

    // 2025 Coordinates
    const currCoords = currentSeries.map((v, i) => ({ x: getX(i), y: getY(v) }));

    // Smooth Bezier Curve Path
    let currentD = `M ${currCoords[0].x.toFixed(1)},${currCoords[0].y.toFixed(1)}`;
    for (let i = 0; i < currCoords.length - 1; i++) {
      const p0 = currCoords[i];
      const p1 = currCoords[i + 1];
      const cpx = (p0.x + p1.x) / 2;
      currentD += ` C ${cpx.toFixed(1)},${p0.y.toFixed(1)} ${cpx.toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }

    // Gradient Area Fill under 2025 curve
    const bottomY = (padTop + chartH).toFixed(1);
    const areaD = `${currentD} L ${currCoords[currCoords.length - 1].x.toFixed(1)},${bottomY} L ${currCoords[0].x.toFixed(1)},${bottomY} Z`;

    // Static Point Circles
    const dotsSvg = currentSeries
      .map((_, i) => {
        const pt = currCoords[i];
        return `
          <circle
            id="pressure-dot-${i}"
            class="pressure-point-dot"
            cx="${pt.x.toFixed(1)}"
            cy="${pt.y.toFixed(1)}"
            r="3.5"
            fill="#0b57d0"
            stroke="#ffffff"
            stroke-width="1.8"
            style="transition: r 0.15s ease, stroke-width 0.15s ease;"
          />
        `;
      })
      .join('');

    // Hover detection bands for each quarter
    const hoverSlicesSvg = quarters
      .map((_, i) => {
        const sliceX = i === 0 ? padLeft - 6 : (currCoords[i - 1].x + currCoords[i].x) / 2;
        const nextX = i === quarters.length - 1 ? width - padRight + 6 : (currCoords[i].x + currCoords[i + 1].x) / 2;
        const sliceW = nextX - sliceX;
        return `
          <rect
            class="pressure-hover-slice"
            data-quarter-index="${i}"
            x="${sliceX.toFixed(1)}"
            y="0"
            width="${sliceW.toFixed(1)}"
            height="${height}"
            fill="transparent"
            style="cursor: pointer;"
          />
        `;
      })
      .join('');

    const gradId = `pressure_grad_${Math.random().toString(36).substring(2, 7)}`;

    return `
      <svg class="pressure-chart-svg" width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow:visible;">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0b57d0" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#0b57d0" stop-opacity="0.01" />
          </linearGradient>
        </defs>
        ${yGridLines}
        ${xLabels}
        <!-- Subtle Area Fill -->
        <path d="${areaD}" fill="url(#${gradId})" />
        <!-- 2025 Solid Curve -->
        <path d="${currentD}" fill="none" stroke="#0b57d0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Vertical Crosshair Guideline (dynamically moved on hover) -->
        <line id="pressure-crosshair" x1="0" y1="${padTop}" x2="0" y2="${bottomY}" stroke="#93c5fd" stroke-width="1.2" stroke-dasharray="2,2" style="display:none; pointer-events:none;" />
        <!-- Static Dots -->
        ${dotsSvg}
        <!-- Active Highlight Dot -->
        <circle id="pressure-active-dot" cx="0" cy="0" r="5.5" fill="#0b57d0" stroke="#ffffff" stroke-width="2.2" style="display:none; pointer-events:none; filter: drop-shadow(0 2px 5px rgba(11,87,208,0.45));" />
        <!-- Interactive Hover Slices -->
        ${hoverSlicesSvg}
      </svg>
    `;
  }

  private attachHoverListeners(): void {
    const svgEl = this.element.querySelector<SVGSVGElement>('.pressure-chart-svg');
    const crosshair = this.element.querySelector<SVGLineElement>('#pressure-crosshair');
    const activeDot = this.element.querySelector<SVGCircleElement>('#pressure-active-dot');
    const slices = this.element.querySelectorAll<SVGRectElement>('.pressure-hover-slice');
    const wrapper = this.element.querySelector<HTMLElement>('.pressure-chart-wrapper');

    if (!svgEl || !crosshair || !activeDot || !wrapper || !this.tooltipEl) return;

    const width = 280;
    const height = 115;
    const padLeft = 24;
    const padRight = 14;
    const padTop = 14;
    const padBottom = 22;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;
    const minVal = 60.0;
    const maxVal = 76.0;
    const range = maxVal - minVal;

    const getX = (idx: number) => padLeft + (idx / (this.data.length - 1)) * chartW;
    const getY = (val: number) => padTop + chartH - ((Math.max(minVal, Math.min(maxVal, val)) - minVal) / range) * chartH;

    const hideInteraction = () => {
      crosshair.style.display = 'none';
      activeDot.style.display = 'none';
      this.tooltipEl.style.display = 'none';
      // Reset all dots
      this.data.forEach((_, i) => {
        const dot = this.element.querySelector<SVGCircleElement>(`#pressure-dot-${i}`);
        if (dot) dot.setAttribute('r', '3.5');
      });
    };

    // Ensure interaction state starts hidden
    hideInteraction();

    slices.forEach((slice) => {
      slice.addEventListener('mouseenter', () => {
        const idxStr = slice.getAttribute('data-quarter-index');
        if (idxStr === null) return;
        const idx = parseInt(idxStr, 10);
        const item = this.data[idx];
        if (!item) return;

        const cx = getX(idx);
        const cy = getY(item.currentYearM);

        // Update crosshair
        crosshair.setAttribute('x1', cx.toFixed(1));
        crosshair.setAttribute('x2', cx.toFixed(1));
        crosshair.style.display = 'block';

        // Update active dot
        activeDot.setAttribute('cx', cx.toFixed(1));
        activeDot.setAttribute('cy', cy.toFixed(1));
        activeDot.style.display = 'block';

        // Populate tooltip
        this.tooltipEl.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:3px;">
            <strong style="color:#0f172a; font-size:0.74rem;">${item.quarter} 2025</strong>
            <span style="color:#15803d; font-weight:800; font-size:0.62rem; background:#dcfce7; padding:1px 5px; border-radius:3px;">+${item.yoyGrowthPct}% YoY</span>
          </div>
          <div style="font-size:0.7rem; color:#334155; margin-bottom:2px; font-weight:600;">
            <span style="color:#0b57d0; font-weight:800;">${item.currentYearM}M</span> arrivals • <span>RM ${item.receiptsCurrentRmB}B</span>
          </div>
          <div style="font-size:0.62rem; color:#64748b; border-top:1px solid #f1f5f9; padding-top:3px; margin-top:2px;">
            ${item.annotation || 'Official DOSM DTS'}
          </div>
        `;

        // Position tooltip in percentage relative to wrapper
        const xPct = (cx / width) * 100;
        const yPct = (cy / height) * 100;

        this.tooltipEl.style.left = `${xPct.toFixed(1)}%`;
        this.tooltipEl.style.top = `${yPct.toFixed(1)}%`;

        // Shift tooltip left/right based on quadrant position
        if (idx >= 2) {
          this.tooltipEl.style.transform = 'translate(-88%, -115%)';
        } else {
          this.tooltipEl.style.transform = 'translate(-12%, -115%)';
        }

        this.tooltipEl.style.display = 'block';
      });
    });

    wrapper.addEventListener('mouseleave', hideInteraction);
  }
}
