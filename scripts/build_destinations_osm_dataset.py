"""
Generate OSM-Integrated Destinations Dataset for Tourisma
Reads official OpenStreetMap coverage and accessibility layers:
- finalized_dataset/tourism_asset_coverage.csv
- finalized_dataset/tourism_road_accessibility.csv
- finalized_dataset/tourism_healthcare_accessibility.csv
- finalized_dataset/tourism_environment_relationship.csv
- finalized_dataset/tourism_supporting_assets.csv
- src/data/malaysiaGeoGenerated.json

Outputs:
- src/data/destinationsOsmData.json (compact, high-performance binary-like JSON)
"""

import os
import json
import re
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIN_DIR = os.path.join(BASE_DIR, "finalized_dataset")
SRC_DATA_DIR = os.path.join(BASE_DIR, "src", "data")

# 1. Load Geo
with open(os.path.join(SRC_DATA_DIR, 'malaysiaGeoGenerated.json'), 'r', encoding='utf-8') as f:
    geo_list = json.load(f)

state_id_to_geo = {g['id']: g for g in geo_list}
state_name_to_id = {
    'Johor': 'johor', 'Kedah': 'kedah', 'Kelantan': 'kelantan', 'Melaka': 'melaka',
    'Negeri Sembilan': 'negeri_sembilan', 'Pahang': 'pahang', 'Perak': 'perak',
    'Perlis': 'perlis', 'Pulau Pinang': 'penang', 'Sabah': 'sabah', 'Sarawak': 'sarawak',
    'Selangor': 'selangor', 'Terengganu': 'terengganu', 'W.P. Kuala Lumpur': 'kuala_lumpur',
    'W.P. Labuan': 'labuan', 'W.P. Putrajaya': 'putrajaya'
}

# 2. Load Datasets
print("Loading datasets...")
df_cov = pd.read_csv(os.path.join(FIN_DIR, 'tourism_asset_coverage.csv'), low_memory=False)
df_road = pd.read_csv(os.path.join(FIN_DIR, 'tourism_road_accessibility.csv'), low_memory=False)
df_pt = pd.read_csv(os.path.join(FIN_DIR, 'tourism_pt_accessibility.csv'), low_memory=False)
df_hc = pd.read_csv(os.path.join(FIN_DIR, 'tourism_healthcare_accessibility.csv'), low_memory=False)
df_env = pd.read_csv(os.path.join(FIN_DIR, 'tourism_environment_relationship.csv'), low_memory=False)
df_supp = pd.read_csv(os.path.join(FIN_DIR, 'tourism_supporting_assets.csv'), low_memory=False)

# Deduplicate
m_road = df_road[['asset_id', 'distance_to_road_m', 'road_access_tier', 'nearest_road_name']].drop_duplicates(subset=['asset_id'])
m_pt = df_pt[['asset_id', 'distance_to_pt_m', 'pt_access_tier', 'nearest_pt_name']].drop_duplicates(subset=['asset_id'])
m_hc = df_hc[['asset_id', 'distance_to_healthcare_km', 'nearest_healthcare_name', 'healthcare_access_tier']].drop_duplicates(subset=['asset_id'])
m_env = df_env[['asset_id', 'distance_to_sensitive_area_km', 'nearest_environment_name', 'protection_type', 'relationship']].drop_duplicates(subset=['asset_id'])

merged = df_cov.merge(m_road, on='asset_id', how='left')
merged = merged.merge(m_pt, on='asset_id', how='left')
merged = merged.merge(m_hc, on='asset_id', how='left')
merged = merged.merge(m_env, on='asset_id', how='left')

# Accommodation KDTree (5km spatial query)
print("Building accommodation spatial index...")
df_acc = df_supp[df_supp['category'] == 'Accommodation'].dropna(subset=['lat', 'lon'])
acc_tree = cKDTree(df_acc[['lat', 'lon']].values)

df_fb = df_supp[df_supp['category'] == 'Food & Beverage'].dropna(subset=['lat', 'lon'])
fb_tree = cKDTree(df_fb[['lat', 'lon']].values)

