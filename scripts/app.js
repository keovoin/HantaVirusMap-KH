/* ==========================================================
 * HantavirusMap - Khmer edition
 * Author: K.Pichyvoin (PICHYVOIN KEO)
 * Inspired by: https://worldmonitor.app/
 * ==========================================================
 */

const DATA_URL = 'data/hantavirus.json';
const NEWS_URL = 'data/news.json';
const REFRESH_MS = 30 * 60 * 1000;

/* ========================================================
 *  DONATE QR — edit DONATE_PAYLOAD below to change the QR.
 *  For a payment QR (KHQR / ABA / Wing / PayPal), paste the
 *  payment-string or URL. For text, just put your name.
 * ======================================================== */
const DONATE_PAYLOAD = window.DONATE_PAYLOAD || 'PICHYVOIN KEO';
const DONATE_NAME    = 'PICHYVOIN KEO';

/* ---------- Khmer helpers ---------- */
const KHMER_DIGITS = ['០','១','២','៣','៤','៥','៦','៧','៨','៩'];
function toKhmerNum(n) { return String(n ?? 0).replace(/\d/g, d => KHMER_DIGITS[+d]); }
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
  if (diff < 60)    return 'ទើបតែ';
  if (diff < 3600)  return `${toKhmerNum(Math.floor(diff/60))} នាទីមុន`;
  if (diff < 86400) return `${toKhmerNum(Math.floor(diff/3600))} ម៉ោងមុន`;
  return `${toKhmerNum(Math.floor(diff/86400))} ថ្ងៃមុន`;
}
function relAgoShort(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60)    return 'now';
  if (s < 3600)  return Math.floor(s/60) + 'm';
  if (s < 86400) return Math.floor(s/3600) + 'h';
  return Math.floor(s/86400) + 'd';
}
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------- Headline phrase translator (English -> Khmer)
 * Replaces the ~60 most common outbreak-news phrases with Khmer
 * equivalents, then lowercases the remaining English words so the
 * title reads more naturally in Khmer context.
 * It's a rule-based translator — not perfect but very useful.
 * ---------- */
const PHRASE_KM = [
  // Disease names & sources
  [/\bhantavirus\b/gi,                'មេរោគ Hantavirus'],
  [/\bandes virus\b/gi,               'មេរោគ Andes'],
  [/\bmv hondius\b/gi,                'កប៉ាល់ MV Hondius'],
  [/\bhondius\b/gi,                   'Hondius'],
  [/\bcruise ship\b/gi,               'កប៉ាល់ទេសចរណ៍'],
  [/\bcruise\b/gi,                    'កប៉ាល់ទេសចរណ៍'],
  // Events / status
  [/\boutbreak\b/gi,                  'ការរាតត្បាត'],
  [/\bcluster\b/gi,                   'ក្រុមករណី'],
  [/\bcases?\b/gi,                    'ករណី'],
  [/\bdeaths?\b/gi,                   'អ្នកស្លាប់'],
  [/\bdies?\b/gi,                     'ស្លាប់'],
  [/\bdied\b/gi,                      'បានស្លាប់'],
  [/\bkilled\b/gi,                    'បានស្លាប់'],
  [/\bfatal(?:ity|ities)?\b/gi,       'មានការស្លាប់'],
  [/\bconfirmed\b/gi,                 'បានបញ្ជាក់'],
  [/\bsuspected\b/gi,                 'សង្ស័យ'],
  [/\bpositive test\b/gi,             'តេស្តវិជ្ជមាន'],
  [/\btests? positive\b/gi,           'តេស្តឃើញវិជ្ជមាន'],
  [/\bpositive\b/gi,                  'វិជ្ជមាន'],
  [/\binfected\b/gi,                  'បានឆ្លង'],
  [/\bsymptoms?\b/gi,                 'រោគសញ្ញា'],
  [/\bsymptomatic\b/gi,               'មានរោគសញ្ញា'],
  [/\bexposed\b/gi,                   'បានប៉ះពាល់'],
  [/\bexposure\b/gi,                  'ការប៉ះពាល់'],
  // Response actions
  [/\bquarantin(?:e|ed|ing)\b/gi,     'ដាក់ឱ្យនៅដាច់ដោយឡែក'],
  [/\bevacuat(?:e|ed|ion)\b/gi,       'ជម្លៀស'],
  [/\bscreen(?:ing|ed)?\b/gi,         'ពិនិត្យ'],
  [/\bmonitor(?:ed|ing)?\b/gi,        'តាមដាន'],
  [/\badvisory\b/gi,                  'ការប្រកាសព្រមាន'],
  [/\btravel warning\b/gi,            'ព្រមានការធ្វើដំណើរ'],
  [/\bhealth advisory\b/gi,           'ការប្រកាសសុខាភិបាល'],
  [/\bhealth alert\b/gi,              'ការដាស់តឿនសុខាភិបាល'],
  [/\bpublic health\b/gi,             'សុខភាពសាធារណៈ'],
  [/\btravel\b/gi,                    'ការធ្វើដំណើរ'],
  // Authorities
  [/\bWHO\b/g,                        'WHO'],
  [/\bCDC\b/g,                        'CDC'],
  [/\bHHS\b/g,                        'HHS'],
  [/\bUKHSA\b/g,                      'UKHSA'],
  [/\bNCDHHS\b/g,                     'NCDHHS'],
  [/\bRIVM\b/g,                       'RIVM'],
  // Places (kept explicit; locations in the pill render separately)
  [/\bU\.S\.?\b/g,                    'សហរដ្ឋអាមេរិក'],
  [/\bUSA\b/g,                        'សហរដ្ឋអាមេរិក'],
  [/\bUnited States\b/g,              'សហរដ្ឋអាមេរិក'],
  [/\bUK\b/g,                         'ចក្រភពអង់គ្លេស'],
  [/\bUnited Kingdom\b/g,             'ចក្រភពអង់គ្លេស'],
  [/\bNebraska\b/g,                   'Nebraska'],
  [/\bTenerife\b/g,                   'Tenerife'],
  [/\bNew York\b/g,                   'ញូវយ៉ក'],
  [/\bNorth Carolina\b/g,             'North Carolina'],
  [/\bSpain\b/g,                      'អេស្ប៉ាញ'],
  [/\bArgentina\b/g,                  'អាហ្សង់ទីន'],
  [/\bNetherlands\b/g,                'ហូឡង់'],
  [/\bGermany\b/g,                    'អាល្លឺម៉ង់'],
  [/\bSwitzerland\b/g,                'ស្វ៊ីស'],
  [/\bSingapore\b/g,                  'សិង្ហបុរី'],
  [/\bJapan\b/g,                      'ជប៉ុន'],
  [/\bCambodia\b/g,                   'កម្ពុជា'],
  [/\bChina\b/g,                      'ចិន'],
  [/\bFrance\b/g,                     'បារាំង'],
  [/\bCanada\b/g,                     'កាណាដា'],
  [/\bMexico\b/g,                     'ម៉ិកស៊ិក'],
  [/\bBrazil\b/g,                     'ប្រេស៊ីល'],
  [/\bChile\b/g,                      'ឈីលី'],
  [/\bSouth Africa\b/g,               'អាហ្វ្រិកខាងត្បូង'],
  [/\bAustralia\b/g,                  'អូស្ត្រាលី'],
  // Common connectors / verbs
  [/\bresident\b/gi,                  'អ្នករស់នៅ'],
  [/\bpassengers?\b/gi,               'អ្នកដំណើរ'],
  [/\bAmericans?\b/gi,                'ជនជាតិអាមេរិក'],
  [/\bpeople\b/gi,                    'ប្រជាជន'],
  [/\bperson\b/gi,                    'មនុស្សម្នាក់'],
  [/\bhospital(ized|ised|ization)?\b/gi, 'សម្រាកនៅមន្ទីរពេទ្យ'],
  [/\bhospital\b/gi,                  'មន្ទីរពេទ្យ'],
  [/\bdoctor\b/gi,                    'គ្រូពេទ្យ'],
  [/\bstarted\b/gi,                   'ចាប់ផ្តើម'],
  [/\bbegin(?:s|ning)?\b/gi,          'ចាប់ផ្តើម'],
  [/\barrived?\b/gi,                  'មកដល់'],
  [/\breturn(?:ed|ing)?\b/gi,         'ត្រឡប់មកវិញ'],
  [/\brisk\b/gi,                      'ហានិភ័យ'],
  [/\bspread(ing)?\b/gi,              'ការរីករាលដាល'],
  [/\bhuman-to-human\b/gi,            'មនុស្សទៅមនុស្ស'],
  [/\bcontagious\b/gi,                'ឆ្លង'],
  [/\btreatment\b/gi,                 'ការព្យាបាល'],
  [/\bsituation\b/gi,                 'ស្ថានភាព'],
  [/\btimeline\b/gi,                  'កាលវិភាគ'],
  [/\bmap(s|ped|ping)?\b/gi,          'ផែនទី'],
  [/\bworldwide\b/gi,                 'ទូទាំងពិភពលោក'],
  [/\bglobal\b/gi,                    'សកល'],
  [/\bupdate(s|d)?\b/gi,              'បច្ចុប្បន្នភាព'],
  [/\bwhat to know\b/gi,              'អ្វីដែលគួរដឹង'],
  // Cleanup: dashes/dots that look awkward after translation
  [/\s+[-–—]\s+/g, ' — '],
];

