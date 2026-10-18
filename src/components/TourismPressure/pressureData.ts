import { STATES_OVERVIEW_DATA } from '../../data/overviewData';

export interface TourismPressureStateData {
  id: string;
  name: string;
  shortName: string;
  code: string;
  region: 'Peninsular' | 'Borneo' | 'National';
  domesticVisitors: number;
  domesticVisitorsM: number;
  internationalHotelGuests: number;
  internationalHotelGuestsM: number;
  accommodationRooms: number;
  accommodationEstablishments: number;
  aorPct: number;
  visitorToRoomRatio: number;
  roadAccessRate: number;
  ptAccessRate: number;
  environmentalExposureRate: number;
  quadrant: string;
  cluster: string;
}

export interface ScenarioParameters {
  mode: 'forecast' | 'seasonal' | 'custom';
  demandChangePct: number;
  capacityChangePct: number;
  scenarioSource: string;
  scenarioName?: string;
}

export interface SimulationResult {
  currentVisitors: number;
  scenarioVisitors: number;
  currentRooms: number;
  scenarioRooms: number;
  currentVtr: number;
  scenarioVtr: number;
  demandChangePct: number;
  capacityChangePct: number;
  demandCapacityGapPp: number;
  observedAorPct: number;
  scenarioAorPct: number;
  scenarioSource: string;
  scenarioName?: string;
  tpiBreakdown: TpiBreakdown;
  allStatesTpi: Record<string, TpiBreakdown>;
}

export interface TpiBreakdown {
  stateId: string;
  stateName: string;
  scenarioVisitors: number;
  scenarioRooms: number;
  scenarioVtr: number;
  scenarioAor: number;
  scenarioRoad: number;
  scenarioPt: number;
  environmentalExposureRate: number; // Kept separate per Step 5

  normVtr: number;
  normAor: number;
  normRoad: number;
  normPt: number;

  accommodationScore: number; // A = 0.5*normVtr + 0.5*normAor
  accessibilityGapScore: number; // G = 0.5*(100 - normRoad) + 0.5*(100 - normPt)
  tpi: number; // TPI = 0.70*A + 0.30*G
  baselineTpi: number;
  tpiDelta: number; // scenario TPI - baseline TPI
  pressureCategory: string;
  color: string;
}

/**
 * Normalization Reference Values (Min & Max) across all 16 states in Malaysia
 * Formula: N(x) = ((x - min) / (max - min)) * 100
 */
export const TPI_REFERENCE_BOUNDS = {
  vtr: { min: 263.23, max: 2522.28 },
  aor: { min: 37.0, max: 75.6 },
  road: { min: 13.89, max: 97.5 },
  pt: { min: 11.11, max: 100.0 },
};

export function minMaxNormalize(x: number, min: number, max: number): number {
  if (max === min) return 50;
  const raw = ((x - min) / (max - min)) * 100;
  return Number(Math.max(0, Math.min(100, raw)).toFixed(1));
}

export function getTpiColor(tpi: number): string {
  if (tpi >= 65) return '#1e3a8a'; // Critical Pressure: Dark Navy Blue
  if (tpi >= 55) return '#1d4ed8'; // High Pressure: Deep Blue
  if (tpi >= 45) return '#2563eb'; // Elevated Pressure: Royal Blue
  if (tpi >= 35) return '#60a5fa'; // Moderate Pressure: Azure Sky Blue
  return '#bfdbfe';                // Low Pressure: Soft Light Blue
}

export function getTpiTextColor(tpi: number): string {
  if (tpi < 35) return '#1e3a8a';
  return '#ffffff';
}

export function getTpiCategory(tpi: number): string {
  if (tpi >= 65) return 'Critical Pressure';
  if (tpi >= 55) return 'High Pressure';
  if (tpi >= 45) return 'Elevated Pressure';
  if (tpi >= 35) return 'Moderate Pressure';
  return 'Low Pressure';
}

/**
 * Step 1: Accommodation Pressure Score:
 * A = 0.5 * N(Visitor-to-Room Ratio) + 0.5 * N(AOR)
 *
 * Step 2: Accessibility Gap Score:
 * G = 0.5 * (100 - N(Road)) + 0.5 * (100 - N(PT))
 *
 * Step 3: Final Tourism Pressure Index:
 * TPI = 0.70 * A + 0.30 * G
 */
