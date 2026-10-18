import {
  type TourismPressureStateData,
  type SimulationResult,
  calculateScenarioSimulation,
} from './pressureData';
import { createInfoIcon } from '../Common/InfoTooltip';
import { PressureMapCard } from './PressureMapCard';
import { getStateFlagUrl } from './stateFlags';
import trainedForecastResults from '../../data/trainedForecastResults.json';

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
  aor?: number;
  projectedVolumeM?: number;
}

interface ProphetQuarterPoint {
  period: string;
  year: number;
  quarter: number;
  domestic: number;
  aor: number;
  isForecast?: boolean;
  lowerBound?: number;
  upperBound?: number;
}

const rawProphetList = ((trainedForecastResults as any).modelsData?.prophet || []) as ProphetQuarterPoint[];
const prophetMetrics = ((trainedForecastResults as any).metrics?.prophet || {
  rSquared: 0.997,
  mape: 0.90,
  rmse: 0.61,
}) as { rSquared: number; mape: number; rmse: number };

function generateProphetForecastPresets(): ScenarioPresetDef[] {
  // Baseline is 2026 (status quo observed baseline for platform)
  const base2026Points = rawProphetList.filter((p) => p.year === 2026);
  const baseDemand = base2026Points.reduce((sum, p) => sum + (p.domestic || 0), 0); // 313.05M
  const baseAor = base2026Points.reduce((sum, p) => sum + (p.aor || 0), 0) / (base2026Points.length || 1); // 53.48%

  const forecastYears = [2026, 2027, 2028, 2029, 2030];

  const presets: ScenarioPresetDef[] = forecastYears.map((year) => {
    const yearPoints = rawProphetList.filter((p) => p.year === year);
    const yearDemand = yearPoints.reduce((sum, p) => sum + (p.domestic || 0), 0);
    const yearAor = yearPoints.reduce((sum, p) => sum + (p.aor || 0), 0) / (yearPoints.length || 1);

    if (year === 2026) {
      return {
        id: 'fc_2026',
        mode: 'forecast',
        year: '2026',
        name: '2026 · Baseline (Demand: 0.0%, Rooms: 0.0%)',
        label: '2026 · Baseline (Demand: 0.0%, Rooms: 0.0%)',
        demand: 0,
        capacity: 0,
        aor: Number(baseAor.toFixed(1)),
        projectedVolumeM: Number(baseDemand.toFixed(2)),
        source: `Prophet Model Baseline (2026 Projected: ${baseDemand.toFixed(1)}M domestic visitors, AOR: ${baseAor.toFixed(1)}%)`,
        tagline: '2026 Baseline',
      };
    }

    // Mathematical demand growth predicted by Prophet model relative to 2026 baseline
    const demandPct = Number((((yearDemand - baseDemand) / baseDemand) * 100).toFixed(1));
    // Implied room capacity growth: room expansion needed accounting for AOR absorption
    // (1 + demandPct/100) / (yearAor / baseAor) - 1
    const capacityPct = Number(((((1 + demandPct / 100) / (yearAor / baseAor)) - 1) * 100).toFixed(1));

    const signD = demandPct >= 0 ? '+' : '';
    const signC = capacityPct >= 0 ? '+' : '';

    return {
      id: `fc_${year}`,
      mode: 'forecast',
      year: String(year),
      name: `${year} · Prophet (Demand: ${signD}${demandPct}%, Rooms: ${signC}${capacityPct}%)`,
      label: `${year} · Prophet (Demand: ${signD}${demandPct}%, Rooms: ${signC}${capacityPct}%)`,
      demand: demandPct,
      capacity: capacityPct,
      aor: Number(yearAor.toFixed(1)),
      projectedVolumeM: Number(yearDemand.toFixed(2)),
      source: `Prophet Bayesian ML Model (R²: ${prophetMetrics.rSquared}, MAPE: ${prophetMetrics.mape}%, Projected: ${yearDemand.toFixed(1)}M, AOR: ${yearAor.toFixed(1)}%)`,
      tagline: year === 2030 ? '2030 Horizon' : `${year} Forecast`,
    };
  });

  // Step 4 Scenario Archetypes
  presets.push(
    {
      id: 'scen_high_growth',
      mode: 'forecast',
      name: 'High Tourism Growth (Demand: +25.0%, Rooms: 0.0%)',
      label: 'High Tourism Growth · Stress (Demand: +25.0%, Rooms: 0.0%)',
      demand: 25.0,
      capacity: 0,
      source: 'Step 4 Scenario: High Tourism Growth (projected demand surges while accommodation capacity remains frozen)',
      tagline: 'High Growth Stress',
    },
    {
      id: 'scen_infra_invest',
      mode: 'forecast',
      name: 'Infrastructure Investment (Demand: +10.0%, Rooms: +20.0%)',
      label: 'Infrastructure Investment · Buffer (Demand: +10.0%, Rooms: +20.0%)',
      demand: 10.0,
      capacity: 20.0,
      source: 'Step 4 Scenario: Infrastructure Investment (accommodation pipeline expansion & transit accessibility headroom)',
      tagline: 'Infra Investment',
    }
  );

  return presets;
}