// Build a rudimentary "source name — Khmer title" from an English headline.
// Example: "Americans from hantavirus-hit cruise ship arrive in U.S. - CBS News"
// -> { title_km: "ជនជាតិអាមេរិកពីកប៉ាល់ទេសចរណ៍ដែលឆ្លងមេរោគ Hantavirus មកដល់ សហរដ្ឋអាមេរិក", source_km: "CBS News" }
function translateToKhmer(title) {
  if (!title) return title;
  let t = title;
  // Split off trailing " - Source Name" so we can translate the headline cleanly
  let source = null;
  const m = t.match(/^(.*?)\s[-–—]\s([^-–—]{2,40})$/);
  if (m) { t = m[1]; source = m[2].trim(); }
  for (const [re, km] of PHRASE_KM) t = t.replace(re, km);
  // Remove lingering hyphen-compounds like "hantavirus-hit"
  t = t.replace(/\b([^\s]+)-hit\b/gi, 'ដែលឆ្លង $1');
  // Collapse multiple spaces
  t = t.replace(/\s{2,}/g, ' ').trim();
  return source ? `${t} — ${source}` : t;
}

/* ---------- Country & location dictionaries ---------- */
const COUNTRY_KM = {
  'Spain':'អេស្ប៉ាញ','Argentina':'អាហ្សង់ទីន','United States':'សហរដ្ឋអាមេរិក',
  'United Kingdom':'ចក្រភពអង់គ្លេស','Switzerland':'ស្វ៊ីស','Netherlands':'ហូឡង់',
  'Germany':'អាល្លឺម៉ង់','Singapore':'សិង្ហបុរី','South Africa':'អាហ្វ្រិកខាងត្បូង',
  'Cape Verde':'កាបវឺដេ','Brazil':'ប្រេស៊ីល','Chile':'ឈីលី','China':'ចិន',
  'South Korea':'កូរ៉េខាងត្បូង','Finland':'ហ្វាំងឡង់','France':'បារាំង',
  'Japan':'ជប៉ុន','Cambodia':'កម្ពុជា','Antarctica':'អង់តាក់ទិក','WHO':'WHO',
  'Canada':'កាណាដា','Mexico':'ម៉ិកស៊ិក','Portugal':'ព័រទុយហ្គាល់','Italy':'អ៊ីតាលី',
  'Belgium':'បែលហ្ស៊ិក','Sweden':'ស៊ុយអែត','Norway':'ន័រវេស','Denmark':'ដាណឺម៉ាក',
  'Poland':'ប៉ូឡូញ','Russia':'រុស្ស៊ី','Australia':'អូស្ត្រាលី','New Zealand':'ន្យូហ្សេឡង់',
  'India':'ឥណ្ឌា','Thailand':'ថៃ','Vietnam':'វៀតណាម','Philippines':'ហ្វ៊ីលីពីន',
  'Indonesia':'ឥណ្ឌូនេស៊ី','Malaysia':'ម៉ាឡេស៊ី','Ireland':'អៀរឡង់','Austria':'អូទ្រីស'
};
const STATUS_KM = { active:'សកម្ម', update:'បច្ចុប្បន្នភាព', monitoring:'តាមដាន' };

