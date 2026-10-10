import { STATE_METRICS_DATA } from '../../../data/tourismDemandData';
import { ACCOMMODATION_DATA } from '../../../data/accommodationData';

export class DemandMapProfile {
  public readonly element: HTMLElement;
  private selectedStateId: string | null = null;
  private onResetCallback?: () => void;

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

    // Add a subtle top border highlight
    const topBorder = document.createElement('div');
    topBorder.style.position = 'absolute';
    topBorder.style.top = '0';
    topBorder.style.left = '0';
    topBorder.style.width = '100%';
    topBorder.style.height = '4px';
    topBorder.style.background = 'linear-gradient(90deg, #38bdf8, #2563eb)';
    this.element.appendChild(topBorder);

    this.render();
  }

  public setSelectedState(stateId: string | null): void {
    if (this.selectedStateId !== stateId) {
      this.selectedStateId = stateId;
      this.render();
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

  private render(): void {
    // Keep the top border when re-rendering
    const topBorderHtml = `<div style="position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: linear-gradient(90deg, #38bdf8, #2563eb);"></div>`;

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

    // Calculate percentages for bars
    const vPct = this.selectedStateId ? Math.min((visitorsVal / maxVisitors) * 100, 100) : 100;
    const rPct = this.selectedStateId ? Math.min((receiptsVal / maxReceipts) * 100, 100) : 100;
    const rmPct = this.selectedStateId ? Math.min((roomsVal / maxRooms) * 100, 100) : 100;
    const aorPct = Math.min((aorVal / 100) * 100, 100);

    const getStatBlock = (title: string, value: string, pct: number, colorStart: string, colorEnd: string, icon: string) => {
      return `
        <div style="display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 10px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03); transition: transform 0.2s ease, box-shadow 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(15, 23, 42, 0.06)'" onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 2px rgba(15, 23, 42, 0.03)'">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, ${colorStart}22, ${colorEnd}22); color: ${colorEnd}; display: flex; align-items: center; justify-content: center;">
                ${icon}
              </div>
              <span style="font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${title}</span>
            </div>
            <span style="font-size: 20px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums;">${value}</span>
          </div>
          <div style="width: 100%; height: 6px; background-color: #f1f5f9; border-radius: 999px; overflow: hidden; margin-top: 2px;">
            <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, ${colorStart}, ${colorEnd}); border-radius: 999px; transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
          </div>
        </div>
      `;
    };

    const visitorIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
    const receiptIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
    const roomIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    const aorIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

    this.element.innerHTML = `
      ${topBorderHtml}
      <div style="padding: 22px 24px 16px 24px;">
        <div class="asset-card-header" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 0;">
          <div class="asset-card-title-group" style="flex: 1; min-width: 0;">
            <div class="asset-card-badge" style="margin-bottom: 8px;">
              <span class="asset-badge-dot" style="background-color: #059669;"></span>
              <span>${this.selectedStateId ? 'STATE PROFILE' : 'MACRO OVERVIEW'}</span>
            </div>
            <h3 class="asset-card-title" style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">${label}</h3>
          </div>
          ${this.selectedStateId ? `
            <button type="button" class="asset-reset-scope-btn" title="Reset to National Totals" style="padding: 6px 10px; font-size: 12px; font-weight: 700; color: #475569; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(15,23,42,0.05);" onmouseover="this.style.background='#f1f5f9'; this.style.borderColor='#94a3b8';" onmouseout="this.style.background='#ffffff'; this.style.borderColor='#cbd5e1';">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span>Reset</span>
            </button>
          ` : ''}
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px; flex: 1; padding: 0 20px 24px 20px; overflow-y: auto;">
        ${getStatBlock('Visitors', `${visitorsVal.toFixed(1)}M`, vPct, '#38bdf8', '#0284c7', visitorIcon)}
        ${getStatBlock('Receipts', `RM${receiptsBillion.toFixed(1)}B`, rPct, '#facc15', '#ca8a04', receiptIcon)}
        ${getStatBlock('Rooms', roomsVal.toLocaleString(), rmPct, '#a7f3d0', '#059669', roomIcon)}
        ${getStatBlock('AOR', `${aorVal.toFixed(1)}%`, aorPct, '#d8b4fe', '#9333ea', aorIcon)}
      </div>
    `;

    const resetBtn = this.element.querySelector<HTMLButtonElement>('.asset-reset-scope-btn');
    resetBtn?.addEventListener('click', () => {
      this.setSelectedState(null);
      if (this.onResetCallback) {
        this.onResetCallback();
      }
    });
  }
}
