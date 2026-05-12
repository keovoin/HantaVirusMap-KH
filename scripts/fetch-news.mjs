#!/usr/bin/env node
/**
 * fetch-news.mjs — Live Hantavirus signals from multiple official + news sources.
 *
 * Sources:
 *   1. WHO Disease Outbreak News (RSS)
 *   2. ProMED Mail (RSS)
 *   3. ECDC (RSS)
 *   4. GDELT DOC 2.0 API
 *   5. 14 Google News locales
 *
 * Runs every 30 min via .github/workflows/refresh-news.yml
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '..', 'data', 'news.json');
const UA = 'HantavirusMap-KH/1.0 (+https://github.com/keovoin/HantaVirusMap-KH)';
const KEYWORDS = 'hantavirus OR "andes virus" OR "MV Hondius"';
const WINDOW_HRS = 72;

/* --- Official feeds --- */
const OFFICIAL_FEEDS = [
  { id:'WHO-DON',  url:'https://www.who.int/feeds/entity/emergencies/disease-outbreak-news/rss.xml', label:'WHO Disease Outbreak News' },
  { id:'ProMED',   url:'https://promedmail.org/feed/', label:'ProMED-mail' },
  { id:'ECDC',     url:'https://www.ecdc.europa.eu/en/rss.xml', label:'ECDC' }
];

/* --- Google News locales --- */
const GNEWS_FEEDS = [
  { id:'GoogleNews-en-US', hl:'en',      gl:'US', ceid:'US:en' },
  { id:'GoogleNews-en-GB', hl:'en',      gl:'GB', ceid:'GB:en' },
  { id:'GoogleNews-en-KH', hl:'en',      gl:'KH', ceid:'KH:en' },
  { id:'GoogleNews-es-ES', hl:'es',      gl:'ES', ceid:'ES:es' },
  { id:'GoogleNews-es-AR', hl:'es',      gl:'AR', ceid:'AR:es' },
  { id:'GoogleNews-es-MX', hl:'es',      gl:'MX', ceid:'MX:es' },
  { id:'GoogleNews-es-CL', hl:'es',      gl:'CL', ceid:'CL:es' },
  { id:'GoogleNews-ja-JP', hl:'ja',      gl:'JP', ceid:'JP:ja' },
  { id:'GoogleNews-fr-FR', hl:'fr',      gl:'FR', ceid:'FR:fr' },
  { id:'GoogleNews-de-DE', hl:'de',      gl:'DE', ceid:'DE:de' },
  { id:'GoogleNews-pt-BR', hl:'pt-BR',   gl:'BR', ceid:'BR:pt-419' },
  { id:'GoogleNews-zh-CN', hl:'zh-Hans', gl:'CN', ceid:'CN:zh-Hans' },
  { id:'GoogleNews-ko-KR', hl:'ko',      gl:'KR', ceid:'KR:ko' },
  { id:'GoogleNews-nl-NL', hl:'nl',      gl:'NL', ceid:'NL:nl' }
];

