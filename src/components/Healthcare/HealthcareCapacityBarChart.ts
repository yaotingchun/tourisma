import {
  getAllStateHealthcare,
  type StateHealthcareData,
} from '../../data/healthcareData';
import { createInfoIcon } from '../Common/InfoTooltip';

export type CapacityMetric = 'beds' | 'facilities' | 'hospitals';

export class HealthcareCapacityBarChart {
  public readonly element: HTMLElement;
  private currentMetric: CapacityMetric = 'beds';
  private selectedStateId: string | null = null;
  private onSelectStateCallback?: (stateId: string) => void;

  constructor(onSelectState?: (stateId: string) => void) {
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'hc-card hc-capacity-card';
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
          <span class="hc-badge-dot" style="background:#2563eb;"></span>
          <span>PHYSICAL CAPACITY</span>
        </div>
        <h3 class="hc-card-title">Healthcare Capacity by State</h3>
        <span class="hc-card-desc">Absolute clinical volume and medical infrastructure</span>
      </div>
      <div class="hc-metric-toggle-group">
        <button type="button" class="hc-metric-pill ${this.currentMetric === 'beds' ? 'active' : ''}" data-metric="beds">
          Hospital Beds
        </button>
        <button type="button" class="hc-metric-pill ${this.currentMetric === 'facilities' ? 'active' : ''}" data-metric="facilities">
          All Facilities
        </button>
        <button type="button" class="hc-metric-pill ${this.currentMetric === 'hospitals' ? 'active' : ''}" data-metric="hospitals">
          Hospitals
        </button>
      </div>
    `;

    const capH3 = header.querySelector('h3')!;
    const capInfoIcon = createInfoIcon({
      sourceOrg: 'Ministry of Health Malaysia (MOH)',
      datasetName: 'State Healthcare Capacity Bar Chart',
      referenceYear: '2025',
      measure: 'Horizontal bar chart of absolute healthcare capacity per state — switchable between hospital beds, all facilities, or hospitals only.',
      formula: 'Values are direct counts from MOH state healthcare registers; no normalisation applied in count view.',
      limitations: 'Absolute counts favour high-population states; use in conjunction with population-normalised metrics for fair comparison.',
    });
    capInfoIcon.style.marginLeft = '6px';
    capInfoIcon.style.verticalAlign = 'middle';
    capH3.appendChild(capInfoIcon);

    // Hook buttons
    const buttons = header.querySelectorAll<HTMLButtonElement>('.hc-metric-pill');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const metric = btn.getAttribute('data-metric') as CapacityMetric;
        if (this.currentMetric !== metric) {
          this.currentMetric = metric;
          buttons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.renderBars();
        }
      });
    });

    this.element.appendChild(header);

    // Bars container
    const barsContainer = document.createElement('div');
    barsContainer.className = 'hc-capacity-bars-wrap';
    barsContainer.id = 'hc-capacity-bars-wrap';
    this.element.appendChild(barsContainer);

    this.renderBars();
  }

  private renderBars(): void {
    const container = this.element.querySelector('#hc-capacity-bars-wrap');
    if (!container) return;
    container.innerHTML = '';

    const states: StateHealthcareData[] = getAllStateHealthcare();

    const getValue = (st: StateHealthcareData): number => {
      if (this.currentMetric === 'beds') return st.totalBeds;
      if (this.currentMetric === 'facilities') return st.totalFacilities;
      return st.hospitals;
    };

    states.sort((a, b) => getValue(b) - getValue(a));

    const maxVal = Math.max(...states.map(getValue), 1);

    states.forEach((st) => {
      const val = getValue(st);
      const pctWidth = Math.max(2, (val / maxVal) * 100);
      const isSelected = this.selectedStateId === st.stateId;

      const barColor =
        this.currentMetric === 'beds'
          ? isSelected ? '#1d4ed8' : '#3b82f6'
          : this.currentMetric === 'facilities'
          ? isSelected ? '#0e7490' : '#06b6d4'
          : isSelected ? '#4338ca' : '#6366f1';

      const row = document.createElement('div');
      row.className = `hc-cap-row ${isSelected ? 'selected' : ''}`;
      row.setAttribute('data-state-id', st.stateId);

      row.innerHTML = `
        <div class="hc-cap-label-col">
          <span class="hc-cap-code">${st.code}</span>
          <span class="hc-cap-name" title="${st.stateName}">${st.stateName}</span>
        </div>
        <div class="hc-cap-track-col">
          <div class="hc-cap-bar-bg">
            <div class="hc-cap-bar" style="width: ${pctWidth}%; background-color: ${barColor};"></div>
          </div>
          <span class="hc-cap-bar-val">${val.toLocaleString()}</span>
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
