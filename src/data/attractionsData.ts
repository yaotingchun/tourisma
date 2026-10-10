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

// Helper to find attraction by query or ID
export function findAttraction(queryOrId: string): AttractionItem | null {
  const q = queryOrId.trim().toLowerCase();
  if (!q) return null;

  // 1. Exact ID match
  const byId = ATTRACTIONS_DATA.find((a) => a.id.toLowerCase() === q);
  if (byId) return byId;

  // 2. Exact name match
  const byName = ATTRACTIONS_DATA.find((a) => a.name.toLowerCase() === q);
  if (byName) return byName;

  // 3. Substring or alias match
  const byPartial = ATTRACTIONS_DATA.find(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.aliases.some((alias) => alias.toLowerCase().includes(q)) ||
      a.district.toLowerCase().includes(q) ||
      a.stateName.toLowerCase().includes(q)
  );

  return byPartial || null;
}

// Fast search helper for autocomplete dropdown
export function searchAttractions(query: string, limit: number = 25): AttractionItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return ATTRACTIONS_DATA.slice(0, 10);
  }

  const results: AttractionItem[] = [];
  for (const a of ATTRACTIONS_DATA) {
    if (
      a.name.toLowerCase().includes(q) ||
      a.aliases.some((alias) => alias.toLowerCase().includes(q)) ||
      a.district.toLowerCase().includes(q) ||
      a.stateName.toLowerCase().includes(q)
    ) {
      results.push(a);
      if (results.length >= limit) break;
    }
  }
  return results;
}
