# Boomer Counselor — Runbook

How to operate the site post-handover. Covers deploys, redeploys, rotations, and additions.

---

## 1. Deploy hub change (HTML/CSS/JS, no build)

```
cd ~/boomer-counselor
# edit index.html (or listing.html / terms.html / privacy.html)
git add -A
git commit -m "feat: <what changed>"
git push origin main
```

Cloudflare Pages auto-deploys in 30-60s. Verify at https://boomercounselor.com.

If Aiyyo moves hosting to Firebase Hosting:
```
~/.npm-global/bin/firebase deploy --only hosting
```
(per the OTG-26 pattern; replace `firebase` with the absolute path if not on PATH).

## 2. Deploy a sub-app change (Vite-built)

```
cd ~/boomer-counselor/apps/<careers|profile|college-search|tutor-counselor|essay-feedback>
npm install                     # only if dependencies changed
npm run build                   # NOT strictly needed locally — CF Pages builds on push,
                                # but useful for local verify before pushing
cd ../..
git add -A
git commit -m "feat(<app>): <what changed>"
git push origin main
```

CF Pages picks up the push, runs `build-all.sh` which rebuilds every sub-app's `dist/`, deploys.

## 3. Redeploy Apps Script (analytics + sign-in backend)

The `/exec` deployment URL is pinned in `index.html`. Never create a new deployment — always **redeploy the same deployment ID**, so the URL stays stable.

```
# clasp is at ~/.npm-global/bin/clasp (not on PATH by default)
TMPDIR=$(mktemp -d)
cd "$TMPDIR"
cat > .clasp.json <<EOF
{"scriptId":"16IgPxqH1NZ4cciuvwVSPpBFj7INKxkcB5EI4G9A8Jm5LU-MUbMJ2J3Av","rootDir":"."}
EOF
cp ~/boomer-counselor/apps-script.gs Code.js
~/.npm-global/bin/clasp push -f
~/.npm-global/bin/clasp deploy -i AKfycbyGquSlw0PqDyyn3HzUAKovwOxz3bw1iBIUtIxjMFYkCp_xSz58vP3E7LLX9ni6Gu4j -d "v3.x: <what changed>"
```

Auth: `~/.clasprc.json` must exist on the machine running clasp (DK's laptop today; Aiyyo gets this after `clasp login` as contact@aiyyo.in once ownership is transferred).

Verify:
```
curl -sL "https://script.google.com/macros/s/AKfycbyGquSlw0PqDyyn3HzUAKovwOxz3bw1iBIUtIxjMFYkCp_xSz58vP3E7LLX9ni6Gu4j/exec"
# expect: {"status":"ok","message":"Boomer Counselor backend v3.x alive..."}
```

## 4. Rotate Google OAuth client

Public web clients have no secret, so rotation is rarely needed. To **replace** the client (e.g. handover-day cleanup):

1. Google Cloud Console → Credentials → Create new OAuth 2.0 Client ID (Web application).
2. Authorized JS origins: all domains the hub will live on.
3. Copy new Client ID.
4. Edit `index.html` line 24, replace `GOOGLE_CLIENT_ID` value, commit, push.
5. After verifying live, delete the old client ID in GCP.

## 5. Add a new tool to the dropdown

1. Add a new entry to the `options` array in `index.html` (around line 549). Set `url: '/<name>/'` and either `premium: true` (locked) or omit `premium` (live).
2. **Also** add a matching entry to the `tools` array in the `bc-switch-tool` postMessage handler (around line 925) so tool-to-tool switching works.
3. Add a rewrite to `_redirects`: `/<name>/* /apps/<name>/dist/:splat 200`
4. Create `apps/<name>/` with a Vite (or framework-free) app whose `base` in `vite.config.js` matches `/<name>/`.
5. Add the build step to `build-all.sh` if you use a custom command (most sub-apps just need `npm install && npm run build`).
6. Add `apps/<name>/dist/` is already covered by the existing `.gitignore` glob `apps/*/dist/`.
7. Push. CF Pages rebuilds.

## 6. Lock / unlock an existing tool

Edit the `options` array in `index.html`:
- To **lock**: add `premium: true` to the entry. Click becomes a no-op, badge shows "Premium".
- To **unlock**: remove `premium: true`. Badge shows "Ready", click selects + iframe-loads.

The same `premium` flag should be considered in the `bc-switch-tool` handler if you want to block tool-to-tool switching to a locked tool (current handler does not check `premium`; tool-to-tool switching bypasses the gate — not currently exploited because all sub-apps are mounted, but worth tightening if locked tools should be inaccessible).

## 7. Swap a data source sheet

Each tool reads its data from a hardcoded Google Sheet ID. To swap a source (e.g. point College Search at a new sheet under Aiyyo's account):

1. Open the relevant hook file:
   - College Search: `apps/college-search/src/hooks/useGoogleSheet.js` — const `SHEET_ID`
   - Profile Builder: `apps/profile/src/hooks/useSheetData.js` — const `SHEET_ID`
   - Tutor/Counselor: `apps/tutor-counselor/src/hooks/useSheetData.js` — const `SHEET_ID`
2. Replace the ID. Confirm the new sheet is **published to web** (File → Share → Publish to web → CSV) so the `?format=csv` / `gviz` read path works without auth.
3. Commit + push. CF Pages rebuilds.

**No Firebase, no API keys.** All tool data flows through public CSV reads of Google Sheets.

## 8. Build mobile native (College Search)

```
cd ~/boomer-counselor
./build-native.sh                 # assembles dist-native/
cd apps/college-search
npx cap sync                      # syncs web → iOS/Android projects
npx cap open ios                  # opens Xcode
npx cap open android              # opens Android Studio
```

App Store + Play Store handover is out-of-band — see `HANDOVER_EXTERNALS.md` §11.

## 9. Check live status (smoke test)

```
# Hub
curl -sI https://boomercounselor.com | head -1                    # → 200
# College Search
curl -sI https://boomercounselor.com/college-search/ | head -1     # → 200
# Apps Script backend
curl -sL "https://script.google.com/macros/s/AKfycbyGquSlw0PqDyyn3HzUAKovwOxz3bw1iBIUtIxjMFYkCp_xSz58vP3E7LLX9ni6Gu4j/exec"
# → {"status":"ok",...}
# Note: POST from curl returns a Drive "Page not found" page because Apps Script
# 302-redirects POSTs and curl doesn't re-POST on redirect. Browser POSTs work.
```

## 10. Common pitfalls

- **Old version showing after deploy:** CF Pages cached. Hard-refresh, or check the Deployments tab in CF dashboard.
- **Sign-in fails on preview URL:** OAuth origins missing the subdomain. Add it in GCP → OAuth client → Authorized JavaScript origins.
- **CORS error on geo fetch:** `ipapi.co` is CORS-blocked from `boomercounselor.com` — that's expected; `geojs.io` is the primary.
- **iframe 404 inside the hub:** `vite.config.js` `base` out of sync with `_redirects` for that sub-app.
- **Apps Script analytics gap:** check the `/exec` URL hasn't changed (i.e. someone created a new deployment instead of redeploying). Compare to the URL in `index.html:25`.
