/* ==========================================================
 * HantavirusMap — Khmer edition
 * Author: K.Pichyvoin
 * Inspired by: https://worldmonitor.app/
 * ==========================================================
 * Data sources (aggregated, public):
 *   - WHO Disease Outbreak News
 *   - US CDC HAN / Situation summaries
 *   - ECDC, PAHO
 *   - News: Reuters, AP, BBC
 * ========================================================== */

/* ---------- Static dataset (2026 outbreak + endemic zones) ---------- */
const HANTA_EVENTS = [
  // --- 2026 MV Hondius / Andes virus cluster (primary) ---
  {
    id: 'mv-hondius',
    title: 'ផ្កាយរណប MV Hondius (Andes virus)',
    country: 'មហាសមុទ្រអាត្លង់ទិកខាងត្បូង',
    region: 'កប៉ាល់ទេសចរណ៍',
    lat: -54.5, lng: -36.5,
    severity: 'critical',
    status: 'confirmed',
    cases: 9, confirmed: 6, suspected: 3, deaths: 3,
    date: '2026-05-07',
    strain: 'Andes virus (ANDV)',
    source: 'WHO DON 2026-DON599',
    summary: 'ការរាតត្បាតនៅលើកប៉ាល់ MV Hondius។ អ្នកស្លាប់ ៣ នាក់រួមមានគូស្វាមីភរិយា និងជនជាតិអាល្លឺម៉ង់ម្នាក់។'
  },
  // --- Downstream cases (2026 cluster) ---
  {
    id: 'ch-2026',
    title: 'ប្រទេសស្វ៊ីស — ករណីបញ្ជាក់',
    country: 'ស្វ៊ីស', region: 'ហ្សឺរិច',
    lat: 47.3769, lng: 8.5417,
    severity: 'high', status: 'confirmed',
    cases: 1, confirmed: 1, suspected: 0, deaths: 0,
    date: '2026-05-06',
    strain: 'Andes virus (ANDV)',
    source: 'ECDC',
    summary: 'អ្នកដំណើរត្រឡប់ពី MV Hondius ត្រូវបានបញ្ជាក់ថាឆ្លង។'
  },
  {
    id: 'nl-2026',
    title: 'ហូឡង់ — ករណីបញ្ជាក់',
    country: 'ហូឡង់', region: 'អាំស្ទែដាម',
    lat: 52.3676, lng: 4.9041,
    severity: 'high', status: 'confirmed',
    cases: 1, confirmed: 1, suspected: 0, deaths: 0,
    date: '2026-05-05',
    strain: 'Andes virus (ANDV)',
    source: 'WHO / RIVM',
    summary: 'អ្នកដំណើរម្នាក់ត្រូវបានរកឃើញថាឆ្លងបន្ទាប់ពីការធ្វើដំណើរ។'
  },
  {
    id: 'za-2026',
    title: 'អាហ្វ្រិកខាងត្បូង — ករណីសង្ស័យ',
    country: 'អាហ្វ្រិកខាងត្បូង', region: 'ខេបថោន',
    lat: -33.9249, lng: 18.4241,
    severity: 'medium', status: 'suspected',
    cases: 2, confirmed: 0, suspected: 2, deaths: 0,
    date: '2026-05-04',
    strain: 'Andes virus (ANDV)',
    source: 'NICD',
    summary: 'ករណីសង្ស័យពីរកំពុងស្ថិតនៅក្រោមការតាមដាន។'
  },
  {
    id: 'sg-2026',
    title: 'សិង្ហបុរី — ករណីបញ្ជាក់',
    country: 'សិង្ហបុរី', region: 'សិង្ហបុរី',
    lat: 1.3521, lng: 103.8198,
    severity: 'high', status: 'confirmed',
    cases: 1, confirmed: 1, suspected: 0, deaths: 0,
    date: '2026-05-04',
    strain: 'Andes virus (ANDV)',
    source: 'MOH Singapore',
    summary: 'ករណីបញ្ជាក់មួយនៅសិង្ហបុរី — អ្នកជំងឺកំពុងទទួលការព្យាបាល។'
  },
  {
    id: 'gb-2026',
    title: 'ចក្រភពអង់គ្លេស — ករណីសង្ស័យ',
    country: 'ចក្រភពអង់គ្លេស', region: 'ឡុងដ៍',
    lat: 51.5074, lng: -0.1278,
    severity: 'medium', status: 'suspected',
    cases: 3, confirmed: 0, suspected: 3, deaths: 0,
    date: '2026-05-03',
    strain: 'Andes virus (ANDV)',
    source: 'UKHSA',
    summary: 'ករណីសង្ស័យបីកំពុងត្រូវបានតាមដាន។'
  },
  {
    id: 'us-2026',
    title: 'សហរដ្ឋអាមេរិក — ករណីបញ្ជាក់',
    country: 'សហរដ្ឋអាមេរិក', region: 'Nebraska',
    lat: 41.2565, lng: -95.9345,
    severity: 'high', status: 'confirmed',
    cases: 1, confirmed: 1, suspected: 1, deaths: 0,
    date: '2026-05-08',
    strain: 'Andes virus (ANDV)',
    source: 'CDC HAN 528',
    summary: 'អ្នកដំណើរ ១៧ នាក់ត្រូវបានដាក់ឱ្យនៅដាច់ដោយឡែកនៅ Nebraska។'
  },
  {
    id: 'es-2026',
    title: 'អេស្ប៉ាញ — ករណីសង្ស័យ',
    country: 'អេស្ប៉ាញ', region: 'ម៉ាឌ្រីដ',
    lat: 40.4168, lng: -3.7038,
    severity: 'medium', status: 'suspected',
    cases: 1, confirmed: 0, suspected: 1, deaths: 0,
    date: '2026-05-09',
    strain: 'Andes virus (ANDV)',
    source: 'Ministerio de Sanidad',
    summary: 'ករណីសង្ស័យថ្មីម្នាក់នៅអេស្ប៉ាញ។'
  },
  {
    id: 'cv-2026',
    title: 'កាបវឺដេ — ករណីសង្ស័យ',
    country: 'កាបវឺដេ', region: 'Praia',
    lat: 14.9330, lng: -23.5133,
    severity: 'medium', status: 'suspected',
    cases: 1, confirmed: 0, suspected: 1, deaths: 0,
    date: '2026-05-02',
    strain: 'Andes virus (ANDV)',
    source: 'WHO AFRO',
    summary: 'ករណីសង្ស័យនៅតំបន់ដែលកប៉ាល់បានចាកចេញ។'
  },
  {
    id: 'ar-2026',
    title: 'អាហ្សង់ទីន — តំបន់ឆ្លងធម្មតា',
    country: 'អាហ្សង់ទីន', region: 'Patagonia',
    lat: -41.1335, lng: -71.3103,
    severity: 'high', status: 'confirmed',
    cases: 4, confirmed: 4, suspected: 0, deaths: 0,
    date: '2026-05-01',
    strain: 'Andes virus (ANDV)',
    source: 'PAHO',
    summary: 'តំបន់ដែលវីរុស Andes ឆ្លងធម្មតា — ករណីបន្ថែម ៤ ករណី។'
  },

  // --- Endemic / recurring zones (low-level tracking) ---
  {
    id: 'kr-endemic',
    title: 'កូរ៉េខាងត្បូង — HFRS តំបន់ឆ្លងធម្មតា',
    country: 'កូរ៉េខាងត្បូង', region: 'ស៊េអ៊ូល',
    lat: 37.5665, lng: 126.9780,
    severity: 'low', status: 'endemic',
    cases: 0, confirmed: 0, suspected: 0, deaths: 0,
    date: '2026-04-30',
    strain: 'Hantaan virus',
    source: 'KDCA',
    summary: 'តំបន់ឆ្លងធម្មតានៃមេរោគ Hantaan — តាមដានប្រចាំឆ្នាំ។'
  },
  {
    id: 'cn-endemic',
    title: 'ចិន — HFRS តំបន់ឆ្លងធម្មតា',
    country: 'ចិន', region: 'Shandong',
    lat: 36.6683, lng: 117.0206,
    severity: 'low', status: 'endemic',
    cases: 0, confirmed: 0, suspected: 0, deaths: 0,
    date: '2026-04-30',
    strain: 'Hantaan / Seoul virus',
    source: 'China CDC',
    summary: 'តំបន់ឆ្លងធម្មតាកម្រិតខ្ពស់នៅអាស៊ីខាងជើង។'
  },
  {
    id: 'fi-endemic',
    title: 'ហ្វាំងឡង់ — Puumala virus',
    country: 'ហ្វាំងឡង់', region: 'Helsinki',
    lat: 60.1699, lng: 24.9384,
    severity: 'low', status: 'endemic',
    cases: 0, confirmed: 0, suspected: 0, deaths: 0,
    date: '2026-04-30',
    strain: 'Puumala virus',
    source: 'THL',
    summary: 'តំបន់ឆ្លងធម្មតានៃ Puumala — រាយការណ៍ជាប្រចាំ។'
  },
  {
    id: 'us-endemic-sw',
    title: 'សហរដ្ឋអាមេរិក — Four Corners',
    country: 'សហរដ្ឋអាមេរិក', region: 'New Mexico',
    lat: 34.5199, lng: -105.8701,
    severity: 'low', status: 'endemic',
    cases: 0, confirmed: 0, suspected: 0, deaths: 0,
    date: '2026-04-30',
    strain: 'Sin Nombre virus',
    source: 'US CDC',
    summary: 'តំបន់ឆ្លងធម្មតានៃ HPS នៅភាគនិរតីសហរដ្ឋអាមេរិក។'
  },
  {
    id: 'br-endemic',
    title: 'ប្រេស៊ីល — HPS តំបន់ឆ្លងធម្មតា',
    country: 'ប្រេស៊ីល', region: 'Minas Gerais',
    lat: -19.9167, lng: -43.9345,
    severity: 'low', status: 'endemic',
    cases: 0, confirmed: 0, suspected: 0, deaths: 0,
    date: '2026-04-30',
    strain: 'Araraquara / Juquitiba virus',
    source: 'Brazil MoH',
    summary: 'តំបន់ឆ្លងធម្មតានៃ HPS នៅអាមេរិកខាងត្បូង។'
  },
  // --- Cambodia reference (surveillance, no active cases) ---
  {
    id: 'kh-surv',
    title: 'កម្ពុជា — ការតាមដានជាតិ',
    country: 'កម្ពុជា', region: 'ភ្នំពេញ',
    lat: 11.5564, lng: 104.9282,
    severity: 'low', status: 'monitoring',
    cases: 0, confirmed: 0, suspected: 0, deaths: 0,
    date: '2026-05-10',
    strain: 'មិនមាន',
    source: 'CDC កម្ពុជា',
    summary: 'រហូតមកដល់ពេលនេះ មិនមានករណីដែលត្រូវបានបញ្ជាក់នៅកម្ពុជាឡើយ។ ការតាមដានកំពុងដំណើរការ។'
  }
];

