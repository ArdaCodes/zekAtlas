mapboxgl.accessToken = 'pk.eyJ1IjoiYXJkYWNvZGVzIiwiYSI6ImNtOXZzMmJpcDBxZWQya3IwbTJ4YnZmdW8ifQ.Wn-XalzzIupCShVZs5BdLw';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-v9',
    center: [0, 0],
    zoom: 1.5,
    pitch: 75,
    bearing: 0,
    projection: 'globe'
});

map.addControl(new mapboxgl.NavigationControl());
map.doubleClickZoom.disable();

map.on('load', () => {
    map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.terrain-rgb',
        tileSize: 512,
        maxzoom: 14
    });
    map.setTerrain({ source: 'mapbox-dem', exaggeration: 2.0 });

    map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
            'sky-type': 'gradient',
            'sky-atmosphere-color': 'rgba(0, 20, 60, 0.9)',
            'sky-gradient': [
                'interpolate',
                ['linear'],
                ['sky-gradient'],
                0, 'rgba(0, 26, 51, 0.9)',
                0.3, 'rgba(30, 58, 138, 0.7)',
                0.7, 'rgba(100, 149, 237, 0.5)',
                1, 'rgba(255, 255, 255, 0.3)'
            ],
            'sky-atmosphere-halo-color': 'rgba(255, 255, 255, 0.4)',
            'sky-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 0.9,
                5, 1
            ]
        }
    });

    map.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['get', 'height'],
                0, 0,
                200, 200
            ],
            'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['get', 'min_height'],
                0, 0,
                200, 200
            ],
            'fill-extrusion-opacity': 0.6
        }
    });

    map.addSource('countries', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1'
    });

    // Ülke renkleri ve komşu kontrolü
    const colors = [
        '#FF4500', '#32CD32', '#1E90FF', '#FF69B4', '#FFD700',
        '#00CED1', '#FF6347', '#ADFF2F', '#4682B4', '#9932CC',
        '#228B22', '#DC143C', '#20B2AA', '#FF8C00', '#6A5ACD'
    ];

    const countryNeighbors = {
        'TR': ['GR', 'BG', 'GE', 'AM', 'AZ', 'IR', 'IQ', 'SY'],
        'US': ['CA', 'MX'],
        'CA': ['US'],
        'FR': ['BE', 'LU', 'DE', 'CH', 'IT', 'ES', 'AD', 'MC'],
        'DE': ['FR', 'BE', 'NL', 'LU', 'CH', 'AT', 'CZ', 'PL', 'DK'],
        'RU': ['NO', 'FI', 'EE', 'LV', 'LT', 'PL', 'BY', 'UA', 'GE', 'AZ', 'KZ', 'CN', 'KP', 'MN'],
        'CN': ['RU', 'KP', 'MN', 'KZ', 'KG', 'TJ', 'AF', 'PK', 'IN', 'NP', 'BT', 'MM', 'LA', 'VN'],
        // Daha fazla ülke için komşular eklenebilir
    };

    const countryColors = {};
    const assignCountryColors = () => {
        allCountries.forEach(iso => {
            const neighbors = countryNeighbors[iso] || [];
            const usedColors = neighbors.map(n => countryColors[n]).filter(c => c);
            const availableColor = colors.find(c => !usedColors.includes(c)) || colors[Math.floor(Math.random() * colors.length)];
            countryColors[iso] = iso === 'TR' ? '#FF3333' : availableColor;
        });
    };

    assignCountryColors();

    map.addLayer({
        id: 'country-borders',
        type: 'fill',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
            'fill-color': [
                'match',
                ['get', 'iso_3166_1'],
                ...Object.entries(countryColors).flat(),
                'rgba(0, 0, 0, 0)'
            ],
            'fill-opacity': 0.6,
            'fill-outline-color': '#ffffff'
        }
    });

    map.addLayer({
        id: 'non-continent-borders',
        type: 'fill',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
            'fill-color': '#808080',
            'fill-opacity': 0.3,
            'fill-outline-color': '#ffffff'
        }
    });

    window.updateCountryBorders = () => {
        const continentKey = Object.keys(continentNames).find(key => continentNames[key] === currentContinent);
        console.log(`Sınır güncelleniyor: ${continentKey}`);
        if (continentKey === 'All') {
            map.setFilter('country-borders', ['!=', ['get', 'iso_3166_1'], '']);
            map.setFilter('non-continent-borders', ['==', ['get', 'iso_3166_1'], '']);
        } else {
            const continentIsos = continents[continentKey].map(c => c.iso);
            map.setFilter('country-borders', ['in', ['get', 'iso_3166_1'], ...continentIsos]);
            map.setFilter('non-continent-borders', ['!in', ['get', 'iso_3166_1'], ...continentIsos]);
        }
        const continentCenters = {
            All: { center: [0, 0], zoom: 1.5 },
            Europe: { center: [10, 50], zoom: 4 },
            Asia: { center: [80, 30], zoom: 3 },
            Americas: { center: [-80, 20], zoom: 3 },
            Africa: { center: [20, 0], zoom: 3 },
            Oceania: { center: [160, -20], zoom: 3 }
        };
        const { center, zoom } = continentCenters[continentKey] || continentCenters.All;
        map.flyTo({
            center,
            zoom,
            duration: 2000,
            essential: true
        });
        console.log(`Harita ${continentKey}’ya odaklandı: ${center}, zoom: ${zoom}`);
    };
});