// Rich country dictionary for client-side location detection.
// aliases include US states, major cities, demonyms, health agencies.
const COUNTRY_DICT = [
  { name:'United States', code:'US', lat:38.90, lng:-77.04, aliases:[
    'U.S.','USA','U.S.A.',' US ',' US\\.',' US,',' US$','American','Americans','Washington',
    'Nebraska','North Carolina','South Carolina','California','Texas','Florida','Alabama',
    'Arizona','Arkansas','Colorado','Connecticut','Delaware','Georgia','Hawaii','Idaho',
    'Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
    'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nevada',
    'New Hampshire','New Jersey','New Mexico','New York','Ohio','Oklahoma','Oregon',
    'Pennsylvania','Rhode Island','Tennessee','Utah','Vermont','Virginia','Washington',
    'West Virginia','Wisconsin','Wyoming','Houston','Atlanta','Omaha','Sacramento',
    'Raleigh','NCDHHS','CDC','HHS','Eppley','Trump','RFK','Hochul'
  ]},
  { name:'Spain', code:'ES', lat:40.42, lng:-3.70, aliases:['Spanish','Espanol','Tenerife','Canary','Madrid','Barcelona','España'] },
  { name:'Argentina', code:'AR', lat:-34.60, lng:-58.38, aliases:['Argentinian','Argentino','Patagonia','Bariloche','Buenos Aires','Ushuaia'] },
  { name:'United Kingdom', code:'GB', lat:51.51, lng:-0.13, aliases:['UK','Britain','British','England','London','UKHSA','Scotland','Wales'] },
  { name:'Switzerland', code:'CH', lat:47.38, lng:8.54, aliases:['Swiss','Zurich','Geneva','Basel'] },
  { name:'Netherlands', code:'NL', lat:52.37, lng:4.90, aliases:['Dutch','Amsterdam','RIVM','Rotterdam','Hague','Holland'] },
  { name:'Germany', code:'DE', lat:52.52, lng:13.41, aliases:['German','Deutsch','Berlin','Munich','Hamburg','Der Standard','Bild','RKI'] },
  { name:'Singapore', code:'SG', lat:1.35, lng:103.82, aliases:['Singaporean'] },
  { name:'South Africa', code:'ZA', lat:-33.92, lng:18.42, aliases:['Cape Town','Johannesburg','NICD','South African','Durban'] },
  { name:'Cape Verde', code:'CV', lat:14.93, lng:-23.51, aliases:['Cabo Verde','Praia'] },
  { name:'Brazil', code:'BR', lat:-15.78, lng:-47.93, aliases:['Brazilian','Brasil','Rio','Sao Paulo','São Paulo','Minas Gerais'] },
  { name:'Chile', code:'CL', lat:-33.45, lng:-70.67, aliases:['Chilean','Santiago','Valparaiso'] },
  { name:'China', code:'CN', lat:39.90, lng:116.40, aliases:['Chinese','Beijing','Shanghai','Shandong','Guangzhou'] },
  { name:'South Korea', code:'KR', lat:37.57, lng:126.98, aliases:['Korean','Seoul','KDCA','Busan'] },
  { name:'Finland', code:'FI', lat:60.17, lng:24.94, aliases:['Finnish','Helsinki','THL'] },
  { name:'France', code:'FR', lat:48.86, lng:2.35, aliases:['French','Paris','Lyon','Marseille','Bordeaux'] },
  { name:'Japan', code:'JP', lat:35.68, lng:139.69, aliases:['Japanese','Tokyo','Osaka','Kyoto'] },
  { name:'Cambodia', code:'KH', lat:11.56, lng:104.93, aliases:['Khmer','Phnom Penh','Cambodian','Siem Reap'] },
  { name:'Canada', code:'CA', lat:45.42, lng:-75.70, aliases:['Canadian','Toronto','Vancouver','Montreal','Ottawa','Quebec','Ontario','Alberta','BC','B.C.'] },
  { name:'Mexico', code:'MX', lat:19.43, lng:-99.13, aliases:['Mexican','Mexico City','Ciudad de Mexico','CDMX'] },
  { name:'Portugal', code:'PT', lat:38.72, lng:-9.14, aliases:['Portuguese','Lisbon','Porto'] },
  { name:'Italy', code:'IT', lat:41.90, lng:12.50, aliases:['Italian','Rome','Milan','Napoli','Turin'] },
  { name:'Australia', code:'AU', lat:-33.87, lng:151.21, aliases:['Australian','Sydney','Melbourne','Brisbane','Perth'] },
  { name:'Russia', code:'RU', lat:55.75, lng:37.62, aliases:['Russian','Moscow','St Petersburg','Petersburg'] },
  { name:'Sweden', code:'SE', lat:59.33, lng:18.07, aliases:['Swedish','Stockholm','Gothenburg'] },
  { name:'Norway', code:'NO', lat:59.91, lng:10.75, aliases:['Norwegian','Oslo','Bergen'] },
  { name:'Antarctica', code:'AQ', lat:-62.0, lng:-58.0, aliases:['Antarctic','South Atlantic','MV Hondius','Hondius','cruise ship','South Georgia'] }
];

