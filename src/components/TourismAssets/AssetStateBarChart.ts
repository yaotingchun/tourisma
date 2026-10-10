import {
  STATE_ASSETS_TOTAL,
  STATE_ASSETS_CORE,
  STATE_ASSETS_SUPPORTING,
  type StateAssetItem,
} from '../../data/tourismAssetsData';
import { createInfoIcon } from '../Common/InfoTooltip';

type StateViewMode = 'total' | 'core' | 'supporting';

const STATE_ID_NAME_MAP: Record<string, string> = {
  'johor': 'Johor',
  'kedah': 'Kedah',
  'kelantan': 'Kelantan',
  'melaka': 'Melaka',
  'negeri_sembilan': 'Negeri Sembilan',
  'pahang': 'Pahang',
  'perak': 'Perak',
  'perlis': 'Perlis',
  'penang': 'Pulau Pinang',
  'sabah': 'Sabah',
  'sarawak': 'Sarawak',
  'selangor': 'Selangor',
  'terengganu': 'Terengganu',
  'kuala_lumpur': 'W.P. Kuala Lumpur',
  'labuan': 'W.P. Labuan',
  'putrajaya': 'W.P. Putrajaya',
};

const STATE_NAME_ID_MAP: Record<string, string> = {};
Object.entries(STATE_ID_NAME_MAP).forEach(([sid, sname]) => {
  STATE_NAME_ID_MAP[sname] = sid;
});

export class AssetStateBarChart {
  public readonly element: HTMLElement;
  private currentMode: StateViewMode = 'total';
  private barsContainer!: HTMLElement;
  private selectedStateId: string | null = null;
  private onSelectStateCallback?: (stateId: string | null) => void;

  constructor(onSelectState?: (stateId: string | null) => void) {
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'asset-card';
    this.render();
  }

  public setSelectedState(stateId: string | null): void {
    this.selectedStateId = stateId;
    this.updateSelection();
  }

  private updateSelection(): void {
    const targetStateName = this.selectedStateId ? STATE_ID_NAME_MAP[this.selectedStateId] : null;
    const rows = this.barsContainer.querySelectorAll<HTMLElement>('.state-bar-row');
    rows.forEach((row) => {
      const rowState = row.getAttribute('data-state-name');
      const isSelected = !!(targetStateName && rowState === targetStateName);
      row.classList.toggle('selected', isSelected);
    });
  }

  private render(): void {
    this.element.innerHTML = '';

    // Card Header
    const header = document.createElement('div');
    header.className = 'asset-card-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'asset-card-title-group';
    titleGroup.innerHTML = `
      <div class="asset-card-badge">
        <span class="asset-badge-dot" style="background-color: #059669;"></span>
        <span>GEOGRAPHIC CONCENTRATION</span>
      </div>
      <h3 class="asset-card-title">Tourism Assets by State</h3>
      <p class="asset-card-subtitle">State-by-state concentration ranking across all 16 states & federal territories</p>
    `;

    const stateH3 = titleGroup.querySelector('h3')!;
    const stateInfoIcon = createInfoIcon({
      sourceOrg: 'DOSM & Tourism Malaysia POI Registry',
      datasetName: 'State Tourism Asset Count Distribution',
      referenceYear: '2025',
      measure: 'Horizontal bar chart ranking states by total, core, or supporting tourism asset counts.',
      formula: 'Total = Core Assets + Supporting Assets per state; rankings are absolute counts not normalised by area or population',
      limitations: 'Larger states (Sarawak, Sabah) have more assets partly due to geographic size; normalised density available in the map view.',
    });
    stateInfoIcon.style.marginLeft = '6px';
    stateInfoIcon.style.verticalAlign = 'middle';
    stateH3.appendChild(stateInfoIcon);

    // Segmented Toggle: [ Total ] [ Core ] [ Supporting ]
    const toggle = document.createElement('div');
    toggle.className = 'asset-segmented-control';
    toggle.setAttribute('role', 'radiogroup');
    toggle.setAttribute('aria-label', 'State Asset View Toggle');

    const options: { id: StateViewMode; label: string }[] = [
      { id: 'total', label: 'Total' },
      { id: 'core', label: 'Core' },
      { id: 'supporting', label: 'Supporting' },
    ];

    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `asset-segment-btn ${this.currentMode === opt.id ? 'active' : ''}`;
      btn.textContent = opt.label;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(this.currentMode === opt.id));

      btn.addEventListener('click', () => {
        if (this.currentMode !== opt.id) {
          this.setMode(opt.id);
        }
      });

      toggle.appendChild(btn);
    });

    header.appendChild(titleGroup);
    header.appendChild(toggle);
    this.element.appendChild(header);

    // Bars Container
    this.barsContainer = document.createElement('div');
    this.barsContainer.className = 'state-bars-grid';
    this.element.appendChild(this.barsContainer);

    this.renderBars();
  }

  public setMode(mode: StateViewMode): void {
    this.currentMode = mode;

    const buttons = this.element.querySelectorAll<HTMLButtonElement>('.asset-segment-btn');
    buttons.forEach((btn) => {
      const isActive = btn.textContent?.toLowerCase() === mode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', String(isActive));
    });

    this.renderBars();
  }

  private renderBars(): void {
    this.barsContainer.innerHTML = '';

    let data: StateAssetItem[];
    let getVal: (item: StateAssetItem) => number;
    let gradient: string;

    if (this.currentMode === 'core') {
      data = STATE_ASSETS_CORE;
      getVal = (item) => item.core;
      gradient = 'linear-gradient(90deg, #2563eb, #60a5fa)';
    } else if (this.currentMode === 'supporting') {
      data = STATE_ASSETS_SUPPORTING;
      getVal = (item) => item.supporting;
      gradient = 'linear-gradient(90deg, #059669, #34d399)';
    } else {
      data = STATE_ASSETS_TOTAL;
      getVal = (item) => item.total;
      gradient = 'linear-gradient(90deg, #4f46e5, #818cf8)';
    }

    const maxVal = Math.max(...data.map((d) => getVal(d)), 1);
    const targetStateName = this.selectedStateId ? STATE_ID_NAME_MAP[this.selectedStateId] : null;

    data.forEach((item, idx) => {
      const val = getVal(item);
      const row = document.createElement('div');
      row.className = 'state-bar-row';
      row.setAttribute('data-state-name', item.state);
      row.style.cursor = 'pointer';

      const isSelected = !!(targetStateName && item.state === targetStateName);
      if (isSelected) {
        row.classList.add('selected');
      }

      // State label with rank
      const label = document.createElement('span');
      label.className = 'state-bar-label';
      label.textContent = `${idx + 1}. ${item.state}`;
      label.title = `${item.state} • Click to filter ring charts`;

      // Track & Fill
      const track = document.createElement('div');
      track.className = 'state-bar-track';

      const fill = document.createElement('div');
      fill.className = 'state-bar-fill';
      fill.style.background = gradient;
      const widthPct = Math.max(2, (val / maxVal) * 100);
      fill.style.width = `${widthPct}%`;

      track.appendChild(fill);

      // Value
      const valEl = document.createElement('span');
      valEl.className = 'state-bar-val';
      valEl.textContent = val.toLocaleString();

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(valEl);

      row.addEventListener('click', () => {
        const sid = STATE_NAME_ID_MAP[item.state] || item.state.toLowerCase();
        const nextState = this.selectedStateId === sid ? null : sid;
        this.setSelectedState(nextState);
        if (this.onSelectStateCallback) {
          this.onSelectStateCallback(nextState);
        }
      });

      this.barsContainer.appendChild(row);
    });
  }
}
