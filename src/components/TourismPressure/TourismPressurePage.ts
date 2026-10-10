import {
  ALL_PRESSURE_STATES,
  getPressureStateData,
  type TourismPressureStateData,
} from './pressureData';
import { CurrentPressureCard } from './CurrentPressureCard';
import { PressureMapCard } from './PressureMapCard';
import { WhatIfSimulationCard } from './WhatIfSimulationCard';
import { PressureKeyFindingsCard } from './PressureKeyFindingsCard';
import './tourismPressure.css';

export class TourismPressurePage {
  public readonly element: HTMLElement;
  private selectedStateId: string = 'malaysia'; // Default to Whole Malaysia as requested
  private currentStateData: TourismPressureStateData;

  private currentPressureCard!: CurrentPressureCard;
  private pressureMapCard!: PressureMapCard;
  private whatIfSimulationCard!: WhatIfSimulationCard;
  private keyFindingsCard!: PressureKeyFindingsCard;

  constructor(initialStateId = 'malaysia') {
    this.selectedStateId = initialStateId;
    this.currentStateData = getPressureStateData(this.selectedStateId);

    this.element = document.createElement('div');
    this.element.className = 'tourism-pressure-page';

    this.buildPage();
  }

  public destroy(): void {
    if (this.pressureMapCard) {
      this.pressureMapCard.destroy();
    }
  }

  private buildPage(): void {
    this.element.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'tourism-pressure-container';

    // 1. Executive Filter Toolbar (Replacing redundant H1 with clean Tourisma toolbar)
    const toolbarEl = document.createElement('div');
    toolbarEl.className = 'pressure-toolbar';
    toolbarEl.innerHTML = `
      <div class="pressure-toolbar-left">
        <div class="pressure-state-filter">
          <label class="pressure-filter-label" for="pressure-state-select">Destination State:</label>
          <select id="pressure-state-select" class="pressure-select">
            ${ALL_PRESSURE_STATES.map(
              (s) =>
                `<option value="${s.id}" ${s.id === this.selectedStateId ? 'selected' : ''}>${s.name}</option>`
            ).join('')}
          </select>
        </div>
        <div class="pressure-target-badge">
          <span class="badge-dot"></span>
          <span>Active Pressure & Capacity Lab</span>
        </div>
      </div>
      <div class="pressure-toolbar-right">
        <span class="pressure-meta-hint">Click any state on the map or select from the dropdown to synchronize diagnostics</span>
      </div>
    `;
    container.appendChild(toolbarEl);

    // 2. Section 1: CURRENT PRESSURE KPI STRIP (4 Cards Grid)
    this.currentPressureCard = new CurrentPressureCard(this.currentStateData);
    container.appendChild(this.currentPressureCard.element);

    // 3. Section 2: PRESSURE MAP CARD
    this.pressureMapCard = new PressureMapCard(this.selectedStateId, (clickedStateId) => {
      this.handleStateChange(clickedStateId, true);
    });
    container.appendChild(this.pressureMapCard.element);

    // 4. Section 3, 4, 5, 6: WHAT-IF SCENARIO SIMULATOR CARD
    this.whatIfSimulationCard = new WhatIfSimulationCard(this.currentStateData, (simResult) => {
      // Dynamic real-time map update on slider drag
      if (this.pressureMapCard) {
        this.pressureMapCard.updateSimulation(simResult, this.selectedStateId);
      }
      if (this.keyFindingsCard) {
        this.keyFindingsCard.updateScenario(this.currentStateData, simResult);
      }
    });
    container.appendChild(this.whatIfSimulationCard.element);

    // Initial map sync with default simulation
    const initialSim = this.whatIfSimulationCard.getSimulationResult();
    this.pressureMapCard.updateSimulation(initialSim, this.selectedStateId);

    // 5. Section 7: KEY FINDINGS CARD
    this.keyFindingsCard = new PressureKeyFindingsCard(this.currentStateData, initialSim);
    container.appendChild(this.keyFindingsCard.element);

    this.element.appendChild(container);

    // Attach Dropdown Listener
    const selectEl = toolbarEl.querySelector<HTMLSelectElement>('#pressure-state-select');
    if (selectEl) {
      selectEl.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value;
        this.handleStateChange(val, false);
      });
    }
  }

  private handleStateChange(newStateId: string, fromMap = false): void {
    if (newStateId === this.selectedStateId) return;

    this.selectedStateId = newStateId;
    this.currentStateData = getPressureStateData(this.selectedStateId);

    // Update Dropdown if triggered by map click
    if (fromMap) {
      const selectEl = this.element.querySelector<HTMLSelectElement>('#pressure-state-select');
      if (selectEl) selectEl.value = this.selectedStateId;
    } else {
      this.pressureMapCard.setSelectedState(this.selectedStateId);
    }

    // Update Child Components
    this.currentPressureCard.update(this.currentStateData);
    this.whatIfSimulationCard.updateState(this.currentStateData);
    const simResult = this.whatIfSimulationCard.getSimulationResult();
    this.pressureMapCard.updateSimulation(simResult, this.selectedStateId);
    this.keyFindingsCard.updateScenario(this.currentStateData, simResult);
  }
}
