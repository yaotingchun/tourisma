import {
  NATIONAL_ENVIRONMENT_DATA,
  STATE_ENVIRONMENT_LIST,
  getStateEnvironment,
} from '../../data/environmentData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class EnvironmentRingChartCard {
  public readonly element: HTMLElement;
  private currentScope: string = 'all'; // 'all' or stateId
  private ringContainer!: HTMLElement;
  private metricsContainer!: HTMLElement;
  private selectDropdown!: HTMLSelectElement;
  private onSelectScopeCallback?: (scope: string) => void;

  // SVG Element references for smooth transitions (prevents full innerHTML DOM wipes)
  private outsideCircle!: SVGCircleElement;
  private nearCircle!: SVGCircleElement;
  private insideCircle!: SVGCircleElement;
  private totalText!: SVGTextElement;
  private labelText!: SVGTextElement;
  private pctText!: SVGTextElement;
  private simIndicatorCircle!: SVGCircleElement;

  // Numerical counter state for smooth tick-up animation
  private displayedTotal: number = 0;
  private displayedExposedPct: number = 0;

  constructor(onSelectScope?: (scope: string) => void) {
    this.onSelectScopeCallback = onSelectScope;
    this.element = document.createElement('div');
    this.element.className = 'asset-card env-ring-card';

    this.render();
  }

  public setScope(scope: string): void {
    const norm = scope === 'all' ? 'all' : (getStateEnvironment(scope)?.id || 'all');
    if (this.currentScope !== norm) {
      this.currentScope = norm;
      if (this.selectDropdown) {
        this.selectDropdown.value = norm;
      }
      this.updateChart();
    }
  }

  private render(): void {
    this.element.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'asset-card-header env-ring-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'asset-card-title-group';
    titleGroup.innerHTML = `
      <div class="asset-card-badge">
        <span class="asset-badge-dot" style="background-color: #f59e0b;"></span>
        <span>RESERVE PROXIMITY RING</span>
      </div>
      <h3 class="asset-card-title">ENVIRONMENTAL PROXIMITY BREAKDOWN</h3>
      <p class="asset-card-subtitle">Inside vs Near buffer vs Outside safe zone distribution</p>
    `;

    const ringH3 = titleGroup.querySelector('h3')!;
    const ringInfoIcon = createInfoIcon({
      sourceOrg: 'DOE Malaysia, PERHILITAN & DOSM POI Registry',
      datasetName: 'Environmental Proximity Ring Chart',
      referenceYear: '2025',
      measure: 'Donut chart showing the 3-zone breakdown of tourism assets: Inside protected reserves, Near buffer (≤500m), and Outside safe zone.',
      formula: 'Zone % = (Assets in zone / Total state or national assets) × 100',
      limitations: 'Buffer thresholds are fixed planning proxies; regulatory impact assessment zones may differ.',
    });
    ringInfoIcon.style.marginLeft = '6px';
    ringInfoIcon.style.verticalAlign = 'middle';
    ringH3.appendChild(ringInfoIcon);

    // Right-side Controls: State Dropdown
    const controlsWrap = document.createElement('div');
    controlsWrap.className = 'env-ring-controls-group';

    // Dropdown selector
    const selectorWrap = document.createElement('div');
    selectorWrap.className = 'env-scope-select-wrap';

    this.selectDropdown = document.createElement('select');
    this.selectDropdown.className = 'env-scope-select';
    this.selectDropdown.id = 'env-ring-scope-select';

    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = '🇲🇾 All States (National 60,731 Assets)';
    this.selectDropdown.appendChild(allOpt);

    const sortedStates = [...STATE_ENVIRONMENT_LIST].sort((a, b) => b.exposurePct - a.exposurePct);
    sortedStates.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.exposurePct}% exposed)`;
      this.selectDropdown.appendChild(opt);
    });

    this.selectDropdown.value = this.currentScope;
    this.selectDropdown.addEventListener('change', () => {
      this.currentScope = this.selectDropdown.value;
      this.updateChart(true);
      if (this.onSelectScopeCallback) {
        this.onSelectScopeCallback(this.currentScope);
      }
    });

    selectorWrap.appendChild(this.selectDropdown);
    controlsWrap.appendChild(selectorWrap);

    header.appendChild(titleGroup);
    header.appendChild(controlsWrap);

    // Body Container
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'env-ring-body';

    this.ringContainer = document.createElement('div');
    this.ringContainer.className = 'env-ring-canvas-wrap';

    this.metricsContainer = document.createElement('div');
    this.metricsContainer.className = 'env-ring-breakdown-container';

    bodyContainer.appendChild(this.ringContainer);
    bodyContainer.appendChild(this.metricsContainer);

    this.element.appendChild(header);
    this.element.appendChild(bodyContainer);

    // Build the SVG elements once into the DOM so subsequent updates animate smoothly
    this.initSvg();
    this.updateChart(false);
  }

  private initSvg(): void {
    const size = 220;
    const center = size / 2;
    const radius = 78;
    const strokeWidth = 26;
    const circ = 2 * Math.PI * radius;

    this.ringContainer.innerHTML = `
      <div class="env-ring-wrapper-interactive">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="env-ring-svg">
          <!-- Background Guide Track -->
          <circle
            cx="${center}"
            cy="${center}"
            r="${radius}"
            fill="none"
            stroke="#f1f5f9"
            stroke-width="${strokeWidth}"
          />
          <!-- Simulation Radar / Ripple Wave (animates on change) -->
          <circle
            id="env-sim-ripple"
            cx="${center}"
            cy="${center}"
            r="${radius + 15}"
            fill="none"
            stroke="rgba(16, 185, 129, 0.3)"
            stroke-width="2"
            opacity="0"
            style="transition: opacity 0.4s ease, r 0.6s cubic-bezier(0.16, 1, 0.3, 1);"
          />
          <!-- Outside Safe Zone (Emerald) -->
          <circle
            id="env-ring-outside"
            cx="${center}"
            cy="${center}"
            r="${radius}"
            fill="none"
            stroke="#10b981"
            stroke-width="${strokeWidth}"
            stroke-dasharray="0 ${circ}"
            stroke-dashoffset="0"
            stroke-linecap="butt"
            transform="rotate(-90 ${center} ${center})"
            class="env-ring-segment outside"
          />
          <!-- Near Sensitive Buffer (Amber) -->
          <circle
            id="env-ring-near"
            cx="${center}"
            cy="${center}"
            r="${radius}"
            fill="none"
            stroke="#f59e0b"
            stroke-width="${strokeWidth}"
            stroke-dasharray="0 ${circ}"
            stroke-dashoffset="0"
            stroke-linecap="butt"
            transform="rotate(-90 ${center} ${center})"
            class="env-ring-segment near"
          />
          <!-- Inside Protected Reserves (Red) -->
          <circle
            id="env-ring-inside"
            cx="${center}"
            cy="${center}"
            r="${radius}"
            fill="none"
            stroke="#ef4444"
            stroke-width="${strokeWidth}"
            stroke-dasharray="0 ${circ}"
            stroke-dashoffset="0"
            stroke-linecap="butt"
            transform="rotate(-90 ${center} ${center})"
            class="env-ring-segment inside"
          />
          <!-- Center Text Area -->
          <g class="env-ring-center-text">
            <text id="env-ring-total-text" x="${center}" y="${center - 10}" text-anchor="middle" font-size="21" font-weight="900" fill="#0f172a">
              0
            </text>
            <text id="env-ring-label-text" x="${center}" y="${center + 8}" text-anchor="middle" font-size="10" font-weight="600" fill="#64748b">
              National Total
            </text>
            <text id="env-ring-pct-text" x="${center}" y="${center + 24}" text-anchor="middle" font-size="9.5" font-weight="750" fill="#059669">
              0% Exposed
            </text>
          </g>
        </svg>
      </div>
    `;

    this.outsideCircle = this.ringContainer.querySelector('#env-ring-outside') as SVGCircleElement;
    this.nearCircle = this.ringContainer.querySelector('#env-ring-near') as SVGCircleElement;
    this.insideCircle = this.ringContainer.querySelector('#env-ring-inside') as SVGCircleElement;
    this.totalText = this.ringContainer.querySelector('#env-ring-total-text') as SVGTextElement;
    this.labelText = this.ringContainer.querySelector('#env-ring-label-text') as SVGTextElement;
    this.pctText = this.ringContainer.querySelector('#env-ring-pct-text') as SVGTextElement;
    this.simIndicatorCircle = this.ringContainer.querySelector('#env-sim-ripple') as SVGCircleElement;
  }

  private updateChart(animate: boolean = true): void {
    const isNational = this.currentScope === 'all';
    const stateData = isNational ? null : getStateEnvironment(this.currentScope);

    const baseTotal = isNational ? NATIONAL_ENVIRONMENT_DATA.totalAssets : (stateData?.totalAssets || 0);
    let inside = isNational ? NATIONAL_ENVIRONMENT_DATA.inside : (stateData?.inside || 0);
    let near = isNational ? NATIONAL_ENVIRONMENT_DATA.near : (stateData?.near || 0);
    let outside = isNational ? NATIONAL_ENVIRONMENT_DATA.outside : (stateData?.outside || 0);

    const total = baseTotal;
    const insidePct = total > 0 ? (inside / total) * 100 : 0;
    const nearPct = total > 0 ? (near / total) * 100 : 0;
    const outsidePct = total > 0 ? (outside / total) * 100 : 0;
    const exposedPct = insidePct + nearPct;

    const labelName = isNational ? 'National Total' : (stateData?.name || 'Selected State');

    // SVG geometry
    const radius = 78;
    const circ = 2 * Math.PI * radius;

    const insideLen = (insidePct / 100) * circ;
    const nearLen = (nearPct / 100) * circ;
    const outsideLen = (outsidePct / 100) * circ;

    const insideOffset = 0;
    const nearOffset = -insideLen;
    const outsideOffset = -(insideLen + nearLen);

    // Trigger visual pulse effect on state switch
    if (animate && this.simIndicatorCircle) {
      this.simIndicatorCircle.setAttribute('r', `${radius + 8}`);
      this.simIndicatorCircle.style.opacity = '0.6';
      this.simIndicatorCircle.setAttribute('stroke', exposedPct > 15 ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)');
      setTimeout(() => {
        if (this.simIndicatorCircle) {
          this.simIndicatorCircle.setAttribute('r', `${radius + 18}`);
          this.simIndicatorCircle.style.opacity = '0';
        }
      }, 350);
    }

    // Morph the SVG circle arcs smoothly
    if (this.outsideCircle && this.nearCircle && this.insideCircle) {
      this.outsideCircle.setAttribute('stroke-dasharray', `${outsideLen} ${circ - outsideLen}`);
      this.outsideCircle.setAttribute('stroke-dashoffset', `${outsideOffset}`);

      this.nearCircle.setAttribute('stroke-dasharray', `${nearLen} ${circ - nearLen}`);
      this.nearCircle.setAttribute('stroke-dashoffset', `${nearOffset}`);

      this.insideCircle.setAttribute('stroke-dasharray', `${insideLen} ${circ - insideLen}`);
      this.insideCircle.setAttribute('stroke-dashoffset', `${insideOffset}`);
    }

    // Label
    if (this.labelText) {
      this.labelText.textContent = labelName;
    }

    // Counter animations for center total & percentage
    const startTotal = this.displayedTotal;
    const endTotal = total;
    const startPct = this.displayedExposedPct;
    const endPct = exposedPct;

    if (animate) {
      this.animateValue(startTotal, endTotal, 650, (val) => {
        if (this.totalText) {
          this.totalText.textContent = val.toLocaleString();
        }
      });

      this.animatePct(startPct, endPct, 650, (val) => {
        if (this.pctText) {
          this.pctText.textContent = `${val.toFixed(1)}% Exposed`;
          this.pctText.setAttribute('fill', val > 15 ? '#ef4444' : '#059669');
        }
      });
    } else {
      if (this.totalText) this.totalText.textContent = total.toLocaleString();
      if (this.pctText) {
        this.pctText.textContent = `${exposedPct.toFixed(1)}% Exposed`;
        this.pctText.setAttribute('fill', exposedPct > 15 ? '#ef4444' : '#059669');
      }
    }

    this.displayedTotal = endTotal;
    this.displayedExposedPct = endPct;

    // Update Breakdown List
    this.metricsContainer.innerHTML = `
      <div class="env-ring-breakdown-list">
        <!-- Inside Row -->
        <div class="env-breakdown-row inside">
          <div class="env-breakdown-main">
            <span class="env-breakdown-dot inside"></span>
            <div class="env-breakdown-text">
              <span class="env-breakdown-title">Inside Protected Reserves</span>
              <span class="env-breakdown-sub">Direct physical siting inside gazetted parks / reserves</span>
            </div>
          </div>
          <div class="env-breakdown-stat">
            <span class="env-breakdown-val">${inside.toLocaleString()}</span>
            <span class="env-breakdown-badge inside">${insidePct.toFixed(1)}%</span>
          </div>
        </div>

        <!-- Near Row -->
        <div class="env-breakdown-row near">
          <div class="env-breakdown-main">
            <span class="env-breakdown-dot near"></span>
            <div class="env-breakdown-text">
              <span class="env-breakdown-title">Near Sensitive Buffer</span>
              <span class="env-breakdown-sub">Within active ecological buffer zone</span>
            </div>
          </div>
          <div class="env-breakdown-stat">
            <span class="env-breakdown-val">${near.toLocaleString()}</span>
            <span class="env-breakdown-badge near">${nearPct.toFixed(1)}%</span>
          </div>
        </div>

        <!-- Outside Row -->
        <div class="env-breakdown-row outside">
          <div class="env-breakdown-main">
            <span class="env-breakdown-dot outside"></span>
            <div class="env-breakdown-text">
              <span class="env-breakdown-title">Outside Eco-Buffers</span>
              <span class="env-breakdown-sub">Beyond sensitive conservation perimeter</span>
            </div>
          </div>
          <div class="env-breakdown-stat">
            <span class="env-breakdown-val">${outside.toLocaleString()}</span>
            <span class="env-breakdown-badge outside">${outsidePct.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    `;
  }

  private animateValue(
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
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * ease);
      onUpdate(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  private animatePct(
    start: number,
    end: number,
    duration: number,
    onUpdate: (val: number) => void
  ): void {
    if (Math.abs(start - end) < 0.05) {
      onUpdate(end);
      return;
    }
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
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
