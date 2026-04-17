# NM Squad College Search — Health Check

Paste everything below this line into Claude Code or Cowork to run the health check.

---

You are running an automated health check for the NM Squad College Search app. Run ALL checks below silently and give me ONLY the final report table. Do not explain steps — just run and report.

## CREDENTIALS (read-only, do not modify)
- Site: https://collegesearch.neerajmandhana.com
- Netlify site ID: 8a8b37ed-ed17-4440-857a-591b08590bf3
- Netlify token: nfp_a4nA3GWGYZxj4z1ddvmGarGw7Mi9xgki82af
- Netlify account: mandhana-neeraj
- Google Sheet ID: 1Pb7Uin9Oc1omLM2kXhdisZuqV84PCMqdhRlQjNBSYlc
- Project folder: /Users/moneymakingmachine/Library/CloudStorage/GoogleDrive-dknmsquad@gmail.com/My Drive/Claude Projects/NM Squad College Search/nm-squad-college-command-centre

## CHECKS

### 1. Live Site
curl -s -o /dev/null -w "%{http_code}" https://collegesearch.neerajmandhana.com — expect 200

### 2. Netlify CDN
curl -s -o /dev/null -w "%{http_code}" https://collegesearchnm.netlify.app — expect 200

### 3. Page Title
Fetch site and grep for "College Search by NM Squad" — expect found

### 4. create-order Function
POST to /.netlify/functions/create-order with test payload — expect orderId in response

### 5. proxy-pdf Function
GET /.netlify/functions/proxy-pdf?url=https://www.google.com — expect 200

### 6. Google Sheet Data
Fetch CSV export — expect more than 5 rows

### 7. Netlify Env Vars
Check all required keys present: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, GMAIL_USER, GMAIL_APP_PASSWORD, GOOGLE_SHEET_ID

### 8. DNS Resolution
nslookup collegesearch.neerajmandhana.com 8.8.8.8 — expect resolves to Netlify

### 9. SSL Certificate
curl -I https://collegesearch.neerajmandhana.com — expect no SSL error

### 10. PWA Manifest
Fetch /manifest.json — expect valid JSON with name and icons

### 11. Service Worker
GET /sw.js — expect 200

### 12. GitHub Sync
git fetch origin && git status — expect up to date with origin/main

### 13. Local Build
npm run build — expect zero errors

### 14. Last Deploy
Netlify API last deploy state — expect ready

---

## REPORT FORMAT

==============================================
NM SQUAD COLLEGE SEARCH — HEALTH CHECK REPORT
Date/Time: [DATE AND TIME IST]
==============================================

OVERALL: ALL SYSTEMS GO / WARNING / CRITICAL FAILURE

| # | Check                  | Result | Notes |
|---|------------------------|--------|-------|
| 1 | Live Site              | ok/fail |      |
| 2 | Netlify CDN Backup     | ok/fail |      |
| 3 | Page Title             | ok/fail |      |
| 4 | create-order Function  | ok/fail |      |
| 5 | proxy-pdf Function     | ok/fail |      |
| 6 | Google Sheet Data      | ok/fail |      |
| 7 | Env Vars Complete      | ok/fail |      |
| 8 | DNS Resolution         | ok/fail |      |
| 9 | SSL Certificate        | ok/fail |      |
|10 | PWA Manifest           | ok/fail |      |
|11 | Service Worker         | ok/fail |      |
|12 | GitHub In Sync         | ok/fail |      |
|13 | Local Build            | ok/fail |      |
|14 | Last Deploy Status     | ok/fail |      |

ERRORS FOUND: [list or None]
ACTION NEEDED: [list or None]
==============================================