// Ülkeler ve kıtalar
const continents = {
    Europe: [
        { name: 'Arnavutluk', iso: 'AL', coords: [20.0, 41.0] },
        { name: 'Avusturya', iso: 'AT', coords: [13.0, 47.0] },
        { name: 'Belçika', iso: 'BE', coords: [4.0, 50.0] },
        { name: 'Bosna-Hersek', iso: 'BA', coords: [17.0, 44.0] },
        { name: 'Bulgaristan', iso: 'BG', coords: [25.0, 42.0] },
        { name: 'Hırvatistan', iso: 'HR', coords: [15.0, 45.0] },
        { name: 'Kıbrıs', iso: 'CY', coords: [33.0, 35.0] },
        { name: 'Çekya', iso: 'CZ', coords: [15.0, 50.0] },
        { name: 'Danimarka', iso: 'DK', coords: [10.0, 56.0] },
        { name: 'Estonya', iso: 'EE', coords: [26.0, 59.0] },
        { name: 'Finlandiya', iso: 'FI', coords: [26.0, 64.0] },
        { name: 'Fransa', iso: 'FR', coords: [2.0, 46.0] },
        { name: 'Almanya', iso: 'DE', coords: [10.0, 51.0] },
        { name: 'Yunanistan', iso: 'GR', coords: [22.0, 39.0] },
        { name: 'Macaristan', iso: 'HU', coords: [19.0, 47.0] },
        { name: 'İzlanda', iso: 'IS', coords: [-18.0, 65.0] },
        { name: 'İrlanda', iso: 'IE', coords: [-8.0, 53.0] },
        { name: 'İtalya', iso: 'IT', coords: [12.0, 42.0] },
        { name: 'Letonya', iso: 'LV', coords: [24.0, 57.0] },
        { name: 'Litvanya', iso: 'LT', coords: [24.0, 55.0] },
        { name: 'Lüksemburg', iso: 'LU', coords: [6.0, 49.0] },
        { name: 'Malta', iso: 'MT', coords: [14.0, 35.0] },
        { name: 'Karadağ', iso: 'ME', coords: [19.0, 42.0] },
        { name: 'Hollanda', iso: 'NL', coords: [5.0, 52.0] },
        { name: 'Kuzey Makedonya', iso: 'MK', coords: [21.0, 41.0] },
        { name: 'Norveç', iso: 'NO', coords: [10.0, 62.0] },
        { name: 'Polonya', iso: 'PL', coords: [20.0, 52.0] },
        { name: 'Portekiz', iso: 'PT', coords: [-8.0, 39.0] },
        { name: 'Romanya', iso: 'RO', coords: [25.0, 46.0] },
        { name: 'Sırbistan', iso: 'RS', coords: [20.0, 44.0] },
        { name: 'Slovakya', iso: 'SK', coords: [19.0, 48.0] },
        { name: 'Slovenya', iso: 'SI', coords: [15.0, 46.0] },
        { name: 'İspanya', iso: 'ES', coords: [-4.0, 40.0] },
        { name: 'İsveç', iso: 'SE', coords: [15.0, 62.0] },
        { name: 'İsviçre', iso: 'CH', coords: [8.0, 47.0] },
        { name: 'Türkiye', iso: 'TR', coords: [35.0, 39.0] },
        { name: 'Birleşik Krallık', iso: 'GB', coords: [-2.0, 54.0] },
        { name: 'Ukrayna', iso: 'UA', coords: [30.0, 49.0] }
    ],
    Asia: [
        { name: 'Afganistan', iso: 'AF', coords: [65.0, 33.0] },
        { name: 'Ermenistan', iso: 'AM', coords: [44.0, 40.0] },
        { name: 'Azerbaycan', iso: 'AZ', coords: [47.0, 40.0] },
        { name: 'Bahreyn', iso: 'BH', coords: [50.0, 26.0] },
        { name: 'Bangladeş', iso: 'BD', coords: [90.0, 24.0] },
        { name: 'Butan', iso: 'BT', coords: [90.0, 27.0] },
        { name: 'Brunei', iso: 'BN', coords: [114.0, 4.0] },
        { name: 'Kamboçya', iso: 'KH', coords: [105.0, 13.0] },
        { name: 'Çin', iso: 'CN', coords: [100.0, 35.0] },
        { name: 'Gürcistan', iso: 'GE', coords: [43.0, 42.0] },
        { name: 'Hindistan', iso: 'IN', coords: [78.0, 20.0] },
        { name: 'Endonezya', iso: 'ID', coords: [120.0, -5.0] },
        { name: 'İran', iso: 'IR', coords: [53.0, 32.0] },
        { name: 'Irak', iso: 'IQ', coords: [44.0, 33.0] },
        { name: 'İsrail', iso: 'IL', coords: [34.0, 31.0] },
        { name: 'Japonya', iso: 'JP', coords: [138.0, 36.0] },
        { name: 'Ürdün', iso: 'JO', coords: [36.0, 31.0] },
        { name: 'Kazakistan', iso: 'KZ', coords: [66.0, 48.0] },
        { name: 'Kuveyt', iso: 'KW', coords: [47.0, 29.0] },
        { name: 'Kırgızistan', iso: 'KG', coords: [74.0, 41.0] },
        { name: 'Laos', iso: 'LA', coords: [102.0, 18.0] },
        { name: 'Lübnan', iso: 'LB', coords: [35.0, 33.0] },
        { name: 'Malezya', iso: 'MY', coords: [112.0, 3.0] },
        { name: 'Maldivler', iso: 'MV', coords: [73.0, 3.0] },
        { name: 'Moğolistan', iso: 'MN', coords: [105.0, 46.0] },
        { name: 'Myanmar', iso: 'MM', coords: [98.0, 22.0] },
        { name: 'Nepal', iso: 'NP', coords: [84.0, 28.0] },
        { name: 'Kuzey Kore', iso: 'KP', coords: [127.0, 40.0] },
        { name: 'Umman', iso: 'OM', coords: [55.0, 21.0] },
        { name: 'Pakistan', iso: 'PK', coords: [70.0, 30.0] },
        { name: 'Filipinler', iso: 'PH', coords: [122.0, 13.0] },
        { name: 'Katar', iso: 'QA', coords: [51.0, 25.0] },
        { name: 'Rusya', iso: 'RU', coords: [60.0, 55.0] },
        { name: 'Suudi Arabistan', iso: 'SA', coords: [45.0, 24.0] },
        { name: 'Singapur', iso: 'SG', coords: [103.0, 1.0] },
        { name: 'Güney Kore', iso: 'KR', coords: [127.0, 37.0] },
        { name: 'Sri Lanka', iso: 'LK', coords: [80.0, 7.0] },
        { name: 'Suriye', iso: 'SY', coords: [38.0, 35.0] },
        { name: 'Tacikistan', iso: 'TJ', coords: [71.0, 38.0] },
        { name: 'Tayland', iso: 'TH', coords: [100.0, 15.0] },
        { name: 'Doğu Timor', iso: 'TL', coords: [125.0, -8.0] },
        { name: 'Türkmenistan', iso: 'TM', coords: [60.0, 38.0] },
        { name: 'Birleşik Arap Emirlikleri', iso: 'AE', coords: [54.0, 24.0] },
        { name: 'Özbekistan', iso: 'UZ', coords: [64.0, 41.0] },
        { name: 'Vietnam', iso: 'VN', coords: [108.0, 16.0] },
        { name: 'Yemen', iso: 'YE', coords: [48.0, 15.0] }
    ],
    Americas: [
        { name: 'Arjantin', iso: 'AR', coords: [-64.0, -34.0] },
        { name: 'Bolivya', iso: 'BO', coords: [-65.0, -17.0] },
        { name: 'Brezilya', iso: 'BR', coords: [-55.0, -10.0] },
        { name: 'Kanada', iso: 'CA', coords: [-100.0, 60.0] },
        { name: 'Şili', iso: 'CL', coords: [-71.0, -30.0] },
        { name: 'Kolombiya', iso: 'CO', coords: [-72.0, 4.0] },
        { name: 'Ekvador', iso: 'EC', coords: [-78.0, -2.0] },
        { name: 'Meksika', iso: 'MX', coords: [-102.0, 23.0] },
        { name: 'Paraguay', iso: 'PY', coords: [-58.0, -23.0] },
        { name: 'Peru', iso: 'PE', coords: [-75.0, -10.0] },
        { name: 'Amerika Birleşik Devletleri', iso: 'US', coords: [-100.0, 40.0] },
        { name: 'Uruguay', iso: 'UY', coords: [-56.0, -33.0] },
        { name: 'Venezuela', iso: 'VE', coords: [-66.0, 8.0] }
    ],
    Africa: [
        { name: 'Cezayir', iso: 'DZ', coords: [3.0, 28.0] },
        { name: 'Angola', iso: 'AO', coords: [17.0, -12.0] },
        { name: 'Benin', iso: 'BJ', coords: [2.0, 9.0] },
        { name: 'Botsvana', iso: 'BW', coords: [24.0, -22.0] },
        { name: 'Burkina Faso', iso: 'BF', coords: [-1.0, 12.0] },
        { name: 'Burundi', iso: 'BI', coords: [30.0, -3.0] },
        { name: 'Kamerun', iso: 'CM', coords: [12.0, 6.0] },
        { name: 'Yeşil Burun', iso: 'CV', coords: [-24.0, 16.0] },
        { name: 'Orta Afrika Cumhuriyeti', iso: 'CF', coords: [20.0, 7.0] },
        { name: 'Çad', iso: 'TD', coords: [19.0, 15.0] },
        { name: 'Komorlar', iso: 'KM', coords: [43.0, -12.0] },
        { name: 'Kongo Demokratik Cumhuriyeti', iso: 'CD', coords: [25.0, 0.0] },
        { name: 'Cibuti', iso: 'DJ', coords: [43.0, 11.0] },
        { name: 'Mısır', iso: 'EG', coords: [30.0, 26.0] },
        { name: 'Ekvator Ginesi', iso: 'GQ', coords: [10.0, 1.0] },
        { name: 'Eritre', iso: 'ER', coords: [39.0, 15.0] },
        { name: 'Esvatini', iso: 'SZ', coords: [31.0, -26.0] },
        { name: 'Etiyopya', iso: 'ET', coords: [38.0, 8.0] },
        { name: 'Gabon', iso: 'GA', coords: [11.0, -1.0] },
        { name: 'Gambiya', iso: 'GM', coords: [-15.0, 13.0] },
        { name: 'Gana', iso: 'GH', coords: [-1.0, 8.0] },
        { name: 'Gine', iso: 'GN', coords: [-10.0, 11.0] },
        { name: 'Gine-Bissau', iso: 'GW', coords: [-15.0, 12.0] },
        { name: 'Fildişi Sahili', iso: 'CI', coords: [-5.0, 7.0] },
        { name: 'Kenya', iso: 'KE', coords: [38.0, 1.0] },
        { name: 'Lesotho', iso: 'LS', coords: [28.0, -29.0] },
        { name: 'Liberya', iso: 'LR', coords: [-9.0, 6.0] },
        { name: 'Libya', iso: 'LY', coords: [17.0, 25.0] },
        { name: 'Madagaskar', iso: 'MG', coords: [47.0, -20.0] },
        { name: 'Malavi', iso: 'MW', coords: [34.0, -13.0] },
        { name: 'Mali', iso: 'ML', coords: [-4.0, 17.0] },
        { name: 'Moritanya', iso: 'MR', coords: [-10.0, 20.0] },
        { name: 'Mauritius', iso: 'MU', coords: [57.0, -20.0] },
        { name: 'Fas', iso: 'MA', coords: [-5.0, 32.0] },
        { name: 'Mozambik', iso: 'MZ', coords: [35.0, -18.0] },
        { name: 'Namibya', iso: 'NA', coords: [17.0, -22.0] },
        { name: 'Nijer', iso: 'NE', coords: [8.0, 16.0] },
        { name: 'Nijerya', iso: 'NG', coords: [8.0, 10.0] },
        { name: 'Kongo Cumhuriyeti', iso: 'CG', coords: [15.0, -1.0] },
        { name: 'Ruanda', iso: 'RW', coords: [30.0, -2.0] },
        { name: 'Sao Tome ve Principe', iso: 'ST', coords: [7.0, 1.0] },
        { name: 'Senegal', iso: 'SN', coords: [-14.0, 14.0] },
        { name: 'Seyşeller', iso: 'SC', coords: [55.0, -4.0] },
        { name: 'Sierra Leone', iso: 'SL', coords: [-11.0, 8.0] },
        { name: 'Somali', iso: 'SO', coords: [46.0, 5.0] },
        { name: 'Güney Afrika', iso: 'ZA', coords: [24.0, -30.0] },
        { name: 'Güney Sudan', iso: 'SS', coords: [30.0, 7.0] },
        { name: 'Sudan', iso: 'SD', coords: [30.0, 15.0] },
        { name: 'Tanzanya', iso: 'TZ', coords: [35.0, -6.0] },
        { name: 'Togo', iso: 'TG', coords: [1.0, 8.0] },
        { name: 'Tunus', iso: 'TN', coords: [9.0, 34.0] },
        { name: 'Uganda', iso: 'UG', coords: [32.0, 1.0] },
        { name: 'Zambiya', iso: 'ZM', coords: [28.0, -15.0] },
        { name: 'Zimbabve', iso: 'ZW', coords: [30.0, -20.0] }
    ],
    Oceania: [
        { name: 'Avustralya', iso: 'AU', coords: [133.0, -25.0] },
        { name: 'Yeni Zelanda', iso: 'NZ', coords: [174.0, -41.0] },
        { name: 'Fiji', iso: 'FJ', coords: [178.0, -18.0] },
        { name: 'Papua Yeni Gine', iso: 'PG', coords: [147.0, -6.0] },
        { name: 'Samoa', iso: 'WS', coords: [-172.0, -13.0] },
        { name: 'Tonga', iso: 'TO', coords: [-175.0, -20.0] },
        { name: 'Vanuatu', iso: 'VU', coords: [167.0, -16.0] }
    ]
};

