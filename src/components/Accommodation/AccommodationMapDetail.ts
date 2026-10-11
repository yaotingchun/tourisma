import { ACCOMMODATION_DATA } from '../../data/accommodationData';

export class AccommodationMapDetail {
  public readonly element: HTMLElement;
  private selectedStateId: string | null = null;
  private onResetCallback?: () => void;

  // Header element references
  private titleEl!: HTMLElement;
  private subtitleEl!: HTMLElement;
  private headerActionSlot!: HTMLElement;
  private resetBtn: HTMLButtonElement | null = null;

  // KPI reference
  private kpiValEl!: HTMLElement;

  // SVG Element references
  private visitorBarEl!: SVGRectElement;
  private roomBarEl!: SVGRectElement;
  private visitorValTextEl!: SVGTextElement;
  private roomValTextEl!: SVGTextElement;

  // Current animated values
  private currentVisitors: number = 0;
  private currentRooms: number = 0;
  private currentRatio: number = 0;
  private currentHeightVisitors: number = 8;
  private currentHeightRooms: number = 8;

  private currentAnimFrame: number | null = null;

  constructor(onReset?: () => void) {
    this.onResetCallback = onReset;
    this.element = document.createElement('div');
    this.element.className = 'asset-card acc-map-detail-panel';

    this.buildDom();

    // Smooth opening entrance transition
    setTimeout(() => {
      this.update(true);
    }, 40);
  }

  public setSelectedState(stateId: string | null): void {
    if (this.selectedStateId !== stateId) {
      this.selectedStateId = stateId;
      this.update(true);
    }
  }

  // Backward compatibility alias
  public setHoveredState(stateId: string | null): void {
    this.setSelectedState(stateId);
  }

  private buildDom(): void {
    this.element.innerHTML = '';

    // 1. Header
    const header = document.createElement('div');
    header.className = 'asset-card-header';
    header.style.marginBottom = '10px';
    header.style.display = 'flex';
    header.style.alignItems = 'flex-start';
    header.style.justifyContent = 'space-between';
    header.style.gap = '10px';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'asset-card-title-group';
    titleGroup.style.flex = '1';
    titleGroup.style.minWidth = '0';

    titleGroup.innerHTML = `
      <div class="asset-card-badge">
        <span class="asset-badge-dot" style="background-color: #059669;"></span>
        <span>CAPACITY PRESSURE</span>
      </div>
      <h3 class="asset-card-title acc-detail-title" style="transition: color 0.25s ease;">National Totals</h3>
      <p class="asset-card-subtitle acc-detail-subtitle" style="transition: opacity 0.25s ease;">Click a state on the map to inspect details</p>
    `;

    this.titleEl = titleGroup.querySelector('.acc-detail-title')!;
    this.subtitleEl = titleGroup.querySelector('.acc-detail-subtitle')!;

    this.headerActionSlot = document.createElement('div');
    this.headerActionSlot.style.display = 'flex';
    this.headerActionSlot.style.alignItems = 'center';

    header.appendChild(titleGroup);
    header.appendChild(this.headerActionSlot);
    this.element.appendChild(header);

    // 2. Hero KPI Box
    const kpiBox = document.createElement('div');
    kpiBox.className = 'acc-detail-kpi';
    kpiBox.innerHTML = `
      <span class="acc-kpi-val">0</span>
      <span class="acc-kpi-lbl">VISITORS PER ROOM</span>
    `;
    this.kpiValEl = kpiBox.querySelector('.acc-kpi-val')!;
    this.element.appendChild(kpiBox);

    // 3. Dual Bar Chart
    const chartContainer = document.createElement('div');
    chartContainer.className = 'acc-detail-chart';

    chartContainer.innerHTML = `
      <div class="acc-chart-title">Demand vs Capacity Volume</div>
      <div class="acc-chart-svg-wrap">
        <svg width="100%" height="220" viewBox="0 0 200 220">
          <defs>
            <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3b82f6" />
              <stop offset="100%" stop-color="#2563eb" />
            </linearGradient>
            <linearGradient id="roomGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#10b981" />
              <stop offset="100%" stop-color="#059669" />
            </linearGradient>
          </defs>

          <!-- Visitors Bar (Left) -->
          <rect id="acc-bar-visitors" class="acc-bar-rect" x="45" y="172" width="46" height="8" fill="url(#visitorGrad)" rx="6" ry="6" />
          
          <!-- Rooms Bar (Right) -->
          <rect id="acc-bar-rooms" class="acc-bar-rect" x="109" y="172" width="46" height="8" fill="url(#roomGrad)" rx="6" ry="6" />

          <!-- Labels Bottom -->
          <text x="68" y="200" text-anchor="middle" font-size="10" font-weight="700" fill="#64748b">Visitors</text>
          <text x="132" y="200" text-anchor="middle" font-size="10" font-weight="700" fill="#64748b">Rooms</text>

          <!-- Value Labels on top of bars -->
          <text id="acc-val-visitors" class="acc-bar-val-text" x="68" y="164" text-anchor="middle" font-size="11" font-weight="800" fill="#0f172a">0M</text>
          <text id="acc-val-rooms" class="acc-bar-val-text" x="132" y="164" text-anchor="middle" font-size="11" font-weight="800" fill="#0f172a">0k</text>
        </svg>
      </div>
      <div class="acc-chart-legend">
        <div class="acc-chart-legend-item">
          <span style="background:#3b82f6; width:8px; height:8px; border-radius:50%; display:inline-block;"></span>
          Left Axis: Quantity (M)
        </div>
        <div class="acc-chart-legend-item">
          <span style="background:#10b981; width:8px; height:8px; border-radius:50%; display:inline-block;"></span>
          Right Axis: Quantity (000s)
        </div>
      </div>
    `;

    this.visitorBarEl = chartContainer.querySelector<SVGRectElement>('#acc-bar-visitors')!;
    this.roomBarEl = chartContainer.querySelector<SVGRectElement>('#acc-bar-rooms')!;
    this.visitorValTextEl = chartContainer.querySelector<SVGTextElement>('#acc-val-visitors')!;
    this.roomValTextEl = chartContainer.querySelector<SVGTextElement>('#acc-val-rooms')!;

    this.element.appendChild(chartContainer);
  }

