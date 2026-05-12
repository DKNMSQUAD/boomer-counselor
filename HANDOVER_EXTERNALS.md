# Boomer Counselor — External services inventory

Audit pass for Aiyyo handover. Every external service, account, ID, and secret-storage location this project touches. Generated 2026-05-12.

**Project root on DK's laptop:** `/Users/moneymakingmachine/boomer-counselor`
**Live site (current):** https://boomercounselor.com — **being decommissioned**, see §8. Target: `aiyyo-conference.web.app/boomer-counselor/` under Aiyyo.
**Repo:** https://github.com/DKNMSQUAD/boomer-counselor (branch `main`)
**Current state:** College Search is the only unlocked tool in the hub dropdown. All others (Career Discovery, Profile Builder, Tutor/Counselor, Scholarships, Essay Feedback) are visible but `premium`-flagged and click is a no-op.

---

## 1. Google OAuth Client

- **Purpose:** Hub Google Sign-In on landing page.
- **Client ID:** `226421699415-t9d0vg9r7dbb1v94kkrgfgdu0m0en7qt.apps.googleusercontent.com`
- **Location in code:** `index.html:24` (`window.BC_CONFIG.GOOGLE_CLIENT_ID`, hardcoded — public, no secret).
- **Owner:** Google Cloud project owned by `dknmsquad@gmail.com`.
- **Authorized JavaScript origins (current):** `https://boomercounselor.com`, `https://www.boomercounselor.com`, `https://boomer-counselor.pages.dev`.
- **Aiyyo action on flip-day:** add `contact@aiyyo.in` as Owner of the GCP project; add `https://aiyyo.in`, `https://www.aiyyo.in`, `https://aiyyo-conference.web.app` to Authorized JavaScript origins. Client secret is not used (this is a public web client) so no rotation needed.

## 2. Google Apps Script (analytics + sign-in webhook)

- **Purpose:** Backend for the hub. Receives sign-in events + per-tool usage events; writes to RAW and ANALYTICS sheets under `LockService` to prevent race conditions. v3.1, production deployment @17 as of 30 Apr 2026.
- **Script ID:** `16IgPxqH1NZ4cciuvwVSPpBFj7INKxkcB5EI4G9A8Jm5LU-MUbMJ2J3Av`
- **Production deployment ID:** `AKfycbyGquSlw0PqDyyn3HzUAKovwOxz3bw1iBIUtIxjMFYkCp_xSz58vP3E7LLX9ni6Gu4j`
- **Web App URL (production):** `https://script.google.com/macros/s/AKfycbyGquSlw0PqDyyn3HzUAKovwOxz3bw1iBIUtIxjMFYkCp_xSz58vP3E7LLX9ni6Gu4j/exec`
- **Source mirror in repo:** `apps-script.gs` (kept in sync via clasp).
- **Owner:** `dknmsquad@gmail.com`. Authed for CLI deploy via clasp at `~/.npm-global/bin/clasp` (token in `~/.clasprc.json`).
- **Triggers:** none configured. doPost-only Web App. Verify in Apps Script editor → Triggers tab before flip-day; flag any time-based or onEdit triggers.
- **Verify alive:** `curl -sL <Web App URL>` returns `{"status":"ok","message":"Boomer Counselor backend v3.1 alive..."}`.
- **Aiyyo action on flip-day:** Share → Make `contact@aiyyo.in` Owner. **Critical:** keep the same deployment ID — `index.html` has the `/exec` URL pinned. Re-deploying as a new deployment changes the URL and breaks the live hub.

## 3. Google Sheets — RAW

- **Purpose:** Per-user + per-event raw log written by Apps Script.
- **Name:** `Boomer Counselor Users`
- **Sheet ID:** `1oCj_MVwTsYkS1HXNKwMZcsSaRCWXdCOQO3qW-yaqLq0`
- **Tabs:** `Users` (one row per unique user, 25 cols, keyed on `google_id`), `Events` (one row per event, 30 cols, full detail).
- **Owner:** `dknmsquad@gmail.com`.
- **Aiyyo action:** Share → Owner → `contact@aiyyo.in`.

## 4. Google Sheets — ANALYTICS

