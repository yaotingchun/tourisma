import type { AttractionItem } from '../../data/attractionsData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class LocalDiagnosticCard {
  public readonly element: HTMLElement;
  private currentAttraction: AttractionItem;

  constructor(initialAttraction: AttractionItem) {
    this.currentAttraction = initialAttraction;
    this.element = document.createElement('div');
    this.element.className = 'dest-card dest-diagnostic-card';

    this.render();
  }

  public setAttraction(attraction: AttractionItem): void {
    this.currentAttraction = attraction;
    this.render();
  }

  private render(): void {
    const a = this.currentAttraction;
    const diag = a.diagnostic;

    this.element.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'dest-card-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'dest-card-title-group';
    titleGroup.innerHTML = `
      <div class="dest-card-badge">
        <span class="dest-badge-dot" style="background-color: #6366f1;"></span>
        <span>DEFENSIBLE PROXY EVALUATION</span>
      </div>
      <h3 class="dest-card-title">LOCAL DESTINATION DIAGNOSTIC</h3>
      <p class="dest-card-desc">Local Infrastructure Pressure Proxy based on observable physical supply conditions, not visitor counts</p>
    `;

    const infoIcon = createInfoIcon({
      sourceOrg: 'Tourisma Spatial Diagnostic Engine & Multi-Agency Registries',
      datasetName: 'Local Infrastructure Pressure Proxy Framework',
      referenceYear: '2025 / 2026',
      measure: 'Disaggregated operational readiness indicators across 4 critical supply & environmental vectors.',
      formula: 'Discrete Diagnostic Tiering based on physical distance and spatial density thresholds',
      limitations: 'Measures observable physical supply and spatial proximity, not visitor counts or congestion.',
    });

    header.appendChild(titleGroup);
    header.appendChild(infoIcon);
    this.element.appendChild(header);

    // Diagnostic Rows Table (4 Disaggregated Supply Indicators)
    const tableWrap = document.createElement('div');
    tableWrap.className = 'dest-diagnostic-table';
    tableWrap.innerHTML = `
      <!-- Infrastructure -->
      <div class="dest-diagnostic-row">
        <div class="dest-diagnostic-dim">
          <span class="dest-dim-name">Infrastructure</span>
          <span class="dest-dim-sub">Lodging & commercial F&B</span>
        </div>
        <div class="dest-diagnostic-status">
          <span class="dest-status-pill" style="background-color: ${diag.infrastructure.iconBg}; color: ${diag.infrastructure.color}; border: 1px solid ${diag.infrastructure.color}40;">
            ${diag.infrastructure.badge}
          </span>
        </div>
        <div class="dest-diagnostic-note">
          ${diag.infrastructure.note}
        </div>
      </div>

      <!-- Accessibility -->
      <div class="dest-diagnostic-row">
        <div class="dest-diagnostic-dim">
          <span class="dest-dim-name">Accessibility</span>
          <span class="dest-dim-sub">Road & transit ingress</span>
        </div>
        <div class="dest-diagnostic-status">
          <span class="dest-status-pill" style="background-color: ${diag.accessibility.iconBg}; color: ${diag.accessibility.color}; border: 1px solid ${diag.accessibility.color}40;">
            ${diag.accessibility.badge}
          </span>
        </div>
        <div class="dest-diagnostic-note">
          ${diag.accessibility.note}
        </div>
      </div>

      <!-- Healthcare -->
      <div class="dest-diagnostic-row">
        <div class="dest-diagnostic-dim">
          <span class="dest-dim-name">Healthcare</span>
          <span class="dest-dim-sub">Emergency clinical access</span>
        </div>
        <div class="dest-diagnostic-status">
          <span class="dest-status-pill" style="background-color: ${diag.healthcare.iconBg}; color: ${diag.healthcare.color}; border: 1px solid ${diag.healthcare.color}40;">
            ${diag.healthcare.badge}
          </span>
        </div>
        <div class="dest-diagnostic-note">
          ${diag.healthcare.note}
        </div>
      </div>

      <!-- Environment -->
      <div class="dest-diagnostic-row">
        <div class="dest-diagnostic-dim">
          <span class="dest-dim-name">Environment</span>
          <span class="dest-dim-sub">Protected reserve buffer</span>
        </div>
        <div class="dest-diagnostic-status">
          <span class="dest-status-pill" style="background-color: ${diag.environment.iconBg}; color: ${diag.environment.color}; border: 1px solid ${diag.environment.color}40;">
            ${diag.environment.badge}
          </span>
        </div>
        <div class="dest-diagnostic-note">
          ${diag.environment.note}
        </div>
      </div>
    `;

    this.element.appendChild(tableWrap);
  }
}