  private update(animate: boolean = true): void {
    let visitorsVal = 0; // in millions
    let roomsVal = 0;
    let label = 'National Totals';

    if (this.selectedStateId) {
      const stateData = ACCOMMODATION_DATA.find((d) => d.code === this.selectedStateId);
      if (stateData) {
        visitorsVal = stateData.visitors;
        roomsVal = stateData.rooms;
        label = stateData.name;
      }
    } else {
      // Calculate National Totals
      visitorsVal = ACCOMMODATION_DATA.reduce((sum, d) => sum + d.visitors, 0);
      roomsVal = ACCOMMODATION_DATA.reduce((sum, d) => sum + d.rooms, 0);
    }

    const visitorsTotal = visitorsVal * 1000000;
    const targetRatio = roomsVal > 0 ? Math.round(visitorsTotal / roomsVal) : 0;

    const maxStateVisitors = Math.max(...ACCOMMODATION_DATA.map((d) => d.visitors));
    const maxStateRooms = Math.max(...ACCOMMODATION_DATA.map((d) => d.rooms));

    const scaleMaxVisitors = this.selectedStateId ? maxStateVisitors : visitorsVal;
    const scaleMaxRooms = this.selectedStateId ? maxStateRooms : roomsVal;

    // Normalizing heights based on 130px max height for a 220px tall SVG
    const targetHeightVisitors = Math.max((visitorsVal / scaleMaxVisitors) * 130, 8);
    const targetHeightRooms = Math.max((roomsVal / scaleMaxRooms) * 130, 8);

    // 1. Update Header Info
    this.titleEl.textContent = label;
    this.subtitleEl.textContent = this.selectedStateId
      ? 'State-level demand vs available capacity'
      : 'Click a state on the map to inspect details';

    // 2. Reset Button handling
    if (this.selectedStateId) {
      if (!this.resetBtn) {
        this.resetBtn = document.createElement('button');
        this.resetBtn.type = 'button';
        this.resetBtn.className = 'asset-reset-scope-btn';
        this.resetBtn.title = 'Reset to National Totals';
        this.resetBtn.style.padding = '4px 8px';
        this.resetBtn.style.fontSize = '11px';
        this.resetBtn.style.fontWeight = '600';
        this.resetBtn.style.color = '#475569';
        this.resetBtn.style.background = '#f1f5f9';
        this.resetBtn.style.border = '1px solid #cbd5e1';
        this.resetBtn.style.borderRadius = '6px';
        this.resetBtn.style.cursor = 'pointer';
        this.resetBtn.style.display = 'inline-flex';
        this.resetBtn.style.alignItems = 'center';
        this.resetBtn.style.gap = '4px';
        this.resetBtn.style.transition = 'all 0.15s ease';
        this.resetBtn.innerHTML = `
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>All States</span>
        `;
        this.resetBtn.addEventListener('click', () => {
          this.setSelectedState(null);
          if (this.onResetCallback) {
            this.onResetCallback();
          }
        });
        this.headerActionSlot.appendChild(this.resetBtn);
      }
    } else {
      if (this.resetBtn) {
        this.resetBtn.remove();
        this.resetBtn = null;
      }
    }

    // 3. Fluid Animation Transition
    if (animate) {
      this.animateTransition(
        visitorsVal,
        roomsVal,
        targetRatio,
        targetHeightVisitors,
        targetHeightRooms,
        650
      );
    } else {
      this.currentVisitors = visitorsVal;
      this.currentRooms = roomsVal;
      this.currentRatio = targetRatio;
      this.currentHeightVisitors = targetHeightVisitors;
      this.currentHeightRooms = targetHeightRooms;

      this.visitorBarEl.setAttribute('y', String(180 - targetHeightVisitors));
      this.visitorBarEl.setAttribute('height', String(targetHeightVisitors));
      this.roomBarEl.setAttribute('y', String(180 - targetHeightRooms));
      this.roomBarEl.setAttribute('height', String(targetHeightRooms));

      this.visitorValTextEl.setAttribute('y', String(172 - targetHeightVisitors));
      this.visitorValTextEl.textContent = `${visitorsVal.toFixed(1)}M`;
      this.roomValTextEl.setAttribute('y', String(172 - targetHeightRooms));
      this.roomValTextEl.textContent = `${(roomsVal / 1000).toFixed(1)}k`;

      this.kpiValEl.textContent = targetRatio.toLocaleString();
    }
  }

