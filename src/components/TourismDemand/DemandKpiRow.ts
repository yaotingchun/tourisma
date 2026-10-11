import {
  createElement,
  Users,
  Banknote,
  CalendarDays,
  TrendingUp,
} from 'lucide';
import { createInfoIcon } from '../Common/InfoTooltip';
import { STATES_OVERVIEW_DATA, type StateOverviewItem } from '../../data/overviewData';

interface DemandCardRef {
  valEl: HTMLElement;
  trendEl: HTMLElement;
  subtextEl: HTMLElement;
  currentVal: number;
  animId?: number;
  format: (v: number) => string;
}

interface KpiConfig {
  title: string;
  icon: any;
  accentColor: string;
  iconBg: string;
  iconColor: string;
  initialVal: number;
  format: (v: number) => string;
  getTargetVal: (state: StateOverviewItem | null) => number;
  getTrend: (state: StateOverviewItem | null) => { text: string; title: string };
  getSubtext: (state: StateOverviewItem | null) => string;
  tooltip: {
    sourceOrg: string;
    datasetName: string;
    referenceYear: string;
    measure: (state: StateOverviewItem | null) => string;
    formula: string;
    limitations: string;
  };
}

export class DemandKpiRow {
  public readonly element: HTMLElement;
  private currentStateId: string | null = null;
  private cardRefs: DemandCardRef[] = [];
  private kpiConfigs: KpiConfig[];

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'demand-kpi-grid';

    this.kpiConfigs = [
      {
        title: 'DOMESTIC VISITORS',
        icon: Users,
        accentColor: '#2563eb',
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        initialVal: 290.1,
        format: (v: number) => `${v.toFixed(1)}M`,
        getTargetVal: (state) => (state ? state.domesticVisitorsM : 290.1),
        getTrend: (state) => ({
          text: state ? `▲ ${(state.domesticVisitorsM > 15 ? '+12.4%' : '+8.6%')} vs 2024` : '+11.5% vs 2024',
          title: state ? `Annual trips recorded in ${state.name}` : '+11.5% YoY growth from 260.1M trips in 2024',
        }),
        getSubtext: (state) => (state ? `${state.name} domestic tourist trips` : 'Annual domestic tourist trips'),
        tooltip: {
          sourceOrg: 'Department of Statistics Malaysia (DOSM)',
          datasetName: 'Domestic Tourism Survey (DTS)',
          referenceYear: '2025',
          measure: (state) =>
            state
              ? `Domestic visitor trips for ${state.name}.`
              : 'Total domestic visitor trips undertaken across Malaysian states and federal territories.',
          formula: 'Annual aggregate of domestic excursionists (same-day) and overnight tourists',
          limitations: 'Excludes daily routine commuting for work, school, and border transit.',
        },
      },
      {
        title: 'TOURLISM EXPENDITURE',
        icon: Banknote,
        accentColor: '#059669',
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        initialVal: 121.3,
        format: (v: number) => `RM ${v.toFixed(1)}B`,
        getTargetVal: (state) => (state ? state.receiptsRmB : 121.3),
        getTrend: (state) => ({
          text: state ? `▲ ${(state.receiptsRmB > 10 ? '+14.1%' : '+9.2%')} vs 2024` : '+13.6% vs 2024',
          title: state ? `Expenditure receipts in ${state.name}` : '+13.6% YoY growth from RM 106.7B in 2024',
        }),
        getSubtext: (state) => (state ? `${state.name} visitor receipts` : 'Total domestic visitor receipts'),
        tooltip: {
          sourceOrg: 'Department of Statistics Malaysia (DOSM)',
          datasetName: 'Domestic Tourism Expenditure Survey',
          referenceYear: '2025',
          measure: () =>
            'Gross spending by domestic visitors across shopping, F&B, automotive fuel, accommodation, and activities.',
          formula: 'Sum of all domestic visitor expenditure categories',
          limitations: 'Direct consumption expenditure only; excludes capital investments.',
        },
      },
      {
        title: 'AVG. LENGTH OF STAY',
        icon: CalendarDays,
        accentColor: '#7c3aed',
        iconBg: '#f5f3ff',
        iconColor: '#7c3aed',
        initialVal: 2.56,
        format: (v: number) => `${v.toFixed(2)} nights`,
        getTargetVal: (state) => (state ? state.alos : 2.56),
        getTrend: (state) => ({
          text: state ? (state.alos >= 2.5 ? '+3.8% vs 2024' : '+1.6% vs 2024') : '+3.2% vs 2024',
          title: state ? `Average trip duration in ${state.name}` : '+0.08 nights (+3.2%) from 2.48 nights in 2024',
        }),
        getSubtext: (state) => (state ? `${state.name} average trip duration` : 'National weighted trip duration'),
        tooltip: {
          sourceOrg: 'Tourism Malaysia & DOSM DTS',
          datasetName: 'Domestic Tourism Trip Characteristics',
          referenceYear: '2025',
          measure: () => 'Weighted average number of nights spent per domestic overnight tourist trip.',
          formula: 'Total Overnight Nights / Total Overnight Trips',
          limitations: 'Calculated exclusively for overnight tourists; excludes same-day excursionists (0 nights).',
        },
      },
      {
        title: 'AVG. SPEND PER TRIP',
        icon: TrendingUp,
        accentColor: '#ea580c',
        iconBg: '#fff7ed',
        iconColor: '#ea580c',
        initialVal: 418,
        format: (v: number) => `RM ${Math.round(v)}`,
        getTargetVal: (state) => (state ? state.receiptsPerVisitor : 418),
        getTrend: () => ({
          text: '+2.2% vs 2024',
          title: '+1.9% YoY growth from RM 410 per trip in 2024',
        }),
        getSubtext: (state) => (state ? `${state.name} spending yield` : 'Average spending yield per visitor'),
        tooltip: {
          sourceOrg: 'Department of Statistics Malaysia (DOSM)',
          datasetName: 'Domestic Tourism Expenditure Yield',
          referenceYear: '2025',
          measure: () => 'Average total expenditure incurred per visitor per domestic travel trip.',
          formula: 'Total Domestic Expenditure / Total Domestic Visitors',
          limitations: 'Reflects nominal mean expenditure; median spend is lower in rural destinations.',
        },
      },
    ];

