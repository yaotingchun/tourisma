import {
  getPressureStateData,
  type TourismPressureStateData,
} from './pressureData';
import { WhatIfSimulationCard } from './WhatIfSimulationCard';
import { ScenarioBarsCard } from './ScenarioBarsCard';
import { PressureKeyFindingsCard } from './PressureKeyFindingsCard';
import './tourismPressure.css';

export class TourismPressurePage {
  public readonly element: HTMLElement;
  private selectedStateId: string = 'malaysia'; // Default to Whole Malaysia
  private currentStateData: TourismPressureStateData;

  private whatIfSimulationCard!: WhatIfSimulationCard;
  private scenarioBarsCard!: ScenarioBarsCard;
  private keyFindingsCard!: PressureKeyFindingsCard;

  constructor(initialStateId = 'malaysia') {
    this.selectedStateId = initialStateId;
    this.currentStateData = getPressureStateData(this.selectedStateId);

    this.element = document.createElement('div');
    this.element.className = 'tourism-pressure-page';

    this.buildPage();
  }

  public destroy(): void {
    if (this.whatIfSimulationCard) {
      this.whatIfSimulationCard.destroy();
    }
  }

  private buildPage(): void {
    this.element.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'tourism-pressure-container';

    // 1. Unified Single Card: WHAT-IF SCENARIO SIMULATOR (Map on left, Simulator on right)
    this.whatIfSimulationCard = new WhatIfSimulationCard(
      this.currentStateData,
      this.selectedStateId,
      (simResult) => {
        // Dynamic real-time updates on slider drag
        if (this.scenarioBarsCard) {
          this.scenarioBarsCard.updateSimulation(simResult);
        }
        if (this.keyFindingsCard) {
          this.keyFindingsCard.updateScenario(this.currentStateData, simResult);
        }
      },
      (clickedStateId) => {
        this.handleStateChange(clickedStateId);
      }
    );
    container.appendChild(this.whatIfSimulationCard.element);

    // Initial simulation result
    const initialSim = this.whatIfSimulationCard.getSimulationResult();

    // 2. Full-Width Section: SCENARIO INTERPRETATION BARS (Below map & simulator)
    this.scenarioBarsCard = new ScenarioBarsCard(initialSim);
    container.appendChild(this.scenarioBarsCard.element);

    // 3. Section: KEY FINDINGS CARD
    this.keyFindingsCard = new PressureKeyFindingsCard(this.currentStateData, initialSim);
    container.appendChild(this.keyFindingsCard.element);

    this.element.appendChild(container);
  }

  private handleStateChange(newStateId: string): void {
    if (newStateId === this.selectedStateId) return;

    this.selectedStateId = newStateId;
    this.currentStateData = getPressureStateData(this.selectedStateId);

    // Update Child Components
    this.whatIfSimulationCard.updateState(this.currentStateData, this.selectedStateId);
    const simResult = this.whatIfSimulationCard.getSimulationResult();
    this.scenarioBarsCard.updateState(this.currentStateData, simResult);
    this.keyFindingsCard.updateScenario(this.currentStateData, simResult);
  }
}
