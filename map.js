// ===== Mapa obszaru obsługi — Sprzątanie Śląsk =====
// Centrum: Rynek w Katowicach. Promień standardowego obszaru obsługi: 75 km (w linii prostej).

(function () {
  if (typeof L === 'undefined') {
    return; // Leaflet się nie wczytał (np. brak internetu) — mapa po prostu nie wyrenderuje się
  }

  const KATOWICE = [50.2584, 19.0239]; // Rynek w Katowicach
  const RADIUS_KM = 75;
  const EARTH_RADIUS_KM = 6371;

  // --- Pomocnicze funkcje geograficzne ---

  // Punkt docelowy w odległości distanceKm od [lat, lon], pod azymutem bearingDeg (0° = północ)
  function destinationPoint(lat, lon, bearingDeg, distanceKm) {
    const d = distanceKm / EARTH_RADIUS_KM;
    const brng = (bearingDeg * Math.PI) / 180;
    const lat1 = (lat * Math.PI) / 180;
    const lon1 = (lon * Math.PI) / 180;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
      );

    return [(lat2 * 180) / Math.PI, (((lon2 * 180) / Math.PI + 540) % 360) - 180];
  }

  // Odległość haversine w km między dwoma punktami [lat, lon]
  function haversineKm(p1, p2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(p2[0] - p1[0]);
    const dLon = toRad(p2[1] - p1[1]);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(p1[0])) * Math.cos(toRad(p2[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
  }

  // Pole powierzchni (wzór Gaussa) — służy do sprawdzenia kierunku nawijania pierścienia
  function signedArea(ring) {
    let sum = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [y1, x1] = ring[i];
      const [y2, x2] = ring[i + 1];
      sum += x1 * y2 - x2 * y1;
    }
    return sum / 2;
  }

  // --- Budowa okręgu 75 km jako wielokąta (żeby maska i granica idealnie się zgadzały) ---
  const CIRCLE_POINTS = 144;
  const circleRing = [];
  for (let i = 0; i <= CIRCLE_POINTS; i++) {
    const bearing = (360 / CIRCLE_POINTS) * i;
    circleRing.push(destinationPoint(KATOWICE[0], KATOWICE[1], bearing, RADIUS_KM));
  }

  // Duży prostokąt obejmujący widoczny obszar świata — tworzy "ramę" maski
  const outerRing = [
    [85, -180],
    [85, 180],
    [-85, 180],
    [-85, -180],
    [85, -180],
  ];

  // Otwór w masce musi mieć przeciwny kierunek nawijania niż rama, żeby faktycznie był "dziurą"
  const holeRing = signedArea(outerRing) * signedArea(circleRing) > 0
    ? circleRing.slice().reverse()
    : circleRing;

  // --- Inicjalizacja mapy ---
  const mapEl = document.getElementById('service-area-map');
  if (!mapEl) return;

  const map = L.map('service-area-map', {
    scrollWheelZoom: false,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // Maska: wszystko poza okręgiem — jasnoszare
  L.polygon([outerRing, holeRing], {
    stroke: false,
    fillColor: '#aab1ba',
    fillOpacity: 0.55,
    interactive: false,
  }).addTo(map);

  // Wnętrze okręgu — półprzezroczysta zieleń + wyraźny zielony obrys
  L.polygon([circleRing], {
    color: '#1f8a4c',
    weight: 3,
    fillColor: '#2fb86a',
    fillOpacity: 0.16,
    interactive: false,
  }).addTo(map);

  // Dopasuj widok tak, by cały obszar 75 km był widoczny
  const north = destinationPoint(KATOWICE[0], KATOWICE[1], 0, RADIUS_KM);
  const east = destinationPoint(KATOWICE[0], KATOWICE[1], 90, RADIUS_KM);
  const south = destinationPoint(KATOWICE[0], KATOWICE[1], 180, RADIUS_KM);
  const west = destinationPoint(KATOWICE[0], KATOWICE[1], 270, RADIUS_KM);
  const bounds = L.latLngBounds([south[0], west[1]], [north[0], east[1]]);
  map.fitBounds(bounds, { padding: [16, 16] });

  // --- Znacznik Katowic (centrum) ---
  const katowiceIcon = L.divIcon({
    className: 'city-label-icon city-label-main',
    html: '<span class="city-dot city-dot-main"></span><span class="city-name city-name-main">Katowice</span>',
    iconSize: [0, 0],
  });
  L.marker(KATOWICE, { icon: katowiceIcon, interactive: false, zIndexOffset: 1000 }).addTo(map);

  // --- Etykiety ważniejszych miast w zasięgu ---
  const CITIES = [
    ['Gliwice', 50.2945, 18.6714],
    ['Zabrze', 50.3249, 18.7857],
    ['Bytom', 50.3484, 18.9166],
    ['Chorzów', 50.2963, 18.9544],
    ['Tychy', 50.1347, 18.9664],
    ['Sosnowiec', 50.2862, 19.104],
    ['Dąbrowa Górnicza', 50.322, 19.1943],
    ['Rybnik', 50.0975, 18.5455],
    ['Bielsko-Biała', 49.8224, 19.0444],
    ['Częstochowa', 50.8118, 19.1203],
    ['Opole', 50.6751, 17.9213],
    ['Kraków', 50.0647, 19.945],
    ['Oświęcim', 50.0343, 19.225],
  ];

  CITIES.forEach(([name, lat, lon]) => {
    const icon = L.divIcon({
      className: 'city-label-icon',
      html: '<span class="city-dot"></span><span class="city-name">' + name + '</span>',
      iconSize: [0, 0],
    });
    L.marker([lat, lon], { icon, interactive: false }).addTo(map);
  });

  // --- Interakcja: kliknięcie na mapie wybiera przybliżoną lokalizację ---
  const latInput = document.getElementById('location-lat-input');
  const lngInput = document.getElementById('location-lng-input');
  const statusInput = document.getElementById('location-status-input');
  const clickNote = document.getElementById('map-click-note');

  let selectedMarker = null;
  const selectedIcon = L.divIcon({
    className: 'selected-location-icon',
    html: '<span class="selected-location-pin"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });

  map.on('click', function (e) {
    const clickedPoint = [e.latlng.lat, e.latlng.lng];
    const distanceKm = haversineKm(KATOWICE, clickedPoint);
    const insideZone = distanceKm <= RADIUS_KM;

    if (selectedMarker) {
      map.removeLayer(selectedMarker);
    }
    selectedMarker = L.marker(clickedPoint, { icon: selectedIcon }).addTo(map);

    if (latInput) latInput.value = e.latlng.lat.toFixed(5);
    if (lngInput) lngInput.value = e.latlng.lng.toFixed(5);

    if (clickNote) {
      clickNote.hidden = false;
      if (insideZone) {
        statusInput.value = 'W standardowym obszarze obsługi';
        clickNote.textContent = 'Wybrana lokalizacja znajduje się w naszym standardowym obszarze obsługi.';
        clickNote.className = 'map-note map-note-ok';
      } else {
        statusInput.value = 'Poza standardowym obszarem obsługi';
        clickNote.textContent = 'Ta lokalizacja może znajdować się poza naszym standardowym obszarem obsługi — skontaktuj się z nami, aby to potwierdzić.';
        clickNote.className = 'map-note map-note-warning';
      }
    }
  });

  // Po załadowaniu strony mapa czasem potrzebuje przeliczenia rozmiaru (np. po animacjach layoutu)
  setTimeout(() => map.invalidateSize(), 300);
  window.addEventListener('resize', () => map.invalidateSize());
})();
