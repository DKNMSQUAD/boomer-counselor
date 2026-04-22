---
type: log
---
# Operation Log

Append-only record of wiki operations.

| Date | Operation | Details |
|------|-----------|---------|
| 2026-04-18 16:27 | SCAFFOLD | Wiki initialized for Boomer Counselor project |
| 2026-04-18 16:27 | CONTEXT | Hot cache seeded with current project state |

## 2026-04-21: Cloudflare Pages Migration

### Completed
- Migrated hosting from Netlify to Cloudflare Pages (Free plan, unlimited bandwidth)
- Created Cloudflare Pages project "boomer-counselor" connected to DKNMSQUAD/boomer-counselor GitHub repo
- Added _redirects and _headers files (Cloudflare equivalent of netlify.toml)
- Added boomercounselor.com zone to Cloudflare DNS (Free plan)
- Updated GoDaddy nameservers to Cloudflare (bradley.ns.cloudflare.com, nataly.ns.cloudflare.com)
- DNS propagated successfully ("Your domain is now protected by Cloudflare")
- Root CNAME automatically updated to point to boomer-counselor.pages.dev
- www CNAME updated from boomer-counselor.netlify.app to boomer-counselor.pages.dev
- Google OAuth origin added for boomer-counselor.pages.dev
- Analytics pipeline verified working from Cloudflare Pages domain
- Netlify site DELETED (no more charges)
- Updated CLAUDE.md with all Cloudflare references
- Updated wiki/hot.md with current state

### Previous sessions (Apr 17-18)
- Apps Script v3.1 deployed (LockService + session gap rule)
- Career Discovery debounced trait emit fixed
- Full E2E analytics test passed across all 4 tabs
- Hub capitalization fixed

## 2026-04-22: Tutor & Counselor Tool Launch + Fixes

### Completed
- Built Tutor & Counselor Search tool (4th tool) at /tutor-counselor/
- Data from Google Sheet 1m8PPTbx2183hjsqB0X-gLjzWZV3K5BSDFhGUXRYuSXw (93 providers)
- 5 filter groups: Type, Size, Mode, Pricing, Region
- Masthead: "Tutor & Counselor Search" / "Find the right guide."
- Analytics: ANALYTICS_TABS.TUTOR, ANALYTICS_TUTOR_HEADERS, updateTutorSession()
- Hub dropdown: "Find a Tutor or Counselor" (READY), no duplicates
- Hub tool id fixed from 'tutor' to 'tutor-counselor' (must match bcEvents.js)
- Listing form at /listing.html with Google Sheet backend (Listing Requests tab)
- College Search filter labels updated to student-friendly sentences
- Hub footer: "Want to be listed?" + "Report error" links
- Email updated from hello@ to contact@boomercounselor.com (16 files)
- GoDaddy email DNS records added to Cloudflare

### PENDING (must be done via Claude Code)
- Apps Script deployment: updateTutorSession fix uses getOrCreateSession() helper
  but has NOT been deployed as a new version yet.
  The fix is in apps-script.gs (commit e8f0115).
  Must be injected into Apps Script editor and deployed as NEW VERSION.
  Old bug: custom session logic compared string 'now' with Date 'rowTime' via
  subtraction, yielding NaN. No data rows were ever written to Tutor & Counselor tab.
  Fix: uses getOrCreateSession() helper (same as Profile Builder, Career Discovery,
  College Search).
