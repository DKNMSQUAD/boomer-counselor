# Boomer Counselor — Decision log

Why things are the way they are. Future patches and the Aiyyo absorption should respect or explicitly overturn these.

## 2026-04 NM Squad → Boomer Counselor rebrand

The site was originally NM Squad (Neeraj Mandhana's personal college counselling brand). Renamed to Boomer Counselor in April 2026. Footer is `(c) 2026 Boomer Counselor`. Contact email is `contact@boomercounselor.com`. Razorpay merchant name was updated. Logos swapped to `logo.png`. **Rule:** no NM Squad strings anywhere in user-facing UI. If found, fix immediately.

## 2026-04 Razorpay removed from College Search

College Search previously sold paid reports via Razorpay. Decision: reports are free. Razorpay was ripped out entirely. No keys, no merchant integration, no payment flow remains. Locked-tool "Premium" pills in the hub dropdown are pure UI; clicking does nothing — there's no paywall behind them.

Files deleted in the rip-out: `src/components/PaywallModal.jsx`, `src/hooks/usePurchases.js`, `netlify/functions/create-order.js`, `netlify/functions/verify-payment.js`, `functions/package.json`. `ReportModal` now renders every page of the Intelligence Report PDF and exposes a native Share button.

**Primary motivation was App Store guideline 3.1.1** (digital content must use IAP, not a third-party processor). Razorpay removal eliminated the biggest submission risk for the iOS/Android builds.

## 2026-04-20 Native bundle rebranded `com.boomercounselor.app`

Bundle ID renamed from `com.boomercounselor.collegesearch` → `com.boomercounselor.app`. Display name renamed from `College Search` → `Boomer Counselor`. Synced across iOS `pbxproj`, Android `applicationId` + `namespace`, `strings.xml` (`app_name`, `title_activity_main`, `package_name`, `custom_url_scheme`), and the MainActivity Java package path. Reason: the native app ships the full hub, not just College Search.

## 2026-04-20 Native app = full hub bundled offline

Decision: native iOS/Android builds wrap the **entire Boomer Counselor hub** (every tool bundled offline), not just College Search. New `build-native.sh` at repo root assembles `dist-native/` from hub shell + every sub-app's dist. Capacitor config stays in `apps/college-search/capacitor.config.json` (historical) but `webDir: "../../dist-native"` points at the unified bundle. `dist-native/` is `.gitignore`'d — regenerate with `./build-native.sh && cd apps/college-search && npx cap sync`. The offline-shortlist + native-Share combo mitigates App Store guideline 4.2 (minimum functionality / WebView wrapper).

## 2026-04-21 Netlify removed

Migrated hosting from Netlify to Cloudflare Pages. `netlify.toml` is still in the repo but unused. Can be deleted post-handover. Cloudflare Pages chosen for: free plan, faster builds, easier custom domain + DNS (Cloudflare manages both).

## 2026-04-18 Analytics v3.1 architecture

Decision: write **every user action to two Google Sheets simultaneously**. RAW sheet for full event detail (debugging, replay); ANALYTICS sheet for product-friendly per-session views.

- Wrapped in `LockService.getScriptLock()` to handle concurrent writes from many users.
- Session gap rule: a new session row is created only when a `tool_open` event arrives ≥ 5 minutes after the user's last event.
- Trait labels (Career Discovery) and profile criteria (Profile Builder) are sent verbatim; Apps Script does the trait→ID map and bucketing server-side, so client code stays simple.
- Career-match scoring (25 careers × trait array) lives in Apps Script too, server-side. Client just sends `selected_traits`.

## 2026-04-30 clasp-based Apps Script deploy

Replaced the old "paste into Monaco editor + Cmd+S" deploy with `clasp push -f` + `clasp deploy -i <prod-deployment-id>`. The `/exec` URL is pinned in `index.html`, so we must always redeploy the **same** deployment ID, never create a new one.

## 2026-05-11 Hub dropdown locked except College Search

All sub-apps except College Search are marked `premium: true` in the hub `options` array. Click is a no-op; the Premium pill shows. The sub-app dist bundles still ship and are reachable by direct URL (no server-side gate). If true access control matters, a server-side check is needed — out of scope today.

Commit: `0d361b1` "feat: lock all tools except College Search".

## 2026-05-12 Embedded PAT removed from git remote

The `origin` remote URL previously embedded a GitHub PAT (`ghp_*`). The token had been revoked/expired, blocking pushes. Replaced with the plain HTTPS URL; auth now flows through `gh`'s credential helper (`gh auth status` shows the active token). **Rule:** never re-embed PATs in remote URLs. Use `gh auth setup-git` instead.

## Monorepo, framework-free hub: deliberate

- Hub is intentionally framework-free (HTML/CSS/JS only). No React/Vue/etc. Reason: trivial maintenance, fast loads, no build pipeline for the most-visited page.
- All tools live in `apps/<name>/` in the same repo. Reason: one deploy, one set of credentials, one branding source-of-truth. Splitting would multiply the ops surface area.

## CF Pages builds dist on every push (not committed)

Original setup committed `apps/*/dist/` to git. Switched in commit `ce55d85` (2026-05-11): `apps/*/dist/` is now `.gitignore`'d and CF Pages runs `build-all.sh` on every push. Reason: avoid noisy dist diffs in PRs and avoid forgetting to rebuild before commit.

## DK's working style (for any future maintainer)

- Act, don't ask: edit, commit, push end-to-end.
- Batch into one commit with a clear message.
- Mobile-responsive is non-negotiable.
- No em dashes (—) or en dashes (–) anywhere — use hyphens/colons/commas.
- Never put emojis in JSX text (renders as `?` in this stack). CSS or inline SVG instead.
- DK is in Mumbai (IST).
