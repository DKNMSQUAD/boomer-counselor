---
type: hot-cache
updated: 2026-04-18 22:00
---

# Hot Cache

Recent context for session continuity.

## Current State
- All 3 tools live at boomercounselor.com
- Rebrand from NM Squad complete
- Analytics v3.1 deployed (Version 5, Apr 18 2026)
  - Dual-sheet writes: RAW (Users+Events) + ANALYTICS (4 human-friendly tabs)
  - LockService serialization prevents duplicate rows
  - 5-min session gap rule for new tool-use rows
  - Career Discovery debounced trait emit with full selected_traits array (fixed Apr 18)
  - Server-side career match computation with % scores
  - Profile criteria auto-bucketed into 4 categories
  - College shortlist add/remove maintained as running list
- Hub capitalization fixed: "Boomer Counselor" (not "boomer counselor")
- IP geolocation: geojs.io primary (ipapi.co CORS-blocked)

## Active Work
- Project transferred to Claude Code workflow (April 18, 2026)
- CLAUDE.md in repo for Claude Code context
- Obsidian vault for wiki-based knowledge management
- All analytics verified via full E2E test (Priya Sharma test user)

## Key URLs
- Live site: https://boomercounselor.com
- RAW Sheet: https://docs.google.com/spreadsheets/d/1oCj_MVwTsYkS1HXNKwMZcsSaRCWXdCOQO3qW-yaqLq0/edit
- Analytics Sheet: https://docs.google.com/spreadsheets/d/1eyuxEbFsiEBgO9EjiCnbBGy1fpIK2uHws6FEW01iZuk/edit
- Apps Script: https://script.google.com/home/projects/16IgPxqH1NZ4cciuvwVSPpBFj7INKxkcB5EI4G9A8Jm5LU-MUbMJ2J3Av/edit
- GitHub: https://github.com/DKNMSQUAD/boomer-counselor

## Stack
- Hub: static HTML/CSS/JS (no framework)
- Sub-apps: React + Vite (careers and college-search on v19+v8, profile on v18+v5)
- Deploy: Netlify auto-deploy on push to main
- Repo: DKNMSQUAD/boomer-counselor on GitHub
