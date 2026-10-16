import {
  createElement,
  Route,
  Bus,
  Landmark,
  MapPin,
} from 'lucide';
import {
  ACCESSIBILITY_KPIS,
  STATE_ACCESSIBILITY_DATA,
  type StateAccessibilityItem,
} from '../../data/accessibilityData';
import { createInfoIcon } from '../Common/InfoTooltip';

interface AccessCardRef {
  valEl: HTMLElement;
  badgeEl: HTMLElement;
  subtextEl: HTMLElement;
  currentVal: number;
  animId?: number;
  isNumeric: boolean;
  format?: (v: number) => string;
}

interface AccessKpiConfig {
  title: string;
  icon: any;
  accentColor: string;
  iconBg: string;
  iconColor: string;
  initialVal: number | string;
  isNumeric: boolean;
  format?: (v: number) => string;
  getTargetVal: (state: StateAccessibilityItem | null) => number | string;
  getBadge: (state: StateAccessibilityItem | null) => { text: string; color: string };
  getSubtext: (state: StateAccessibilityItem | null) => string;
  tooltip: {
    sourceOrg: string;
    datasetName: string;
    referenceYear: string;
    measure: (state: StateAccessibilityItem | null) => string;
    formula: string;
    limitations: string;
  };
}

export class AccessibilityKpiRow {
  public readonly element: HTMLElement;
  private currentStateId: string | null = null;
  private cardRefs: AccessCardRef[] = [];
  private kpiConfigs: AccessKpiConfig[];

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'accessibility-kpi-grid';

    this.kpiConfigs = [
      {
        title: 'Road Access',
        icon: Route,
        accentColor: '#2563eb',
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        initialVal: ACCESSIBILITY_KPIS.roadAccessRate,
        isNumeric: true,
        format: (v: number) => `${v.toFixed(1)}%`,
        getTargetVal: (state) => (state ? state.road.goodPct : ACCESSIBILITY_KPIS.roadAccessRate),
        getBadge: (state) => ({
          text: state ? `${state.name} Road Connectivity` : 'Within 1 km of main road',
          color: 'blue',
        }),
        getSubtext: (state) =>
          state ? `${state.name} attractions ≤ 1 km of road` : ACCESSIBILITY_KPIS.roadAccessSubtext,
        tooltip: {
          sourceOrg: 'DOSM GeoPadang & Malaysia Road Network GIS',
          datasetName: 'Tourist Destination Road Accessibility Index',
          referenceYear: '2025',
          measure: (state) =>
            state
              ? `Road access rate for tourism assets in ${state.name}.`
              : 'Percentage of mapped tourism assets located within 1 km of a classified main road network.',
          formula: 'Road Access Rate = (Assets within 1 km of road / Total Assets) × 100',
          limitations: 'Captures proximity to roads, not actual road quality or travel time.',
        },
      },
      {
        title: 'Public Transport Access',
        icon: Bus,
        accentColor: '#059669',
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        initialVal: ACCESSIBILITY_KPIS.ptAccessRate,
        isNumeric: true,
        format: (v: number) => `${v.toFixed(1)}%`,
        getTargetVal: (state) => (state ? state.pt.goodPct : ACCESSIBILITY_KPIS.ptAccessRate),
        getBadge: (state) => ({
          text: state ? `${state.name} Transit Coverage` : 'Within 1 km of transit / bus',
          color: 'emerald',
        }),
        getSubtext: (state) =>
          state ? `${state.name} attractions within 1 km of transit` : ACCESSIBILITY_KPIS.ptAccessSubtext,
        tooltip: {
          sourceOrg: 'Prasarana Malaysia & MyRapid Open Data',
          datasetName: 'Public Transit Proximity to Tourism Assets',
          referenceYear: '2025',
          measure: () =>
            'Percentage of tourism assets within 1 km of a bus stop, LRT, MRT, or commuter rail station.',
          formula: 'PT Access Rate = (Assets within 1 km of transit / Total Assets) × 100',
          limitations: 'Service frequency and hours not factored in; rural areas underrepresented in transit data.',
        },
      },
      {
        title: 'Tourism Assets',
        icon: Landmark,
        accentColor: '#7c3aed',
        iconBg: '#f5f3ff',
        iconColor: '#7c3aed',
        initialVal: ACCESSIBILITY_KPIS.totalTourismAssets,
        isNumeric: true,
        format: (v: number) => Math.round(v).toLocaleString(),
        getTargetVal: (state) => (state ? state.coreAssets : ACCESSIBILITY_KPIS.totalTourismAssets),
        getBadge: (state) => ({
          text: state ? 'State Core Attractions' : '50 POI categories mapped',
          color: 'purple',
        }),
        getSubtext: (state) => (state ? `${state.name} mapped core attractions` : ACCESSIBILITY_KPIS.assetsSubtext),
        tooltip: {
          sourceOrg: 'DOSM & Tourism Malaysia POI Registry',
          datasetName: 'National Tourism Asset Spatial Inventory',
          referenceYear: '2025',
          measure: () =>
            'Total unique tourism point-of-interest (POI) assets geo-tagged across 50 categories nationally.',
          formula:
            'Sum of all unique tourism POIs across accommodation, F&B, culture, nature, and recreation categories',
          limitations: 'Informal or unregistered tourism spots may not be captured in the official registry.',
        },
      },
      {
        title: 'States Covered',
        icon: MapPin,
        accentColor: '#ea580c',
        iconBg: '#fff7ed',
        iconColor: '#ea580c',
        initialVal: `${ACCESSIBILITY_KPIS.statesCovered} States & FTs`,
        isNumeric: false,
        getTargetVal: (state) => (state ? state.name : `${ACCESSIBILITY_KPIS.statesCovered} States & FTs`),
        getBadge: (state) => ({
          text: state ? `${state.region} Region` : 'National spatial coverage',
          color: 'orange',
        }),
        getSubtext: (state) => (state ? 'Active state spatial scope' : ACCESSIBILITY_KPIS.statesSubtext),
        tooltip: {
          sourceOrg: 'DOSM Administrative Boundary GIS',
          datasetName: 'State & Federal Territory Coverage',
          referenceYear: '2025',
          measure: () =>
            'Number of Malaysian states and federal territories with complete spatial accessibility data coverage.',
          formula: 'Complete administrative state census',
          limitations: 'All 16 administrative units actively covered in Tourisma diagnostic models.',
        },
      },
    ];

