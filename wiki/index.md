---
type: index
updated: 2026-04-18 22:00
---

# Wiki Index

Master catalog for Boomer Counselor knowledge base.

## Apps
- [[Career Discovery]] - Interest-based career exploration quiz (25 careers, 12 traits, debounced emit)
- [[Profile Builder]] - Student profile generator (131 companies, 4 criteria categories, program click tracking)
- [[College Search]] - Paid tool with Razorpay + Firebase (filters, shortlist, reports, purchases)

## Analytics
- [[Analytics Pipeline]] - Dual-sheet system (RAW + human-friendly ANALYTICS sheet)
- [[Apps Script v3.1]] - LockService + session gap rule, deployed as Version 5
- [[Event Format]] - bcEvents.js postMessage -> hub logEvent -> Apps Script webhook
- [[Career Match Computation]] - Server-side trait-to-career matching with % scores

## Integrations
- [[Google Sheets Analytics]] - Hub sign-in tracking via Apps Script
- [[Razorpay Payments]] - College Search paywall
- [[Firebase]] - College Search backend
- [[Netlify]] - Hosting and deploy pipeline
- [[Capacitor]] - iOS/Android wrapper for College Search
- [[GeoJS]] - IP geolocation (replaced ipapi.co due to CORS)

## Codebase
- [[Architecture]] - Monorepo with hub + 3 React/Vite sub-apps
- [[Deploy Pipeline]] - Push to main, Netlify auto-deploys
- [[Branding Rules]] - Boomer Counselor
- [[Hub index.html]] - BC_CONFIG, Google OAuth, iframe gating, tool_open events

## Decisions
- [[Analytics v3 Dual Sheet]] - Separate human-friendly Analytics sheet (April 2026)
- [[LockService Fix]] - Serialized writes to prevent duplicate session rows (April 2026)
- [[Career Debounce Fix]] - Changed from per-toggle to debounced full-array emit (April 2026)
