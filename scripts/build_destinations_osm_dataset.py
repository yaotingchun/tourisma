"""
Generate OSM-Integrated Destinations Dataset for Tourisma
Reads official OpenStreetMap coverage and accessibility layers:
- finalized_dataset/tourism_asset_coverage.csv
- finalized_dataset/tourism_road_accessibility.csv
- finalized_dataset/tourism_pt_accessibility.csv
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

# Accommodation & F&B KDTree (5km spatial query)
print("Building accommodation & supporting spatial index...")
df_acc = df_supp[df_supp['category'] == 'Accommodation'].dropna(subset=['lat', 'lon'])
acc_tree = cKDTree(df_acc[['lat', 'lon']].values)

df_fb = df_supp[df_supp['category'] == 'Food & Beverage'].dropna(subset=['lat', 'lon'])
fb_tree = cKDTree(df_fb[['lat', 'lon']].values)

# Spatial KDTrees for road, pt, hc, env
df_road_clean = df_road.dropna(subset=['lat', 'lon', 'distance_to_road_m']).copy()
road_tree = cKDTree(df_road_clean[['lat', 'lon']].values)

df_pt_clean = df_pt.dropna(subset=['lat', 'lon', 'distance_to_pt_m']).copy()
pt_tree = cKDTree(df_pt_clean[['lat', 'lon']].values)

df_hc_clean = df_hc.dropna(subset=['lat', 'lon', 'distance_to_healthcare_km']).copy()
hc_tree = cKDTree(df_hc_clean[['lat', 'lon']].values)

df_env_clean = df_env.dropna(subset=['latitude', 'longitude', 'distance_to_sensitive_area_km']).copy()
env_tree = cKDTree(df_env_clean[['latitude', 'longitude']].values)

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
    # Terengganu
    {
        'id': 'pulau_redang',
        'match_id': 'OSM_way_319698781',
        'name': 'Pulau Redang Marine Park (Redang Island)',
        'aliases': ['pulau redang', 'redang island', 'redang', 'redang marine park', 'pasir panjang redang', 'teluk pauh', 'chagar hutang', 'terengganu redang', 'laguna redang', 'kuala nerus'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Coral Reef & Marine Conservation Park',
        'override_coords': {'x': 195, 'y': 138},
    },
    {
        'id': 'perhentian_islands',
        'match_id': 'OSM_node_6717759185',
        'name': 'Perhentian Marine Park Islands',
        'aliases': ['perhentian', 'perhentian islands', 'pulau perhentian', 'kuala besut', 'terengganu island', 'coral bay'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Coral Reef Marine Protected Area',
        'override_coords': {'x': 172, 'y': 122},
    },
    {
        'id': 'crystal_mosque',
        'match_id': 'OSM_way_468894454',
        'name': 'Crystal Mosque (Masjid Kristal)',
        'aliases': ['crystal mosque', 'masjid kristal', 'taman tamadun islam', 'kuala terengganu mosque', 'wan man island', 'terengganu mosque'],
        'category': 'Supporting Heritage',
        'subcategory': 'Contemporary Islamic Monument & Architecture',
        'override_coords': {'x': 193, 'y': 172},
    },
    {
        'id': 'kenyir_lake',
        'match_id': 'OSM_node_4577205091',
        'name': 'Kenyir Lake Eco-Tourism Sanctuary (Tasik Kenyir)',
        'aliases': ['kenyir lake', 'tasik kenyir', 'kenyir', 'hulu terengganu', 'lake kenyir', 'terengganu lake', 'pulau bayas'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Man-Made Reservoir & Angling Eco-Park',
        'override_coords': {'x': 175, 'y': 170},
    },
    {
        'id': 'pulau_kapas',
        'match_id': 'OSM_relation_16387421',
        'name': 'Pulau Kapas Marine Sanctuary (Kapas Island)',
        'aliases': ['pulau kapas', 'kapas island', 'kapas', 'pantai kapas', 'marang island', 'teluk aur', 'terengganu snorkeling'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Coral Reef Sanctuary & White Sand Beaches',
        'lat': 5.2200, 'lon': 103.2670, 'state': 'Terengganu', 'district': 'Marang'
    },
    {
        'id': 'pasar_payang',
        'name': 'Pasar Payang Central Market (Pasar Besar Kedai Payang)',
        'aliases': ['pasar payang', 'pasar besar kedai payang', 'kedai payang', 'kuala terengganu market', 'songket batik market', 'kuala terengganu'],
        'category': 'Supporting Heritage',
        'subcategory': 'Traditional Heritage Craft & Batik Emporium',
        'lat': 5.3370, 'lon': 103.1360, 'state': 'Terengganu', 'district': 'Kuala Terengganu'
    },
    {
        'id': 'rantau_abang',
        'name': 'Rantau Abang Turtle Sanctuary & Beach',
        'aliases': ['rantau abang', 'pantai rantau abang', 'turtle sanctuary terengganu', 'leatherback turtle', 'dungun beach', 'dungun'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Renowned Marine Turtle Conservation Coast',
        'lat': 4.8667, 'lon': 103.3980, 'state': 'Terengganu', 'district': 'Dungun'
    },

    # Kuala Lumpur
    {
        'id': 'petronas_twin_towers',
        'match_id': 'OSM_way_279944536',
        'name': 'Petronas Twin Towers (KLCC)',
        'aliases': ['petronas twin towers', 'petronas towers', 'klcc', 'suria klcc', 'menara berkembar petronas', 'twin towers', 'kuala lumpur towers', 'kuala lumpur'],
        'category': 'Core Attraction',
        'subcategory': 'Modern Architectural Icon & Skybridge',
        'override_coords': {'x': 95, 'y': 290},
    },
    {
        'id': 'merdeka_118',
        'match_id': 'OSM_node_13068263801',
        'name': 'Merdeka 118 Landmark Precinct',
        'aliases': ['merdeka 118', 'menara 118', 'kl 118', 'warisan merdeka', 'stadium merdeka', 'view on merdeka tower 118', 'kuala lumpur'],
        'category': 'Core Attraction',
        'subcategory': 'Mega-Tall Architectural Landmark',
        'override_coords': {'x': 93, 'y': 292},
    },
    {
        'id': 'national_museum',
        'match_id': 'OSM_way_323394984',
        'name': 'National Museum of Malaysia (Muzium Negara)',
        'aliases': ['national museum', 'muzium negara', 'malaysia national museum', 'kl museum', 'muzium negara malaysia', 'kuala lumpur museum'],
        'category': 'Supporting Heritage',
        'subcategory': 'National Cultural & Historical Repository',
        'override_coords': {'x': 91, 'y': 294},
    },
    {
        'id': 'bukit_bintang',
        'name': 'Bukit Bintang Shopping & Entertainment District',
        'aliases': ['bukit bintang', 'bintang walk', 'jalan bukit bintang', 'pavilion kl', 'kl shopping', 'lot 10', 'kuala lumpur'],
        'category': 'Recreation & Leisure',
        'subcategory': 'Urban Shopping & Entertainment District',
        'lat': 3.1466, 'lon': 101.7115, 'state': 'W.P. Kuala Lumpur', 'district': 'Kuala Lumpur',
        'override_coords': {'x': 96, 'y': 291}
    },
    {
        'id': 'central_market',
        'name': 'Central Market Kuala Lumpur (Pasar Seni)',
        'aliases': ['central market', 'pasar seni', 'kuala lumpur central market', 'kasturi walk', 'kuala lumpur craft', 'kuala lumpur'],
        'category': 'Supporting Heritage',
        'subcategory': 'Cultural Art & Heritage Market',
        'lat': 3.1453, 'lon': 101.6953, 'state': 'W.P. Kuala Lumpur', 'district': 'Kuala Lumpur',
        'override_coords': {'x': 92, 'y': 292}
    },
    {
        'id': 'perdana_botanical_garden',
        'name': 'Perdana Botanical Garden (Lake Gardens KL)',
        'aliases': ['perdana botanical garden', 'lake gardens', 'taman botani perdana', 'taman tasik perdana', 'kl bird park', 'kuala lumpur'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Historic Urban Botanical Park',
        'lat': 3.1444, 'lon': 101.6842, 'state': 'W.P. Kuala Lumpur', 'district': 'Kuala Lumpur',
        'override_coords': {'x': 90, 'y': 292}
    },
    {
        'id': 'thean_hou_temple',
        'name': 'Thean Hou Temple (Tokong Thean Hou)',
        'aliases': ['thean hou temple', 'thean hou', 'tian hou temple', 'robertson hill', 'hainanese temple', 'seputeh', 'kuala lumpur'],
        'category': 'Supporting Heritage',
        'subcategory': 'Chinese Multi-Tier Heritage Temple',
        'lat': 3.1219, 'lon': 101.6873, 'state': 'W.P. Kuala Lumpur', 'district': 'Kuala Lumpur',
        'override_coords': {'x': 91, 'y': 295}
    },
    {
        'id': 'aquaria_klcc',
        'name': 'Aquaria KLCC Oceanarium',
        'aliases': ['aquaria klcc', 'aquaria', 'klcc aquarium', 'kuala lumpur aquarium', 'kuala lumpur convention centre', 'kuala lumpur'],
        'category': 'Recreation & Leisure',
        'subcategory': 'State-of-the-Art Oceanarium',
        'lat': 3.1534, 'lon': 101.7132, 'state': 'W.P. Kuala Lumpur', 'district': 'Kuala Lumpur',
        'override_coords': {'x': 95, 'y': 289}
    },

    # Selangor
    {
        'id': 'batu_caves',
        'match_id': 'OSM_node_2911346279',
        'name': 'Batu Caves Temple & Murugan Statue',
        'aliases': ['batu caves', 'murugan statue', 'gombak', 'selangor caves', 'lord murugan', 'batu caves temple'],
        'category': 'Core Attraction',
        'subcategory': 'Cultural & Religious Heritage',
        'override_coords': {'x': 118, 'y': 275},
    },
    {
        'id': 'sunway_lagoon',
        'match_id': 'OSM_way_133076253',
        'name': 'Sunway Lagoon Theme Park',
        'aliases': ['sunway lagoon', 'sunway theme park', 'petaling jaya', 'bandar sunway'],
        'category': 'Recreation & Leisure',
        'subcategory': 'Integrated Multi-Theme Amusement Park',
        'override_coords': {'x': 112, 'y': 288},
    },
    {
        'id': 'sepang_circuit',
        'name': 'Sepang International Circuit (Petronas SIC)',
        'aliases': ['sepang circuit', 'sepang international circuit', 'litar sepang', 'motogp sepang', 'f1 sepang', 'sepang'],
        'category': 'Recreation & Leisure',
        'subcategory': 'World-Class Motorsport Circuit',
        'lat': 2.7606, 'lon': 101.7380, 'state': 'Selangor', 'district': 'Sepang',
        'override_coords': {'x': 118, 'y': 310}
    },
    {
        'id': 'blue_mosque_shah_alam',
        'name': 'Sultan Salahuddin Abdul Aziz Shah Mosque (Blue Mosque)',
        'aliases': ['blue mosque', 'blue mosque shah alam', 'masjid biru', 'masjid sultan salahuddin abdul aziz shah', 'shah alam mosque', 'masjid negeri selangor', 'shah alam'],
        'category': 'Supporting Heritage',
        'subcategory': 'Premier State Mosque & Islamic Architecture',
        'lat': 3.0784, 'lon': 101.5208, 'state': 'Selangor', 'district': 'Petaling',
        'override_coords': {'x': 108, 'y': 286}
    },
    {
        'id': 'frim_kepong',
        'name': 'Forest Research Institute Malaysia (FRIM Kepong)',
        'aliases': ['frim', 'frim kepong', 'forest research institute malaysia', 'institut penyelidikan perhutanan malaysia', 'kepong canopy walk', 'kepong'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Tropical Rainforest Research Biosphere',
        'lat': 3.2360, 'lon': 101.6345, 'state': 'Selangor', 'district': 'Gombak',
        'override_coords': {'x': 114, 'y': 278}
    },

    # Penang
    {
        'id': 'georgetown_heritage',
        'match_id': 'OSM_way_247175848',
        'name': 'George Town UNESCO Heritage Zone',
        'aliases': ['georgetown', 'penang heritage', 'cheong fatt tze', 'penang street art', 'clan jetties', 'penang heritage zone', 'george town', 'george town heritage'],
        'category': 'Core Attraction',
        'subcategory': 'UNESCO World Heritage Historic Settlement',
        'override_coords': {'x': 53, 'y': 145},
    },
    {
        'id': 'kek_lok_si',
        'match_id': 'OSM_node_7175322691',
        'name': 'Kek Lok Si Temple & Pagoda',
        'aliases': ['kek lok si', 'kek lok si temple', 'air itam', 'penang pagoda', 'kuan yin statue', 'penang temple'],
        'category': 'Supporting Heritage',
        'subcategory': 'Mahayana Buddhist Temple Complex',
        'override_coords': {'x': 50, 'y': 148},
    },
    {
        'id': 'penang_hill',
        'match_id': 'OSM_way_1424800451',
        'name': 'Penang Hill (Bukit Bendera) & The Habitat',
        'aliases': ['penang hill', 'bukit bendera', 'the habitat', 'funicular railway', 'penang vista', 'penang'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Biosphere Reserve & Colonial Hill Station',
        'override_coords': {'x': 52, 'y': 144},
    },
    {
        'id': 'penang_national_park',
        'name': 'Penang National Park (Taman Negara Pulau Pinang)',
        'aliases': ['penang national park', 'taman negara pulau pinang', 'teluk bahang', 'monkey beach', 'pantai kerachut', 'meromictic lake', 'penang'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Coastal Rainforest & Turtle Sanctuary',
        'lat': 5.4600, 'lon': 100.2050, 'state': 'Pulau Pinang', 'district': 'Barat Daya',
        'override_coords': {'x': 48, 'y': 142}
    },
    {
        'id': 'khoo_kongsi',
        'name': 'Leong San Tong Khoo Kongsi Clan House',
        'aliases': ['khoo kongsi', 'leong san tong khoo kongsi', 'george town clan house', 'cannon square', 'penang heritage', 'george town', 'penang'],
        'category': 'Supporting Heritage',
        'subcategory': 'Historic Chinese Clan House & Temple',
        'lat': 5.4149, 'lon': 100.3370, 'state': 'Pulau Pinang', 'district': 'Timur Laut',
        'override_coords': {'x': 54, 'y': 146}
    },

    # Pahang
    {
        'id': 'cameron_highlands_tea',
        'match_id': 'OSM_node_4839553027',
        'name': 'Cameron Highlands Tea Plantation',
        'aliases': ['cameron highlands', 'bohd tea', 'tea plantation', 'tanah rata', 'brinchang', 'pahang tea', 'cameron valley'],
        'category': 'Core Attraction',
        'subcategory': 'Agro-Tourism & Highland Heritage',
        'override_coords': {'x': 114, 'y': 208},
    },
    {
        'id': 'taman_negara',
        'match_id': 'OSM_node_12258884546',
        'name': 'Taman Negara National Park (Kuala Tahan)',
        'aliases': ['taman negara', 'kuala tahan', 'pahang rainforest', 'jerantut'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Primary Equatorial Rainforest',
        'override_coords': {'x': 165, 'y': 215},
    },
    {
        'id': 'genting_highlands',
        'match_id': 'OSM_node_254072956',
        'name': 'Genting Highlands & SkyWorlds Theme Park',
        'aliases': ['genting highlands', 'genting', 'skyworlds', 'resorts world genting', 'pahang mountain', 'chin swee caves'],
        'category': 'Recreation & Leisure',
        'subcategory': 'Highland Integrated Resort & Entertainment',
        'override_coords': {'x': 118, 'y': 268},
    },
    {
        'id': 'tioman_island',
        'match_id': 'OSM_node_6432102130',
        'name': 'Pulau Tioman Marine Park & Coral Sanctuary',
        'aliases': ['tioman island', 'pulau tioman', 'tioman', 'taman laut tioman', 'juara beach', 'salang', 'kampung tekek', 'rompin island', 'pahang island'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Marine Park & Island Geotourism',
        'override_coords': {'x': 218, 'y': 310},
    },

    # Melaka
    {
        'id': 'melaka_stadthuys',
        'match_id': 'OSM_way_354761088',
        'name': 'The Stadthuys & Dutch Square',
        'aliases': ['melaka stadthuys', 'red square', 'christ church', 'jonker street', 'melaka heritage', 'stadthuys', 'the stadthuys'],
        'category': 'Core Attraction',
        'subcategory': 'Colonial Historic Architecture',
        'override_coords': {'x': 142, 'y': 336},
    },
    {
        'id': 'melaka_river_cruise',
        'name': 'Melaka River Cruise (Sungai Melaka)',
        'aliases': ['melaka river cruise', 'sungai melaka', 'melaka river', 'river cruise melaka', 'pengkalan rama', 'muara sungai melaka', 'melaka'],
        'category': 'Recreation & Leisure',
        'subcategory': 'Historic Waterway Riverway Cruise',
        'lat': 2.1950, 'lon': 102.2490, 'state': 'Melaka', 'district': 'Melaka Tengah',
        'override_coords': {'x': 142, 'y': 335}
    },
    {
        'id': 'melaka_straits_mosque',
        'name': 'Melaka Straits Mosque (Masjid Selat Melaka)',
        'aliases': ['melaka straits mosque', 'masjid selat melaka', 'floating mosque melaka', 'selat melaka', 'pulau melaka', 'melaka mosque', 'melaka'],
        'category': 'Supporting Heritage',
        'subcategory': 'Floating Coastal Architectural Mosque',
        'lat': 2.1764, 'lon': 102.2494, 'state': 'Melaka', 'district': 'Melaka Tengah',
        'override_coords': {'x': 142, 'y': 338}
    },
    {
        'id': 'baba_nyonya_heritage_museum',
        'match_id': 'OSM_node_2643068114',
        'name': 'Baba & Nyonya Heritage Museum (Muzium Warisan Baba Dan Nyonya)',
        'aliases': ['baba nyonya heritage museum', 'baba nyonya museum', 'muzium warisan baba dan nyonya', 'peranakan museum', 'heeren street', 'tun tan cheng lock', 'baba nyonya', 'melaka'],
        'category': 'Supporting Heritage',
        'subcategory': 'Peranakan Cultural Heritage Mansion',
        'lat': 2.1965, 'lon': 102.2468, 'state': 'Melaka', 'district': 'Melaka Tengah',
        'override_coords': {'x': 141, 'y': 336}
    },
    {
        'id': 'cheng_hoon_teng',
        'name': 'Cheng Hoon Teng Temple (Green Clouds Temple)',
        'aliases': ['cheng hoon teng', 'cheng hoon teng temple', 'tokong cheng hoon teng', 'harmony street', 'oldest chinese temple', 'melaka'],
        'category': 'Supporting Heritage',
        'subcategory': 'Oldest Functioning Chinese Temple in Malaysia',
        'lat': 2.1975, 'lon': 102.2464, 'state': 'Melaka', 'district': 'Melaka Tengah',
        'override_coords': {'x': 141, 'y': 335}
    },

    # Johor
    {
        'id': 'desaru_coast',
        'match_id': 'OSM_way_491885535',
        'name': 'Desaru Coast Adventure Park & Beach',
        'aliases': ['desaru coast', 'desaru', 'kota tinggi beach', 'desaru waterpark', 'johor coast', 'desaru beach'],
        'category': 'Recreation & Leisure',
        'subcategory': 'Integrated Coastal Tourism Belt',
        'override_coords': {'x': 225, 'y': 365},
    },
    {
        'id': 'endau_rompin',
        'name': 'Endau-Rompin National Park (Taman Negara Endau Rompin)',
        'aliases': ['endau rompin', 'endau-rompin', 'taman negara endau rompin', 'peta entrance', 'selai entrance', 'johor rainforest', 'segamat', 'mersing'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Prehistoric Lowland Tropical Rainforest',
        'lat': 2.5310, 'lon': 103.3550, 'state': 'Johor', 'district': 'Segamat',
        'override_coords': {'x': 195, 'y': 330}
    },
    {
        'id': 'sultan_abu_bakar_mosque',
        'name': 'Sultan Abu Bakar State Mosque (Masjid Negeri Sultan Abu Bakar)',
        'aliases': ['sultan abu bakar mosque', 'masjid sultan abu bakar', 'masjid negeri johor', 'johor bahru mosque', 'victorian islamic mosque', 'johor bahru'],
        'category': 'Supporting Heritage',
        'subcategory': 'Victorian-Moorish Heritage Mosque',
        'lat': 1.4578, 'lon': 103.7556, 'state': 'Johor', 'district': 'Johor Bahru',
        'override_coords': {'x': 198, 'y': 378}
    },
    {
        'id': 'gunung_ledang',
        'name': 'Gunung Ledang National Park (Mount Ophir)',
        'aliases': ['gunung ledang', 'mount ophir', 'taman negara gunung ledang', 'puteri gunung ledang', 'sagil waterfall', 'tangkak', 'johor mountain'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Mystical Mountain & Nature Reserve',
        'lat': 2.3736, 'lon': 102.6072, 'state': 'Johor', 'district': 'Tangkak',
        'override_coords': {'x': 160, 'y': 338}
    },
    {
        'id': 'danga_bay',
        'name': 'Danga Bay Waterfront City',
        'aliases': ['danga bay', 'teluk danga', 'danga bay theme park', 'johor bahru waterfront', 'iskandar malaysia', 'johor bahru'],
        'category': 'Recreation & Leisure',
        'subcategory': 'Integrated Coastal Leisure & Marina Promenade',
        'lat': 1.4770, 'lon': 103.7190, 'state': 'Johor', 'district': 'Johor Bahru',
        'override_coords': {'x': 196, 'y': 376}
    },

    # Perak
    {
        'id': 'pangkor_island',
        'match_id': 'OSM_way_559410703',
        'name': 'Pulau Pangkor & Dutch Fort Heritage Island',
        'aliases': ['pangkor', 'pulau pangkor', 'pangkor island', 'teluk nipah', 'pasir bogak', 'kota belanda', 'manjung', 'batu bersurat pangkor', 'perak island'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Coastal Island & Colonial Fort Heritage',
        'override_coords': {'x': 60, 'y': 225},
    },
    {
        'id': 'ipoh_old_town',
        'name': 'Ipoh Old Town & Concubine Lane (Lorong Panglima)',
        'aliases': ['ipoh old town', 'concubine lane', 'lorong panglima', 'ipoh white coffee', 'ipoh mural arts', 'kinta heritage', 'ipoh', 'perak'],
        'category': 'Core Attraction',
        'subcategory': 'Tin-Mining Colonial Historic Quarter',
        'lat': 4.5975, 'lon': 101.0780, 'state': 'Perak', 'district': 'Kinta',
        'override_coords': {'x': 86, 'y': 208}
    },
    {
        'id': 'royal_belum',
        'name': 'Royal Belum State Park (Taman Negeri Royal Belum)',
        'aliases': ['royal belum', 'belum rainforest', 'taman negeri royal belum', 'tasik temenggor', 'gerik', 'ulu perak', 'rafflesia belum'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Ancient 130-Million-Year Primary Rainforest',
        'lat': 5.5800, 'lon': 101.3500, 'state': 'Perak', 'district': 'Hulu Perak',
        'override_coords': {'x': 95, 'y': 155}
    },
    {
        'id': 'perak_cave_temple',
        'name': 'Perak Cave Temple (Perak Tong Cave Temple)',
        'aliases': ['perak cave temple', 'perak cave', 'perak tong', 'gua perak tong', 'buddha statue ipoh', 'kinta caves', 'ipoh'],
        'category': 'Supporting Heritage',
        'subcategory': 'Historic Limestone Cave Temple & Murals',
        'lat': 4.6442, 'lon': 101.0997, 'state': 'Perak', 'district': 'Kinta',
        'override_coords': {'x': 87, 'y': 206}
    },
    {
        'id': 'taiping_lake_gardens',
        'match_id': 'OSM_way_545786411',
        'name': 'Taiping Lake Gardens (Taman Tasik Taiping)',
        'aliases': ['taiping lake gardens', 'taiping lake', 'taman tasik taiping', 'rain trees taiping', 'maxwell hill', 'larut matang', 'taiping'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Oldest Public Gardens & Angsana Rain Trees',
        'lat': 4.8550, 'lon': 100.7500, 'state': 'Perak', 'district': 'Larut dan Matang',
        'override_coords': {'x': 75, 'y': 192}
    },

    # Kedah
    {
        'id': 'langkawi_skybridge',
        'match_id': 'OSM_way_112477895',
        'name': 'Langkawi Sky Bridge & Cable Car',
        'aliases': ['langkawi sky bridge', 'sky cab', 'machinchang', 'pantai kok', 'langkawi'],
        'category': 'Core Attraction',
        'subcategory': 'Geopark Mountain Engineering & Vista',
        'override_coords': {'x': 27, 'y': 92},
    },
    {
        'id': 'kilim_karst',
        'match_id': 'OSM_node_5309678721',
        'name': 'Kilim Karst Geoforest Park (Langkawi UNESCO Geopark)',
        'aliases': ['kilim karst', 'kilim geoforest park', 'kilim karst geoforest park', 'mangrove langkawi', 'bat cave langkawi', 'langkawi geopark', 'langkawi'],
        'category': 'Natural Sanctuary',
        'subcategory': 'UNESCO Global Geopark Mangrove & Karst',
        'lat': 6.4020, 'lon': 99.8580, 'state': 'Kedah', 'district': 'Langkawi',
        'override_coords': {'x': 32, 'y': 86}
    },
    {
        'id': 'dayang_bunting',
        'name': 'Dayang Bunting Marble Geoforest Park (Lake of the Pregnant Maiden)',
        'aliases': ['dayang bunting', 'tasik dayang bunting', 'lake of pregnant maiden', 'pulau dayang bunting', 'langkawi geopark', 'langkawi'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Freshwater Karst Lake & Geopark',
        'lat': 6.2020, 'lon': 99.7850, 'state': 'Kedah', 'district': 'Langkawi',
        'override_coords': {'x': 28, 'y': 100}
    },
    {
        'id': 'alor_setar_tower',
        'name': 'Alor Setar Tower (Menara Alor Setar)',
        'aliases': ['alor setar tower', 'menara alor setar', 'alor star tower', 'kedah tower', 'kota setar observation', 'alor setar'],
        'category': 'Core Attraction',
        'subcategory': 'Telecommunications & Panoramic Observation Tower',
        'lat': 6.1245, 'lon': 100.3670, 'state': 'Kedah', 'district': 'Kota Setar',
        'override_coords': {'x': 52, 'y': 118}
    },
    {
        'id': 'zahir_mosque',
        'name': 'Zahir Mosque (Masjid Zahir Alor Setar)',
        'aliases': ['zahir mosque', 'masjid zahir', 'kedah royal mosque', 'masjid negeri kedah', 'moorish mosque', 'alor setar'],
        'category': 'Supporting Heritage',
        'subcategory': 'Grand Historic Moorish Royal Mosque',
        'lat': 6.1202, 'lon': 100.3653, 'state': 'Kedah', 'district': 'Kota Setar',
        'override_coords': {'x': 52, 'y': 119}
    },

    # Kelantan
    {
        'id': 'siti_khadijah_market',
        'name': 'Siti Khadijah Central Market (Pasar Besar Siti Khadijah)',
        'aliases': ['siti khadijah market', 'pasar siti khadijah', 'pasar besar siti khadijah', 'kota bharu market', 'kelantan market', 'siti khadijah', 'kota bharu'],
        'category': 'Core Attraction',
        'subcategory': 'Iconic Octagonal Traditional Vibrant Market',
        'lat': 6.1306, 'lon': 102.2394, 'state': 'Kelantan', 'district': 'Kota Bharu',
        'override_coords': {'x': 148, 'y': 115}
    },
    {
        'id': 'wat_photivihan',
        'name': 'Wat Photivihan Reclining Buddha (Sleeping Buddha Temple)',
        'aliases': ['wat photivihan', 'wat phothivihan', 'sleeping buddha kelantan', 'reclining buddha tumpat', 'tumpat temple', 'tumpat', 'kelantan'],
        'category': 'Supporting Heritage',
        'subcategory': 'Southeast Asian Gigantic Reclining Buddha',
        'lat': 6.1436, 'lon': 102.1486, 'state': 'Kelantan', 'district': 'Tumpat',
        'override_coords': {'x': 142, 'y': 114}
    },
    {
        'id': 'handicraft_village_kelantan',
        'name': 'Handicraft Village & Craft Museum (Kampung Kraftangan)',
        'aliases': ['handicraft village', 'kampung kraftangan', 'kraftangan kelantan', 'craft museum kota bharu', 'balai getam guri', 'kota bharu'],
        'category': 'Supporting Heritage',
        'subcategory': 'Traditional Kelantanese Songket, Batik & Silverware Centre',
        'lat': 6.1328, 'lon': 102.2372, 'state': 'Kelantan', 'district': 'Kota Bharu',
        'override_coords': {'x': 148, 'y': 114}
    },

    # Sabah
    {
        'id': 'mount_kinabalu',
        'match_id': 'OSM_node_6487655209',
        'name': 'Mount Kinabalu & Kinabalu Park',
        'aliases': ['kinabalu', 'mount kinabalu', 'ranau', 'kundasang', 'sabah mountain', 'kinabalu park'],
        'category': 'Natural Sanctuary',
        'subcategory': 'UNESCO World Heritage Alpine Reserve',
        'override_coords': {'x': 865, 'y': 135},
    },
    {
        'id': 'sipadan_island',
        'match_id': 'OSM_way_399276557',
        'name': 'Sipadan Island Marine Sanctuary (Pulau Sipadan)',
        'aliases': ['sipadan', 'sipadan island', 'pulau sipadan', 'semporna diving', 'barracuda point', 'taman pulau sipadan', 'sabah diving'],
        'category': 'Natural Sanctuary',
        'subcategory': 'World-Renowned Oceanic Diving Sanctuary',
        'override_coords': {'x': 930, 'y': 240},
    },
    {
        'id': 'tunku_abdul_rahman_park',
        'name': 'Tunku Abdul Rahman Marine National Park (TAR Park)',
        'aliases': ['tunku abdul rahman park', 'tar park', 'tunku abdul rahman marine park', 'pulau manukan', 'pulau sapi', 'pulau gaya', 'pulau mamutik', 'kota kinabalu island'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Cluster of 5 Pristine Coral Islands',
        'lat': 5.9750, 'lon': 115.9980, 'state': 'Sabah', 'district': 'Kota Kinabalu',
        'override_coords': {'x': 832, 'y': 138}
    },
    {
        'id': 'kinabatangan_river',
        'match_id': 'OSM_node_5083385423',
        'name': 'Kinabatangan River Wildlife Safari (Sungai Kinabatangan Sukau)',
        'aliases': ['kinabatangan river', 'kinabatangan', 'sungai kinabatangan', 'sukau rainforest', 'pygmy elephant safari', 'proboscis monkey safari', 'kinabatangan'],
        'category': 'Natural Sanctuary',
        'subcategory': 'World-Famous Riparian Wildlife River Safari',
        'lat': 5.5030, 'lon': 118.2980, 'state': 'Sabah', 'district': 'Kinabatangan',
        'override_coords': {'x': 910, 'y': 168}
    },
    {
        'id': 'danum_valley',
        'name': 'Danum Valley Conservation Area (Lembah Danum)',
        'aliases': ['danum valley', 'lembah danum', 'danum valley conservation area', 'lahad datu rainforest', 'borneo canopy walk', 'lahad datu'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Pristine Lowland Dipterocarp Bio-Reserve',
        'lat': 4.9667, 'lon': 117.8000, 'state': 'Sabah', 'district': 'Lahad Datu',
        'override_coords': {'x': 895, 'y': 195}
    },
    {
        'id': 'pulau_mabul',
        'match_id': 'OSM_node_12875546394',
        'name': 'Pulau Mabul Diving & Water Bungalows (Mabul Island)',
        'aliases': ['pulau mabul', 'mabul island', 'mabul', 'mabul diving', 'semporna diving', 'muck diving mabul', 'semporna'],
        'category': 'Natural Sanctuary',
        'subcategory': 'World Muck-Diving Capital & Coral Reefs',
        'lat': 4.2450, 'lon': 118.6310, 'state': 'Sabah', 'district': 'Semporna',
        'override_coords': {'x': 925, 'y': 235}
    },
    {
        'id': 'kundasang_war_memorial',
        'name': 'Kundasang War Memorial (Tugu Peringatan Perang Kundasang)',
        'aliases': ['kundasang war memorial', 'tugu peringatan perang kundasang', 'kundasang memorial', 'ranau memorial', 'kundasang', 'ranau'],
        'category': 'Supporting Heritage',
        'subcategory': 'Commemorative Fortified Alpine Memorial Gardens',
        'lat': 5.9867, 'lon': 116.5770, 'state': 'Sabah', 'district': 'Ranau',
        'override_coords': {'x': 860, 'y': 136}
    },
    {
        'id': 'poring_hot_springs',
        'name': 'Poring Hot Springs & Canopy Walkway (Kinabalu Park Poring)',
        'aliases': ['poring hot springs', 'poring', 'kolam air panas poring', 'poring canopy walkway', 'ranau hot spring', 'ranau'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Geothermal Mineral Springs & Tree-Top Walkway',
        'lat': 6.0460, 'lon': 116.7040, 'state': 'Sabah', 'district': 'Ranau',
        'override_coords': {'x': 868, 'y': 134}
    },
    {
        'id': 'bohey_dulang',
        'name': 'Bohey Dulang Island Viewpoint (Tun Sakaran Marine Park)',
        'aliases': ['bohey dulang', 'pulau bohey dulang', 'tun sakaran marine park', 'semporna lagoon view', 'volcanic crater lagoon', 'semporna'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Extinct Volcanic Crater Lagoon & Scenic Summit',
        'lat': 4.5940, 'lon': 118.7900, 'state': 'Sabah', 'district': 'Semporna',
        'override_coords': {'x': 930, 'y': 222}
    },
    {
        'id': 'tip_of_borneo',
        'match_id': 'OSM_node_5047462823',
        'name': 'Tip of Borneo (Tanjung Simpang Mengayau)',
        'aliases': ['tip of borneo', 'tanjung simpang mengayau', 'simpang mengayau', 'kudat tip', 'northernmost tip borneo', 'kudat'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Northernmost Geographical Promontory of Borneo',
        'lat': 7.0430, 'lon': 116.7450, 'state': 'Sabah', 'district': 'Kudat',
        'override_coords': {'x': 872, 'y': 95}
    },

    # Sarawak
    {
        'id': 'gunung_mulu',
        'match_id': 'OSM_way_119196672',
        'name': 'Gunung Mulu National Park (Canopy Walk & Caves)',
        'aliases': ['gunung mulu', 'mulu national park', 'mulu caves', 'deer cave', 'clearwater cave', 'sarawak mulu', 'mulu', 'mulu canopy walk'],
        'category': 'Natural Sanctuary',
        'subcategory': 'UNESCO World Heritage Karst & Rainforest',
        'override_coords': {'x': 780, 'y': 210},
    },
    {
        'id': 'bako_national_park',
        'match_id': 'OSM_node_2064154295',
        'name': 'Bako National Park & Wildlife Sanctuary',
        'aliases': ['bako', 'bako national park', 'kuching nature', 'sarawak proboscis', 'teluk pandan', 'bako park', 'bako national park lodge'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Coastal Rainforest & Wildlife Sanctuary',
        'override_coords': {'x': 546, 'y': 372},
    },
    {
        'id': 'semenggoh_wildlife',
        'name': 'Semenggoh Wildlife Centre (Orangutan Sanctuary)',
        'aliases': ['semenggoh wildlife', 'semenggoh wildlife centre', 'semenggoh', 'semenggoh orangutan', 'kuching orangutan', 'kuching'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Semi-Wild Orangutan Rehabilitation Reserve',
        'lat': 1.4010, 'lon': 110.3200, 'state': 'Sarawak', 'district': 'Kuching',
        'override_coords': {'x': 538, 'y': 382}
    },
    {
        'id': 'niah_national_park',
        'match_id': 'OSM_node_908300990',
        'name': 'Niah National Park & Great Cave (Taman Negara Niah)',
        'aliases': ['niah national park', 'taman negara niah', 'niah caves', 'gua niah', 'miri caves', 'painted cave niah', 'miri'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Prehistoric Human Archaeological Cave Reserve',
        'lat': 3.8180, 'lon': 113.7800, 'state': 'Sarawak', 'district': 'Miri',
        'override_coords': {'x': 710, 'y': 255}
    },
    {
        'id': 'fairy_cave',
        'name': 'Fairy Cave & Wind Cave Nature Reserve (Gua Pari Bau)',
        'aliases': ['fairy cave', 'wind cave', 'gua pari', 'gua angin', 'bau caves', 'kuching caves', 'bau'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Massive Stalactite Limestone Cavern Chamber',
        'lat': 1.3814, 'lon': 110.1175, 'state': 'Sarawak', 'district': 'Bau',
        'override_coords': {'x': 530, 'y': 385}
    },

    # Negeri Sembilan
    {
        'id': 'gunung_datuk',
        'name': 'Gunung Datuk Recreational Forest (Rembau Peak)',
        'aliases': ['gunung datuk', 'hutan lipur gunung datuk', 'gunung datuk rembau', 'rembau peak', 'negeri sembilan hiking', 'rembau'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Historic Monolithic Granite Mountain Vista',
        'lat': 2.5490, 'lon': 102.1670, 'state': 'Negeri Sembilan', 'district': 'Rembau',
        'override_coords': {'x': 136, 'y': 315}
    },

    # Perlis
    {
        'id': 'perlis_state_park',
        'match_id': 'OSM_relation_13669344',
        'name': 'Perlis State Park & Wang Kelian (Taman Negeri Perlis)',
        'aliases': ['perlis state park', 'taman negeri perlis', 'wang kelian', 'nakawan range', 'kaki bukit', 'wang mu', 'kangar'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Semi-Deciduous Forest on Limestone Nakawan Range',
        'lat': 6.6900, 'lon': 100.1800, 'state': 'Perlis', 'district': 'Kangar',
        'override_coords': {'x': 40, 'y': 70}
    },
    {
        'id': 'timah_tasoh_lake',
        'name': 'Timah Tasoh Lake (Tasik Timah Tasoh)',
        'aliases': ['timah tasoh lake', 'tasik timah tasoh', 'timah tasoh', 'perlis lake', 'guar jantan', 'tasoh lake sanctuary', 'kangar'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Scenic Wetland Reservoir & Migratory Bird Haven',
        'lat': 6.5810, 'lon': 100.2290, 'state': 'Perlis', 'district': 'Kangar',
        'override_coords': {'x': 42, 'y': 76}
    },

    # Putrajaya
    {
        'id': 'putra_mosque',
        'name': 'Putra Mosque (Masjid Putra Pink Mosque)',
        'aliases': ['putra mosque', 'masjid putra', 'pink mosque putrajaya', 'masjid merah jambu', 'dataran putra', 'putrajaya lake mosque', 'putrajaya'],
        'category': 'Supporting Heritage',
        'subcategory': 'Rose-Tinted Granite Waterfront Islamic Monument',
        'lat': 2.9358, 'lon': 101.6896, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 114, 'y': 298}
    },
    {
        'id': 'putrajaya_botanical_garden',
        'name': 'Putrajaya Botanical Garden (Taman Botani Putrajaya)',
        'aliases': ['putrajaya botanical garden', 'taman botani putrajaya', 'botanical garden putrajaya', 'moroccan pavilion putrajaya', 'presint 1', 'putrajaya'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Premier National Living Plant Museum & Moroccan Pavilion',
        'lat': 2.9460, 'lon': 101.6980, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 115, 'y': 297}
    },
    {
        'id': 'seri_wawasan_bridge',
        'name': 'Seri Wawasan Bridge (Jambatan Seri Wawasan)',
        'aliases': ['seri wawasan bridge', 'jambatan seri wawasan', 'wawasan bridge', 'putrajaya cable stayed bridge', 'presint 2', 'putrajaya'],
        'category': 'Core Attraction',
        'subcategory': 'Futuristic Asymmetric Cable-Stayed Sail Landmark',
        'lat': 2.9272, 'lon': 101.6836, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 114, 'y': 299}
    },
    {
        'id': 'tuanku_mizan_mosque',
        'name': 'Tuanku Mizan Zainal Abidin Mosque (Iron Mosque / Masjid Besi)',
        'aliases': ['tuanku mizan zainal abidin mosque', 'iron mosque', 'masjid besi', 'masjid tuanku mizan', 'presint 3 mosque', 'putrajaya iron mosque', 'masjid besi putrajaya', 'putrajaya'],
        'category': 'Supporting Heritage',
        'subcategory': 'Modern Architectural Stainless Steel Mosque',
        'lat': 2.9202, 'lon': 101.6828, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 121, 'y': 295}
    },
    {
        'id': 'perdana_putra',
        'name': "Perdana Putra (Prime Minister's Office Complex)",
        'aliases': ['perdana putra', 'prime ministers office', 'prime minister office', 'jabatan perdana menteri', 'kompleks perdana putra', 'dataran putra', 'putrajaya government', 'putrajaya'],
        'category': 'Core Attraction',
        'subcategory': 'National Government Headquarters & Green Dome',
        'lat': 2.9372, 'lon': 101.6925, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 121, 'y': 294}
    },
    {
        'id': 'putrajaya_wetlands',
        'name': 'Putrajaya Wetlands Park (Taman Wetlands Putrajaya)',
        'aliases': ['putrajaya wetlands', 'taman wetlands', 'taman wetland putrajaya', 'wetlands park', 'putrajaya wetlands park', 'flamingo lake putrajaya', 'wetlands', 'putrajaya'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Largest Freshwater Constructed Eco-Wetlands',
        'lat': 2.9602, 'lon': 101.6970, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 122, 'y': 293}
    },
    {
        'id': 'taman_saujana_hijau',
        'name': 'Taman Saujana Hijau (European Pine Gardens)',
        'aliases': ['taman saujana hijau', 'saujana hijau', 'presint 11 park', 'european park putrajaya', 'pine tree park putrajaya', 'saujana hijau park', 'putrajaya'],
        'category': 'Natural Sanctuary',
        'subcategory': 'European-Style Conifer Pine & Floral Hill Park',
        'lat': 2.9610, 'lon': 101.6815, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 120, 'y': 293}
    },
    {
        'id': 'cruise_tasik_putrajaya',
        'name': 'Cruise Tasik Putrajaya (Putrajaya Lake Cruise)',
        'aliases': ['cruise tasik putrajaya', 'putrajaya cruise', 'cruise tasik', 'tasik putrajaya', 'putrajaya lake cruise', 'putrajaya lake', 'lake cruise', 'putrajaya boat tour', 'putrajaya'],
        'category': 'Recreation & Leisure',
        'subcategory': 'Catamaran & Gondola Sightseeing Lake Cruise',
        'lat': 2.9336, 'lon': 101.6903, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 121, 'y': 295}
    },
    {
        'id': 'picc_putrajaya',
        'name': 'Putrajaya International Convention Centre (PICC)',
        'aliases': ['picc', 'putrajaya international convention centre', 'pusat konvensyen antarabangsa putrajaya', 'picc putrajaya', 'presint 5', 'putrajaya'],
        'category': 'Core Attraction',
        'subcategory': 'Iconic Hilltop Flying Saucer Architectural Convention Centre',
        'lat': 2.8956, 'lon': 101.6775, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 121, 'y': 297}
    },
    {
        'id': 'seri_gemilang_bridge',
        'name': 'Seri Gemilang Bridge (Jambatan Seri Gemilang)',
        'aliases': ['seri gemilang bridge', 'jambatan seri gemilang', 'seri gemilang', 'picc bridge', 'paris bridge putrajaya', 'putrajaya'],
        'category': 'Core Attraction',
        'subcategory': 'Parisian Beaux-Arts Style Ceremonial Bridge',
        'lat': 2.9004, 'lon': 101.6784, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 121, 'y': 297}
    },
    {
        'id': 'seri_saujana_bridge',
        'name': 'Seri Saujana Bridge (Jambatan Seri Saujana)',
        'aliases': ['seri saujana bridge', 'jambatan seri saujana', 'seri saujana', 'arch bridge putrajaya', 'cable stayed arch bridge', 'putrajaya'],
        'category': 'Core Attraction',
        'subcategory': 'Futuristic Tied-Arch & Cable-Stayed Bridge',
        'lat': 2.9147, 'lon': 101.6781, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 121, 'y': 296}
    },
    {
        'id': 'taman_warisan_pertanian',
        'name': 'Taman Warisan Pertanian (Agriculture Heritage Park)',
        'aliases': ['taman warisan pertanian', 'agriculture heritage park', 'warisan pertanian', 'agro tourism putrajaya', 'presint 16', 'putrajaya'],
        'category': 'Supporting Heritage',
        'subcategory': 'Traditional Agro-Heritage & Tropical Crop Living Museum',
        'lat': 2.9274, 'lon': 101.7004, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 122, 'y': 295}
    },
    {
        'id': 'putrajaya_challenge_park',
        'name': 'Putrajaya Challenge Park (Taman Cabaran Presint 20)',
        'aliases': ['putrajaya challenge park', 'taman cabaran', 'taman cabaran putrajaya', 'challenge park', 'rock climbing putrajaya', 'skate park putrajaya', 'putrajaya'],
        'category': 'Recreation & Leisure',
        'subcategory': 'Extreme Sports Complex, Indoor Rock Climbing & Skate Park',
        'lat': 2.8906, 'lon': 101.6705, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 120, 'y': 298}
    },
    {
        'id': 'anjung_floria',
        'name': 'Anjung Floria & Pantai Floria (Floria Putrajaya)',
        'aliases': ['anjung floria', 'pantai floria', 'floria putrajaya', 'royal floria', 'taman floria', 'presint 4 floria', 'putrajaya beach', 'putrajaya'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Lakefront Promenade & Royal Floria Flower Exhibition Grounds',
        'lat': 2.9131, 'lon': 101.6774, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 121, 'y': 296}
    },
    {
        'id': 'marina_putrajaya',
        'name': 'Marina Putrajaya & Lake Club',
        'aliases': ['marina putrajaya', 'kelab tasik putrajaya', 'putrajaya marina', 'water sports putrajaya', 'lake club putrajaya', 'presint 5 marina', 'putrajaya'],
        'category': 'Recreation & Leisure',
        'subcategory': 'Lakefront Marina & Water Sports Centre',
        'lat': 2.8992, 'lon': 101.6684, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 120, 'y': 297}
    },
    {
        'id': 'taman_ekuestrian_putrajaya',
        'name': 'Taman Ekuestrian Putrajaya (Putrajaya Equestrian Park)',
        'aliases': ['taman ekuestrian putrajaya', 'putrajaya equestrian park', 'taman ekuestrian', 'horse riding putrajaya', 'equestrian putrajaya', 'putrajaya'],
        'category': 'Recreation & Leisure',
        'subcategory': 'Premier Equestrian Arena & Horse Riding Complex',
        'lat': 2.8990, 'lon': 101.6950, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 122, 'y': 297}
    },
    {
        'id': 'alamanda_putrajaya',
        'name': 'Alamanda Shopping Centre Putrajaya',
        'aliases': ['alamanda putrajaya', 'alamanda shopping centre', 'alamanda', 'alamanda mall', 'presint 1 shopping', 'putrajaya'],
        'category': 'Recreation & Leisure',
        'subcategory': 'Premier Retail & Entertainment Lifestyle Centre',
        'lat': 2.9403, 'lon': 101.7126, 'state': 'W.P. Putrajaya', 'district': 'Putrajaya',
        'override_coords': {'x': 123, 'y': 294}
    },
    {
        'id': 'ioi_city_mall',
        'name': 'IOI City Mall & IOI City Farm (Putrajaya Border)',
        'aliases': ['ioi city mall', 'ioi mall putrajaya', 'ioi city farm', 'district 21', 'ioi resort city', 'putrajaya mall', 'putrajaya'],
        'category': 'Recreation & Leisure',
        'subcategory': 'Mega Regional Shopping, Ice Rink & Adventure Resort',
        'lat': 2.9697, 'lon': 101.7145, 'state': 'Selangor', 'district': 'Sepang',
        'override_coords': {'x': 123, 'y': 292}
    },
    {
        'id': 'millennium_monument_putrajaya',
        'match_id': 'OSM_relation_8455783',
        'name': 'Millennium Monument Putrajaya (Monumen Alaf Baru)',
        'aliases': ['millennium monument', 'monumen alaf baru', 'putrajaya obelisk', 'presint 2', 'monumen alaf baru putrajaya', 'alaf baru', 'putrajaya'],
        'category': 'Supporting Heritage',
        'subcategory': 'National Historical Timeline Obelisk & Waterfront Pier',
        'override_coords': {'x': 121, 'y': 295}
    },
    {
        'id': 'astaka_morocco_putrajaya',
        'match_id': 'OSM_node_13378194605',
        'name': 'Astaka Morocco (Moroccan Pavilion Putrajaya)',
        'aliases': ['astaka morocco', 'moroccan pavilion', 'pavilion melayu maghribi', 'morocco pavilion', 'astaka morocco putrajaya', 'moroccan pavilion putrajaya', 'putrajaya'],
        'category': 'Supporting Heritage',
        'subcategory': 'Exquisite Moorish Architecture & Mosaics Gallery',
        'override_coords': {'x': 122, 'y': 294}
    },
    {
        'id': 'istana_melawati_putrajaya',
        'match_id': 'OSM_relation_17418186',
        'name': 'Istana Melawati (Royal Palace Putrajaya)',
        'aliases': ['istana melawati', 'melawati palace', 'putrajaya royal palace', 'istana negara putrajaya', 'presint 1 palace', 'putrajaya'],
        'category': 'Supporting Heritage',
        'subcategory': 'Palace of the Yang di-Pertuan Agong',
        'override_coords': {'x': 122, 'y': 294}
    },

    # Labuan
    {
        'id': 'labuan_marine_park',
        'name': 'Labuan Marine Park (Taman Laut Labuan - Kuraman & Rusukan)',
        'aliases': ['labuan marine park', 'taman laut labuan', 'pulau kuraman', 'pulau rusukan besar', 'pulau rusukan kecil', 'labuan diving', 'labuan'],
        'category': 'Natural Sanctuary',
        'subcategory': 'Pristine South China Sea Coral & Wreck Diving Sanctuary',
        'lat': 5.2250, 'lon': 115.1450, 'state': 'W.P. Labuan', 'district': 'Labuan',
        'override_coords': {'x': 805, 'y': 155}
    }
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
    
    # Rich alias building
    if config:
        aliases = list(config['aliases'])
    else:
        aliases = [name.lower(), district.lower(), sname.lower()]
        
        # Add English and Malay names from coverage dataset
        ne = str(row.get('name_en', '')).strip().lower()
        if ne and ne != 'nan' and ne not in aliases:
            aliases.append(ne)
        nm = str(row.get('name_ms', '')).strip().lower()
        if nm and nm != 'nan' and nm not in aliases:
            aliases.append(nm)
            
        # Geographic detection for islands & popular regions
        # Pulau Redang
        if (5.72 <= lat <= 5.84 and 102.98 <= lon <= 103.07) or ('kuala nerus' in district.lower() and any(w in name.lower() for w in ['redang', 'pasir', 'teluk pauh', 'chagar', 'snorkell', 'kalong'])):
            for tag in ['pulau redang', 'redang island', 'redang', 'redang marine park']:
                if tag not in aliases:
                    aliases.append(tag)
        # Pulau Tioman
        if (2.68 <= lat <= 2.94 and 104.04 <= lon <= 104.28) or ('tioman' in name.lower()):
            for tag in ['pulau tioman', 'tioman island', 'tioman']:
                if tag not in aliases:
                    aliases.append(tag)
        # Pulau Pangkor
        if (4.18 <= lat <= 4.29 and 100.53 <= lon <= 100.61) or ('pangkor' in name.lower()):
            for tag in ['pulau pangkor', 'pangkor island', 'pangkor']:
                if tag not in aliases:
                    aliases.append(tag)
        # Pulau Perhentian
        if (5.85 <= lat <= 5.97 and 102.70 <= lon <= 102.79) or ('perhentian' in name.lower()):
            for tag in ['pulau perhentian', 'perhentian islands', 'perhentian']:
                if tag not in aliases:
                    aliases.append(tag)
        # Sipadan / Semporna
        if (4.10 <= lat <= 4.20 and 118.60 <= lon <= 118.67) or ('sipadan' in name.lower()):
            for tag in ['sipadan', 'pulau sipadan', 'sipadan island']:
                if tag not in aliases:
                    aliases.append(tag)
        # Langkawi
        if (6.20 <= lat <= 6.45 and 99.60 <= lon <= 99.95) or ('langkawi' in name.lower()):
            for tag in ['langkawi', 'pulau langkawi']:
                if tag not in aliases:
                    aliases.append(tag)
        # Penang Island
        if (5.25 <= lat <= 5.50 and 100.18 <= lon <= 100.35):
            for tag in ['penang', 'pulau pinang', 'penang island']:
                if tag not in aliases:
                    aliases.append(tag)
        # Putrajaya
        if (2.87 <= lat <= 2.98 and 101.66 <= lon <= 101.73) or ('putrajaya' in sname.lower()):
            for tag in ['putrajaya', 'wp putrajaya', 'w.p. putrajaya', 'putrajaya lake']:
                if tag not in aliases:
                    aliases.append(tag)
                    
        # Common Malaysian bilingual keywords
        lower_name = name.lower()
        if 'masjid' in lower_name and 'mosque' not in aliases:
            aliases.append(lower_name.replace('masjid', 'mosque'))
        if 'muzium' in lower_name and 'museum' not in aliases:
            aliases.append(lower_name.replace('muzium', 'museum'))
        if 'pantai' in lower_name and 'beach' not in aliases:
            aliases.append(lower_name.replace('pantai', 'beach'))
        if 'air terjun' in lower_name and 'waterfall' not in aliases:
            aliases.append(lower_name.replace('air terjun', 'waterfall'))
        if 'gua' in lower_name and 'cave' not in aliases:
            aliases.append(lower_name.replace('gua', 'cave'))
        if 'taman' in lower_name and 'park' not in aliases:
            aliases.append(lower_name.replace('taman', 'park'))
        if 'gunung' in lower_name:
            aliases.append(lower_name.replace('gunung', 'mount'))
            aliases.append(lower_name.replace('gunung', 'mountain'))
        if 'bukit' in lower_name:
            aliases.append(lower_name.replace('bukit', 'hill'))
        if 'candi' in lower_name and 'temple' not in aliases:
            aliases.append(lower_name.replace('candi', 'temple'))
        if 'jeti' in lower_name and 'jetty' not in aliases:
            aliases.append(lower_name.replace('jeti', 'jetty'))

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
    mid = fcfg.get('match_id')
    row = None
    if mid:
        match_row = merged[merged['asset_id'] == mid]
        if len(match_row) > 0:
            row = match_row.iloc[0].to_dict()
            flagship_match_ids.add(mid)
    
    if row is None:
        # Construct empirical record using spatial KDTree
        lat = fcfg['lat']
        lon = fcfg['lon']
        sname = fcfg['state']
        district = fcfg.get('district', sname)
        aid = fcfg['id']
        
        _, r_idx = road_tree.query([lat, lon])
        r_row = df_road_clean.iloc[r_idx]
        
        _, pt_idx = pt_tree.query([lat, lon])
        pt_row = df_pt_clean.iloc[pt_idx]
        
        _, hc_idx = hc_tree.query([lat, lon])
        hc_row = df_hc_clean.iloc[hc_idx]
        
        _, env_idx = env_tree.query([lat, lon])
        env_row = df_env_clean.iloc[env_idx]
        
        row = {
            'asset_id': aid,
            'name': fcfg['name'],
            'state': sname,
            'district': district,
            'lat': lat,
            'lon': lon,
            'category': fcfg.get('category', 'Core Attraction'),
            'distance_to_road_m': r_row['distance_to_road_m'],
            'nearest_road_name': r_row['nearest_road_name'],
            'road_access_tier': r_row['road_access_tier'],
            'distance_to_pt_m': pt_row['distance_to_pt_m'],
            'nearest_pt_name': pt_row['nearest_pt_name'],
            'pt_access_tier': pt_row['pt_access_tier'],
            'distance_to_healthcare_km': hc_row['distance_to_healthcare_km'],
            'nearest_healthcare_name': hc_row['nearest_healthcare_name'],
            'healthcare_access_tier': hc_row['healthcare_access_tier'],
            'distance_to_sensitive_area_km': env_row['distance_to_sensitive_area_km'],
            'nearest_environment_name': env_row['nearest_environment_name'],
            'relationship': env_row['relationship']
        }
    
    final_compact.append(build_compact_record(row, fcfg))

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
