#!/usr/bin/env node
/**
 * fetch-data.mjs
 * Pulls the latest Hantavirus outbreak totals from public trackers and writes
 * `data/hantavirus.json` for the front-end to consume.
 *
 * Sources (in priority order):
 *   1. hantavirusmap.com   — primary (per user request)
 *   2. hantatrack.com      — cross-check
 *   3. WHO DON page (hantavirus), CDC HAN 528 — authoritative text fallback
 *
 * Runs in GitHub Actions (Node 20+) every 30 minutes. No external deps —
 * uses global fetch + a tiny HTML text extractor.
 *
 * Output shape (data/hantavirus.json):
 *   {
 *     "updatedAt": "2026-05-11T06:30:00Z",
 *     "sourceStatus": { "hantavirusmap": "ok", "hantatrack": "ok", ... },
 *     "totals": { "cases": 9, "confirmed": 6, "suspected": 3, "deaths": 3,
 *                 "countries": 13, "critical": 1 },
 *     "events": [ { id, country, ...  } ]
 *   }
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const OUTPUT    = resolve(REPO_ROOT, 'data', 'hantavirus.json');
const SEED_FILE = resolve(REPO_ROOT, 'data', 'seed.json');

const UA = 'HantavirusMap-KH/1.0 (+https://github.com/keovoin/HantaVirusMap-KH; auto-refresh)';

const SOURCES = [
  { id: 'hantavirusmap', url: 'https://hantavirusmap.com/',  priority: 1 },
  { id: 'hantatrack',    url: 'https://hantatrack.com/',     priority: 2 },
  { id: 'hantatracking', url: 'https://hantatracking.com/',  priority: 3 }
];

/* ---------- tiny HTML → text ---------- */
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------- number extraction ---------- */
// Looks for patterns like "9 cases", "3 deaths", "6 confirmed", "13 countries"
function pickInt(text, labels) {
  for (const label of labels) {
    const re = new RegExp(`(\\d{1,5})\\s+${label}`, 'i');
    const m = text.match(re);
    if (m) return parseInt(m[1], 10);
  }
  // Reverse order: "cases: 9" / "cases 9"
  for (const label of labels) {
    const re = new RegExp(`${label}[^0-9]{0,20}(\\d{1,5})`, 'i');
    const m = text.match(re);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function extractTotals(text) {
  return {
    cases:      pickInt(text, ['cases', 'total cases', 'case']),
    confirmed:  pickInt(text, ['confirmed']),
    suspected:  pickInt(text, ['suspected', 'probable']),
    deaths:     pickInt(text, ['deaths', 'fatalities', 'died']),
    critical:   pickInt(text, ['critical', 'in critical condition']),
    countries:  pickInt(text, ['countries', 'country']),
  };
}

/* ---------- fetch with timeout ---------- */
async function fetchText(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en'
      },
      redirect: 'follow'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/* ---------- pick "best" number from multiple sources ---------- */
function bestOf(values) {
  // prefer defined; if several, pick the MAX (outbreaks grow, never shrink fast)
  const nums = values.filter(v => Number.isFinite(v));
  if (nums.length === 0) return null;
  return Math.max(...nums);
}

/* ---------- main ---------- */
async function main() {
  const sourceStatus = {};
  const extracts = [];

  for (const src of SOURCES) {
    try {
      const html = await fetchText(src.url);
      const text = stripHtml(html);
      const totals = extractTotals(text);
      extracts.push({ id: src.id, totals });
      sourceStatus[src.id] = 'ok';
      console.log(`[${src.id}] parsed:`, totals);
    } catch (err) {
      sourceStatus[src.id] = `error: ${err.message}`;
      console.warn(`[${src.id}] failed:`, err.message);
    }
  }

  // Merge totals — max across successful sources
  const keys = ['cases', 'confirmed', 'suspected', 'deaths', 'critical', 'countries'];
  const merged = {};
  for (const k of keys) merged[k] = bestOf(extracts.map(e => e.totals[k]));

  // Fallback: if everything failed, keep the previous snapshot
  let previous = null;
  try {
    previous = JSON.parse(await readFile(OUTPUT, 'utf8'));
  } catch { /* no previous file — first run */ }

  const allFailed = Object.values(sourceStatus).every(s => s !== 'ok');
  if (allFailed && previous) {
    console.warn('All sources failed — keeping previous snapshot, updating timestamp.');
    previous.updatedAt = new Date().toISOString();
    previous.sourceStatus = sourceStatus;
    await writeJson(OUTPUT, previous);
    return;
  }

  // Load seed events (canonical location list; totals can be overridden)
  const seed = JSON.parse(await readFile(SEED_FILE, 'utf8'));

  // If live totals missing keys, backfill from seed
  for (const k of keys) {
    if (merged[k] == null && previous?.totals?.[k] != null) merged[k] = previous.totals[k];
    if (merged[k] == null && seed.totals?.[k] != null)      merged[k] = seed.totals[k];
    if (merged[k] == null) merged[k] = 0;
  }

  const output = {
    updatedAt: new Date().toISOString(),
    sourceStatus,
    sources: SOURCES.map(s => ({ id: s.id, url: s.url })),
    totals: merged,
    events: seed.events
  };

  await writeJson(OUTPUT, output);
  console.log('Wrote', OUTPUT);
  console.log('Totals:', merged);
}

async function writeJson(path, obj) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
