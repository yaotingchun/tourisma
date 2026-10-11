// Precomputed Environmental Exposure and Protected Area Diagnostic Data
// Source: finalized_dataset/tourism_environment_relationship.csv & environmentally_protected_areas.csv

export interface EcoDetail {
  inside: number;
  near: number;
  exposed: number;
  percent: number;
}

export interface StateEnvironmentData {
  id: string;
  name: string;
  code: string;
  totalAssets: number;
  inside: number;
  near: number;
  outside: number;
  totalExposed: number;
  exposurePct: number;
  insidePct: number;
  nearPct: number;
  outsidePct: number;
  land: EcoDetail;
  marine: EcoDetail;
  keyProtectedAreas: string[];
}

export interface NationalEnvironmentData {
  totalAssets: number;
  inside: number;
  near: number;
  outside: number;
  totalExposed: number;
  exposurePct: number;
  insidePct: number;
  nearPct: number;
  outsidePct: number;
  land: EcoDetail;
  marine: EcoDetail;
}

export const NATIONAL_ENVIRONMENT_DATA: NationalEnvironmentData = {
  "totalAssets": 60731,
  "inside": 965,
  "near": 5464,
  "outside": 54302,
  "totalExposed": 6429,
  "exposurePct": 10.6,
  "insidePct": 1.6,
  "nearPct": 9.0,
  "outsidePct": 89.4,
  "land": {
    "inside": 628,
    "near": 4546,
    "exposed": 5174,
    "percent": 8.5
  },
  "marine": {
    "inside": 337,
    "near": 1067,
    "exposed": 1404,
    "percent": 2.3
  }
};

