import type { SimulationResult, TourismPressureStateData } from './pressureData';

export class ScenarioBarsCard {
  public readonly element: HTMLElement;
  private simResult: SimulationResult;

  constructor(initialSimResult: SimulationResult) {
    this.simResult = initialSimResult;
    this.element = document.createElement('div');
    this.element.className = 'pressure-card scenario-bars-card';
    this.render();
  }

  public updateSimulation(simResult: SimulationResult): void {
    this.simResult = simResult;
    this.updateDynamicUI();
  }

  public updateState(_stateData: TourismPressureStateData, simResult: SimulationResult): void {
    this.simResult = simResult;
    this.updateDynamicUI();
  }

  private updateDynamicUI(): void {
    const sim = this.simResult;
    const curVisM = (sim.currentVisitors / 1e6).toFixed(2);
    const scenVisM = (sim.scenarioVisitors / 1e6).toFixed(2);
    const demandSign = sim.demandChangePct >= 0 ? '+' : '';
    const capSign = sim.capacityChangePct >= 0 ? '+' : '';

    const maxVis = Math.max(sim.scenarioVisitors, sim.currentVisitors, 1);
    const visCurPct = Math.min(100, (sim.currentVisitors / maxVis) * 100);
    const visScenPct = Math.min(100, (sim.scenarioVisitors / maxVis) * 100);

    const curVisText = this.element.querySelector<HTMLElement>('#scen-cur-vis-text');
    if (curVisText) curVisText.textContent = `${curVisM}M`;

    const barCurVis = this.element.querySelector<HTMLElement>('#bar-cur-vis-fill');
    if (barCurVis) barCurVis.style.width = `${visCurPct}%`;

    const barScenVis = this.element.querySelector<HTMLElement>('#bar-scen-vis-fill');
    if (barScenVis) barScenVis.style.width = `${visScenPct}%`;

    const barScenVisText = this.element.querySelector<HTMLElement>('#bar-scen-vis-text');
    if (barScenVisText) barScenVisText.textContent = `${scenVisM}M (${demandSign}${sim.demandChangePct}%)`;

    const maxRooms = Math.max(sim.scenarioRooms, sim.currentRooms, 1);
    const roomsCurPct = Math.min(100, (sim.currentRooms / maxRooms) * 100);
    const roomsScenPct = Math.min(100, (sim.scenarioRooms / maxRooms) * 100);

    const curRoomsText = this.element.querySelector<HTMLElement>('#scen-cur-rooms-text');
    if (curRoomsText) curRoomsText.textContent = sim.currentRooms.toLocaleString();

    const barCurRooms = this.element.querySelector<HTMLElement>('#bar-cur-rooms-fill');
    if (barCurRooms) barCurRooms.style.width = `${roomsCurPct}%`;

    const barScenRooms = this.element.querySelector<HTMLElement>('#bar-scen-rooms-fill');
    if (barScenRooms) barScenRooms.style.width = `${roomsScenPct}%`;

    const barScenRoomsText = this.element.querySelector<HTMLElement>('#bar-scen-rooms-text');
    if (barScenRoomsText) barScenRoomsText.textContent = `${sim.scenarioRooms.toLocaleString()} (${capSign}${sim.capacityChangePct}%)`;

    const maxVtr = Math.max(sim.scenarioVtr, sim.currentVtr, 1);
    const vtrCurPct = Math.min(100, (sim.currentVtr / maxVtr) * 100);
    const vtrScenPct = Math.min(100, (sim.scenarioVtr / maxVtr) * 100);

    const curVtrText = this.element.querySelector<HTMLElement>('#scen-cur-vtr-text');
    if (curVtrText) curVtrText.textContent = `${sim.currentVtr.toFixed(1)} / room`;

    const barCurVtr = this.element.querySelector<HTMLElement>('#bar-cur-vtr-fill');
    if (barCurVtr) barCurVtr.style.width = `${vtrCurPct}%`;

    const barScenVtr = this.element.querySelector<HTMLElement>('#bar-scen-vtr-fill');
    if (barScenVtr) barScenVtr.style.width = `${vtrScenPct}%`;

    const barScenVtrText = this.element.querySelector<HTMLElement>('#bar-scen-vtr-text');
    if (barScenVtrText) barScenVtrText.textContent = `${sim.scenarioVtr.toFixed(1)} / room`;

    // Cluster 4: Tourism Pressure Index (TPI)
    const tpi = sim.tpiBreakdown;
    const baseTpi = tpi ? tpi.baselineTpi : 40.1;
    const scenTpi = tpi ? tpi.tpi : 40.1;
    const deltaTpi = tpi ? tpi.tpiDelta : 0;
    const deltaSign = deltaTpi >= 0 ? '+' : '';
    const tpiColor = tpi?.color ?? '#0284c7';

    const curTpiText = this.element.querySelector<HTMLElement>('#scen-cur-tpi-text');
    if (curTpiText) curTpiText.textContent = `${baseTpi.toFixed(1)} / 100`;

    const barCurTpi = this.element.querySelector<HTMLElement>('#bar-cur-tpi-fill');
    if (barCurTpi) barCurTpi.style.width = `${Math.min(100, Math.max(0, baseTpi))}%`;

    const barScenTpi = this.element.querySelector<HTMLElement>('#bar-scen-tpi-fill');
    if (barScenTpi) {
      barScenTpi.style.width = `${Math.min(100, Math.max(0, scenTpi))}%`;
      barScenTpi.style.backgroundColor = tpiColor;
    }

    const barScenTpiText = this.element.querySelector<HTMLElement>('#bar-scen-tpi-text');
    if (barScenTpiText) {
      barScenTpiText.textContent = `${scenTpi.toFixed(1)} (${deltaSign}${deltaTpi.toFixed(1)})`;
      barScenTpiText.style.color = scenTpi < 45 ? '#1d4ed8' : tpiColor;
    }
  }

