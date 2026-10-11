import {
  NATIONAL_TIER_DATA,
  STATE_ACCESSIBILITY_DATA,
  ACCESSIBILITY_TIERS,
  type StateAccessibilityItem,
  type TierDetail,
} from '../../data/accessibilityData';
import { RotateCcw } from 'lucide';
import { createElement } from 'lucide';
import { createInfoIcon } from '../Common/InfoTooltip';

interface TierCircleRefs {
  circle: SVGCircleElement;
  pctEl: HTMLElement;
  countEl: HTMLElement;
}

interface RingBlockRefs {
  centerValEl: HTMLElement;
  tiersMap: Map<string, TierCircleRefs>;
  displayedPct: number;
}

export class AccessibilityRingChart {
  public readonly element: HTMLElement;
  private selectedStateId: string | null = null;
  private onResetCallback?: () => void;

  // Header element references
  private badgeDotEl!: HTMLElement;
  private badgeTextEl!: HTMLElement;
  private titleEl!: HTMLElement;
  private titleTextEl!: HTMLElement;
  private subtitleEl!: HTMLElement;
  private headerEl!: HTMLElement;
  private resetBtnEl: HTMLButtonElement | null = null;

  // SVG Geometry constants
  private readonly r = 46;
  private readonly circ = 2 * Math.PI * 46; // ~289.0265

  // Ring references
  private roadRingRefs!: RingBlockRefs;
  private ptRingRefs!: RingBlockRefs;

  constructor(onReset?: () => void) {
    this.onResetCallback = onReset;
    this.element = document.createElement('div');
    this.element.className = 'access-card access-ring-card';

    this.buildDom();

    // Smooth opening entrance transition
    setTimeout(() => {
      this.updateChart(true);
    }, 40);
  }

  public setStateScope(stateId: string | null): void {
    if (this.selectedStateId === stateId) return;
    this.selectedStateId = stateId;
    this.updateChart(true);
  }

  private buildDom(): void {
    this.element.innerHTML = '';

    // 1. Header
    this.headerEl = document.createElement('div');
    this.headerEl.className = 'access-card-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'access-card-title-group';

    titleGroup.innerHTML = `
      <div class="access-card-badge">
        <span class="access-badge-dot" style="background-color: #7c3aed; transition: background-color 0.3s ease;"></span>
        <span class="access-badge-text">OVERALL NATIONAL COMPOSITION</span>
      </div>
      <h3 class="access-card-title" style="transition: color 0.25s ease;"><span class="access-title-text">Overall Accessibility Breakdown</span></h3>
      <p class="access-card-subtitle" style="transition: opacity 0.25s ease;">National weighted 4-tier distribution across 5,491 tourism assets</p>
    `;

    this.badgeDotEl = titleGroup.querySelector('.access-badge-dot')!;
    this.badgeTextEl = titleGroup.querySelector('.access-badge-text')!;
    this.titleEl = titleGroup.querySelector('.access-card-title')!;
    this.titleTextEl = titleGroup.querySelector('.access-title-text')!;
    this.subtitleEl = titleGroup.querySelector('.access-card-subtitle')!;

    const ringInfoIcon = createInfoIcon({
      sourceOrg: 'DOSM GeoPadang & Tourism Malaysia POI Registry',
      datasetName: 'Tourism Asset Accessibility Tier Ring Chart',
      referenceYear: '2025',
      measure: 'Donut ring chart showing the 4-tier proximity distribution of tourism assets to road or transit networks, at state or national level.',
      formula: 'Tier % = (Assets in tier / Total assets in scope) × 100; tiers: ≤500m, 500m-1km, 1-3km, >3km',
      limitations: 'Straight-line buffer thresholds; actual walkability and road quality not factored in.',
    });
    ringInfoIcon.style.marginLeft = '6px';
    ringInfoIcon.style.verticalAlign = 'middle';
    this.titleEl.appendChild(ringInfoIcon);

    this.headerEl.appendChild(titleGroup);
    this.element.appendChild(this.headerEl);

    // 2. Twin Rings Container
    const ringsContainer = document.createElement('div');
    ringsContainer.className = 'access-rings-container';

    // Build Road & PT Rings
    const roadBlock = this.buildRingBlock('Tourism Assets: Road Access');
    this.roadRingRefs = roadBlock.refs;

    const ptBlock = this.buildRingBlock('Public Transport Access');
    this.ptRingRefs = ptBlock.refs;

    ringsContainer.appendChild(roadBlock.element);
    ringsContainer.appendChild(ptBlock.element);

    this.element.appendChild(ringsContainer);
  }

