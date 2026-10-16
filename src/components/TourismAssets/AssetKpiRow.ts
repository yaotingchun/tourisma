import {
  createElement,
  Landmark,
  Layers,
  Shapes,
  MapPin,
} from 'lucide';
import {
  TOURISM_ASSETS_KPIS,
  STATE_ASSET_MIX_DATA,
  type StateAssetMixItem,
} from '../../data/tourismAssetsData';
import { createInfoIcon } from '../Common/InfoTooltip';

interface AssetCardRef {
  valEl: HTMLElement;
  subtextEl: HTMLElement;
  currentVal: number;
  animId?: number;
  isNumeric: boolean;
  format?: (v: number) => string;
}

interface AssetKpiConfig {
  title: string;
  icon: any;
  accentColor: string;
  iconBg: string;
  iconColor: string;
  initialVal: number | string;
  isNumeric: boolean;
  format?: (v: number) => string;
  getTargetVal: (state: StateAssetMixItem | null) => number | string;
  getSubtext: (state: StateAssetMixItem | null) => string;
  tooltip: {
    sourceOrg: string;
    datasetName: string;
    referenceYear: string;
    measure: (state: StateAssetMixItem | null) => string;
    formula: string;
    limitations: string;
  };
}

export class AssetKpiRow {
  public readonly element: HTMLElement;
  private currentStateId: string | null = null;
  private cardRefs: AssetCardRef[] = [];
  private kpiConfigs: AssetKpiConfig[];

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'assets-kpi-grid';

