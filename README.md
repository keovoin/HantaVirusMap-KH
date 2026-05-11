# HantavirusMap — ផែនទីតាមដានមេរោគ Hantavirus (Khmer)

ផ្ទាំងគ្រប់គ្រងផ្ទាល់ (real-time dashboard) ជាភាសាខ្មែរ សម្រាប់តាមដានការរាតត្បាតនៃមេរោគ **Hantavirus** នៅទូទាំងពិភពលោក។

Built by **K.Pichyvoin** · Inspired by [worldmonitor.app](https://worldmonitor.app/)

---

## មុខងារសំខាន់ (Features)

- ផែនទីអន្តរកម្មពិភពលោក (Leaflet + CartoDB Dark basemap)
- បង្ហាញករណីបញ្ជាក់ / សង្ស័យ / តំបន់ឆ្លងធម្មតា ជាមួយនឹងចំណុចផ្ទាល់
- KPI ផ្ទាល់: ករណីសរុប, អ្នកស្លាប់, ករណីសង្ស័យ, ប្រទេសរងផលប៉ះពាល់
- បញ្ជីព្រឹត្តិការណ៍ចំហៀង ជាមួយនឹងការស្វែងរក + តម្រង់តាមកម្រិតធ្ងន់ធ្ងរ
- ស្រទាប់ផែនទីបង្វិលបាន (បញ្ជាក់ / សង្ស័យ / តំបន់ឆ្លងធម្មតា / ផែនទីកម្តៅ)
- រចនាងងឹត (dark UI) ស្រដៀង worldmonitor.app
- គាំទ្រពេញលេញនូវ **ភាសាខ្មែរ** រួមទាំងលេខ (Noto Sans Khmer)
- ធ្វើការលើឧបករណ៍ចល័ត (responsive)

---

## ដំណើរការ (Run locally)

គ្មានជំហានបង្កើត (build) ទេ — ជាគេហទំព័រឋិតិវន្តសុទ្ធ។

```bash
# ជម្រើស ១ — Python
python3 -m http.server 8080

# ជម្រើស ២ — Node
npx serve .
```

បន្ទាប់មកបើក <http://localhost:8080>។

---

## រចនាសម្ព័ន្ធ (Structure)

```
HantaVirusMap-KH/
├── index.html          # ទម្រង់ទំព័រ
├── styles/main.css     # រចនាបថ (dark theme)
├── scripts/app.js      # តក្កផែនទី + ទិន្នន័យ
└── README.md
```

---

## ប្រភពទិន្នន័យ (Data sources)

ទិន្នន័យត្រូវបានប្រមូល (aggregated) ពីប្រភពសាធារណៈ:

- WHO Disease Outbreak News (DON 2026-DON599)
- US CDC — HAN 528 / Situation summary
- ECDC, PAHO, UKHSA, NICD, KDCA, China CDC
- ផ្សព្វផ្សាយ: Reuters, AP, BBC, Newsweek

> សម្គាល់: ទិន្នន័យត្រូវបានអង្គក្នុងឯកសារ `scripts/app.js` (static dataset) ។
> ក្នុងការអនុវត្តផលិតកម្ម (production) គួរភ្ជាប់ API ផ្ទាល់ (WHO/CDC feed)។

---

## កំណត់សម្គាល់

ផ្ទាំងនេះមានគោលបំណងផ្តល់ព័ត៌មាន **ប៉ុណ្ណោះ**។ វាមិនមែនជាការណែនាំផ្នែកវេជ្ជសាស្ត្រទេ។
ប្រសិនបើអ្នកមានរោគសញ្ញា សូមប្រឹក្សាជាមួយគ្រូពេទ្យ ឬទូរស័ព្ទទៅ CDC កម្ពុជា។

---

## អាជ្ញាប័ណ្ណ (License)

MIT © 2026 K.Pichyvoin
