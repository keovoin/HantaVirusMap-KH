/* ==========================================================
 * HantavirusMap - Khmer edition
 * Author: K.Pichyvoin
 * Inspired by: https://worldmonitor.app/
 * Live data aggregated from hantavirusmap.com, hantatrack.com,
 * WHO, CDC. Auto-refresh every 30 minutes.
 * ==========================================================
 */

const DATA_URL = 'data/hantavirus.json';
const REFRESH_MS = 30 * 60 * 1000; // 30 minutes

/* ---------- Khmer helpers ---------- */
const KHMER_DIGITS = ['០','១','២','៣','៤','៥','៦','៧','៨','៩'];
function toKhmerNum(n) {
  return String(n ?? 0).replace(/\d/g, d => KHMER_DIGITS[+d]);
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
function formatRelativeKm(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return 'ទើបតែ';
  if (diff < 3600)   return `${toKhmerNum(Math.floor(diff / 60))} នាទីមុន`;
  if (diff < 86400)  return `${toKhmerNum(Math.floor(diff / 3600))} ម៉ោងមុន`;
  return `${toKhmerNum(Math.floor(diff / 86400))} ថ្ងៃមុន`;
}

/* ---------- State ---------- */
const state = {
  events: [],
  totals: {},
  updatedAt: null,
  sourceStatus: {},
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
  zoomControl: false  // we'll add it manually in a non-colliding position
});
L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &middot; <a href="https://carto.com/">CARTO</a>',
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
      <div class="popup-title">${ev.title_km}</div>
      <div class="popup-row"><span>ប្រទេស</span><strong>${ev.country_km}</strong></div>
      <div class="popup-row"><span>តំបន់</span><strong>${ev.region}</strong></div>
      <div class="popup-row"><span>ប្រភេទមេរោគ</span><strong>${ev.strain}</strong></div>
      <div class="popup-row"><span>ករណីសរុប</span><strong>${toKhmerNum(ev.cases)}</strong></div>
      <div class="popup-row"><span>បញ្ជាក់</span><strong>${toKhmerNum(ev.confirmed)}</strong></div>
      <div class="popup-row"><span>សង្ស័យ</span><strong>${toKhmerNum(ev.suspected)}</strong></div>
      <div class="popup-row"><span>ស្លាប់</span><strong style="color:#fca5a5">${toKhmerNum(ev.deaths)}</strong></div>
      <div class="popup-row"><span>កាលបរិច្ឆេទ</span><strong>${formatKhmerDate(ev.date)}</strong></div>
      <div class="popup-source">ប្រភព: ${ev.source}</div>
      <div style="margin-top:6px; color:#94a3b8; font-size:12px;">${ev.summary_km}</div>
    </div>
  `;
}

function rebuildMarkers() {
  markerLayer.clearLayers();
  Object.keys(markersById).forEach(k => delete markersById[k]);
  const filtered = getFiltered();

  filtered.forEach(ev => {
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
  const pts = state.events
    .filter(e => e.cases > 0)
    .map(e => [e.lat, e.lng, Math.max(0.3, Math.min(1, e.cases / 10))]);
  if (pts.length) {
    heatLayer = L.heatLayer(pts, {
      radius: 35, blur: 25, maxZoom: 6,
      gradient: { 0.2: '#38bdf8', 0.4: '#eab308', 0.7: '#f97316', 1.0: '#dc2626' }
    }).addTo(map);
  }
}

function getFiltered() {
  return state.events.filter(ev => {
    if (state.severity !== 'all' && ev.severity !== state.severity) return false;
    if (state.query) {
      const q = state.query.toLowerCase();
      const hay = (ev.title_km + ' ' + ev.country_km + ' ' + ev.region + ' ' + ev.strain).toLowerCase();
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
        <div class="event-title">${ev.title_km}</div>
        <div class="event-meta">${ev.country_km} &middot; ${ev.region}</div>
        <div class="event-stats">
          ករណី ${toKhmerNum(ev.cases)} &middot; ស្លាប់ ${toKhmerNum(ev.deaths)} &middot; ${ev.strain}
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
  const ev = state.events.find(e => e.id === id);
  if (!ev) return;
  const marker = markersById[id];
  map.flyTo([ev.lat, ev.lng], 5, { duration: 0.9 });
  setTimeout(() => { if (marker) marker.openPopup(); }, 950);
}

/* ---------- KPIs ---------- */
function renderKPIs() {
  const t = state.totals || {};
  // prefer aggregated totals from the scraper; fall back to summing events
  const casesFromEvents = state.events.reduce((s, e) => s + (e.cases || 0), 0);
  const deathsFromEvents = state.events.reduce((s, e) => s + (e.deaths || 0), 0);
  const suspectedFromEvents = state.events.reduce((s, e) => s + (e.suspected || 0), 0);
  const countriesFromEvents = new Set(
    state.events.filter(e => e.cases > 0).map(e => e.country_km)
  ).size;

  document.getElementById('kpiCases').textContent     = toKhmerNum(t.cases     ?? casesFromEvents);
  document.getElementById('kpiDeaths').textContent    = toKhmerNum(t.deaths    ?? deathsFromEvents);
  document.getElementById('kpiSuspected').textContent = toKhmerNum(t.suspected ?? suspectedFromEvents);
  document.getElementById('kpiCountries').textContent = toKhmerNum(t.countries ?? countriesFromEvents);
}

/* ---------- Status / timestamp ---------- */
function setStatus(kind, message) {
  const pill = document.getElementById('liveIndicator');
  const updatedEl = document.getElementById('lastUpdated');
  pill.classList.remove('is-live', 'is-stale', 'is-error');
  if (kind === 'live') {
    pill.classList.add('is-live');
    pill.innerHTML = `<span class="pulse"></span>ផ្ទាល់`;
  } else if (kind === 'stale') {
    pill.classList.add('is-stale');
    pill.innerHTML = `<span class="pulse"></span>មិនទាន់ថ្មី`;
  } else {
    pill.classList.add('is-error');
    pill.innerHTML = `<span class="pulse"></span>ផ្តាច់បណ្តាញ`;
  }
  if (message) updatedEl.textContent = message;
}

function updateTimestampUI() {
  const updatedEl = document.getElementById('lastUpdated');
  if (!state.updatedAt) {
    updatedEl.textContent = 'កំពុងផ្ទុក…';
    return;
  }
  updatedEl.textContent =
    `បច្ចុប្បន្នភាព: ${formatKhmerDateTime(new Date(state.updatedAt))} (${formatRelativeKm(state.updatedAt)})`;
}

/* ---------- Data loading ---------- */
async function loadData({ silent = false } = {}) {
  try {
    // cache-busting query so the browser always asks for the latest json
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    state.events       = json.events || [];
    state.totals       = json.totals || {};
    state.updatedAt    = json.updatedAt || new Date().toISOString();
    state.sourceStatus = json.sourceStatus || {};

    renderKPIs();
    renderList();
    rebuildMarkers();
    updateTimestampUI();

    // Mark stale if data is older than 2 hours
    const ageMs = Date.now() - new Date(state.updatedAt).getTime();
    setStatus(ageMs > 2 * 60 * 60 * 1000 ? 'stale' : 'live');

    if (!silent && !state.activeId) {
      const first = state.events.find(e => e.severity === 'critical');
      if (first) selectEvent(first.id);
    }
  } catch (err) {
    console.error('loadData failed:', err);
    if (!state.events.length) {
      document.getElementById('eventList').innerHTML =
        `<li style="padding:20px; text-align:center; color:#fca5a5;">មិនអាចផ្ទុកទិន្នន័យបានទេ។</li>`;
    }
    setStatus('error', 'មិនអាចផ្ទុកទិន្នន័យ');
  }
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

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    const target = document.querySelector(link.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Manual refresh button
const refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('is-spinning');
    loadData({ silent: true }).finally(() => {
      setTimeout(() => refreshBtn.classList.remove('is-spinning'), 400);
    });
  });
}

/* ---------- Init ---------- */
document.getElementById('year').textContent = toKhmerNum(new Date().getFullYear());

loadData();

// Auto-refresh every 30 min, and refresh ticking "x minutes ago" label each minute
setInterval(() => loadData({ silent: true }), REFRESH_MS);
setInterval(updateTimestampUI, 60 * 1000);

// Also refresh when the tab becomes visible again after being backgrounded
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadData({ silent: true });
});


/* === LIVE NEWS SIGNALS (right sidebar + news-alert modal) === */
const NEWS_URL='data/news.json';
const newsState={signals:[],query:'',activeId:null};
let newsSignalLayer=null;
const COUNTRY_KM={'Spain':'អេស្ប៉ាញ','Argentina':'អាហ្សង់ទីន','United States':'សហរដ្ឋអាមេរិក','United Kingdom':'ចក្រភពអង់គ្លេស','Switzerland':'ស្វ៊ីស','Netherlands':'ហូឡង់','Germany':'អាល្លឺម៉ង់','Singapore':'សិង្ហបុរី','South Africa':'អាហ្វ្រិកខាងត្បូង','Cape Verde':'កាបវឺដេ','Brazil':'ប្រេស៊ីល','Chile':'ឈីលី','China':'ចិន','South Korea':'កូរ៉េខាងត្បូង','Finland':'ហ្វាំងឡង់','France':'បារាំង','Japan':'ជប៉ុន','Cambodia':'កម្ពុជា','Antarctica':'អង់តាក់ទិក','WHO':'WHO'};
const COUNTRY_KM={'Spain':'អេស្ប៉ាញ','Argentina':'អាហ្សង់ទីន','United States':'សហរដ្ឋអាមេរិក','United Kingdom':'ចក្រភពអង់គ្លេស','Switzerland':'ស្វ៊ីស','Netherlands':'ហូឡង់','Germany':'អាល្លឺម៉ង់','Singapore':'សិង្ហបុរី','South Africa':'អាហ្វ្រិកខាងត្បូង','Cape Verde':'កាបវឺដេ','Brazil':'ប្រេស៊ីល','Chile':'ឈីលី','China':'ចិន','South Korea':'កូរ៉េខាងត្បូង','Finland':'ហ្វាំងឡង់','France':'បារាំង','Cambodia':'កម្ពុជា'};
const STATUS_KM={active:'សកម្ម',update:'បច្ចុប្បន្នភាព',monitoring:'តាមដាន'};
function relAgoShort(iso){const s=(Date.now()-Date.parse(iso))/1000;if(s<60)return'now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}
function escHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

async function loadNews(){
  try{const r=await fetch(NEWS_URL+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();newsState.signals=j.signals||[];renderSignalList();placeNewsPins();}catch(e){console.warn('loadNews:',e);}
}
function renderSignalList(){
  const el=document.getElementById('signalList');if(!el)return;
  const q=newsState.query.toLowerCase();
  const items=newsState.signals.filter(s=>!q||(s.title+' '+(s.country||'')+' '+(s.location||'')+' '+(s.source||'')).toLowerCase().includes(q));
  if(!items.length){el.innerHTML='<li class="signal-empty"><div class="signal-empty-icon">📡</div><div>គ្មានសញ្ញាណព័ត៌មានថ្មីៗទេ។</div><div class="signal-empty-sub">ទិន្នន័យនឹងធ្វើបច្ចុប្បន្នភាពក្នុង ៣០ នាទី។</div></li>';return;}
  el.innerHTML=items.slice(0,100).map(s=>{
    const dup=s.duplicates?.length||0;
    const locText=s.location||'no location';
    const isActive=newsState.activeId===s.id?'active':'';
    return`<li class="signal-item ${isActive}" data-id="${s.id}">
      <div class="signal-row-top">
        <span class="signal-kind">NEWS</span>
        <span class="signal-age">${relAgoShort(s.publishedAt)}</span>
        <span class="signal-feed">${escHtml(s.feedId||'')}</span>
        ${dup?`<span class="signal-dup">+${dup}</span>`:''}
        <span class="signal-dot signal-dot-${s.severity}"></span>
      </div>
      <div class="signal-title">${escHtml(s.title)}</div>
      <div class="signal-row-bottom">
        <span class="signal-loc">• ${escHtml(locText)}</span>
        <a class="signal-source-link" href="${escHtml(s.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escHtml(s.source||'source')} ↗</a>
      </div>
    </li>`;
  }).join('');
  const items=newsState.signals.filter(s=>!q||(s.title+' '+(s.country||'')+' '+(s.location||'')).toLowerCase().includes(q));
  if(!items.length){el.innerHTML='<li class="signal-empty"><div class="signal-empty-icon">📡</div><div>គ្មានសញ្ញាណព័ត៌មានថ្មីៗទេ។</div><div class="signal-empty-sub">ទិន្នន័យនឹងធ្វើបច្ចុប្បន្នភាពក្នុង ៣០ នាទី។</div></li>';return;}
  el.innerHTML=items.slice(0,80).map(s=>{const dup=s.duplicates?.length||0;return`<li class="signal-item ${newsState.activeId===s.id?'active':''}" data-id="${s.id}"><div class="signal-row-top"><span class="signal-kind">NEWS</span><span class="signal-age">${relAgoShort(s.publishedAt)}</span>${dup?`<span class="signal-dup">+${dup}</span>`:''}<span class="signal-dot signal-dot-${s.severity}"></span></div><div class="signal-title">${escHtml(s.title)}</div><div class="signal-row-bottom"><span class="signal-loc">• ${s.location?escHtml(s.location):'<span class="muted">no location</span>'}</span></div></li>`;}).join('');
  el.querySelectorAll('.signal-item').forEach(li=>li.addEventListener('click',()=>openNewsAlert(li.dataset.id)));
}
function placeNewsPins(){
  if(!newsSignalLayer)newsSignalLayer=L.layerGroup().addTo(map);
  newsSignalLayer.clearLayers();
  newsState.signals.forEach(s=>{if(s.lat==null)return;const icon=L.divIcon({className:'',html:`<div class="news-pin news-pin-${s.severity}"></div>`,iconSize:[12,12],iconAnchor:[6,6]});L.marker([s.lat,s.lng],{icon}).on('click',()=>openNewsAlert(s.id)).addTo(newsSignalLayer);});
}
function openNewsAlert(id){
  const s=newsState.signals.find(x=>x.id===id);if(!s)return;newsState.activeId=id;renderSignalList();
  const s=newsState.signals.find(x=>x.id===id);if(!s)return;newsState.activeId=id;
  document.getElementById('alertTitle').textContent=s.title;
  document.getElementById('alertStatus').textContent=STATUS_KM[s.status]||'សកម្ម';
  document.getElementById('alertAge').textContent=formatRelativeKm(s.publishedAt);
  document.getElementById('alertCountry').textContent=s.country?(COUNTRY_KM[s.country]||s.country):'—';
  document.getElementById('alertLocation').textContent=s.location||'—';
  document.getElementById('alertReadBtn').href=s.url;
  document.getElementById('alertOrigin').textContent=`ប្រភព: ${s.source||'news'} · ${s.feedId||''}`;
  document.getElementById('alertSummary').textContent=s.title;
  const also=document.getElementById('alertAlso');
  if(s.duplicates?.length){also.innerHTML=`<div class="alert-also-label">ក៏បានរាយការណ៍ដោយ ${toKhmerNum(s.duplicates.length)} ប្រភពផ្សេង</div>`+s.duplicates.slice(0,5).map(d=>`<a class="alert-also-row" href="${escHtml(d.url)}" target="_blank" rel="noopener"><span class="alert-also-kind">NEWS</span><span class="alert-also-title">${escHtml(d.title||d.source||d.url)}</span><span class="alert-also-ext">↗</span></a>`).join('');}else{also.innerHTML='';}
  document.getElementById('alertOrigin').textContent=`ប្រភព — ${s.source||'news'}`;
  document.getElementById('alertSummary').textContent=s.title;
  const also=document.getElementById('alertAlso');
  if(s.duplicates?.length){also.innerHTML=`<div class="alert-also-label">ក៏បានរាយការណ៍ដោយ ${toKhmerNum(s.duplicates.length)} ប្រភពផ្សេង</div>`+s.duplicates.slice(0,4).map(d=>`<a class="alert-also-row" href="${escHtml(d.url)}" target="_blank" rel="noopener"><span class="alert-also-kind">NEWS</span><span class="alert-also-title">${escHtml(d.title||d.url)}</span><span class="alert-also-ext">↗</span></a>`).join('');}else{also.innerHTML='';}
  document.getElementById('alertBackdrop').hidden=false;document.getElementById('newsAlert').hidden=false;
  requestAnimationFrame(()=>{document.getElementById('newsAlert').classList.add('open');document.getElementById('alertBackdrop').classList.add('open');});
  if(s.lat!=null)map.flyTo([s.lat,s.lng],4,{duration:0.8});
}
function closeNewsAlert(){const el=document.getElementById('newsAlert'),bd=document.getElementById('alertBackdrop');el.classList.remove('open');bd.classList.remove('open');setTimeout(()=>{el.hidden=true;bd.hidden=true;},180);newsState.activeId=null;renderSignalList();}
document.getElementById('alertCloseBtn')?.addEventListener('click',closeNewsAlert);
document.getElementById('alertBackdrop')?.addEventListener('click',closeNewsAlert);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNewsAlert();});
document.getElementById('alertShareBtn')?.addEventListener('click',()=>{const s=newsState.signals.find(x=>x.id===newsState.activeId);if(!s)return;if(navigator.share)navigator.share({title:s.title,url:s.url}).catch(()=>{});else navigator.clipboard?.writeText(s.title+' — '+s.url);});
document.getElementById('alertShareBtn2')?.addEventListener('click',()=>{const s=newsState.signals.find(x=>x.id===newsState.activeId);if(!s)return;if(navigator.share)navigator.share({title:s.title,url:s.url}).catch(()=>{});else navigator.clipboard?.writeText(s.title+' — '+s.url);});
document.getElementById('signalsSearch')?.addEventListener('input',e=>{newsState.query=e.target.value.trim();renderSignalList();});
loadNews();setInterval(()=>loadNews(),REFRESH_MS);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadNews();});
document.getElementById('alertShareBtn')?.addEventListener('click',()=>{const s=newsState.signals.find(x=>x.id===newsState.activeId);if(s&&navigator.share)navigator.share({title:s.title,url:s.url}).catch(()=>{});else if(s)navigator.clipboard?.writeText(s.title+' — '+s.url);});
document.getElementById('alertShareBtn2')?.addEventListener('click',()=>{const s=newsState.signals.find(x=>x.id===newsState.activeId);if(s&&navigator.share)navigator.share({title:s.title,url:s.url}).catch(()=>{});else if(s)navigator.clipboard?.writeText(s.title+' — '+s.url);});
document.getElementById('signalsSearch')?.addEventListener('input',e=>{newsState.query=e.target.value.trim();renderSignalList();});
loadNews();setInterval(()=>loadNews(),REFRESH_MS);
