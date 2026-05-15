# Mani AI - Full-Stack Production Assistant

A complete, production-ready AI application built with a modern tech stack. This project features a sophisticated AI chat interface, real-time analytics, and a professional SaaS-inspired UI.

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, Chart.js
- **Backend**: Node.js, Express, Gemini 3.1 Pro (via @google/genai)
- **Database/Auth**: Firebase Firestore, Firebase Authentication
- **Monitoring**: Morgan (logging), Helmet (security), Express Rate Limit

## ✨ Key Features

- **End-to-End AI Integration**: Securely calls Google Gemini API from the backend.
- **Dynamic Analytics**: Visualizes system usage and AI performance with Chart.js.
- **Professional SaaS UI**: Responsive sidebar, dark-mode-first aesthetic, and glassmorphism.
- **Rich AI Responses**: Markdown rendering, syntax highlighting for code, and copy-to-clipboard.
- **Secure Auth**: Support for Google and Email/Password authentication.
- **History Management**: Export chat histories and manage sessions.

## 🛠️ Getting Started

### 1. Prerequisites

- Node.js (v18+)
- Firebase Project
- Gemini API Key (from Google AI Studio)

### 2. Environment Variables & Config

1. Create a `.env` file in the root (see `.env.example`):
   ```env
   GEMINI_API_KEY=your_key_here
   ```

2. Create `firebase-applet-config.json` in the root (see `firebase-applet-config.json.example`):
   - Get these values from your Firebase Console (Project Settings > General > Your apps).
   - `firestoreDatabaseId` is typically `(default)` unless you created a named database.

### 3. Installation

```bash
npm install
```

### 4. Development

```bash
npm run dev
```

### 5. Build for Production

```bash
npm run build
```

## 📦 Deployment

### Frontend (Vercel)
1. Push to GitHub.
2. Link repository to Vercel.
3. Configure environment variables.
4. Set build command to `npm run build` and output directory to `dist`.

### Backend (Render)
1. Create a "Web Service" on Render.
2. Link repository.
3. Use `npm run start` as the start command.
4. Add your Gemini and Firebase secrets.

## 📄 License
SPDX-License-Identifier: Apache-2.0