# State SVG boundary projection
state_bounds = {}
for sname, gid in state_name_to_id.items():
    geo = state_id_to_geo[gid]
    coords = re.findall(r'([\d\.]+)\s+([\d\.]+)', geo['svgPath'])
    xs = [float(x) for x, y in coords]
    ys = [float(y) for x, y in coords]
    sub = merged[merged['state'] == sname]
    if len(sub) > 0:
        lon_min, lon_max = sub['lon'].min(), sub['lon'].max()
        lat_min, lat_max = sub['lat'].min(), sub['lat'].max()
        lpad = max(0.01, (lon_max - lon_min) * 0.02)
        kpad = max(0.01, (lat_max - lat_min) * 0.02)
        lon_min -= lpad
        lon_max += lpad
        lat_min -= kpad
        lat_max += kpad
    else:
        lon_min, lon_max = 100.0, 104.0
        lat_min, lat_max = 1.0, 6.0
    
    pad_x = (max(xs) - min(xs)) * 0.04
    pad_y = (max(ys) - min(ys)) * 0.04
    state_bounds[sname] = {
        'svg_min_x': min(xs) + pad_x, 'svg_max_x': max(xs) - pad_x,
        'svg_min_y': min(ys) + pad_y, 'svg_max_y': max(ys) - pad_y,
        'lon_min': lon_min, 'lon_max': lon_max,
        'lat_min': lat_min, 'lat_max': lat_max
    }

def project_coord(sname, lon, lat):
    b = state_bounds.get(sname)
    if not b:
        return 100.0, 200.0
    fx = (lon - b['lon_min']) / max(0.0001, (b['lon_max'] - b['lon_min']))
    fy = (b['lat_max'] - lat) / max(0.0001, (b['lat_max'] - b['lat_min']))
    fx = max(0.0, min(1.0, fx))
    fy = max(0.0, min(1.0, fy))
    px = b['svg_min_x'] + fx * (b['svg_max_x'] - b['svg_min_x'])
    py = b['svg_min_y'] + fy * (b['svg_max_y'] - b['svg_min_y'])
    return round(px, 1), round(py, 1)

def format_category(raw_cat):
    c = str(raw_cat).strip()
    if c in ['Beach', 'Waterfall', 'Viewpoint']:
        return 'Natural Sanctuary'
    elif any(x in c for x in ['Historic', 'Museum', 'Gallery']):
        return 'Supporting Heritage'
    elif any(x in c for x in ['Theme Park', 'Water Park', 'Zoo', 'Aquarium']):
        return 'Recreation & Leisure'
    return 'Core Attraction'