// Sub-locations get more specific lat/lng and location name
const SUBLOC = [
  { re:/tenerife|canary/i, country:'Spain', loc:'Tenerife, Spain', lat:28.29, lng:-16.63 },
  { re:/madrid/i, country:'Spain', loc:'Madrid, Spain', lat:40.42, lng:-3.70 },
  { re:/barcelona/i, country:'Spain', loc:'Barcelona, Spain', lat:41.39, lng:2.17 },
  { re:/patagonia|bariloche/i, country:'Argentina', loc:'Patagonia, Argentina', lat:-41.13, lng:-71.31 },
  { re:/ushuaia/i, country:'Argentina', loc:'Ushuaia, Argentina', lat:-54.80, lng:-68.30 },
  { re:/buenos aires/i, country:'Argentina', loc:'Buenos Aires, Argentina', lat:-34.60, lng:-58.38 },
  { re:/nebraska/i, country:'United States', loc:'Nebraska, US', lat:41.26, lng:-95.93 },
  { re:/north carolina|\bnc\b/i, country:'United States', loc:'North Carolina, US', lat:35.75, lng:-78.64 },
  { re:/new york/i, country:'United States', loc:'New York, US', lat:40.71, lng:-74.00 },
  { re:/new hampshire/i, country:'United States', loc:'New Hampshire, US', lat:43.20, lng:-71.54 },
  { re:/utah/i, country:'United States', loc:'Utah, US', lat:40.76, lng:-111.89 },
  { re:/texas|houston/i, country:'United States', loc:'Texas, US', lat:29.76, lng:-95.37 },
  { re:/atlanta|georgia\b/i, country:'United States', loc:'Atlanta, Georgia, US', lat:33.75, lng:-84.39 },
  { re:/sacramento|california/i, country:'United States', loc:'California, US', lat:38.58, lng:-121.49 },
  { re:/omaha|eppley/i, country:'United States', loc:'Omaha, Nebraska, US', lat:41.26, lng:-95.93 },
  { re:/washington d\.?c\.?|washington post/i, country:'United States', loc:'Washington DC, US', lat:38.90, lng:-77.04 },
  { re:/cape town/i, country:'South Africa', loc:'Cape Town, South Africa', lat:-33.92, lng:18.42 },
  { re:/london/i, country:'United Kingdom', loc:'London, UK', lat:51.51, lng:-0.13 },
  { re:/tristan da cunha/i, country:'United Kingdom', loc:'Tristan da Cunha', lat:-37.07, lng:-12.32 },
  { re:/zurich/i, country:'Switzerland', loc:'Zurich, Switzerland', lat:47.38, lng:8.54 },
  { re:/amsterdam/i, country:'Netherlands', loc:'Amsterdam, Netherlands', lat:52.37, lng:4.90 },
  { re:/berlin/i, country:'Germany', loc:'Berlin, Germany', lat:52.52, lng:13.41 },
  { re:/mv hondius|hondius|cruise ship/i, country:'Antarctica', loc:'MV Hondius (South Atlantic)', lat:-54.5, lng:-36.5 }
];

/**
 * detectLocationClient — richer client-side location detection for signals.
 * Returns { country, countryCode, location, lat, lng } or nulls if no match.
 */
function detectLocationClient(title, rawCountry) {
  const hay = ' ' + (title || '') + ' ' + (rawCountry || '') + ' ';
  // Try sub-locations first
  for (const s of SUBLOC) {
    if (s.re.test(hay)) {
      const c = COUNTRY_DICT.find(x => x.name === s.country);
      return { country: s.country, countryCode: c?.code || '', location: s.loc, lat: s.lat, lng: s.lng };
    }
  }
  // Country name / alias match
  for (const c of COUNTRY_DICT) {
    const tokens = [c.name, ...c.aliases];
    for (const tk of tokens) {
      // For tokens with special chars, use as-is; else wrap with \b
      let pattern;
      if (/[\\.]/.test(tk) || tk.startsWith(' ') || tk.endsWith(' ')) {
        pattern = tk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      } else {
        pattern = '\\b' + tk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b';
      }
      try {
        if (new RegExp(pattern, 'i').test(hay)) {
          return { country: c.name, countryCode: c.code, location: c.name, lat: c.lat, lng: c.lng };
        }
      } catch (e) { /* bad regex, skip */ }
    }
  }
  return { country: null, countryCode: null, location: null, lat: null, lng: null };
}

/**
 * classifySignalType — returns one of 'local' | 'imported' | 'response' | 'other'
 * Based on keyword patterns in the headline.
 */
function classifySignalType(title) {
  const t = (title || '').toLowerCase();
  // Imported: evacuated, returnee, repatriated, arrived, quarantined in X, brought to
  if (/\b(evacuat|quarantin|repatriat|returnee|return from|brought back|flown back|arrived|arrive back|hospital(ized|ised) in)\b/.test(t)) {
    return 'imported';
  }
  // Response: advisory, screening, warning, policy, alert (without case)
  if (/\b(advisory|screening|travel warning|travel alert|travel advisory|monitoring|policy|response plan|guidance|watch list)\b/.test(t) && !/(case|death|confirmed|outbreak)/.test(t)) {
    return 'response';
  }
  // Local: outbreak, case, death, confirmed
  if (/\b(outbreak|case|death|died|dies|confirmed|killed|fatal|positive)\b/.test(t)) {
    return 'local';
  }
  return 'other';
}

/**
 * signalSeverityColor — 'critical' | 'high' | 'medium' | 'low'
 * (re-derived on client in case data is stale)
 */