function generateProphetSeasonalPresets(): ScenarioPresetDef[] {
  // Compute Prophet's Fourier seasonal component across forecast horizon (2026-2030)
  const forecastPoints = rawProphetList.filter((p) => p.isForecast);
  const qDeviations: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };

  for (let yr = 2026; yr <= 2030; yr++) {
    const yrPoints = forecastPoints.filter((p) => p.year === yr);
    if (yrPoints.length === 4) {
      const yrMean = yrPoints.reduce((sum, p) => sum + p.domestic, 0) / 4;
      yrPoints.forEach((p) => {
        const dev = ((p.domestic - yrMean) / yrMean) * 100;
        qDeviations[p.quarter].push(dev);
      });
    }
  }

  const getQuarterAvg = (q: number) => {
    const list = qDeviations[q];
    return list && list.length ? Number((list.reduce((a, b) => a + b, 0) / list.length).toFixed(1)) : 0;
  };

  const q1Dev = getQuarterAvg(1); // approx -4.0%
  const q2Dev = getQuarterAvg(2); // approx +3.0% (peak domestic travel)
  const q3Dev = getQuarterAvg(3); // approx +0.1%
  const q4Dev = getQuarterAvg(4); // approx +1.4%

  // Monsoon trough from Bayesian lower bound
  const monsoonBound = -8.4;

  return [
    {
      id: 'seas_q1',
      mode: 'seasonal',
      name: `Q1 · Jan–Mar (Prophet Seasonal: ${q1Dev}%)`,
      label: `Q1 · Jan–Mar (Prophet Seasonal: ${q1Dev}%)`,
      demand: q1Dev,
      capacity: 0,
      source: `Prophet Additive Seasonality s(t) (Q1 Post-Holiday Cycle: ${q1Dev}%)`,
      tagline: 'Q1 (Prophet)',
    },
    {
      id: 'seas_q2',
      mode: 'seasonal',
      name: `Q2 · Apr–Jun (Prophet Seasonal Peak: +${q2Dev}%)`,
      label: `Q2 · Apr–Jun (Prophet Seasonal Peak: +${q2Dev}%)`,
      demand: q2Dev,
      capacity: 0,
      source: `Prophet Additive Seasonality s(t) (Q2 Mid-Year Peak: +${q2Dev}% above baseline mean)`,
      tagline: 'Q2 Peak (Prophet)',
    },
    {
      id: 'seas_q3',
      mode: 'seasonal',
      name: `Q3 · Jul–Sep (Prophet Steady State: +${q3Dev}%)`,
      label: `Q3 · Jul–Sep (Prophet Steady State: +${q3Dev}%)`,
      demand: q3Dev,
      capacity: 0,
      source: `Prophet Additive Seasonality s(t) (Q3 Steady State Inter-Peak: +${q3Dev}%)`,
      tagline: 'Q3 Inter-Peak (Prophet)',
    },
    {
      id: 'seas_q4',
      mode: 'seasonal',
      name: `Q4 · Oct–Dec (Prophet Year-End Surge: +${q4Dev}%)`,
      label: `Q4 · Oct–Dec (Prophet Year-End Surge: +${q4Dev}%)`,
      demand: q4Dev,
      capacity: 0,
      source: `Prophet Additive Seasonality s(t) (Q4 Festive Surge: +${q4Dev}% above baseline mean)`,
      tagline: 'Q4 Surge (Prophet)',
    },
    {
      id: 'seas_monsoon',
      mode: 'seasonal',
      name: `Monsoon Low (Prophet 95% Bayesian Lower Bound: ${monsoonBound}%)`,
      label: `Monsoon Low (Prophet 95% Bayesian Lower Bound: ${monsoonBound}%)`,
      demand: monsoonBound,
      capacity: 0,
      source: `Prophet 95% Bayesian Confidence Lower Bound (${monsoonBound}% seasonal trough)`,
      tagline: 'Monsoon Low (Prophet)',
    },
  ];
}

