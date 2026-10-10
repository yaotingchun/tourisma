import type { AttractionItem } from '../../data/attractionsData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class AttractionProfileCard {
  public readonly element: HTMLElement;
  private currentAttraction: AttractionItem;

  constructor(initialAttraction: AttractionItem) {
    this.currentAttraction = initialAttraction;
    this.element = document.createElement('div');
    this.element.className = 'dest-card dest-profile-card';

    this.render();
  }

  public setAttraction(attraction: AttractionItem): void {
    this.currentAttraction = attraction;
    this.render();
  }

  private render(): void {
    const a = this.currentAttraction;

    this.element.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'dest-card-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'dest-card-title-group';
    titleGroup.innerHTML = `
      <div class="dest-card-badge">
        <span class="dest-badge-dot" style="background-color: #047857;"></span>
        <span>ATTRACTION DIAGNOSTIC PROFILE</span>
      </div>
      <h3 class="dest-card-title">Attraction Profile & Diagnostic</h3>
      <p class="dest-card-desc">Individual location characteristics & spatial readiness</p>
    `;

    const infoIcon = createInfoIcon({
      sourceOrg: 'Tourism Malaysia / MOTAC & National Spatial Data Infrastructure',
      datasetName: 'Core Tourist Attractions & Spatial Inventory Layers',
      referenceYear: '2025 / 2026',
      measure: 'Attraction identity, administrative district, thematic classification, and computed supply conditions.',
      limitations: 'Calculates physical supply readiness within spatial catchment; does not measure real-time gate footfall or crowd density.',
    });

    header.appendChild(titleGroup);
    header.appendChild(infoIcon);
    this.element.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'dest-profile-body';
    body.innerHTML = `
      <div class="dest-profile-hero">
        <div class="dest-profile-meta-tags">
          <span class="dest-profile-tag category">${a.category}</span>
          <span class="dest-profile-tag state">${a.stateName}</span>
          <span class="dest-profile-tag district">${a.district}</span>
        </div>
        <h2 class="dest-profile-name">${a.name}</h2>
      </div>

      <!-- Local Readiness Assessment Callout -->
      <div class="dest-readiness-assessment-box">
        <div class="dest-assessment-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0b57d0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
          <span class="dest-assessment-title">Local Readiness Assessment</span>
        </div>
        <p class="dest-assessment-text">"${a.readinessAssessment}"</p>
      </div>

      <!-- Destination Readiness Spatial Supply Grid (2x2) -->
      <div class="dest-profile-quick-stats">
        <div class="dest-quick-stat-card">
          <div class="dest-quick-stat-icon road">🚗</div>
          <div class="dest-quick-stat-info">
            <span class="dest-quick-stat-label">Road Access</span>
            <span class="dest-quick-stat-value">${a.readiness.roadDistanceText}</span>
            <span class="dest-quick-stat-tier high">${a.readiness.roadAccessTier}</span>
          </div>
        </div>

        <div class="dest-quick-stat-card">
          <div class="dest-quick-stat-icon hotel">🏨</div>
          <div class="dest-quick-stat-info">
            <span class="dest-quick-stat-label">Accommodation</span>
            <span class="dest-quick-stat-value">${a.readiness.nearbyAccommodationCount}</span>
            <span class="dest-quick-stat-tier mod">≤ 5 km cluster</span>
          </div>
        </div>

        <div class="dest-quick-stat-card">
          <div class="dest-quick-stat-icon health">🏥</div>
          <div class="dest-quick-stat-info">
            <span class="dest-quick-stat-label">Healthcare</span>
            <span class="dest-quick-stat-value">${a.readiness.nearestHealthcareKm} km</span>
            <span class="dest-quick-stat-tier ${a.readiness.healthcareStatus === 'Well-Served' ? 'high' : a.readiness.healthcareStatus === 'Moderate Distance' ? 'mod' : 'low'}">${a.readiness.healthcareStatus}</span>
          </div>
        </div>

        <div class="dest-quick-stat-card">
          <div class="dest-quick-stat-icon eco">🌿</div>
          <div class="dest-quick-stat-info">
            <span class="dest-quick-stat-label">Environment</span>
            <span class="dest-quick-stat-value">${a.readiness.distanceToSensitiveKm} km</span>
            <span class="dest-quick-stat-tier ${a.readiness.environmentTier.includes('Near') || a.readiness.environmentTier.includes('High') ? 'low' : 'high'}">${a.readiness.environmentTier}</span>
          </div>
        </div>
      </div>
    `;

    this.element.appendChild(body);
  }
}