function deriveSeverity(signal) {
  return signal.severity || 'medium';
}

/* ---------- State ---------- */
const state = {
  events: [], totals: {}, updatedAt: null, sourceStatus: {},
  severity: 'all', query: '', activeId: null,
  layers: { confirmed: true, suspected: true, endemic: true, heat: false, signals: true }
};
const newsState = { signals: [], query: '', activeId: null };

/* ---------- Map ---------- */
const map = L.map('leafletMap', {
  center: [15, 20], zoom: 2, minZoom: 2, maxZoom: 10,
  worldCopyJump: true, zoomControl: false
});
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &middot; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd', maxZoom: 19
}).addTo(map);
const markerLayer = L.layerGroup().addTo(map);
const newsSignalLayer = L.layerGroup().addTo(map);
let heatLayer = null;
const markersById = {};

function buildMarker(ev) {
  const icon = L.divIcon({
    className: '',
    html: `<div class="hv-marker m-${ev.severity}"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9]
  });
  const marker = L.marker([ev.lat, ev.lng], { icon });
  marker.bindPopup(buildPopup(ev), { maxWidth: 300 });
  marker.on('click', () => selectEvent(ev.id));
  return marker;
}
function buildPopup(ev) {
  return `<div class="popup">
    <div class="popup-title">${escHtml(ev.title_km)}</div>
    <div class="popup-row"><span>ប្រទេស</span><strong>${escHtml(ev.country_km)}</strong></div>
    <div class="popup-row"><span>តំបន់</span><strong>${escHtml(ev.region)}</strong></div>
    <div class="popup-row"><span>ប្រភេទមេរោគ</span><strong>${escHtml(ev.strain)}</strong></div>
    <div class="popup-row"><span>ករណីសរុប</span><strong>${toKhmerNum(ev.cases)}</strong></div>
    <div class="popup-row"><span>បញ្ជាក់</span><strong>${toKhmerNum(ev.confirmed)}</strong></div>
    <div class="popup-row"><span>សង្ស័យ</span><strong>${toKhmerNum(ev.suspected)}</strong></div>
    <div class="popup-row"><span>ស្លាប់</span><strong style="color:#fca5a5">${toKhmerNum(ev.deaths)}</strong></div>
    <div class="popup-row"><span>កាលបរិច្ឆេទ</span><strong>${formatKhmerDate(ev.date)}</strong></div>
    <div class="popup-source">ប្រភព: ${escHtml(ev.source)}</div>
    <div style="margin-top:6px;color:#94a3b8;font-size:12px;">${escHtml(ev.summary_km)}</div>
  </div>`;
}
function rebuildMarkers() {
  markerLayer.clearLayers();
  Object.keys(markersById).forEach(k => delete markersById[k]);
  getFiltered().forEach(ev => {
    if (ev.status === 'confirmed' && !state.layers.confirmed) return;
    if (ev.status === 'suspected' && !state.layers.suspected) return;
    if ((ev.status === 'endemic' || ev.status === 'monitoring') && !state.layers.endemic) return;
    const m = buildMarker(ev);
    m.addTo(markerLayer);
    markersById[ev.id] = m;
  });
  rebuildHeat();
}
function rebuildHeat() {
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
  if (!state.layers.heat) return;
  const pts = state.events.filter(e => e.cases > 0)
    .map(e => [e.lat, e.lng, Math.max(0.3, Math.min(1, e.cases / 10))]);
  if (pts.length) {
    heatLayer = L.heatLayer(pts, {
      radius: 35, blur: 25, maxZoom: 6,
      gradient: { 0.2:'#38bdf8', 0.4:'#eab308', 0.7:'#f97316', 1.0:'#dc2626' }
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

/* ---------- Merged events: curated + enriched signals ---------- */
// Convert an enriched news signal into an event-like object so it shows
// in the left "ព្រឹត្តិការណ៍សកម្ម" list with Khmer labels.
function signalToEvent(s, idx) {
  const country_km = s.country ? (COUNTRY_KM[s.country] || s.country) : 'មិនបានកំណត់';
  const region = s.location || s.country || 'មិនបានកំណត់';
  const typeKm = ({
    local: 'ក្នុងស្រុក',
    imported: 'នាំចូល',
    response: 'វិធានការ',
    other: 'តាមដាន'
  })[s.signalType || 'other'];
  return {
    id: 'news-' + s.id,
    title_km: s.title_km || translateToKhmer(s.title),
    country_km,
    region,
    lat: s.lat,
    lng: s.lng,
    severity: s.severity || 'medium',
    status: 'monitoring',
    cases: s.cases ?? 0,
    confirmed: 0,
    suspected: 0,
    deaths: s.deaths ?? 0,
    date: (s.publishedAt || new Date().toISOString()).slice(0, 10),
    strain: typeKm,
    source: s.source || 'news',
    summary_km: `[${typeKm}] ${s.title_km || translateToKhmer(s.title)}`,
    _isSignal: true,
    _url: s.url
  };
}

/* ---------- Sidebar render (curated + signal events) ---------- */
function renderList() {
  const listEl = document.getElementById('eventList');
  const countEl = document.getElementById('eventCount');
  if (!listEl || !countEl) return;
  const items = getFiltered().slice().sort((a, b) => {
    const r = { critical:0, high:1, medium:2, low:3 };
    return (r[a.severity]-r[b.severity]) || (new Date(b.date) - new Date(a.date));
  });
  countEl.textContent = toKhmerNum(items.length);
  if (!items.length) {
    listEl.innerHTML = `<li style="padding:20px;text-align:center;color:var(--text-mute);font-size:13px;">មិនមានព្រឹត្តិការណ៍ត្រូវនឹងលក្ខណៈស្វែងរកទេ។</li>`;
    return;
  }
  listEl.innerHTML = items.map(ev => `
    <li class="event-item ${state.activeId === ev.id ? 'active' : ''}" data-id="${ev.id}">
      <span class="event-sev sev-${ev.severity}"></span>
      <div>
        <div class="event-title">${escHtml(ev.title_km)}</div>
        <div class="event-meta">${escHtml(ev.country_km)} · ${escHtml(ev.region)}</div>
        <div class="event-stats">
          ${ev._isSignal
            ? `${escHtml(ev.strain)} · ${escHtml(ev.source)}`
            : `ករណី ${toKhmerNum(ev.cases)} · ស្លាប់ ${toKhmerNum(ev.deaths)} · ${escHtml(ev.strain)}`}
        </div>
      </div>
      <div class="event-date">${formatKhmerDate(ev.date)}</div>
    </li>`).join('');
  listEl.querySelectorAll('.event-item').forEach(el =>
    el.addEventListener('click', () => selectEvent(el.dataset.id))
  );
}
function selectEvent(id) {
  state.activeId = id;
  renderList();
  const ev = state.events.find(e => e.id === id);
  if (!ev) return;
  // If it's a signal-event, open the news alert modal
  if (ev._isSignal) {
    const realId = id.replace(/^news-/, '');
    openNewsAlert(realId);
    return;
  }
  if (ev.lat == null) return;
  map.flyTo([ev.lat, ev.lng], 5, { duration: 0.9 });
  setTimeout(() => markersById[id]?.openPopup(), 950);
}

/* ---------- KPIs ---------- */
function renderKPIs() {
  const t = state.totals || {};
  // prefer aggregated totals from the scraper; fall back to summing events
  const curated = state.events.filter(e => !e._isSignal);
  const casesE = curated.reduce((s,e) => s + (e.cases||0), 0);
  const deathsE = curated.reduce((s,e) => s + (e.deaths||0), 0);
  const suspE = curated.reduce((s,e) => s + (e.suspected||0), 0);
  const countE = new Set(curated.filter(e => e.cases > 0).map(e => e.country_km)).size;
  document.getElementById('kpiCases').textContent     = toKhmerNum(t.cases     ?? casesE);
  document.getElementById('kpiDeaths').textContent    = toKhmerNum(t.deaths    ?? deathsE);
  document.getElementById('kpiSuspected').textContent = toKhmerNum(t.suspected ?? suspE);
  document.getElementById('kpiCountries').textContent = toKhmerNum(t.countries ?? countE);
}

/* ---------- Status indicator ---------- */
function setStatus(kind) {
  const pill = document.getElementById('liveIndicator');
  if (!pill) return;
  pill.classList.remove('is-live','is-stale','is-error');
  if (kind === 'live')       { pill.classList.add('is-live');  pill.innerHTML = '<span class="pulse"></span>ផ្ទាល់'; }
  else if (kind === 'stale') { pill.classList.add('is-stale'); pill.innerHTML = '<span class="pulse"></span>មិនទាន់ថ្មី'; }
  else                       { pill.classList.add('is-error'); pill.innerHTML = '<span class="pulse"></span>ផ្តាច់បណ្តាញ'; }
}
function updateTimestampUI() {
  const el = document.getElementById('lastUpdated');
  if (!el) return;
  if (!state.updatedAt) { el.textContent = 'កំពុងផ្ទុក…'; return; }
  el.textContent = `បច្ចុប្បន្នភាព: ${formatKhmerDateTime(new Date(state.updatedAt))} (${formatRelativeKm(state.updatedAt)})`;
}

/* ---------- Load curated events + merge enriched signals ---------- */
let _curatedEvents = [];
async function loadData() {
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    _curatedEvents   = json.events || [];
    state.totals     = json.totals || {};
    state.updatedAt  = json.updatedAt || new Date().toISOString();
    rebuildMergedEvents();
    updateTimestampUI();
    const ageMs = Date.now() - new Date(state.updatedAt).getTime();
    // Use 12h threshold — data is expected to be a few hours old between cron runs
    setStatus(ageMs > 12 * 60 * 60 * 1000 ? 'stale' : 'live');
  } catch (err) {
    console.error('loadData:', err);
    setStatus('error');
  }
}

function rebuildMergedEvents() {
  // Start with curated events (always shown)
  const curated = _curatedEvents.slice();
  // Append enriched signal-events that have a location (else they'd have no lat/lng for map)
  const signalEvents = newsState.signals
    .filter(s => s.country && s.lat != null)
    .slice(0, 40)
    .map((s, i) => signalToEvent(s, i));
  state.events = [...curated, ...signalEvents];
  renderKPIs();
  renderList();
  rebuildMarkers();
  renderLayersPanel();
}

/* ---------- News signals: load + enrich locally ---------- */
async function loadNews() {
  try {
    const res = await fetch(`${NEWS_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const raw = json.signals || [];
    // Update the timestamp using news.json's updatedAt (fresher than hantavirus.json)
    if (json.updatedAt) {
      state.updatedAt = json.updatedAt;
      updateTimestampUI();
      const ageMs = Date.now() - new Date(json.updatedAt).getTime();
      setStatus(ageMs > 12 * 60 * 60 * 1000 ? 'stale' : 'live');
    }
    // Enrich each signal client-side: fill missing country/location + classify type
    newsState.signals = raw.map(s => {
      const enriched = { ...s };
      if (!enriched.country || enriched.lat == null) {
        const loc = detectLocationClient(enriched.title, enriched.rawCountry || enriched.country);
        if (loc.country) {
          enriched.country     = loc.country;
          enriched.countryCode = loc.countryCode;
          enriched.location    = loc.location;
          enriched.lat         = loc.lat;
          enriched.lng         = loc.lng;
        }
      }
      enriched.signalType = classifySignalType(enriched.title);
      enriched.title_km   = translateToKhmer(enriched.title);
      return enriched;
    });
    renderSignalList();
    placeNewsPins();
    rebuildMergedEvents();
  } catch (err) {
    console.warn('loadNews:', err);
    const el = document.getElementById('signalList');
    if (el) el.innerHTML = `<li class="signal-empty"><div class="signal-empty-icon">📡</div><div>មិនអាចផ្ទុកសញ្ញាណទេ។</div></li>`;
  }
}

/* ---------- Signals list ---------- */
function renderSignalList() {
  const el = document.getElementById('signalList');
  if (!el) return;
  const q = newsState.query.toLowerCase();
  const items = newsState.signals.filter(s =>
    !q || (s.title + ' ' + (s.country||'') + ' ' + (s.location||'') + ' ' + (s.source||'')).toLowerCase().includes(q)
  );
  if (!items.length) {
    el.innerHTML = `<li class="signal-empty">
      <div class="signal-empty-icon">📡</div>
      <div>គ្មានសញ្ញាណព័ត៌មានថ្មីៗទេ។</div>
      <div class="signal-empty-sub">ទិន្នន័យនឹងធ្វើបច្ចុប្បន្នភាពក្នុង ៣០ នាទី។</div>
    </li>`;
    return;
  }
  el.innerHTML = items.slice(0, 100).map(s => {
    const dup = s.duplicates?.length || 0;
    const loc = s.location || (s.country ? (COUNTRY_KM[s.country] || s.country) : 'មិនបានកំណត់');
    const isActive = newsState.activeId === s.id ? 'active' : '';
    const typeClass = s.signalType ? `signal-type-${s.signalType}` : '';
    const titleKm = s.title_km || translateToKhmer(s.title);
    return `<li class="signal-item ${isActive}" data-id="${s.id}">
      <div class="signal-row-top">
        <span class="signal-kind">NEWS</span>
        <span class="signal-age">${relAgoShort(s.publishedAt)}</span>
        ${s.feedId ? `<span class="signal-feed">${escHtml(s.feedId)}</span>` : ''}
        ${dup ? `<span class="signal-dup">+${dup}</span>` : ''}
        <span class="signal-dot signal-dot-${s.severity} ${typeClass}"></span>
      </div>
      <div class="signal-title">${escHtml(titleKm)}</div>
      <div class="signal-row-bottom">
        <span class="signal-loc">• ${escHtml(loc)}</span>
        <a class="signal-source-link" href="${escHtml(s.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escHtml(s.source || 'source')} ↗</a>
      </div>
    </li>`;
  }).join('');
  el.querySelectorAll('.signal-item').forEach(li =>
    li.addEventListener('click', () => openNewsAlert(li.dataset.id))
  );
}

/* ---------- News pins on map: cluster by country with numbered circles ---------- */
function placeNewsPins() {
  newsSignalLayer.clearLayers();
  if (!state.layers.signals) return;

  // Group signals by country
  const groups = new Map(); // key = country code (or raw lat/lng string)
  newsState.signals.forEach(s => {
    if (s.lat == null || s.lng == null) return;
    const key = s.countryCode || `${s.lat},${s.lng}`;
    const arr = groups.get(key) || { lat: s.lat, lng: s.lng, country: s.country, signals: [] };
    arr.signals.push(s);
    groups.set(key, arr);
  });

  groups.forEach(g => {
    const count = g.signals.length;
    // Determine dominant type across the group
    const typeCounts = { local: 0, imported: 0, response: 0, other: 0 };
    g.signals.forEach(s => { typeCounts[s.signalType || 'other']++; });
    const type = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];
    // Dominant severity
    const sevRank = { critical:0, high:1, medium:2, low:3 };
    const worstSev = g.signals.slice().sort((a, b) => sevRank[a.severity] - sevRank[b.severity])[0]?.severity || 'medium';

    const html = count > 1
      ? `<div class="news-pin-cluster pin-${worstSev} pin-type-${type}">${count}</div>`
      : `<div class="news-pin pin-${worstSev} pin-type-${type}"></div>`;

    const size = count > 1 ? [28, 28] : [14, 14];
    const icon = L.divIcon({ className: '', html, iconSize: size, iconAnchor: [size[0]/2, size[1]/2] });
    const m = L.marker([g.lat, g.lng], { icon });
    m.on('click', () => {
      if (count > 1) {
        // If zoomed out, zoom in; else open first signal
        if (map.getZoom() < 5) map.flyTo([g.lat, g.lng], 5, { duration: 0.8 });
        else openNewsAlert(g.signals[0].id);
      } else {
        openNewsAlert(g.signals[0].id);
      }
    });
    m.addTo(newsSignalLayer);
  });
}

/* ---------- Layers panel with country/alert counts ---------- */
function renderLayersPanel() {
  const el = document.getElementById('layersPanelContent');
  if (!el) return;
  const withCountry = newsState.signals.filter(s => s.country);
  const countryCount = new Set(withCountry.map(s => s.country)).size;
  const total30d = newsState.signals.length; // news window is 72h/30d
  const elCountries = document.getElementById('layersCountries');
  const elAlerts    = document.getElementById('layersAlerts');
  if (elCountries) elCountries.textContent = toKhmerNum(countryCount);
  if (elAlerts)    elAlerts.textContent    = toKhmerNum(total30d);
}

/* ---------- News alert modal ---------- */
function openNewsAlert(id) {
  const s = newsState.signals.find(x => x.id === id);
  if (!s) return;
  newsState.activeId = id;
  renderSignalList();
  document.getElementById('alertTitle').textContent    = s.title;
  document.getElementById('alertStatus').textContent   = STATUS_KM[s.status] || 'សកម្ម';
  document.getElementById('alertAge').textContent      = formatRelativeKm(s.publishedAt);
  document.getElementById('alertCountry').textContent  = s.country ? (COUNTRY_KM[s.country] || s.country) : '—';
  document.getElementById('alertLocation').textContent = s.location || '—';
  document.getElementById('alertReadBtn').href         = s.url;
  document.getElementById('alertOrigin').textContent   = `ប្រភព: ${s.source || 'news'}${s.feedId ? ' · ' + s.feedId : ''}`;
  document.getElementById('alertSummary').textContent  = s.title;
  const also = document.getElementById('alertAlso');
  if (s.duplicates?.length) {
    also.innerHTML = `<div class="alert-also-label">ក៏បានរាយការណ៍ដោយ ${toKhmerNum(s.duplicates.length)} ប្រភពផ្សេង</div>` +
      s.duplicates.slice(0,5).map(d =>
        `<a class="alert-also-row" href="${escHtml(d.url)}" target="_blank" rel="noopener">
          <span class="alert-also-kind">NEWS</span>
          <span class="alert-also-title">${escHtml(d.title || d.source || d.url)}</span>
          <span class="alert-also-ext">↗</span>
        </a>`).join('');
  } else {
    also.innerHTML = '';
  }
  document.getElementById('alertBackdrop').hidden = false;
  document.getElementById('newsAlert').hidden = false;
  requestAnimationFrame(() => {
    document.getElementById('newsAlert').classList.add('open');
    document.getElementById('alertBackdrop').classList.add('open');
  });
  if (s.lat != null) map.flyTo([s.lat, s.lng], 4, { duration: 0.8 });
}
function closeNewsAlert() {
  const el = document.getElementById('newsAlert');
  const bd = document.getElementById('alertBackdrop');
  el.classList.remove('open');
  bd.classList.remove('open');
  setTimeout(() => { el.hidden = true; bd.hidden = true; }, 180);
  newsState.activeId = null;
  renderSignalList();
}
function shareCurrentAlert() {
  const s = newsState.signals.find(x => x.id === newsState.activeId);
  if (!s) return;
  if (navigator.share) navigator.share({ title: s.title, url: s.url }).catch(() => {});
  else navigator.clipboard?.writeText(`${s.title} — ${s.url}`);
}

/* ---------- Event wiring ---------- */
document.querySelectorAll('#severityFilters .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#severityFilters .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.severity = chip.dataset.severity;
    renderList(); rebuildMarkers();
  });
});
document.getElementById('searchInput')?.addEventListener('input', e => {
  state.query = e.target.value.trim();
  renderList(); rebuildMarkers();
});
['Confirmed','Suspected','Endemic','Heat','Signals'].forEach(name => {
  const el = document.getElementById('layer' + name);
  el?.addEventListener('change', () => {
    state.layers[name.toLowerCase()] = el.checked;
    if (name === 'Signals') placeNewsPins();
    else rebuildMarkers();
  });
});
document.querySelectorAll('.topnav .nav-link').forEach(link => {
  const href = link.getAttribute('href') || '';
  if (href.startsWith('#')) {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    });
  }
});
document.getElementById('refreshBtn')?.addEventListener('click', () => {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('is-spinning');
  Promise.all([loadData(), loadNews()]).finally(() => {
    setTimeout(() => btn.classList.remove('is-spinning'), 400);
  });
});
document.getElementById('alertCloseBtn')?.addEventListener('click', closeNewsAlert);
document.getElementById('alertBackdrop')?.addEventListener('click', closeNewsAlert);
document.getElementById('alertShareBtn')?.addEventListener('click', shareCurrentAlert);
document.getElementById('alertShareBtn2')?.addEventListener('click', shareCurrentAlert);
document.getElementById('signalsSearch')?.addEventListener('input', e => {
  newsState.query = e.target.value.trim();
  renderSignalList();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNewsAlert(); });