export const STATE_ENVIRONMENT_DATA: Record<string, StateEnvironmentData> = {
  "johor": {
    "id": "johor",
    "name": "Johor",
    "code": "JHR",
    "totalAssets": 7040,
    "inside": 62,
    "near": 107,
    "outside": 6871,
    "totalExposed": 169,
    "exposurePct": 2.4,
    "insidePct": 0.9,
    "nearPct": 1.5,
    "outsidePct": 97.6,
    "land": {
      "inside": 42,
      "near": 59,
      "exposed": 101,
      "percent": 1.4
    },
    "marine": {
      "inside": 20,
      "near": 48,
      "exposed": 68,
      "percent": 1.0
    },
    "keyProtectedAreas": [
      "Pulau Kukup National Park",
      "Banang Water Catchment Forest",
      "Pulau Sibu Marine Park"
    ]
  },
  "kedah": {
    "id": "kedah",
    "name": "Kedah",
    "code": "KDH",
    "totalAssets": 3127,
    "inside": 5,
    "near": 7,
    "outside": 3115,
    "totalExposed": 12,
    "exposurePct": 0.4,
    "insidePct": 0.2,
    "nearPct": 0.2,
    "outsidePct": 99.6,
    "land": {
      "inside": 0,
      "near": 5,
      "exposed": 5,
      "percent": 0.2
    },
    "marine": {
      "inside": 5,
      "near": 2,
      "exposed": 7,
      "percent": 0.2
    },
    "keyProtectedAreas": [
      "Pulau Kacha Marine Park",
      "Bukit Pinang Tuntung Reserve",
      "Pulau Singa Besar Sea Cucumber Protection Area"
    ]
  },
  "kelantan": {
    "id": "kelantan",
    "name": "Kelantan",
    "code": "KTN",
    "totalAssets": 1811,
    "inside": 6,
    "near": 14,
    "outside": 1791,
    "totalExposed": 20,
    "exposurePct": 1.1,
    "insidePct": 0.3,
    "nearPct": 0.8,
    "outsidePct": 98.9,
    "land": {
      "inside": 6,
      "near": 14,
      "exposed": 20,
      "percent": 1.1
    },
    "marine": {
      "inside": 0,
      "near": 0,
      "exposed": 0,
      "percent": 0.0
    },
    "keyProtectedAreas": [
      "Gunung Stong State Park",
      "Gunung Siku Soil Protection Forest",
      "Taman Negara (Kelantan)"
    ]
  },
  "melaka": {
    "id": "melaka",
    "name": "Melaka",
    "code": "MLK",
    "totalAssets": 2858,
    "inside": 13,
    "near": 251,
    "outside": 2594,
    "totalExposed": 264,
    "exposurePct": 9.2,
    "insidePct": 0.5,
    "nearPct": 8.8,
    "outsidePct": 90.8,
    "land": {
      "inside": 6,
      "near": 12,
      "exposed": 18,
      "percent": 0.6
    },
    "marine": {
      "inside": 7,
      "near": 255,
      "exposed": 262,
      "percent": 9.2
    },
    "keyProtectedAreas": [
      "Melaka City Bird Sanctury Area",
      "Nine Islands Wildlife Reserve",
      "Tanjung Tuan Fisheries Prohibited Areas"
    ]
  },
  "negeri-sembilan": {
    "id": "negeri-sembilan",
    "name": "Negeri Sembilan",
    "code": "NSN",
    "totalAssets": 1663,
    "inside": 26,
    "near": 147,
    "outside": 1490,
    "totalExposed": 173,
    "exposurePct": 10.4,
    "insidePct": 1.6,
    "nearPct": 8.8,
    "outsidePct": 89.6,
    "land": {
      "inside": 22,
      "near": 25,
      "exposed": 47,
      "percent": 2.8
    },
    "marine": {
      "inside": 4,
      "near": 131,
      "exposed": 135,
      "percent": 8.1
    },
    "keyProtectedAreas": [
      "Tanjung Tuan 1 Fisheries Prohibited Areas",
      "Port Dickson Island Bird Sanctuary",
      "Tanjung Tuan 2 Fisheries Prohibited Areas"
    ]
  },
  "pahang": {
    "id": "pahang",
    "name": "Pahang",
    "code": "PHG",
    "totalAssets": 2973,
    "inside": 150,
    "near": 1028,
    "outside": 1795,
    "totalExposed": 1178,
    "exposurePct": 39.6,
    "insidePct": 5.0,
    "nearPct": 34.6,
    "outsidePct": 60.4,
    "land": {
      "inside": 81,
      "near": 900,
      "exposed": 981,
      "percent": 33.0
    },
    "marine": {
      "inside": 69,
      "near": 239,
      "exposed": 308,
      "percent": 10.4
    },
    "keyProtectedAreas": [
      "Mentigi Soil Protection Forest",
      "Pulau Tioman Marine Park",
      "Taman Negara (Pahang)"
    ]
  },
  "perak": {
    "id": "perak",
    "name": "Perak",
    "code": "PRK",
    "totalAssets": 3874,
    "inside": 57,
    "near": 66,
    "outside": 3751,
    "totalExposed": 123,
    "exposurePct": 3.2,
    "insidePct": 1.5,
    "nearPct": 1.7,
    "outsidePct": 96.8,
    "land": {
      "inside": 56,
      "near": 66,
      "exposed": 122,
      "percent": 3.1
    },
    "marine": {
      "inside": 1,
      "near": 0,
      "exposed": 1,
      "percent": 0.0
    },
    "keyProtectedAreas": [
      "Bukit Larut Water Catchment Forest",
      "Bujang Melaka Water Catchment Forest",
      "Bukit Tapah Water Catchment Forest"
    ]
  },
  "perlis": {
    "id": "perlis",
    "name": "Perlis",
    "code": "PLS",
    "totalAssets": 194,
    "inside": 2,
    "near": 3,
    "outside": 189,
    "totalExposed": 5,
    "exposurePct": 2.6,
    "insidePct": 1.0,
    "nearPct": 1.5,
    "outsidePct": 97.4,
    "land": {
      "inside": 2,
      "near": 3,
      "exposed": 5,
      "percent": 2.6
    },
    "marine": {
      "inside": 0,
      "near": 0,
      "exposed": 0,
      "percent": 0.0
    },
    "keyProtectedAreas": [
      "Perlis State Park"
    ]
  },
  "pulau-pinang": {
    "id": "pulau-pinang",
    "name": "Pulau Pinang",
    "code": "PNG",
    "totalAssets": 5544,
    "inside": 23,
    "near": 38,
    "outside": 5483,
    "totalExposed": 61,
    "exposurePct": 1.1,
    "insidePct": 0.4,
    "nearPct": 0.7,
    "outsidePct": 98.9,
    "land": {
      "inside": 7,
      "near": 5,
      "exposed": 12,
      "percent": 0.2
    },
    "marine": {
      "inside": 16,
      "near": 33,
      "exposed": 49,
      "percent": 0.9
    },
    "keyProtectedAreas": [
      "Penang National Park",
      "Tadahan Air Cherok Tok Kun and Tadahan Air Berapit Water Catchment Forest"
    ]
  },
  "sabah": {
    "id": "sabah",
    "name": "Sabah",
    "code": "SBH",
    "totalAssets": 2888,
    "inside": 239,
    "near": 563,
    "outside": 2086,
    "totalExposed": 802,
    "exposurePct": 27.8,
    "insidePct": 8.3,
    "nearPct": 19.5,
    "outsidePct": 72.2,
    "land": {
      "inside": 107,
      "near": 517,
      "exposed": 624,
      "percent": 21.6
    },
    "marine": {
      "inside": 132,
      "near": 55,
      "exposed": 187,
      "percent": 6.5
    },
    "keyProtectedAreas": [
      "Kota Kinabalu Wetlands",
      "Leila Protection Forest",
      "Tun Mustapha Park"
    ]
  },
  "sarawak": {
    "id": "sarawak",
    "name": "Sarawak",
    "code": "SWK",
    "totalAssets": 5269,
    "inside": 145,
    "near": 283,
    "outside": 4841,
    "totalExposed": 428,
    "exposurePct": 8.1,
    "insidePct": 2.8,
    "nearPct": 5.4,
    "outsidePct": 91.9,
    "land": {
      "inside": 101,
      "near": 189,
      "exposed": 290,
      "percent": 5.5
    },
    "marine": {
      "inside": 44,
      "near": 95,
      "exposed": 139,
      "percent": 2.6
    },
    "keyProtectedAreas": [
      "Bukit Sembiling Nature Reserve",
      "Gunung Mulu National Park",
      "Santubong National Park"
    ]
  },
  "selangor": {
    "id": "selangor",
    "name": "Selangor",
    "code": "SGR",
    "totalAssets": 13543,
    "inside": 158,
    "near": 651,
    "outside": 12734,
    "totalExposed": 809,
    "exposurePct": 6.0,
    "insidePct": 1.2,
    "nearPct": 4.8,
    "outsidePct": 94.0,
    "land": {
      "inside": 158,
      "near": 651,
      "exposed": 809,
      "percent": 6.0
    },
    "marine": {
      "inside": 0,
      "near": 0,
      "exposed": 0,
      "percent": 0.0
    },
    "keyProtectedAreas": [
      "Selangor State Park",
      "Ayer Hitam (Additional) Forest Reserve",
      "Kota Damansara Forest Reserve"
    ]
  },
  "terengganu": {
    "id": "terengganu",
    "name": "Terengganu",
    "code": "TRG",
    "totalAssets": 1553,
    "inside": 73,
    "near": 227,
    "outside": 1253,
    "totalExposed": 300,
    "exposurePct": 19.3,
    "insidePct": 4.7,
    "nearPct": 14.6,
    "outsidePct": 80.7,
    "land": {
      "inside": 35,
      "near": 23,
      "exposed": 58,
      "percent": 3.7
    },
    "marine": {
      "inside": 38,
      "near": 207,
      "exposed": 245,
      "percent": 15.8
    },
    "keyProtectedAreas": [
      "Pulau Perhentian Besar Marine Park",
      "Pulau Kapas Marine Park",
      "Tasik Kenyir Water Catchment Forest"
    ]
  },
  "kuala-lumpur": {
    "id": "kuala-lumpur",
    "name": "W.P. Kuala Lumpur",
    "code": "KUL",
    "totalAssets": 7966,
    "inside": 5,
    "near": 2077,
    "outside": 5884,
    "totalExposed": 2082,
    "exposurePct": 26.1,
    "insidePct": 0.1,
    "nearPct": 26.1,
    "outsidePct": 73.9,
    "land": {
      "inside": 5,
      "near": 2077,
      "exposed": 2082,
      "percent": 26.1
    },
    "marine": {
      "inside": 0,
      "near": 0,
      "exposed": 0,
      "percent": 0.0
    },
    "keyProtectedAreas": [
      "Bukit Nanas Wildlife Reserve",
      "Kuala Lumpur Golf Course Wildlife Reserve",
      "Bukit Sungai Puteh Wildlife Reserve"
    ]
  },
  "labuan": {
    "id": "labuan",
    "name": "W.P. Labuan",
    "code": "LBN",
    "totalAssets": 126,
    "inside": 1,
    "near": 2,
    "outside": 123,
    "totalExposed": 3,
    "exposurePct": 2.4,
    "insidePct": 0.8,
    "nearPct": 1.6,
    "outsidePct": 97.6,
    "land": {
      "inside": 0,
      "near": 0,
      "exposed": 0,
      "percent": 0.0
    },
    "marine": {
      "inside": 1,
      "near": 2,
      "exposed": 3,
      "percent": 2.4
    },
    "keyProtectedAreas": [
      "Pulau Kuraman Marine Park",
      "Pulau Rusukan Kecil Marine Park"
    ]
  },
  "putrajaya": {
    "id": "putrajaya",
    "name": "W.P. Putrajaya",
    "code": "PJY",
    "totalAssets": 302,
    "inside": 0,
    "near": 0,
    "outside": 302,
    "totalExposed": 0,
    "exposurePct": 0.0,
    "insidePct": 0.0,
    "nearPct": 0.0,
    "outsidePct": 100.0,
    "land": {
      "inside": 0,
      "near": 0,
      "exposed": 0,
      "percent": 0.0
    },
    "marine": {
      "inside": 0,
      "near": 0,
      "exposed": 0,
      "percent": 0.0
    },
    "keyProtectedAreas": []
  }
};

export const STATE_ENVIRONMENT_LIST: StateEnvironmentData[] = Object.values(STATE_ENVIRONMENT_DATA);

export function getStateEnvironment(stateId: string): StateEnvironmentData | undefined {
  if (!stateId) return undefined;
  const raw = stateId.trim();
  const norm = raw.toLowerCase().replace(/_/g, '-').replace('penang', 'pulau-pinang');
  return (
    STATE_ENVIRONMENT_DATA[norm] ||
    STATE_ENVIRONMENT_DATA[raw] ||
    Object.values(STATE_ENVIRONMENT_DATA).find(
      (s) =>
        s.id === raw ||
        s.id === norm ||
        s.code.toLowerCase() === raw.toLowerCase() ||
        s.name.toLowerCase() === raw.toLowerCase() ||
        s.id.replace(/-/g, '_') === raw.toLowerCase() ||
        s.id.replace(/_/g, '-') === norm
    )
  );
}
