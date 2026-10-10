import './tourismDemand.css';
import { DemandKpiRow } from './DemandKpiRow';
import { DemandCompositionChart } from './CompositionSection/DemandCompositionChart';
import { StateMetricsChart } from './CompositionSection/StateMetricsChart';
import { DemandMapSection } from './MapSection/DemandMapSection';

export class TourismDemandPage {
  public readonly element: HTMLElement;
  private kpiRow: DemandKpiRow;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'tourism-demand-page';

    // 1. Top KPI Row (4 Grounded Macro Demand Cards)
    this.kpiRow = new DemandKpiRow();
    this.element.appendChild(this.kpiRow.element);

    // 2. Main Analytics Charts Section
    const section = document.createElement('section');
    section.className = 'demand-section-block';

    const demandMapSection = new DemandMapSection();
    section.appendChild(demandMapSection.element);

    const demandChart = new DemandCompositionChart();
    section.appendChild(demandChart.element);

    const stateMetricsChart = new StateMetricsChart();
    section.appendChild(stateMetricsChart.element);

    this.element.appendChild(section);
  }
}
