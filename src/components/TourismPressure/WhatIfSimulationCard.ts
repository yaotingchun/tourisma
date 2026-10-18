import {
  type TourismPressureStateData,
  type SimulationResult,
  calculateScenarioSimulation,
} from './pressureData';
import { createInfoIcon } from '../Common/InfoTooltip';
import { PressureMapCard } from './PressureMapCard';
import { getStateFlagUrl } from './stateFlags';

export interface ScenarioPresetDef {
  id: string;
  mode: 'forecast' | 'seasonal';
  year?: string;
  name: string;
  label: string;
  demand: number;
  capacity: number;
  source: string;
  tagline: string;
}

export const FORECAST_PRESETS: ScenarioPresetDef[] = [
  {
    id: 'fc_2026',
    mode: 'forecast',
    year: '2026',
    name: '2026 (Demand: 0.0%, Rooms: 0.0%)',
    label: '2026 (Demand: 0.0%, Rooms: 0.0%)',
    demand: 0,
    capacity: 0,
    source: 'Current Baseline (2026 Observed / Status Quo)',
    tagline: '2026 Baseline',
  },
  {
    id: 'fc_2027',
    mode: 'forecast',
    year: '2027',
    name: '2027 (Demand: +8.2%, Rooms: +3.5%)',
    label: '2027 (Demand: +8.2%, Rooms: +3.5%)',
    demand: 8.2,
    capacity: 3.5,
    source: 'Forecast model (DOSM & TSA Projections + NAPIC Hotel Pipeline)',
    tagline: '2027 Forecast',
  },
  {
    id: 'fc_2028',
    mode: 'forecast',
    year: '2028',
    name: '2028 (Demand: +15.0%, Rooms: +6.8%)',
    label: '2028 (Demand: +15.0%, Rooms: +6.8%)',
    demand: 15.0,
    capacity: 6.8,
    source: 'Forecast model (Mid-Term Tourism Growth Trend & Room Expansion)',
    tagline: '2028 Target',
  },
  {
    id: 'fc_2029',
    mode: 'forecast',
    year: '2029',
    name: '2029 (Demand: +20.5%, Rooms: +10.2%)',
    label: '2029 (Demand: +20.5%, Rooms: +10.2%)',
    demand: 20.5,
    capacity: 10.2,
    source: 'Forecast model (Pre-VM2030 Acceleration & Accommodation Supply)',
    tagline: '2029 Surge',
  },
  {
    id: 'fc_2030',
    mode: 'forecast',
    year: '2030',
    name: '2030 (Demand: +25.0%, Rooms: +14.5%)',
    label: '2030 (Demand: +25.0%, Rooms: +14.5%)',
    demand: 25.0,
    capacity: 14.5,
    source: 'Forecast model (Visit Malaysia 2030 Targets & Expansion Plan)',
    tagline: '2030 Target',
  },
];

export const SEASONAL_PRESETS: ScenarioPresetDef[] = [
  {
    id: 'seas_q1',
    mode: 'seasonal',
    name: 'Q1 · Jan–Mar (Demand: +22.0%)',
    label: 'Q1 · Jan–Mar (Demand: +22.0%)',
    demand: 22,
    capacity: 0,
    source: 'Historical Seasonality (Q1 Chinese New Year & Festive Surge)',
    tagline: 'Q1 · Jan–Mar',
  },
  {
    id: 'seas_q2',
    mode: 'seasonal',
    name: 'Q2 · Apr–Jun (Demand: +16.0%)',
    label: 'Q2 · Apr–Jun (Demand: +16.0%)',
    demand: 16,
    capacity: 0,
    source: 'Historical Seasonality (Q2 Mid-Year School Break & Raya)',
    tagline: 'Q2 · Apr–Jun',
  },
  {
    id: 'seas_q3',
    mode: 'seasonal',
    name: 'Q3 · Jul–Sep (Demand: +4.0%)',
    label: 'Q3 · Jul–Sep (Demand: +4.0%)',
    demand: 4,
    capacity: 0,
    source: 'Historical Seasonality (Q3 Steady State Inter-Peak)',
    tagline: 'Q3 · Jul–Sep',
  },
  {
    id: 'seas_q4',
    mode: 'seasonal',
    name: 'Q4 · Oct–Dec (Demand: +35.0%)',
    label: 'Q4 · Oct–Dec (Demand: +35.0%)',
    demand: 35,
    capacity: 0,
    source: 'Historical Seasonality (Q4 Annual Year-End Festive Peak)',
    tagline: 'Q4 · Oct–Dec',
  },
  {
    id: 'seas_monsoon',
    mode: 'seasonal',
    name: 'Monsoon Dip · Nov–Jan (Demand: -20.0%)',
    label: 'Monsoon Dip · Nov–Jan (Demand: -20.0%)',
    demand: -20,
    capacity: 0,
    source: 'Historical Seasonality (Northeast Monsoon Trough Nov–Jan)',
    tagline: 'Monsoon Dip',
  },
];

