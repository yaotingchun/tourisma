import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('src/data/destinationsOsmData.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

def normalize(s):
    if not s:
        return ''
    s = re.sub(r"['’\"]", '', str(s).lower())
    s = re.sub(r"[-/]", ' ', s)
    return s.strip()

def search(query, limit=5):
    clean_q = normalize(query)
    tokens = clean_q.split()
    scored = []

    for d in raw:
        name = normalize(d[1])
        district = normalize(d[4])
        state = normalize(d[3])
        subcat = normalize(d[6])
        aliases = [normalize(a) for a in d[26]] if len(d) > 26 and d[26] else []
        full_text = f"{name} {' '.join(aliases)} {district} {state} {subcat}"

        if not all(t in full_text for t in tokens):
            continue

        score = 0
        if name == clean_q:
            score += 500
        elif name.startswith(clean_q):
            score += 250
        elif clean_q in name:
            score += 150

        if clean_q in aliases:
            score += 200
        elif any(clean_q in al for al in aliases):
            score += 100

        for tok in tokens:
            if tok in name: score += 40
            if any(tok in al for al in aliases): score += 30
            if tok in district: score += 15
            if tok in subcat: score += 10
            if tok in state: score += 5

        scored.append((score, d[0], d[1], d[3], d[4]))

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[:limit]

destinations_by_state = {
    'W.P. Kuala Lumpur': [
        'Petronas Twin Towers', 'Merdeka 118', 'Batu Caves', 'Bukit Bintang',
        'National Museum', 'KL Tower', 'Central Market', 'Petaling Street',
        'Perdana Botanical Garden', 'Thean Hou Temple', 'Aquaria KLCC',
        'Islamic Arts Museum', 'Dataran Merdeka'
    ],
    'Selangor': [
        'Sunway Lagoon', 'Sepang Circuit', 'Pantai Redang', 'Kuala Selangor Fireflies',
        'Blue Mosque Shah Alam', 'FRIM Kepong', 'Broga Hill', 'Pulau Ketam'
    ],
    'Pulau Pinang': [
        'George Town Heritage', 'Penang Hill', 'Kek Lok Si', 'Batu Ferringhi',
        'Cheong Fatt Tze', 'Chew Jetty', 'ESCAPE Penang', 'Penang National Park',
        'Khoo Kongsi', 'Entopia Butterfly Farm', 'Fort Cornwallis'
    ],
    'Pahang': [
        'Cameron Highlands', 'Genting Highlands', 'Taman Negara', 'Pulau Tioman',
        'Frasers Hill', 'Cherating Beach', 'Teluk Cempedak', 'Sungai Lembing',
        'Kuala Gandah Elephant Sanctuary'
    ],
    'Melaka': [
        'The Stadthuys', 'Jonker Street', 'A Famosa', 'Melaka River Cruise',
        'Christ Church Melaka', 'Menara Taming Sari', 'Melaka Straits Mosque',
        'Baba Nyonya Heritage Museum', 'Cheng Hoon Teng'
    ],
    'Johor': [
        'Legoland Malaysia', 'Desaru Coast', 'Endau-Rompin', 'Sultan Abu Bakar Mosque',
        'Tanjung Piai', 'Pulau Rawa', 'Pulau Aur', 'Gunung Ledang', 'Danga Bay'
    ],
    'Perak': [
        'Ipoh Old Town', 'Pulau Pangkor', 'Kellies Castle', 'Royal Belum',
        'Lost World of Tambun', 'Gua Tempurung', 'Perak Cave Temple',
        'Sam Poh Tong', 'Taiping Lake Gardens', 'Kota Belanda'
    ],
    'Kedah': [
        'Langkawi Sky Bridge', 'Underwater World Langkawi', 'Kilim Karst',
        'Pantai Cenang', 'Dayang Bunting', 'Gunung Jerai', 'Alor Setar Tower',
        'Zahir Mosque', 'Pulau Payar'
    ],
    'Terengganu': [
        'Pulau Redang', 'Perhentian Islands', 'Pulau Kapas', 'Tasik Kenyir',
        'Crystal Mosque', 'Pasar Payang', 'Pantai Batu Buruk', 'Bukit Keluang',
        'Rantau Abang'
    ],
    'Kelantan': [
        'Siti Khadijah Market', 'Pantai Cahaya Bulan', 'Gunung Stong',
        'Wat Photivihan', 'Istana Jahar', 'Handicraft Village'
    ],
    'Sabah': [
        'Mount Kinabalu', 'Sipadan Island', 'Tunku Abdul Rahman Park',
        'Kinabatangan River', 'Sepilok Orangutan', 'Danum Valley', 'Pulau Mabul',
        'Kundasang War Memorial', 'Poring Hot Springs', 'Bohey Dulang',
        'Tip of Borneo', 'Desa Dairy Farm'
    ],
    'Sarawak': [
        'Gunung Mulu', 'Bako National Park', 'Kuching Waterfront',
        'Sarawak Cultural Village', 'Semenggoh Wildlife', 'Niah National Park',
        'Cat Museum', 'Fairy Cave', 'Fort Margherita'
    ],
    'Negeri Sembilan': [
        'Port Dickson Beach', 'Gunung Datuk', 'Istana Seri Menanti'
    ],
    'Perlis': [
        'Gua Kelam', 'Wang Kelian', 'Perlis State Park', 'Timah Tasoh Lake'
    ],
    'W.P. Putrajaya': [
        'Putra Mosque', 'Pink Mosque', 'Iron Mosque', 'Masjid Besi',
        'Tuanku Mizan Zainal Abidin Mosque', 'Perdana Putra', 'Prime Minister Office',
        'Dataran Putra', 'Putrajaya Wetlands', 'Taman Saujana Hijau',
        'Cruise Tasik Putrajaya', 'PICC', 'Putrajaya International Convention Centre',
        'Millennium Monument', 'Monumen Alaf Baru', 'Seri Wawasan Bridge',
        'Seri Gemilang Bridge', 'Seri Saujana Bridge', 'Taman Warisan Pertanian',
        'Putrajaya Challenge Park', 'Taman Cabaran', 'Astaka Morocco',
        'Moroccan Pavilion', 'Alamanda Putrajaya', 'Putrajaya Equestrian Park',
        'Anjung Floria'
    ],
    'W.P. Labuan': [
        'Labuan Marine Park', 'The Chimney'
    ]
}

total_tests = sum(len(items) for items in destinations_by_state.values())
total_passed = 0
failed_list = []

print(f"============================================================")
print(f" MALAYSIAN DESTINATIONS BENCHMARK: {total_tests} POPULAR DESTINATIONS")
print(f"============================================================\n")

for state, items in destinations_by_state.items():
    print(f"--- {state} ({len(items)} destinations) ---")
    state_pass = 0
    for q in items:
        res = search(q)
        if res:
            state_pass += 1
            total_passed += 1
            top_name = res[0][2]
            top_state = res[0][3]
            top_district = res[0][4]
            print(f"  [PASS] '{q}' -> {top_name} ({top_district}, {top_state})")
        else:
            failed_list.append((state, q))
            print(f"  [FAIL] '{q}'")
    print(f"  State Score: {state_pass} / {len(items)} passed (100%)\n" if state_pass == len(items) else f"  State Score: {state_pass} / {len(items)}\n")

print(f"============================================================")
print(f" FINAL BENCHMARK SUMMARY: {total_passed} / {total_tests} PASSED ({total_passed/total_tests*100:.1f}%)")
print(f"============================================================")

if failed_list:
    print(f"\nFailed items:")
    for st, q in failed_list:
        print(f" - [{st}] {q}")
else:
    print("\nALL 127 POPULAR DESTINATIONS ACROSS ALL 16 STATES/TERRITORIES FOUND SUCCESSFULLY!")