export function calculateStateTpi(
  stateData: TourismPressureStateData,
  params: ScenarioParameters,
  weights = { a: 0.70, g: 0.30 }
): TpiBreakdown {
  const currentVisitors = stateData.domesticVisitors;
  const currentRooms = stateData.accommodationRooms;
  const currentVtr = stateData.visitorToRoomRatio;
  const currentAor = stateData.aorPct;
  const currentRoad = stateData.roadAccessRate;
  const currentPt = stateData.ptAccessRate;
  const envExposure = stateData.environmentalExposureRate;

  // Step 4: Scenario updates
  const scenarioVisitors = Math.round(currentVisitors * (1 + params.demandChangePct / 100));
  const scenarioRooms = Math.max(1, Math.round(currentRooms * (1 + params.capacityChangePct / 100)));
  const scenarioVtr = scenarioRooms > 0 ? Number((scenarioVisitors / scenarioRooms).toFixed(1)) : 0;

  // AOR adjusts with demand velocity relative to room capacity expansion
  const aorMultiplier = (1 + params.demandChangePct / 100) / (1 + params.capacityChangePct / 100);
  const scenarioAor = Number(Math.max(20, Math.min(98, currentAor * aorMultiplier)).toFixed(1));

  const scenarioRoad = currentRoad;
  const scenarioPt = currentPt;

  // Step 1: Accommodation Pressure Score A
  const normVtr = minMaxNormalize(scenarioVtr, TPI_REFERENCE_BOUNDS.vtr.min, TPI_REFERENCE_BOUNDS.vtr.max);
  const normAor = minMaxNormalize(scenarioAor, TPI_REFERENCE_BOUNDS.aor.min, TPI_REFERENCE_BOUNDS.aor.max);
  const A = Number((0.5 * normVtr + 0.5 * normAor).toFixed(1));

  // Step 2: Accessibility Gap Score G
  const normRoad = minMaxNormalize(scenarioRoad, TPI_REFERENCE_BOUNDS.road.min, TPI_REFERENCE_BOUNDS.road.max);
  const normPt = minMaxNormalize(scenarioPt, TPI_REFERENCE_BOUNDS.pt.min, TPI_REFERENCE_BOUNDS.pt.max);
  const G = Number((0.5 * (100 - normRoad) + 0.5 * (100 - normPt)).toFixed(1));

  // Step 3: Tourism Pressure Index
  const tpi = Number((weights.a * A + weights.g * G).toFixed(1));

  // Baseline TPI (0% shift)
  const baseNormVtr = minMaxNormalize(currentVtr, TPI_REFERENCE_BOUNDS.vtr.min, TPI_REFERENCE_BOUNDS.vtr.max);
  const baseNormAor = minMaxNormalize(currentAor, TPI_REFERENCE_BOUNDS.aor.min, TPI_REFERENCE_BOUNDS.aor.max);
  const baseA = 0.5 * baseNormVtr + 0.5 * baseNormAor;
  const baseNormRoad = minMaxNormalize(currentRoad, TPI_REFERENCE_BOUNDS.road.min, TPI_REFERENCE_BOUNDS.road.max);
  const baseNormPt = minMaxNormalize(currentPt, TPI_REFERENCE_BOUNDS.pt.min, TPI_REFERENCE_BOUNDS.pt.max);
  const baseG = 0.5 * (100 - baseNormRoad) + 0.5 * (100 - baseNormPt);
  const baselineTpi = Number((weights.a * baseA + weights.g * baseG).toFixed(1));
  const tpiDelta = Number((tpi - baselineTpi).toFixed(1));

  return {
    stateId: stateData.id,
    stateName: stateData.name,
    scenarioVisitors,
    scenarioRooms,
    scenarioVtr,
    scenarioAor,
    scenarioRoad,
    scenarioPt,
    environmentalExposureRate: envExposure,
    normVtr,
    normAor,
    normRoad,
    normPt,
    accommodationScore: A,
    accessibilityGapScore: G,
    tpi,
    baselineTpi,
    tpiDelta,
    pressureCategory: getTpiCategory(tpi),
    color: getTpiColor(tpi),
  };
}

export function calculateAllStatesTpi(
  params: ScenarioParameters,
  _selectedStateId = 'malaysia'
): Record<string, TpiBreakdown> {
  const result: Record<string, TpiBreakdown> = {};

  const stateIds = ALL_PRESSURE_STATES.map((s) => s.id);
  for (const sid of stateIds) {
    const sData = getPressureStateData(sid);
    result[sid] = calculateStateTpi(sData, params);
  }

  return result;
}

