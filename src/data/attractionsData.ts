// Attraction-level spatial readiness & diagnostic dataset for Tourisma
// Integrated with official OpenStreetMap coverage layers:
// - OSM Core Attractions (5,491 total / 2,825 named facilities)
// - OSM Road Accessibility Network (distance to road, tier, highway name)
// - OSM Healthcare Accessibility (distance to emergency hospital/clinic)
// - OSM Environment & Protected Areas Relationship (proximity to reserve, IUCN status)
// - OSM Supporting Hospitality Clusters (nearby accommodation & dining counts)

import osmDataRaw from './destinationsOsmData.json';

export interface LocationReadiness {
  // Accessibility
  roadDistanceMeters: number;
  roadDistanceText: string;
  roadAccessTier: 'High Access' | 'Moderate Access' | 'Low Access';
  roadTierDescription: string;
  ptDistanceMeters: number;
  ptDistanceText: string;
  ptAccessTier: 'High Access' | 'Moderate Access' | 'Low Access';
  ptTierDescription: string;

  // Tourism support (5 km radius spatial inventory)
  nearbyAccommodationCount: number;
  accommodationRadiusKm: number;
  nearbyFbCount: number;
  fbRadiusKm: number;
  nearbyTransportFacilitiesCount: number;
  transportRadiusKm: number;
  nearestHealthcareKm: number;
  healthcareFacilityName: string;
  healthcareStatus: 'Well-Served' | 'Moderate Distance' | 'Limited / Remote';

  // Environment & protected reserves
  insideProtectedArea: boolean;
  nearProtectedArea: boolean;
  distanceToSensitiveKm: number;
  sensitiveAreaName: string;
  environmentTier: 'Near Sensitive Area' | 'High Sensitivity' | 'Moderate Buffer' | 'Low Ecological Exposure';
}

export interface DiagnosticItem {
  status: string;
  color: string;
  iconBg: string;
  badge: string;
  note: string;
}

export interface LocalDiagnosticProxy {
  demand: DiagnosticItem;
  infrastructure: DiagnosticItem;
  accessibility: DiagnosticItem;
  healthcare: DiagnosticItem;
  environment: DiagnosticItem;
}

export interface AttractionItem {
  id: string;
  name: string;
  aliases: string[];
  stateId: string;
  stateName: string;
  district: string;
  category: 'Core Attraction' | 'Supporting Heritage' | 'Natural Sanctuary' | 'Recreation & Leisure';
  subcategory: string;
  description: string;
  svgCoordinates: { x: number; y: number };
  latLng: { lat: number; lng: number };
  readiness: LocationReadiness;
  readinessAssessment: string;
  diagnostic: LocalDiagnosticProxy;
}