  private render(): void {
    const sim = this.simResult;
    const curVisM = (sim.currentVisitors / 1e6).toFixed(2);
    const scenVisM = (sim.scenarioVisitors / 1e6).toFixed(2);
    const demandSign = sim.demandChangePct >= 0 ? '+' : '';
    const capSign = sim.capacityChangePct >= 0 ? '+' : '';

    const maxVis = Math.max(sim.scenarioVisitors, sim.currentVisitors, 1);
    const visCurPct = Math.min(100, (sim.currentVisitors / maxVis) * 100);
    const visScenPct = Math.min(100, (sim.scenarioVisitors / maxVis) * 100);

    const maxRooms = Math.max(sim.scenarioRooms, sim.currentRooms, 1);
    const roomsCurPct = Math.min(100, (sim.currentRooms / maxRooms) * 100);
    const roomsScenPct = Math.min(100, (sim.scenarioRooms / maxRooms) * 100);

    const maxVtr = Math.max(sim.scenarioVtr, sim.currentVtr, 1);
    const vtrCurPct = Math.min(100, (sim.currentVtr / maxVtr) * 100);
    const vtrScenPct = Math.min(100, (sim.scenarioVtr / maxVtr) * 100);

    const tpi = sim.tpiBreakdown;
    const baseTpi = tpi ? tpi.baselineTpi : 40.1;
    const scenTpi = tpi ? tpi.tpi : 40.1;
    const deltaTpi = tpi ? tpi.tpiDelta : 0;
    const deltaSign = deltaTpi >= 0 ? '+' : '';
    const tpiColor = tpi?.color ?? '#0284c7';

    this.element.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
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
                  <span id="scen-cur-vis-text" class="num">${curVisM}M</span>
                </div>
                <div class="bar-track">
                  <div id="bar-cur-vis-fill" class="bar-fill current-bar" style="width: ${visCurPct}%;"></div>
                </div>
              </div>
              <div class="single-bar-row">
                <div class="bar-meta">
                  <span class="lbl">Scenario Volume</span>
                  <span id="bar-scen-vis-text" class="num" style="color: var(--primary-blue); font-weight: 800;">${scenVisM}M (${demandSign}${sim.demandChangePct}%)</span>
                </div>
                <div class="bar-track">
                  <div id="bar-scen-vis-fill" class="bar-fill scenario-bar" style="width: ${visScenPct}%;"></div>
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
                  <span id="scen-cur-rooms-text" class="num">${sim.currentRooms.toLocaleString()}</span>
                </div>
                <div class="bar-track">
                  <div id="bar-cur-rooms-fill" class="bar-fill current-bar" style="width: ${roomsCurPct}%;"></div>
                </div>
              </div>
              <div class="single-bar-row">
                <div class="bar-meta">
                  <span class="lbl">Scenario Rooms</span>
                  <span id="bar-scen-rooms-text" class="num" style="color: #10b981; font-weight: 800;">${sim.scenarioRooms.toLocaleString()} (${capSign}${sim.capacityChangePct}%)</span>
                </div>
                <div class="bar-track">
                  <div id="bar-scen-rooms-fill" class="bar-fill rooms-bar" style="width: ${roomsScenPct}%;"></div>
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
                  <span id="scen-cur-vtr-text" class="num">${sim.currentVtr.toFixed(1)} / room</span>
                </div>
                <div class="bar-track">
                  <div id="bar-cur-vtr-fill" class="bar-fill current-bar" style="width: ${vtrCurPct}%;"></div>
                </div>
              </div>
              <div class="single-bar-row">
                <div class="bar-meta">
                  <span class="lbl">Scenario VTR</span>
                  <span id="bar-scen-vtr-text" class="num" style="color: #f59e0b; font-weight: 800;">${sim.scenarioVtr.toFixed(1)} / room</span>
                </div>
                <div class="bar-track">
                  <div id="bar-scen-vtr-fill" class="bar-fill vtr-bar" style="width: ${vtrScenPct}%;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Cluster 4: Tourism Pressure Index (TPI) -->
          <div class="scenario-bar-cluster tpi-cluster">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="cluster-title">Pressure Index (TPI)</span>
              <span style="font-size: 10px; font-weight: 700; color: var(--text-muted);">0.70A + 0.30G</span>
            </div>
            <div class="cluster-bars">
              <div class="single-bar-row">
                <div class="bar-meta">
                  <span class="lbl">Baseline TPI</span>
                  <span id="scen-cur-tpi-text" class="num">${baseTpi.toFixed(1)} / 100</span>
                </div>
                <div class="bar-track">
                  <div id="bar-cur-tpi-fill" class="bar-fill current-bar" style="width: ${Math.min(100, Math.max(0, baseTpi))}%;"></div>
                </div>
              </div>
              <div class="single-bar-row">
                <div class="bar-meta">
                  <span class="lbl">Scenario TPI</span>
                  <span id="bar-scen-tpi-text" class="num" style="color: ${scenTpi < 45 ? '#1d4ed8' : tpiColor}; font-weight: 800;">${scenTpi.toFixed(1)} (${deltaSign}${deltaTpi.toFixed(1)})</span>
                </div>
                <div class="bar-track">
                  <div id="bar-scen-tpi-fill" class="bar-fill tpi-bar" style="width: ${Math.min(100, Math.max(0, scenTpi))}%; background-color: ${tpiColor};"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
