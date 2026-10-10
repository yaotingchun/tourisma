import { ACCOMMODATION_DATA } from '../../data/accommodationData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class VisitorRatioBarChart {
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
        <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;">Visitor-to-Room Ratio</h3>
      </div>
      <span style="font-size: 12px; color: var(--text-secondary);">Relative demand pressure on room supply</span>
    `;

    const h3 = titleGroup.querySelector('h3')!;
    const infoIcon = createInfoIcon({
      sourceOrg: 'DOSM DTS & Tourism Malaysia Hotel Inventory',
      datasetName: 'State Visitor-to-Room Pressure Proxy',
      referenceYear: '2025',
      measure: 'Annual visitor arrivals per registered accommodation room per state; a proxy for accommodation demand pressure.',
      formula: 'Visitor-to-Room Ratio = State Annual Visitors / State Total Registered Rooms',
      limitations: 'Does not capture peak daily occupancy; states with many day-trippers will appear inflated.',
    });
    infoIcon.style.marginLeft = '6px';
    infoIcon.style.verticalAlign = 'middle';
    h3.appendChild(infoIcon);

    header.appendChild(titleGroup);

    // Calculate ratio and sort descending
    const dataWithRatio = ACCOMMODATION_DATA.map((state) => {
      const ratio = (state.visitors * 1000000) / state.rooms;
      return { ...state, ratio };
    }).sort((a, b) => b.ratio - a.ratio);

    const maxRatio = Math.max(...dataWithRatio.map((d) => d.ratio));

    // Full vertical listing: no scrollbar, show all states
    const chartContainer = document.createElement('div');
    chartContainer.className = 'acc-bars-container';
    chartContainer.style.display = 'flex';
    chartContainer.style.flexDirection = 'column';
    chartContainer.style.gap = '8px';

    dataWithRatio.forEach((state) => {
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
      const fillPercentage = (state.ratio / maxRatio) * 100;
      const barFill = document.createElement('div');
      barFill.style.width = `${fillPercentage}%`;
      barFill.style.height = '100%';

      let color = '#3b82f6';
      if (state.ratio > 800) color = '#ef4444'; // Red for very high pressure
      else if (state.ratio > 500) color = '#f59e0b'; // Yellow for moderate pressure
      else color = '#10b981'; // Green for low pressure

      barFill.style.background = color;
      barFill.style.borderRadius = '4px';
      barFill.style.transition = 'width 0.8s ease-out';

      barTrack.appendChild(barFill);

      // Value
      const val = document.createElement('div');
      val.style.width = '45px';
      val.style.fontSize = '13px';
      val.style.fontWeight = '700';
      val.style.color = 'var(--text-primary)';
      val.style.textAlign = 'right';
      val.textContent = Math.round(state.ratio).toString();

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
