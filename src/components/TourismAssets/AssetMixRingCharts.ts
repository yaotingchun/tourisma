import {
  CORE_ASSET_MIX,
  SUPPORTING_ASSET_MIX,
  STATE_ASSET_MIX_DATA,
  type AssetRingSlice,
} from '../../data/tourismAssetsData';
import { createInfoIcon } from '../Common/InfoTooltip';

interface RingSliceRefs {
  circle: SVGCircleElement;
  titleTag: SVGTitleElement;
  pctEl: HTMLElement;
  countEl: HTMLElement;
  itemEl: HTMLElement;
}

export class AssetMixRingCharts {
  public readonly element: HTMLElement;
  private currentStateId: string | null = null;
  private onResetCallback?: () => void;

  // Header element references
  private badgeDotEl!: HTMLElement;
  private badgeTextEl!: HTMLElement;
  private titleEl!: HTMLElement;
  private subtitleEl!: HTMLElement;
  private headerRightEl!: HTMLElement;
  private resetBtnEl: HTMLButtonElement | null = null;

  // Ring dimension constants
  private readonly size = 132;
  private readonly strokeWidth = 16;
  private readonly radius = (132 - 16) / 2; // 58
  private readonly circumference = 2 * Math.PI * 58; // ~364.42

  // Core Ring references
  private coreSubEl!: HTMLElement;
  private coreCenterCountEl!: HTMLElement;
  private coreSlicesMap: Map<string, RingSliceRefs> = new Map();
  private displayedCoreCount: number = 0;

  // Supporting Ring references
  private suppSubEl!: HTMLElement;
  private suppCenterCountEl!: HTMLElement;
  private suppSlicesMap: Map<string, RingSliceRefs> = new Map();
  private displayedSuppCount: number = 0;

  constructor(onReset?: () => void) {
    this.onResetCallback = onReset;
    this.element = document.createElement('div');
    this.element.className = 'asset-card asset-ring-charts-card';

    this.buildDom();

    // Smooth opening entrance transition
    setTimeout(() => {
      this.updateCharts(true);
    }, 40);
  }

  public setStateScope(stateId: string | null): void {
    if (this.currentStateId === stateId) return;
    this.currentStateId = stateId;
    this.updateCharts(true);
  }

  private buildDom(): void {
    this.element.innerHTML = '';

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

    titleGroup.innerHTML = `
      <div class="asset-card-badge">
        <span class="asset-badge-dot" style="background-color: #7c3aed; transition: background-color 0.3s ease;"></span>
        <span class="asset-badge-text">STRUCTURAL PROPORTIONS</span>
      </div>
      <h3 class="asset-card-title" style="transition: color 0.25s ease;">Tourism Asset Mix</h3>
      <p class="asset-card-subtitle" style="transition: opacity 0.25s ease;">Core vs. supporting breakdown (60,731 assets)</p>
    `;

    this.badgeDotEl = titleGroup.querySelector('.asset-badge-dot')!;
    this.badgeTextEl = titleGroup.querySelector('.asset-badge-text')!;
    this.titleEl = titleGroup.querySelector('.asset-card-title')!;
    this.subtitleEl = titleGroup.querySelector('.asset-card-subtitle')!;

    this.headerRightEl = document.createElement('div');
    this.headerRightEl.style.display = 'flex';
    this.headerRightEl.style.alignItems = 'center';
    this.headerRightEl.style.gap = '8px';

    const infoIcon = createInfoIcon({
      sourceOrg: 'MOTAC & OpenStreetMap Spatial Asset Inventory',
      datasetName: 'Tourism Asset Mix & Category Breakdown Matrix',
      referenceYear: '2025 / 2026',
      measure: 'Proportional distribution of Core Destination Attractions vs. Supporting Tourism Infrastructure.',
      formula: 'Category Percentage = (Assets in Category / Total Group Assets) × 100',
      limitations: 'Dynamic breakdown re-calculates smoothly when filtering by state or viewing national totals.',
    });
    this.headerRightEl.appendChild(infoIcon);

    header.appendChild(titleGroup);
    header.appendChild(this.headerRightEl);
    this.element.appendChild(header);

    // 2. Dual Rings Grid
    const dualWrap = document.createElement('div');
    dualWrap.className = 'dual-rings-wrapper';

    // Left Column: Core Attractions
    const coreCol = this.buildRingColumn(
      'Core Attractions',
      '5,491 Destination Sites',
      CORE_ASSET_MIX,
      'Core Sites',
      this.coreSlicesMap,
      (subEl, countEl) => {
        this.coreSubEl = subEl;
        this.coreCenterCountEl = countEl;
      }
    );

    // Right Column: Supporting Services
    const suppCol = this.buildRingColumn(
      'Supporting Services',
      '55,240 Infrastructure Services',
      SUPPORTING_ASSET_MIX,
      'Services',
      this.suppSlicesMap,
      (subEl, countEl) => {
        this.suppSubEl = subEl;
        this.suppCenterCountEl = countEl;
      }
    );

    dualWrap.appendChild(coreCol);
    dualWrap.appendChild(suppCol);
    this.element.appendChild(dualWrap);
  }

