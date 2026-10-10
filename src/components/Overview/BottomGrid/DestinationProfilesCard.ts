import { DESTINATION_PROFILES_DATA, type QuadrantProfileSummary } from '../../../data/overviewData';
import { createInfoIcon } from '../../Common/InfoTooltip';

export class DestinationProfilesCard {
  public readonly element: HTMLElement;
  private profiles: QuadrantProfileSummary[];

  constructor(profiles: QuadrantProfileSummary[] = DESTINATION_PROFILES_DATA) {
    this.element = document.createElement('div');
    this.element.className = 'bottom-insight-card';
    this.profiles = profiles;
    this.render();
  }

  public updateData(profiles: QuadrantProfileSummary[]): void {
    this.profiles = profiles;
    this.render();
  }

  private render(): void {
    const listHtml = this.profiles.map((p) => `
      <div class="profile-cluster-row" title="${p.states.join(', ')}">
        <div class="profile-header-line">
          <span class="profile-cluster-title">
            <span class="cluster-dot ${p.colorClass}"></span>
            ${p.label}
          </span>
          <span class="profile-cluster-pct">${p.percentage}%</span>
        </div>
        <div class="profile-track">
          <div class="profile-fill ${p.colorClass}" style="width: ${p.percentage}%;"></div>
        </div>
      </div>
    `).join('');

    this.element.innerHTML = `
      <div class="bottom-card-header flex-between" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
        <div>
          <h3 class="bottom-card-title">DESTINATION READINESS PROFILES</h3>
          <span class="bottom-card-subtitle">Cluster distribution of states (16 states)</span>
        </div>
        <div class="profiles-info-slot"></div>
      </div>
      <div class="bottom-card-list">
        ${listHtml}
      </div>
    `;

    const infoSlot = this.element.querySelector('.profiles-info-slot');
    if (infoSlot) {
      const infoIcon = createInfoIcon({
        sourceOrg: 'Tourisma National Spatial Diagnostics & State Master Index',
        datasetName: 'State Readiness & Demand Portfolio Quadrants',
        referenceYear: '2025 / 2026',
        measure: 'Grouping of all 16 states into 4 strategic readiness quadrants based on demand volume vs. supply capacity.',
        formula: 'Four-quadrant matrix based on national median visitor volume and readiness scores',
        limitations: 'Macro state categorization intended for national prioritization; municipal variations exist.',
      });
      infoSlot.replaceWith(infoIcon);
    }
  }
}