  private buildRingBlock(title: string): { element: HTMLElement; refs: RingBlockRefs } {
    const block = document.createElement('div');
    block.className = 'access-ring-item';

    const titleEl = document.createElement('div');
    titleEl.className = 'access-ring-title';
    titleEl.textContent = title;
    block.appendChild(titleEl);

    // Donut SVG Wrapper
    const svgWrap = document.createElement('div');
    svgWrap.className = 'access-ring-svg-wrap';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '130');
    svg.setAttribute('height', '130');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.style.transform = 'rotate(-90deg)';
    svg.style.transformOrigin = '50% 50%';

    // Guide Track circle
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', '60');
    bgCircle.setAttribute('cy', '60');
    bgCircle.setAttribute('r', String(this.r));
    bgCircle.setAttribute('fill', 'none');
    bgCircle.setAttribute('stroke', '#f1f5f9');
    bgCircle.setAttribute('stroke-width', '14');
    svg.appendChild(bgCircle);

    const tiersMap = new Map<string, TierCircleRefs>();

    // 4 Slices (high, moderate, low, remote)
    const tierSlices = [
      { id: 'high', color: '#10b981' },
      { id: 'moderate', color: '#eab308' },
      { id: 'low', color: '#f97316' },
      { id: 'remote', color: '#ef4444' },
    ];

    tierSlices.forEach((t) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'access-ring-segment');
      circle.setAttribute('cx', '60');
      circle.setAttribute('cy', '60');
      circle.setAttribute('r', String(this.r));
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', t.color);
      circle.setAttribute('stroke-width', '14');
      // Start at 0 for entrance animation
      circle.setAttribute('stroke-dasharray', `0 ${this.circ.toFixed(2)}`);
      circle.setAttribute('stroke-dashoffset', '0');
      svg.appendChild(circle);