    this.kpiConfigs = [
      {
        title: 'Core Tourism Assets',
        icon: Landmark,
        accentColor: '#2563eb',
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        initialVal: TOURISM_ASSETS_KPIS.coreAssetsCount,
        isNumeric: true,
        format: (v: number) => Math.round(v).toLocaleString(),
        getTargetVal: (state) => (state ? state.totalCore : TOURISM_ASSETS_KPIS.coreAssetsCount),
        getSubtext: (state) => (state ? `${state.name} primary attractions` : 'Main attractions & heritage sites'),
        tooltip: {
          sourceOrg: 'Ministry of Tourism, Arts and Culture (MOTAC) & State Tourism Boards',
          datasetName: 'National Core Tourism Attraction Inventory',
          referenceYear: '2025 / 2026',
          measure: (state) =>
            state
              ? `Core tourism assets in ${state.name}.`
              : 'Count of gazetted and recognized primary attractions across nature, culture, theme parks, and heritage.',
          formula: 'Sum of verified point-of-interest (POI) records classified as primary tourism destinations',
          limitations: 'Excludes auxiliary commercial services; focused on primary destination demand anchors.',
        },
      },
      {
        title: 'Supporting Assets',
        icon: Layers,
        accentColor: '#059669',
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        initialVal: TOURISM_ASSETS_KPIS.supportingAssetsCount,
        isNumeric: true,
        format: (v: number) => Math.round(v).toLocaleString(),
        getTargetVal: (state) => (state ? state.totalSupporting : TOURISM_ASSETS_KPIS.supportingAssetsCount),
        getSubtext: (state) => (state ? `${state.name} enabling services` : 'F&B, transit, lodging & healthcare'),
        tooltip: {
          sourceOrg: 'OpenStreetMap, DOSM Business Register & Local Authorities',
          datasetName: 'Tourism Enabling & Secondary Infrastructure Inventory',
          referenceYear: '2025 / 2026',
          measure: () =>
            'Spatial points of interest that support visitor stays including registered restaurants, retail hubs, transit nodes, and clinics.',
          formula: 'Sum of supporting hospitality, mobility, and amenity points within 5km of core attractions',
          limitations: 'Continuously updated through geospatial verification and registry cross-matching.',
        },
      },
      {
        title: 'Asset Categories',
        icon: Shapes,
        accentColor: '#7c3aed',
        iconBg: '#f5f3ff',
        iconColor: '#7c3aed',
        initialVal: `${TOURISM_ASSETS_KPIS.categoryCount} Groups`,
        isNumeric: false,
        getTargetVal: (state) =>
          state ? `${state.coreMix.length} Core Types` : `${TOURISM_ASSETS_KPIS.categoryCount} Groups`,
        getSubtext: (state) =>
          state
            ? `Top: ${state.coreMix[0]?.name || 'Attractions'} (${state.coreMix[0]?.percentage || 0}%)`
            : `Covering ${TOURISM_ASSETS_KPIS.subCategoryCount} granular POI types`,
        tooltip: {
          sourceOrg: 'MOTAC & Tourisma Spatial Classification Framework',
          datasetName: 'Tourism Asset Taxonomy & Category Hierarchy',
          referenceYear: '2025 / 2026',
          measure: () =>
            'Taxonomic categorization of destinations into Nature, Culture, Theme Park, Heritage, and Urban Leisure.',
          formula: 'Structured 5-tier primary grouping with 28 detailed subcategories',
          limitations: 'Multi-theme attractions assigned according to predominant operational classification.',
        },
      },
      {
        title: 'States Covered',
        icon: MapPin,
        accentColor: '#ea580c',
        iconBg: '#fff7ed',
        iconColor: '#ea580c',
        initialVal: `${TOURISM_ASSETS_KPIS.statesCoveredCount} States & FTs`,
        isNumeric: false,
        getTargetVal: (state) =>
          state ? state.name : `${TOURISM_ASSETS_KPIS.statesCoveredCount} States & FTs`,
        getSubtext: (state) =>
          state ? `Total ${state.totalAssets.toLocaleString()} mapped assets` : '100% national spatial coverage',
        tooltip: {
          sourceOrg: 'Department of Statistics Malaysia (DOSM) & JUPEM',
          datasetName: 'National Administrative Geographic Framework',
          referenceYear: '2025 / 2026',
          measure: () =>
            'Administrative coverage spanning all 13 states and 3 federal territories across Peninsular and Malaysian Borneo.',
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

  private resolveState(stateId: string | null): StateAssetMixItem | null {
    if (!stateId) return null;
    const rawId = stateId.toLowerCase().trim();
    return (
      STATE_ASSET_MIX_DATA[rawId] ||
      Object.values(STATE_ASSET_MIX_DATA).find(
        (s) =>
          s.id.toLowerCase() === rawId ||
          s.name.toLowerCase() === rawId ||
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
      card.className = 'assets-kpi-card';
      card.style.setProperty('--card-accent', cfg.accentColor);
      card.style.setProperty('--icon-bg', cfg.iconBg);
      card.style.setProperty('--icon-color', cfg.iconColor);

      // Info left
      const infoDiv = document.createElement('div');
      infoDiv.className = 'assets-kpi-info';

      const titleRow = document.createElement('div');
      titleRow.style.display = 'flex';
      titleRow.style.alignItems = 'center';
      titleRow.style.justifyContent = 'space-between';
      titleRow.style.width = '100%';

      const titleEl = document.createElement('h4');
      titleEl.className = 'assets-kpi-title';
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
      valRow.className = 'assets-kpi-value-wrap';

      const valEl = document.createElement('span');
      valEl.className = 'assets-kpi-value';
      valEl.textContent = cfg.isNumeric && cfg.format
        ? cfg.format(0)
        : String(cfg.initialVal);
      valRow.appendChild(valEl);

      const subEl = document.createElement('span');
      subEl.className = 'assets-kpi-subtext';
      subEl.textContent = cfg.getSubtext(null);

      infoDiv.appendChild(titleRow);
      infoDiv.appendChild(valRow);
      infoDiv.appendChild(subEl);

      // Icon right
      const iconWrap = document.createElement('div');
      iconWrap.className = 'assets-kpi-icon-wrap';

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