  private buildRingColumn(
    title: string,
    initialSub: string,
    baseSlices: AssetRingSlice[],
    typeLabel: string,
    slicesMap: Map<string, RingSliceRefs>,
    assignRefs: (subEl: HTMLElement, countEl: HTMLElement) => void
  ): HTMLElement {
    const col = document.createElement('div');
    col.className = 'ring-chart-column';

    col.innerHTML = `
      <h4 class="ring-column-header">${title}</h4>
      <span class="ring-column-sub">${initialSub}</span>
    `;

    const subEl = col.querySelector<HTMLElement>('.ring-column-sub')!;

    // SVG Donut container
    const donutContainer = document.createElement('div');
    donutContainer.className = 'donut-svg-container';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${this.size} ${this.size}`);
    svg.setAttribute('class', 'donut-svg');

    // Background track circle
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', String(this.size / 2));
    bgCircle.setAttribute('cy', String(this.size / 2));
    bgCircle.setAttribute('r', String(this.radius));
    bgCircle.setAttribute('fill', 'transparent');
    bgCircle.setAttribute('stroke', '#f1f5f9');
    bgCircle.setAttribute('stroke-width', String(this.strokeWidth));
    svg.appendChild(bgCircle);

    // Center Info
    const centerInfo = document.createElement('div');
    centerInfo.className = 'donut-center-info';
    centerInfo.innerHTML = `
      <span class="donut-center-count">0</span>
      <span class="donut-center-label">${typeLabel}</span>
    `;
    const countEl = centerInfo.querySelector<HTMLElement>('.donut-center-count')!;
    assignRefs(subEl, countEl);

    // Legend List
    const legendList = document.createElement('div');
    legendList.className = 'ring-legend-list';

    // Create persistent slices and legend rows
    baseSlices.forEach((slice) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'asset-ring-segment');
      circle.setAttribute('cx', String(this.size / 2));
      circle.setAttribute('cy', String(this.size / 2));
      circle.setAttribute('r', String(this.radius));
      circle.setAttribute('fill', 'transparent');
      circle.setAttribute('stroke', slice.color);
      circle.setAttribute('stroke-width', String(this.strokeWidth));
      // Start at 0 length for clean entrance transition
      circle.setAttribute('stroke-dasharray', `0 ${this.circumference.toFixed(2)}`);
      circle.setAttribute('stroke-dashoffset', '0');
      circle.setAttribute('data-name', slice.name);
      circle.style.cursor = 'pointer';

      const titleTag = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      titleTag.textContent = `${slice.name}: ${slice.count.toLocaleString()} (${slice.percentage.toFixed(1)}%)`;
      circle.appendChild(titleTag);
      svg.appendChild(circle);

      // Legend Item
      const item = document.createElement('div');
      item.className = 'ring-legend-item';
      item.setAttribute('data-legend-name', slice.name);
      item.innerHTML = `
        <div class="ring-legend-label-group">
          <span class="ring-legend-dot" style="background-color: ${slice.color};"></span>
          <span class="ring-legend-name" title="${slice.name}">${slice.name}</span>
        </div>
        <div class="ring-legend-values">
          <span class="ring-legend-pct">${slice.percentage.toFixed(1)}%</span>
          <span class="ring-legend-count">(${slice.count.toLocaleString()})</span>
        </div>
      `;

      const pctEl = item.querySelector<HTMLElement>('.ring-legend-pct')!;
      const countItemEl = item.querySelector<HTMLElement>('.ring-legend-count')!;

      // Hover link between circle and legend item
      circle.addEventListener('mouseenter', () => {
        circle.setAttribute('stroke-width', String(this.strokeWidth + 4));
        circle.style.filter = 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))';
        item.classList.add('hovered');
      });
      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('stroke-width', String(this.strokeWidth));
        circle.style.filter = 'none';
        item.classList.remove('hovered');
      });

      item.addEventListener('mouseenter', () => {
        circle.setAttribute('stroke-width', String(this.strokeWidth + 4));
        circle.style.filter = 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))';
        item.classList.add('hovered');
      });
      item.addEventListener('mouseleave', () => {
        circle.setAttribute('stroke-width', String(this.strokeWidth));
        circle.style.filter = 'none';
        item.classList.remove('hovered');
      });

      legendList.appendChild(item);

      slicesMap.set(slice.name, {
        circle,
        titleTag,
        pctEl,
        countEl: countItemEl,
        itemEl: item,
      });
    });

    donutContainer.appendChild(svg);
    donutContainer.appendChild(centerInfo);
    col.appendChild(donutContainer);
    col.appendChild(legendList);

    return col;
  }

  private updateCharts(animate: boolean = true): void {
    const isStateSelected = !!(this.currentStateId && STATE_ASSET_MIX_DATA[this.currentStateId]);
    const stateData = isStateSelected ? STATE_ASSET_MIX_DATA[this.currentStateId!] : null;

    // 1. Update Header Info
    if (stateData) {
      this.badgeDotEl.style.backgroundColor = '#2563eb';
      this.badgeTextEl.textContent = 'STATE BREAKDOWN';
      this.titleEl.textContent = `Tourism Asset Mix • ${stateData.name}`;
      this.subtitleEl.textContent = `Core vs. supporting breakdown (${stateData.totalAssets.toLocaleString()} assets)`;

      if (!this.resetBtnEl) {
        this.resetBtnEl = document.createElement('button');
        this.resetBtnEl.type = 'button';
        this.resetBtnEl.className = 'asset-reset-scope-btn';
        this.resetBtnEl.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>All Malaysia</span>
        `;
        this.resetBtnEl.title = 'Clear state filter and return to nationwide breakdown';
        this.resetBtnEl.addEventListener('click', () => {
          this.setStateScope(null);
          if (this.onResetCallback) {
            this.onResetCallback();
          }
        });
        this.headerRightEl.prepend(this.resetBtnEl);
      }
    } else {
      this.badgeDotEl.style.backgroundColor = '#7c3aed';
      this.badgeTextEl.textContent = 'STRUCTURAL PROPORTIONS';
      this.titleEl.textContent = 'Tourism Asset Mix';
      this.subtitleEl.textContent = 'Core vs. supporting breakdown (60,731 assets)';

      if (this.resetBtnEl) {
        this.resetBtnEl.remove();
        this.resetBtnEl = null;
      }
    }

    // 2. Animate Core Attractions Ring
    const coreSlices: AssetRingSlice[] = stateData ? stateData.coreMix : CORE_ASSET_MIX;
    const coreTotal = stateData
      ? stateData.totalCore
      : CORE_ASSET_MIX.reduce((acc, s) => acc + s.count, 0);

    this.coreSubEl.textContent = stateData
      ? `${stateData.totalCore.toLocaleString()} Destination Sites`
      : '5,491 Destination Sites';

    let coreAccum = 0;
    coreSlices.forEach((slice) => {
      const refs = this.coreSlicesMap.get(slice.name);
      if (!refs) return;

      const strokeLength = coreTotal > 0 ? (slice.percentage / 100) * this.circumference : 0;
      const strokeOffset = -coreAccum;

      refs.circle.setAttribute(
        'stroke-dasharray',
        `${strokeLength.toFixed(2)} ${(this.circumference - strokeLength).toFixed(2)}`
      );
      refs.circle.setAttribute('stroke-dashoffset', strokeOffset.toFixed(2));
      refs.titleTag.textContent = `${slice.name}: ${slice.count.toLocaleString()} (${slice.percentage.toFixed(1)}%)`;
      refs.pctEl.textContent = `${slice.percentage.toFixed(1)}%`;
      refs.countEl.textContent = `(${slice.count.toLocaleString()})`;

      coreAccum += strokeLength;
    });

    // 3. Animate Supporting Services Ring
    const suppSlices: AssetRingSlice[] = stateData ? stateData.supportingMix : SUPPORTING_ASSET_MIX;
    const suppTotal = stateData
      ? stateData.totalSupporting
      : SUPPORTING_ASSET_MIX.reduce((acc, s) => acc + s.count, 0);

    this.suppSubEl.textContent = stateData
      ? `${stateData.totalSupporting.toLocaleString()} Infrastructure Services`
      : '55,240 Infrastructure Services';

    let suppAccum = 0;
    suppSlices.forEach((slice) => {
      const refs = this.suppSlicesMap.get(slice.name);
      if (!refs) return;

      const strokeLength = suppTotal > 0 ? (slice.percentage / 100) * this.circumference : 0;
      const strokeOffset = -suppAccum;

      refs.circle.setAttribute(
        'stroke-dasharray',
        `${strokeLength.toFixed(2)} ${(this.circumference - strokeLength).toFixed(2)}`
      );
      refs.circle.setAttribute('stroke-dashoffset', strokeOffset.toFixed(2));
      refs.titleTag.textContent = `${slice.name}: ${slice.count.toLocaleString()} (${slice.percentage.toFixed(1)}%)`;
      refs.pctEl.textContent = `${slice.percentage.toFixed(1)}%`;
      refs.countEl.textContent = `(${slice.count.toLocaleString()})`;

      suppAccum += strokeLength;
    });

    // 4. Smooth Counter Tick Animation
    const startCore = this.displayedCoreCount;
    const endCore = coreTotal;
    const startSupp = this.displayedSuppCount;
    const endSupp = suppTotal;

    if (animate) {
      this.animateCount(startCore, endCore, 650, (val) => {
        this.coreCenterCountEl.textContent =
          val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toLocaleString();
      });

      this.animateCount(startSupp, endSupp, 650, (val) => {
        this.suppCenterCountEl.textContent =
          val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toLocaleString();
      });
    } else {
      this.coreCenterCountEl.textContent =
        coreTotal >= 1000 ? (coreTotal / 1000).toFixed(1) + 'k' : coreTotal.toLocaleString();
      this.suppCenterCountEl.textContent =
        suppTotal >= 1000 ? (suppTotal / 1000).toFixed(1) + 'k' : suppTotal.toLocaleString();
    }

    this.displayedCoreCount = endCore;
    this.displayedSuppCount = endSupp;
  }

  private animateCount(
    start: number,
    end: number,
    duration: number,
    onUpdate: (val: number) => void
  ): void {
    if (start === end) {
      onUpdate(end);
      return;
    }
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * ease);
      onUpdate(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }
}