/* --- Country dictionary --- */
const COUNTRY_DICT = [
  { n:'United States', c:'US', lat:38.90, lng:-77.04, a:['U.S.','USA','American','Americans','Nebraska','North Carolina','California','Texas','Georgia','Utah','New Hampshire','Omaha','Houston','Atlanta','NCDHHS','CDC','HHS','Hochul','RFK'] },
  { n:'Spain',         c:'ES', lat:40.42, lng:-3.70,  a:['Spanish','Tenerife','Canary','Madrid'] },
  { n:'Argentina',     c:'AR', lat:-34.60,lng:-58.38, a:['Argentinian','Patagonia','Bariloche','Buenos Aires','Ushuaia'] },
  { n:'United Kingdom',c:'GB', lat:51.51, lng:-0.13,  a:['UK','Britain','British','London','UKHSA'] },
  { n:'Switzerland',   c:'CH', lat:47.38, lng:8.54,   a:['Swiss','Zurich'] },
  { n:'Netherlands',   c:'NL', lat:52.37, lng:4.90,   a:['Dutch','Amsterdam','RIVM','Holland'] },
  { n:'Germany',       c:'DE', lat:52.52, lng:13.41,  a:['German','Berlin','RKI'] },
  { n:'Singapore',     c:'SG', lat:1.35,  lng:103.82, a:['Singaporean'] },
  { n:'South Africa',  c:'ZA', lat:-33.92,lng:18.42,  a:['Cape Town','NICD'] },
  { n:'Cape Verde',    c:'CV', lat:14.93, lng:-23.51, a:['Cabo Verde','Praia'] },
  { n:'Brazil',        c:'BR', lat:-15.78,lng:-47.93, a:['Brazilian','Brasil'] },
  { n:'Chile',         c:'CL', lat:-33.45,lng:-70.67, a:['Chilean','Santiago'] },
  { n:'China',         c:'CN', lat:39.90, lng:116.40, a:['Chinese','Shandong'] },
  { n:'South Korea',   c:'KR', lat:37.57, lng:126.98, a:['Korean','Seoul','KDCA'] },
  { n:'Finland',       c:'FI', lat:60.17, lng:24.94,  a:['Finnish','Helsinki','THL'] },
  { n:'France',        c:'FR', lat:48.86, lng:2.35,   a:['French','Paris'] },
  { n:'Japan',         c:'JP', lat:35.68, lng:139.69, a:['Japanese','Tokyo'] },
  { n:'Cambodia',      c:'KH', lat:11.56, lng:104.93, a:['Khmer','Phnom Penh'] },
  { n:'Canada',        c:'CA', lat:45.42, lng:-75.70, a:['Canadian','Toronto','Vancouver'] },
  { n:'Mexico',        c:'MX', lat:19.43, lng:-99.13, a:['Mexican','Mexico City'] },
  { n:'Antarctica',    c:'AQ', lat:-62.0, lng:-58.0,  a:['MV Hondius','Hondius','cruise ship'] }
];
const SUBLOC = [
  { re:/tenerife|canary/i,        n:'Spain',          loc:'Tenerife, Spain',             lat:28.29, lng:-16.63 },
  { re:/patagonia|bariloche/i,    n:'Argentina',      loc:'Patagonia, Argentina',         lat:-41.13,lng:-71.31 },
  { re:/nebraska/i,               n:'United States',  loc:'Nebraska, US',                 lat:41.26, lng:-95.93 },
  { re:/north carolina|\bnc\b/i,  n:'United States',  loc:'North Carolina, US',           lat:35.75, lng:-78.64 },
  { re:/omaha|eppley/i,           n:'United States',  loc:'Omaha, Nebraska, US',          lat:41.26, lng:-95.93 },
  { re:/cape town/i,              n:'South Africa',   loc:'Cape Town, South Africa',      lat:-33.92,lng:18.42  },
  { re:/mv hondius|hondius|cruise ship/i, n:'Antarctica', loc:'MV Hondius (South Atlantic)', lat:-54.5, lng:-36.5 }
];