      tiersMap.set(t.id, { circle, pctEl: null!, countEl: null! });
    });

    const centerStat = document.createElement('div');
    centerStat.className = 'access-ring-center-stat';
    centerStat.innerHTML = `
      <span class="access-ring-center-val" style="color: #0f172a;">0%</span>
      <span class="access-ring-center-sub">≤ 1 km</span>
    `;
    const centerValEl = centerStat.querySelector<HTMLElement>('.access-ring-center-val')!;

    svgWrap.appendChild(svg);
    svgWrap.appendChild(centerStat);
    block.appendChild(svgWrap);

    // 4-Tier Legend
    const legend = document.createElement('div');
    legend.className = 'access-ring-legend';

    ACCESSIBILITY_TIERS.forEach((tier) => {
      const row = document.createElement('div');
      row.className = 'access-ring-legend-row';
      row.title = `${tier.label} (${tier.threshold}): ${tier.description}`;
      row.innerHTML = `
        <div class="access-ring-legend-label">
          <span class="access-legend-indicator" style="background-color: ${tier.color};"></span>
          <span class="access-ring-tier-name">${tier.compactLabel}</span>
        </div>
        <span class="access-ring-legend-val">
          <strong class="access-ring-pct">0%</strong>
          <span class="access-ring-count">(0)</span>
        </span>
      `;

      const pctEl = row.querySelector<HTMLElement>('.access-ring-pct')!;
      const countEl = row.querySelector<HTMLElement>('.access-ring-count')!;

      const ref = tiersMap.get(tier.id);
      if (ref) {
        ref.pctEl = pctEl;
        ref.countEl = countEl;
      }

      legend.appendChild(row);
    });

    block.appendChild(legend);

    return {
      element: block,
      refs: {
        centerValEl,
        tiersMap,
        displayedPct: 0,
      },
    };
  }

  private updateChart(animate: boolean = true): void {
    const stateData: StateAccessibilityItem | null = this.selectedStateId
      ? STATE_ACCESSIBILITY_DATA[this.selectedStateId] || null
      : null;

    // 1. Header Updates
    if (stateData) {
      this.badgeDotEl.style.backgroundColor = '#2563eb';
      this.badgeTextEl.textContent = 'STATE 4-TIER BREAKDOWN';
      this.titleTextEl.textContent = `Accessibility Composition • ${stateData.name} `;
      this.subtitleEl.textContent = `Proximity breakdown across ${stateData.coreAssets.toLocaleString()} destination assets`;

      if (!this.resetBtnEl) {
        this.resetBtnEl = document.createElement('button');
        this.resetBtnEl.className = 'access-reset-btn';
        const resetIcon = createElement(RotateCcw, { width: 12, height: 12, 'stroke-width': 2.2 });
        this.resetBtnEl.appendChild(resetIcon);
        const span = document.createElement('span');
        span.textContent = 'National View';
        this.resetBtnEl.appendChild(span);
        this.resetBtnEl.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation();
          if (this.onResetCallback) {
            this.onResetCallback();
          } else {
            this.setStateScope(null);
          }
        });
        this.headerEl.appendChild(this.resetBtnEl);
      }
    } else {
      this.badgeDotEl.style.backgroundColor = '#7c3aed';
      this.badgeTextEl.textContent = 'OVERALL NATIONAL COMPOSITION';
      this.titleTextEl.textContent = 'Overall Accessibility Breakdown ';
      this.subtitleEl.textContent = 'National weighted 4-tier distribution across 5,491 tourism assets';

      if (this.resetBtnEl) {
        this.resetBtnEl.remove();
        this.resetBtnEl = null;
      }
    }

    // 2. Road Tier Data & PT Tier Data
    const roadDetail: TierDetail = stateData
      ? stateData.road
      : {
          highCount: NATIONAL_TIER_DATA.road.highCount,
          moderateCount: NATIONAL_TIER_DATA.road.moderateCount,
          lowCount: NATIONAL_TIER_DATA.road.lowCount,
          remoteCount: NATIONAL_TIER_DATA.road.remoteCount,
          highPct: NATIONAL_TIER_DATA.road.highPct,
          moderatePct: NATIONAL_TIER_DATA.road.moderatePct,
          lowPct: NATIONAL_TIER_DATA.road.lowPct,
          remotePct: NATIONAL_TIER_DATA.road.remotePct,
          goodPct: NATIONAL_TIER_DATA.road.goodPct,
          limitedPct: 100 - NATIONAL_TIER_DATA.road.goodPct,
        };

    const ptDetail: TierDetail = stateData
      ? stateData.pt
      : {
          highCount: NATIONAL_TIER_DATA.pt.highCount,
          moderateCount: NATIONAL_TIER_DATA.pt.moderateCount,
          lowCount: NATIONAL_TIER_DATA.pt.lowCount,
          remoteCount: NATIONAL_TIER_DATA.pt.remoteCount,
          highPct: NATIONAL_TIER_DATA.pt.highPct,
          moderatePct: NATIONAL_TIER_DATA.pt.moderatePct,
          lowPct: NATIONAL_TIER_DATA.pt.lowPct,
          remotePct: NATIONAL_TIER_DATA.pt.remotePct,
          goodPct: NATIONAL_TIER_DATA.pt.goodPct,
          limitedPct: 100 - NATIONAL_TIER_DATA.pt.goodPct,
        };

    // 3. Morph Road Ring Arcs & Animate Numbers
    this.updateRingBlock(this.roadRingRefs, roadDetail, animate);

    // 4. Morph PT Ring Arcs & Animate Numbers
    this.updateRingBlock(this.ptRingRefs, ptDetail, animate);
  }

  private updateRingBlock(refs: RingBlockRefs, detail: TierDetail, animate: boolean): void {
    const slices = [
      { id: 'high', pct: detail.highPct, count: detail.highCount },
      { id: 'moderate', pct: detail.moderatePct, count: detail.moderateCount },
      { id: 'low', pct: detail.lowPct, count: detail.lowCount },
      { id: 'remote', pct: detail.remotePct, count: detail.remoteCount },
    ];

    let accum = 0;
    slices.forEach((s) => {
      const tierRef = refs.tiersMap.get(s.id);
      if (!tierRef) return;

      const len = (s.pct / 100) * this.circ;
      const offset = -accum;

      tierRef.circle.setAttribute('stroke-dasharray', `${len.toFixed(2)} ${(this.circ - len).toFixed(2)}`);
      tierRef.circle.setAttribute('stroke-dashoffset', offset.toFixed(2));

      if (tierRef.pctEl) tierRef.pctEl.textContent = `${s.pct.toFixed(1)}%`;
      if (tierRef.countEl) tierRef.countEl.textContent = `(${s.count.toLocaleString()})`;

      accum += len;
    });

    const startPct = refs.displayedPct;
    const endPct = detail.goodPct;

    if (animate) {
      this.animatePct(startPct, endPct, 650, (val) => {
        refs.centerValEl.textContent = `${val.toFixed(1)}%`;
      });
    } else {
      refs.centerValEl.textContent = `${endPct.toFixed(1)}%`;
    }

    refs.displayedPct = endPct;
  }

  private animatePct(
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
      const current = start + (end - start) * ease;
      onUpdate(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }
}
