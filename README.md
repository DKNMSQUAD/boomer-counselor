# boomer-counselor

Landing page for boomercounselor.com — the hub that brings together a growing set of AI college counselling tools.

## Stack

- Static HTML / CSS / JS (no framework, no build step)
- Google Identity Services (GIS) for Sign in with Google
- Google Apps Script + Google Sheets as the sign-in log backend
- Hosted on Netlify, auto-deploys on push

## Project structure

```
.
├── index.html        Main landing page
├── privacy.html      Privacy policy
├── terms.html        Terms of use
├── logo.png          Boomer Counselor logo
├── side.png          Hero illustration
├── apps-script.gs    Code to paste into your Google Apps Script
├── netlify.toml      Netlify config
└── README.md
```

## Configuration

Inside `index.html`, the top `<script>` block sets `window.BC_CONFIG`:

```js
window.BC_CONFIG = {
  GOOGLE_CLIENT_ID: "...apps.googleusercontent.com",
  SHEETS_WEBHOOK_URL: "https://script.google.com/macros/s/.../exec"
};
```

Both values are filled in after the one-time setup (see Deployment below).

## How the data flows

1. User lands on the page, picks a tool from the dropdown
2. Clicks `Sign in with Google`
3. Google returns the user's name, email, picture, Google ID
4. We POST that info plus the selected tool to the Apps Script webhook
5. Apps Script appends a row to the `Events` sheet and upserts the `Users` sheet
6. Page scrolls to the tool (embedded in an iframe), user continues

The Sheet ends up with two tabs:

- **Users** — one row per unique sign-in, with sessions count, tools used, last seen
- **Events** — every click logged, for funnel analysis

## Deployment

One-time setup lives in `DEPLOY.md`.

## Adding a new tool

Edit the `options` array near the bottom of `index.html`. Ready tools get a live URL, upcoming tools get `url: null` and show a "Coming soon" modal.
