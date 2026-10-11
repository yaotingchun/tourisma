import './overview.css';
import { LeftKpiCards } from './LeftKpiColumn/LeftKpiCards';
import { MalaysiaMap } from './MapSection/MalaysiaMap';
import { EconomicContributionCards } from './GdpEmployment/EconomicContributionCards';
import { TopReceiptsCard } from './BottomGrid/TopReceiptsCard';
import { DestinationProfilesCard } from './BottomGrid/DestinationProfilesCard';
import { TourismPressureCard } from './BottomGrid/TourismPressureCard';
import {
  STATES_OVERVIEW_DATA,
  NATIONAL_OVERVIEW_KPIS,
  SPATIAL_INFRASTRUCTURE_METRICS,
  type KpiCardConfig,
  type SpatialInfrastructureMetrics,
} from '../../data/overviewData';

export class OverviewPage {
  public readonly element: HTMLElement;
  private leftKpis: LeftKpiCards;
  private centerMap: MalaysiaMap;
  private rightGauges: EconomicContributionCards;
  private topReceipts: TopReceiptsCard;
  private destinationProfiles: DestinationProfilesCard;
  private tourismPressure: TourismPressureCard;
  public selectedStateId: string | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'overview-page-layout';

    // ------------------------------------------------------------------------
    // Upper Section: 3-Column Grid (Left KPIs, Center Map, Right Gauges)
    // ------------------------------------------------------------------------
    const upperGrid = document.createElement('section');
    upperGrid.className = 'overview-upper-3col-grid';
    upperGrid.setAttribute(
      'aria-label',
      'National Overview KPIs, Map, Infrastructure Accessibility and Environmental Sensitivity'
    );

    // 1. Left Column: 4 Vertical KPI Cards
    this.leftKpis = new LeftKpiCards();

    // 2. Center Column: Malaysia Readiness Map with state change callback
    this.centerMap = new MalaysiaMap((stateId) => {
      this.handleStateSelect(stateId);
    });

    // 3. Right Column: Infrastructure Accessibility & Environmental Sensitivity Gauges
    this.rightGauges = new EconomicContributionCards();

    upperGrid.appendChild(this.leftKpis.element);
    upperGrid.appendChild(this.centerMap.element);
    upperGrid.appendChild(this.rightGauges.element);

    // ------------------------------------------------------------------------
    // Lower Section: 3-Column Grid (Receipts, Profiles, Pressure)
    // ------------------------------------------------------------------------
    const lowerGrid = document.createElement('section');
    lowerGrid.className = 'overview-lower-3col-grid';
    lowerGrid.setAttribute('aria-label', 'State Receipts, Destination Readiness Profiles, and Tourism Pressure');

    this.topReceipts = new TopReceiptsCard();
    this.destinationProfiles = new DestinationProfilesCard();
    this.tourismPressure = new TourismPressureCard();

    lowerGrid.appendChild(this.topReceipts.element);
    lowerGrid.appendChild(this.destinationProfiles.element);
    lowerGrid.appendChild(this.tourismPressure.element);

    // ------------------------------------------------------------------------
    // Bottom Data As Of Notice
    // ------------------------------------------------------------------------
    const dataAsOfFooter = document.createElement('div');
    dataAsOfFooter.className = 'overview-data-as-of-footer';
    dataAsOfFooter.innerHTML = `<span>Data as of 2026</span>`;

