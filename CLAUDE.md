# Boomer Counselor

Multi-tool AI college counselling hub at **boomercounselor.com**. DK builds and maintains this solo. Your job is to ship code directly: edit, commit, push, and let Netlify auto-deploy. Do not hand back step-by-step instructions for DK to execute.

---

## 1. What this project is

A single-domain hub that serves a static landing page plus three independent React/Vite sub-apps under path prefixes:

-  Hub: Landing page, Google sign-in, dropdown that picks a tool. Static HTML/CSS/JS, no build step.
-  Career Discovery: Interest-based career exploration quiz. React 19 + Vite 8.
-  Profile Builder: Student profile generator. React 18 + Vite 5 (uses papaparse).
-  College Search: Paid tool with Razorpay, Firebase, Capacitor iOS/Android. React 19 + Vite 8 + Firebase + Capacitor.

Three more tools show as Coming soon in the hub dropdown (url: null in index.html).

## 2. Routing (Netlify rewrites)

netlify.toml rewrites /careers/* to /apps/careers/dist/:splat, /profile/* to /apps/profile/dist/:splat, /college-search/* to /apps/college-search/dist/:splat. Hub served from root (publish = .). X-Frame-Options = SAMEORIGIN for iframe embedding. Each sub-app has base set in vite.config.js matching these paths.

## 3. Build and deploy

Hub: no build. Edit HTML, commit, push. Sub-apps: cd apps/<app> && npm install && npm run build, then git add -A && git commit && git push origin main. Netlify auto-deploys in 60-90s. dist/ directories ARE committed to git. Never create a PR. Push directly to main.

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

College Search: Firebase config reads VITE_FIREBASE_* env vars at build time (set in Netlify env, not committed). Razorpay: create-order.js, verify-payment.js in netlify/functions/. PaywallModal.jsx + usePurchases.js for purchase state.

## 7. Git and deploy infra

- GitHub: DKNMSQUAD/boomer-counselor (main branch)
- Local clone authenticated via embedded PAT. Just git push.
- Committer: DKNMSQUAD <dknmsquad@gmail.com>
- Netlify: mandhana-neeraj account, auto-deploys on push to main
- Domain: boomercounselor.com + www (SSL via Netlify, DNS on GoDaddy)

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
- Sign-in fails on deploy preview: OAuth origins missing that subdomain.
- CORS on IP fetch: use geojs.io not ipapi.co.
- Razorpay fails: check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars on Netlify.
- Mobile app build fails: run npx cap sync in apps/college-search.
- iframe 404: vite.config.js base out of sync with netlify.toml.

## 10. Do NOT

- Add analytics beyond Google Sheets flow without asking DK.
- Introduce a framework for the hub. It is intentionally framework-free.
- Split the repo into multiple repos. Monorepo is deliberate.
- Rename or move apps/<tool>/dist/ paths.
- Commit .env or Firebase/Razorpay secrets.
