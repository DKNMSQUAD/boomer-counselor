---
type: meta
title: "Lint Report 2026-04-18"
created: 2026-04-18
updated: 2026-04-18
tags: [meta, lint]
status: developing
---

# Lint Report: 2026-04-18

## Summary
- Pages scanned: 4 (overview, hot, log, index)
- Content pages in category folders: 0
- Issues found: 14
- Auto-fixed: 0
- Needs review: 14

Vault is scaffold-only. No ingests have run yet, so most lint checks are premature. The only meaningful issue right now is that `index.md` promises 13 pages that do not exist.

## Dead Links (from index.md)
All referenced in `wiki/index.md`, none exist:

**Apps**
- [[Career Discovery]]
- [[Profile Builder]]
- [[College Search]]

**Integrations**
- [[Google Sheets Analytics]]
- [[Razorpay Payments]]
- [[Firebase]]
- [[Netlify]]
- [[Capacitor]]

**Codebase**
- [[Architecture]]
- [[Deploy Pipeline]]
- [[Branding Rules]]

**Decisions**

Suggest: either create stubs under the matching folders (`wiki/apps/`, `wiki/integrations/`, `wiki/codebase/`, `wiki/decisions/`), or trim `index.md` until pages actually land via ingest.

## Orphan Pages
None. Every existing `.md` is either an index/meta file or linked from one.

## Missing Pages
Concepts referenced in CLAUDE.md and overview but not yet pages: hub sign-in flow, masthead/iframe caveat, Apps Script webhook, geojs.io fallback, Vite base config, Razorpay functions. Defer until ingests.

## Frontmatter Gaps
- `wiki/index.md` — missing `created`, `tags`, `status`
- `wiki/overview.md` — missing `created`, `tags`, `status`
- `wiki/hot.md` — check when next touched
- `wiki/log.md` — check when next touched

## Empty Sections
None detected in the 4 scanned pages.

## Stale Claims
N/A — no claim-bearing content pages yet.

## Cross-Reference Gaps
N/A — no content pages yet.

## Naming / Style
- File and link casing look consistent with Title Case convention.
- No style-guide violations because no prose content exists.

## Recommendation
Hold off on auto-fix. The right next move is to ingest the actual codebase (`/wiki ingest` on CLAUDE.md, `netlify.toml`, each app's README / package.json) so the 13 promised pages get real content. Re-lint after that batch.
