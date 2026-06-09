# Plum OPS — Intelligent Claims Processing Platform

Plum OPS is an enterprise-grade Group Health Insurance claims workbench built with React. It runs a 5-agent AI pipeline to automate OPD claim adjudication — document validation, data extraction, fraud scoring, policy eligibility checks, and final decision — with Human-in-the-Loop (HITL) overrides at every step.

**Now with Gemini 2.0 Flash integration** — real LLM reasoning on every reason card, with automatic key rotation and zero-disruption fallback.

---

## Project Structure

```
plum-ops/
├── marketing.html              # Standalone marketing/landing page (no server needed)
├── public/
│   ├── index.html              # React app entry point
│   └── app.html                # App shell HTML
├── src/
│   ├── App.js                  # Main React application — all UI + agent logic
│   ├── geminiService.js        # Gemini 2.0 Flash API client + key rotation
│   ├── promptConfig.js         # Editable prompts for each agent
│   ├── App.css                 # Global styles
│   └── index.js                # React root entry
├── .env                        # Your private API keys (gitignored — never commit)
├── .env.example                # Key template — safe to commit
├── package.json
└── README.md
```

---

## Prerequisites

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org/)
- **npm** v9 or higher (bundled with Node.js)
- **Gemini API keys** — free at [aistudio.google.com](https://aistudio.google.com) *(optional — app works without them)*

```bash
node -v   # should be v18+
npm -v    # should be v9+
```

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-username/plum-ops.git
cd plum-ops
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure API keys *(optional — app works fully without this)*

```bash
cp .env.example .env
```

Open `.env` and fill in your Gemini keys:

```env
REACT_APP_GEMINI_KEY_1=AIzaSy...your_first_key
REACT_APP_GEMINI_KEY_2=AIzaSy...your_second_key
REACT_APP_GEMINI_KEY_3=AIzaSy...your_third_key
```

> **No keys configured?** The app runs exactly as before — all agent decisions use the built-in rule engine. AI enrichment on reason cards is silently skipped.

### 4. Start the app

```bash
npm start
```

Opens at `http://localhost:3000`

---

## Gemini AI Integration

### What it does
After each agent run, Gemini 2.0 Flash generates enriched plain-English narratives that appear **below** the existing reason card text. The original rule-engine output is always shown first and never replaced.

| Agent | When Gemini fires | What it generates |
|-------|-------------------|-------------------|
| Agent 1 — Ingest | Document issues detected | Empathetic explanation for ops + member |
| Agent 2 — Extraction | Low-confidence extraction | Document quality analysis + recommended action |
| Agent 3 — Risk & Integrity | Every non-skipped claim | Fraud narrative with signal rationale |
| Agent 4 — Policy Engine | Every non-skipped claim | Policy decision explanation with rule citations |
| Agent 5 — Adjudication | Final decisions | Full EOB (Explanation of Benefits) narrative |

### Fallback behaviour — guaranteed

The fallback is structural, not a try/catch afterthought:

1. `callGemini()` returns `null` on any failure (network error, rate limit, invalid key, all keys exhausted)
2. `enrichWithGemini()` stores `null` for that claim+agent key
3. In the UI: `{geminiTexts?.[claimId]?.agent3 && <div>AI text</div>}` — `null` is falsy, so the AI section renders nothing
4. The original `<div className="reason-card-body">` is rendered unconditionally and always shows

**Result:** With no keys, wrong keys, or all keys rate-limited — every screen looks exactly like the pre-Gemini version. No errors, no blank cards, no broken UI.

### Key rotation

Three keys rotate automatically. Each failed key is tracked; after 3 failures it is skipped. When all keys are exhausted for a claim, `null` is returned and the fallback activates.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Development mode at `http://localhost:3000` |
| `npm test` | Test runner in watch mode |
| `npm run build` | Production build into `build/` folder |

---

## Editing Prompts

Go to **Settings → Prompt Configuration** in the sidebar to see and edit the prompt each agent sends to Gemini. Changes take effect immediately on the next agent run. You can reset any prompt to the default at any time.

---

## Deployment

```bash
npm run build
```

Deploy the `build/` folder to any static host: **Vercel, Netlify, AWS S3, Railway**, etc.

> ⚠️ Set your `REACT_APP_GEMINI_KEY_*` environment variables in your hosting provider's dashboard — do **not** commit `.env` to git.

---

## Tech Stack

- **React 19** with React Router v7
- **Create React App** (react-scripts 5)
- **Gemini 2.0 Flash** via REST API (`generativelanguage.googleapis.com`)
- **Vanilla CSS** — no external UI library

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm install` fails | Ensure Node.js ≥ 18. Delete `node_modules/` and `package-lock.json`, re-run `npm install` |
| Port 3000 in use | Press `Y` when prompted to use another port |
| Gemini not working | Check `.env` keys are set and do not contain placeholder values. Visit Settings to see key status |
| AI badge not appearing | No keys configured, or all keys rate-limited — rule-engine fallback is active |
| Marketing page fonts missing | Requires internet connection (loads from Google Fonts) |

---

## License

Private — All rights reserved. © Plum OPS
