import {
  createElement,
  Hospital,
  Bed,
  HeartPulse,
  Activity,
} from 'lucide';
import {
  NATIONAL_HEALTHCARE_SUMMARY,
  getStateHealthcare,
  type StateHealthcareData,
} from '../../data/healthcareData';
import { createInfoIcon } from '../Common/InfoTooltip';

export class HealthcareKPIStrip {
  public readonly element: HTMLElement;
  private selectedStateId: string | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'hc-kpi-grid';
    this.render();
  }

  public updateState(stateId: string | null): void {
    this.selectedStateId = stateId;
    this.render();
  }

  private render(): void {
    this.element.innerHTML = '';

    const stateData: StateHealthcareData | undefined = this.selectedStateId
      ? getStateHealthcare(this.selectedStateId)
      : undefined;

    const isState = !!stateData;
    const scopeLabel = isState ? stateData.code : 'NATIONAL';

    // 1. Healthcare Facilities
    const facilitiesCount = isState ? stateData.totalFacilities : NATIONAL_HEALTHCARE_SUMMARY.totalFacilities;
    const hospitalsCount = isState ? stateData.hospitals : NATIONAL_HEALTHCARE_SUMMARY.totalHospitals;
    const clinicsCount = isState ? stateData.clinics : NATIONAL_HEALTHCARE_SUMMARY.totalClinics;

    // 2. Hospital Beds
    const bedsCount = isState ? stateData.totalBeds : NATIONAL_HEALTHCARE_SUMMARY.totalBeds;
    const icuBeds = isState ? stateData.bedsIcu : 893;

    // 3. Healthcare Access
    const accessPct = isState ? stateData.healthcareAccessRate5km : NATIONAL_HEALTHCARE_SUMMARY.accessRate5km;
    const immediatePct = isState ? stateData.primaryAccessTiers.highPct : NATIONAL_HEALTHCARE_SUMMARY.accessRate2km;

    // 4. Bed Occupancy Rate
    const bor = isState ? stateData.bedOccupancyRate : NATIONAL_HEALTHCARE_SUMMARY.bedOccupancyRate;

    const kpis = [
      {
        title: 'Healthcare Facilities',
        value: facilitiesCount.toLocaleString(),
        badgeText: isState ? `${hospitalsCount} Hospitals • ${scopeLabel}` : `${hospitalsCount} Hospitals`,
        badgeColor: 'blue',
        subtext: `${clinicsCount.toLocaleString()} clinics & pharmacies registered`,
        icon: Hospital,
        accentColor: '#2563eb', // Royal Blue
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        tooltip: {
          sourceOrg: 'Ministry of Health Malaysia (MOH)',
          datasetName: 'National Healthcare Facilities Directory',
          referenceYear: '2025',
          measure: 'Total registered healthcare facilities including public hospitals, private hospitals, clinics, and pharmacies.',
          formula: 'Total = Hospitals + Clinics + Community Health Centres + Pharmacies',
          limitations: 'Private clinics in rural areas may be undercounted; mobile health units excluded.',
        },
      },
      {
        title: 'Hospital Beds',
        value: bedsCount.toLocaleString(),
        badgeText: isState ? `${icuBeds} ICU • ${scopeLabel}` : `${icuBeds} ICU Beds`,
        badgeColor: 'purple',
        subtext: 'Operational physical beds (MOH)',
        icon: Bed,
        accentColor: '#7c3aed', // Purple
        iconBg: '#f5f3ff',
        iconColor: '#7c3aed',
        tooltip: {
          sourceOrg: 'Ministry of Health Malaysia (MOH) Hospital Statistics',
          datasetName: 'National Hospital Bed Capacity Register',
          referenceYear: '2025',
          measure: 'Total operational hospital beds including ICU, general ward, and specialist beds across public hospitals.',
          formula: 'Total Beds = General Beds + ICU Beds + Specialist Beds + Day Care Beds',
          limitations: 'Counts licensed capacity; actual available beds may vary due to maintenance or staffing constraints.',
        },
      },
      {
        title: 'Healthcare Access Rate',
        value: `${accessPct.toFixed(1)}%`,
        badgeText: 'Within 5 km',
        badgeColor: 'emerald',
        subtext: `${immediatePct.toFixed(1)}% within ≤ 2 km immediate reach`,
        icon: HeartPulse,
        accentColor: '#059669', // Emerald
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        tooltip: {
          sourceOrg: 'DOSM GeoPadang & MOH Facility GIS',
          datasetName: 'Healthcare Spatial Accessibility Index',
          referenceYear: '2025',
          measure: 'Percentage of population within 5 km of any registered healthcare facility by road network.',
          formula: 'Access Rate = (Population within 5 km of facility / Total Population) × 100',
          limitations: 'Based on straight-line proximity; actual travel time by road may differ significantly in rural areas.',
        },
      },
      {
        title: 'Bed Occupancy Rate',
        value: `${bor.toFixed(1)}%`,
        badgeText: bor >= 75 ? 'High Load' : bor >= 50 ? 'Moderate' : 'Headroom',
        badgeColor: bor >= 75 ? 'orange' : bor >= 50 ? 'blue' : 'emerald',
        subtext: 'State clinical service utilisation (MOH)',
        icon: Activity,
        accentColor: bor >= 75 ? '#ea580c' : bor >= 50 ? '#2563eb' : '#059669',
        iconBg: bor >= 75 ? '#fff7ed' : bor >= 50 ? '#eff6ff' : '#ecfdf5',
        iconColor: bor >= 75 ? '#ea580c' : bor >= 50 ? '#2563eb' : '#059669',
        tooltip: {
          sourceOrg: 'Ministry of Health Malaysia (MOH) Hospital Activity Statistics',
          datasetName: 'National Bed Occupancy Rate (BOR)',
          referenceYear: '2025',
          measure: 'Weighted average percentage of hospital beds occupied at any given time across the state or nation.',
          formula: 'BOR = (Total Patient Bed Days / Total Available Bed Days) × 100',
          limitations: 'National/state averages may mask acute local shortages at specific hospital level.',
        },
      },
    ];

    kpis.forEach((kpi) => {
      const card = document.createElement('div');
      card.className = 'hc-kpi-card';
      card.style.setProperty('--card-accent', kpi.accentColor);
      card.style.setProperty('--icon-bg', kpi.iconBg);
      card.style.setProperty('--icon-color', kpi.iconColor);

      // Info left
      const infoDiv = document.createElement('div');
      infoDiv.className = 'hc-kpi-info';

      const titleEl = document.createElement('h4');
      titleEl.className = 'hc-kpi-title';
      titleEl.textContent = kpi.title;

      if (kpi.tooltip) {
        const infoIcon = createInfoIcon(kpi.tooltip);
        infoIcon.style.marginLeft = '6px';
        infoIcon.style.verticalAlign = 'middle';
        titleEl.appendChild(infoIcon);
      }

      const valWrap = document.createElement('div');
      valWrap.className = 'hc-kpi-value-wrap';

      const valEl = document.createElement('span');
      valEl.className = 'hc-kpi-value';
      valEl.textContent = kpi.value;
      valWrap.appendChild(valEl);

      const badgeEl = document.createElement('span');
      badgeEl.className = `hc-kpi-badge ${kpi.badgeColor}`;
      badgeEl.textContent = kpi.badgeText;
      valWrap.appendChild(badgeEl);

      const subEl = document.createElement('span');
      subEl.className = 'hc-kpi-subtext';
      subEl.textContent = kpi.subtext;

      infoDiv.appendChild(titleEl);
      infoDiv.appendChild(valWrap);
      infoDiv.appendChild(subEl);

      // Icon right
      const iconWrap = document.createElement('div');
      iconWrap.className = 'hc-kpi-icon-wrap';

      const iconSvg = createElement(kpi.icon, {
        width: 22,
        height: 22,
        'stroke-width': 2,
      });
      iconWrap.appendChild(iconSvg);

      card.appendChild(infoDiv);
      card.appendChild(iconWrap);
      this.element.appendChild(card);
    });
  }
}