function unpackAttraction(row: any[]): AttractionItem {
  const [
    id,
    name,
    stateId,
    stateName,
    district,
    category,
    subcategory,
    svgX,
    svgY,
    lat,
    lon,
    roadM,
    roadTier,
    roadDesc,
    ptM,
    ptTier,
    ptDesc,
    accCount,
    fbCount,
    hcKm,
    hcName,
    hcStatus,
    envKm,
    envName,
    insideProt,
    envTier,
    aliases,
  ] = row;

  const roadText = roadM < 1000 ? `${Math.round(roadM)} m` : `${(roadM / 1000).toFixed(1)} km`;
  const ptText = ptM < 1000 ? `${Math.round(ptM)} m` : `${(ptM / 1000).toFixed(1)} km`;

  const readiness: LocationReadiness = {
    roadDistanceMeters: roadM,
    roadDistanceText: roadText,
    roadAccessTier: roadTier,
    roadTierDescription: roadDesc,
    ptDistanceMeters: ptM,
    ptDistanceText: ptText,
    ptAccessTier: ptTier,
    ptTierDescription: ptDesc,
    nearbyAccommodationCount: accCount,
    accommodationRadiusKm: 5,
    nearbyFbCount: fbCount,
    fbRadiusKm: 5,
    nearbyTransportFacilitiesCount: Math.max(1, Math.min(12, Math.round(ptM / 400))),
    transportRadiusKm: 5,
    nearestHealthcareKm: hcKm,
    healthcareFacilityName: hcName,
    healthcareStatus: hcStatus,
    insideProtectedArea: insideProt === 1,
    nearProtectedArea: insideProt === 1 || envKm <= 1.0,
    distanceToSensitiveKm: envKm,
    sensitiveAreaName: envName,
    environmentTier: envTier,
  };

  const infraStatus: 'Good' | 'Moderate' | 'Limited' =
    accCount >= 15 ? 'Good' : accCount >= 5 ? 'Moderate' : 'Limited';
  const accDiagStatus: 'Good' | 'Moderate' | 'Limited' =
    roadM <= 500 ? 'Good' : roadM <= 2000 ? 'Moderate' : 'Limited';
  const hcDiagStatus: 'Adequate' | 'Moderate' | 'Limited' =
    hcKm <= 3.5 ? 'Adequate' : hcKm <= 10.0 ? 'Moderate' : 'Limited';
  const envDiagStatus: 'Low Exposure' | 'Moderate Buffer' | 'Sensitive' =
    envKm >= 3.5 ? 'Low Exposure' : envKm >= 1.0 ? 'Moderate Buffer' : 'Sensitive';

  const cleanRoadName = roadDesc ? roadDesc.replace('Direct ingress via ', '') : 'arterial road network';
  let readinessAssessment = `Features ${roadText} road access to ${cleanRoadName} with ${accCount} accommodations within 5 km; nearest medical facility is ${hcKm} km (${hcName}).`;
  if (insideProt === 1 || envKm <= 0.5) {
    readinessAssessment += ` Environmental protection required for proximity to ${envName}.`;
  }

  const diagnostic: LocalDiagnosticProxy = {
    demand: {
      status: 'Not available at attraction level',
      color: '#64748b',
      iconBg: '#f1f5f9',
      badge: '⚪ Not available at attraction level',
      note: `Turnstile visitor ticketing logs are proprietary or unobserved. Evaluated purely on ${stateName} macro baseline.`,
    },
    infrastructure: {
      status: infraStatus,
      color: infraStatus === 'Good' ? '#10b981' : infraStatus === 'Moderate' ? '#f59e0b' : '#ef4444',
      iconBg: infraStatus === 'Good' ? '#ecfdf5' : infraStatus === 'Moderate' ? '#fffbeb' : '#fef2f2',
      badge: `${infraStatus === 'Good' ? '🟢' : infraStatus === 'Moderate' ? '🟡' : '🔴'} ${infraStatus}`,
      note: `${accCount} lodging facilities and ${fbCount} F&B venues within 5 km provide tourist service capacity.`,
    },
    accessibility: {
      status: accDiagStatus,
      color: accDiagStatus === 'Good' ? '#10b981' : accDiagStatus === 'Moderate' ? '#f59e0b' : '#ef4444',
      iconBg: accDiagStatus === 'Good' ? '#ecfdf5' : accDiagStatus === 'Moderate' ? '#fffbeb' : '#fef2f2',
      badge: `${accDiagStatus === 'Good' ? '🟢' : accDiagStatus === 'Moderate' ? '🟡' : '🔴'} ${accDiagStatus}`,
      note: `${roadText} access distance via ${cleanRoadName}.`,
    },
    healthcare: {
      status: hcDiagStatus,
      color: hcDiagStatus === 'Adequate' ? '#10b981' : hcDiagStatus === 'Moderate' ? '#f59e0b' : '#ef4444',
      iconBg: hcDiagStatus === 'Adequate' ? '#ecfdf5' : hcDiagStatus === 'Moderate' ? '#fffbeb' : '#fef2f2',
      badge: `${hcDiagStatus === 'Adequate' ? '🟢' : hcDiagStatus === 'Moderate' ? '🟡' : '🔴'} ${hcDiagStatus}`,
      note: `${hcKm} km distance to nearest emergency medical responder (${hcName}).`,
    },
    environment: {
      status: envDiagStatus,
      color: envDiagStatus === 'Low Exposure' ? '#10b981' : envDiagStatus === 'Moderate Buffer' ? '#f59e0b' : '#ef4444',
      iconBg: envDiagStatus === 'Low Exposure' ? '#ecfdf5' : envDiagStatus === 'Moderate Buffer' ? '#fffbeb' : '#fef2f2',
      badge: `${envDiagStatus === 'Low Exposure' ? '🟢' : envDiagStatus === 'Moderate Buffer' ? '🟡' : '🔴'} ${envDiagStatus}`,
      note: `Located ${envKm} km from ${envName}.`,
    },
  };

  return {
    id,
    name,
    aliases: Array.isArray(aliases) ? aliases : [name.toLowerCase()],
    stateId,
    stateName,
    district,
    category,
    subcategory,
    description: '',
    svgCoordinates: { x: svgX, y: svgY },
    latLng: { lat, lng: lon },
    readiness,
    readinessAssessment,
    diagnostic,
  };
}