- **Purpose:** Per-tool session-rolled-up analytics, also written by Apps Script.
- **Name:** `Boomer Counselor Analytics`
- **Sheet ID:** `1eyuxEbFsiEBgO9EjiCnbBGy1fpIK2uHws6FEW01iZuk`
- **Tabs:** `Users Overview`, `Career Discovery`, `Profile Builder`, `College Search`.
- **Owner:** `dknmsquad@gmail.com`.
- **Aiyyo action:** Share → Owner → `contact@aiyyo.in`.

## 5. Tool data — Google Sheets (CSV read-only)

**Correction to prior CLAUDE.md:** there is no Firebase anywhere in this project. College Search and the other tools read their data from public Google Sheets via CSV export. Razorpay was removed April 2026, and Firebase was removed alongside it. No `firebaseConfig`, no `VITE_FIREBASE_*` env vars in use, no `firebase` dep in any sub-app's `package.json`. No Stripe either. **There are no API keys to transfer.**

Per-tool data sheets:

| Tool | Sheet ID | Read path |
|---|---|---|
| Profile Builder | `1vkYtslNapoUNErsGmCcAo0j8sAeNSGebcrLhq2aJLf8` | `apps/profile/src/hooks/useSheetData.js` |
| College Search | `1Pb7Uin9Oc1omLM2kXhdisZuqV84PCMqdhRlQjNBSYlc` | `apps/college-search/src/hooks/useGoogleSheet.js` |
| Tutor/Counselor | `1m8PPTbx2183hjsqB0X-gLjzWZV3K5BSDFhGUXRYuSXw` | `apps/tutor-counselor/src/hooks/useSheetData.js` |

All owned by `dknmsquad@gmail.com`. All published-to-web for CSV export.

**Aiyyo action:** Share each → Owner → `contact@aiyyo.in`. No code changes needed; the sheet ID is hardcoded in each hook, ownership flip doesn't affect that.

## 6. Cloudflare Pages

- **Purpose:** Hosts the entire boomercounselor.com site. Auto-deploys on push to `main`. Builds via `build-all.sh` (each sub-app `npm install && npm run build`, then root commits). `apps/*/dist/` is `.gitignore`'d and built by CF Pages on every push.
- **Project name:** `boomer-counselor`
- **Preview URL:** https://boomer-counselor.pages.dev
- **Account:** `Dknmsquad@gmail.com` (Cloudflare Free plan)
- **Aiyyo action:** Cloudflare → Account → Members → invite `contact@aiyyo.in` as Admin. Transfer Pages project ownership *or* (recommended) keep Pages alive at DK's account and only flip the registrar/DNS pointers.

## 7. Cloudflare DNS

- **Domain:** `boomercounselor.com`
- **Nameservers:** `bradley.ns.cloudflare.com`, `nataly.ns.cloudflare.com`
- **Account:** same as Cloudflare Pages (`Dknmsquad@gmail.com`).
- **Aiyyo action:** none — domain is being decommissioned (see §8). DK deletes the Cloudflare zone for `boomercounselor.com` alongside the GoDaddy auto-renew cancellation.

## 8. Domain — 6-month 301 wind-down, then expire

