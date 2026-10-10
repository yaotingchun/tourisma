import { ACCOMMODATION_DATA } from '../../data/accommodationData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class AccommodationRoomsBarChart {
  public readonly element: HTMLElement;
  private selectedStateId: string | null = null;
  private onSelectStateCallback?: (stateId: string | null) => void;

  constructor(onSelectState?: (stateId: string | null) => void) {
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'accommodation-bar-card kpi-card';

    this.render();
  }

  public setSelectedState(stateId: string | null): void {
    if (this.selectedStateId !== stateId) {
      this.selectedStateId = stateId;
      this.updateSelectedRow();
    }
  }

  private updateSelectedRow(): void {
    const rows = this.element.querySelectorAll<HTMLElement>('.acc-bar-row');
    rows.forEach((row) => {
      const code = row.getAttribute('data-state-code');
      if (this.selectedStateId && code === this.selectedStateId) {
        row.classList.add('selected');
      } else {
        row.classList.remove('selected');
      }
    });
  }

  private render(): void {
    this.element.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'kpi-card-header';
    header.style.marginBottom = '14px';

    const titleGroup = document.createElement('div');
    titleGroup.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
        <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;">Accommodation Rooms by State</h3>
      </div>
      <span style="font-size: 12px; color: var(--text-secondary);">Basic supply comparison of available room inventory</span>
    `;

    const h3 = titleGroup.querySelector('h3')!;
    const infoIcon = createInfoIcon({
      sourceOrg: 'Tourism Malaysia & NAPIC',
      datasetName: 'State-Level Hotel Room Inventory',
      referenceYear: '2025',
      measure: 'Total registered accommodation rooms per state across all star ratings and budget categories.',
      formula: 'State Rooms = Sum of all licensed rooms within state boundaries',
      limitations: 'Excludes unlicensed short-term rentals (Airbnb/homestay).',
    });
    infoIcon.style.marginLeft = '6px';
    infoIcon.style.verticalAlign = 'middle';
    h3.appendChild(infoIcon);

    header.appendChild(titleGroup);

    // Sort data descending by rooms
    const sortedData = [...ACCOMMODATION_DATA].sort((a, b) => b.rooms - a.rooms);
    const maxRooms = Math.max(...sortedData.map((d) => d.rooms));

    // Full vertical listing: no scrollbar, show all states
    const chartContainer = document.createElement('div');
    chartContainer.className = 'acc-bars-container';
    chartContainer.style.display = 'flex';
    chartContainer.style.flexDirection = 'column';
    chartContainer.style.gap = '8px';

    sortedData.forEach((state) => {
      const row = document.createElement('div');
      row.className = `acc-bar-row ${this.selectedStateId === state.code ? 'selected' : ''}`;
      row.setAttribute('data-state-code', state.code);

      // State Name
      const name = document.createElement('div');
      name.className = 'acc-bar-name';
      name.style.width = '120px';
      name.style.fontSize = '12px';
      name.style.fontWeight = '600';
      name.style.color = 'var(--text-secondary)';
      name.style.whiteSpace = 'nowrap';
      name.style.overflow = 'hidden';
      name.style.textOverflow = 'ellipsis';
      name.textContent = state.name;
      name.title = state.name;

      // Bar Container
      const barTrack = document.createElement('div');
      barTrack.style.flex = '1';
      barTrack.style.height = '14px';
      barTrack.style.background = 'var(--border-subtle, rgba(148, 163, 184, 0.15))';
      barTrack.style.borderRadius = '4px';
      barTrack.style.overflow = 'hidden';

      // Bar Fill
      const barFill = document.createElement('div');
      barFill.style.width = `${(state.rooms / maxRooms) * 100}%`;
      barFill.style.height = '100%';
      barFill.style.background = '#3b82f6';
      barFill.style.borderRadius = '4px';
      barFill.style.transition = 'width 0.8s ease-out';

      barTrack.appendChild(barFill);

      // Value
      const val = document.createElement('div');
      val.style.width = '55px';
      val.style.fontSize = '13px';
      val.style.fontWeight = '700';
      val.style.color = 'var(--text-primary)';
      val.style.textAlign = 'right';
      val.textContent = state.rooms.toLocaleString();

      row.appendChild(name);
      row.appendChild(barTrack);
      row.appendChild(val);

      // Clicking row toggles state selection
      row.addEventListener('click', () => {
        const nextState = this.selectedStateId === state.code ? null : state.code;
        this.selectedStateId = nextState;
        this.updateSelectedRow();
        if (this.onSelectStateCallback) {
          this.onSelectStateCallback(nextState);
        }
      });

      chartContainer.appendChild(row);
    });

    this.element.appendChild(header);
    this.element.appendChild(chartContainer);
  }
}