const allCountriesList = Object.values(continents).flat();
const allCountries = allCountriesList.map(c => c.iso);

// Zorluk seviyelerine göre ülkeler
const easyCountries = [
    { name: 'Amerika Birleşik Devletleri', iso: 'US', coords: [-100.0, 40.0] },
    { name: 'Çin', iso: 'CN', coords: [100.0, 35.0] },
    { name: 'Rusya', iso: 'RU', coords: [60.0, 55.0] },
    { name: 'Brezilya', iso: 'BR', coords: [-55.0, -10.0] },
    { name: 'Avustralya', iso: 'AU', coords: [133.0, -25.0] },
    { name: 'Hindistan', iso: 'IN', coords: [78.0, 20.0] },
    { name: 'Kanada', iso: 'CA', coords: [-100.0, 60.0] },
    { name: 'Fransa', iso: 'FR', coords: [2.0, 46.0] },
    { name: 'Almanya', iso: 'DE', coords: [10.0, 51.0] },
    { name: 'Japonya', iso: 'JP', coords: [138.0, 36.0] }
];

const mediumCountries = [
    { name: 'Türkiye', iso: 'TR', coords: [35.0, 39.0] },
    { name: 'Meksika', iso: 'MX', coords: [-102.0, 23.0] },
    { name: 'Güney Afrika', iso: 'ZA', coords: [24.0, -30.0] },
    { name: 'İtalya', iso: 'IT', coords: [12.0, 42.0] },
    { name: 'İspanya', iso: 'ES', coords: [-4.0, 40.0] },
    { name: 'Güney Kore', iso: 'KR', coords: [127.0, 37.0] },
    { name: 'Arjantin', iso: 'AR', coords: [-64.0, -34.0] },
    { name: 'Mısır', iso: 'EG', coords: [30.0, 26.0] },
    { name: 'Suudi Arabistan', iso: 'SA', coords: [45.0, 24.0] },
    { name: 'Endonezya', iso: 'ID', coords: [120.0, -5.0] }
];