export const ATTRACTIONS_DATA: AttractionItem[] = (osmDataRaw as any[][]).map(unpackAttraction);

export interface SearchAttractionOptions {
  stateId?: string;
  category?: string;
  limit?: number;
}

// Premier curated flagships list for relevance boost
export const FLAGSHIP_IDS = new Set([
  'pulau_redang',
  'petronas_twin_towers',
  'cameron_highlands_tea',
  'batu_caves',
  'mount_kinabalu',
  'taman_negara',
  'langkawi_skybridge',
  'georgetown_heritage',
  'sunway_lagoon',
  'melaka_stadthuys',
  'bako_national_park',
  'perhentian_islands',
  'crystal_mosque',
  'national_museum',
  'tioman_island',
  'gunung_mulu',
  'sipadan_island',
  'pangkor_island',
  'genting_highlands',
  'kek_lok_si',
  'penang_hill',
  'desaru_coast',
  'merdeka_118',
  'kenyir_lake',
  'bukit_bintang',
  'central_market',
  'perdana_botanical_garden',
  'thean_hou_temple',
  'aquaria_klcc',
  'sepang_circuit',
  'blue_mosque_shah_alam',
  'frim_kepong',
  'penang_national_park',
  'khoo_kongsi',
  'melaka_river_cruise',
  'melaka_straits_mosque',
  'baba_nyonya_heritage_museum',
  'cheng_hoon_teng',
  'endau_rompin',
  'sultan_abu_bakar_mosque',
  'gunung_ledang',
  'danga_bay',
  'ipoh_old_town',
  'royal_belum',
  'perak_cave_temple',
  'taiping_lake_gardens',
  'kilim_karst',
  'dayang_bunting',
  'alor_setar_tower',
  'zahir_mosque',
  'pulau_kapas',
  'pasar_payang',
  'rantau_abang',
  'siti_khadijah_market',
  'wat_photivihan',
  'handicraft_village_kelantan',
  'tunku_abdul_rahman_park',
  'kinabatangan_river',
  'danum_valley',
  'pulau_mabul',
  'kundasang_war_memorial',
  'poring_hot_springs',
  'bohey_dulang',
  'tip_of_borneo',
  'semenggoh_wildlife',
  'niah_national_park',
  'fairy_cave',
  'gunung_datuk',
  'perlis_state_park',
  'timah_tasoh_lake',
  'putra_mosque',
  'putrajaya_botanical_garden',
  'seri_wawasan_bridge',
  'tuanku_mizan_mosque',
  'perdana_putra',
  'putrajaya_wetlands',
  'taman_saujana_hijau',
  'cruise_tasik_putrajaya',
  'picc_putrajaya',
  'seri_gemilang_bridge',
  'seri_saujana_bridge',
  'taman_warisan_pertanian',
  'putrajaya_challenge_park',
  'anjung_floria',
  'marina_putrajaya',
  'taman_ekuestrian_putrajaya',
  'alamanda_putrajaya',
  'ioi_city_mall',
  'millennium_monument_putrajaya',
  'astaka_morocco_putrajaya',
  'istana_melawati_putrajaya',
  'labuan_marine_park',
]);

// Text normalization helper for flexible search (strips apostrophes, hyphens, punctuation)
export function normalizeSearchText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[-/]/g, ' ')
    .trim();
}

// Helper to find attraction by query or ID
export function findAttraction(queryOrId: string): AttractionItem | null {
  const rawQ = queryOrId.trim();
  if (!rawQ) return null;
  const cleanQ = normalizeSearchText(rawQ);
  const lowerQ = rawQ.toLowerCase();

  // 1. Exact ID match
  const byId = ATTRACTIONS_DATA.find((a) => a.id.toLowerCase() === lowerQ);
  if (byId) return byId;

  // 2. Exact name match (normalized)
  const byName = ATTRACTIONS_DATA.find((a) => normalizeSearchText(a.name) === cleanQ);
  if (byName) return byName;

  // 3. Exact alias match (normalized)
  const byAlias = ATTRACTIONS_DATA.find((a) =>
    a.aliases.some((alias) => normalizeSearchText(alias) === cleanQ)
  );
  if (byAlias) return byAlias;

  // 4. Multi-token partial match
  const tokens = cleanQ.split(/\s+/).filter(Boolean);
  const byPartial = ATTRACTIONS_DATA.find((a) => {
    const haystack = normalizeSearchText(
      `${a.name} ${a.aliases.join(' ')} ${a.district} ${a.stateName} ${a.subcategory}`
    );
    return tokens.every((tok) => haystack.includes(tok));
  });

  return byPartial || null;
}

