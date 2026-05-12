# Donate QR — PICHYVOIN KEO

Place your actual QR image at **`assets/donate-qr.png`** (same folder as this README).

## Steps to upload

1. Go to https://github.com/keovoin/HantaVirusMap-KH/tree/main/assets
2. Click **Add file → Upload files**
3. Drag your QR image into the browser
4. Rename it to exactly **`donate-qr.png`**
5. Click **Commit changes**

## Specs
- Format: PNG (or JPG — then also update the `<img src>` in all 3 HTML pages)
- Size: 400×400 px minimum recommended
- Background: white or transparent

## Fallback
If `donate-qr.png` does NOT exist, the donation modal auto-shows a polished placeholder
saying "ដាក់ QR នៅទីនេះ" — so the site stays functional.

## To change the donor name
Search for `PICHYVOIN KEO` in these 3 files and replace:
- `index.html`
- `hantavirus.html`
- `symptoms.html`
