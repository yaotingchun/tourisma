import type { AttractionItem } from '../../data/attractionsData';
import { createInfoIcon } from '../Common/InfoTooltip';

interface QuickStatRef {
  el: HTMLElement;
  currentVal: number;
  startVal: number;
  targetVal: number;
  format: (v: number) => string;
}

export class AttractionProfileCard {
  public readonly element: HTMLElement;
  private currentAttraction: AttractionItem;
  private statRefs: QuickStatRef[] = [];
  private animId?: number;

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
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = undefined;
    }

    const prevValues = this.statRefs.map((r) => r.currentVal);
    this.statRefs = [];

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
            <span class="dest-quick-stat-value quick-stat-road">0.0 km</span>
            <span class="dest-quick-stat-tier high">${a.readiness.roadAccessTier}</span>
          </div>
        </div>

        <div class="dest-quick-stat-card">
          <div class="dest-quick-stat-icon hotel">🏨</div>
          <div class="dest-quick-stat-info">
            <span class="dest-quick-stat-label">Accommodation</span>
            <span class="dest-quick-stat-value quick-stat-hotel">0</span>
            <span class="dest-quick-stat-tier mod">≤ 5 km cluster</span>
          </div>
        </div>

        <div class="dest-quick-stat-card">
          <div class="dest-quick-stat-icon health">🏥</div>
          <div class="dest-quick-stat-info">
            <span class="dest-quick-stat-label">Healthcare</span>
            <span class="dest-quick-stat-value quick-stat-health">0.0 km</span>
            <span class="dest-quick-stat-tier ${a.readiness.healthcareStatus === 'Well-Served' ? 'high' : a.readiness.healthcareStatus === 'Moderate Distance' ? 'mod' : 'low'}">${a.readiness.healthcareStatus}</span>
          </div>
        </div>

        <div class="dest-quick-stat-card">
          <div class="dest-quick-stat-icon eco">🌿</div>
          <div class="dest-quick-stat-info">
            <span class="dest-quick-stat-label">Environment</span>
            <span class="dest-quick-stat-value quick-stat-eco">0.0 km</span>
            <span class="dest-quick-stat-tier ${a.readiness.environmentTier.includes('Near') || a.readiness.environmentTier.includes('High') ? 'low' : 'high'}">${a.readiness.environmentTier}</span>
          </div>
        </div>
      </div>
    `;

    this.element.appendChild(body);

    // Setup animated refs
    const roadNum = parseFloat(a.readiness.roadDistanceText) || 0;
    const hotelNum = a.readiness.nearbyAccommodationCount || 0;
    const healthNum = a.readiness.nearestHealthcareKm || 0;
    const ecoNum = a.readiness.distanceToSensitiveKm || 0;

    const targets = [
      { sel: '.quick-stat-road', target: roadNum, format: (v: number) => `${v.toFixed(1)} km` },
      { sel: '.quick-stat-hotel', target: hotelNum, format: (v: number) => Math.round(v).toLocaleString() },
      { sel: '.quick-stat-health', target: healthNum, format: (v: number) => `${v.toFixed(1)} km` },
      { sel: '.quick-stat-eco', target: ecoNum, format: (v: number) => `${v.toFixed(1)} km` },
    ];

    targets.forEach((t, i) => {
      const el = body.querySelector(t.sel) as HTMLElement;
      if (el) {
        const prev = prevValues[i] ?? 0;
        el.textContent = t.format(prev);
        this.statRefs.push({
          el,
          currentVal: prev,
          startVal: prev,
          targetVal: t.target,
          format: t.format,
        });
      }
    });

    requestAnimationFrame(() => this.animateStats());
  }

  private animateStats(): void {
    const duration = 650;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.statRefs.forEach((ref) => {
        const cur = ref.startVal + (ref.targetVal - ref.startVal) * ease;
        ref.currentVal = cur;
        ref.el.textContent = ref.format(cur);
      });

      if (progress < 1) {
        this.animId = requestAnimationFrame(step);
      } else {
        this.statRefs.forEach((ref) => {
          ref.currentVal = ref.targetVal;
          ref.el.textContent = ref.format(ref.targetVal);
        });
        this.animId = undefined;
      }
    };

    this.animId = requestAnimationFrame(step);
  }
}
