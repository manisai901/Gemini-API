# Firebase & Deployment Guide 🚀

This guide explains how to deploy your app for free and connect your Firebase project.

## Option 1: AI Studio Built-In Deployment (Recommended)
The easiest way to share your app is using the **"Share"** button in AI Studio.
- Click **Share** at the top right.
- This creates a live link instantly hosted on Cloud Run.
- **Cost:** 100% Free for builds in AI Studio.

---

## Option 2: Manual Firebase Hosting (Static Frontend)
Firebase Hosting is great for the user interface. Note that the **AI backend** (Gemini) requires a server environment like Firebase Functions or Cloud Run.

### Step 1: Initialize Firebase
1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Run `set_up_firebase` in this terminal (if not already done) to link your project.
3. Install Firebase CLI locally: `npm install -g firebase-tools`.

### Step 2: Configure Hosting
1. Login: `firebase login`.
2. Initialize: `firebase init hosting`.
   - Select your project.
   - Set **public directory** to `dist`.
   - Configure as a **single-page app**: Yes.
   - Set up automatic builds and deploys with GitHub: Personal choice.

### Step 3: Build and Deploy
1. Build the app: `npm run build`.
2. Deploy: `firebase deploy --only hosting`.

---

## Option 3: Full-Stack Deployment (Frontend + Gemini Backend)
Since your app uses an Express server (`server.ts`) for Gemini API calls, you need to deploy the server logic.

### Using Google Cloud Run (Free Tier available)
1. Install [Google Cloud CLI](https://cloud.google.com/sdk/docs/install).
2. Connect to your project: `gcloud init`.
3. Deploy: `gcloud run deploy --source .`.
   - Select a region.
   - Allow unauthenticated invitations: Yes.

---

## 🔑 Important: Connecting Firebase to your Live App
Once your app is live, you must tell it which Firebase project to use:
1. Ensure `firebase-applet-config.json` is present in your project root.
2. In your Firebase Console, go to **Project Settings > General** and scroll down to your **Web App** to find your config.
3. Update the `firebase-applet-config.json` with your real keys.

### Security Rules
Don't forget to deploy your Firestore rules to your live project:
```bash
firebase deploy --only firestore:rules
```
