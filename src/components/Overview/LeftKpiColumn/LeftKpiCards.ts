import { NATIONAL_OVERVIEW_KPIS, type KpiCardConfig } from '../../../data/overviewData';
import { createInfoIcon } from '../../Common/InfoTooltip';

const OVERVIEW_KPI_TOOLTIPS: Record<string, any> = {
  kpi_domestic: {
    sourceOrg: 'Department of Statistics Malaysia (DOSM)',
    datasetName: 'Domestic Tourism Survey (DTS)',
    referenceYear: '2025',
    measure: 'Total domestic visitor arrivals including excursionists and overnight tourists across Malaysia.',
    formula: 'Sum of all intra-state and inter-state domestic trips',
    limitations: 'Excludes daily local commuting for work or routine education.',
  },
  kpi_international: {
    sourceOrg: 'Tourism Malaysia & Immigration Department of Malaysia',
    datasetName: 'Tourist Arrivals & Inbound Border Statistics',
    referenceYear: '2025',
    measure: 'Foreign tourist arrivals through air, land, and sea immigration checkpoints.',
    formula: 'Passport entries recorded at national international borders',
    limitations: 'Transit passengers not leaving airport terminals are excluded.',
  },
  kpi_receipts: {
    sourceOrg: 'Tourism Malaysia & DOSM Tourism Satellite Accounts',
    datasetName: 'Tourism Direct Expenditure & Satellite Account (TSA)',
    referenceYear: '2025',
    measure: 'Gross direct tourism expenditure generated across accommodation, F&B, retail, and transport.',
    formula: 'Domestic Visitor Expenditure + International Tourist Receipts',
    limitations: 'Excludes indirect multiplier effects; measures direct expenditure only.',
  },
  kpi_gdp: {
    sourceOrg: 'Department of Statistics Malaysia (DOSM)',
    datasetName: 'Tourism Satellite Account (TSA) National Accounts',
    referenceYear: '2025',
    measure: 'Gross Value Added of Tourism Industries (GVATI) as a percentage of National GDP.',
    formula: '(Tourism Direct Gross Value Added / National GDP) × 100',
    limitations: 'Based on official annual TSA releases; subject to benchmark national accounts revisions.',
  },
};

export class LeftKpiCards {
  public readonly element: HTMLElement;
  private kpis: KpiCardConfig[];

  constructor(kpis: KpiCardConfig[] = NATIONAL_OVERVIEW_KPIS) {
    this.element = document.createElement('div');
    this.element.className = 'left-kpi-column-stack';
    this.kpis = kpis;
    this.render();
  }

  public updateData(kpis: KpiCardConfig[]): void {
    this.kpis = kpis;
    this.render();
  }

  private render(): void {
    this.element.innerHTML = '';

    this.kpis.forEach((kpi) => {
      const card = document.createElement('div');
      card.className = 'vertical-kpi-card';
      if (kpi.tooltipNote) {
        card.setAttribute('title', kpi.tooltipNote);
      }

      const ttConfig = OVERVIEW_KPI_TOOLTIPS[kpi.id] || {
        sourceOrg: 'Department of Statistics Malaysia (DOSM)',
        datasetName: kpi.title,
        referenceYear: '2025',
        measure: kpi.title,
      };

      card.innerHTML = `
        <div class="kpi-card-left-content">
          <div class="kpi-icon-bubble">
            ${kpi.iconSvg}
          </div>
          <div class="kpi-data-meta">
            <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
              <span class="kpi-title-label">${kpi.title}</span>
              <div class="kpi-info-slot"></div>
            </div>
            <div class="kpi-main-val">${kpi.value}</div>
            <div class="kpi-trend-note">
              ${kpi.unitSubtitle ? `<span style="color:#64748b; margin-right:4px;">${kpi.unitSubtitle}</span>` : ''}
              <span class="${kpi.isPositive ? 'trend-green-text' : 'trend-red-text'}">${kpi.change}</span>
            </div>
          </div>
        </div>
        <div class="kpi-sparkline-box">
          ${this.renderSparklineSvg(kpi.sparkline)}
        </div>
      `;

      const slot = card.querySelector('.kpi-info-slot');
      if (slot) {
        const infoIcon = createInfoIcon(ttConfig);
        slot.replaceWith(infoIcon);
      }

      this.element.appendChild(card);
    });
  }

  private renderSparklineSvg(points: number[]): string {
    if (!points || points.length === 0) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 80;
    const height = 36;
    const padding = 4;

    const coords = points.map((p, i) => {
      const x = padding + (i / (points.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((p - min) / range) * (height - 2 * padding);
      return { x, y };
    });

    // Build smooth cubic bezier curve
    let d = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
    }

    const fillD = `${d} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;

    const gradId = `kpi_grad_${Math.random().toString(36).substring(2, 7)}`;

    return `
      <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow:visible;">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0b57d0" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#0b57d0" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <path d="${fillD}" fill="url(#${gradId})" />
        <path d="${d}" fill="none" stroke="#0b57d0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${coords[coords.length - 1].x}" cy="${coords[coords.length - 1].y}" r="3" fill="#0b57d0" />
      </svg>
    `;
  }
}
