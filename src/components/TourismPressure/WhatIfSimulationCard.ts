import {
  type TourismPressureStateData,
  type SimulationResult,
  calculateScenarioSimulation,
} from './pressureData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class WhatIfSimulationCard {
  public readonly element: HTMLElement;
  private stateData: TourismPressureStateData;
  private currentMode: 'forecast' | 'seasonal' | 'custom' = 'forecast';
  private demandChangePct: number = 15; // Default 2028 Target (+15.0%)
  private capacityChangePct: number = 6.8; // Default 2028 Pipeline (+6.8%)
  private scenarioSource: string = 'Forecast model (Mid-Term Tourism Growth Trend & Room Expansion)';
  private scenarioName: string = '2028 Target (+15.0% Demand, +6.8% Rooms)';
  private activePresetId: string | null = 'fc_2028';
  private onSimulationChangeCallback?: (result: SimulationResult) => void;

  constructor(
    initialStateData: TourismPressureStateData,
    onSimulationChange?: (result: SimulationResult) => void
  ) {
    this.stateData = initialStateData;
    this.onSimulationChangeCallback = onSimulationChange;
    this.element = document.createElement('div');
    this.element.className = 'pressure-card what-if-card';

    this.render();
  }

  public updateState(newData: TourismPressureStateData): void {
    this.stateData = newData;
    this.render();
    this.triggerChange();
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
    const curVisM = (sim.currentVisitors / 1e6).toFixed(2);
    const scenVisM = (sim.scenarioVisitors / 1e6).toFixed(2);
    const netVisM = ((sim.scenarioVisitors - sim.currentVisitors) / 1e6).toFixed(2);
    const demandSign = sim.demandChangePct >= 0 ? '+' : '';
    const capSign = sim.capacityChangePct >= 0 ? '+' : '';
    const gapSign = sim.demandCapacityGapPp >= 0 ? '+' : '';
    const vtrDiff = (sim.scenarioVtr - sim.currentVtr).toFixed(1);
    const vtrDiffSign = (sim.scenarioVtr - sim.currentVtr) >= 0 ? '+' : '';

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

    // 2. Scenario Source
    const sourceTag = this.element.querySelector<HTMLElement>('#sim-source-tag');
    if (sourceTag) {
      sourceTag.textContent = this.scenarioSource;
    }

    // 3. Comparison Strip Metrics
    const visTrans = this.element.querySelector<HTMLElement>('#comp-vis-trans');
    if (visTrans) {
      visTrans.innerHTML = `<span>${curVisM}M</span><span class="arrow">→</span><span style="color: var(--primary-blue);">${scenVisM}M</span>`;
    }
    const visSub = this.element.querySelector<HTMLElement>('#comp-vis-sub');
    if (visSub) {
      visSub.innerHTML = `<span style="color: ${this.demandChangePct >= 0 ? '#2563eb' : '#dc2626'};">${demandSign}${demandStr}%</span> <span>(${netVisM}M net)</span>`;
    }

    const vtrTrans = this.element.querySelector<HTMLElement>('#comp-vtr-trans');
    if (vtrTrans) {
      vtrTrans.innerHTML = `<span>${sim.currentVtr.toFixed(1)}</span><span class="arrow">→</span><span style="color: #d97706;">${sim.scenarioVtr.toFixed(1)}</span>`;
    }
    const vtrSub = this.element.querySelector<HTMLElement>('#comp-vtr-sub');
    if (vtrSub) {
      vtrSub.innerHTML = `<span>${vtrDiffSign}${vtrDiff} / room</span>`;
    }

    const demandVal = this.element.querySelector<HTMLElement>('#comp-demand-val');
    if (demandVal) {
      demandVal.textContent = `${demandSign}${demandStr}%`;
      demandVal.style.color = this.demandChangePct >= 0 ? '#2563eb' : '#dc2626';
    }

    const capVal = this.element.querySelector<HTMLElement>('#comp-cap-val');
    if (capVal) {
      capVal.textContent = `${capSign}${capStr}%`;
    }
    const capSub = this.element.querySelector<HTMLElement>('#comp-cap-sub');
    if (capSub) {
      capSub.textContent = `${sim.currentRooms.toLocaleString()} → ${sim.scenarioRooms.toLocaleString()} rooms`;
    }

    const gapVal = this.element.querySelector<HTMLElement>('#comp-gap-val');
    if (gapVal) {
      gapVal.textContent = `${gapSign}${sim.demandCapacityGapPp} pp`;
    }
    const gapSub = this.element.querySelector<HTMLElement>('#comp-gap-sub');
    if (gapSub) {
      gapSub.textContent = sim.demandCapacityGapPp > 0
        ? 'Demand outpaces rooms'
        : sim.demandCapacityGapPp < 0
        ? 'Capacity absorbs growth'
        : 'Balanced trajectory';
    }

    // 4. Scenario Interpretation Bars
    const maxVis = Math.max(sim.scenarioVisitors, sim.currentVisitors, 1);
    const visCurPct = Math.min(100, (sim.currentVisitors / maxVis) * 100);
    const visScenPct = Math.min(100, (sim.scenarioVisitors / maxVis) * 100);

    const barCurVis = this.element.querySelector<HTMLElement>('#bar-cur-vis-fill');
    if (barCurVis) barCurVis.style.width = `${visCurPct}%`;
    const barScenVis = this.element.querySelector<HTMLElement>('#bar-scen-vis-fill');
    if (barScenVis) barScenVis.style.width = `${visScenPct}%`;
    const barScenVisText = this.element.querySelector<HTMLElement>('#bar-scen-vis-text');
    if (barScenVisText) barScenVisText.textContent = `${scenVisM}M (${demandSign}${this.demandChangePct}%)`;

    const maxRooms = Math.max(sim.scenarioRooms, sim.currentRooms, 1);
    const roomsCurPct = Math.min(100, (sim.currentRooms / maxRooms) * 100);
    const roomsScenPct = Math.min(100, (sim.scenarioRooms / maxRooms) * 100);

    const barCurRooms = this.element.querySelector<HTMLElement>('#bar-cur-rooms-fill');
    if (barCurRooms) barCurRooms.style.width = `${roomsCurPct}%`;
    const barScenRooms = this.element.querySelector<HTMLElement>('#bar-scen-rooms-fill');
    if (barScenRooms) barScenRooms.style.width = `${roomsScenPct}%`;
    const barScenRoomsText = this.element.querySelector<HTMLElement>('#bar-scen-rooms-text');
    if (barScenRoomsText) barScenRoomsText.textContent = `${sim.scenarioRooms.toLocaleString()} (${capSign}${this.capacityChangePct}%)`;

    const maxVtr = Math.max(sim.scenarioVtr, sim.currentVtr, 1);
    const vtrCurPct = Math.min(100, (sim.currentVtr / maxVtr) * 100);
    const vtrScenPct = Math.min(100, (sim.scenarioVtr / maxVtr) * 100);

    const barCurVtr = this.element.querySelector<HTMLElement>('#bar-cur-vtr-fill');
    if (barCurVtr) barCurVtr.style.width = `${vtrCurPct}%`;
    const barScenVtr = this.element.querySelector<HTMLElement>('#bar-scen-vtr-fill');
    if (barScenVtr) barScenVtr.style.width = `${vtrScenPct}%`;
    const barScenVtrText = this.element.querySelector<HTMLElement>('#bar-scen-vtr-text');
    if (barScenVtrText) barScenVtrText.textContent = `${sim.scenarioVtr.toFixed(1)} / room`;

    // Immediately trigger reactive listener (e.g. map color & tooltip updates!)
    this.triggerChange();
  }

  private render(): void {
    const sim = this.getSimulationResult();
    const curVisM = (sim.currentVisitors / 1e6).toFixed(2);
    const scenVisM = (sim.scenarioVisitors / 1e6).toFixed(2);
    const demandSign = sim.demandChangePct >= 0 ? '+' : '';
    const capSign = sim.capacityChangePct >= 0 ? '+' : '';
    const gapSign = sim.demandCapacityGapPp >= 0 ? '+' : '';
    const demandStr = Number.isInteger(sim.demandChangePct) ? `${sim.demandChangePct}` : sim.demandChangePct.toFixed(1);
    const capStr = Number.isInteger(sim.capacityChangePct) ? `${sim.capacityChangePct}` : sim.capacityChangePct.toFixed(1);

    this.element.innerHTML = `
      <!-- Card Header -->
      <div class="pressure-card-header">
        <div class="pressure-card-title-group">
          <div class="pressure-card-badge">
            <span class="pressure-badge-dot"></span>
            <span>SCENARIO SIMULATION ENGINE</span>
          </div>
          <h3 class="pressure-card-title">What-If Scenario Simulator</h3>
          <p class="pressure-card-subtitle">Stress-test demand velocity and accommodation capacity expansion for ${this.stateData.name}</p>
        </div>

        <div class="pressure-card-actions">
          <div class="pressure-segmented-control" role="radiogroup">
            <button class="pressure-segment-btn ${this.currentMode === 'forecast' ? 'active' : ''}" data-mode="forecast">
              FORECAST TREND
            </button>
            <button class="pressure-segment-btn ${this.currentMode === 'seasonal' ? 'active' : ''}" data-mode="seasonal">
              SEASONAL PEAK
            </button>
            <button class="pressure-segment-btn ${this.currentMode === 'custom' ? 'active' : ''}" data-mode="custom">
              DEMAND + CAPACITY
            </button>
          </div>
          <div id="whatif-info-icon-slot"></div>
        </div>
      </div>

      <!-- Mode Sub-Presets (if Forecast or Seasonal) -->
      ${this.renderPresetPills()}

      <!-- Section 4: Scenario Controls (Two Full-Width Rows) -->
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
            step="1"
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
            step="1"
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

      <!-- Scenario Source Grounding Tag -->
      <div class="scenario-source-indicator">
        <span style="font-weight: 600;">Scenario source:</span>
        <span id="sim-source-tag" class="source-tag">${this.scenarioSource}</span>
      </div>

      <!-- Section 5: CURRENT → SCENARIO Metric Comparison Strip -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div class="pressure-card-badge" style="margin-top: 4px;">
          <span class="pressure-badge-dot" style="background-color: #d97706;"></span>
          <span>CURRENT → SCENARIO METRIC DELTAS</span>
        </div>

        <div class="current-scenario-comparison-strip">
          <!-- Metric 1: Visitors -->
          <div class="comparison-box">
            <span class="comp-label">Visitors</span>
            <div class="comp-transition-val" id="comp-vis-trans">
              <span>${curVisM}M</span>
              <span class="arrow">→</span>
              <span style="color: var(--primary-blue);">${scenVisM}M</span>
            </div>
            <span class="comp-sub-tag" id="comp-vis-sub">
              <span style="color: ${this.demandChangePct >= 0 ? '#2563eb' : '#dc2626'};">${demandSign}${this.demandChangePct}%</span>
              <span>(${((sim.scenarioVisitors - sim.currentVisitors) / 1e6).toFixed(2)}M net)</span>
            </span>
          </div>

          <!-- Metric 2: Visitor / Room Ratio -->
          <div class="comparison-box">
            <span class="comp-label">Visitor / Room Ratio</span>
            <div class="comp-transition-val" id="comp-vtr-trans">
              <span>${sim.currentVtr.toFixed(1)}</span>
              <span class="arrow">→</span>
              <span style="color: #d97706;">${sim.scenarioVtr.toFixed(1)}</span>
            </div>
            <span class="comp-sub-tag" id="comp-vtr-sub">
              <span>${(sim.scenarioVtr - sim.currentVtr) >= 0 ? '+' : ''}${(sim.scenarioVtr - sim.currentVtr).toFixed(1)} / room</span>
            </span>
          </div>

          <!-- Metric 3: Demand Growth -->
          <div class="comparison-box">
            <span class="comp-label">Demand Growth</span>
            <div class="comp-transition-val" id="comp-demand-val" style="color: ${this.demandChangePct >= 0 ? '#2563eb' : '#dc2626'};">
              ${demandSign}${this.demandChangePct}%
            </div>
            <span class="comp-sub-tag">Relative to observed</span>
          </div>

          <!-- Metric 4: Capacity Growth -->
          <div class="comparison-box">
            <span class="comp-label">Room Capacity Growth</span>
            <div class="comp-transition-val" id="comp-cap-val" style="color: #10b981;">
              ${capSign}${this.capacityChangePct}%
            </div>
            <span class="comp-sub-tag" id="comp-cap-sub">
              ${sim.currentRooms.toLocaleString()} → ${sim.scenarioRooms.toLocaleString()} rooms
            </span>
          </div>

          <!-- Metric 5: Demand-Capacity Gap -->
          <div class="comparison-box gap-box">
            <span class="comp-label">Demand–Capacity Gap</span>
            <div class="comp-transition-val" id="comp-gap-val">
              ${gapSign}${sim.demandCapacityGapPp} pp
            </div>
            <span class="comp-sub-tag" id="comp-gap-sub" style="color: #b45309;">
              ${sim.demandCapacityGapPp > 0 ? 'Demand outpaces rooms' : sim.demandCapacityGapPp < 0 ? 'Capacity absorbs growth' : 'Balanced trajectory'}
            </span>
          </div>
        </div>
      </div>

      <!-- Current Observed AOR Defensibility Note -->
      <div class="aor-defensibility-note">
        <strong>Current Observed AOR: ${sim.observedAorPct.toFixed(1)}%</strong>
        <span style="margin-left: 8px;">— AOR is shown as current observed utilisation; the scenario does not forecast AOR.</span>
      </div>

      <!-- Section 6: SCENARIO INTERPRETATION Grouped Comparison -->
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
        <div class="pressure-card-badge">
          <span class="pressure-badge-dot" style="background-color: #059669;"></span>
          <span>SCENARIO INTERPRETATION BARS</span>
        </div>

        <div class="scenario-bars-grid">
          <!-- Cluster 1: Visitors -->
          <div class="scenario-bar-cluster">
            <span class="cluster-title">Annual Visitor Volume</span>
            <div class="cluster-bars">
              <div class="single-bar-row">
                <div class="bar-meta">
                  <span class="lbl">Current Baseline</span>
                  <span class="num">${curVisM}M</span>
                </div>
                <div class="bar-track">
                  <div id="bar-cur-vis-fill" class="bar-fill current-bar" style="width: ${Math.min(100, (sim.currentVisitors / Math.max(sim.scenarioVisitors, sim.currentVisitors)) * 100)}%;"></div>
                </div>
              </div>
              <div class="single-bar-row">
                <div class="bar-meta">
                  <span class="lbl">Scenario Volume</span>
                  <span id="bar-scen-vis-text" class="num" style="color: var(--primary-blue); font-weight: 800;">${scenVisM}M (${demandSign}${this.demandChangePct}%)</span>
                </div>
                <div class="bar-track">
                  <div id="bar-scen-vis-fill" class="bar-fill scenario-bar" style="width: ${Math.min(100, (sim.scenarioVisitors / Math.max(sim.scenarioVisitors, sim.currentVisitors)) * 100)}%;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Cluster 2: Room Capacity -->
          <div class="scenario-bar-cluster">
            <span class="cluster-title">Accommodation Room Inventory</span>
            <div class="cluster-bars">
              <div class="single-bar-row">
                <div class="bar-meta">
                  <span class="lbl">Current Rooms</span>
                  <span class="num">${sim.currentRooms.toLocaleString()}</span>
                </div>
                <div class="bar-track">
                  <div id="bar-cur-rooms-fill" class="bar-fill current-bar" style="width: ${Math.min(100, (sim.currentRooms / Math.max(sim.scenarioRooms, sim.currentRooms)) * 100)}%;"></div>
                </div>
              </div>
              <div class="single-bar-row">
                <div class="bar-meta">
                  <span class="lbl">Scenario Rooms</span>
                  <span id="bar-scen-rooms-text" class="num" style="color: #10b981; font-weight: 800;">${sim.scenarioRooms.toLocaleString()} (${capSign}${this.capacityChangePct}%)</span>
                </div>
                <div class="bar-track">
                  <div id="bar-scen-rooms-fill" class="bar-fill rooms-bar" style="width: ${Math.min(100, (sim.scenarioRooms / Math.max(sim.scenarioRooms, sim.currentRooms)) * 100)}%;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Cluster 3: Visitor-to-Room Ratio -->
          <div class="scenario-bar-cluster">
            <span class="cluster-title">Visitor / Room Density (VTR)</span>
            <div class="cluster-bars">
              <div class="single-bar-row">
                <div class="bar-meta">
                  <span class="lbl">Current VTR</span>
                  <span class="num">${sim.currentVtr.toFixed(1)} / room</span>
                </div>
                <div class="bar-track">
                  <div id="bar-cur-vtr-fill" class="bar-fill current-bar" style="width: ${Math.min(100, (sim.currentVtr / Math.max(sim.scenarioVtr, sim.currentVtr)) * 100)}%;"></div>
                </div>
              </div>
              <div class="single-bar-row">
                <div class="bar-meta">
                  <span class="lbl">Scenario VTR</span>
                  <span id="bar-scen-vtr-text" class="num" style="color: #f59e0b; font-weight: 800;">${sim.scenarioVtr.toFixed(1)} / room</span>
                </div>
                <div class="bar-track">
                  <div id="bar-scen-vtr-fill" class="bar-fill vtr-bar" style="width: ${Math.min(100, (sim.scenarioVtr / Math.max(sim.scenarioVtr, sim.currentVtr)) * 100)}%;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const infoSlot = this.element.querySelector('#whatif-info-icon-slot');
    if (infoSlot) {
      const infoIcon = createInfoIcon({
        sourceOrg: 'Tourisma Policy Simulation Lab & Econometric Forecasting Engine',
        datasetName: 'Tourism Pressure What-If Policy & Capacity Stress-Testing Model',
        referenceYear: '2026 – 2030',
        measure: 'Dynamic simulation of visitor volume velocity against accommodation room expansion pipelines.',
        formula: 'Scenario VTR = Scenario Visitors / Scenario Rooms; Gap (pp) = % Demand Change − % Capacity Change',
        limitations: 'What-If exploratory simulation based on empirical elasticities and NAPIC hotel pipelines. Does not forecast future AOR percentages.',
      });
      infoSlot.replaceWith(infoIcon);
    }

    this.attachEventListeners();
  }

  private renderPresetPills(): string {
    if (this.currentMode === 'forecast') {
      return `
        <div class="sim-preset-options-row">
          <div class="sim-preset-header-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            <span>Forecast Horizon (2026 – 2030 Demand & Capacity Trajectory):</span>
          </div>
          <div class="forecast-timeline-strip">
            <div class="forecast-year-chip ${this.activePresetId === 'fc_2026' ? 'active' : ''}" data-preset="fc_2026" data-demand="0" data-capacity="0" data-source="Current Baseline (2026 Observed / Status Quo)" data-name="2026 Baseline (0.0% Demand, 0.0% Rooms)">
              <div class="chip-year">
                <span>2026 Baseline</span>
                <span class="chip-gap-pill">0.0 pp Gap</span>
              </div>
              <div class="chip-dual-vals">
                <div class="dual-val-item">
                  <span class="val-label">Demand</span>
                  <span class="val-num demand">0.0%</span>
                </div>
                <div class="dual-val-divider">vs</div>
                <div class="dual-val-item">
                  <span class="val-label">Capacity</span>
                  <span class="val-num capacity">0.0%</span>
                </div>
              </div>
              <div class="chip-desc">Observed Status Quo</div>
            </div>

            <div class="forecast-year-chip ${this.activePresetId === 'fc_2027' ? 'active' : ''}" data-preset="fc_2027" data-demand="8.2" data-capacity="3.5" data-source="Forecast model (DOSM & TSA Projections + NAPIC Hotel Pipeline)" data-name="2027 Forecast (+8.2% Demand, +3.5% Rooms)">
              <div class="chip-year">
                <span>2027 Forecast</span>
                <span class="chip-gap-pill">+4.7 pp Gap</span>
              </div>
              <div class="chip-dual-vals">
                <div class="dual-val-item">
                  <span class="val-label">Demand</span>
                  <span class="val-num demand">+8.2%</span>
                </div>
                <div class="dual-val-divider">vs</div>
                <div class="dual-val-item">
                  <span class="val-label">Capacity</span>
                  <span class="val-num capacity">+3.5%</span>
                </div>
              </div>
              <div class="chip-desc">TSA & Hotel Openings</div>
            </div>

            <div class="forecast-year-chip ${this.activePresetId === 'fc_2028' ? 'active' : ''}" data-preset="fc_2028" data-demand="15.0" data-capacity="6.8" data-source="Forecast model (Mid-Term Tourism Growth Trend & Room Expansion)" data-name="2028 Target (+15.0% Demand, +6.8% Rooms)">
              <div class="chip-year">
                <span>2028 Target</span>
                <span class="chip-gap-pill">+8.2 pp Gap</span>
              </div>
              <div class="chip-dual-vals">
                <div class="dual-val-item">
                  <span class="val-label">Demand</span>
                  <span class="val-num demand">+15.0%</span>
                </div>
                <div class="dual-val-divider">vs</div>
                <div class="dual-val-item">
                  <span class="val-label">Capacity</span>
                  <span class="val-num capacity">+6.8%</span>
                </div>
              </div>
              <div class="chip-desc">12MP Hotel Pipeline</div>
            </div>

            <div class="forecast-year-chip ${this.activePresetId === 'fc_2029' ? 'active' : ''}" data-preset="fc_2029" data-demand="20.5" data-capacity="10.2" data-source="Forecast model (Pre-VM2030 Acceleration & Accommodation Supply)" data-name="2029 Expansion (+20.5% Demand, +10.2% Rooms)">
              <div class="chip-year">
                <span>2029 Surge</span>
                <span class="chip-gap-pill">+10.3 pp Gap</span>
              </div>
              <div class="chip-dual-vals">
                <div class="dual-val-item">
                  <span class="val-label">Demand</span>
                  <span class="val-num demand">+20.5%</span>
                </div>
                <div class="dual-val-divider">vs</div>
                <div class="dual-val-item">
                  <span class="val-label">Capacity</span>
                  <span class="val-num capacity">+10.2%</span>
                </div>
              </div>
              <div class="chip-desc">Pre-VM Expansions</div>
            </div>

            <div class="forecast-year-chip ${this.activePresetId === 'fc_2030' ? 'active' : ''}" data-preset="fc_2030" data-demand="25.0" data-capacity="14.5" data-source="Forecast model (Visit Malaysia 2030 Targets & Expansion Plan)" data-name="Visit Malaysia 2030 (+25.0% Demand, +14.5% Rooms)">
              <div class="chip-year">
                <span>2030 Target</span>
                <span class="chip-gap-pill">+10.5 pp Gap</span>
              </div>
              <div class="chip-dual-vals">
                <div class="dual-val-item">
                  <span class="val-label">Demand</span>
                  <span class="val-num demand">+25.0%</span>
                </div>
                <div class="dual-val-divider">vs</div>
                <div class="dual-val-item">
                  <span class="val-label">Capacity</span>
                  <span class="val-num capacity">+14.5%</span>
                </div>
              </div>
              <div class="chip-desc">VM2030 Target Plan</div>
            </div>
          </div>
        </div>
      `;
    }

    if (this.currentMode === 'seasonal') {
      return `
        <div class="sim-preset-options-row">
          <div class="sim-preset-header-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>Seasonal Pattern (Quarterly Trend & Off-Peak):</span>
          </div>
          <div class="seasonal-trend-timeline">
            <div class="trend-quarter-chip ${this.activePresetId === 'seas_q1' ? 'active' : ''}" data-preset="seas_q1" data-demand="22" data-capacity="0" data-source="Historical Seasonality (Q1 Chinese New Year & Festive Surge)" data-name="Q1: CNY Festive (+22.0%)">
              <div class="chip-quarter">Q1 · Jan–Mar</div>
              <div class="chip-trend positive">↗ +22%</div>
              <div class="chip-desc">CNY & Festive Surge</div>
            </div>
            <div class="trend-quarter-chip ${this.activePresetId === 'seas_q2' ? 'active' : ''}" data-preset="seas_q2" data-demand="16" data-capacity="0" data-source="Historical Seasonality (Q2 Mid-Year School Break & Raya)" data-name="Q2: Mid-Year Break (+16.0%)">
              <div class="chip-quarter">Q2 · Apr–Jun</div>
              <div class="chip-trend positive">↗ +16%</div>
              <div class="chip-desc">Mid-Year Break & Raya</div>
            </div>
            <div class="trend-quarter-chip ${this.activePresetId === 'seas_q3' ? 'active' : ''}" data-preset="seas_q3" data-demand="4" data-capacity="0" data-source="Historical Seasonality (Q3 Steady State Inter-Peak)" data-name="Q3: Steady State (+4.0%)">
              <div class="chip-quarter">Q3 · Jul–Sep</div>
              <div class="chip-trend steady">→ +4%</div>
              <div class="chip-desc">Inter-Peak Steady State</div>
            </div>
            <div class="trend-quarter-chip ${this.activePresetId === 'seas_q4' ? 'active' : ''}" data-preset="seas_q4" data-demand="35" data-capacity="0" data-source="Historical Seasonality (Q4 Annual Year-End Festive Peak)" data-name="Q4: Year-End Peak (+35.0%)">
              <div class="chip-quarter">Q4 · Oct–Dec</div>
              <div class="chip-trend peak">⚡ +35%</div>
              <div class="chip-desc">Annual Year-End Peak</div>
            </div>
            <div class="trend-quarter-chip monsoon ${this.activePresetId === 'seas_monsoon' ? 'active' : ''}" data-preset="seas_monsoon" data-demand="-20" data-capacity="0" data-source="Historical Seasonality (Northeast Monsoon Trough Nov–Jan)" data-name="Monsoon Trough (-20.0%)">
              <div class="chip-quarter">Monsoon Dip</div>
              <div class="chip-trend negative">↘ -20%</div>
              <div class="chip-desc">East Coast Off-Peak</div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="sim-preset-options-row">
        <div class="sim-preset-header-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span>Direct Manual Controls:</span>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
          Adjust visitor demand velocity and accommodation capacity expansion sliders below to model custom resilience and expansion scenarios.
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    const modeTabs = this.element.querySelectorAll<HTMLButtonElement>('.pressure-segment-btn');
    modeTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.getAttribute('data-mode') as 'forecast' | 'seasonal' | 'custom';
        if (mode && mode !== this.currentMode) {
          this.currentMode = mode;
          this.activePresetId = null;

          if (mode === 'forecast') {
            this.demandChangePct = 15;
            this.capacityChangePct = 6.8;
            this.scenarioSource = 'Forecast model (Mid-Term Tourism Growth Trend & Room Expansion)';
            this.scenarioName = '2028 Target (+15.0% Demand, +6.8% Rooms)';
            this.activePresetId = 'fc_2028';
          } else if (mode === 'seasonal') {
            this.demandChangePct = 35;
            this.capacityChangePct = 0;
            this.scenarioSource = 'Historical Seasonality (Q4 Annual Year-End Festive Peak)';
            this.scenarioName = 'Q4: Year-End Peak (+35.0%)';
            this.activePresetId = 'seas_q4';
          } else {
            this.scenarioSource = 'User-defined What-If parameters';
            this.scenarioName = 'Custom Scenario';
          }

          this.render();
          this.triggerChange();
        }
      });
    });

    const presetClickables = this.element.querySelectorAll<HTMLElement>('.sim-preset-btn, .forecast-year-chip, .trend-quarter-chip');
    presetClickables.forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetId = btn.getAttribute('data-preset');
        const demand = parseFloat(btn.getAttribute('data-demand') || '0');
        const capacity = parseFloat(btn.getAttribute('data-capacity') || '0');
        const source = btn.getAttribute('data-source') || 'Forecast model';
        const name = btn.getAttribute('data-name') || 'Preset';

        this.activePresetId = presetId;
        this.demandChangePct = demand;
        this.capacityChangePct = capacity;
        this.scenarioSource = source;
        this.scenarioName = name;

        this.render();
        this.triggerChange();
      });
    });

    const demandSlider = this.element.querySelector<HTMLInputElement>('#sim-demand-slider');
    if (demandSlider) {
      demandSlider.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        this.demandChangePct = val;
        this.activePresetId = null;
        this.element.querySelectorAll('.forecast-year-chip.active, .trend-quarter-chip.active, .sim-preset-btn.active').forEach((el) => el.classList.remove('active'));
        if (this.currentMode !== 'custom') {
          this.scenarioSource = `User-defined (adjusted from ${this.currentMode})`;
        } else {
          this.scenarioSource = 'User-defined What-If parameters';
        }

        // High performance in-place update (smooth dragging!)
        this.updateDynamicUI();
      });
    }

    const capacitySlider = this.element.querySelector<HTMLInputElement>('#sim-capacity-slider');
    if (capacitySlider) {
      capacitySlider.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        this.capacityChangePct = val;
        this.activePresetId = null;
        this.element.querySelectorAll('.forecast-year-chip.active, .trend-quarter-chip.active, .sim-preset-btn.active').forEach((el) => el.classList.remove('active'));
        if (this.currentMode !== 'custom') {
          this.scenarioSource = `User-defined (capacity adjusted)`;
        } else {
          this.scenarioSource = 'User-defined What-If parameters';
        }

        // High performance in-place update (smooth dragging!)
        this.updateDynamicUI();
      });
    }
  }
}
