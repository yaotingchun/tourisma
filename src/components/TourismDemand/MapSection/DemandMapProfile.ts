import { STATE_METRICS_DATA } from '../../../data/tourismDemandData';
import { ACCOMMODATION_DATA } from '../../../data/accommodationData';

interface StatBlockRefs {
  valEl: HTMLElement;
  barEl: HTMLElement;
  currentVal: number;
}

export class DemandMapProfile {
  public readonly element: HTMLElement;
  private selectedStateId: string | null = null;
  private onResetCallback?: () => void;

  // Header element references
  private badgeTextEl!: HTMLElement;
  private titleEl!: HTMLElement;
  private headerActionSlot!: HTMLElement;
  private resetBtn: HTMLButtonElement | null = null;

  // Stat block references
  private visitorsBlock!: StatBlockRefs;
  private receiptsBlock!: StatBlockRefs;
  private roomsBlock!: StatBlockRefs;
  private aorBlock!: StatBlockRefs;

  constructor(onReset?: () => void) {
    this.onResetCallback = onReset;
    this.element = document.createElement('div');
    this.element.className = 'asset-card demand-map-profile-panel';

    // Premium styling for the panel
    this.element.style.width = '340px';
    this.element.style.minWidth = '340px';
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';
    this.element.style.boxShadow = '0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.01)';
    this.element.style.border = '1px solid #e2e8f0';
    this.element.style.background = 'linear-gradient(to bottom, #ffffff, #f8fafc)';
    this.element.style.position = 'relative';
    this.element.style.overflow = 'hidden';

    // Top border highlight
    const topBorder = document.createElement('div');
    topBorder.style.position = 'absolute';
    topBorder.style.top = '0';
    topBorder.style.left = '0';
    topBorder.style.width = '100%';
    topBorder.style.height = '4px';
    topBorder.style.background = 'linear-gradient(90deg, #38bdf8, #2563eb)';
    this.element.appendChild(topBorder);

    this.buildDom();

    // Smooth opening entrance transition
    setTimeout(() => {
      this.update(true);
    }, 50);
  }

  public setSelectedState(stateId: string | null): void {
    if (this.selectedStateId !== stateId) {
      this.selectedStateId = stateId;
      this.update(true);
    }
  }

  private getStateMetrics(code: string) {
    const stateMap: Record<string, string> = {
      'JHR': 'Johor', 'KDH': 'Kedah', 'KTN': 'Kelantan', 'MLK': 'Melaka',
      'NSN': 'Negeri Sembilan', 'PHG': 'Pahang', 'PRK': 'Perak', 'PLS': 'Perlis',
      'PNG': 'Pulau Pinang', 'SBH': 'Sabah', 'SWK': 'Sarawak', 'SGR': 'Selangor',
      'TRG': 'Terengganu', 'KUL': 'W.P. Kuala Lumpur', 'LBN': 'W.P. Labuan', 'PJY': 'W.P. Putrajaya'
    };
    const stateName = stateMap[code];
    return STATE_METRICS_DATA.find(d => d.state === stateName);
  }

  private buildDom(): void {
    // Header section
    const headerWrapper = document.createElement('div');
    headerWrapper.style.padding = '22px 24px 16px 24px';

    const header = document.createElement('div');
    header.className = 'asset-card-header';
    header.style.display = 'flex';
    header.style.alignItems = 'flex-start';
    header.style.justifyContent = 'space-between';
    header.style.gap = '10px';
    header.style.marginBottom = '0';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'asset-card-title-group';
    titleGroup.style.flex = '1';
    titleGroup.style.minWidth = '0';

    titleGroup.innerHTML = `
      <div class="asset-card-badge" style="margin-bottom: 8px;">
        <span class="asset-badge-dot" style="background-color: #059669;"></span>
        <span class="profile-badge-text">MACRO OVERVIEW</span>
      </div>
      <h3 class="asset-card-title profile-main-title" style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; transition: color 0.25s ease;">National Totals</h3>
    `;

    this.badgeTextEl = titleGroup.querySelector('.profile-badge-text')!;
    this.titleEl = titleGroup.querySelector('.profile-main-title')!;

    this.headerActionSlot = document.createElement('div');
    this.headerActionSlot.style.display = 'flex';
    this.headerActionSlot.style.alignItems = 'center';

    header.appendChild(titleGroup);
    header.appendChild(this.headerActionSlot);
    headerWrapper.appendChild(header);
    this.element.appendChild(headerWrapper);

    // Body section: 4 Stat Blocks
    const body = document.createElement('div');
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.gap = '12px';
    body.style.flex = '1';
    body.style.padding = '0 20px 24px 20px';
    body.style.overflowY = 'auto';

    const visitorIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
    const receiptIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
    const roomIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    const aorIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

    this.visitorsBlock = this.createStatBlock('Visitors', '#38bdf8', '#0284c7', visitorIcon);
    this.receiptsBlock = this.createStatBlock('Receipts', '#facc15', '#ca8a04', receiptIcon);
    this.roomsBlock = this.createStatBlock('Rooms', '#a7f3d0', '#059669', roomIcon);
    this.aorBlock = this.createStatBlock('AOR', '#d8b4fe', '#9333ea', aorIcon);

    body.appendChild(this.visitorsBlock.valEl.closest('.profile-stat-tile')!);
    body.appendChild(this.receiptsBlock.valEl.closest('.profile-stat-tile')!);
    body.appendChild(this.roomsBlock.valEl.closest('.profile-stat-tile')!);
    body.appendChild(this.aorBlock.valEl.closest('.profile-stat-tile')!);

    this.element.appendChild(body);
  }