/* ---------- Khmer helpers ---------- */
const KHMER_DIGITS = ['០','១','២','៣','៤','៥','៦','៧','៨','៩'];
function toKhmerNum(n) {
  return String(n).replace(/\d/g, d => KHMER_DIGITS[+d]);
}
function formatKhmerDate(iso) {
  const months = ['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ'];
  const d = new Date(iso);
  return `${toKhmerNum(d.getDate())} ${months[d.getMonth()]} ${toKhmerNum(d.getFullYear())}`;
}
function formatKhmerDateTime(d) {
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${formatKhmerDate(d.toISOString())} · ${toKhmerNum(hh)}:${toKhmerNum(mm)}`;
}

/* ---------- State ---------- */
const state = {
  severity: 'all',
  query: '',
  activeId: null,
  layers: { confirmed: true, suspected: true, endemic: true, heat: false }
};

/* ---------- Map setup ---------- */
const map = L.map('leafletMap', {
  center: [15, 20],
  zoom: 2,
  minZoom: 2,
  maxZoom: 10,
  worldCopyJump: true,
  zoomControl: true
});

// Dark basemap (CartoDB Dark Matter - free & no key)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> · <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);
let heatLayer = null;
const markersById = {};

function severityClass(s) { return `m-${s}`; }

function buildMarker(ev) {
  const icon = L.divIcon({
    className: '',
    html: `<div class="hv-marker ${severityClass(ev.severity)}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  const marker = L.marker([ev.lat, ev.lng], { icon });
  marker.bindPopup(buildPopup(ev), { maxWidth: 300 });
  marker.on('click', () => selectEvent(ev.id));
  marker._ev = ev;
  return marker;
}

