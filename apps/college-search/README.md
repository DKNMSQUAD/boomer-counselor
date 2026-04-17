# NM Squad — College Command Centre

Editorial newspaper-style React dashboard for college research,
with PDF report previews and a Razorpay paywall.

## Stack
- React + Vite
- Firebase (Firestore + Auth structure ready)
- Razorpay Checkout (loaded dynamically, INR payments)
- IBM Plex Mono + Playfair Display (newspaper aesthetic)

## Quick Start

```bash
# 1. Install
npm install

# 2. Copy env file and fill in keys
cp .env.example .env

# 3. Run dev server
npm run dev
```

Open http://localhost:5173

## Demo Mode (no keys needed)
- College data is hardcoded in src/data/colleges.js
- Purchases persist in localStorage

## Adding Real Keys

### Razorpay
1. Create account at razorpay.com
2. Backend must expose `/api/create-order` and `/api/verify-payment` routes
3. Front-end loads checkout.razorpay.com script dynamically — no env key needed on the client

### Firebase
1. Create project at console.firebase.google.com
2. Add web app, copy config values
3. Fill VITE_FIREBASE_* in .env

## Project Structure

```
src/
  components/
    Masthead.jsx       Header with stats bar
    FiltersBar.jsx     Search + filter pills
    CollegeGrid.jsx    Card grid layout
    CollegeCard.jsx    Individual college card
    ReportModal.jsx    PDF preview modal
    PaywallModal.jsx   Razorpay payment modal
  data/
    colleges.js        Hardcoded college dataset (6 colleges)
  firebase/
    config.js          Firebase init (uses env vars)
  hooks/
    usePurchases.js    Purchase state (localStorage backed)
  App.jsx
  main.jsx
  index.css
```

## Adding Colleges
Edit src/data/colleges.js. Each entry needs:
id, name, shortName, region, location, size, majors[],
chance (Reach/Moderate/Safe), reportPreviewUrl, reportFullUrl,
description, acceptanceRate, price (in USD).

## Version
v1.0 - NM Squad Intelligence Desk - Demo Build