  private animateTransition(
    targetVisitors: number,
    targetRooms: number,
    targetRatio: number,
    targetHeightVisitors: number,
    targetHeightRooms: number,
    duration: number = 650
  ): void {
    if (this.currentAnimFrame !== null) {
      cancelAnimationFrame(this.currentAnimFrame);
      this.currentAnimFrame = null;
    }

    const startVisitors = this.currentVisitors;
    const startRooms = this.currentRooms;
    const startRatio = this.currentRatio;
    const startHVisitors = this.currentHeightVisitors;
    const startHRooms = this.currentHeightRooms;

    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic: 1 - (1 - t)^3
      const ease = 1 - Math.pow(1 - progress, 3);

      const v = startVisitors + (targetVisitors - startVisitors) * ease;
      const r = startRooms + (targetRooms - startRooms) * ease;
      const rat = Math.round(startRatio + (targetRatio - startRatio) * ease);
      const hV = Math.max(startHVisitors + (targetHeightVisitors - startHVisitors) * ease, 8);
      const hR = Math.max(startHRooms + (targetHeightRooms - startHRooms) * ease, 8);

      this.currentVisitors = v;
      this.currentRooms = r;
      this.currentRatio = rat;
      this.currentHeightVisitors = hV;
      this.currentHeightRooms = hR;

      // Update SVG Bars
      this.visitorBarEl.setAttribute('y', String(180 - hV));
      this.visitorBarEl.setAttribute('height', String(hV));

      this.roomBarEl.setAttribute('y', String(180 - hR));
      this.roomBarEl.setAttribute('height', String(hR));

      // Update Value labels floating above bars
      this.visitorValTextEl.setAttribute('y', String(172 - hV));
      this.visitorValTextEl.textContent = `${v.toFixed(1)}M`;

      this.roomValTextEl.setAttribute('y', String(172 - hR));
      this.roomValTextEl.textContent = `${(r / 1000).toFixed(1)}k`;

      // Update Hero KPI
      this.kpiValEl.textContent = rat.toLocaleString();

      if (progress < 1) {
        this.currentAnimFrame = requestAnimationFrame(frame);
      } else {
        this.currentAnimFrame = null;
      }
    };

    this.currentAnimFrame = requestAnimationFrame(frame);
  }
}