const hardCountries = [
    { name: 'Maldivler', iso: 'MV', coords: [73.0, 3.0] },
    { name: 'Seyşeller', iso: 'SC', coords: [55.0, -4.0] },
    { name: 'Vanuatu', iso: 'VU', coords: [167.0, -16.0] },
    { name: 'Tonga', iso: 'TO', coords: [-175.0, -20.0] },
    { name: 'Esvatini', iso: 'SZ', coords: [31.0, -26.0] },
    { name: 'Doğu Timor', iso: 'TL', coords: [125.0, -8.0] },
    { name: 'Komorlar', iso: 'KM', coords: [43.0, -12.0] },
    { name: 'Sao Tome ve Principe', iso: 'ST', coords: [7.0, 1.0] },
    { name: 'Yeşil Burun', iso: 'CV', coords: [-24.0, 16.0] },
    { name: 'Malta', iso: 'MT', coords: [14.0, 35.0] }
];

let currentContinent = null;
let currentCountry = null;
let currentDifficulty = 'easy';
let score = 0;
let wrongAttempts = 0;
let gameStarted = false;
let playerName = '';
let highScore = { name: '', score: 0 };

const continentNames = {
    All: 'Tüm Kıtalar',
    Europe: 'Avrupa',
    Asia: 'Asya',
    Americas: 'Amerika',
    Africa: 'Afrika',
    Oceania: 'Okyanusya'
};