    this.buildDom();
    requestAnimationFrame(() => this.animateToState());
  }

  public updateData(stateId: string | null): void {
    this.currentStateId = stateId;
    this.animateToState();
  }

  private resolveState(stateId: string | null): StateAccessibilityItem | null {
    if (!stateId) return null;
    const rawId = stateId.toLowerCase().trim();
    return (
      STATE_ACCESSIBILITY_DATA[rawId] ||
      Object.values(STATE_ACCESSIBILITY_DATA).find(
        (s) =>
          s.id.toLowerCase() === rawId ||
          s.code.toLowerCase() === rawId ||
          s.name.toLowerCase() === rawId
      ) ||
      null
    );
  }

  private buildDom(): void {
    this.element.innerHTML = '';
    this.cardRefs = [];

    this.kpiConfigs.forEach((cfg) => {
      const card = document.createElement('div');
      card.className = 'access-kpi-card';
      card.style.setProperty('--card-accent', cfg.accentColor);
      card.style.setProperty('--icon-bg', cfg.iconBg);
      card.style.setProperty('--icon-color', cfg.iconColor);

      // Info left
      const infoDiv = document.createElement('div');
      infoDiv.className = 'access-kpi-info';

      const titleEl = document.createElement('h4');
      titleEl.className = 'access-kpi-title';
      titleEl.textContent = cfg.title;

      const infoIcon = createInfoIcon({
        sourceOrg: cfg.tooltip.sourceOrg,
        datasetName: cfg.tooltip.datasetName,
        referenceYear: cfg.tooltip.referenceYear,
        measure: cfg.tooltip.measure(null),
        formula: cfg.tooltip.formula,
        limitations: cfg.tooltip.limitations,
      });
      infoIcon.style.marginLeft = '6px';
      infoIcon.style.verticalAlign = 'middle';
      titleEl.appendChild(infoIcon);

      const valWrap = document.createElement('div');
      valWrap.className = 'access-kpi-value-wrap';

      const valEl = document.createElement('span');
      valEl.className = 'access-kpi-value';
      valEl.textContent = cfg.isNumeric && cfg.format
        ? cfg.format(0)
        : String(cfg.initialVal);
      valWrap.appendChild(valEl);

      const badge = cfg.getBadge(null);
      const badgeEl = document.createElement('span');
      badgeEl.className = `access-kpi-badge ${badge.color}`;
      badgeEl.textContent = badge.text;
      valWrap.appendChild(badgeEl);

      const subEl = document.createElement('span');
      subEl.className = 'access-kpi-subtext';
      subEl.textContent = cfg.getSubtext(null);

      infoDiv.appendChild(titleEl);
      infoDiv.appendChild(valWrap);
      infoDiv.appendChild(subEl);

      // Icon right
      const iconWrap = document.createElement('div');
      iconWrap.className = 'access-kpi-icon-wrap';

      const iconSvg = createElement(cfg.icon, {
        width: 20,
        height: 20,
        'stroke-width': 2,
      });
      iconWrap.appendChild(iconSvg);

      card.appendChild(infoDiv);
      card.appendChild(iconWrap);
      this.element.appendChild(card);

      this.cardRefs.push({
        valEl,
        badgeEl,
        subtextEl: subEl,
        currentVal: 0,
        isNumeric: cfg.isNumeric,
        format: cfg.format,
      });
    });
  }

  private animateToState(): void {
    const state = this.resolveState(this.currentStateId);

    this.cardRefs.forEach((ref, idx) => {
      const cfg = this.kpiConfigs[idx];
      const targetVal = cfg.getTargetVal(state);

      // Update badge and subtext
      const badge = cfg.getBadge(state);
      ref.badgeEl.className = `access-kpi-badge ${badge.color}`;
      ref.badgeEl.textContent = badge.text;
      ref.subtextEl.textContent = cfg.getSubtext(state);

      if (ref.animId) {
        cancelAnimationFrame(ref.animId);
        ref.animId = undefined;
      }

      if (!ref.isNumeric || !ref.format) {
        ref.valEl.textContent = String(targetVal);
        return;
      }

      const startVal = ref.currentVal;
      const endVal = Number(targetVal);
      const duration = 650;
      const startTime = performance.now();

      if (startVal === endVal) {
        ref.valEl.textContent = ref.format(endVal);
        return;
      }

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = startVal + (endVal - startVal) * ease;
        ref.currentVal = current;
        ref.valEl.textContent = ref.format!(current);

        if (progress < 1) {
          ref.animId = requestAnimationFrame(step);
        } else {
          ref.currentVal = endVal;
          ref.valEl.textContent = ref.format!(endVal);
          ref.animId = undefined;
        }
      };

      ref.animId = requestAnimationFrame(step);
    });
  }
}