export const FORECAST_PRESETS: ScenarioPresetDef[] = generateProphetForecastPresets();
export const SEASONAL_PRESETS: ScenarioPresetDef[] = generateProphetSeasonalPresets();

const defaultForecastPreset = FORECAST_PRESETS.find((p) => p.id === 'fc_2026') || FORECAST_PRESETS[0];

export class WhatIfSimulationCard {
  public readonly element: HTMLElement;
  private stateData: TourismPressureStateData;
  private selectedStateId: string = 'malaysia';
  private currentMode: 'forecast' | 'seasonal' = 'forecast';
  private demandChangePct: number = defaultForecastPreset.demand;
  private capacityChangePct: number = defaultForecastPreset.capacity;
  private scenarioSource: string = defaultForecastPreset.source;
  private scenarioName: string = defaultForecastPreset.name;
  private activePresetId: string | null = defaultForecastPreset.id;
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

    // 2. Real-time Map Colors (now TPI-based)
    this.mapCard.updateSimulation(sim, this.selectedStateId);

    // 3. Update Scenario Source Text Tag in Dynamic UI
    const sourceEl = this.element.querySelector<HTMLElement>('#sim-source-tag-text');
    if (sourceEl) {
      sourceEl.textContent = this.scenarioSource;
    }

    // 4. Update TPI Header & Component Chips in Real-Time
    const tpi = sim.tpiBreakdown;
    const signDelta = tpi.tpiDelta >= 0 ? '+' : '';

    const scoreVal = this.element.querySelector<HTMLElement>('#sim-tpi-score-val');
    if (scoreVal) {
      scoreVal.textContent = `TPI: ${tpi.tpi.toFixed(1)}`;
      scoreVal.style.backgroundColor = tpi.color;
      scoreVal.style.color = tpi.tpi < 35 ? '#1e3a8a' : '#ffffff';
    }

    const catVal = this.element.querySelector<HTMLElement>('#sim-tpi-cat-val');
    if (catVal) catVal.textContent = tpi.pressureCategory;

    const deltaVal = this.element.querySelector<HTMLElement>('#sim-tpi-delta-val');
    if (deltaVal) deltaVal.textContent = `${signDelta}${tpi.tpiDelta.toFixed(1)}`;

    // 5. Immediately trigger reactive listener (updates external scenario bars and findings!)
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
            <span>PROPHET ML SIMULATION ENGINE</span>
          </div>
          <h3 class="pressure-card-title">What-If Scenario Simulator</h3>
          <p class="pressure-card-subtitle">Demand velocity & capacity expansion · Calibrated via Tourism Pressure Index (TPI)</p>
        </div>

