import {
  getAllStateHealthcare,
  getStateHealthcare,
  type StateHealthcareData,
} from '../../data/healthcareData';
import { createInfoIcon } from '../Common/InfoTooltip';

export type AccessMode = 'primary' | 'emergency';

export class HealthcareAccessStackedBar {
  public readonly element: HTMLElement;
  private currentMode: AccessMode = 'primary';
  private selectedStateId: string | null = null;
  private onSelectStateCallback?: (stateId: string) => void;
  private tooltip!: HTMLElement;

  constructor(onSelectState?: (stateId: string) => void) {
    this.onSelectStateCallback = onSelectState;
    this.element = document.createElement('div');
    this.element.className = 'hc-card hc-access-card';

    this.createTooltip();
    this.render();
  }

  private createTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'hc-floating-tooltip';
    this.tooltip.style.display = 'none';
    document.body.appendChild(this.tooltip);

    this.element.addEventListener('mouseleave', () => this.hideTooltip());
  }

  public hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  public setSelectedState(stateId: string | null): void {
    this.selectedStateId = stateId;
    this.hideTooltip();
    this.renderBars();
    this.renderFooter();
  }

  private render(): void {
    this.element.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'hc-card-header';
    header.innerHTML = `
      <div class="hc-title-group">
        <div class="hc-badge-header">
          <span class="hc-badge-dot" style="background:#10b981;"></span>
          <span>SPATIAL BENCHMARK · 100% STACKED BAR</span>
        </div>
        <h3 class="hc-card-title">Tourism Asset Healthcare Access</h3>
        <span class="hc-card-desc">Share of tourism assets within defined proximity tiers by state</span>
      </div>
      <div class="hc-mode-toggle-group">
        <button type="button" class="hc-toggle-pill ${this.currentMode === 'primary' ? 'active' : ''}" data-mode="primary">
          Primary Care
        </button>
        <button type="button" class="hc-toggle-pill ${this.currentMode === 'emergency' ? 'active' : ''}" data-mode="emergency">
          Emergency Reach
        </button>
      </div>
    `;

    const accessH3 = header.querySelector('h3')!;
    const accessInfoIcon = createInfoIcon({
      sourceOrg: 'DOSM GeoPadang & MOH Facility Registry',
      datasetName: 'Tourism Asset Healthcare Access Tier Distribution',
      referenceYear: '2025',
      measure: '100% stacked bar showing % of tourism assets per state across 4 healthcare proximity tiers (Primary) or Emergency response reach zones.',
      formula: 'Tier % = (Assets in proximity tier / Total state assets) × 100; Primary: ≤2km, 2-5km, 5-10km, >10km',
      limitations: 'Straight-line proximity; actual travel time by road or terrain may be significantly longer in rural areas.',
    });
    accessInfoIcon.style.marginLeft = '6px';
    accessInfoIcon.style.verticalAlign = 'middle';
    accessH3.appendChild(accessInfoIcon);

    // Hook toggle buttons
    const primaryBtn = header.querySelector<HTMLButtonElement>('[data-mode="primary"]');
    const emergBtn = header.querySelector<HTMLButtonElement>('[data-mode="emergency"]');
    primaryBtn?.addEventListener('click', () => {
      if (this.currentMode !== 'primary') {
        this.currentMode = 'primary';
        primaryBtn.classList.add('active');
        emergBtn?.classList.remove('active');
        this.renderLegend();
        this.renderBars();
        this.renderFooter();
      }
    });
    emergBtn?.addEventListener('click', () => {
      if (this.currentMode !== 'emergency') {
        this.currentMode = 'emergency';
        emergBtn.classList.add('active');
        primaryBtn?.classList.remove('active');
        this.renderLegend();
        this.renderBars();
        this.renderFooter();
      }
    });

    this.element.appendChild(header);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'hc-stacked-legend';
    legend.id = 'hc-stacked-legend';
    this.element.appendChild(legend);

    // Bars container
    const barsContainer = document.createElement('div');
    barsContainer.className = 'hc-stacked-bars-wrap';
    barsContainer.id = 'hc-stacked-bars-wrap';
    this.element.appendChild(barsContainer);

    // Footer Strip
    const footer = document.createElement('div');
    footer.className = 'hc-access-footer-strip';
    footer.id = 'hc-access-footer-strip';
    this.element.appendChild(footer);

    this.renderLegend();
    this.renderBars();
    this.renderFooter();
  }

  private renderFooter(): void {
    const footerEl = this.element.querySelector('#hc-access-footer-strip');
    if (!footerEl) return;

    if (this.selectedStateId) {
      const st = getStateHealthcare(this.selectedStateId);
      if (st) {
        const tiers = this.currentMode === 'primary' ? st.primaryAccessTiers : st.emergencyAccessTiers;
        const modeLabel = this.currentMode === 'primary' ? '≤2km Primary' : '≤5km Emergency';
        footerEl.innerHTML = `
          <div class="hc-access-footer-row">
            <span class="hc-stat-k">${st.stateName} Reach:</span>
            <strong class="hc-stat-v" style="color:#059669;">${tiers.highPct.toFixed(1)}% High Access</strong>
            <span style="font-size:0.68rem; color:#64748b;">(${tiers.highCount} of ${st.coreTourismAssets} pts within ${modeLabel})</span>
          </div>
          <div class="hc-access-footer-row">
            <span class="hc-stat-k">Limited Access:</span>
            <strong class="hc-stat-v" style="color:#e11d48;">${tiers.limPct.toFixed(1)}%</strong>
            <span style="font-size:0.68rem; color:#64748b;">(${tiers.limCount} pts beyond ${this.currentMode === 'primary' ? '5km' : '15km'})</span>
          </div>
        `;
        return;
      }
    }

    // National default
    if (this.currentMode === 'primary') {
      footerEl.innerHTML = `
        <div class="hc-access-footer-row">
          <span class="hc-stat-k">National Benchmark:</span>
          <strong class="hc-stat-v" style="color:#059669;">KL &amp; Melaka leading (&gt;97% within ≤2km)</strong>
        </div>
        <div class="hc-access-footer-row">
          <span class="hc-stat-k">Focus Need:</span>
          <strong class="hc-stat-v" style="color:#e11d48;">Perlis &amp; Terengganu (&gt;33% limited reach)</strong>
        </div>
      `;
    } else {
      footerEl.innerHTML = `
        <div class="hc-access-footer-row">
          <span class="hc-stat-k">Emergency Reach:</span>
          <strong class="hc-stat-v" style="color:#059669;">KL &amp; Penang (100% within ≤5km of hospital)</strong>
        </div>
        <div class="hc-access-footer-row">
          <span class="hc-stat-k">Remote Regions:</span>
          <strong class="hc-stat-v" style="color:#e11d48;">Sabah &amp; Sarawak (&gt;45% &gt;15km)</strong>
        </div>
      `;
    }
  }

  private renderLegend(): void {
    const legendEl = this.element.querySelector('#hc-stacked-legend');
    if (!legendEl) return;

    if (this.currentMode === 'primary') {
      legendEl.innerHTML = `
        <div class="hc-legend-item">
          <span class="hc-legend-swatch" style="background:#10b981;"></span>
          <span class="hc-legend-label">High (≤2.0 km)</span>
        </div>
        <div class="hc-legend-item">
          <span class="hc-legend-swatch" style="background:#f59e0b;"></span>
          <span class="hc-legend-label">Moderate (2.0–5.0 km)</span>
        </div>
        <div class="hc-legend-item">
          <span class="hc-legend-swatch" style="background:#f43f5e;"></span>
          <span class="hc-legend-label">Limited (&gt;5.0 km)</span>
        </div>
      `;
    } else {
      legendEl.innerHTML = `
        <div class="hc-legend-item">
          <span class="hc-legend-swatch" style="background:#10b981;"></span>
          <span class="hc-legend-label">High (≤5.0 km)</span>
        </div>
        <div class="hc-legend-item">
          <span class="hc-legend-swatch" style="background:#f59e0b;"></span>
          <span class="hc-legend-label">Moderate (5.0–15.0 km)</span>
        </div>
        <div class="hc-legend-item">
          <span class="hc-legend-swatch" style="background:#f43f5e;"></span>
          <span class="hc-legend-label">Limited (&gt;15.0 km)</span>
        </div>
      `;
    }
  }

  private renderBars(): void {
    const container = this.element.querySelector('#hc-stacked-bars-wrap');
    if (!container) return;
    container.innerHTML = '';

    const states: StateHealthcareData[] = getAllStateHealthcare();

    // Sort by highPct descending
    states.sort((a, b) => {
      const aTier = this.currentMode === 'primary' ? a.primaryAccessTiers : a.emergencyAccessTiers;
      const bTier = this.currentMode === 'primary' ? b.primaryAccessTiers : b.emergencyAccessTiers;
      return bTier.highPct - aTier.highPct;
    });

    states.forEach((st) => {
      const isSelected = this.selectedStateId === st.stateId;
      const tiers = this.currentMode === 'primary' ? st.primaryAccessTiers : st.emergencyAccessTiers;

      const row = document.createElement('div');
      row.className = `hc-bar-row ${isSelected ? 'selected' : ''}`;
      row.setAttribute('data-state-id', st.stateId);

      // State label
      const labelCol = document.createElement('div');
      labelCol.className = 'hc-bar-state-label';
      labelCol.innerHTML = `
        <span class="hc-state-code">${st.code}</span>
        <span class="hc-state-name" title="${st.stateName}">${st.stateName}</span>
      `;

      // 100% Bar track
      const barTrack = document.createElement('div');
      barTrack.className = 'hc-stacked-bar-track';

      // High Segment
      const highSeg = document.createElement('div');
      highSeg.className = 'hc-bar-segment';
      highSeg.style.width = `${tiers.highPct}%`;
      highSeg.style.backgroundColor = '#10b981';
      if (tiers.highPct >= 12) {
        highSeg.innerHTML = `<span>${tiers.highPct.toFixed(0)}%</span>`;
      }
      this.attachTooltipHandlers(highSeg, st, 'High Access', tiers.highPct, tiers.highCount);

      // Moderate Segment
      const modSeg = document.createElement('div');
      modSeg.className = 'hc-bar-segment';
      modSeg.style.width = `${tiers.modPct}%`;
      modSeg.style.backgroundColor = '#f59e0b';
      if (tiers.modPct >= 12) {
        modSeg.innerHTML = `<span>${tiers.modPct.toFixed(0)}%</span>`;
      }
      this.attachTooltipHandlers(modSeg, st, 'Moderate Access', tiers.modPct, tiers.modCount);

      // Limited Segment
      const limSeg = document.createElement('div');
      limSeg.className = 'hc-bar-segment';
      limSeg.style.width = `${tiers.limPct}%`;
      limSeg.style.backgroundColor = '#f43f5e';
      if (tiers.limPct >= 12) {
        limSeg.innerHTML = `<span>${tiers.limPct.toFixed(0)}%</span>`;
      }
      this.attachTooltipHandlers(limSeg, st, 'Limited Access', tiers.limPct, tiers.limCount);

      barTrack.appendChild(highSeg);
      barTrack.appendChild(modSeg);
      barTrack.appendChild(limSeg);

      // Meta info (total assets)
      const metaCol = document.createElement('div');
      metaCol.className = 'hc-bar-meta-count';
      metaCol.textContent = `${st.coreTourismAssets} pts`;

      row.appendChild(labelCol);
      row.appendChild(barTrack);
      row.appendChild(metaCol);

      row.addEventListener('click', () => {
        if (this.onSelectStateCallback) {
          this.onSelectStateCallback(st.stateId);
        }
      });

      container.appendChild(row);
    });
  }

  private attachTooltipHandlers(
    el: HTMLElement,
    state: StateHealthcareData,
    tierName: string,
    pct: number,
    count: number
  ): void {
    const thresholdDesc =
      this.currentMode === 'primary'
        ? tierName.includes('High')
          ? '≤ 2.0 km to nearest clinic or hospital'
          : tierName.includes('Moderate')
          ? '2.0 – 5.0 km to nearest healthcare'
          : '> 5.0 km to nearest healthcare'
        : tierName.includes('High')
        ? '≤ 5.0 km to nearest hospital'
        : tierName.includes('Moderate')
        ? '5.0 – 15.0 km to nearest hospital'
        : '> 15.0 km to nearest hospital';

    el.addEventListener('mouseenter', (e) => {
      this.tooltip.innerHTML = `
        <div class="hc-tt-header">
          <strong>${state.stateName}</strong>
          <span class="hc-tt-badge">${tierName}</span>
        </div>
        <div class="hc-tt-body">
          <div class="hc-tt-row">
            <span>Tourism Share:</span>
            <strong>${pct.toFixed(1)}%</strong>
          </div>
          <div class="hc-tt-row">
            <span>Asset Count:</span>
            <strong>${count} of ${state.coreTourismAssets} destinations</strong>
          </div>
          <div class="hc-tt-row">
            <span>Catchment:</span>
            <span style="font-size:11px; color:#64748b;">${thresholdDesc}</span>
          </div>
        </div>
      `;
      this.tooltip.style.display = 'block';
      this.positionTooltip(e);
    });

    el.addEventListener('mousemove', (e) => this.positionTooltip(e));
    el.addEventListener('mouseleave', () => this.hideTooltip());
  }

  private positionTooltip(e: MouseEvent): void {
    if (!this.tooltip) return;
    const x = e.clientX + 14;
    const y = e.clientY + 14;
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }
}
