import { STATES_OVERVIEW_DATA, type StateOverviewItem } from '../../data/overviewData';
import type { AttractionItem } from '../../data/attractionsData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class StateContextSection {
  public readonly element: HTMLElement;
  private currentAttraction: AttractionItem;

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

    // 1. Domestic Visitors
    const domVal = stateData.domesticVisitorsM.toFixed(1);
    metricsGrid.appendChild(
      this.createStateStat(
        'Domestic Visitors',
        `${domVal}M`,
        'Annual domestic trips to state',
        '#0369a1',
        '#e0f2fe'
      )
    );

    // 2. International Hotel Guests
    const intVal = stateData.internationalHotelGuestsM.toFixed(1);
    metricsGrid.appendChild(
      this.createStateStat(
        'International Hotel Guests',
        `${intVal}M`,
        'Inbound foreign hotel guest volume',
        '#0d9488',
        '#ccfbf1'
      )
    );

    // 3. Average Occupancy Rate (AOR)
    metricsGrid.appendChild(
      this.createStateStat(
        'Average Occupancy Rate (AOR)',
        `${stateData.aorPct.toFixed(1)}%`,
        'State lodging utilization rate',
        '#7c3aed',
        '#f3e8ff'
      )
    );

    // 4. Visitor-to-Room Ratio
    metricsGrid.appendChild(
      this.createStateStat(
        'Visitor-to-Room Ratio',
        `${stateData.visitorToRoomRatio.toFixed(1)}`,
        'Visitors per available room proxy',
        '#ea580c',
        '#ffedd5'
      )
    );

    // 5. Total Tourism Receipts
    metricsGrid.appendChild(
      this.createStateStat(
        'Total Tourism Receipts',
        `RM ${stateData.receiptsRmB.toFixed(2)}B`,
        `Average RM ${stateData.receiptsPerVisitor} per trip`,
        '#059669',
        '#d1fae5'
      )
    );

    // 6. Average Length of Stay
    metricsGrid.appendChild(
      this.createStateStat(
        'Average Length of Stay',
        `${stateData.alos.toFixed(2)} nights`,
        'State-wide visitor stay duration',
        '#475569',
        '#f1f5f9'
      )
    );

    this.element.appendChild(metricsGrid);
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