- **Domain:** `boomercounselor.com`
- **Current registrar:** GoDaddy (DK's account).
- **WHOIS dates (informational):** Created `2026-04-17`, expires `2027-04-17`.
- **Decision:** the domain is being **sunset**, not transferred. Going forward, Boomer Counselor lives only as a section of Aiyyo. The domain stays alive as a pure 301 redirect for ~11 months (bookmark + SEO drainage to Aiyyo), then expires naturally.
- **Action today (2 mins):**
  - Replace `_redirects` content with: `/*  https://aiyyo-conference.web.app/boomer-counselor/:splat  301`
  - Commit, push. Cloudflare Pages auto-deploys the redirect in ~30s.
- **Action +1 day:** turn off GoDaddy auto-renew. Domain expires `2027-04-17` and goes dark naturally.
- **Cloudflare Pages project:** stays at DK's account. Only serves the redirect now. No transfer needed; auto-orphans when the domain dies.
- **Hub-side cleanup that can wait:** `index.html`, `terms.html`, `privacy.html`, etc. still contain `boomercounselor.com` strings + the `contact@boomercounselor.com` email. Not urgent (those pages now serve a 301 anyway), but worth a search/replace pass to `contact@aiyyo.in` + the Aiyyo URL before the domain dies in 2027. Tracked as a low-priority cleanup item — not a flip-day blocker.
- **OAuth Authorized JavaScript origins:** keep `boomercounselor.com` listed until the domain expires (so existing in-flight sign-ins during the redirect window still work), then remove it.

## 9. GitHub

- **Repo:** `DKNMSQUAD/boomer-counselor`
- **Default branch:** `main`
- **Active branches at audit time:** `main` only.
- **CI workflows:** **none.** No `.github/workflows/` directory. Cloudflare Pages handles all CI.
- **Embedded PAT in remote URL:** *removed* this session (2026-05-12). Remote is now plain HTTPS, auth via `gh` credential helper.
- **Aiyyo action:** Settings → Transfer ownership → target Aiyyo's GitHub org. Full history, all tags, all PRs preserved.

## 10. Capacitor (full hub, bundled offline as native app)

- **iOS / Android bundle ID:** `com.boomercounselor.app` (renamed Apr 2026 from `com.boomercounselor.collegesearch`)
- **Display name:** `Boomer Counselor`
- **Web dir:** `../../dist-native` (assembled from hub + every tool's dist by repo-root `build-native.sh`).
- **Config:** `apps/college-search/capacitor.config.json` (historical location; Capacitor still lives in the College Search subfolder).
- **Shape:** the native build is the **full hub**, not a single tool. Every sub-app ships offline.

## 11. Apple Developer + Google Play — DORMANT (Aiyyo decision)

- **Status:** dormant. Mobile builds are **not transferred**.
- **Reasoning:** Apple Dev / Play account transfers are heavy (Apple ~1 week verification both sides, requires receiving Apple Developer org at $99/yr; Google Play $25 one-time + similar verification). Mobile is not Aiyyo's priority right now.
- **Action today:** none. Document the bundle ID (`com.boomercounselor.app`) and Play package name (same) only. The web build moves; mobile stays parked.
- **When Aiyyo decides to ship mobile (could be never):** Aiyyo provisions new Apple Developer + Play accounts under `contact@aiyyo.in`, re-issues certs/profiles, re-submits as a new app under Aiyyo's org. Capacitor configs in the repo will be updated to the new bundle IDs at that time.
- **Current live store status:** unknown to repo. Best-effort guess: never shipped (only the web build is live).

## 12. Public, no-account services (informational)

These have no account, key, or owner. Listed for completeness:

- **geojs.io** — IP geolocation, `https://get.geojs.io/v1/ip/geo.json`, no API key. `index.html:877`.
- **ipapi.co** — fallback geo, CORS-blocked in production, dead code. `index.html:895`.
- **Google Fonts** — `fonts.googleapis.com`, public CDN. `index.html:13-15`.
- **Google Identity Services script** — `accounts.google.com/gsi/client`, public CDN.

## 13. Decommissioned

- **Netlify** — removed 21 Apr 2026. `netlify.toml` still in repo but unused; can be deleted post-handover.
- **Razorpay** — removed earlier. No keys, no integration.
- **Stripe** — never integrated. "Premium" pills in the hub dropdown are pure UI.

---

## Today's actions (15 mins, no ceremony)

- [ ] 5 Google Sheets → Share → Owner = `contact@aiyyo.in` (RAW analytics, friendly analytics, Profile Builder, College Search, Tutor/Counselor)
- [ ] Apps Script project → Share → Owner = `contact@aiyyo.in`. **Deployment ID preserved** (`AKfycby...9ni6Gu4j`) so the `/exec` URL stays stable.
- [ ] Google Cloud OAuth project → add `contact@aiyyo.in` as Owner + add `aiyyo-conference.web.app` to Authorized JavaScript origins
- [ ] GitHub repo `DKNMSQUAD/boomer-counselor` → Settings → Transfer ownership → Aiyyo's org
- [ ] `_redirects` updated to `/* → aiyyo-conference.web.app/boomer-counselor/:splat 301`, committed, pushed

## After domain expires (2027-04-17) — low priority cleanup

- [ ] Remove `boomercounselor.com` and `www.boomercounselor.com` from OAuth Authorized JavaScript origins
- [ ] Search/replace `boomercounselor.com` and `contact@boomercounselor.com` strings out of `index.html`, `terms.html`, `privacy.html`, etc. (these still 301 during the wind-down, so non-urgent)
- [ ] DK turns off GoDaddy auto-renew so the domain expires cleanly
- [ ] Cloudflare Pages project auto-orphans when domain dies; DK can delete it whenever

**No key rotation needed post-handover** because there are no API keys to rotate. The OAuth client is public; Apps Script deployment ID is intentionally stable; sheet IDs are read paths.