    this.buildDom();
  }

  public updateData(stateId: string | null): void {
    this.currentStateId = stateId;
    this.animateToState();
  }

  private resolveState(stateId: string | null): StateOverviewItem | null {
    if (!stateId) return null;
    const rawId = stateId.toLowerCase().trim();
    return (
      STATES_OVERVIEW_DATA[rawId] ||
      Object.values(STATES_OVERVIEW_DATA).find(
        (s) =>
          s.id.toLowerCase() === rawId ||
          s.code.toLowerCase() === rawId ||
          s.name.toLowerCase() === rawId ||
          s.shortName.toLowerCase() === rawId ||
          (rawId === 'png' && s.id === 'penang') ||
          (rawId === 'pls' && s.id === 'perlis') ||
          (rawId === 'pjy' && s.id === 'putrajaya') ||
          (rawId === 'lbn' && s.id === 'labuan') ||
          (rawId === 'kul' && s.id === 'kuala_lumpur')
      ) ||
      null
    );
  }

  private buildDom(): void {
    this.element.innerHTML = '';
    this.cardRefs = [];

    this.kpiConfigs.forEach((cfg) => {
      const card = document.createElement('div');
      card.className = 'demand-kpi-card';
      card.style.setProperty('--card-accent', cfg.accentColor);
      card.style.setProperty('--icon-bg', cfg.iconBg);
      card.style.setProperty('--icon-color', cfg.iconColor);

      // Info left
      const infoDiv = document.createElement('div');
      infoDiv.className = 'demand-kpi-info';

      const titleRow = document.createElement('div');
      titleRow.style.display = 'flex';
      titleRow.style.alignItems = 'center';
      titleRow.style.justifyContent = 'space-between';
      titleRow.style.width = '100%';

      const titleEl = document.createElement('h4');
      titleEl.className = 'demand-kpi-label';
      titleEl.textContent = cfg.title;

      const infoIcon = createInfoIcon({
        sourceOrg: cfg.tooltip.sourceOrg,
        datasetName: cfg.tooltip.datasetName,
        referenceYear: cfg.tooltip.referenceYear,
        measure: cfg.tooltip.measure(null),
        formula: cfg.tooltip.formula,
        limitations: cfg.tooltip.limitations,
      });

      titleRow.appendChild(titleEl);
      titleRow.appendChild(infoIcon);

      const valRow = document.createElement('div');
      valRow.className = 'demand-kpi-value-wrap';

      const valEl = document.createElement('span');
      valEl.className = 'demand-kpi-value';
      valEl.textContent = cfg.format(cfg.initialVal);
      valRow.appendChild(valEl);

      const trend = cfg.getTrend(null);
      const trendEl = document.createElement('span');
      trendEl.className = 'demand-kpi-trend positive';
      trendEl.textContent = trend.text;
      trendEl.title = trend.title;
      valRow.appendChild(trendEl);

      const subEl = document.createElement('span');
      subEl.className = 'demand-kpi-subtext';
      subEl.textContent = cfg.getSubtext(null);

      infoDiv.appendChild(titleRow);
      infoDiv.appendChild(valRow);
      infoDiv.appendChild(subEl);

      // Icon right
      const iconWrap = document.createElement('div');
      iconWrap.className = 'demand-kpi-icon-wrap';

      const iconSvg = createElement(cfg.icon, {
        width: 22,
        height: 22,
        'stroke-width': 2,
      });

      iconWrap.appendChild(iconSvg);

      card.appendChild(infoDiv);
      card.appendChild(iconWrap);
      this.element.appendChild(card);

      this.cardRefs.push({
        valEl,
        trendEl,
        subtextEl: subEl,
        currentVal: cfg.initialVal,
        format: cfg.format,
      });
    });
  }

  private animateToState(): void {
    const state = this.resolveState(this.currentStateId);

    this.cardRefs.forEach((ref, idx) => {
      const cfg = this.kpiConfigs[idx];
      const targetVal = cfg.getTargetVal(state);

      // Update Trend and Subtext text
      const trend = cfg.getTrend(state);
      ref.trendEl.textContent = trend.text;
      ref.trendEl.title = trend.title;
      ref.subtextEl.textContent = cfg.getSubtext(state);

      // Cancel ongoing animation on this card
      if (ref.animId) {
        cancelAnimationFrame(ref.animId);
        ref.animId = undefined;
      }

      // Smooth count-up / count-down number rolling animation
      const startVal = ref.currentVal;
      const endVal = targetVal;
      const duration = 650; // ms
      const startTime = performance.now();

      if (startVal === endVal) {
        ref.valEl.textContent = ref.format(endVal);
        return;
      }

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutCubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = startVal + (endVal - startVal) * ease;
        ref.valEl.textContent = ref.format(current);

        if (progress < 1) {
          ref.animId = requestAnimationFrame(step);
        } else {
          ref.valEl.textContent = ref.format(endVal);
          ref.animId = undefined;
        }
      };

      ref.animId = requestAnimationFrame(step);
      ref.currentVal = endVal;
    });
  }
}
