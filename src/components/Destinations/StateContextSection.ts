import { STATES_OVERVIEW_DATA, type StateOverviewItem } from '../../data/overviewData';
import type { AttractionItem } from '../../data/attractionsData';
import { createInfoIcon } from '../Common/InfoTooltip';

interface StateStatRef {
  valEl: HTMLElement;
  currentVal: number;
  startVal: number;
  targetVal: number;
  format: (v: number) => string;
}

export class StateContextSection {
  public readonly element: HTMLElement;
  private currentAttraction: AttractionItem;
  private statRefs: StateStatRef[] = [];
  private animId?: number;

  constructor(initialAttraction: AttractionItem) {
    this.currentAttraction = initialAttraction;
    this.element = document.createElement('div');
    this.element.className = 'dest-card dest-state-card';

    this.render();
  }

  public setAttraction(attraction: AttractionItem): void {
    this.currentAttraction = attraction;
    this.render();
  }

  private render(): void {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = undefined;
    }

    const prevValues = this.statRefs.map((r) => r.currentVal);
    this.statRefs = [];

    const a = this.currentAttraction;
    const stateData: StateOverviewItem | undefined = STATES_OVERVIEW_DATA[a.stateId];

    this.element.innerHTML = '';

    if (!stateData) {
      const fallback = document.createElement('div');
      fallback.className = 'dest-state-empty';
      fallback.textContent = `State-level macroeconomic baseline unavailable for ${a.stateName}.`;
      this.element.appendChild(fallback);
      return;
    }

    // Card Header (symmetric with LocalDiagnosticCard)
    const cardHeader = document.createElement('div');
    cardHeader.className = 'dest-card-header';
    cardHeader.innerHTML = `
      <div class="dest-card-title-group">
        <div class="dest-card-badge">
          <span class="dest-badge-dot" style="background-color: #0284c7;"></span>
          <span>STATE-LEVEL TOURISM DEMAND CONTEXT</span>
        </div>
        <h3 class="dest-card-title">STATE TOURISM DEMAND CONTEXT (${a.stateName.toUpperCase()})</h3>
        <p class="dest-card-desc">Macro-level state tourism demand backdrop — clearly distinguished from individual attraction footfall</p>
      </div>
    `;

    const infoIcon = createInfoIcon({
      sourceOrg: 'Department of Statistics Malaysia (DOSM) & Tourism Malaysia',
      datasetName: 'Domestic Tourism Survey (DTS) & State Hotel Performance',
      referenceYear: '2025 / 2026 Baseline',
      measure: 'Official state-wide tourist movements, international arrivals, accommodation occupancy, and lodging density.',
      limitations: 'Macro-level state aggregates. These figures describe state-wide throughput and cannot be attributed directly to any single attraction.',
    });

    cardHeader.appendChild(infoIcon);
    this.element.appendChild(cardHeader);

    // 6 State Metrics Grid (3 rows x 2 columns)
    const metricsGrid = document.createElement('div');
    metricsGrid.className = 'dest-state-metrics-grid';

    const statConfigs = [
      {
        label: 'Domestic Visitors',
        targetVal: stateData.domesticVisitorsM,
        format: (v: number) => `${v.toFixed(1)}M`,
        sub: 'Annual domestic trips to state',
        color: '#0369a1',
        bg: '#e0f2fe',
      },
      {
        label: 'International Hotel Guests',
        targetVal: stateData.internationalHotelGuestsM,
        format: (v: number) => `${v.toFixed(1)}M`,
        sub: 'Inbound foreign hotel guest volume',
        color: '#0d9488',
        bg: '#ccfbf1',
      },
      {
        label: 'Average Occupancy Rate (AOR)',
        targetVal: stateData.aorPct,
        format: (v: number) => `${v.toFixed(1)}%`,
        sub: 'State lodging utilization rate',
        color: '#7c3aed',
        bg: '#f3e8ff',
      },
      {
        label: 'Visitor-to-Room Ratio',
        targetVal: stateData.visitorToRoomRatio,
        format: (v: number) => v.toFixed(1),
        sub: 'Visitors per available room proxy',
        color: '#ea580c',
        bg: '#ffedd5',
      },
      {
        label: 'Total Tourism Receipts',
        targetVal: stateData.receiptsRmB,
        format: (v: number) => `RM ${v.toFixed(2)}B`,
        sub: `Average RM ${stateData.receiptsPerVisitor} per trip`,
        color: '#059669',
        bg: '#d1fae5',
      },
      {
        label: 'Average Length of Stay',
        targetVal: stateData.alos,
        format: (v: number) => `${v.toFixed(2)} nights`,
        sub: 'State-wide visitor stay duration',
        color: '#475569',
        bg: '#f1f5f9',
      },
    ];

    statConfigs.forEach((cfg, idx) => {
      const prev = prevValues[idx] ?? 0;
      const statEl = this.createStateStat(
        cfg.label,
        cfg.format(prev),
        cfg.sub,
        cfg.color,
        cfg.bg
      );
      const valEl = statEl.querySelector('.dest-state-stat-value') as HTMLElement;
      this.statRefs.push({
        valEl,
        currentVal: prev,
        startVal: prev,
        targetVal: cfg.targetVal,
        format: cfg.format,
      });
      metricsGrid.appendChild(statEl);
    });

    this.element.appendChild(metricsGrid);

    requestAnimationFrame(() => this.animateStats());
  }

  private animateStats(): void {
    const duration = 650;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.statRefs.forEach((ref) => {
        const current = ref.startVal + (ref.targetVal - ref.startVal) * ease;
        ref.currentVal = current;
        if (ref.valEl) {
          ref.valEl.textContent = ref.format(current);
        }
      });

      if (progress < 1) {
        this.animId = requestAnimationFrame(step);
      } else {
        this.statRefs.forEach((ref) => {
          ref.currentVal = ref.targetVal;
          if (ref.valEl) {
            ref.valEl.textContent = ref.format(ref.targetVal);
          }
        });
        this.animId = undefined;
      }
    };

    this.animId = requestAnimationFrame(step);
  }

  private createStateStat(
    label: string,
    value: string,
    sub: string,
    color: string,
    bg: string
  ): HTMLElement {
    const el = document.createElement('div');
    el.className = 'dest-state-stat-item';
    el.style.borderLeft = `3.5px solid ${color}`;
    el.innerHTML = `
      <span class="dest-state-stat-label">${label}</span>
      <div class="dest-state-stat-value-wrap">
        <span class="dest-state-stat-value" style="color: ${color};">${value}</span>
        <span class="dest-state-stat-badge" style="background: ${bg}; color: ${color}; font-size: 0.64rem; font-weight: 750; padding: 1px 6px; border-radius: 4px;">Macro</span>
      </div>
      <span class="dest-state-stat-sub">${sub}</span>
    `;
    return el;
  }
}
