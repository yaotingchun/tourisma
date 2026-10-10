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

export class AccessibilityRingChart {
  public readonly element: HTMLElement;
  private selectedStateId: string | null = null;
  private onResetCallback?: () => void;

  constructor(onReset?: () => void) {
    this.onResetCallback = onReset;
    this.element = document.createElement('div');
    this.element.className = 'access-card access-ring-card';
    this.render();
  }

  public setStateScope(stateId: string | null): void {
    if (this.selectedStateId === stateId) return;
    this.selectedStateId = stateId;
    this.render();
  }

  private render(): void {
    this.element.innerHTML = '';

    const stateData: StateAccessibilityItem | null = this.selectedStateId
      ? STATE_ACCESSIBILITY_DATA[this.selectedStateId] || null
      : null;

    // 1. Header
    const header = document.createElement('div');
    header.className = 'access-card-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'access-card-title-group';

    if (stateData) {
      titleGroup.innerHTML = `
        <div class="access-card-badge">
          <span class="access-badge-dot" style="background-color: #2563eb;"></span>
          <span>STATE 4-TIER BREAKDOWN</span>
        </div>
        <h3 class="access-card-title">Accessibility Composition • ${stateData.name}</h3>
        <p class="access-card-subtitle">Proximity breakdown across ${stateData.coreAssets.toLocaleString()} destination assets</p>
      `;
    } else {
      titleGroup.innerHTML = `
        <div class="access-card-badge">
          <span class="access-badge-dot" style="background-color: #7c3aed;"></span>
          <span>OVERALL NATIONAL COMPOSITION</span>
        </div>
        <h3 class="access-card-title">Overall Accessibility Breakdown</h3>
        <p class="access-card-subtitle">National weighted 4-tier distribution across 5,491 tourism assets</p>
      `;
    }

    const ringH3 = titleGroup.querySelector('h3')!;
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
    ringH3.appendChild(ringInfoIcon);

    header.appendChild(titleGroup);

    if (stateData) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'access-reset-btn';
      const resetIcon = createElement(RotateCcw, { width: 12, height: 12, 'stroke-width': 2.2 });
      resetBtn.appendChild(resetIcon);
      const span = document.createElement('span');
      span.textContent = 'National View';
      resetBtn.appendChild(span);
      resetBtn.addEventListener('click', () => {
        if (this.onResetCallback) {
          this.onResetCallback();
        }
      });
      header.appendChild(resetBtn);
    }

    this.element.appendChild(header);

    // 2. Twin Rings Container
    const ringsContainer = document.createElement('div');
    ringsContainer.className = 'access-rings-container';

    // Road Tier Data
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

    // PT Tier Data
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

    const roadRing = this.create4TierRingBlock('Tourism Assets: Road Access', roadDetail);
    const ptRing = this.create4TierRingBlock('Public Transport Access', ptDetail);

    ringsContainer.appendChild(roadRing);
    ringsContainer.appendChild(ptRing);

    this.element.appendChild(ringsContainer);
  }

  private create4TierRingBlock(title: string, detail: TierDetail): HTMLElement {
    const block = document.createElement('div');
    block.className = 'access-ring-item';

    const titleEl = document.createElement('div');
    titleEl.className = 'access-ring-title';
    titleEl.textContent = title;
    block.appendChild(titleEl);

    // Donut SVG
    const svgWrap = document.createElement('div');
    svgWrap.className = 'access-ring-svg-wrap';

    const r = 46;
    const circ = 2 * Math.PI * r; // ~289.026

    // Slices for 4 tiers
    const slices = [
      { id: 'high', pct: detail.highPct, count: detail.highCount, color: '#10b981' },
      { id: 'moderate', pct: detail.moderatePct, count: detail.moderateCount, color: '#eab308' },
      { id: 'low', pct: detail.lowPct, count: detail.lowCount, color: '#f97316' },
      { id: 'remote', pct: detail.remotePct, count: detail.remoteCount, color: '#ef4444' },
    ];

    let cumulativeLen = 0;
    const circlesSvg = slices
      .map((s) => {
        const len = (s.pct / 100) * circ;
        const offset = -cumulativeLen;
        cumulativeLen += len;
        return `
          <circle
            cx="60"
            cy="60"
            r="${r}"
            fill="none"
            stroke="${s.color}"
            stroke-width="14"
            stroke-dasharray="${len} ${circ - len}"
            stroke-dashoffset="${offset}"
            style="transition: stroke-dasharray 0.4s ease, stroke-dashoffset 0.4s ease;"
          />
        `;
      })
      .join('');

    svgWrap.innerHTML = `
      <svg width="130" height="130" viewBox="0 0 120 120" style="transform: rotate(-90deg); transform-origin: 50% 50%;">
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="14" />
        ${circlesSvg}
      </svg>
      <div class="access-ring-center-stat">
        <span class="access-ring-center-val" style="color: #0f172a;">${detail.goodPct.toFixed(1)}%</span>
        <span class="access-ring-center-sub">≤ 1 km</span>
      </div>
    `;
    block.appendChild(svgWrap);

    // 4-Tier Legend
    const legend = document.createElement('div');
    legend.className = 'access-ring-legend';
    legend.innerHTML = ACCESSIBILITY_TIERS.map((tier) => {
      const pct =
        tier.id === 'high'
          ? detail.highPct
          : tier.id === 'moderate'
            ? detail.moderatePct
            : tier.id === 'low'
              ? detail.lowPct
              : detail.remotePct;
      const count =
        tier.id === 'high'
          ? detail.highCount
          : tier.id === 'moderate'
            ? detail.moderateCount
            : tier.id === 'low'
              ? detail.lowCount
              : detail.remoteCount;

      return `
        <div class="access-ring-legend-row" title="${tier.label} (${tier.threshold}): ${tier.description}">
          <div class="access-ring-legend-label">
            <span class="access-legend-indicator" style="background-color: ${tier.color};"></span>
            <span class="access-ring-tier-name">${tier.compactLabel}</span>
          </div>
          <span class="access-ring-legend-val">
            <strong class="access-ring-pct">${pct.toFixed(1)}%</strong>
            <span class="access-ring-count">(${count.toLocaleString()})</span>
          </span>
        </div>
      `;
    }).join('');

    block.appendChild(legend);

    return block;
  }
}
