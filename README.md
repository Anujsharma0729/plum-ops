# Plum OPS — Intelligent Claims Processing Platform

Plum OPS is an enterprise-grade claims workbench built with React. It features AI-assisted claims processing, OPD enrollment, membership portal management, HITL (Human-in-the-Loop) adjudication, document previews, and terminal ingest logs — designed for group health insurance operations.

---

## Project Structure

```
plum-ops/
├── marketing.html        # 1️⃣  Marketing / landing page (standalone HTML — open first)
├── public/
│   ├── index.html        # React app entry point
│   └── app.html          # App shell HTML
├── src/
│   ├── App.js            # Main React application (Claims Workbench)
│   ├── App.css           # Global styles
│   └── index.js          # React root entry
├── package.json
└── README.md
```

---

## Prerequisites

Make sure you have the following installed before running the app:

- **Node.js** v18 or higher — [Download here](https://nodejs.org/)
- **npm** v9 or higher (comes bundled with Node.js)

To verify your versions:

```bash
node -v
npm -v
```

---

## How to Run the Application

The app has **two parts** that need to be opened/run in order:

### Step 1 — Open the Marketing Landing Page

The marketing page is a standalone HTML file and does **not** require any server or npm command.

1. Navigate to the project root folder.
2. Open `marketing.html` directly in your browser:
   - Double-click the file in your file explorer, **or**
   - Drag and drop it into a browser window, **or**
   - Right-click → *Open with* → your browser

> This page gives visitors an overview of the Plum OPS platform before they enter the app.

---

### Step 2 — Run the React App (Claims Workbench)

After viewing the marketing page, start the main React application:

**1. Clone the repository (if you haven't already)**

```bash
git clone https://github.com/your-username/plum-ops.git
cd plum-ops
```

**2. Install dependencies**

```bash
npm install
```

**3. Start the development server**

```bash
npm start
```

**4. Open the app in your browser**

The app will automatically open at:

```
http://localhost:3000
```

If it doesn't open automatically, navigate to that URL manually.

> The page hot-reloads whenever you make and save changes to the source files.

---

## Available npm Scripts

| Command | Description |
|---|---|
| `npm start` | Runs the app in development mode at `http://localhost:3000` |
| `npm test` | Launches the test runner in interactive watch mode |
| `npm run build` | Builds the app for production into the `build/` folder |
| `npm run eject` | Ejects from Create React App (irreversible — use with caution) |

---

## Key Features

- **Claims Processing** — Submit, review, and adjudicate OPD claims with AI-assisted extraction
- **Enrollment Management** — Handle member onboarding and policy enrollment
- **Membership Portal** — View member profiles, policy details, and coverage summaries
- **HITL Adjudication** — Human-in-the-loop review workflow for flagged claims
- **Terminal Ingest Logs** — Real-time log viewer for document ingestion pipeline
- **Document Preview** — Side-by-side document and extraction result pane
- **Reason Cards** — Structured display of claim approval/rejection reasoning
- **Sync Cards** — Status cards for data sync operations

---

## Tech Stack

- **React 19** with React Router v7
- **Create React App** (react-scripts 5)
- **Vanilla CSS** (no external UI library)

---

## Troubleshooting

**`npm install` fails**
- Make sure your Node.js version is 18 or higher.
- Try deleting `node_modules/` and `package-lock.json`, then run `npm install` again.

**Port 3000 is already in use**
- React will prompt you to use another port — press `Y` to accept, or kill the process using port 3000 first.

**Marketing page fonts not loading**
- The marketing page loads fonts from Google Fonts, so an internet connection is required for full styling.

---

## Deployment

To build a production-ready bundle:

```bash
npm run build
```

This outputs optimised, minified files into the `build/` folder, ready to be served from any static hosting provider (Vercel, Netlify, AWS S3, etc.).

---

## License

Private — All rights reserved. © Plum OPS