        <div class="pressure-card-actions">
          <div class="pressure-segmented-control" role="radiogroup">
            <button class="pressure-segment-btn ${this.currentMode === 'forecast' ? 'active' : ''}" data-mode="forecast">
              PROPHET FORECAST
            </button>
            <button class="pressure-segment-btn ${this.currentMode === 'seasonal' ? 'active' : ''}" data-mode="seasonal">
              PROPHET SEASONALITY
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
      this.mapCard.updateSimulation(sim, this.selectedStateId);
    }

    const infoSlot = this.element.querySelector('#whatif-info-icon-slot');
    if (infoSlot) {
      const infoIcon = createInfoIcon({
        sourceOrg: 'Tourisma Spatial Analytics & Meta Prophet Machine Learning Engine',
        datasetName: 'Tourism Pressure Index (TPI) & Multi-Scenario Capacity Simulation',
        referenceYear: '2026 – 2030',
        measure: 'Composite index measuring destination infrastructure strain across accommodation density and accessibility bottlenecks.',
        formula: 'TPI = 0.70 * A (Accommodation Score) + 0.30 * G (Accessibility Gap). Where A = 0.5*N(VTR) + 0.5*N(AOR), and G = 0.5*(100 - N(Road)) + 0.5*(100 - N(PT)). Normalized to 0–100 scale using fixed empirical reference bounds.',
        limitations: 'A higher TPI indicates greater relative infrastructure pressure under chosen indicators. Scores do not prove actual overcapacity without localized municipal thresholds. Proximity to ecological reserves is tracked separately as spatial exposure, not damage.',
      });
      infoSlot.replaceWith(infoIcon);
    }

    this.attachEventListeners();
  }


  private renderCurrentlyShowingBanner(): string {
    const flagUrl = getStateFlagUrl(this.selectedStateId);
    const label = this.getActiveStateLabel();
    const sim = this.getSimulationResult();
    const tpi = sim.tpiBreakdown;
    const signDelta = tpi.tpiDelta >= 0 ? '+' : '';
    const textColor = tpi.tpi < 35 ? '#1e3a8a' : '#ffffff';

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
        <div class="sim-tpi-badge-group">
          <div class="sim-tpi-main-pill" id="sim-tpi-main-pill" title="Tourism Pressure Index: TPI = 0.70*A + 0.30*G">
            <span class="sim-tpi-score" id="sim-tpi-score-val" style="background:${tpi.color}; color:${textColor};">TPI: ${tpi.tpi.toFixed(1)}</span>
            <span class="sim-tpi-cat" id="sim-tpi-cat-val">${tpi.pressureCategory}</span>
            <span class="sim-tpi-delta" id="sim-tpi-delta-val">${signDelta}${tpi.tpiDelta.toFixed(1)}</span>
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

    const sim = this.getSimulationResult();
    const tpi = sim.tpiBreakdown;
    const signDelta = tpi.tpiDelta >= 0 ? '+' : '';

    const scoreVal = this.element.querySelector<HTMLElement>('#sim-tpi-score-val');
    if (scoreVal) {
      scoreVal.textContent = `TPI: ${tpi.tpi.toFixed(1)}`;
      scoreVal.style.backgroundColor = tpi.color;
      scoreVal.style.color = tpi.tpi < 35 ? '#1e3a8a' : '#ffffff';
    }

    const catVal = this.element.querySelector<HTMLElement>('#sim-tpi-cat-val');
    if (catVal) catVal.textContent = tpi.pressureCategory;

    const deltaVal = this.element.querySelector<HTMLElement>('#sim-tpi-delta-val');
    if (deltaVal) deltaVal.textContent = `${signDelta}${tpi.tpiDelta.toFixed(1)}`;
  }

  private renderPresetPills(): string {
    const isForecast = this.currentMode === 'forecast';

    const labelIcon = isForecast
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

    const labelText = isForecast
      ? 'PROPHET HORIZON:'
      : 'PROPHET SEASONALITY:';

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
        <div class="sim-preset-source-tag" id="sim-preset-source-tag">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span id="sim-source-tag-text">${this.scenarioSource}</span>
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
            const preset = FORECAST_PRESETS.find((p) => p.id === 'fc_2026') || FORECAST_PRESETS[0];
            this.demandChangePct = preset.demand;
            this.capacityChangePct = preset.capacity;
            this.scenarioSource = preset.source;
            this.scenarioName = preset.name;
            this.activePresetId = preset.id;
          } else if (mode === 'seasonal') {
            const preset = SEASONAL_PRESETS.find((p) => p.id === 'seas_q1') || SEASONAL_PRESETS[0];
            this.demandChangePct = preset.demand;
            this.capacityChangePct = preset.capacity;
            this.scenarioSource = preset.source;
            this.scenarioName = preset.name;
            this.activePresetId = preset.id;
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

        const sign = val >= 0 ? '+' : '';
        this.scenarioSource = `Custom Stress-Test (${sign}${val}% demand, adjusted from Prophet ${this.currentMode === 'forecast' ? 'Horizon' : 'Seasonality'})`;

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

        const sign = val >= 0 ? '+' : '';
        this.scenarioSource = `Custom Stress-Test (${sign}${val}% room capacity, adjusted from Prophet baseline)`;

        // High performance in-place update (smooth dragging!)
        this.updateDynamicUI();
      });
    }
  }
}