/* --- Helpers --- */
function sha1(s) { return createHash('sha1').update(s).digest('hex').slice(0,16); }
function strip(s) { return (s||'').replace(/<[^>]+>/g,' ').replace(/&\w+;/g,' ').replace(/\s+/g,' ').trim(); }
function dom(u) { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return ''; } }
function parseRss(xml) {
  const items = [];
  for (const blob of xml.match(/<item[\s\S]*?<\/item>/gi)||[]) {
    items.push({ title:pickTag(blob,'title'), link:pickTag(blob,'link'), pubDate:pickTag(blob,'pubDate') });
  }
  return items;
}
function pickTag(b,t) {
  const m = b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`,'i'));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').trim() : '';
}

async function fetchText(url, ms=20000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal:c.signal, headers:{'User-Agent':UA}, redirect:'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally { clearTimeout(t); }
}

function detectLoc(title, raw) {
  const h = ' ' + (title||'') + ' ' + (raw||'') + ' ';
  for (const s of SUBLOC) {
    if (s.re.test(h)) {
      const c = COUNTRY_DICT.find(x => x.n === s.n);
      return { country:s.n, countryCode:c?.c||'', location:s.loc, lat:s.lat, lng:s.lng };
    }
  }
  for (const c of COUNTRY_DICT) {
    for (const a of [c.n, ...c.a]) {
      const p = '\\b' + a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b';
      try { if (new RegExp(p,'i').test(h)) return { country:c.n, countryCode:c.c, location:c.n, lat:c.lat, lng:c.lng }; }
      catch { /* bad regex */ }
    }
  }
  return { country:null, countryCode:null, location:null, lat:null, lng:null };
}

function detectSev(t) {
  const l=(t||'').toLowerCase();
  if (/death|died|dies|fatal|killed/.test(l)) return 'critical';
  if (/confirmed|positive|outbreak|cluster|quarantin|evacuat/.test(l)) return 'high';
  if (/suspected|probable|investigat/.test(l)) return 'medium';
  return 'low';
}
function detectStatus(t,p) {
  const h=(Date.now()-Date.parse(p))/3.6e6;
  if (h<24 && /outbreak|confirmed|cases|deaths|evacuat|quarantin/i.test(t)) return 'active';
  if (/update|situation/i.test(t)) return 'update';
  return 'monitoring';
}
function nums(t) {
  const c=/(\d{1,4})\s+(cases|confirmed|infected|suspected)/i.exec(t);
  const d=/(\d{1,4})\s+(deaths|dead|died)/i.exec(t);
  return { cases:c?+c[1]:null, deaths:d?+d[1]:null };
}

/* --- Fetch official RSS (WHO, ProMED, ECDC) --- */
async function fetchOfficialFeed(feed) {
  try {
    const xml = await fetchText(feed.url);
    const items = parseRss(xml);
    const HANTA = /hantavirus|andes virus|hondius/i;
    return items
      .filter(i => HANTA.test(i.title))
      .map(i => ({ title:strip(i.title), url:i.link, domain:dom(i.link),
        publishedAt:new Date(i.pubDate||Date.now()).toISOString(),
        lang:'eng', rawCountry:'', feedId:feed.id, srcType:'official' }))
      .filter(i => i.title && i.url);
  } catch(e) { console.warn(`[${feed.id}] failed:`, e.message); return []; }
}

/* --- GDELT --- */
async function fetchGdelt() {
  const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query='+encodeURIComponent(KEYWORDS)+'&mode=ArtList&format=json&maxrecords=100&timespan='+WINDOW_HRS+'h&sort=datedesc';
  try {
    const j = JSON.parse(await fetchText(url));
    return (j.articles||[]).map(a => ({
      title:strip(a.title), url:a.url, domain:a.domain||'',
      publishedAt:gdeltDate(a.seendate), lang:a.language||a.sourcelang||'eng',
      rawCountry:a.sourcecountry||'', feedId:'GDELT', srcType:'news'
    })).filter(a => a.title && a.url);
  } catch(e) { console.warn('[GDELT] failed:', e.message); return []; }
}
function gdeltDate(s) {
  if(!s||s.length<15) return new Date().toISOString();
  return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:${s.slice(13,15)}Z`;
}

