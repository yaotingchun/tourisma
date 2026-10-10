import { STATE_METRICS_DATA } from '../../../data/tourismDemandData';
import { createInfoIcon } from '../../Common/InfoTooltip';

export type StateMetricType = 'visitors' | 'receipts' | 'lengthOfStay';

export class StateMetricsChart {
  public readonly element: HTMLElement;
  private contentContainer: HTMLElement;
  private currentMetric: StateMetricType = 'visitors';

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'demand-card';
    this.element.style.marginTop = '24px';

    // Header
    const header = document.createElement('div');
    header.className = 'demand-card-header';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'flex-start';
    header.style.marginBottom = '20px';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'demand-card-title-group';
    titleGroup.innerHTML = `
      <h3 class="demand-card-title">State Performance Comparison</h3>
      <span class="demand-card-desc">Comparative breakdown of domestic tourism indicators across states</span>
    `;

    // Segmented Control
    const toggleContainer = document.createElement('div');
    toggleContainer.style.display = 'flex';
    toggleContainer.style.alignItems = 'center';
    toggleContainer.style.gap = '10px';

    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'demand-metric-toggle';
    toggleGroup.style.display = 'flex';
    toggleGroup.style.gap = '4px';
    toggleGroup.style.background = '#f1f5f9';
    toggleGroup.style.padding = '4px';
    toggleGroup.style.borderRadius = '8px';