// Advanced search helper with multi-token matching, relevance scoring, and state/category filtering
export function searchAttractions(
  query: string,
  options?: number | SearchAttractionOptions
): AttractionItem[] {
  const opts: SearchAttractionOptions = typeof options === 'number' ? { limit: options } : (options || {});
  const limit = opts.limit ?? 50;
  const stateId = opts.stateId?.trim().toLowerCase();
  const category = opts.category?.trim();

  const cleanQ = normalizeSearchText(query);
  const tokens = cleanQ.split(/\s+/).filter(Boolean);

  // If no search query
  if (tokens.length === 0) {
    let filtered = ATTRACTIONS_DATA;
    if (stateId && stateId !== 'all') {
      filtered = filtered.filter((a) => a.stateId.toLowerCase() === stateId);
    }
    if (category && category !== 'All') {
      filtered = filtered.filter((a) => a.category === category);
    }
    // Put flagships first, then others
    const sorted = [...filtered].sort((a, b) => {
      const aFlag = FLAGSHIP_IDS.has(a.id) ? 1 : 0;
      const bFlag = FLAGSHIP_IDS.has(b.id) ? 1 : 0;
      if (aFlag !== bFlag) return bFlag - aFlag;
      return a.name.localeCompare(b.name);
    });
    return sorted.slice(0, limit);
  }

  // Scored matching
  interface ScoredItem {
    item: AttractionItem;
    score: number;
  }

  const scored: ScoredItem[] = [];

  for (const a of ATTRACTIONS_DATA) {
    // State filter check
    if (stateId && stateId !== 'all' && a.stateId.toLowerCase() !== stateId) {
      continue;
    }
    // Category filter check
    if (category && category !== 'All') {
      continue;
    }

    const normName = normalizeSearchText(a.name);
    const normDistrict = normalizeSearchText(a.district);
    const normState = normalizeSearchText(a.stateName);
    const normSubcat = normalizeSearchText(a.subcategory);
    const normAliases = a.aliases.map((al) => normalizeSearchText(al));
    const fullText = `${normName} ${normAliases.join(' ')} ${normDistrict} ${normState} ${normSubcat}`;

    // All tokens must match
    const allMatch = tokens.every((tok) => fullText.includes(tok));
    if (!allMatch) continue;

    let score = 0;

    // Exact name match
    if (normName === cleanQ) {
      score += 500;
    } else if (normName.startsWith(cleanQ)) {
      score += 250;
    } else if (normName.includes(cleanQ)) {
      score += 150;
    }

    // Exact alias match
    if (normAliases.includes(cleanQ)) {
      score += 200;
    } else if (normAliases.some((al) => al.includes(cleanQ))) {
      score += 100;
    }

    // Token scoring
    for (const tok of tokens) {
      if (normName.includes(tok)) score += 40;
      if (normAliases.some((al) => al.includes(tok))) score += 30;
      if (normDistrict.includes(tok)) score += 15;
      if (normSubcat.includes(tok)) score += 10;
      if (normState.includes(tok)) score += 5;
    }

    // Flagship bonus
    if (FLAGSHIP_IDS.has(a.id)) {
      score += 80;
    }

    scored.push({ item: a, score });
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.item);
}

// Get all attractions for a specific state
export function getAttractionsByState(stateId: string): AttractionItem[] {
  const sid = stateId.trim().toLowerCase();
  return ATTRACTIONS_DATA.filter((a) => a.stateId.toLowerCase() === sid);
}

// Get counts of attractions per state
export function getStateAttractionCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of ATTRACTIONS_DATA) {
    counts[a.stateId] = (counts[a.stateId] || 0) + 1;
  }
  return counts;
}

// Get total count
export function getTotalAttractionsCount(): number {
  return ATTRACTIONS_DATA.length;
}
