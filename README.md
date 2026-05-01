# CJ Lead Tracker

Live lead tracker with Typeform webhook integration.

## Deploy in 15 minutes — no coding needed

### Step 1: Push this folder to GitHub

In Claude Code, paste this (one at a time, hit Enter after each):

```
git init
git add .
git commit -m "CJ Lead Tracker"
gh repo create cj-lead-tracker --public --push --source=.
```

If it asks you to log in to GitHub, follow the prompts.

---

### Step 2: Deploy to Railway

1. Go to **railway.app** and click **Sign Up** → sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select **cj-lead-tracker**
4. Railway will detect it's a Node app and deploy automatically
5. Click **Settings** → **Networking** → **Generate Domain**
6. Copy that URL — it'll look like `https://cj-lead-tracker-production.up.railway.app`

---

### Step 3: Seed your existing leads

In Claude Code, paste this (replace YOUR_URL with the Railway URL from Step 2):

```
curl -X POST https://YOUR_URL/api/seed
```

This loads all your existing leads into the live app.

---

### Step 4: Connect Typeform

1. Go to your Typeform → **Connect** tab → **Webhooks**
2. Click **Add a webhook**
3. Paste: `https://YOUR_URL/webhook`
4. Click **Save** and then **Send test request**
5. Done — every new application now appears in your tracker automatically

---

## Your tracker URL

Bookmark `https://YOUR_URL` — open it on any device, any browser.
New leads show up with a green **NEW** badge and a toast notification.
Closes and notes sync to the server instantly.