# Curated flagship master list with aliases
FLAGSHIP_CONFIGS = [
    {
        'id': 'cameron_highlands_tea',
        'match_id': 'OSM_node_4839553027', # Cameron Valley Plantations
        'name': 'Cameron Highlands Tea Plantation',
        'aliases': ['cameron highlands', 'bohd tea', 'tea plantation', 'tanah rata', 'brinchang', 'pahang tea', 'cameron valley'],
        'category': 'Core Attraction',
        'subcategory': 'Agro-Tourism & Highland Heritage',
        'override_coords': {'x': 114, 'y': 208},
    },
    {
        'id': 'batu_caves',
        'match_id': 'OSM_node_2911346279', # Lord Murugan Statue / Batu Caves
        'name': 'Batu Caves Temple & Murugan Statue',
        'aliases': ['batu caves', 'murugan statue', 'gombak', 'selangor caves', 'lord murugan', 'batu caves temple'],
        'category': 'Core Attraction',
        'subcategory': 'Cultural & Religious Heritage',
        'override_coords': {'x': 118, 'y': 275},
    },
    {
        'id': 'mount_kinabalu',
        'match_id': 'OSM_node_6487655209', # Viewpoint of Mount Kinabalu (Popular)
        'name': 'Mount Kinabalu & Kinabalu Park',
        'aliases': ['kinabalu', 'mount kinabalu', 'ranau', 'kundasang', 'sabah mountain', 'kinabalu park'],
        'category': 'Natural Sanctuary',
        'subcategory': 'UNESCO World Heritage Alpine Reserve',
        'override_coords': {'x': 865, 'y': 135},
    },
    {
        'id': 'taman_negara',
        'match_id': 'OSM_node_12258884546', # Taman Negara Pahang Kuala Tahan
        'name': 'Taman Negara National Park (Kuala Tahan)',
        'aliases': ['taman negara', 'kuala tahan', 'pahang rainforest', 'jerantut'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Primary Equatorial Rainforest',
        'override_coords': {'x': 165, 'y': 215},
    },
    {
        'id': 'langkawi_skybridge',
        'match_id': 'OSM_way_112477895', # Langkawi Sky Bridge
        'name': 'Langkawi Sky Bridge & Cable Car',
        'aliases': ['langkawi sky bridge', 'sky cab', 'machinchang', 'pantai kok', 'langkawi'],
        'category': 'Core Attraction',
        'subcategory': 'Geopark Mountain Engineering & Vista',
        'override_coords': {'x': 27, 'y': 92},
    },
    {
        'id': 'georgetown_heritage',
        'match_id': 'OSM_way_247175848', # Cheong Fatt Tze Mansion
        'name': 'George Town UNESCO Heritage Zone',
        'aliases': ['georgetown', 'penang heritage', 'cheong fatt tze', 'penang street art', 'clan jetties', 'penang heritage zone', 'george town'],
        'category': 'Core Attraction',
        'subcategory': 'UNESCO World Heritage Historic Settlement',
        'override_coords': {'x': 53, 'y': 145},
    },
    {
        'id': 'sunway_lagoon',
        'match_id': 'OSM_way_133076253', # Sunway Lagoon
        'name': 'Sunway Lagoon Theme Park',
        'aliases': ['sunway lagoon', 'sunway theme park', 'petaling jaya', 'bandar sunway'],
        'category': 'Recreation & Leisure',
        'subcategory': 'Integrated Multi-Theme Amusement Park',
        'override_coords': {'x': 112, 'y': 288},
    },
    {
        'id': 'melaka_stadthuys',
        'match_id': 'OSM_way_354761088', # Stadthuys
        'name': 'The Stadthuys & Dutch Square',
        'aliases': ['melaka stadthuys', 'red square', 'christ church', 'jonker street', 'melaka heritage', 'stadthuys', 'the stadthuys'],
        'category': 'Core Attraction',
        'subcategory': 'Colonial Historic Architecture',
        'override_coords': {'x': 142, 'y': 336},
    },
    {
        'id': 'bako_national_park',
        'match_id': 'OSM_node_2064154295', # Telok Pandan Besar Viewpoint in Bako
        'name': 'Bako National Park & Wildlife Sanctuary',
        'aliases': ['bako', 'bako national park', 'kuching nature', 'sarawak proboscis', 'teluk pandan', 'bako park', 'bako national park lodge'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Coastal Rainforest & Wildlife Sanctuary',
        'override_coords': {'x': 546, 'y': 372},
    },
    {
        'id': 'perhentian_islands',
        'match_id': 'OSM_node_6717759185', # K.K Bay (Perhentian)
        'name': 'Perhentian Marine Park Islands',
        'aliases': ['perhentian', 'perhentian islands', 'pulau perhentian', 'kuala besut', 'terengganu island', 'coral bay'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Coral Reef Marine Protected Area',
        'override_coords': {'x': 172, 'y': 122},
    },
]

def build_compact_record(row, config=None):
    aid = row['asset_id']
    name = config['name'] if config else str(row['name']).strip()
    sname = str(row['state']).strip()
    sid = state_name_to_id.get(sname, 'pahang')
    district = str(row['district']).strip()
    if district == 'nan' or not district:
        district = sname
    
    lat = round(float(row['lat']), 5)
    lon = round(float(row['lon']), 5)
    
    if config and 'override_coords' in config:
        svg_x, svg_y = config['override_coords']['x'], config['override_coords']['y']
    else:
        svg_x, svg_y = project_coord(sname, lon, lat)
    
    cat = config['category'] if config else format_category(row['category'])
    subcat = config['subcategory'] if config else str(row['category']).strip()
    aliases = config['aliases'] if config else [name.lower(), district.lower(), sname.lower()]
    item_id = config['id'] if config else aid
    
    # Road
    road_m = round(float(row.get('distance_to_road_m', 300) if pd.notna(row.get('distance_to_road_m')) else 300), 1)
    if road_m <= 500:
        road_tier = 'High Access'
    elif road_m <= 2000:
        road_tier = 'Moderate Access'
    else:
        road_tier = 'Low Access'
    road_name = str(row.get('nearest_road_name', 'Arterial Corridor')).strip()
    if road_name == 'nan' or not road_name:
        road_name = 'Arterial Road Network'
    road_desc = f"Direct ingress via {road_name}"
    
    # PT
    pt_m = round(float(row.get('distance_to_pt_m', 1500) if pd.notna(row.get('distance_to_pt_m')) else 1500), 1)
    if pt_m <= 800:
        pt_tier = 'High Access'
    elif pt_m <= 3000:
        pt_tier = 'Moderate Access'
    else:
        pt_tier = 'Low Access'
    pt_name = str(row.get('nearest_pt_name', 'Bus Station')).strip()
    if pt_name == 'nan' or not pt_name:
        pt_name = 'Public Transport Terminal'
    pt_desc = f"Serviced by {pt_name}"
    
    # Healthcare
    hc_km = round(float(row.get('distance_to_healthcare_km', 4.5) if pd.notna(row.get('distance_to_healthcare_km')) else 4.5), 1)
    hc_name = str(row.get('nearest_healthcare_name', 'District Health Clinic')).strip()
    if hc_name == 'nan' or not hc_name:
        hc_name = 'District Hospital / Clinic'
    if hc_km <= 3.0:
        hc_status = 'Well-Served'
    elif hc_km <= 10.0:
        hc_status = 'Moderate Distance'
    else:
        hc_status = 'Limited / Remote'
        
    # Environment
    env_km = round(float(row.get('distance_to_sensitive_area_km', 2.0) if pd.notna(row.get('distance_to_sensitive_area_km')) else 2.0), 1)
    env_name = str(row.get('nearest_environment_name', 'Protected Forest Reserve')).strip()
    if env_name == 'nan' or not env_name:
        env_name = 'Gazetted Environmental Reserve'
    env_rel = str(row.get('relationship', 'Outside')).strip().lower()
    inside_prot = env_rel == 'inside' or env_km == 0.0
    if inside_prot:
        env_tier = 'High Sensitivity'
    elif env_km <= 0.8:
        env_tier = 'Near Sensitive Area'
    elif env_km <= 3.5:
        env_tier = 'Moderate Buffer'
    else:
        env_tier = 'Low Ecological Exposure'
        
    # Accommodation count (5 km radius)
    acc_count = len(acc_tree.query_ball_point([lat, lon], r=5.0/111.0))
    fb_count = len(fb_tree.query_ball_point([lat, lon], r=5.0/111.0))
    
    # Return compact tuple/array
    return [
        item_id,                       # 0: id
        name,                          # 1: name
        sid,                           # 2: stateId
        sname,                         # 3: stateName
        district,                      # 4: district
        cat,                           # 5: category
        subcat,                        # 6: subcategory
        svg_x,                         # 7: svgX
        svg_y,                         # 8: svgY
        lat,                           # 9: lat
        lon,                           # 10: lon
        road_m,                        # 11: roadM
        road_tier,                     # 12: roadTier
        road_desc,                     # 13: roadDesc
        pt_m,                          # 14: ptM
        pt_tier,                       # 15: ptTier
        pt_desc,                       # 16: ptDesc
        acc_count,                     # 17: accCount
        fb_count,                      # 18: fbCount
        hc_km,                         # 19: hcKm
        hc_name,                       # 20: hcName
        hc_status,                     # 21: hcStatus
        env_km,                        # 22: envKm
        env_name,                      # 23: envName
        1 if inside_prot else 0,       # 24: insideProt
        env_tier,                      # 25: envTier
        aliases                        # 26: aliases
    ]

# 3. Build Flagships
final_compact = []
flagship_match_ids = set()

print("Building flagship attractions...")
for fcfg in FLAGSHIP_CONFIGS:
    mid = fcfg['match_id']
    match_row = merged[merged['asset_id'] == mid]
    if len(match_row) > 0:
        row = match_row.iloc[0]
        final_compact.append(build_compact_record(row, fcfg))
        flagship_match_ids.add(mid)

print(f"Added {len(final_compact)} flagship attractions.")

# 4. Add all other named core attractions
print("Adding named core attractions from OSM...")
named_df = merged[~merged['name'].str.contains('^unnamed', case=False, na=False)].copy()
named_df = named_df.dropna(subset=['name', 'lat', 'lon'])

added_keys = set()
for f in final_compact:
    added_keys.add(f"{f[1].lower()}___{f[3].lower()}___{f[4].lower()}")

for _, row in named_df.iterrows():
    aid = row['asset_id']
    if aid in flagship_match_ids:
        continue
    name = str(row['name']).strip()
    sname = str(row['state']).strip()
    dist = str(row['district']).strip()
    key = f"{name.lower()}___{sname.lower()}___{dist.lower()}"
    if key in added_keys:
        continue
    added_keys.add(key)
    final_compact.append(build_compact_record(row))

print(f"Total attractions generated: {len(final_compact)}")

# Save to src/data/destinationsOsmData.json
out_file = os.path.join(SRC_DATA_DIR, 'destinationsOsmData.json')
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(final_compact, f, indent=None, ensure_ascii=False)

file_size_kb = os.path.getsize(out_file) / 1024
print(f"Successfully saved {len(final_compact)} attractions to {out_file} ({file_size_kb:.1f} KB)")
