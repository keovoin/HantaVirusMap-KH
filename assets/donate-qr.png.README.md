# QR Code for Donate Button

Place your QR image in this folder as **`donate-qr.png`** (or `.jpg` / `.svg` — then update the `<img src>` in `hantavirus.html` and `symptoms.html`).

## Recommended specs
- Size: **400 × 400 px** minimum (for scan reliability)
- Format: PNG with transparent or white background
- Type: any QR — ABA Bank, Wing, PayPal, Pi Pay, KHQR, Ko-fi, Buy Me a Coffee, etc.

## How it works
If `assets/donate-qr.png` doesn't exist, the Donate modal automatically shows a placeholder box with the text "ដាក់ QR នៅទីនេះ" — so the site still looks polished until you upload your QR.

## To change the donor name / message
Edit the `<strong id="donateName">K.Pichyvoin</strong>` and the message inside `<div class="donate-row">` blocks in `hantavirus.html` and `symptoms.html`.
