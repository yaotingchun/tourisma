// Reusable Dataset Information & Methodology Tooltip
// Conforms to Tourisma data governance guidelines: Organization, Dataset Name, Year, Measure, Formula & Limitations.

export interface InfoTooltipConfig {
  sourceOrg: string;
  datasetName: string;
  referenceYear: string;
  measure: string;
  formula?: string;
  limitations?: string;
}

let activeFloatingTooltip: HTMLElement | null = null;

function ensureFloatingTooltip(): HTMLElement {
  if (!activeFloatingTooltip) {
    activeFloatingTooltip = document.createElement('div');
    activeFloatingTooltip.className = 'global-info-floating-tooltip';
    activeFloatingTooltip.style.display = 'none';
    activeFloatingTooltip.style.visibility = 'hidden';
    activeFloatingTooltip.style.position = 'fixed';
    document.body.appendChild(activeFloatingTooltip);

    window.addEventListener('scroll', hideActiveTooltip, { passive: true });
    window.addEventListener('resize', hideActiveTooltip, { passive: true });
  }
  return activeFloatingTooltip;
}

function hideActiveTooltip(): void {
  if (activeFloatingTooltip && activeFloatingTooltip.style.display !== 'none') {
    activeFloatingTooltip.style.display = 'none';
    activeFloatingTooltip.style.visibility = 'hidden';
  }
}

export function createInfoIcon(config: InfoTooltipConfig): HTMLElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'info-tooltip-trigger';
  btn.setAttribute('aria-label', `Data source info: ${config.datasetName}`);
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  `;

  const tooltip = ensureFloatingTooltip();

  const show = () => {
    tooltip.innerHTML = `
      <div class="info-tooltip-content">
        <div class="info-tooltip-header">
          <span class="info-tooltip-badge">DATA SOURCE</span>
          <span class="info-tooltip-year">${config.referenceYear}</span>
        </div>
        <div class="info-tooltip-org">${config.sourceOrg}</div>
        <div class="info-tooltip-dataset">${config.datasetName}</div>
        
        <div class="info-tooltip-section">
          <div class="info-tooltip-label">What it measures:</div>
          <div class="info-tooltip-text">${config.measure}</div>
        </div>

        ${
          config.formula
            ? `
          <div class="info-tooltip-section">
            <div class="info-tooltip-label">Formula / Method:</div>
            <div class="info-tooltip-code">${config.formula}</div>
          </div>
        `
            : ''
        }

        ${
          config.limitations
            ? `
          <div class="info-tooltip-limitations">
            <div class="info-tooltip-limitations-title">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2.2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Limitations</span>
            </div>
            <div class="info-tooltip-limitations-text">${config.limitations}</div>
          </div>
        `
            : ''
        }
      </div>
    `;

    const rect = btn.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'hidden';

    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Constrain width and height so tooltip can NEVER exceed viewport
    const maxTooltipWidth = Math.min(300, vw - margin * 2);
    tooltip.style.width = `${maxTooltipWidth}px`;
    tooltip.style.maxWidth = `${maxTooltipWidth}px`;
    tooltip.style.maxHeight = `${vh - margin * 2}px`;
    tooltip.style.overflowY = 'auto';

    // Measure exact rendered dimensions
    const ttRect = tooltip.getBoundingClientRect();
    const actualWidth = ttRect.width || maxTooltipWidth;
    const actualHeight = ttRect.height;

    // Horizontal placement:
    // Center horizontally over the trigger button
    let left = rect.left + rect.width / 2 - actualWidth / 2;

    // Clamp right boundary
    if (left + actualWidth > vw - margin) {
      left = vw - margin - actualWidth;
    }
    // Clamp left boundary
    if (left < margin) {
      left = margin;
    }

    // Vertical placement:
    // Prefer below the trigger button if there is enough space
    const spaceBelow = vh - rect.bottom - 8;
    const spaceAbove = rect.top - 8;

    let top: number;
    if (spaceBelow >= actualHeight) {
      top = rect.bottom + 8;
    } else if (spaceAbove >= actualHeight) {
      top = rect.top - actualHeight - 8;
    } else {
      // Pick the side with more space
      if (spaceBelow >= spaceAbove) {
        top = rect.bottom + 8;
      } else {
        top = rect.top - actualHeight - 8;
      }
    }

    // Strictly clamp within viewport margins
    top = Math.max(margin, Math.min(top, vh - margin - actualHeight));

    tooltip.style.top = `${Math.round(top)}px`;
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.visibility = 'visible';
  };

  const hide = () => {
    tooltip.style.display = 'none';
    tooltip.style.visibility = 'hidden';
  };

  btn.addEventListener('mouseenter', show);
  btn.addEventListener('mouseleave', hide);
  btn.addEventListener('focus', show);
  btn.addEventListener('blur', hide);

  return btn;
}
