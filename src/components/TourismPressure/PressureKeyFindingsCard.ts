import type { TourismPressureStateData, SimulationResult } from './pressureData';
import { createInfoIcon } from '../Common/InfoTooltip';

interface GeminiInsightResponse {
  whatChanges: string;
  whatBecomesMorePressured: string;
  whatShouldPlannersInvestigate: string[];
  source?: string;
  cached?: boolean;
}

export class PressureKeyFindingsCard {
  public readonly element: HTMLElement;
  private currentStateData: TourismPressureStateData;
  private currentSimResult: SimulationResult;
  private currentInsight: GeminiInsightResponse | null = null;
  private isLoading = false;
  private abortController: AbortController | null = null;
  private debounceTimer: any = null;

  constructor(
    initialStateData: TourismPressureStateData,
    initialSimResult: SimulationResult
  ) {
    this.currentStateData = initialStateData;
    this.currentSimResult = initialSimResult;
    this.element = document.createElement('div');
    this.element.className = 'pressure-card key-findings-card';

    this.render();
    this.fetchInsight();
  }

  public updateScenario(
    stateData: TourismPressureStateData,
    simResult: SimulationResult
  ): void {
    this.currentStateData = stateData;
    this.currentSimResult = simResult;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.fetchInsight();
    }, 450);
  }

  private async fetchInsight(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.isLoading = true;
    this.render();

    try {
      const payload = {
        state: this.currentStateData.name,
        currentVisitors: this.currentSimResult.currentVisitors,
        scenarioVisitors: this.currentSimResult.scenarioVisitors,
        demandChangePct: this.currentSimResult.demandChangePct,
        currentRooms: this.currentSimResult.currentRooms,
        scenarioRooms: this.currentSimResult.scenarioRooms,
        currentVisitorRoomRatio: this.currentSimResult.currentVtr,
        scenarioVisitorRoomRatio: this.currentSimResult.scenarioVtr,
        aorPct: this.currentStateData.aorPct,
        roadAccessRate: this.currentStateData.roadAccessRate,
        ptAccessRate: this.currentStateData.ptAccessRate,
        environmentalExposureRate: this.currentStateData.environmentalExposureRate,
        demandCapacityGapPp: this.currentSimResult.demandCapacityGapPp,
        capacityChangePct: this.currentSimResult.capacityChangePct,
        scenarioSource: this.currentSimResult.scenarioSource,
        tpi: this.currentSimResult.tpiBreakdown?.tpi,
        baselineTpi: this.currentSimResult.tpiBreakdown?.baselineTpi,
        tpiDelta: this.currentSimResult.tpiBreakdown?.tpiDelta,
        accommodationScore: this.currentSimResult.tpiBreakdown?.accommodationScore,
        accessibilityGapScore: this.currentSimResult.tpiBreakdown?.accessibilityGapScore,
        pressureCategory: this.currentSimResult.tpiBreakdown?.pressureCategory,
      };

      const res = await fetch('/api/pressure/simulate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: this.abortController.signal,
      });

      if (res.ok) {
        const data = (await res.json()) as GeminiInsightResponse;
        this.currentInsight = data;
      } else {
        throw new Error(`API error ${res.status}`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('[Key Findings] Fallback applied:', err);
      this.currentInsight = this.generateFallbackInsight();
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  private generateFallbackInsight(): GeminiInsightResponse {
    const curVisM = (this.currentSimResult.currentVisitors / 1e6).toFixed(2);
    const scenVisM = (this.currentSimResult.scenarioVisitors / 1e6).toFixed(2);
    const signD = this.currentSimResult.demandChangePct >= 0 ? '+' : '';
    const signC = this.currentSimResult.capacityChangePct >= 0 ? '+' : '';
    const tpi = this.currentSimResult.tpiBreakdown;
    const tpiVal = tpi ? tpi.tpi.toFixed(1) : '40.1';
    const baseTpiVal = tpi ? tpi.baselineTpi.toFixed(1) : '40.1';
    const tpiDelta = tpi ? tpi.tpiDelta : 0;
    const signT = tpiDelta >= 0 ? '+' : '';
    const aScore = tpi ? tpi.accommodationScore.toFixed(1) : '35.0';
    const gScore = tpi ? tpi.accessibilityGapScore.toFixed(1) : '50.0';
    const cat = tpi ? tpi.pressureCategory : 'Moderate';
    const envPct = this.currentStateData.environmentalExposureRate.toFixed(1);

    return {
      whatChanges: `Demand shifts from ${curVisM}M to ${scenVisM}M (${signD}${this.currentSimResult.demandChangePct.toFixed(1)}%) with room capacity changing by ${signC}${this.currentSimResult.capacityChangePct.toFixed(1)}%, shifting the Tourism Pressure Index (TPI) from ${baseTpiVal} to ${tpiVal} (${signT}${tpiDelta.toFixed(1)} pts, ${cat} Pressure).`,
      whatBecomesMorePressured: `Under this scenario, the Accommodation Pressure Score reaches A = ${aScore} (Visitor-to-Room: ${this.currentSimResult.scenarioVtr.toFixed(1)}, observed AOR: ${this.currentStateData.aorPct.toFixed(1)}%), while the Accessibility Gap Score stands at G = ${gScore} (Road: ${this.currentStateData.roadAccessRate.toFixed(1)}%, PT: ${this.currentStateData.ptAccessRate.toFixed(1)}%). TPI combines these (0.70A + 0.30G) to reflect relative infrastructure pressure. Environmental exposure (${envPct}% of assets near protected reserves) is tracked as an independent spatial indicator, as proximity alone does not establish actual environmental degradation.`,
      whatShouldPlannersInvestigate: [
        `Evaluate accommodation pipelines and licensing in zones with high accommodation pressure (A = ${aScore}) against local operational thresholds rather than assuming outright overcapacity.`,
        `Target last-mile transit and road connectivity where the accessibility gap (G = ${gScore}) compounds visitor concentration during peak holiday windows.`,
        `Monitor visitor dispersal around sensitive ecological buffer zones (${envPct}% near reserves) with seasonal carrying capacity guidelines.`,
      ],
      source: this.currentSimResult.scenarioSource,
    };
  }

  private render(): void {
    const insight = this.currentInsight || this.generateFallbackInsight();

    this.element.innerHTML = `
      <div class="pressure-card-header">
        <div class="pressure-card-title-group">
          <div class="pressure-card-badge">
            <span class="pressure-badge-dot" style="background-color: #2563eb;"></span>
            <span>AI SYNTHESIS & PLANNING DIAGNOSTIC</span>
          </div>
          <h3 class="pressure-card-title">Key Findings & Planning Interpretations</h3>
          <p class="pressure-card-subtitle">Interpreting which existing physical constraints become more pronounced under the selected scenario</p>
        </div>

        <div class="pressure-card-actions">
          <div class="gemini-badge-pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            Gemini 2.5 Flash
          </div>
          <button class="refresh-findings-btn" id="btn-refresh-findings" ${this.isLoading ? 'disabled' : ''}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>
            Refresh
          </button>
          <div id="findings-info-icon-slot"></div>
        </div>
      </div>

      ${
        this.isLoading
          ? `
        <div class="findings-skeleton">
          <div class="skeleton-line" style="width: 30%;"></div>
          <div class="skeleton-line" style="width: 90%;"></div>
          <div class="skeleton-line" style="width: 75%;"></div>
          <div class="skeleton-line" style="width: 85%; margin-top: 8px;"></div>
        </div>
      `
          : `
        <div class="findings-layers-list">
          <!-- Layer 1: WHAT CHANGES? -->
          <div class="finding-layer-box">
            <span class="finding-layer-title">01 — What Changes?</span>
            <div class="finding-layer-content">
              ${insight.whatChanges}
            </div>
          </div>

          <!-- Layer 2: WHAT BECOMES MORE PRESSURED? -->
          <div class="finding-layer-box">
            <span class="finding-layer-title">02 — What Becomes More Pressured?</span>
            <div class="finding-layer-content">
              ${insight.whatBecomesMorePressured}
            </div>
          </div>

          <!-- Layer 3: WHAT SHOULD PLANNERS INVESTIGATE? -->
          <div class="finding-layer-box">
            <span class="finding-layer-title">03 — What Should Planners Investigate?</span>
            <div class="finding-layer-content">
              <ul class="investigation-list">
                ${insight.whatShouldPlannersInvestigate.map((item) => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      `
      }
    `;

    const infoSlot = this.element.querySelector('#findings-info-icon-slot');
    if (infoSlot) {
      const infoIcon = createInfoIcon({
        sourceOrg: 'Tourisma AI Synthesis Engine & Google Vertex AI Gemini 2.5 Flash',
        datasetName: 'Multi-Vector Planning Interpretations & Spatial Diagnostics',
        referenceYear: '2026',
        measure: 'Structured LLM-assisted policy interpretation evaluating physical demand velocities against observed spatial thresholds.',
        formula: 'Dynamic contextual prompt synthesis grounded on empirical DOSM, NAPIC, JKR & PERHILITAN baseline metrics',
        limitations: 'Generative planning interpretations serve as advisory intelligence; requires verification with local municipal authorities.',
      });
      infoSlot.replaceWith(infoIcon);
    }

    const refreshBtn = this.element.querySelector<HTMLButtonElement>('#btn-refresh-findings');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.fetchInsight();
      });
    }
  }
}