export class WhatIfSimulationCard {
  public readonly element: HTMLElement;
  private stateData: TourismPressureStateData;
  private selectedStateId: string = 'malaysia';
  private currentMode: 'forecast' | 'seasonal' = 'forecast';
  private demandChangePct: number = 15; // Default 2028 Target (+15.0%)
  private capacityChangePct: number = 6.8; // Default 2028 Pipeline (+6.8%)
  private scenarioSource: string = 'Forecast model (Mid-Term Tourism Growth Trend & Room Expansion)';
  private scenarioName: string = '2028 (Demand: +15.0%, Rooms: +6.8%)';
  private activePresetId: string | null = 'fc_2028';
  private onSimulationChangeCallback?: (result: SimulationResult) => void;
  private onSelectStateCallback?: (stateId: string) => void;
  private mapCard: PressureMapCard;

  constructor(
    initialStateData: TourismPressureStateData,
    initialStateId = 'malaysia',
    onSimulationChange?: (result: SimulationResult) => void,
    onSelectState?: (stateId: string) => void
  ) {
    this.stateData = initialStateData;
    this.selectedStateId = initialStateId;
    this.onSimulationChangeCallback = onSimulationChange;
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'pressure-card what-if-card';

    this.mapCard = new PressureMapCard(this.selectedStateId, (clickedStateId) => {
      if (this.onSelectStateCallback) {
        this.onSelectStateCallback(clickedStateId);
      }
    });

    this.render();

    // Initial map sync
    const initialSim = this.getSimulationResult();
    this.mapCard.updateSimulation(initialSim, this.selectedStateId);
  }

  public updateState(newData: TourismPressureStateData, newStateId?: string): void {
    this.stateData = newData;
    if (newStateId) {
      this.selectedStateId = newStateId;
    }
    this.mapCard.setSelectedState(this.selectedStateId);

    this.updateCurrentlyShowingBanner();

    const sim = this.getSimulationResult();
    this.mapCard.updateSimulation(sim, this.selectedStateId);
    this.triggerChange();
  }

  public destroy(): void {
    if (this.mapCard) {
      this.mapCard.destroy();
    }
  }

  private getActiveStateLabel(): string {
    return this.selectedStateId === 'malaysia' ? 'Whole Malaysia' : this.stateData.name;
  }

  public getSimulationResult(): SimulationResult {
    return calculateScenarioSimulation(this.stateData, {
      mode: this.currentMode,
      demandChangePct: this.demandChangePct,
      capacityChangePct: this.capacityChangePct,
      scenarioSource: this.scenarioSource,
      scenarioName: this.scenarioName,
    });
  }

  private triggerChange(): void {
    const res = this.getSimulationResult();
    if (this.onSimulationChangeCallback) {
      this.onSimulationChangeCallback(res);
    }
  }