const continentMusic = {
    'Tüm Kıtalar': 'https://www.bensound.com/bensound-music/bensound-sunny.mp3',
    'Avrupa': 'https://www.bensound.com/bensound-music/bensound-november.mp3',
    'Asya': 'https://www.bensound.com/bensound-music/bensound-india.mp3',
    'Amerika': 'https://www.bensound.com/bensound-music/bensound-clearday.mp3',
    'Afrika': 'https://www.bensound.com/bensound-music/bensound-savanna.mp3',
    'Okyanusya': 'https://www.bensound.com/bensound-music/bensound-ukulele.mp3'
};

let isMusicPlaying = true;
const backgroundMusic = new Audio();
backgroundMusic.loop = true;
backgroundMusic.volume = 0.2;

const correctSound = new Audio('https://www.soundjay.com/buttons/sounds/button-09.mp3');
const wrongSound = new Audio('https://www.soundjay.com/buttons/sounds/button-10.mp3');
correctSound.volume = 0.3;
wrongSound.volume = 0.3;

function loadMusic() {
    console.log(`Müzik yükleniyor: ${continentMusic[currentContinent]}`);
    backgroundMusic.src = continentMusic[currentContinent] || continentMusic['Tüm Kıtalar'];
    if (isMusicPlaying) {
        backgroundMusic.play()
            .then(() => console.log(`Müzik oynatılıyor: ${backgroundMusic.src}`))
            .catch(error => {
                console.error(`Müzik oynatılamadı: ${error}, URL: ${backgroundMusic.src}`);
                backgroundMusic.src = continentMusic['Tüm Kıtalar'];
                backgroundMusic.play()
                    .then(() => console.log(`Varsayılan müzik oynatılıyor: ${backgroundMusic.src}`))
                    .catch(err => console.error(`Varsayılan müzik de oynatılamadı: ${err}`));
            });
    }
}