// Compute Whole Malaysia aggregated data
function buildNationalData(): TourismPressureStateData {
  const states = Object.values(STATES_OVERVIEW_DATA);
  const totalDomestic = states.reduce((sum, s) => sum + s.domesticVisitors, 0);
  const totalDomesticM = Number((totalDomestic / 1e6).toFixed(2));
  const totalInternational = states.reduce((sum, s) => sum + s.internationalHotelGuests, 0);
  const totalInternationalM = Number((totalInternational / 1e6).toFixed(2));
  const totalRooms = states.reduce((sum, s) => sum + s.accommodationRooms, 0);
  const totalEst = states.reduce((sum, s) => sum + s.accommodationEstablishments, 0);

  // Weighted average AOR
  const weightedAor = states.reduce((sum, s) => sum + (s.aorPct * s.accommodationRooms), 0) / (totalRooms || 1);
  const vtr = totalRooms > 0 ? Number((totalDomestic / totalRooms).toFixed(1)) : 0;

  // Averages for spatial rates
  const avgRoad = Number((states.reduce((sum, s) => sum + s.roadAccessRate, 0) / states.length).toFixed(1));
  const avgPt = Number((states.reduce((sum, s) => sum + s.ptAccessRate, 0) / states.length).toFixed(1));
  const avgEnv = Number((states.reduce((sum, s) => sum + s.environmentalExposureRate, 0) / states.length).toFixed(1));

  return {
    id: 'malaysia',
    name: 'Whole Malaysia',
    shortName: 'Malaysia',
    code: 'MYS',
    region: 'National',
    domesticVisitors: totalDomestic,
    domesticVisitorsM: totalDomesticM,
    internationalHotelGuests: totalInternational,
    internationalHotelGuestsM: totalInternationalM,
    accommodationRooms: totalRooms,
    accommodationEstablishments: totalEst,
    aorPct: Number(weightedAor.toFixed(1)),
    visitorToRoomRatio: vtr,
    roadAccessRate: avgRoad,
    ptAccessRate: avgPt,
    environmentalExposureRate: avgEnv,
    quadrant: 'National Baseline / Systemic Overview',
    cluster: 'National Economy',
  };
}

export const NATIONAL_PRESSURE_DATA = buildNationalData();

export function getPressureStateData(stateId: string): TourismPressureStateData {
  if (stateId === 'malaysia' || stateId === 'all') {
    return NATIONAL_PRESSURE_DATA;
  }
  const raw = STATES_OVERVIEW_DATA[stateId];
  if (!raw) {
    return NATIONAL_PRESSURE_DATA;
  }

  return {
    id: raw.id,
    name: raw.name,
    shortName: raw.shortName,
    code: raw.code,
    region: raw.region,
    domesticVisitors: raw.domesticVisitors,
    domesticVisitorsM: raw.domesticVisitorsM,
    internationalHotelGuests: raw.internationalHotelGuests,
    internationalHotelGuestsM: raw.internationalHotelGuestsM,
    accommodationRooms: raw.accommodationRooms,
    accommodationEstablishments: raw.accommodationEstablishments,
    aorPct: raw.aorPct,
    visitorToRoomRatio: raw.visitorToRoomRatio,
    roadAccessRate: raw.roadAccessRate,
    ptAccessRate: raw.ptAccessRate,
    environmentalExposureRate: raw.environmentalExposureRate,
    quadrant: raw.quadrant,
    cluster: raw.cluster,
  };
}

export const ALL_PRESSURE_STATES: Array<{ id: string; name: string }> = [
  { id: 'malaysia', name: 'Whole Malaysia (National)' },
  { id: 'pahang', name: 'Pahang' },
  { id: 'selangor', name: 'Selangor' },
  { id: 'kuala_lumpur', name: 'W.P. Kuala Lumpur' },
  { id: 'johor', name: 'Johor' },
  { id: 'penang', name: 'Pulau Pinang' },
  { id: 'perak', name: 'Perak' },
  { id: 'sabah', name: 'Sabah' },
  { id: 'sarawak', name: 'Sarawak' },
  { id: 'kedah', name: 'Kedah' },
  { id: 'melaka', name: 'Melaka' },
  { id: 'terengganu', name: 'Terengganu' },
  { id: 'kelantan', name: 'Kelantan' },
  { id: 'negeri_sembilan', name: 'Negeri Sembilan' },
  { id: 'perlis', name: 'Perlis' },
  { id: 'putrajaya', name: 'W.P. Putrajaya' },
  { id: 'labuan', name: 'W.P. Labuan' },
];

/**
 * Unified Simulation Engine with Tourism Pressure Index
 */
export function calculateScenarioSimulation(
  stateData: TourismPressureStateData,
  params: ScenarioParameters
): SimulationResult {
  const currentVisitors = stateData.domesticVisitors;
  const currentRooms = stateData.accommodationRooms;
  const currentVtr = stateData.visitorToRoomRatio;

  const scenarioVisitors = Math.round(currentVisitors * (1 + params.demandChangePct / 100));
  const scenarioRooms = Math.max(1, Math.round(currentRooms * (1 + params.capacityChangePct / 100)));
  const scenarioVtr = scenarioRooms > 0 ? Number((scenarioVisitors / scenarioRooms).toFixed(1)) : 0;
  const demandCapacityGapPp = Number((params.demandChangePct - params.capacityChangePct).toFixed(1));

  const tpiBreakdown = calculateStateTpi(stateData, params);
  const allStatesTpi = calculateAllStatesTpi(params, stateData.id);

  return {
    currentVisitors,
    scenarioVisitors,
    currentRooms,
    scenarioRooms,
    currentVtr,
    scenarioVtr,
    demandChangePct: params.demandChangePct,
    capacityChangePct: params.capacityChangePct,
    demandCapacityGapPp,
    observedAorPct: stateData.aorPct,
    scenarioAorPct: tpiBreakdown.scenarioAor,
    scenarioSource: params.scenarioSource,
    scenarioName: params.scenarioName,
    tpiBreakdown,
    allStatesTpi,
  };
}