function buildPopup(ev) {
  return `
    <div class="popup">
      <div class="popup-title">${ev.title}</div>
      <div class="popup-row"><span>ប្រទេស</span><strong>${ev.country}</strong></div>
      <div class="popup-row"><span>តំបន់</span><strong>${ev.region}</strong></div>
      <div class="popup-row"><span>ប្រភេទមេរោគ</span><strong>${ev.strain}</strong></div>
      <div class="popup-row"><span>ករណីសរុប</span><strong>${toKhmerNum(ev.cases)}</strong></div>
      <div class="popup-row"><span>បញ្ជាក់</span><strong>${toKhmerNum(ev.confirmed)}</strong></div>
      <div class="popup-row"><span>សង្ស័យ</span><strong>${toKhmerNum(ev.suspected)}</strong></div>
      <div class="popup-row"><span>ស្លាប់</span><strong style="color:#fca5a5">${toKhmerNum(ev.deaths)}</strong></div>
      <div class="popup-row"><span>កាលបរិច្ឆេទ</span><strong>${formatKhmerDate(ev.date)}</strong></div>
      <div class="popup-source">ប្រភព: ${ev.source}</div>
      <div style="margin-top:6px; color:#94a3b8; font-size:12px;">${ev.summary}</div>
    </div>
  `;
}