/* --- Google News (14 locales) --- */
async function fetchAllGoogleNews() {
  const results = [];
  await Promise.allSettled(GNEWS_FEEDS.map(async feed => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(KEYWORDS+' when:3d')}&hl=${feed.hl}&gl=${feed.gl}&ceid=${feed.ceid}`;
    try {
      const xml = await fetchText(url);
      for (const i of parseRss(xml)) {
        results.push({ title:strip(i.title), url:i.link, domain:dom(i.link),
          publishedAt:new Date(i.pubDate||Date.now()).toISOString(),
          lang:feed.hl.split('-')[0], rawCountry:feed.gl, feedId:feed.id, srcType:'news' });
      }
      console.log(`  [${feed.id}] OK`);
    } catch(e) { console.warn(`  [${feed.id}] failed:`, e.message); }
  }));
  return results.filter(a => a.title && a.url);
}

/* --- Dedup --- */
function dedupe(arr) {
  const byUrl = new Map(), byKey = new Map(), out = [];
  for (const s of arr) {
    if (byUrl.has(s.url)) continue;
    const k = s.title.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim().slice(0,80);
    const dup = byKey.get(k);
    if (dup) { dup.duplicates.push({ source:s.feedId||s.domain, url:s.url, title:s.title }); continue; }
    s.duplicates = [];
    byUrl.set(s.url, s); byKey.set(k, s); out.push(s);
  }
  return out;
}

/* --- Main --- */
async function main() {
  console.log('Fetching official feeds (WHO DON, ProMED, ECDC)...');
  const official = (await Promise.all(OFFICIAL_FEEDS.map(fetchOfficialFeed))).flat();
  console.log(`  Official: ${official.length}`);

  console.log('Fetching GDELT...');
  const gdelt = await fetchGdelt();
  console.log(`  GDELT: ${gdelt.length}`);

  console.log('Fetching 14 Google News locales...');
  const gnews = await fetchAllGoogleNews();
  console.log(`  Google News: ${gnews.length}`);

  const raw = [...official, ...gdelt, ...gnews]
    .sort((x,y) => Date.parse(y.publishedAt)-Date.parse(x.publishedAt));

  const enriched = raw.map(i => {
    const loc = detectLoc(i.title, i.rawCountry);
    return { id:sha1(i.url), title:i.title, url:i.url,
      source:i.domain||i.feedId||'news', lang:i.lang, feedId:i.feedId, srcType:i.srcType,
      publishedAt:i.publishedAt, ...loc,
      severity:detectSev(i.title), status:detectStatus(i.title,i.publishedAt), ...nums(i.title) };
  });

  const deduped = dedupe(enriched);
  const cutoff = Date.now() - WINDOW_HRS * 3600 * 1000;
  const final = deduped
    .filter(s => Date.parse(s.publishedAt) >= cutoff)
    .sort((x,y) => {
      const r={critical:0,high:1,medium:2,low:3};
      return (r[x.severity]-r[y.severity])||Date.parse(y.publishedAt)-Date.parse(x.publishedAt);
    });

  if (!final.length) {
    try {
      const prev = JSON.parse(await readFile(OUTPUT,'utf8'));
      prev.updatedAt = new Date().toISOString();
      prev.note = 'All sources returned 0 — kept previous snapshot.';
      await writeJson(OUTPUT, prev);
      console.warn('0 signals — kept previous.'); return;
    } catch { /* first run */ }
  }

  const output = {
    updatedAt: new Date().toISOString(),
    window: WINDOW_HRS+'h',
    count: final.length,
    sources: ['WHO-DON','ProMED','ECDC','GDELT',...GNEWS_FEEDS.map(f=>f.id)],
    methodology: {
      note: 'Official signals from WHO DON, ProMED-mail, ECDC. News signals from GDELT + Google News (14 locales). De-duplicated by normalised headline. Location extracted via country/city dictionary. Severity inferred from keywords.',
      links: {
        whoDON: 'https://www.who.int/emergencies/disease-outbreak-news',
        proMED: 'https://promedmail.org/',
        ecdc:   'https://www.ecdc.europa.eu/en/hantavirus-infection',
        cdc:    'https://www.cdc.gov/hantavirus/about/index.html'
      }
    },
    signals: final.slice(0, 300)
  };

  await writeJson(OUTPUT, output);
  console.log(`\nWrote ${final.length} signals — ${output.updatedAt}`);
}

async function writeJson(p,o) {
  await mkdir(dirname(p),{recursive:true});
  await writeFile(p, JSON.stringify(o,null,2)+'\n','utf8');
}

main().catch(e => { console.error(e); process.exit(1); });
