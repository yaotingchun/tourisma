import { SPATIAL_INFRASTRUCTURE_METRICS, type SpatialInfrastructureMetrics } from '../../../data/overviewData';
import { createInfoIcon } from '../../Common/InfoTooltip';

export class EconomicContributionCards {
  public readonly element: HTMLElement;
  private data: SpatialInfrastructureMetrics;

  constructor(data: SpatialInfrastructureMetrics = SPATIAL_INFRASTRUCTURE_METRICS) {
    this.element = document.createElement('div');
    this.element.className = 'right-gauge-column-stack';
    this.data = data;
    this.render();
  }

  public updateData(data: SpatialInfrastructureMetrics): void {
    this.data = data;
    this.render();
  }

  private render(): void {
    this.element.innerHTML = '';

    // 1. Spatial Infrastructure Accessibility Card
    const infraCard = document.createElement('div');
    infraCard.className = 'economic-gauge-card';
    infraCard.innerHTML = `
      <div class="gauge-card-header" style="display: flex; flex-direction: row; align-items: flex-start; justify-content: space-between; gap: 8px;">
        <div class="gauge-card-title-group" style="flex: 1; min-width: 0;">
          <h3 class="gauge-card-title">INFRASTRUCTURE ACCESSIBILITY</h3>
          <span class="gauge-card-subtitle">Transit & road coverage (${this.data.totalTourismAssets.toLocaleString()} assets)</span>
        </div>
        <div class="infra-info-slot" style="flex-shrink: 0; margin-top: 1px;"></div>
      </div>
      <div class="gauge-card-body-row">
        <div class="gauge-visual-box">
          ${this.renderSemiCircleGauge(
            this.data.ptAccessRatePct,
            0,
            100,
            `${this.data.ptAccessRatePct}%`,
            'Transit Access',
            '#0b57d0',
            '#dbeafe'
          )}
        </div>
        <div class="gauge-metrics-side">
          <div class="gauge-metric-tile">
            <span class="gauge-metric-label">Direct Road Access</span>
            <span class="gauge-metric-val">${this.data.roadAccessRatePct}%</span>
            <span class="gauge-metric-sub">31.7K assets connected</span>
          </div>
          <div class="gauge-metric-tile">
            <span class="gauge-metric-label">Total Mapped Assets</span>
            <span class="gauge-metric-val">${this.data.totalTourismAssets.toLocaleString()}</span>
            <span class="gauge-metric-sub">5.5K Core · 55.2K Supp.</span>
          </div>
        </div>
      </div>
    `;

    const infraSlot = infraCard.querySelector('.infra-info-slot');
    if (infraSlot) {
      const infoIcon = createInfoIcon({
        sourceOrg: 'Jabatan Kerja Raya (JKR) & Agensi Pengangkutan Awam Darat (APAD)',
        datasetName: 'National Tourism Spatial Infrastructure Index',
        referenceYear: '2025 / 2026',
        measure: 'Accessibility rate of tourism destinations to arterial road networks and scheduled public transport services.',
        formula: 'Transit Access Rate = (Assets within 3km of transit corridor / Total Assets) × 100',
        limitations: 'Measures spatial distance to transit infrastructure; frequency and peak delays excluded.',
      });
      infoIcon.style.flexShrink = '0';
      infoIcon.style.marginTop = '1px';
      infraSlot.replaceWith(infoIcon);
    }

    // 2. Environmental Sensitivity Card
    const envCard = document.createElement('div');
    envCard.className = 'economic-gauge-card';
    envCard.innerHTML = `
      <div class="gauge-card-header" style="display: flex; flex-direction: row; align-items: flex-start; justify-content: space-between; gap: 8px;">
        <div class="gauge-card-title-group" style="flex: 1; min-width: 0;">
          <h3 class="gauge-card-title">ENVIRONMENTAL SENSITIVITY</h3>
          <span class="gauge-card-subtitle">Asset exposure to protected conservation zones</span>
        </div>
        <div class="env-info-slot" style="flex-shrink: 0; margin-top: 1px;"></div>
      </div>
      <div class="gauge-card-body-row">
        <div class="gauge-visual-box">
          ${this.renderSemiCircleGauge(
            this.data.environmentalExposureRatePct,
            0,
            40,
            `${this.data.environmentalExposureRatePct}%`,
            'Eco-Exposure',
            '#059669',
            '#d1fae5'
          )}
        </div>
        <div class="gauge-metrics-side">
          <div class="gauge-metric-tile">
            <span class="gauge-metric-label">Terrestrial Protected</span>
            <span class="gauge-metric-val">${this.data.terrestrialExposureRatePct}%</span>
            <span class="gauge-metric-sub">Forest reserves & parks</span>
          </div>
          <div class="gauge-metric-tile">
            <span class="gauge-metric-label">Marine Protected</span>
            <span class="gauge-metric-val">${this.data.marineExposureRatePct}%</span>
            <span class="gauge-metric-sub">Islands & marine parks</span>
          </div>
        </div>
      </div>
    `;

    const envSlot = envCard.querySelector('.env-info-slot');
    if (envSlot) {
      const infoIcon = createInfoIcon({
        sourceOrg: 'Department of Wildlife and National Parks (PERHILITAN) & Department of Fisheries',
        datasetName: 'Gazetted Conservation Reserves & Sensitive Zone Exposure',
        referenceYear: '2025 / 2026',
        measure: 'Percentage of tourism inventory located in sensitive 5km buffer zones of national terrestrial and marine reserves.',
        formula: 'Eco-Exposure (%) = (Assets in 5km buffer / Total Assets) × 100',
        limitations: 'Spatial buffer analysis indicates exposure proximity, not actual ecological degradation.',
      });
      infoIcon.style.flexShrink = '0';
      infoIcon.style.marginTop = '1px';
      envSlot.replaceWith(infoIcon);
    }

    this.element.appendChild(infraCard);
    this.element.appendChild(envCard);
  }

  private renderSemiCircleGauge(
    value: number,
    min: number,
    max: number,
    centerValue: string,
    centerSub: string,
    strokeColor: string = '#0b57d0',
    trackColor: string = '#dbeafe'
  ): string {
    const radius = 54;
    const strokeWidth = 14;
    const cx = 75;
    const cy = 70;
    const circumference = Math.PI * radius; // ~169.6
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const strokeDash = ratio * circumference;
    const strokeDashoffset = circumference - strokeDash;

    return `
      <svg width="150" height="95" viewBox="0 0 150 95" style="overflow:visible;">
        <!-- Background Track -->
        <path
          d="M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}"
          fill="none"
          stroke="${trackColor}"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
        />
        <!-- Active Progress Arc -->
        <path
          d="M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}"
          fill="none"
          stroke="${strokeColor}"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${strokeDashoffset}"
          style="transition: stroke-dashoffset 0.8s ease;"
        />
        <!-- Range Labels -->
        <text x="${cx - radius - 2}" y="${cy + 16}" font-size="9" font-weight="700" fill="#64748b" text-anchor="middle">${min}%</text>
        <text x="${cx + radius + 2}" y="${cy + 16}" font-size="9" font-weight="700" fill="#64748b" text-anchor="middle">${max}%</text>

        <!-- Center Text -->
        <text x="${cx}" y="${cy - 8}" font-size="16" font-weight="900" fill="#0f172a" text-anchor="middle">${centerValue}</text>
        <text x="${cx}" y="${cy + 6}" font-size="8.5" font-weight="600" fill="#64748b" text-anchor="middle">${centerSub}</text>
      </svg>
    `;
  }
}

export { EconomicContributionCards as SpatialInfrastructureCards };

