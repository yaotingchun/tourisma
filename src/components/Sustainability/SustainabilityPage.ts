import './sustainability.css';
import {
  createElement,
  ShieldCheck,
  AlertTriangle,
  Trees,
  Waves,
} from 'lucide';
import { NATIONAL_ENVIRONMENT_DATA } from '../../data/environmentData';
import { EnvironmentMapCard } from './EnvironmentMapCard';
import { EnvironmentRingChartCard } from './EnvironmentRingChartCard';
import { EnvironmentExposureBarChart } from './EnvironmentExposureBarChart';
import { createInfoIcon } from '../Common/InfoTooltip';

export class SustainabilityPage {
  public readonly element: HTMLElement;
  private mapCard!: EnvironmentMapCard;
  private ringCard!: EnvironmentRingChartCard;
  private barChart!: EnvironmentExposureBarChart;
  private selectedStateId: string | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'sustainability-page environment-page';
    this.render();
  }

  private handleSelectState(stateId: string | null): void {
    this.mapCard.hideTooltip();
    this.barChart.hideTooltip();

    if (!stateId || this.selectedStateId === stateId) {
      // Toggle off selection
      this.selectedStateId = null;
      this.mapCard.setSelectedState(null);
      this.ringCard.setScope('all');
      this.barChart.setSelectedState(null);
    } else {
      this.selectedStateId = stateId;
      this.mapCard.setSelectedState(stateId);
      this.ringCard.setScope(stateId);
      this.barChart.setSelectedState(stateId);
    }
  }

  private handleRingScopeChange(scope: string): void {
    if (scope === 'all') {
      this.selectedStateId = null;
      this.mapCard.setSelectedState(null);
      this.barChart.setSelectedState(null);
    } else {
      this.selectedStateId = scope;
      this.mapCard.setSelectedState(scope);
      this.barChart.setSelectedState(scope);
    }
  }

  private render(): void {
    this.element.innerHTML = '';

    // 1. Top KPI Summary Strip (4 Standardized Cards Matching Other Pages)
    const kpiStrip = document.createElement('section');
    kpiStrip.className = 'env-kpi-strip';

    const nat = NATIONAL_ENVIRONMENT_DATA;

    const kpis = [
      {
        title: 'TOTAL SCREENED ASSETS',
        value: nat.totalAssets.toLocaleString(),
        badgeText: '100% spatial inventory',
        badgeClass: 'blue',
        subtext: 'Across all 16 states & federal territories',
        icon: ShieldCheck,
        accentColor: '#2563eb',
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        tooltip: {
          sourceOrg: 'DOSM & Department of Environment Malaysia (DOE)',
          datasetName: 'National Tourism Asset Environmental Screening Inventory',
          referenceYear: '2025',
          measure: 'Total tourism assets screened for environmental sensitivity proximity including eco-exposure risk scoring.',
          formula: 'Count of all tourism POIs processed through the environmental proximity screening model',
          limitations: 'Screening is proximity-based; actual environmental impact assessment requires site-specific surveys.',
        },
      },
      {
        title: 'SENSITIVE PROXIMITY',
        value: nat.totalExposed.toLocaleString(),
        badgeText: `${nat.exposurePct}% exposed`,
        badgeClass: 'warning',
        subtext: 'Inside or near protected reserves',
        icon: AlertTriangle,
        accentColor: '#ea580c',
        iconBg: '#fff7ed',
        iconColor: '#ea580c',
        tooltip: {
          sourceOrg: 'Department of Wildlife & National Parks (PERHILITAN) & DOE',
          datasetName: 'Protected Area Proximity Exposure Index',
          referenceYear: '2025',
          measure: 'Tourism assets located within or within 500m of gazetted protected areas (forest reserves, marine parks, Ramsar sites).',
          formula: 'Exposed Assets = Assets within 500m buffer of any protected zone boundary',
          limitations: 'Buffer distance is a planning proxy; legal definitions of impact zones vary by protected area category.',
        },
      },
      {
        title: 'LAND ECO-EXPOSURE',
        value: nat.land.exposed.toLocaleString(),
        badgeText: `${nat.land.percent}% terrestrial exposure`,
        badgeClass: 'land',
        subtext: 'Forest reserves & national parks',
        icon: Trees,
        accentColor: '#059669',
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        tooltip: {
          sourceOrg: 'Forestry Department Peninsular Malaysia & Sabah/Sarawak Forestry',
          datasetName: 'Terrestrial Protected Area Eco-Exposure Index',
          referenceYear: '2025',
          measure: 'Tourism assets within or adjacent to gazetted terrestrial forest reserves and national parks.',
          formula: 'Land Eco-Exposure = Assets within 500m of forest reserve or national park boundary',
          limitations: 'Covers gazetted reserves only; state land forests and wildlife corridors may not be fully captured.',
        },
      },
      {
        title: 'MARINE & REEF EXPOSURE',
        value: nat.marine.exposed.toLocaleString(),
        badgeText: `${nat.marine.percent}% marine exposure`,
        badgeClass: 'marine',
        subtext: 'Marine parks & coral ecosystems',
        icon: Waves,
        accentColor: '#0284c7',
        iconBg: '#f0f9ff',
        iconColor: '#0284c7',
        tooltip: {
          sourceOrg: 'Department of Marine Park Malaysia (JTLM)',
          datasetName: 'Marine Protected Area Proximity Index',
          referenceYear: '2025',
          measure: 'Tourism assets within or adjacent to gazetted marine parks, coral triangle zones, and turtle sanctuary areas.',
          formula: 'Marine Eco-Exposure = Assets within 1 km of marine park boundary or coral reef polygon',
          limitations: 'Dynamic marine boundaries (seasonal closures) not reflected in static spatial layers.',
        },
      },
    ];

    kpis.forEach((kpi) => {
      const card = document.createElement('div');
      card.className = 'env-kpi-card';
      card.style.setProperty('--card-accent', kpi.accentColor);
      card.style.setProperty('--icon-bg', kpi.iconBg);
      card.style.setProperty('--icon-color', kpi.iconColor);

      // Info left
      const infoDiv = document.createElement('div');
      infoDiv.className = 'env-kpi-info';

      const titleEl = document.createElement('h4');
      titleEl.className = 'env-kpi-label';
      titleEl.textContent = kpi.title;

      if (kpi.tooltip) {
        const infoIcon = createInfoIcon(kpi.tooltip);
        infoIcon.style.marginLeft = '6px';
        infoIcon.style.verticalAlign = 'middle';
        titleEl.appendChild(infoIcon);
      }

      const valWrap = document.createElement('div');
      valWrap.className = 'env-kpi-value-wrap';

      const valEl = document.createElement('span');
      valEl.className = 'env-kpi-num';
      valEl.textContent = kpi.value;
      valWrap.appendChild(valEl);

      const badgeEl = document.createElement('span');
      badgeEl.className = `env-kpi-badge ${kpi.badgeClass}`;
      badgeEl.textContent = kpi.badgeText;
      valWrap.appendChild(badgeEl);

      const subEl = document.createElement('span');
      subEl.className = 'env-kpi-sub';
      subEl.textContent = kpi.subtext;

      infoDiv.appendChild(titleEl);
      infoDiv.appendChild(valWrap);
      infoDiv.appendChild(subEl);

      // Icon right
      const iconWrap = document.createElement('div');
      iconWrap.className = 'env-kpi-icon-wrap';

      const iconSvg = createElement(kpi.icon, {
        width: 20,
        height: 20,
        'stroke-width': 2,
      });
      iconWrap.appendChild(iconSvg);

      card.appendChild(infoDiv);
      card.appendChild(iconWrap);
      kpiStrip.appendChild(card);
    });

    this.element.appendChild(kpiStrip);

    // 2. Upper Grid: Environmental Map (Left) + Ring Chart (Right)
    const upperGrid = document.createElement('div');
    upperGrid.className = 'env-upper-grid';

    this.mapCard = new EnvironmentMapCard((stateId) => this.handleSelectState(stateId));
    this.ringCard = new EnvironmentRingChartCard((scope) => this.handleRingScopeChange(scope));

    upperGrid.appendChild(this.mapCard.element);
    upperGrid.appendChild(this.ringCard.element);
    this.element.appendChild(upperGrid);

    // 3. Lower Section: Environmental Exposure by State (Land & Marine) Horizontal Bar Chart
    const lowerSection = document.createElement('section');
    lowerSection.className = 'env-lower-section';

    this.barChart = new EnvironmentExposureBarChart((stateId) => this.handleSelectState(stateId));
    lowerSection.appendChild(this.barChart.element);
    this.element.appendChild(lowerSection);
  }
}