function rebuildMarkers() {
  markerLayer.clearLayers();
  Object.keys(markersById).forEach(k => delete markersById[k]);
  const filtered = getFiltered();

  filtered.forEach(ev => {
    // Layer filter by status
    if (ev.status === 'confirmed' && !state.layers.confirmed) return;
    if (ev.status === 'suspected' && !state.layers.suspected) return;
    if ((ev.status === 'endemic' || ev.status === 'monitoring') && !state.layers.endemic) return;

    const marker = buildMarker(ev);
    marker.addTo(markerLayer);
    markersById[ev.id] = marker;
  });

  rebuildHeat();
}

function rebuildHeat() {
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
  if (!state.layers.heat) return;
  const pts = HANTA_EVENTS
    .filter(e => e.cases > 0)
    .map(e => [e.lat, e.lng, Math.max(0.3, Math.min(1, e.cases / 10))]);
  heatLayer = L.heatLayer(pts, {
    radius: 35, blur: 25, maxZoom: 6,
    gradient: { 0.2: '#38bdf8', 0.4: '#eab308', 0.7: '#f97316', 1.0: '#dc2626' }
  }).addTo(map);
}

/* ---------- Filtering ---------- */
function getFiltered() {
  return HANTA_EVENTS.filter(ev => {
    if (state.severity !== 'all' && ev.severity !== state.severity) return false;
    if (state.query) {
      const q = state.query.toLowerCase();
      const hay = (ev.title + ' ' + ev.country + ' ' + ev.region + ' ' + ev.strain).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/* ---------- Sidebar render ---------- */
const eventListEl = document.getElementById('eventList');
const eventCountEl = document.getElementById('eventCount');

function renderList() {
  const items = getFiltered().slice().sort((a, b) => {
    // Critical first, then by date desc
    const sevRank = { critical: 0, high: 1, medium: 2, low: 3 };
    const diff = sevRank[a.severity] - sevRank[b.severity];
    if (diff !== 0) return diff;
    return new Date(b.date) - new Date(a.date);
  });

  eventCountEl.textContent = toKhmerNum(items.length);

  if (items.length === 0) {
    eventListEl.innerHTML = `<li style="padding:20px; text-align:center; color:var(--text-mute); font-size:13px;">មិនមានព្រឹត្តិការណ៍ត្រូវនឹងលក្ខណៈស្វែងរកទេ។</li>`;
    return;
  }

  eventListEl.innerHTML = items.map(ev => `
    <li class="event-item ${state.activeId === ev.id ? 'active' : ''}" data-id="${ev.id}">
      <span class="event-sev sev-${ev.severity}" aria-hidden="true"></span>
      <div>
        <div class="event-title">${ev.title}</div>
        <div class="event-meta">${ev.country} · ${ev.region}</div>
        <div class="event-stats">
          ករណី ${toKhmerNum(ev.cases)} · ស្លាប់ ${toKhmerNum(ev.deaths)} · ${ev.strain}
        </div>
      </div>
      <div class="event-date">${formatKhmerDate(ev.date)}</div>
    </li>
  `).join('');

  eventListEl.querySelectorAll('.event-item').forEach(el => {
    el.addEventListener('click', () => selectEvent(el.dataset.id));
  });
}

function selectEvent(id) {
  state.activeId = id;
  renderList();
  const ev = HANTA_EVENTS.find(e => e.id === id);
  if (!ev) return;
  const marker = markersById[id];
  map.flyTo([ev.lat, ev.lng], 5, { duration: 0.9 });
  setTimeout(() => { if (marker) marker.openPopup(); }, 950);
}

/* ---------- KPIs ---------- */
function renderKPIs() {
  const totals = HANTA_EVENTS.reduce((acc, e) => {
    acc.cases += e.cases;
    acc.deaths += e.deaths;
    acc.suspected += e.suspected;
    if (e.cases > 0) acc.countries.add(e.country);
    return acc;
  }, { cases: 0, deaths: 0, suspected: 0, countries: new Set() });

  document.getElementById('kpiCases').textContent = toKhmerNum(totals.cases);
  document.getElementById('kpiDeaths').textContent = toKhmerNum(totals.deaths);
  document.getElementById('kpiSuspected').textContent = toKhmerNum(totals.suspected);
  document.getElementById('kpiCountries').textContent = toKhmerNum(totals.countries.size);
}

/* ---------- Event handlers ---------- */
document.querySelectorAll('#severityFilters .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#severityFilters .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.severity = chip.dataset.severity;
    renderList();
    rebuildMarkers();
  });
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  state.query = e.target.value.trim();
  renderList();
  rebuildMarkers();
});

['Confirmed', 'Suspected', 'Endemic', 'Heat'].forEach(name => {
  const el = document.getElementById('layer' + name);
  el.addEventListener('change', () => {
    state.layers[name.toLowerCase()] = el.checked;
    rebuildMarkers();
  });
});

/* ---------- Smooth nav scroll ---------- */
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    const target = document.querySelector(link.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ---------- Init ---------- */
function updateTimestamp() {
  document.getElementById('lastUpdated').textContent =
    'បច្ចុប្បន្នភាព: ' + formatKhmerDateTime(new Date());
}
document.getElementById('year').textContent = toKhmerNum(new Date().getFullYear());

renderKPIs();
renderList();
rebuildMarkers();
updateTimestamp();
setInterval(updateTimestamp, 60 * 1000);

// Auto-open the most severe event on load
setTimeout(() => {
  const first = HANTA_EVENTS.find(e => e.severity === 'critical');
  if (first) selectEvent(first.id);
}, 600);
