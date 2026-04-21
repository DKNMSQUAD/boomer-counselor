# Boomer Counselor

Multi-tool AI college counselling hub at **boomercounselor.com**. DK builds and maintains this solo. Your job is to ship code directly: edit, commit, push, and let Cloudflare Pages auto-deploy. Do not hand back step-by-step instructions for DK to execute.

---

## 1. What this project is

A single-domain hub that serves a static landing page plus three independent React/Vite sub-apps under path prefixes:

-  Hub: Landing page, Google sign-in, dropdown that picks a tool. Static HTML/CSS/JS, no build step.
-  Career Discovery: Interest-based career exploration quiz. React 19 + Vite 8.
-  Profile Builder: Student profile generator. React 18 + Vite 5 (uses papaparse).
-  College Search: Paid tool with Razorpay, Firebase, Capacitor iOS/Android. React 19 + Vite 8 + Firebase + Capacitor.

Three more tools show as Coming soon in the hub dropdown (url: null in index.html).

## 2. Routing (Cloudflare Pages)

_redirects file rewrites /careers/* to /apps/careers/dist/:splat, /profile/* to /apps/profile/dist/:splat, /college-search/* to /apps/college-search/dist/:splat. Hub served from root. _headers file sets X-Frame-Options = SAMEORIGIN for iframe embedding. Each sub-app has base set in vite.config.js matching these paths.

## 3. Build and deploy

Hub: no build. Edit HTML, commit, push. Sub-apps: cd apps/<app> && npm install && npm run build, then git add -A && git commit && git push origin main. Cloudflare Pages auto-deploys in 30-60s. dist/ directories ARE committed to git. Never create a PR. Push directly to main.

## 4. Branding rules (IMPORTANT)

Originally built for NM Squad (Neeraj Mandhana). Rebranded to Boomer Counselor. Keep it clean:
- Logos: use logo.png (Boomer Counselor). No NM Squad branding anywhere.
- Strings: no NM Squad, Neeraj Mandhana, or By NM Squad in user-facing UI.
- Email: hello@boomercounselor.com (not reports.nmsquad@gmail.com).
- Razorpay merchant: Boomer Counselor.
- Footer: (c) 2026 Boomer Counselor.
- If you find an NM Squad reference, fix it immediately.

## 5. Masthead/iframe caveat

Hub embeds tools in iframes. Tools have their own mastheads. This causes double-branding. If touching top-of-page chrome, check both standalone and iframe views. Make tool masthead lighter when window.self !== window.top.

## 6. Backends

Hub sign-in: Google Sheets + Apps Script. BC_CONFIG in index.html has GOOGLE_CLIENT_ID and SHEETS_WEBHOOK_URL. IP geo from geojs.io (not ipapi.co, CORS-blocked). Analytics events debounced.

College Search: Firebase config reads VITE_FIREBASE_* env vars at build time. Razorpay has been removed (reports are free). No serverless functions needed.

## 7. Git and deploy infra

- GitHub: DKNMSQUAD/boomer-counselor (main branch)
- Local clone authenticated via embedded PAT. Just git push.
- Committer: DKNMSQUAD <dknmsquad@gmail.com>
- Cloudflare Pages: project "boomer-counselor", auto-deploys on push to main
- Preview URL: boomer-counselor.pages.dev
- Domain: boomercounselor.com + www (DNS on Cloudflare, free SSL, registered on GoDaddy)
- Cloudflare account: Dknmsquad@gmail.com (Free plan)
- Cloudflare nameservers: bradley.ns.cloudflare.com, nataly.ns.cloudflare.com
- Previous hosting (Netlify) has been removed as of Apr 21 2026

## 8. DK working style

- Act, do not ask. Edit files, commit, push end-to-end.
- Batch changes into one commit with clear message.
- Rebuild dist/ before committing any app change.
- Mobile-responsive is non-negotiable.
- Minimal formatting in chat. Short paragraphs. No em dashes.
- Never add emojis to JSX text content (renders as ? in this stack). Use CSS or SVG.
- DK is based in Mumbai (IST).

## 9. Common pitfalls

- Old version showing: forgot to rebuild and commit dist/.
- Sign-in fails on deploy preview: OAuth origins missing that subdomain. Add boomer-counselor.pages.dev and boomercounselor.com to Google Cloud Console > OAuth client > Authorized JavaScript origins.
- CORS on IP fetch: use geojs.io not ipapi.co.
- Mobile app build fails: run npx cap sync in apps/college-search.
- iframe 404: vite.config.js base out of sync with _redirects file.
- Cloudflare Pages 404: check _redirects file has correct rewrite rules.

## 10. Do NOT

- Add analytics beyond Google Sheets flow without asking DK.
- Introduce a framework for the hub. It is intentionally framework-free.
- Split the repo into multiple repos. Monorepo is deliberate.
- Rename or move apps/<tool>/dist/ paths.
- Commit .env or Firebase/Razorpay secrets.


## 11. Mac automation capabilities

You are running on DK's MacBook Air (Apple Silicon). You have FULL access to the Mac via shell commands. Use this power.

### osascript
You can run `osascript -e '...'` to control any Mac app. Examples:
- Open URLs: `open https://boomercounselor.com`
- Control Terminal: `osascript -e 'tell application "Terminal" to do script "..."'`
- Control Finder, browsers, any app
- Run AppleScript for any Mac automation

### Browser testing
To open and test the site: `open https://boomercounselor.com`
To open specific tools: `open https://boomercounselor.com/careers/`
You can open URLs directly. You cannot interact with browser UI (click buttons, fill forms), but you can open pages for DK to see.

### System commands
You have full shell access. You can:
- Run any bash command
- Install packages via npm/pip/brew
- Access the filesystem
- Run git operations
- Start dev servers
- Run builds
- Kill processes
- Check logs
- Anything DK asks

### What you actually cannot do
- You cannot see the screen or take screenshots
- You cannot click UI elements in apps
- You cannot type into GUI windows
- You cannot do OAuth flows (DK handles those)
- If DK asks you to do something that needs visual interaction, open the relevant URL/app and tell DK what to do in that window

### Default behavior
When DK says "test it" or "check the site", open the URL in the browser so DK can see it. Do not say you cannot access websites.

## 12. Analytics system (v3.1, deployed Apr 18 2026)

Every user action writes to TWO Google Sheets in real time:

### RAW sheet (Boomer Counselor Users)
- Sheet ID: 1oCj_MVwTsYkS1HXNKwMZcsSaRCWXdCOQO3qW-yaqLq0
- Users tab: one row per unique user (25 cols, keyed on google_id)
- Events tab: one row per event (30 cols, full detail)

### ANALYTICS sheet (Boomer Counselor Analytics)
- Sheet ID: 1eyuxEbFsiEBgO9EjiCnbBGy1fpIK2uHws6FEW01iZuk
- Users Overview: one row per user (First/Last seen, Name, Email, Picture, City, Region, Country, IP, Total events, Tools used, Last active tool)
- Career Discovery: one row per tool-use session (Timestamp, Session ID, Name, Email, City, Country, Final traits selected, Matched careers with % scores)
- Profile Builder: one row per tool-use session (Timestamp, Session ID, Name, Email, City, Country, I am, I am interested in, I am looking for, Location preference, Programs clicked)
- College Search: one row per tool-use session (Timestamp, Session ID, Name, Email, City, Country, Filters used, Colleges shortlisted, Reports viewed, Reports purchased)

### Apps Script (v3.1, Version 5)
- Project: https://script.google.com/home/projects/16IgPxqH1NZ4cciuvwVSPpBFj7INKxkcB5EI4G9A8Jm5LU-MUbMJ2J3Av/edit
- Webhook: https://script.google.com/macros/s/AKfycbyGquSlw0PqDyyn3HzUAKovwOxz3bw1iBIUtIxjMFYkCp_xSz58vP3E7LLX9ni6Gu4j/exec
- Owner: dknmsquad@gmail.com
- LockService.getScriptLock wraps doPost to prevent race conditions
- Session gap rule: new row only when tool_open AND last event >= 5 min ago
- 25 careers with trait arrays embedded for server-side match computation
- TRAIT_LABEL_TO_ID map converts labels to IDs
- PROFILE_GROUPS constant auto-buckets criteria into 4 categories

### Event flow
1. Tool app calls emitEvent(name, payload) via bcEvents.js -> postMessage to hub
2. Hub logEvent() awaits locationPromise (geojs.io, 2s timeout)
3. Hub POSTs JSON to Apps Script webhook
4. Apps Script writes to both RAW and ANALYTICS sheets under LockService lock

### Event format per tool
- Career Discovery: debounced 1.5s, sends extraData.selected_traits (full label array). Apps Script computes career matches server-side.
- Profile Builder: debounced 1.5s, sends extraData.selected_criteria (full label array). Apps Script auto-buckets into iAm/interested/looking/location groups. link_click events append program names.
- College Search: debounced 1.5s, sends extraData.filters_by_category (object). Shortlist add/remove maintained as running list. Report views and purchases appended.

### To redeploy Apps Script
1. Edit apps-script.gs in repo
2. Open Apps Script editor in browser
3. Inject via Monaco API: monaco.editor.getEditors()[0].setValue(code)
4. Cmd+S to save
5. Deploy > Manage deployments > pencil > New version > Deploy