  /**
   * High-performance in-place DOM update for silky-smooth slider interaction.
   * Updates only modified text, styles, and bar widths without rebuilding HTML.
   */
  private updateDynamicUI(): void {
    const sim = this.getSimulationResult();
    const demandSign = sim.demandChangePct >= 0 ? '+' : '';
    const capSign = sim.capacityChangePct >= 0 ? '+' : '';

    const demandStr = Number.isInteger(sim.demandChangePct) ? `${sim.demandChangePct}` : sim.demandChangePct.toFixed(1);
    const capStr = Number.isInteger(sim.capacityChangePct) ? `${sim.capacityChangePct}` : sim.capacityChangePct.toFixed(1);

    // 1. Slider Badges
    const demandBadge = this.element.querySelector<HTMLElement>('#sim-demand-badge');
    if (demandBadge) {
      demandBadge.textContent = `${demandSign}${demandStr}%`;
      demandBadge.className = `slider-badge-val ${this.demandChangePct >= 0 ? 'positive' : 'negative'}`;
    }

    const capacityBadge = this.element.querySelector<HTMLElement>('#sim-capacity-badge');
    if (capacityBadge) {
      capacityBadge.textContent = `${capSign}${capStr}%`;
      capacityBadge.className = `slider-badge-val ${this.capacityChangePct >= 0 ? 'positive' : 'negative'}`;
    }

    // 2. Real-time Map Colors
    this.mapCard.updateSimulation(sim, this.selectedStateId);

    // 3. Immediately trigger reactive listener (updates external scenario bars and findings!)
    this.triggerChange();
  }

