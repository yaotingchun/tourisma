import {
  createElement,
  Route,
  Bus,
  Landmark,
  MapPin,
} from 'lucide';
import { ACCESSIBILITY_KPIS } from '../../data/accessibilityData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class AccessibilityKpiRow {
  public readonly element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'accessibility-kpi-grid';
    this.render();
  }

  private render(): void {
    const kpis = [
      {
        title: 'Road Access',
        value: `${ACCESSIBILITY_KPIS.roadAccessRate.toFixed(1)}%`,
        badgeText: 'Within 1 km of main road',
        badgeColor: 'blue',
        subtext: ACCESSIBILITY_KPIS.roadAccessSubtext,
        icon: Route,
        accentColor: '#2563eb',
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        tooltip: {
          sourceOrg: 'DOSM GeoPadang & Malaysia Road Network GIS',
          datasetName: 'Tourist Destination Road Accessibility Index',
          referenceYear: '2025',
          measure: 'Percentage of mapped tourism assets located within 1 km of a classified main road network.',
          formula: 'Road Access Rate = (Assets within 1 km of road / Total Assets) × 100',
          limitations: 'Captures proximity to roads, not actual road quality or travel time.',
        },
      },
      {
        title: 'Public Transport Access',
        value: `${ACCESSIBILITY_KPIS.ptAccessRate.toFixed(1)}%`,
        badgeText: 'Within 1 km of transit / bus',
        badgeColor: 'emerald',
        subtext: ACCESSIBILITY_KPIS.ptAccessSubtext,
        icon: Bus,
        accentColor: '#059669',
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        tooltip: {
          sourceOrg: 'Prasarana Malaysia & MyRapid Open Data',
          datasetName: 'Public Transit Proximity to Tourism Assets',
          referenceYear: '2025',
          measure: 'Percentage of tourism assets within 1 km of a bus stop, LRT, MRT, or commuter rail station.',
          formula: 'PT Access Rate = (Assets within 1 km of transit / Total Assets) × 100',
          limitations: 'Service frequency and hours not factored in; rural areas underrepresented in transit data.',
        },
      },
      {
        title: 'Tourism Assets',
        value: ACCESSIBILITY_KPIS.totalTourismAssets.toLocaleString(),
        badgeText: '50 POI categories mapped',
        badgeColor: 'purple',
        subtext: ACCESSIBILITY_KPIS.assetsSubtext,
        icon: Landmark,
        accentColor: '#7c3aed',
        iconBg: '#f5f3ff',
        iconColor: '#7c3aed',
        tooltip: {
          sourceOrg: 'DOSM & Tourism Malaysia POI Registry',
          datasetName: 'National Tourism Asset Spatial Inventory',
          referenceYear: '2025',
          measure: 'Total unique tourism point-of-interest (POI) assets geo-tagged across 50 categories nationally.',
          formula: 'Sum of all unique tourism POIs across accommodation, F&B, culture, nature, and recreation categories',
          limitations: 'Informal or unregistered tourism spots may not be captured in the official registry.',
        },
      },
      {
        title: 'States Covered',
        value: `${ACCESSIBILITY_KPIS.statesCovered} States & FTs`,
        badgeText: 'National spatial coverage',
        badgeColor: 'orange',
        subtext: ACCESSIBILITY_KPIS.statesSubtext,
        icon: MapPin,
        accentColor: '#ea580c',
        iconBg: '#fff7ed',
        iconColor: '#ea580c',
        tooltip: {
          sourceOrg: 'DOSM Administrative Boundary GIS',
          datasetName: 'State & Federal Territory Coverage',
          referenceYear: '2025',
          measure: 'Number of Malaysian states and federal territories with complete spatial accessibility data coverage.',
          formula: 'Count of states and FTs with ≥1 tourism asset in the spatial inventory',
          limitations: 'Data completeness may vary by state; some rural FTs may have limited POI coverage.',
        },
      },
    ];

    kpis.forEach((kpi) => {
      const card = document.createElement('div');
      card.className = 'access-kpi-card';
      card.style.setProperty('--card-accent', kpi.accentColor);
      card.style.setProperty('--icon-bg', kpi.iconBg);
      card.style.setProperty('--icon-color', kpi.iconColor);

      // Info left
      const infoDiv = document.createElement('div');
      infoDiv.className = 'access-kpi-info';

      const titleEl = document.createElement('h4');
      titleEl.className = 'access-kpi-title';
      titleEl.textContent = kpi.title;

      if (kpi.tooltip) {
        const infoIcon = createInfoIcon(kpi.tooltip);
        infoIcon.style.marginLeft = '6px';
        infoIcon.style.verticalAlign = 'middle';
        titleEl.appendChild(infoIcon);
      }

      const valWrap = document.createElement('div');
      valWrap.className = 'access-kpi-value-wrap';

      const valEl = document.createElement('span');
      valEl.className = 'access-kpi-value';
      valEl.textContent = kpi.value;
      valWrap.appendChild(valEl);

      const badgeEl = document.createElement('span');
      badgeEl.className = `access-kpi-badge ${kpi.badgeColor}`;
      badgeEl.textContent = kpi.badgeText;
      valWrap.appendChild(badgeEl);

      const subEl = document.createElement('span');
      subEl.className = 'access-kpi-subtext';
      subEl.textContent = kpi.subtext;

      infoDiv.appendChild(titleEl);
      infoDiv.appendChild(valWrap);
      infoDiv.appendChild(subEl);

      // Icon right
      const iconWrap = document.createElement('div');
      iconWrap.className = 'access-kpi-icon-wrap';

      const iconSvg = createElement(kpi.icon, {
        width: 20,
        height: 20,
        'stroke-width': 2,
      });
      iconWrap.appendChild(iconSvg);

      card.appendChild(infoDiv);
      card.appendChild(iconWrap);
      this.element.appendChild(card);
    });
  }
}