    const createToggleBtn = (id: StateMetricType, label: string, isActive: boolean) => {
      const btn = document.createElement('button');
      btn.className = `metric-toggle-btn ${isActive ? 'active' : ''}`;
      btn.textContent = label;
      btn.dataset.metric = id;
      Object.assign(btn.style, {
        border: 'none',
        background: isActive ? '#ffffff' : 'transparent',
        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: isActive ? '600' : '500',
        color: isActive ? '#0f172a' : '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      });
      btn.addEventListener('click', () => {
        this.currentMetric = id;
        Array.from(toggleGroup.children).forEach(child => {
          const cBtn = child as HTMLButtonElement;
          const isBtnActive = cBtn.dataset.metric === id;
          cBtn.style.background = isBtnActive ? '#ffffff' : 'transparent';
          cBtn.style.boxShadow = isBtnActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
          cBtn.style.fontWeight = isBtnActive ? '600' : '500';
          cBtn.style.color = isBtnActive ? '#0f172a' : '#64748b';
        });
        this.renderChart();
      });
      return btn;
    };

    toggleGroup.appendChild(createToggleBtn('visitors', 'Domestic Visitors', true));
    toggleGroup.appendChild(createToggleBtn('receipts', 'Tourism Receipts', false));
    toggleGroup.appendChild(createToggleBtn('lengthOfStay', 'Avg Length of Stay', false));

    const infoIcon = createInfoIcon({
      sourceOrg: 'Department of Statistics Malaysia (DOSM)',
      datasetName: 'State Domestic Tourism Comparative Statistics',
      referenceYear: '2025',
      measure: 'Comparative distribution of visitor trips, receipts, and stay lengths across all 16 states & federal territories.',
      formula: 'Sorted state metrics with national median benchmark reference line',
      limitations: 'Data reflects domestic resident travel; international guest figures detailed in Overview map.',
    });

    toggleContainer.appendChild(toggleGroup);
    toggleContainer.appendChild(infoIcon);

    header.appendChild(titleGroup);
    header.appendChild(toggleContainer);

    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'state-metrics-container';
    this.contentContainer.style.display = 'flex';
    this.contentContainer.style.flexDirection = 'column';
    this.contentContainer.style.gap = '12px';
    this.contentContainer.style.position = 'relative';
    this.contentContainer.style.paddingTop = '16px'; // Space for median label

    this.element.appendChild(header);
    this.element.appendChild(this.contentContainer);

    this.renderChart();
  }

  private renderChart(): void {
    let data = [...STATE_METRICS_DATA];
    
    // Sort data descending based on current metric
    data.sort((a, b) => b[this.currentMetric] - a[this.currentMetric]);

    const maxValue = Math.max(...data.map(d => d[this.currentMetric]));

    const sortedVals = data.map(d => d[this.currentMetric]).sort((a, b) => a - b);
    const mid = Math.floor(sortedVals.length / 2);
    const median = sortedVals.length % 2 !== 0 ? sortedVals[mid] : (sortedVals[mid - 1] + sortedVals[mid]) / 2;
    const medianPct = maxValue > 0 ? (median / maxValue) * 100 : 0;

    let valueFormatter = (val: number) => val.toFixed(2);
    let color = '#0ea5e9';

    if (this.currentMetric === 'visitors') {
        valueFormatter = (val: number) => val.toFixed(1) + 'M';
        color = '#0b57d0';
    } else if (this.currentMetric === 'receipts') {
        valueFormatter = (val: number) => 'RM ' + val.toFixed(0) + 'M';
        color = '#10b981';
    } else if (this.currentMetric === 'lengthOfStay') {
        valueFormatter = (val: number) => val.toFixed(2) + ' Nights';
        color = '#f59e0b';
    }

    this.contentContainer.innerHTML = '';

    data.forEach((d) => {
        const val = d[this.currentMetric];
        const widthPct = maxValue > 0 ? (val / maxValue) * 100 : 0;

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '16px';

        // State Name Label
        const labelStr = document.createElement('div');
        labelStr.style.width = '140px';
        labelStr.style.fontSize = '13px';
        labelStr.style.fontWeight = '500';
        labelStr.style.color = '#475569';
        labelStr.style.textAlign = 'right';
        labelStr.textContent = d.state;

        // Bar Track
        const track = document.createElement('div');
        track.style.flex = '1';
        track.style.height = '24px';
        track.style.background = '#f8fafc';
        track.style.borderRadius = '4px';
        track.style.position = 'relative';
        track.style.overflow = 'hidden';

        // Fill Bar
        const fill = document.createElement('div');
        fill.style.position = 'absolute';
        fill.style.left = '0';
        fill.style.top = '0';
        fill.style.height = '100%';
        fill.style.width = '0%'; // Start at 0 for animation
        // 2D effect (removed borderRight)
        // If we want a solid color, we can just use the primary color instead of the light bg color
        fill.style.background = color;
        fill.style.borderRadius = '4px';
        fill.style.transition = 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)';

        // Value Label
        const valLabel = document.createElement('div');
        valLabel.style.width = '80px';
        valLabel.style.fontSize = '13px';
        valLabel.style.fontWeight = '600';
        valLabel.style.color = '#0f172a';
        valLabel.textContent = valueFormatter(val);

        track.appendChild(fill);
        row.appendChild(labelStr);
        row.appendChild(track);
        row.appendChild(valLabel);

        this.contentContainer.appendChild(row);

        // Trigger animation after append
        requestAnimationFrame(() => {
            fill.style.width = `${widthPct}%`;
        });
    });

    // Add Median Line
    const medianLine = document.createElement('div');
    medianLine.style.position = 'absolute';
    medianLine.style.top = '0';
    medianLine.style.bottom = '0';
    medianLine.style.left = `calc(156px + (100% - 252px) * ${medianPct / 100})`;
    medianLine.style.width = '2px';
    medianLine.style.borderLeft = '2px dashed #94a3b8';
    medianLine.style.zIndex = '10';
    medianLine.style.pointerEvents = 'none';
    medianLine.style.transition = 'left 0.6s cubic-bezier(0.16, 1, 0.3, 1)';

    const medianLabel = document.createElement('div');
    medianLabel.style.position = 'absolute';
    medianLabel.style.top = '2px';
    medianLabel.style.left = '50%';
    medianLabel.style.transform = 'translateX(-50%)';
    medianLabel.style.fontSize = '10px';
    medianLabel.style.fontWeight = '700';
    medianLabel.style.color = '#64748b';
    medianLabel.style.background = '#ffffff';
    medianLabel.style.padding = '0 4px';
    medianLabel.textContent = 'MEDIAN';
    
    medianLine.appendChild(medianLabel);
    this.contentContainer.appendChild(medianLine);
  }
}