  private render(): void {
    const sim = this.getSimulationResult();
    const demandSign = sim.demandChangePct >= 0 ? '+' : '';
    const capSign = sim.capacityChangePct >= 0 ? '+' : '';
    const demandStr = Number.isInteger(sim.demandChangePct) ? `${sim.demandChangePct}` : sim.demandChangePct.toFixed(1);
    const capStr = Number.isInteger(sim.capacityChangePct) ? `${sim.capacityChangePct}` : sim.capacityChangePct.toFixed(1);

    this.element.innerHTML = `
      <!-- Single Unified Card Header -->
      <div class="pressure-card-header">
        <div class="pressure-card-title-group">
          <div class="pressure-card-badge">
            <span class="pressure-badge-dot"></span>
            <span>SCENARIO SIMULATION ENGINE</span>
          </div>
          <h3 class="pressure-card-title">What-If Scenario Simulator</h3>
          <p class="pressure-card-subtitle">Demand velocity & capacity expansion · Click state to sync</p>
        </div>

        <div class="pressure-card-actions">
          <div class="pressure-segmented-control" role="radiogroup">
            <button class="pressure-segment-btn ${this.currentMode === 'forecast' ? 'active' : ''}" data-mode="forecast">
              FORECAST TREND
            </button>
            <button class="pressure-segment-btn ${this.currentMode === 'seasonal' ? 'active' : ''}" data-mode="seasonal">
              SEASONAL PEAK
            </button>
          </div>
          <div id="whatif-info-icon-slot"></div>
        </div>
      </div>

      <!-- Unified Card Body: Left Map, Right Simulator Controls -->
      <div class="unified-simulator-body">
        <div class="unified-map-slot" id="unified-map-slot"></div>

        <div class="unified-controls-pane">
          <!-- Currently Showing Region Indicator -->
          ${this.renderCurrentlyShowingBanner()}

          <!-- Horizon / Seasonal Preset Bar -->
          ${this.renderPresetPills()}

          <!-- Slider Controls -->
          <div class="scenario-controls-container">
            <!-- Row 1: Demand Change Slider -->
            <div class="slider-control-block">
              <div class="slider-header-row">
                <span class="slider-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  VISITOR DEMAND CHANGE
                </span>
                <span id="sim-demand-badge" class="slider-badge-val ${this.demandChangePct >= 0 ? 'positive' : 'negative'}">
                  ${demandSign}${demandStr}%
                </span>
              </div>
              <input
                type="range"
                class="sim-range-input"
                id="sim-demand-slider"
                min="-50"
                max="100"
                step="0.5"
                value="${this.demandChangePct}"
              />
              <div class="slider-minmax-row">
                <span>-50%</span>
                <span style="font-weight: 750; color: var(--text-primary);">0% Baseline</span>
                <span>+50%</span>
                <span>+100%</span>
              </div>
            </div>

            <!-- Row 2: Capacity Change Slider -->
            <div class="slider-control-block">
              <div class="slider-header-row">
                <span class="slider-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
                  ACCOMMODATION CAPACITY CHANGE
                </span>
                <span id="sim-capacity-badge" class="slider-badge-val ${this.capacityChangePct >= 0 ? 'positive' : 'negative'}">
                  ${capSign}${capStr}%
                </span>
              </div>
              <input
                type="range"
                class="sim-range-input"
                id="sim-capacity-slider"
                min="-50"
                max="100"
                step="0.5"
                value="${this.capacityChangePct}"
              />
              <div class="slider-minmax-row">
                <span>-50%</span>
                <span style="font-weight: 750; color: var(--text-primary);">0% Baseline</span>
                <span>+50%</span>
                <span>+100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const mapSlot = this.element.querySelector<HTMLElement>('#unified-map-slot');
    if (mapSlot && this.mapCard) {
      mapSlot.appendChild(this.mapCard.element);
    }

    const infoSlot = this.element.querySelector('#whatif-info-icon-slot');
    if (infoSlot) {
      const infoIcon = createInfoIcon({
        sourceOrg: 'Tourisma Policy Simulation Lab & Econometric Forecasting Engine',
        datasetName: 'Tourism Pressure What-If Policy & Capacity Stress-Testing Model',
        referenceYear: '2026 – 2030',
        measure: 'Dynamic simulation of visitor volume velocity against accommodation room expansion pipelines.',
        formula: 'Scenario VTR = Scenario Visitors / Scenario Rooms',
        limitations: 'What-If exploratory simulation based on empirical elasticities and NAPIC hotel pipelines. Does not forecast future AOR percentages.',
      });
      infoSlot.replaceWith(infoIcon);
    }

    this.attachEventListeners();
  }


  private renderCurrentlyShowingBanner(): string {
    const flagUrl = getStateFlagUrl(this.selectedStateId);
    const label = this.getActiveStateLabel();

    return `
      <div class="sim-showing-header">
        <div class="sim-showing-header-left">
          <span class="sim-showing-label">CURRENTLY SHOWING:</span>
          <div class="sim-showing-target">
            <img
              src="${flagUrl}"
              alt="${label} Flag"
              class="sim-showing-flag"
              id="sim-active-state-flag"
            />
            <span class="sim-showing-name" id="sim-currently-showing-name">${label}</span>
          </div>
        </div>
      </div>
    `;
  }

  private updateCurrentlyShowingBanner(): void {
    const flagEl = this.element.querySelector<HTMLImageElement>('#sim-active-state-flag');
    const label = this.getActiveStateLabel();
    if (flagEl) {
      flagEl.src = getStateFlagUrl(this.selectedStateId);
      flagEl.alt = `${label} Flag`;
    }

    const showingNameEl = this.element.querySelector<HTMLElement>('#sim-currently-showing-name');
    if (showingNameEl) {
      showingNameEl.textContent = label;
    }
  }

  private renderPresetPills(): string {
    const isForecast = this.currentMode === 'forecast';

    const labelIcon = isForecast
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

    const labelText = isForecast
      ? 'HORIZON PRESET:'
      : 'SEASONAL PRESET:';

    let selectOptionsHtml = '';
    if (isForecast) {
      selectOptionsHtml = FORECAST_PRESETS
        .map(p => `<option value="${p.id}" ${this.activePresetId === p.id ? 'selected' : ''}>${p.label}</option>`)
        .join('');
    } else {
      selectOptionsHtml = SEASONAL_PRESETS
        .map(p => `<option value="${p.id}" ${this.activePresetId === p.id ? 'selected' : ''}>${p.label}</option>`)
        .join('');
    }

    if (!this.activePresetId) {
      selectOptionsHtml += `<option value="custom" selected>✏️ Custom Parameters</option>`;
    }

    return `
      <div class="sim-preset-bar">
        <div class="sim-preset-dropdown-group">
          <label for="sim-preset-select" class="sim-preset-label">
            ${labelIcon}
            <span>${labelText}</span>
          </label>
          <div class="sim-preset-select-wrapper">
            <select id="sim-preset-select" class="sim-preset-select" aria-label="Select simulation preset">
              ${selectOptionsHtml}
            </select>
            <div class="sim-preset-chevron">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    const modeTabs = this.element.querySelectorAll<HTMLButtonElement>('.pressure-segment-btn');
    modeTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.getAttribute('data-mode') as 'forecast' | 'seasonal';
        if (mode && mode !== this.currentMode) {
          this.currentMode = mode;
          this.activePresetId = null;

          if (mode === 'forecast') {
            this.demandChangePct = 15;
            this.capacityChangePct = 6.8;
            this.scenarioSource = 'Forecast model (Mid-Term Tourism Growth Trend & Room Expansion)';
            this.scenarioName = '2028 (Demand: +15.0%, Rooms: +6.8%)';
            this.activePresetId = 'fc_2028';
          } else if (mode === 'seasonal') {
            this.demandChangePct = 35;
            this.capacityChangePct = 0;
            this.scenarioSource = 'Historical Seasonality (Q4 Annual Year-End Festive Peak)';
            this.scenarioName = 'Q4 · Oct–Dec (Demand: +35.0%)';
            this.activePresetId = 'seas_q4';
          }

          this.render();
          this.triggerChange();
        }
      });
    });

    const presetSelect = this.element.querySelector<HTMLSelectElement>('#sim-preset-select');
    if (presetSelect) {
      presetSelect.addEventListener('change', () => {
        const val = presetSelect.value;
        if (val === 'custom') return;

        const preset = FORECAST_PRESETS.find(p => p.id === val) || SEASONAL_PRESETS.find(p => p.id === val);
        if (preset) {
          this.currentMode = preset.mode;
          this.activePresetId = preset.id;
          this.demandChangePct = preset.demand;
          this.capacityChangePct = preset.capacity;
          this.scenarioSource = preset.source;
          this.scenarioName = preset.name;

          this.render();
          this.triggerChange();
        }
      });
    }

    const demandSlider = this.element.querySelector<HTMLInputElement>('#sim-demand-slider');
    if (demandSlider) {
      demandSlider.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.demandChangePct = val;
        this.activePresetId = null;

        const selectEl = this.element.querySelector<HTMLSelectElement>('#sim-preset-select');
        if (selectEl) {
          let customOpt = selectEl.querySelector<HTMLOptionElement>('option[value="custom"]');
          if (!customOpt) {
            customOpt = document.createElement('option');
            customOpt.value = 'custom';
            customOpt.textContent = '✏️ Custom Parameters';
            selectEl.appendChild(customOpt);
          }
          selectEl.value = 'custom';
        }

        this.scenarioSource = `User-defined (adjusted from ${this.currentMode})`;

        // High performance in-place update (smooth dragging!)
        this.updateDynamicUI();
      });
    }

    const capacitySlider = this.element.querySelector<HTMLInputElement>('#sim-capacity-slider');
    if (capacitySlider) {
      capacitySlider.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.capacityChangePct = val;
        this.activePresetId = null;

        const selectEl = this.element.querySelector<HTMLSelectElement>('#sim-preset-select');
        if (selectEl) {
          let customOpt = selectEl.querySelector<HTMLOptionElement>('option[value="custom"]');
          if (!customOpt) {
            customOpt = document.createElement('option');
            customOpt.value = 'custom';
            customOpt.textContent = '✏️ Custom Parameters';
            selectEl.appendChild(customOpt);
          }
          selectEl.value = 'custom';
        }

        this.scenarioSource = `User-defined (capacity adjusted)`;

        // High performance in-place update (smooth dragging!)
        this.updateDynamicUI();
      });
    }
  }
}