    // Assemble Page
    this.element.appendChild(upperGrid);
    this.element.appendChild(lowerGrid);
    this.element.appendChild(dataAsOfFooter);
  }

  private handleStateSelect(stateId: string | null): void {
    this.selectedStateId = stateId;

    if (!stateId || !STATES_OVERVIEW_DATA[stateId]) {
      // Revert to nationwide baseline
      this.leftKpis.updateData(NATIONAL_OVERVIEW_KPIS);
      this.rightGauges.updateData(SPATIAL_INFRASTRUCTURE_METRICS);
      return;
    }

    const state = STATES_OVERVIEW_DATA[stateId];

    // 1. Update Left KPI Cards with state-specific figures
    const stateKpis: KpiCardConfig[] = [
      {
        id: 'kpi_domestic_visitors',
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0b57d0" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
        title: 'DOMESTIC VISITORS',
        value: `${state.domesticVisitorsM.toFixed(1)}M`,
        unit: 'Million',
        unitSubtitle: state.shortName,
        change: `▲ ${(state.domesticVisitorsM > 15 ? '+12.4%' : '+8.6%')} vs. 2024`,
        isPositive: true,
        sparkline: state.yearlyTrendVisitors && state.yearlyTrendVisitors.length ? state.yearlyTrendVisitors : [15, 18, 20, 24, 28, 32, state.domesticVisitorsM],
        tooltipNote: `Annual domestic visitor trips in ${state.name} (DOSM 2025/2026)`
      },
      {
        id: 'kpi_tourism_expenditure',
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0b57d0" stroke-width="2.2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`,
        title: 'TOURISM EXPENDITURE',
        value: `RM${state.receiptsRmB.toFixed(1)}B`,
        unit: 'RM Billion',
        unitSubtitle: state.shortName,
        change: `▲ ${(state.receiptsRmB > 10 ? '+14.1%' : '+9.2%')} vs. 2024`,
        isPositive: true,
        sparkline: [
          Math.max(1, state.receiptsRmB * 0.5),
          Math.max(1, state.receiptsRmB * 0.4),
          Math.max(1, state.receiptsRmB * 0.25),
          Math.max(1, state.receiptsRmB * 0.6),
          Math.max(1, state.receiptsRmB * 0.75),
          Math.max(1, state.receiptsRmB * 0.9),
          state.receiptsRmB
        ],
        tooltipNote: `Total domestic visitor receipts in ${state.name} (RM ${state.receiptsRmM.toLocaleString()} Million)`
      },
      {
        id: 'kpi_avg_length_of_stay',
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0b57d0" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
        title: 'AVG. LENGTH OF STAY',
        value: `${state.alos.toFixed(2)} nights`,
        unit: 'Nights',
        unitSubtitle: state.shortName,
        change: `${state.alos >= 2.5 ? '▲ +0.15' : '▲ +0.08'} vs. 2024`,
        isPositive: true,
        sparkline: [state.alos * 0.88, state.alos * 0.91, state.alos * 0.93, state.alos * 0.95, state.alos * 0.97, state.alos * 0.99, state.alos],
        tooltipNote: `Average duration of stay per trip in ${state.name}`
      },
      {
        id: 'kpi_avg_occupancy_rate',
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0b57d0" stroke-width="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
        title: 'AVG. OCCUPANCY RATE',
        value: `${state.aorPct.toFixed(1)}%`,
        unit: '%',
        unitSubtitle: state.shortName,
        change: `${state.aorPct > 50 ? '▲ +4.2 pp' : '▲ +2.1 pp'} vs. 2024`,
        isPositive: true,
        sparkline: [state.aorPct * 0.8, state.aorPct * 0.65, state.aorPct * 0.6, state.aorPct * 0.82, state.aorPct * 0.9, state.aorPct * 0.96, state.aorPct],
        tooltipNote: `Average Hotel Occupancy Rate across ${state.accommodationEstablishments} licensed properties in ${state.name}`
      }
    ];

    this.leftKpis.updateData(stateKpis);

    // 2. Update Right Column: Infrastructure Accessibility & Environmental Sensitivity Gauges
    const terr = Math.round(state.environmentalExposureRate * 0.8 * 10) / 10;
    const marine = Math.max(0, Math.round((state.environmentalExposureRate - terr) * 10) / 10);
    const core = Math.round(state.totalTourismAssets * 0.09);
    const supp = state.totalTourismAssets - core;

    const stateSpatial: SpatialInfrastructureMetrics = {
      roadAccessRatePct: state.roadAccessRate,
      ptAccessRatePct: state.ptAccessRate,
      totalTourismAssets: state.totalTourismAssets,
      coreAssetCount: core,
      supportingAssetCount: supp,
      environmentalExposureRatePct: state.environmentalExposureRate,
      terrestrialExposureRatePct: terr,
      marineExposureRatePct: marine,
      source: `${state.name} Spatial Infrastructure Profile`,
    };

    this.rightGauges.updateData(stateSpatial);
  }
}
