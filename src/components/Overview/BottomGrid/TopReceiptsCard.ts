import { TOP_TOURISM_RECEIPTS, type TopReceiptsItem } from '../../../data/overviewData';
import { createInfoIcon } from '../../Common/InfoTooltip';

export class TopReceiptsCard {
  public readonly element: HTMLElement;
  private items: TopReceiptsItem[];

  constructor(items: TopReceiptsItem[] = TOP_TOURISM_RECEIPTS) {
    this.element = document.createElement('div');
    this.element.className = 'bottom-insight-card';
    this.items = items;
    this.render();
  }

  public updateData(items: TopReceiptsItem[]): void {
    this.items = items;
    this.render();
  }

  private render(): void {
    const listHtml = this.items.slice(0, 4).map((item) => `
      <div class="receipts-bar-row">
        <div class="receipts-label-line">
          <span class="state-name-text">${item.name}</span>
          <span class="state-receipt-val">RM${item.receiptsRmB.toFixed(1)}B</span>
        </div>
        <div class="receipts-track">
          <div class="receipts-fill ${item.colorClass}" style="width: ${item.percentageWidth}%;"></div>
        </div>
      </div>
    `).join('');

    this.element.innerHTML = `
      <div class="bottom-card-header flex-between" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
        <div>
          <h3 class="bottom-card-title">TOP TOURISM RECEIPTS BY STATE</h3>
          <span class="bottom-card-subtitle">Tourism receipts (RM billion)</span>
        </div>
        <div class="receipts-info-slot"></div>
      </div>
      <div class="bottom-card-list">
        ${listHtml}
      </div>
    `;

    const infoSlot = this.element.querySelector('.receipts-info-slot');
    if (infoSlot) {
      const infoIcon = createInfoIcon({
        sourceOrg: 'Department of Statistics Malaysia (DOSM) & Tourism Malaysia',
        datasetName: 'State Tourism Receipts & Economic Yield Accounts',
        referenceYear: '2025',
        measure: 'Direct visitor receipts across top-earning Malaysian states in RM Billion.',
        formula: 'State Receipts = Domestic Visitor Spend + Inbound International Tourist Spend',
        limitations: 'Captures direct tourism gross output; inter-state trade leakage not subtracted.',
      });
      infoSlot.replaceWith(infoIcon);
    }
  }
}
