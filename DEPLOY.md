# Deploy guide

This is the full one-time setup. Total time: ~8 minutes.

---

## Step 1: Google Sheet + Apps Script backend (3 min)

1. Go to https://sheets.google.com, click **Blank** to create a new sheet
2. Name it `Boomer Counselor Users`
3. `Extensions` > `Apps Script`
4. Delete the default `function myFunction() {}` stub, paste the full contents of `apps-script.gs` from this repo
5. Click the disk icon (Save)
6. Click **Deploy** > **New deployment**
7. Click the gear icon next to "Select type", pick **Web app**
8. Set:
   - Description: `Boomer Counselor backend`
   - Execute as: **Me**
   - Who has access: **Anyone**
9. Click **Deploy**, accept any permission prompts
10. Copy the **Web app URL** (ends in `/exec`), save it

---

## Step 2: Google OAuth Client ID (3 min)

1. Go to https://console.cloud.google.com
2. Top bar, create a new project called `Boomer Counselor`
3. Left menu > **APIs & Services** > **OAuth consent screen**
4. User type: **External**, click Create
5. Fill the form:
   - App name: `Boomer Counselor`
   - User support email: your email
   - Developer contact: your email
6. Click Save and Continue. Skip scopes and test users (just click through)
7. Left menu > **Credentials** > **Create Credentials** > **OAuth client ID**
8. Application type: **Web application**
9. Name: `Boomer Counselor Web`
10. Authorized JavaScript origins, click **Add URI**, add both:
    - `https://boomercounselor.com`
    - `https://www.boomercounselor.com`
    - `http://localhost:8080` (for local testing)
    - (later, after Netlify deploy) your Netlify subdomain like `https://boomer-counselor.netlify.app`
11. Click Create. Copy the **Client ID** (ends in `.apps.googleusercontent.com`)

---

## Step 3: Paste values into index.html

In `index.html`, near the top, find:

```js
window.BC_CONFIG = {
  GOOGLE_CLIENT_ID: "__GOOGLE_CLIENT_ID__",
  SHEETS_WEBHOOK_URL: "__SHEETS_WEBHOOK_URL__"
};
```

Replace `__GOOGLE_CLIENT_ID__` with the Client ID from Step 2.
Replace `__SHEETS_WEBHOOK_URL__` with the Web app URL from Step 1.

Commit and push.

---

## Step 4: Netlify deploy (2 min)

1. Go to https://app.netlify.com (log in as mandhana-neeraj)
2. **Add new site** > **Import an existing project**
3. **Deploy with GitHub**, authorise, pick the `boomer-counselor` repo
4. Branch: `main`, build command: (leave empty), publish directory: `.`
5. Click **Deploy**
6. After deploy, **Site configuration** > **Domain management** > **Add custom domain**
7. Add `boomercounselor.com` and `www.boomercounselor.com`

---

## Step 5: DNS in GoDaddy (1 min, propagation takes 5-60 min)

In GoDaddy DNS for boomercounselor.com:

| Type  | Name | Value                   | TTL  |
|-------|------|-------------------------|------|
| A     | @    | 75.2.60.5               | 600  |
| CNAME | www  | (your-site).netlify.app | 600  |

Netlify will auto-provision an SSL certificate once DNS resolves. Usually 10-30 min.

---

## Test it

Open boomercounselor.com. Pick a tool. Sign in with Google. You should:

1. See the Google consent screen
2. After approving, the page scrolls to the selected tool
3. A new row appears in your Google Sheet under both `Users` and `Events` tabs

If the Sheet stays empty, open browser DevTools > Console and check for errors. Most common cause: OAuth origin not added in Step 2.10.
