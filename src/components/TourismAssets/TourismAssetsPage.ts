import './tourismAssets.css';
import { AssetKpiRow } from './AssetKpiRow';
import { TourismAssetDensityMap } from './TourismAssetDensityMap';
import { AssetMixRingCharts } from './AssetMixRingCharts';
import { StatePortfolioDiversityChart } from './StatePortfolioDiversityChart';

export class TourismAssetsPage {
  public readonly element: HTMLElement;
  private kpiRow: AssetKpiRow;
  private densityMap: TourismAssetDensityMap;
  private mixRingCharts: AssetMixRingCharts;
  private portfolioDiversityChart: StatePortfolioDiversityChart;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'tourism-assets-page';

    // 1. Top KPI Row (4 Cards)
    this.kpiRow = new AssetKpiRow();
    this.element.appendChild(this.kpiRow.element);

    // 2. Middle Grid: Core Asset Density Map (Left) + Asset Mix Rings (Right)
    const middleGrid = document.createElement('div');
    middleGrid.className = 'assets-middle-grid';

    this.densityMap = new TourismAssetDensityMap((stateId) => {
      this.handleSelectState(stateId);
    });

    this.mixRingCharts = new AssetMixRingCharts(() => {
      this.handleSelectState(null);
    });

    middleGrid.appendChild(this.densityMap.element);
    middleGrid.appendChild(this.mixRingCharts.element);
    this.element.appendChild(middleGrid);

    // 3. Bottom Section: State Attraction Portfolio Diversity Stacked Bar Chart (Graph 6.2)
    this.portfolioDiversityChart = new StatePortfolioDiversityChart((stateId) => {
      this.handleSelectState(stateId);
    });
    this.element.appendChild(this.portfolioDiversityChart.element);
  }

  private handleSelectState(stateId: string | null): void {
    this.densityMap.setSelectedState(stateId);
    this.mixRingCharts.setStateScope(stateId);
    this.portfolioDiversityChart.setSelectedState(stateId);
    this.kpiRow.updateData(stateId);
  }

  public destroy(): void {
    if (this.densityMap) {
      this.densityMap.destroy();
    }
    if (this.portfolioDiversityChart) {
      this.portfolioDiversityChart.destroy();
    }
  }
}
