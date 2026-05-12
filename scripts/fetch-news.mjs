#!/usr/bin/env node
/**
 * fetch-news.mjs — Live hantavirus news signals from GDELT + Google News.
 * Writes data/news.json. Runs every 30 min via GitHub Actions.
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '..', 'data', 'news.json');
const UA = 'HantavirusMap-KH/1.0 (+https://github.com/keovoin/HantaVirusMap-KH)';
const KEYWORDS = '(hantavirus OR "andes virus" OR "MV Hondius" OR "Hondius")';
const WINDOW_HRS = 72;

const COUNTRY_DICT = [
  { name:'Spain',code:'ES',lat:40.4168,lng:-3.7038,aliases:['Spanish','Tenerife','Madrid','Canary'] },
  { name:'Argentina',code:'AR',lat:-34.6037,lng:-58.3816,aliases:['Argentinian','Patagonia','Bariloche'] },
  { name:'United States',code:'US',lat:38.8951,lng:-77.0364,aliases:['U.S.','USA','American','Nebraska'] },
  { name:'United Kingdom',code:'GB',lat:51.5074,lng:-0.1278,aliases:['UK','Britain','British','London','UKHSA'] },
  { name:'Switzerland',code:'CH',lat:47.3769,lng:8.5417,aliases:['Swiss','Zurich'] },
  { name:'Netherlands',code:'NL',lat:52.3676,lng:4.9041,aliases:['Dutch','Amsterdam','RIVM'] },
  { name:'Germany',code:'DE',lat:52.52,lng:13.405,aliases:['German','Berlin'] },
  { name:'Singapore',code:'SG',lat:1.3521,lng:103.8198,aliases:['Singaporean'] },
  { name:'South Africa',code:'ZA',lat:-33.9249,lng:18.4241,aliases:['Cape Town','NICD'] },
  { name:'Cape Verde',code:'CV',lat:14.933,lng:-23.5133,aliases:['Cabo Verde','Praia'] },
  { name:'Brazil',code:'BR',lat:-15.78,lng:-47.93,aliases:['Brazilian'] },
  { name:'Chile',code:'CL',lat:-33.45,lng:-70.67,aliases:['Chilean'] },
  { name:'China',code:'CN',lat:39.9,lng:116.4,aliases:['Chinese','Shandong'] },
  { name:'South Korea',code:'KR',lat:37.57,lng:126.98,aliases:['Korean','Seoul','KDCA'] },
  { name:'Finland',code:'FI',lat:60.17,lng:24.94,aliases:['Finnish','Helsinki'] },
  { name:'France',code:'FR',lat:48.86,lng:2.35,aliases:['French','Paris'] },
  { name:'Cambodia',code:'KH',lat:11.56,lng:104.93,aliases:['Khmer','Phnom Penh'] }
];
const SUBLOC = [
  { re:/tenerife/i, country:'Spain', loc:'Tenerife, Spain', lat:28.29, lng:-16.63 },
  { re:/patagonia|bariloche/i, country:'Argentina', loc:'Patagonia, Argentina', lat:-41.13, lng:-71.31 },
  { re:/nebraska/i, country:'United States', loc:'Nebraska, US', lat:41.26, lng:-95.93 },
  { re:/cape town/i, country:'South Africa', loc:'Cape Town, SA', lat:-33.92, lng:18.42 }
];

function sha1(s){ return createHash('sha1').update(s).digest('hex').slice(0,16); }
function strip(s){ return (s||'').replace(/<[^>]+>/g,' ').replace(/&\w+;/g,' ').replace(/\s+/g,' ').trim(); }

async function fetchText(url, ms=20000){
  const c=new AbortController(); const t=setTimeout(()=>c.abort(),ms);
  try{ const r=await fetch(url,{signal:c.signal,headers:{'User-Agent':UA},redirect:'follow'}); if(!r.ok)throw new Error('HTTP '+r.status); return await r.text(); }finally{clearTimeout(t);}
}

async function fetchGdelt(){
  const url='https://api.gdeltproject.org/api/v2/doc/doc?query='+encodeURIComponent(KEYWORDS+' sourcelang:english')+'&mode=ArtList&format=json&maxrecords=80&timespan='+WINDOW_HRS+'h&sort=datedesc';
  try{ const j=JSON.parse(await fetchText(url)); return (j.articles||[]).map(a=>({title:strip(a.title),url:a.url,domain:a.domain||'',publishedAt:gdeltDate(a.seendate),lang:a.sourcelang||'eng',rawCountry:a.sourcecountry||''})).filter(a=>a.title&&a.url); }catch(e){ console.warn('[gdelt]',e.message); return []; }
}
function gdeltDate(s){ if(!s||s.length<15)return new Date().toISOString(); return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:${s.slice(13,15)}Z`; }

async function fetchGNews(){
  const url='https://news.google.com/rss/search?q='+encodeURIComponent(KEYWORDS+' when:3d')+'&hl=en-US&gl=US&ceid=US:en';
  try{ const xml=await fetchText(url); const items=[]; const re=/<item[\s\S]*?<\/item>/gi; for(const m of xml.match(re)||[]){ items.push({title:strip(pick(m,'title')),url:pick(m,'link'),publishedAt:new Date(pick(m,'pubDate')||Date.now()).toISOString(),domain:dom(pick(m,'link')),lang:'eng',rawCountry:''}); } return items.filter(a=>a.title&&a.url); }catch(e){ console.warn('[gnews]',e.message); return []; }
}
function pick(b,t){ const m=b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`,'i')); return m?(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').trim()):''; }
function dom(u){ try{return new URL(u).hostname.replace(/^www\./,'');}catch{return '';} }

function detectLoc(title,raw){
  const h=' '+title+' '+(raw||'')+' ';
  for(const s of SUBLOC){ if(s.re.test(h)){ const c=COUNTRY_DICT.find(x=>x.name===s.country); return {country:s.country,countryCode:c?.code||'',location:s.loc,lat:s.lat,lng:s.lng}; }}
  for(const c of COUNTRY_DICT){ for(const tk of [c.name,...c.aliases]){ if(new RegExp('\\b'+tk.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(h)) return {country:c.name,countryCode:c.code,location:c.name,lat:c.lat,lng:c.lng}; }}
  return {country:null,countryCode:null,location:null,lat:null,lng:null};
}
function detectSev(t){ const l=t.toLowerCase(); if(/death|died|dies|fatal|killed/.test(l))return 'critical'; if(/confirmed|positive|outbreak|cluster|quarantin/.test(l))return 'high'; if(/suspected|probable|investigat/.test(l))return 'medium'; return 'low'; }
function detectStatus(t,p){ const h=(Date.now()-Date.parse(p))/3.6e6; if(h<24&&/outbreak|confirmed|cases|deaths|evacuat/i.test(t))return 'active'; if(/update|situation/i.test(t))return 'update'; return 'monitoring'; }
function nums(t){ const c=/(\d{1,4})\s+(cases|confirmed|infected)/i.exec(t); const d=/(\d{1,4})\s+(deaths|dead|died)/i.exec(t); return {cases:c?+c[1]:null,deaths:d?+d[1]:null}; }

function dedupe(arr){
  const byUrl=new Map(), byKey=new Map(), out=[];
  for(const s of arr){
    if(byUrl.has(s.url))continue;
    const k=s.title.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim().slice(0,80);
    const dup=byKey.get(k);
    if(dup){dup.duplicates.push({source:s.source,url:s.url,title:s.title});continue;}
    s.duplicates=[]; byUrl.set(s.url,s); byKey.set(k,s); out.push(s);
  }
  return out;
}

async function main(){
  console.log('Fetching GDELT...'); const a=await fetchGdelt(); console.log(' ',a.length);
  console.log('Fetching Google News...'); const b=await fetchGNews(); console.log(' ',b.length);
  const raw=[...a,...b].sort((x,y)=>Date.parse(y.publishedAt)-Date.parse(x.publishedAt));
  const enriched=raw.map(i=>{const loc=detectLoc(i.title,i.rawCountry);return{id:sha1(i.url),title:i.title,url:i.url,source:i.domain||'news',lang:i.lang,publishedAt:i.publishedAt,...loc,severity:detectSev(i.title),status:detectStatus(i.title,i.publishedAt),...nums(i.title)};});
  const deduped=dedupe(enriched);
  const cutoff=Date.now()-WINDOW_HRS*3600*1000;
  const final=deduped.filter(s=>Date.parse(s.publishedAt)>=cutoff);
  final.sort((x,y)=>{const r={critical:0,high:1,medium:2,low:3};const d=r[x.severity]-r[y.severity];return d||Date.parse(y.publishedAt)-Date.parse(x.publishedAt);});
  const output={updatedAt:new Date().toISOString(),window:WINDOW_HRS+'h',count:final.length,sources:['gdelt','google-news'],signals:final.slice(0,200)};
  if(!final.length){try{const p=JSON.parse(await readFile(OUTPUT,'utf8'));p.updatedAt=new Date().toISOString();await writeJson(OUTPUT,p);console.warn('0 signals - kept previous.');return;}catch{}}
  await writeJson(OUTPUT,output); console.log('Wrote',final.length,'signals');
}
async function writeJson(p,o){await mkdir(dirname(p),{recursive:true});await writeFile(p,JSON.stringify(o,null,2)+'\n','utf8');}
main().catch(e=>{console.error(e);process.exit(1);});
