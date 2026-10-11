import './accessibility.css';
import { AccessibilityKpiRow } from './AccessibilityKpiRow';
import { AccessibilityMap } from './AccessibilityMap';
import { AccessibilityRingChart } from './AccessibilityRingChart';
import { AccessibilityStackedBarChart } from './AccessibilityStackedBarChart';
import type { AccessibilityMode } from '../../data/accessibilityData';

export class AccessibilityPage {
  public readonly element: HTMLElement;
  private kpiRow: AccessibilityKpiRow;
  private accessMap: AccessibilityMap;
  private ringChart: AccessibilityRingChart;
  private stackedBarChart: AccessibilityStackedBarChart;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'accessibility-page';

    // 1. Top KPI Row (4 Cards)
    this.kpiRow = new AccessibilityKpiRow();
    this.element.appendChild(this.kpiRow.element);

    // 2. Middle Grid: Accessibility Map (Left) + Overall Ring Charts (Right)
    const middleGrid = document.createElement('div');
    middleGrid.className = 'access-middle-grid';

    this.accessMap = new AccessibilityMap(
      (stateId) => this.handleSelectState(stateId),
      (mode) => this.handleModeChange(mode)
    );

    this.ringChart = new AccessibilityRingChart(() => {
      this.handleSelectState(null);
    });

    middleGrid.appendChild(this.accessMap.element);
    middleGrid.appendChild(this.ringChart.element);
    this.element.appendChild(middleGrid);

    // 3. Bottom Section: Main Visual 100% Stacked Bar Chart ⭐
    this.stackedBarChart = new AccessibilityStackedBarChart(
      (stateId) => this.handleSelectState(stateId),
      (mode) => this.handleModeChange(mode)
    );
    this.element.appendChild(this.stackedBarChart.element);
  }

  private handleSelectState(stateId: string | null): void {
    this.accessMap.setSelectedState(stateId);
    this.ringChart.setStateScope(stateId);
    this.stackedBarChart.setSelectedState(stateId);
    this.kpiRow.updateData(stateId);
  }

  private handleModeChange(mode: AccessibilityMode): void {
    this.accessMap.setMode(mode, false);
    this.stackedBarChart.setMode(mode, false);
  }

  public destroy(): void {
    this.accessMap.destroy();
  }
}
