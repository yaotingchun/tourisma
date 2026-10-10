import {
  CORE_ASSET_MIX,
  SUPPORTING_ASSET_MIX,
  STATE_ASSET_MIX_DATA,
  type AssetRingSlice,
} from '../../data/tourismAssetsData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class AssetMixRingCharts {
  public readonly element: HTMLElement;
  private currentStateId: string | null = null;
  private onResetCallback?: () => void;

  constructor(onReset?: () => void) {
    this.onResetCallback = onReset;
    this.element = document.createElement('div');
    this.element.className = 'asset-card asset-ring-charts-card';
    this.render();
  }

  public setStateScope(stateId: string | null): void {
    if (this.currentStateId === stateId) return;
    this.currentStateId = stateId;
    this.render();
  }

  private render(): void {
    this.element.innerHTML = '';

    const isStateSelected = !!(this.currentStateId && STATE_ASSET_MIX_DATA[this.currentStateId]);
    const stateData = isStateSelected ? STATE_ASSET_MIX_DATA[this.currentStateId!] : null;

    // 1. Card Header
    const header = document.createElement('div');
    header.className = 'asset-card-header';
    header.style.display = 'flex';
    header.style.alignItems = 'flex-start';
    header.style.justifyContent = 'space-between';
    header.style.gap = '12px';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'asset-card-title-group';
    titleGroup.style.flex = '1';
    titleGroup.style.minWidth = '0';

    if (stateData) {
      titleGroup.innerHTML = `
        <div class="asset-card-badge">
          <span class="asset-badge-dot" style="background-color: #2563eb;"></span>
          <span>STATE BREAKDOWN</span>
        </div>
        <h3 class="asset-card-title">Tourism Asset Mix • ${stateData.name}</h3>
        <p class="asset-card-subtitle">Core vs. supporting breakdown (${stateData.totalAssets.toLocaleString()} assets)</p>
      `;
    } else {
      titleGroup.innerHTML = `
        <div class="asset-card-badge">
          <span class="asset-badge-dot" style="background-color: #7c3aed;"></span>
          <span>STRUCTURAL PROPORTIONS</span>
        </div>
        <h3 class="asset-card-title">Tourism Asset Mix</h3>
        <p class="asset-card-subtitle">Core vs. supporting breakdown (60,731 assets)</p>
      `;
    }

    const headerRight = document.createElement('div');
    headerRight.style.display = 'flex';
    headerRight.style.alignItems = 'center';
    headerRight.style.gap = '8px';

    if (isStateSelected) {
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'asset-reset-scope-btn';
      resetBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <span>All Malaysia</span>
      `;
      resetBtn.title = 'Clear state filter and return to nationwide breakdown';
      resetBtn.addEventListener('click', () => {
        this.setStateScope(null);
        if (this.onResetCallback) {
          this.onResetCallback();
        }
      });
      headerRight.appendChild(resetBtn);
    }

    const infoIcon = createInfoIcon({
      sourceOrg: 'MOTAC & OpenStreetMap Spatial Asset Inventory',
      datasetName: 'Tourism Asset Mix & Category Breakdown Matrix',
      referenceYear: '2025 / 2026',
      measure: 'Proportional distribution of Core Destination Attractions vs. Supporting Tourism Infrastructure.',
      formula: 'Category Percentage = (Assets in Category / Total Group Assets) × 100',
      limitations: 'Dynamic breakdown re-calculates when filtering by state or viewing national totals.',
    });
    headerRight.appendChild(infoIcon);

    header.appendChild(titleGroup);
    header.appendChild(headerRight);

    this.element.appendChild(header);

    // 2. Dual Rings Grid
    const dualWrap = document.createElement('div');
    dualWrap.className = 'dual-rings-wrapper';

    // Left Ring: Core Asset Mix
    const coreSlices: AssetRingSlice[] = stateData ? stateData.coreMix : CORE_ASSET_MIX;
    const coreTotal = stateData ? stateData.totalCore : CORE_ASSET_MIX.reduce((acc, s) => acc + s.count, 0);
    const coreSub = stateData
      ? `${stateData.totalCore.toLocaleString()} Destination Sites`
      : '5,491 Destination Sites';

    const coreColumn = this.createRingColumn(
      'Core Attractions',
      coreSub,
      coreSlices,
      coreTotal,
      'Core Sites'
    );

    // Right Ring: Supporting Asset Mix
    const suppSlices: AssetRingSlice[] = stateData ? stateData.supportingMix : SUPPORTING_ASSET_MIX;
    const suppTotal = stateData ? stateData.totalSupporting : SUPPORTING_ASSET_MIX.reduce((acc, s) => acc + s.count, 0);
    const suppSub = stateData
      ? `${stateData.totalSupporting.toLocaleString()} Infrastructure Services`
      : '55,240 Infrastructure Services';

    const suppColumn = this.createRingColumn(
      'Supporting Services',
      suppSub,
      suppSlices,
      suppTotal,
      'Services'
    );

    dualWrap.appendChild(coreColumn);
    dualWrap.appendChild(suppColumn);
    this.element.appendChild(dualWrap);
  }

  private createRingColumn(
    title: string,
    subtitle: string,
    slices: AssetRingSlice[],
    totalCount: number,
    typeLabel: string
  ): HTMLElement {
    const col = document.createElement('div');
    col.className = 'ring-chart-column';

    col.innerHTML = `
      <h4 class="ring-column-header">${title}</h4>
      <span class="ring-column-sub">${subtitle}</span>
    `;

    // SVG Donut container
    const donutContainer = document.createElement('div');
    donutContainer.className = 'donut-svg-container';

    // SVG Sizing: 132x132 with strokeWidth 16 gives radius 58
    const size = 132;
    const strokeWidth = 16;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('class', 'donut-svg');

    // Background track circle
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', String(size / 2));
    bgCircle.setAttribute('cy', String(size / 2));
    bgCircle.setAttribute('r', String(radius));
    bgCircle.setAttribute('fill', 'transparent');
    bgCircle.setAttribute('stroke', '#f1f5f9');
    bgCircle.setAttribute('stroke-width', String(strokeWidth));
    svg.appendChild(bgCircle);

    // Compute cumulative clockwise offsets:
    // In SVG rotated -90deg, stroke-dashoffset = -accumulatedLength draws clockwise from 12 o'clock
    let accumulatedLength = 0;
    const circleElements: { name: string; el: SVGCircleElement }[] = [];

    slices.forEach((slice) => {
      if (slice.count <= 0 || totalCount <= 0) return;

      const strokeLength = (slice.percentage / 100) * circumference;
      const strokeOffset = -accumulatedLength;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(size / 2));
      circle.setAttribute('cy', String(size / 2));
      circle.setAttribute('r', String(radius));
      circle.setAttribute('fill', 'transparent');
      circle.setAttribute('stroke', slice.color);
      circle.setAttribute('stroke-width', String(strokeWidth));
      circle.setAttribute('stroke-dasharray', `${strokeLength.toFixed(2)} ${circumference.toFixed(2)}`);
      circle.setAttribute('stroke-dashoffset', strokeOffset.toFixed(2));
      circle.setAttribute('data-name', slice.name);
      circle.style.transition = 'stroke-width 0.18s ease, filter 0.18s ease';
      circle.style.cursor = 'pointer';

      // Tooltip / title
      const titleTag = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      titleTag.textContent = `${slice.name}: ${slice.count.toLocaleString()} (${slice.percentage.toFixed(1)}%)`;
      circle.appendChild(titleTag);

      // Hover feedback
      circle.addEventListener('mouseenter', () => {
        circle.setAttribute('stroke-width', String(strokeWidth + 4));
        circle.style.filter = 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))';
        const row = col.querySelector<HTMLElement>(`[data-legend-name="${CSS.escape(slice.name)}"]`);
        if (row) row.classList.add('hovered');
      });

      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('stroke-width', String(strokeWidth));
        circle.style.filter = 'none';
        const row = col.querySelector<HTMLElement>(`[data-legend-name="${CSS.escape(slice.name)}"]`);
        if (row) row.classList.remove('hovered');
      });

      svg.appendChild(circle);
      circleElements.push({ name: slice.name, el: circle });
      accumulatedLength += strokeLength;
    });

    // Center Info
    const centerInfo = document.createElement('div');
    centerInfo.className = 'donut-center-info';
    centerInfo.innerHTML = `
      <span class="donut-center-count">${totalCount >= 1000 ? (totalCount / 1000).toFixed(1) + 'k' : totalCount.toLocaleString()}</span>
      <span class="donut-center-label">${typeLabel}</span>
    `;

    donutContainer.appendChild(svg);
    donutContainer.appendChild(centerInfo);
    col.appendChild(donutContainer);

    // Legend List
    const legendList = document.createElement('div');
    legendList.className = 'ring-legend-list';

    slices.forEach((s) => {
      const item = document.createElement('div');
      item.className = 'ring-legend-item';
      item.setAttribute('data-legend-name', s.name);

      item.innerHTML = `
        <div class="ring-legend-label-group">
          <span class="ring-legend-dot" style="background-color: ${s.color};"></span>
          <span class="ring-legend-name" title="${s.name}">${s.name}</span>
        </div>
        <div class="ring-legend-values">
          <span class="ring-legend-pct">${s.percentage.toFixed(1)}%</span>
          <span class="ring-legend-count">(${s.count.toLocaleString()})</span>
        </div>
      `;

      // Legend hover links to donut slice
      const matchingCircle = circleElements.find((c) => c.name === s.name);
      if (matchingCircle) {
        item.addEventListener('mouseenter', () => {
          matchingCircle.el.setAttribute('stroke-width', String(strokeWidth + 4));
          matchingCircle.el.style.filter = 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))';
          item.classList.add('hovered');
        });
        item.addEventListener('mouseleave', () => {
          matchingCircle.el.setAttribute('stroke-width', String(strokeWidth));
          matchingCircle.el.style.filter = 'none';
          item.classList.remove('hovered');
        });
      }

      legendList.appendChild(item);
    });

    col.appendChild(legendList);
    return col;
  }
}
