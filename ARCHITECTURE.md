# Boomer Counselor — Architecture

One-page picture of what talks to what. See `HANDOVER_EXTERNALS.md` for accounts/IDs and `RUNBOOK.md` for how to deploy each piece.

## Topology

```
   ┌─────────────────────────────────────────────────────────┐
   │ Browser                                                 │
   │  boomercounselor.com (Cloudflare Pages)                 │
   │                                                         │
   │  ┌─ Hub (index.html, framework-free) ──────┐            │
   │  │  • Google Sign-In (GIS, public client)  │            │
   │  │  • Dropdown picks tool                  │            │
   │  │  • Iframes the picked tool              │            │
   │  └─────────────────────────────────────────┘            │
   │            │                                            │
   │            │ window.postMessage(bc-event)               │
   │            ▼                                            │
   │  ┌─ Sub-apps (rewritten via _redirects) ───────────┐    │
   │  │  /careers/         → apps/careers/dist/*    [LOCKED] │
   │  │  /profile/         → apps/profile/dist/*    [LOCKED] │
   │  │  /college-search/  → apps/college-search/dist/* [LIVE]│
   │  │  /tutor-counselor/ → apps/tutor-counselor/dist/* [LOCKED]│
   │  │  /essay-feedback/  → apps/essay-feedback/dist/* [LOCKED]│
   │  └─────────────────────────────────────────────────┘    │
   └────────────────┬────────────────────────────────────────┘
                    │
        ┌───────────┼──────────────┬──────────────────┐
        ▼           ▼              ▼                  ▼
   geojs.io   Apps Script    Firebase           Google Identity
   (IP geo,    /exec         (College Search:    (OAuth, public)
    no key)    Web App        Auth + Firestore
               webhook)        + Storage)
                  │
                  ▼  LockService-wrapped doPost
        ┌─────────┴──────────────┐
        ▼                        ▼
   RAW sheet              ANALYTICS sheet
   (Users, Events)        (Users Overview, Career Discovery,
                           Profile Builder, College Search)
```

## Data flow — sign-in event

1. User clicks "Sign in with Google" in the hub.
2. GIS popup → returns ID token + access token.
3. Hub calls `https://www.googleapis.com/oauth2/v3/userinfo` with access token, gets profile.
4. Hub fires `logEvent('user_signed_in', {...})`:
   - awaits `locationPromise` (geojs.io, 2s timeout, then fallback to ipapi.co which CORS-fails silently)
   - POSTs JSON to Apps Script `/exec` URL
5. Apps Script `doPost`:
   - acquires `LockService.getScriptLock()` (waits up to 30s)
   - upserts Users tab row in RAW (keyed on `google_id`)
   - appends Events tab row in RAW
   - upserts Users Overview row in ANALYTICS
   - releases lock

## Data flow — tool usage event (e.g. Career Discovery)

1. Sub-app calls `emitEvent('quiz_completed', {selected_traits: [...]})` via `bcEvents.js`.
2. `bcEvents.js` does `window.parent.postMessage({type: 'bc-event', name, payload}, '*')`.
3. Hub listens on `message`, calls `logEvent` with the user context the hub holds (the sub-app is iframe'd and stateless about who's signed in).
4. Same path as sign-in event above. Apps Script computes career-match scores server-side from the trait array and writes the Career Discovery tab in ANALYTICS.

Events from each tool are debounced 1.5s in the sub-app so a 5-second flurry of trait clicks writes one row, not five.

Session gap rule (Apps Script): a new session row is created only when `tool_open` event arrives AND the last event for that user was ≥ 5 minutes ago.

## Routing

- **Cloudflare Pages** rewrites (from `_redirects`):
  - `/careers/*` → `/apps/careers/dist/:splat`
  - `/profile/*` → `/apps/profile/dist/:splat`
  - `/college-search/*` → `/apps/college-search/dist/:splat`
  - `/tutor-counselor/*` → `/apps/tutor-counselor/dist/:splat`
  - `/essay-feedback/*` → `/apps/essay-feedback/dist/:splat`
- Each sub-app's `vite.config.js` has `base` matching its `/<name>/` prefix.
- Hub embeds the picked tool in an iframe. Tools detect iframe via `window.self !== window.top` and render a lighter masthead.

## Build & deploy

- **Push to `main`** → Cloudflare Pages runs `build-all.sh`:
  - For each sub-app: `cd apps/<name> && npm install && npm run build`.
  - Outputs land at `apps/<name>/dist/`, which CF Pages serves.
- `apps/*/dist/` is `.gitignore`'d (untracked since commit `ce55d85`). CF Pages builds fresh on every push.
- The hub itself has no build step. Edit HTML/JS/CSS, commit, push.

## Mobile native (entire hub, not just College Search)

- The native app bundles the **full hub + every sub-app offline**, not only College Search. Historically Capacitor was set up inside `apps/college-search/` and the config still lives there, but `webDir` points at the repo-root `dist-native/`.
- `build-native.sh` at repo root assembles `dist-native/` by:
  - building each sub-app (`apps/<name>/dist`),
  - copying the hub shell (`index.html`, `logo.png`, `privacy.html`, `terms.html`) to `dist-native/`,
  - copying each tool's dist into `dist-native/<careers|profile|college-search>/`.
- Regenerate native bundle: `./build-native.sh && cd apps/college-search && npx cap sync`.
- Bundle identity (synced across iOS pbxproj `PRODUCT_BUNDLE_IDENTIFIER`, Android `applicationId` + `namespace`, `strings.xml`, MainActivity package path):
  - **iOS / Android bundle ID:** `com.boomercounselor.app` (renamed Apr 2026 from `com.boomercounselor.collegesearch`).
  - **Display name:** `Boomer Counselor` (renamed from `College Search`).
- App Store risk mitigations baked in (relevant to any future submission):
  - **3.1.1 (digital content must use IAP):** mitigated by Razorpay removal — reports are free, no third-party payments.
  - **4.2 (minimum functionality / WebView wrapper):** mitigated by native Share (Capacitor Share on iOS/Android, Web Share on mobile web, clipboard fallback on desktop) + offline shortlist.
- App Store / Play Store live status: **dormant.** See `HANDOVER_EXTERNALS.md` §11.

## What lives where

| Concern | Location |
|---|---|
| Hub HTML/CSS/JS | `index.html`, `listing.html`, `terms.html`, `privacy.html`, `logo.png`, `side.png` |
| Sub-app source | `apps/<name>/src/` |
| Sub-app build output | `apps/<name>/dist/` (untracked) |
| CF Pages routing | `_redirects`, `_headers` |
| Apps Script source mirror | `apps-script.gs` |
| Apps Script deploy auth | `~/.clasprc.json` (DK's laptop) |
| Native build | `dist-native/`, `build-native.sh`, `apps/college-search/capacitor.config.json` |
| Firebase config (live values) | `apps/college-search/.env*` (DK's laptop, NOT in repo) + CF Pages env vars |
| Public OAuth client ID | `index.html:24` (hardcoded, no secret) |
| Apps Script webhook URL | `index.html:25` (hardcoded, the /exec URL is the "secret" — it's tied to the deployment ID) |
