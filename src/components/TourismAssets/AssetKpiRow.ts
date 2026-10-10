import {
  createElement,
  Landmark,
  Layers,
  Shapes,
  MapPin,
} from 'lucide';
import { TOURISM_ASSETS_KPIS } from '../../data/tourismAssetsData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class AssetKpiRow {
  public readonly element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'assets-kpi-grid';
    this.render();
  }

  private render(): void {
    const kpis = [
      {
        title: 'Core Tourism Assets',
        value: TOURISM_ASSETS_KPIS.coreAssetsCount.toLocaleString(),
        subtext: 'Main attractions & heritage sites',
        icon: Landmark,
        accentColor: '#2563eb', // Royal Blue
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        tooltip: {
          sourceOrg: 'Ministry of Tourism, Arts and Culture (MOTAC) & State Tourism Boards',
          datasetName: 'National Core Tourism Attraction Inventory',
          referenceYear: '2025 / 2026',
          measure: 'Count of gazetted and recognized primary attractions across nature, culture, theme parks, and heritage.',
          formula: 'Sum of verified point-of-interest (POI) records classified as primary tourism destinations',
          limitations: 'Excludes auxiliary commercial services; focused on primary destination demand anchors.',
        },
      },
      {
        title: 'Supporting Assets',
        value: TOURISM_ASSETS_KPIS.supportingAssetsCount.toLocaleString(),
        subtext: 'F&B, transit, lodging & healthcare',
        icon: Layers,
        accentColor: '#059669', // Emerald
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        tooltip: {
          sourceOrg: 'OpenStreetMap, DOSM Business Register & Local Authorities',
          datasetName: 'Tourism Enabling & Secondary Infrastructure Inventory',
          referenceYear: '2025 / 2026',
          measure: 'Spatial points of interest that support visitor stays including registered restaurants, retail hubs, transit nodes, and clinics.',
          formula: 'Sum of supporting hospitality, mobility, and amenity points within 5km of core attractions',
          limitations: 'Continuously updated through geospatial verification and registry cross-matching.',
        },
      },
      {
        title: 'Asset Categories',
        value: `${TOURISM_ASSETS_KPIS.categoryCount} Groups`,
        subtext: `Covering ${TOURISM_ASSETS_KPIS.subCategoryCount} granular POI types`,
        icon: Shapes,
        accentColor: '#7c3aed', // Purple
        iconBg: '#f5f3ff',
        iconColor: '#7c3aed',
        tooltip: {
          sourceOrg: 'MOTAC & Tourisma Spatial Classification Framework',
          datasetName: 'Tourism Asset Taxonomy & Category Hierarchy',
          referenceYear: '2025 / 2026',
          measure: 'Taxonomic categorization of destinations into Nature, Culture, Theme Park, Heritage, and Urban Leisure.',
          formula: 'Structured 5-tier primary grouping with 28 detailed subcategories',
          limitations: 'Multi-theme attractions assigned according to predominant operational classification.',
        },
      },
      {
        title: 'States Covered',
        value: `${TOURISM_ASSETS_KPIS.statesCoveredCount} States & FTs`,
        subtext: '100% national spatial coverage',
        icon: MapPin,
        accentColor: '#ea580c', // Orange
        iconBg: '#fff7ed',
        iconColor: '#ea580c',
        tooltip: {
          sourceOrg: 'Department of Statistics Malaysia (DOSM) & JUPEM',
          datasetName: 'National Administrative Geographic Framework',
          referenceYear: '2025 / 2026',
          measure: 'Administrative coverage spanning all 13 states and 3 federal territories across Peninsular and Malaysian Borneo.',
          formula: 'Complete administrative state census',
          limitations: 'All 16 administrative units actively covered in Tourisma diagnostic models.',
        },
      },
    ];

    this.element.innerHTML = '';

    kpis.forEach((kpi) => {
      const card = document.createElement('div');
      card.className = 'assets-kpi-card';
      card.style.setProperty('--card-accent', kpi.accentColor);
      card.style.setProperty('--icon-bg', kpi.iconBg);
      card.style.setProperty('--icon-color', kpi.iconColor);

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
      titleEl.textContent = kpi.title;

      const infoIcon = createInfoIcon(kpi.tooltip);

      titleRow.appendChild(titleEl);
      titleRow.appendChild(infoIcon);

      const valRow = document.createElement('div');
      valRow.className = 'assets-kpi-value-row';

      const valEl = document.createElement('span');
      valEl.className = 'assets-kpi-value';
      valEl.textContent = kpi.value;

      valRow.appendChild(valEl);

      const subEl = document.createElement('span');
      subEl.className = 'assets-kpi-subtext';
      subEl.textContent = kpi.subtext;

      infoDiv.appendChild(titleRow);
      infoDiv.appendChild(valRow);
      infoDiv.appendChild(subEl);

      // Icon right
      const iconWrap = document.createElement('div');
      iconWrap.className = 'assets-kpi-icon-wrap';

      const iconSvg = createElement(kpi.icon, {
        width: 22,
        height: 22,
        'stroke-width': 2,
      });

      iconWrap.appendChild(iconSvg);

      card.appendChild(infoDiv);
      card.appendChild(iconWrap);
      this.element.appendChild(card);
    });
  }
}
