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

## 5. Firebase — College Search

- **Purpose:** Auth + Firestore + storage for the College Search sub-app.
- **Project ID:** *not in repo; lives in `apps/college-search/.env*` files on DK's laptop and in Cloudflare Pages build-time env vars.* DK to fill in flip-day.
- **Config var names (in `apps/college-search/.env.example`):** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
- **Razorpay state:** *Removed.* College Search previously had Razorpay payments; per `CLAUDE.md §6`, reports are now free. Confirmed: no Razorpay keys in repo. No Stripe either. No active payment integration.
- **Owner:** `dknmsquad@gmail.com`.
- **Aiyyo action on flip-day:**
  1. Add `contact@aiyyo.in` as **Owner** in Firebase Console → Project Settings → Users and permissions.
  2. Export Firestore snapshot: `firebase firestore:export gs://<bucket>` from the project — kept as recovery point.
  3. Export Firebase Auth users via Admin SDK or `firebase auth:export users.json`.
  4. Update Cloudflare Pages env vars (boomer-counselor project → Settings → Environment variables) under the new owner's config, if Aiyyo decides to leave Cloudflare hosting for College Search. *Or* rebuild against a new Aiyyo Firebase project — Aiyyo's call.

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

## 8. Domain — DECOMMISSIONED (DK decision 2026-05-12)

- **Domain:** `boomercounselor.com`
- **Current registrar:** GoDaddy (DK's account).
- **WHOIS dates (informational):** Created `2026-04-17`, expires `2027-04-17`.
- **Decision:** **the domain will be deleted, not transferred.** Boomer Counselor goes forward exclusively as a section of Aiyyo (`aiyyo.in/boomer-counselor` or `aiyyo-conference.web.app/boomer-counselor`). The standalone `boomercounselor.com` URL is being retired.
- **Implications:**
  - **No registrar transfer.** No Cloudflare Registrar move.
  - **No 301 redirect.** Inbound links to `boomercounselor.com/<anything>` will die when the domain is decommissioned. SEO equity built up since April 2026 is sacrificed.
  - **No DNS handoff.** Cloudflare zone for `boomercounselor.com` can be deleted alongside the domain.
- **Flip-day action:** none on the domain. Just stop pointing anything at it.
- **Post-handover (DK):**
  1. Cloudflare → zones → delete `boomercounselor.com` zone.
  2. GoDaddy → domain settings → turn off auto-renew. Domain expires on `2027-04-17`. Optionally request immediate cancellation/release if GoDaddy supports it (most don't; auto-renew-off is the practical lever).
  3. Once expired, the domain goes back to the registry — anyone can register it, but it's no longer in DK's path.
- **Hub-side cleanup before flip-day:**
  - Google OAuth client → remove `boomercounselor.com` and `www.boomercounselor.com` from Authorized JavaScript origins; keep only Aiyyo's origins.
  - `index.html`, `terms.html`, `privacy.html`, `listing.html`, `STORE.md`, `README.md`, `DEPLOY.md` → search/replace any `boomercounselor.com` references with the Aiyyo URL. Email address `contact@boomercounselor.com` → swap to `contact@aiyyo.in` everywhere.
  - Apps Script `apps-script.gs` → search for any hardcoded references to `boomercounselor.com`; replace.

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

## Handover checklist (one ticked = one console flipped)

- [ ] Google Cloud OAuth project → Owner = contact@aiyyo.in + new Authorized origins
- [ ] Apps Script project → Owner = contact@aiyyo.in (deployment ID preserved)
- [ ] RAW sheet → Owner = contact@aiyyo.in
- [ ] ANALYTICS sheet → Owner = contact@aiyyo.in
- [ ] Firebase (College Search) → Owner = contact@aiyyo.in + Firestore + Auth export taken
- [ ] Cloudflare account → contact@aiyyo.in added as Admin
- [ ] Cloudflare Pages project → ownership flipped or 301-redirect rule installed
- [ ] Cloudflare zone for `boomercounselor.com` deleted
- [ ] GoDaddy auto-renew turned OFF (domain expires 2027-04-17 and is then released)
- [ ] All `boomercounselor.com` strings stripped from repo (HTML, Apps Script, docs) and replaced with Aiyyo URL
- [ ] `boomercounselor.com` removed from Google OAuth Authorized JavaScript origins
- [ ] GitHub repo → transferred to Aiyyo org
- [ ] (if applicable) Apple Developer + Google Play → manual migration

After flip-day, Aiyyo rotates every key within 7 days, then DK's email is removed from every console.
