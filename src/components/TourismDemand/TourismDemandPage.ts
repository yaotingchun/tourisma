import './tourismDemand.css';
import { DemandKpiRow } from './DemandKpiRow';
import { DemandCompositionChart } from './CompositionSection/DemandCompositionChart';
import { StateMetricsChart } from './CompositionSection/StateMetricsChart';
import { DemandMapSection } from './MapSection/DemandMapSection';

export class TourismDemandPage {
  public readonly element: HTMLElement;
  private kpiRow: DemandKpiRow;
  private demandMapSection: DemandMapSection;
  private stateMetricsChart: StateMetricsChart;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'tourism-demand-page';

    // 1. Top KPI Row (4 Grounded Macro Demand Cards)
    this.kpiRow = new DemandKpiRow();
    this.element.appendChild(this.kpiRow.element);

    // 2. Main Analytics Charts Section
    const section = document.createElement('section');
    section.className = 'demand-section-block';

    this.demandMapSection = new DemandMapSection((stateId) => {
      this.handleSelectState(stateId);
    });
    section.appendChild(this.demandMapSection.element);

    const demandChart = new DemandCompositionChart();
    section.appendChild(demandChart.element);

    this.stateMetricsChart = new StateMetricsChart((stateId) => {
      this.handleSelectState(stateId);
    });
    section.appendChild(this.stateMetricsChart.element);

    this.element.appendChild(section);
  }

  private handleSelectState(stateId: string | null): void {
    this.kpiRow.updateData(stateId);
    this.demandMapSection.setSelectedState(stateId);
    this.stateMetricsChart.setSelectedState(stateId);
  }

  public destroy(): void {
    if (this.demandMapSection) {
      this.demandMapSection.destroy();
    }
  }
}
