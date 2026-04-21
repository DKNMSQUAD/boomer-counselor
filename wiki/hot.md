---
type: hot-cache
updated: 2026-04-21 23:00
---

# Hot Cache

Recent context for session continuity.

## Current State
- All 3 tools live at boomercounselor.com
- MIGRATED FROM NETLIFY TO CLOUDFLARE PAGES (Apr 21 2026)
  - Cloudflare Pages project: boomer-counselor
  - Preview URL: boomer-counselor.pages.dev
  - Custom domain: boomercounselor.com (DNS on Cloudflare, Free plan)
  - Cloudflare nameservers: bradley.ns.cloudflare.com, nataly.ns.cloudflare.com
  - GoDaddy nameservers updated to point to Cloudflare
  - Netlify site DELETED (no more charges)
  - _redirects and _headers files replace netlify.toml
  - Google OAuth origins: boomercounselor.com + boomer-counselor.pages.dev
- Analytics v3.1 deployed (Version 5, Apr 18 2026)
  - Dual-sheet writes: RAW (Users+Events) + ANALYTICS (4 human-friendly tabs)
  - LockService serialization prevents duplicate rows
  - 5-min session gap rule for new tool-use rows
  - Career Discovery debounced trait emit with full selected_traits array
  - Server-side career match computation with % scores
  - Profile criteria auto-bucketed into 4 categories
  - College shortlist add/remove maintained as running list
- Razorpay REMOVED (reports are free)

## Pending (next session)
- UI unification: Career Discovery + Profile Builder to match College Search design
- College Search filter labels: student-friendly sentences
- Footer: add "Want to be listed" + "Report error" links
- Listing form: build form page + Google Sheet backend

## Key URLs
- Live site: https://boomercounselor.com
- Cloudflare Pages preview: https://boomer-counselor.pages.dev
- Cloudflare dashboard: https://dash.cloudflare.com/869a5c91069a60c128ed30838b881be2
- RAW Sheet: https://docs.google.com/spreadsheets/d/1oCj_MVwTsYkS1HXNKwMZcsSaRCWXdCOQO3qW-yaqLq0/edit
- Analytics Sheet: https://docs.google.com/spreadsheets/d/1eyuxEbFsiEBgO9EjiCnbBGy1fpIK2uHws6FEW01iZuk/edit
- Apps Script: https://script.google.com/home/projects/16IgPxqH1NZ4cciuvwVSPpBFj7INKxkcB5EI4G9A8Jm5LU-MUbMJ2J3Av/edit
- GitHub: https://github.com/DKNMSQUAD/boomer-counselor

## Stack
- Hub: static HTML/CSS/JS (no framework)
- Sub-apps: React + Vite
- Deploy: Cloudflare Pages auto-deploy on push to main (FREE, unlimited bandwidth)
- DNS: Cloudflare (Free plan, registered on GoDaddy)
- Repo: DKNMSQUAD/boomer-counselor on GitHub