function updateHighScore() {
    if (score > highScore.score) {
        highScore = { name: playerName, score };
        localStorage.setItem('highScore', JSON.stringify(highScore));
        document.getElementById('high-score').textContent = `En Yüksek Skor: ${highScore.name} - ${highScore.score}`;
        document.getElementById('high-score').classList.add('score-pulse');
        setTimeout(() => document.getElementById('high-score').classList.remove('score-pulse'), 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedHighScore = localStorage.getItem('highScore');
    if (savedHighScore) {
        highScore = JSON.parse(savedHighScore);
        document.getElementById('high-score').textContent = `En Yüksek Skor: ${highScore.name} - ${highScore.score}`;
    }

    const startScreen = document.createElement('div');
    startScreen.id = 'start-screen';
    startScreen.style.position = 'absolute';
    startScreen.style.top = '0';
    startScreen.style.left = '0';
    startScreen.style.width = '100%';
    startScreen.style.height = '100%';
    startScreen.style.background = 'rgba(0, 26, 51, 0.9)';
    startScreen.style.display = 'flex';
    startScreen.style.flexDirection = 'column';
    startScreen.style.justifyContent = 'center';
    startScreen.style.alignItems = 'center';
    startScreen.style.zIndex = '20';

    const title = document.createElement('h1');
    title.textContent = 'ZekAtlaS';
    title.style.fontSize = '52px';
    title.style.marginBottom = '20px';

    const instructions = document.createElement('div');
    instructions.id = 'instructions';
    instructions.style.background = 'rgba(255, 255, 255, 0.9)';
    instructions.style.padding = '20px';
    instructions.style.borderRadius = '8px';
    instructions.style.maxWidth = '400px';
    instructions.style.textAlign = 'center';
    instructions.style.color = '#001a33';
    instructions.style.fontSize = '16px';
    instructions.style.lineHeight = '1.5';
    instructions.innerHTML = `
        <h2>Nasıl Oynanır?</h2>
        <p>1. Bir kıta ve zorluk seviyesi seçin.<br>
           2. İstenen ülkeye iki kez tıklayın.<br>
           3. 3 yanlış yaparsanız oyun biter.<br>
           4. Skorunuzu yükseltin!</p>
        <button id="instructions-ok" style="margin-top: 15px; padding: 10px 20px; font-size: 16px; background: #ffd700; border: none; border-radius: 8px; cursor: pointer;">Anladım</button>
    `;

    const nameInput = document.createElement('input');
    nameInput.id = 'name-input';
    nameInput.type = 'text';
    nameInput.placeholder = 'İsminizi girin';
    nameInput.style.padding = '12px';
    nameInput.style.fontSize = '18px';
    nameInput.style.marginBottom = '20px';
    nameInput.style.borderRadius = '8px';
    nameInput.style.border = 'none';
    nameInput.style.width = '220px';
    nameInput.style.display = 'none';

    const continentSelection = document.createElement('div');
    continentSelection.id = 'continent-selection';
    continentSelection.style.background = 'rgba(255, 255, 255, 0.9)';
    continentSelection.style.padding = '20px';
    continentSelection.style.borderRadius = '8px';
    continentSelection.style.maxWidth = '400px';
    continentSelection.style.textAlign = 'center';
    continentSelection.style.color = '#001a33';
    continentSelection.style.fontSize = '16px';
    continentSelection.style.lineHeight = '1.5';
    continentSelection.style.display = 'none';
    continentSelection.innerHTML = `
        <h2>Kıta Seçin</h2>
        <div id="continent-buttons"></div>
    `;

    const difficultySelection = document.createElement('div');
    difficultySelection.id = 'difficulty-selection';
    difficultySelection.style.background = 'rgba(255, 255, 255, 0.9)';
    difficultySelection.style.padding = '20px';
    difficultySelection.style.borderRadius = '8px';
    difficultySelection.style.maxWidth = '400px';
    difficultySelection.style.textAlign = 'center';
    difficultySelection.style.color = '#001a33';
    difficultySelection.style.fontSize = '16px';
    difficultySelection.style.lineHeight = '1.5';
    difficultySelection.style.display = 'none';
    difficultySelection.innerHTML = `
        <h2>Zorluk Seviyesi Seçin</h2>
        <div id="difficulty-buttons"></div>
    `;

    const startButton = document.createElement('button');
    startButton.id = 'start-button';
    startButton.textContent = 'Oyuna Başla';
    startButton.style.padding = '15px 35px';
    startButton.style.fontSize = '26px';
    startButton.style.background = '#ffd700';
    startButton.style.border = 'none';
    startButton.style.borderRadius = '8px';
    startButton.style.cursor = 'pointer';
    startButton.style.display = 'none';

    instructions.querySelector('#instructions-ok').onclick = () => {
        instructions.style.display = 'none';
        nameInput.style.display = 'block';
        continentSelection.style.display = 'block';
        difficultySelection.style.display = 'block';
    };

    startButton.onclick = () => {
        playerName = nameInput.value.trim() || 'Oyuncu';
        if (playerName && currentContinent && currentDifficulty) {
            gameStarted = true;
            startScreen.style.display = 'none';
            score = 0;
            wrongAttempts = 0;
            selectRandomCountry();
            window.updateCountryBorders();
            document.getElementById('score').textContent = `İsim: ${playerName}, Skor: ${score}`;
            loadMusic();
        }
    };

    ['All', ...Object.keys(continents)].forEach(continent => {
        const button = document.createElement('button');
        button.textContent = continentNames[continent];
        button.style.margin = '5px';
        button.style.padding = '8px 12px';
        button.style.background = '#fff';
        button.style.border = 'none';
        button.style.cursor = 'pointer';
        button.onclick = () => {
            currentContinent = continentNames[continent];
            document.querySelectorAll('#continent-buttons button').forEach(btn => {
                btn.style.background = btn.textContent === currentContinent ? '#ffd700' : '#fff';
            });
            startButton.style.display = currentDifficulty ? 'block' : 'none';
        };
        continentSelection.querySelector('#continent-buttons').appendChild(button);
    });

    ['easy', 'medium', 'hard'].forEach(difficulty => {
        const button = document.createElement('button');
        button.textContent = difficulty === 'easy' ? 'Kolay' : difficulty === 'medium' ? 'Orta' : 'Zor';
        button.style.margin = '5px';
        button.style.padding = '8px 12px';
        button.style.background = '#fff';
        button.style.border = 'none';
        button.style.cursor = 'pointer';
        button.onclick = () => {
            currentDifficulty = difficulty;
            document.querySelectorAll('#difficulty-buttons button').forEach(btn => {
                btn.style.background = btn.textContent.toLowerCase() === difficulty || (btn.textContent === 'Kolay' && difficulty === 'easy') || (btn.textContent === 'Orta' && difficulty === 'medium') || (btn.textContent === 'Zor' && difficulty === 'hard') ? '#ffd700' : '#fff';
            });
            startButton.style.display = currentContinent ? 'block' : 'none';
        };
        difficultySelection.querySelector('#difficulty-buttons').appendChild(button);
    });

    startScreen.appendChild(title);
    startScreen.appendChild(instructions);
    startScreen.appendChild(nameInput);
    startScreen.appendChild(continentSelection);
    startScreen.appendChild(difficultySelection);
    startScreen.appendChild(startButton);
    document.body.appendChild(startScreen);

    const confirmModal = document.createElement('div');
    confirmModal.id = 'confirm-modal';
    confirmModal.style.position = 'absolute';
    confirmModal.style.top = '0';
    confirmModal.style.left = '0';
    confirmModal.style.width = '100%';
    confirmModal.style.height = '100%';
    confirmModal.style.background = 'rgba(0, 26, 51, 0.9)';
    confirmModal.style.display = 'none';
    confirmModal.style.flexDirection = 'column';
    confirmModal.style.justifyContent = 'center';
    confirmModal.style.alignItems = 'center';
    confirmModal.style.zIndex = '20';
    confirmModal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.9); padding: 20px; border-radius: 8px; max-width: 400px; text-align: center; color: #001a33; font-size: 16px; line-height: 1.5;">
            <p id="confirm-message"></p>
            <button id="confirm-yes" style="margin: 10px; padding: 10px 20px; font-size: 16px; background: #ffd700; border: none; border-radius: 8px; cursor: pointer;">Evet</button>
            <button id="confirm-no" style="margin: 10px; padding: 10px 20px; font-size: 16px; background: #ff4500; border: none; border-radius: 8px; cursor: pointer;">Hayır</button>
        </div>
    `;
    document.body.appendChild(confirmModal);

    const soundPanel = document.createElement('div');
    soundPanel.style.position = 'absolute';
    soundPanel.style.top = '90px';
    soundPanel.style.right = '10px';
    soundPanel.style.zIndex = '10';
    soundPanel.style.background = 'rgba(0, 26, 51, 0.7)';
    soundPanel.style.padding = '10px';
    soundPanel.style.borderRadius = '8px';

    const volumeLabel = document.createElement('label');
    volumeLabel.textContent = 'Ses: ';
    volumeLabel.style.color = '#fff';
    volumeLabel.style.fontSize = '14px';

    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '50';
    volumeSlider.value = '20';
    volumeSlider.style.width = '80px';
    volumeSlider.oninput = () => {
        const volume = volumeSlider.value / 100;
        backgroundMusic.volume = volume;
        correctSound.volume = volume + 0.1;
        wrongSound.volume = volume + 0.1;
        isMusicPlaying = volume > 0;
        if (isMusicPlaying && !backgroundMusic.src) {
            loadMusic();
        }
        console.log(`Ses seviyesi: ${volume}`);
    };

    soundPanel.appendChild(volumeLabel);
    soundPanel.appendChild(volumeSlider);
    document.body.appendChild(soundPanel);

    const restartButton = document.createElement('button');
    restartButton.id = 'restart-button';
    restartButton.textContent = 'Yeniden Başla';
    restartButton.style.position = 'absolute';
    restartButton.style.top = '10px';
    restartButton.style.left = '10px';
    restartButton.style.zIndex = '10';
    restartButton.style.padding = '8px 12px';
    restartButton.style.background = '#ffd700';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '8px';
    restartButton.style.cursor = 'pointer';
    restartButton.style.display = 'none';
    restartButton.onclick = () => {
        const confirmModal = document.getElementById('confirm-modal');
        document.getElementById('confirm-message').textContent = `İlerlemeniz kaybedilecek. Yeniden başlamak istiyor musunuz?`;
        confirmModal.style.display = 'flex';

        document.getElementById('confirm-yes').onclick = () => {
            updateHighScore();
            score = 0;
            wrongAttempts = 0;
            document.getElementById('score').textContent = `İsim: ${playerName}, Skor: ${score}`;
            updateHearts();
            gameStarted = false;
            document.getElementById('start-screen').style.display = 'flex';
            confirmModal.style.display = 'none';
            restartButton.style.display = 'none';
            console.log('Oyun yeniden başladı');
        };

        document.getElementById('confirm-no').onclick = () => {
            confirmModal.style.display = 'none';
        };
    };
    document.body.appendChild(restartButton);
});

function selectRandomCountry() {
    if (!gameStarted) {
        console.log('Oyun başlamadı, ülke seçilmedi');
        return;
    }
    let countries;
    if (currentDifficulty === 'easy') {
        countries = currentContinent === 'Tüm Kıtalar' ? easyCountries : easyCountries.filter(c => continents[Object.keys(continentNames).find(k => continentNames[k] === currentContinent)]?.some(country => country.iso === c.iso));
    } else if (currentDifficulty === 'medium') {
        countries = currentContinent === 'Tüm Kıtalar' ? mediumCountries : mediumCountries.filter(c => continents[Object.keys(continentNames).find(k => continentNames[k] === currentContinent)]?.some(country => country.iso === c.iso));
    } else {
        countries = currentContinent === 'Tüm Kıtalar' ? hardCountries : hardCountries.filter(c => continents[Object.keys(continentNames).find(k => continentNames[k] === currentContinent)]?.some(country => country.iso === c.iso));
    }
    if (!countries.length) {
        countries = currentContinent === 'Tüm Kıtalar' ? allCountriesList : continents[Object.keys(continentNames).find(k => continentNames[k] === currentContinent)];
    }
    currentCountry = countries[Math.floor(Math.random() * countries.length)];
    document.getElementById('feedback').textContent = `${currentContinent}’da ${currentCountry.name}’yi bul! (Doğru ülke için iki kez tıkla)`;
    document.getElementById('feedback').classList.add('slide-in');
    setTimeout(() => document.getElementById('feedback').classList.remove('slide-in'), 500);
    wrongAttempts = 0;
    updateHearts();
    console.log(`Yeni ülke: ${currentCountry.name}, Zorluk: ${currentDifficulty}`);
}

function updateHearts() {
    const heartsContainer = document.getElementById('hearts');
    heartsContainer.innerHTML = '';
    for (let i = 0; i < 3 - wrongAttempts; i++) {
        const heart = document.createElement('span');
        heart.textContent = '❤️';
        heart.style.fontSize = '28px';
        heart.style.margin = '0 5px';
        heartsContainer.appendChild(heart);
    }
    console.log(`Kalpler güncellendi: ${3 - wrongAttempts} kaldı`);
}

function getCountryContinent(iso) {
    for (const [continent, countries] of Object.entries(continents)) {
        if (countries.some(c => c.iso === iso)) {
            return continentNames[continent];
        }
    }
    return null;
}

map.on('dblclick', async (e) => {
    if (!gameStarted) {
        console.log('Oyun başlamadı, çift tıklama yoksayıldı');
        return;
    }
    const clickedCoords = e.lngLat;
    console.log(`Çift tıklama: ${clickedCoords.lng}, ${clickedCoords.lat}`);
    const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${clickedCoords.lng},${clickedCoords.lat}.json?types=country&access_token=${mapboxgl.accessToken}`
    );
    const data = await response.json();
    const clickedCountryIso = data.features[0]?.properties?.short_code?.toUpperCase();
    if (!clickedCountryIso) {
        console.log('Ülke bulunamadı');
        return;
    }
    const clickedCountryName = allCountriesList.find(c => c.iso === clickedCountryIso)?.name || 'Bilinmeyen Ülke';
    const clickedCountryContinent = getCountryContinent(clickedCountryIso);

    if (clickedCountryIso === currentCountry.iso) {
        score += currentDifficulty === 'easy' ? 1 : currentDifficulty === 'medium' ? 2 : 3; // Zorluk seviyesine göre puan
        document.getElementById('score').textContent = `İsim: ${playerName}, Skor: ${score}`;
        document.getElementById('score').classList.add('score-pulse');
        setTimeout(() => document.getElementById('score').classList.remove('score-pulse'), 500);
        document.getElementById('feedback').textContent = `Doğru! ${currentContinent}’da başka bir ülke bul! (Doğru ülke için iki kez tıkla)`;
        document.getElementById('feedback').classList.add('slide-in');
        setTimeout(() => document.getElementById('feedback').classList.remove('slide-in'), 500);
        updateHighScore();
        if (isMusicPlaying) correctSound.play().catch(error => console.error(`Doğru ses oynatılamadı: ${error}`));
        addStarMarker(clickedCoords);
        setTimeout(selectRandomCountry, 1000);
        console.log(`Doğru ülke: ${clickedCountryName}, Skor: ${score}`);
    } else {
        wrongAttempts++;
        updateHearts();
        if (isMusicPlaying) wrongSound.play().catch(error => console.error(`Yanlış ses oynatılamadı: ${error}`));
        if (wrongAttempts >= 3) {
            updateHighScore();
            score = 0;
            document.getElementById('score').textContent = `İsim: ${playerName}, Skor: ${score}`;
            document.getElementById('feedback').textContent = 'Oyun bitti! Skor sıfırlandı.';
            document.getElementById('feedback').classList.add('slide-in');
            setTimeout(() => document.getElementById('feedback').classList.remove('slide-in'), 500);
            gameStarted = false;
            document.getElementById('start-screen').style.display = 'flex';
            document.getElementById('restart-button').style.display = 'block';
            console.log('Oyun bitti, başlangıç ekranı geri yüklendi');
        } else {
            let feedbackMessage = '';
            if (clickedCountryContinent && clickedCountryContinent !== currentContinent && currentContinent !== 'Tüm Kıtalar') {
                feedbackMessage = `Yanlış! ${clickedCountryName}, ${currentContinent}’da değil, ${clickedCountryContinent}’da! ${currentContinent}’da ${currentCountry.name}’yi bul! (Doğru ülke için iki kez tıkla) ${3 - wrongAttempts} hakkın kaldı.`;
            } else {
                feedbackMessage = `Yanlış! Tıkladığın ülke: ${clickedCountryName}. ${currentContinent}’da ${currentCountry.name}’yi bul! (Doğru ülke için iki kez tıkla) ${3 - wrongAttempts} hakkın kaldı.`;
            }
            document.getElementById('feedback').textContent = feedbackMessage;
            document.getElementById('feedback').classList.add('slide-in');
            setTimeout(() => document.getElementById('feedback').classList.remove('slide-in'), 500);
            console.log(`Yanlış ülke: ${clickedCountryName}, Kalan hak: ${3 - wrongAttempts}`);
        }
    }
});

function addStarMarker(coords) {
    map.addLayer({
        id: 'star-marker',
        type: 'symbol',
        source: {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [coords.lng, coords.lat]
                }
            }
        },
        layout: {
            'icon-image': 'star-15',
            'icon-size': 1.5
        }
    });
    setTimeout(() => {
        if (map.getLayer('star-marker')) map.removeLayer('star-marker');
        if (map.getSource('star-marker')) map.removeSource('star-marker');
    }, 1000);
}