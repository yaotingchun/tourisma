import {
  getAllStateHealthcare,
  NATIONAL_HEALTHCARE_SUMMARY,
  type StateHealthcareData,
} from '../../data/healthcareData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class BedOccupancyRateBarChart {
  public readonly element: HTMLElement;
  private selectedStateId: string | null = null;
  private onSelectStateCallback?: (stateId: string) => void;

  constructor(onSelectState?: (stateId: string) => void) {
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'hc-card hc-bor-card';
    this.render();
  }

  public setSelectedState(stateId: string | null): void {
    this.selectedStateId = stateId;
    this.renderBars();
  }

  private render(): void {
    this.element.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'hc-card-header';
    header.innerHTML = `
      <div class="hc-title-group">
        <div class="hc-badge-header">
          <span class="hc-badge-dot" style="background:#e11d48;"></span>
          <span>SERVICE UTILISATION</span>
        </div>
        <h3 class="hc-card-title">Hospital Bed Occupancy Rate (BOR)</h3>
        <span class="hc-card-desc">State clinical bed utilisation (resident population &amp; healthcare load)</span>
        <div class="hc-bor-national-pill">
          National BOR: <strong>${NATIONAL_HEALTHCARE_SUMMARY.bedOccupancyRate}%</strong>
        </div>
      </div>
    `;

    const borH3 = header.querySelector('h3')!;
    const borInfoIcon = createInfoIcon({
      sourceOrg: 'Ministry of Health Malaysia (MOH) Hospital Activity Statistics',
      datasetName: 'State Hospital Bed Occupancy Rate (BOR) Bar Chart',
      referenceYear: '2025',
      measure: 'Horizontal bar chart showing each state\'s hospital bed occupancy rate versus the national average benchmark.',
      formula: 'BOR = (Total Patient Bed Days in Period / Total Available Bed Days in Period) × 100',
      limitations: 'State-level BOR masks variation between individual hospitals; private hospital BOR tracked separately.',
    });
    borInfoIcon.style.marginLeft = '6px';
    borInfoIcon.style.verticalAlign = 'middle';
    borH3.appendChild(borInfoIcon);
    this.element.appendChild(header);

    // Bars container
    const barsContainer = document.createElement('div');
    barsContainer.className = 'hc-bor-bars-wrap';
    barsContainer.id = 'hc-bor-bars-wrap';
    this.element.appendChild(barsContainer);

    this.renderBars();
  }

  private renderBars(): void {
    const container = this.element.querySelector('#hc-bor-bars-wrap');
    if (!container) return;
    container.innerHTML = '';

    const states: StateHealthcareData[] = getAllStateHealthcare();

    // Sort descending by bedOccupancyRate
    states.sort((a, b) => b.bedOccupancyRate - a.bedOccupancyRate);

    states.forEach((st) => {
      const bor = st.bedOccupancyRate;
      const isSelected = this.selectedStateId === st.stateId;

      // Color coding by BOR severity
      const barColor =
        bor >= 75
          ? '#dc2626'
          : bor >= 65
            ? '#ea580c'
            : bor >= 50
              ? '#d97706'
              : '#0284c7';

      const row = document.createElement('div');
      row.className = `hc-bor-row ${isSelected ? 'selected' : ''}`;
      row.setAttribute('data-state-id', st.stateId);

      row.innerHTML = `
        <div class="hc-bor-label-col">
          <span class="hc-bor-code">${st.code}</span>
          <span class="hc-bor-name" title="${st.stateName}">${st.stateName}</span>
        </div>
        <div class="hc-bor-track-col">
          <div class="hc-bor-bg-track">
            <div class="hc-bor-benchmark-line" style="left: ${NATIONAL_HEALTHCARE_SUMMARY.bedOccupancyRate}%;" title="National Avg (${NATIONAL_HEALTHCARE_SUMMARY.bedOccupancyRate}%)"></div>
            <div class="hc-bor-bar" style="width: ${bor}%; background-color: ${barColor};"></div>
          </div>
          <span class="hc-bor-val-tag">${bor.toFixed(1)}%</span>
        </div>
        <div class="hc-bor-beds-count">
          <span>${st.totalBeds.toLocaleString()} beds</span>
        </div>
      `;

      row.addEventListener('click', () => {
        if (this.onSelectStateCallback) {
          this.onSelectStateCallback(st.stateId);
        }
      });

      container.appendChild(row);
    });
  }
}
