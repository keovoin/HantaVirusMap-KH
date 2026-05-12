# HantavirusMap-KH — ផែនទីតាមដានមេរោគ Hantavirus (Khmer)

Real-time Hantavirus outbreak tracker in **Khmer language** — inspired by [worldmonitor.app](https://worldmonitor.app/).

**Built by PICHYVOIN KEO (K.Pichyvoin)**

---

## Features

### Live Dashboard (`index.html`)
- Dark-themed interactive world map (Leaflet + CartoDB Dark Matter)
- **3-column layout**: Events (left) · Map (center) · News Signals (right)
- **KPIs**: Total cases (៩៦), deaths (៣), suspected (១១), affected countries (២០)
- **16 curated outbreak events** with severity-colored pulsing markers
- **100+ live news signals** from 14 Google News locales + GDELT
- **Client-side NLP**: location detection (35 countries, 50+ US states/cities), phrase translation to Khmer, signal classification (Local/Imported/Response)
- News Alert modal with source link, country, location, duplicates
- Layers panel with Local/Imported/Response legend + "Add context" section
- Auto-refresh every 30 minutes + manual refresh button
- Donate button with QR code (PICHYVOIN KEO)
- **Vercel Web Analytics** — Track page views and user engagement

### Info Pages (Khmer)
- `hantavirus.html` — What is Hantavirus (8 sections, fully Khmer)
- `symptoms.html` — Symptoms: HPS 3-phase timeline, HFRS 5-phase grid, when to see a doctor

### Auto-refresh Pipeline (GitHub Actions)
- `scripts/fetch-data.mjs` — Scrapes hantavirusmap.com + hantatrack.com + hantatracking.com every 30 min
- `scripts/fetch-news.mjs` — Pulls from GDELT + 14 Google News locales (en-US, en-GB, en-KH, es-ES, es-AR, es-MX, es-CL, ja-JP, fr-FR, de-DE, pt-BR, zh-CN, ko-KR, nl-NL)
- `.github/workflows/refresh-data.yml` — Cron for outbreak totals
- `.github/workflows/refresh-news.yml` — Cron for news signals

---

## Data Sources

| Source | Type | Frequency |
|--------|------|-----------|
| [hantavirusmap.com](https://hantavirusmap.com/) | Outbreak totals | Every 30 min |
| [hantatrack.com](https://hantatrack.com/) | Cross-check | Every 30 min |
| [hantatracking.com](https://hantatracking.com/) | Cross-check | Every 30 min |
| GDELT DOC 2.0 API | Global news (English) | Every 30 min |
| Google News RSS (14 locales) | Multi-language news | Every 30 min |
| WHO DON, CDC HAN, ECDC, PAHO | Official (curated seed) | Manual |

---

## Run Locally

No build step — pure static site.

```bash
# Option 1: Python
python3 -m http.server 8080

# Option 2: Node
npx serve .
```

Open http://localhost:8080

---

## Structure

```
HantaVirusMap-KH/
├── index.html              # Main dashboard (3-column: events + map + signals)
├── hantavirus.html         # About Hantavirus (Khmer article)
├── symptoms.html           # Symptoms page (Khmer article)
├── scripts/
│   ├── app.js              # All client logic (map, signals, translate, donate)
│   ├── fetch-data.mjs      # Server scraper for outbreak totals
│   └── fetch-news.mjs      # Server scraper for news signals (14 locales)
├── styles/
│   └── main.css            # Full dark theme + all components
├── data/
│   ├── hantavirus.json     # Curated events + live totals (auto-refreshed)
│   ├── news.json           # Live news signals (auto-refreshed)
│   └── seed.json           # Fallback seed data
├── assets/
│   ├── donate-qr.png       # Your QR image (optional — canvas fallback exists)
│   └── donate-qr.png.README.md
├── .github/workflows/
│   ├── refresh-data.yml    # Cron: outbreak totals every 30 min
│   └── refresh-news.yml    # Cron: news signals every 30 min
└── README.md
```

---

## Credits

- **Built by**: PICHYVOIN KEO (K.Pichyvoin)
- **Inspired by**: [worldmonitor.app](https://worldmonitor.app/)
- **Data**: WHO, CDC, ECDC, PAHO, GDELT, Google News
- **Map**: [Leaflet](https://leafletjs.com/) + [CartoDB](https://carto.com/) Dark Matter basemap

---

## Donate

Click the ❤ **ឧបត្ថម្ភ** button in the top bar to scan the QR code for **PICHYVOIN KEO**.

---

## Known Limitations

1. **Refresh button re-fetches the same `data/news.json` file** — it only changes when the GitHub Actions cron commits new data (every 30 min). The button confirms the connection is alive but won't show "new" articles until the server-side scraper runs.
2. **News signals are in a 72h window** — articles older than 3 days drop off automatically.
3. **Khmer translation is rule-based** (not AI/LLM) — covers ~80 common phrases. Some English words may remain in translated titles.
4. **Location detection** catches ~95% of English headlines but may miss non-standard place names.

---

## License

MIT © 2026 PICHYVOIN KEO