// Layers panel toggle (collapse/expand)
document.getElementById('layersToggleBtn')?.addEventListener('click', () => {
  document.getElementById('layersPanel')?.classList.toggle('collapsed');
});

/* ---------- Donate modal wiring ---------- */
(function() {
  const dBtn  = document.getElementById('donateBtn');
  const dModal= document.getElementById('donateModal');
  const dBack = document.getElementById('donateBackdrop');
  if (!dBtn || !dModal || !dBack) return;
  function openD() { dBack.hidden = false; dModal.hidden = false; requestAnimationFrame(() => { dBack.classList.add('open'); dModal.classList.add('open'); }); }
  function closeD() { dBack.classList.remove('open'); dModal.classList.remove('open'); setTimeout(() => { dBack.hidden = true; dModal.hidden = true; }, 200); }
  dBtn.addEventListener('click', openD);
  document.getElementById('donateCloseBtn')?.addEventListener('click', closeD);
  document.getElementById('donateCloseBtn2')?.addEventListener('click', closeD);
  dBack.addEventListener('click', closeD);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeD(); });
  document.getElementById('donateCopyBtn')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(location.href);
  });
})();

/* ---------- Init ---------- */
document.getElementById('year').textContent = toKhmerNum(new Date().getFullYear());

/* Generate QR code for donate modal using qrcode.js (CDN) */
(function initDonateQR() {
  const canvas = document.getElementById('donateQRCanvas');
  if (!canvas) return;
  function tryGenerate() {
    if (typeof QRCode === 'undefined') { setTimeout(tryGenerate, 300); return; }
    try {
      new QRCode(canvas, {
        text: DONATE_PAYLOAD || DONATE_NAME,
        width: 260, height: 260,
        colorDark: '#000000', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch(e) {
      // Fallback: draw a simple "scan unavailable" text
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(0,0,260,260);
        ctx.fillStyle = '#64748b'; ctx.font = '13px Inter,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ដាក់ QR នៅ assets/donate-qr.png', 130, 130);
      }
    }
  }
  tryGenerate();
})();

loadData();
loadNews();
setInterval(loadData, REFRESH_MS);
setInterval(loadNews, REFRESH_MS);
setInterval(updateTimestampUI, 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { loadData(); loadNews(); }
});
