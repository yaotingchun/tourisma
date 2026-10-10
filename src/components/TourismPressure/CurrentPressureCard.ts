import type { TourismPressureStateData } from './pressureData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class CurrentPressureCard {
  public readonly element: HTMLElement;

  constructor(initialData: TourismPressureStateData) {
    this.element = document.createElement('div');
    this.element.className = 'pressure-kpi-grid';
    this.render(initialData);
  }

  public update(data: TourismPressureStateData): void {
    this.render(data);
  }

  private render(data: TourismPressureStateData): void {
    this.element.innerHTML = '';

    const visStr = data.domesticVisitorsM >= 100
      ? `${data.domesticVisitorsM.toFixed(1)}M`
      : `${data.domesticVisitorsM.toFixed(2)}M`;

    const intlStr = data.internationalHotelGuestsM >= 10
      ? `${data.internationalHotelGuestsM.toFixed(1)}M`
      : `${data.internationalHotelGuestsM.toFixed(2)}M`;

    const kpis = [
      {
        title: 'VISITOR DEMAND',
        value: visStr,
        subtext: `${visStr} Domestic · ${intlStr} Int'l Guests`,
        accentColor: '#2563eb', // Royal Blue
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        iconSvg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        `,
        tooltip: {
          sourceOrg: 'Department of Statistics Malaysia (DOSM) & Tourism Malaysia',
          datasetName: 'Domestic Tourism Survey & International Hotel Guest Registry',
          referenceYear: '2025 / 2026',
          measure: 'Aggregated state visitor inflow comprising domestic excursionists/tourists and registered international hotel guests.',
          formula: 'Annual Domestic Visitors + International Hotel Guests',
          limitations: 'International counts capture hotel guests and border crossings; excludes unregistered day-trippers.',
        },
      },
      {
        title: 'ACCOMMODATION UTILISATION',
        value: `AOR ${data.aorPct.toFixed(1)}%`,
        subtext: `${data.visitorToRoomRatio.toFixed(1)} / room · ${data.accommodationRooms.toLocaleString()} rooms`,
        accentColor: '#d97706', // Amber
        iconBg: '#fffbeb',
        iconColor: '#d97706',
        iconSvg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 4v16"></path>
            <path d="M2 8h18a2 2 0 0 1 2 2v10"></path>
            <path d="M2 17h20"></path>
            <path d="M6 8v9"></path>
          </svg>
        `,
        tooltip: {
          sourceOrg: 'Tourism Malaysia Hotel Survey & NAPIC Commercial Property',
          datasetName: 'Accommodation Capacity & Average Occupancy Registry',
          referenceYear: '2025 / 2026',
          measure: 'Observed Average Occupancy Rate (AOR) alongside annual visitor-to-room pressure ratio.',
          formula: 'AOR (%) = (Occupied Room Nights / Available Room Nights) × 100; Visitor Ratio = Total Visitors / Total Rooms',
          limitations: 'AOR represents registered hotel establishments; short-term rental properties (e.g. Airbnb) estimated separately.',
        },
      },
      {
        title: 'SPATIAL ACCESSIBILITY',
        value: `Road ${data.roadAccessRate.toFixed(1)}%`,
        subtext: `PT Access ${data.ptAccessRate.toFixed(1)}% · ${data.roadAccessRate >= 40 ? 'High Arterial' : 'Developing Corridor'}`,
        accentColor: '#059669', // Emerald
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        iconSvg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="6" cy="19" r="3"></circle>
            <path d="M9 19h8.5a4.5 4.5 0 0 0 4.5-4.5v0a4.5 4.5 0 0 0-4.5-4.5H14"></path>
            <circle cx="18" cy="5" r="3"></circle>
            <path d="M12 9v10"></path>
          </svg>
        `,
        tooltip: {
          sourceOrg: 'Jabatan Kerja Raya (JKR) & Agensi Pengangkutan Awam Darat (APAD)',
          datasetName: 'Spatial Multi-Modal Transit & Arterial Highway Density Index',
          referenceYear: '2025 / 2026',
          measure: 'Proportion of tourism inventory located within 3km of primary arterial highways or public transit corridors.',
          formula: 'Accessibility Rate = (Accessible Assets / Total State Assets) × 100',
          limitations: 'Reflects spatial distance to transit infrastructure; schedule frequency and congestion delay not captured.',
        },
      },
      {
        title: 'ENVIRONMENTAL PROXIMITY',
        value: `${data.environmentalExposureRate.toFixed(1)}%`,
        subtext: `${data.environmentalExposureRate >= 35 ? 'Elevated Buffer Proximity' : 'Moderate Ecological Buffer'}`,
        accentColor: '#7c3aed', // Violet
        iconBg: '#f5f3ff',
        iconColor: '#7c3aed',
        iconSvg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
          </svg>
        `,
        tooltip: {
          sourceOrg: 'Department of Wildlife and National Parks (PERHILITAN) & Department of Fisheries',
          datasetName: 'Protected Reserves & Ecological Sensitivity Buffer Register',
          referenceYear: '2025 / 2026',
          measure: 'Percentage of state tourism assets situated within 5km of gazetted terrestrial or marine protected areas.',
          formula: 'Exposure Rate = (Assets in 5km Protected Buffer / Total Assets) × 100',
          limitations: 'Evaluates spatial buffer overlap; on-site conservation carrying capacity varies by reserve management.',
        },
      },
    ];

    kpis.forEach((kpi) => {
      const card = document.createElement('div');
      card.className = 'pressure-kpi-card';
      card.style.setProperty('--card-accent', kpi.accentColor);
      card.style.setProperty('--icon-bg', kpi.iconBg);
      card.style.setProperty('--icon-color', kpi.iconColor);

      const infoDiv = document.createElement('div');
      infoDiv.className = 'pressure-kpi-info';

      const titleRow = document.createElement('div');
      titleRow.style.display = 'flex';
      titleRow.style.alignItems = 'center';
      titleRow.style.justifyContent = 'space-between';
      titleRow.style.width = '100%';

      const titleEl = document.createElement('span');
      titleEl.className = 'pressure-kpi-title';
      titleEl.textContent = kpi.title;

      const infoIcon = createInfoIcon(kpi.tooltip);

      titleRow.appendChild(titleEl);
      titleRow.appendChild(infoIcon);

      const valRow = document.createElement('div');
      valRow.className = 'pressure-kpi-value-row';
      valRow.innerHTML = `<span class="pressure-kpi-value">${kpi.value}</span>`;

      const subEl = document.createElement('span');
      subEl.className = 'pressure-kpi-subtext';
      subEl.title = kpi.subtext;
      subEl.textContent = kpi.subtext;

      infoDiv.appendChild(titleRow);
      infoDiv.appendChild(valRow);
      infoDiv.appendChild(subEl);

      const iconWrap = document.createElement('div');
      iconWrap.className = 'pressure-kpi-icon-wrap';
      iconWrap.innerHTML = kpi.iconSvg;

      card.appendChild(infoDiv);
      card.appendChild(iconWrap);
      this.element.appendChild(card);
    });
  }
}
