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
  scenarioSource: string;
  scenarioName?: string;
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
 * Unified Simulation Engine
 * Formula:
 * Scenario Visitors = Current Visitors * (1 + Demand Change %)
 * Scenario Rooms = Current Rooms * (1 + Capacity Change %)
 * Scenario VTR = Scenario Visitors / Scenario Rooms
 * Demand-Capacity Gap = Demand Change % - Capacity Change % (in pp)
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
    scenarioSource: params.scenarioSource,
    scenarioName: params.scenarioName,
  };
}