  private createStatBlock(
    title: string,
    colorStart: string,
    colorEnd: string,
    icon: string
  ): StatBlockRefs {
    const tile = document.createElement('div');
    tile.className = 'profile-stat-tile';
    tile.style.display = 'flex';
    tile.style.flexDirection = 'column';
    tile.style.gap = '8px';
    tile.style.padding = '14px 16px';
    tile.style.background = '#ffffff';
    tile.style.border = '1px solid #f1f5f9';
    tile.style.borderRadius = '10px';
    tile.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.03)';
    tile.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';

    tile.addEventListener('mouseenter', () => {
      tile.style.transform = 'translateY(-2px)';
      tile.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.06)';
    });
    tile.addEventListener('mouseleave', () => {
      tile.style.transform = 'none';
      tile.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.03)';
    });

    tile.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, ${colorStart}22, ${colorEnd}22); color: ${colorEnd}; display: flex; align-items: center; justify-content: center;">
            ${icon}
          </div>
          <span style="font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${title}</span>
        </div>
        <span class="profile-stat-val" style="font-size: 20px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums;">0</span>
      </div>
      <div style="width: 100%; height: 6px; background-color: #f1f5f9; border-radius: 999px; overflow: hidden; margin-top: 2px;">
        <div class="profile-stat-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, ${colorStart}, ${colorEnd}); border-radius: 999px; transition: width 0.75s cubic-bezier(0.16, 1, 0.3, 1);"></div>
      </div>
    `;

    const valEl = tile.querySelector<HTMLElement>('.profile-stat-val')!;
    const barEl = tile.querySelector<HTMLElement>('.profile-stat-bar')!;

    return { valEl, barEl, currentVal: 0 };
  }

  private update(animate: boolean = true): void {
    let label = 'National Totals';
    let visitorsVal = 0;
    let receiptsVal = 0;
    let roomsVal = 0;
    let aorVal = 0;

    const maxVisitors = Math.max(...STATE_METRICS_DATA.map(d => d.visitors));
    const maxReceipts = Math.max(...STATE_METRICS_DATA.map(d => d.receipts));
    const maxRooms = Math.max(...ACCOMMODATION_DATA.map(d => d.rooms));

    if (this.selectedStateId) {
      const metricsData = this.getStateMetrics(this.selectedStateId);
      const accData = ACCOMMODATION_DATA.find(d => d.code === this.selectedStateId);

      if (metricsData) {
        label = metricsData.state;
        visitorsVal = metricsData.visitors;
        receiptsVal = metricsData.receipts;
      }
      if (accData) {
        roomsVal = accData.rooms;
        aorVal = accData.aor;
      }
    } else {
      visitorsVal = STATE_METRICS_DATA.reduce((sum, d) => sum + d.visitors, 0);
      receiptsVal = STATE_METRICS_DATA.reduce((sum, d) => sum + d.receipts, 0);
      roomsVal = ACCOMMODATION_DATA.reduce((sum, d) => sum + d.rooms, 0);

      const totalAvailableRoomNights = ACCOMMODATION_DATA.reduce((sum, d) => sum + (d.rooms * 365), 0);
      const totalOccupiedRoomNights = ACCOMMODATION_DATA.reduce((sum, d) => sum + (d.rooms * 365 * (d.aor / 100)), 0);
      if (totalAvailableRoomNights > 0) {
        aorVal = (totalOccupiedRoomNights / totalAvailableRoomNights) * 100;
      }
    }

    const receiptsBillion = receiptsVal / 1000;

    // Calculate percentages for progress bars
    const vPct = this.selectedStateId ? Math.min((visitorsVal / maxVisitors) * 100, 100) : 100;
    const rPct = this.selectedStateId ? Math.min((receiptsVal / maxReceipts) * 100, 100) : 100;
    const rmPct = this.selectedStateId ? Math.min((roomsVal / maxRooms) * 100, 100) : 100;
    const aorPct = Math.min((aorVal / 100) * 100, 100);

    // 1. Update Header Info
    this.badgeTextEl.textContent = this.selectedStateId ? 'STATE PROFILE' : 'MACRO OVERVIEW';
    this.titleEl.textContent = label;

    if (this.selectedStateId) {
      if (!this.resetBtn) {
        this.resetBtn = document.createElement('button');
        this.resetBtn.type = 'button';
        this.resetBtn.className = 'asset-reset-scope-btn';
        this.resetBtn.title = 'Reset to National Totals';
        this.resetBtn.style.padding = '6px 10px';
        this.resetBtn.style.fontSize = '12px';
        this.resetBtn.style.fontWeight = '700';
        this.resetBtn.style.color = '#475569';
        this.resetBtn.style.background = '#ffffff';
        this.resetBtn.style.border = '1px solid #cbd5e1';
        this.resetBtn.style.borderRadius = '8px';
        this.resetBtn.style.cursor = 'pointer';
        this.resetBtn.style.display = 'inline-flex';
        this.resetBtn.style.alignItems = 'center';
        this.resetBtn.style.gap = '6px';
        this.resetBtn.style.transition = 'all 0.2s ease';
        this.resetBtn.style.boxShadow = '0 1px 2px rgba(15,23,42,0.05)';
        this.resetBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>Reset</span>
        `;
        this.resetBtn.addEventListener('mouseenter', () => {
          if (this.resetBtn) {
            this.resetBtn.style.background = '#f1f5f9';
            this.resetBtn.style.borderColor = '#94a3b8';
          }
        });
        this.resetBtn.addEventListener('mouseleave', () => {
          if (this.resetBtn) {
            this.resetBtn.style.background = '#ffffff';
            this.resetBtn.style.borderColor = '#cbd5e1';
          }
        });
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

    // 2. Animate Progress Bars (CSS transitions on width)
    this.visitorsBlock.barEl.style.width = `${vPct}%`;
    this.receiptsBlock.barEl.style.width = `${rPct}%`;
    this.roomsBlock.barEl.style.width = `${rmPct}%`;
    this.aorBlock.barEl.style.width = `${aorPct}%`;

    // 3. Smooth Numerical Counter Transitions (over 650ms)
    const startVisitors = this.visitorsBlock.currentVal;
    const endVisitors = visitorsVal;
    const startReceipts = this.receiptsBlock.currentVal;
    const endReceipts = receiptsBillion;
    const startRooms = this.roomsBlock.currentVal;
    const endRooms = roomsVal;
    const startAor = this.aorBlock.currentVal;
    const endAor = aorVal;

    if (animate) {
      this.animateNumber(startVisitors, endVisitors, 650, (v) => {
        this.visitorsBlock.valEl.textContent = `${v.toFixed(1)}M`;
      });
      this.animateNumber(startReceipts, endReceipts, 650, (v) => {
        this.receiptsBlock.valEl.textContent = `RM${v.toFixed(1)}B`;
      });
      this.animateNumber(startRooms, endRooms, 650, (v) => {
        this.roomsBlock.valEl.textContent = Math.round(v).toLocaleString();
      });
      this.animateNumber(startAor, endAor, 650, (v) => {
        this.aorBlock.valEl.textContent = `${v.toFixed(1)}%`;
      });
    } else {
      this.visitorsBlock.valEl.textContent = `${endVisitors.toFixed(1)}M`;
      this.receiptsBlock.valEl.textContent = `RM${endReceipts.toFixed(1)}B`;
      this.roomsBlock.valEl.textContent = Math.round(endRooms).toLocaleString();
      this.aorBlock.valEl.textContent = `${endAor.toFixed(1)}%`;
    }

    this.visitorsBlock.currentVal = endVisitors;
    this.receiptsBlock.currentVal = endReceipts;
    this.roomsBlock.currentVal = endRooms;
    this.aorBlock.currentVal = endAor;
  }

  private animateNumber(
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
