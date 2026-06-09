# Plum OPS — User Guide

This guide walks you through everything you will see and do inside the Plum OPS platform, step by step, from the moment you open the app.

---

## Table of Contents

1. [Opening the App](#1-opening-the-app)
2. [Understanding the Layout](#2-understanding-the-layout)
3. [The Claims Batch](#3-the-claims-batch)
4. [Running the 5-Agent Pipeline](#4-running-the-5-agent-pipeline)
   - [Agent 1 — Ingest](#agent-1--ingest-agent)
   - [Agent 2 — Extraction](#agent-2--extraction-agent)
   - [Agent 3 — Risk & Integrity](#agent-3--risk--integrity)
   - [Agent 4 — Policy Engine](#agent-4--policy-engine)
   - [Agent 5 — Adjudication](#agent-5--adjudication)
5. [Human-in-the-Loop (HITL) Actions](#5-human-in-the-loop-hitl-actions)
6. [Exploring the System Views](#6-exploring-the-system-views)
7. [Audit Log](#7-audit-log)
8. [Settings & Prompt Configuration](#8-settings--prompt-configuration)
9. [AI-Powered Reason Cards](#9-ai-powered-reason-cards)
10. [What Each Claim Tests](#10-what-each-claim-tests)

---

## 1. Opening the App

After cloning and running `npm start`, your browser opens at:

```
http://localhost:3000
```

You land on the **Module Overview** page. This is your home base — it shows the full pipeline, the claim batch, and a run button for each agent.

> If you want to see the marketing/landing page first, open `marketing.html` directly in your browser (no server needed — just double-click the file).

---

## 2. Understanding the Layout

The app has three zones:

```
┌─────────────────┬───────────────────────────────────────────────┐
│                 │  Top Bar — breadcrumb + system status chip     │
│  Sidebar Nav    ├───────────────────────────────────────────────┤
│                 │                                               │
│  WORKSPACE      │              Main Content Area               │
│  › Overview     │                                               │
│                 │  Changes based on what you click in           │
│  SYSTEMS        │  the sidebar                                  │
│  › Claims       │                                               │
│  › Enrollment   │                                               │
│  › Membership   │                                               │
│  › Policy       │                                               │
│                 │                                               │
│  AGENTS         │                                               │
│  › Ingest       │                                               │
│  › Extraction   │                                               │
│  › Risk         │                                               │
│  › Policy Eng   │                                               │
│  › Adjudication │                                               │
│                 │                                               │
│  CONFIGURATION  │                                               │
│  › Settings     │                                               │
│  › Prompt Cfg   │                                               │
│  › Audit Log    │                                               │
└─────────────────┴───────────────────────────────────────────────┘
```

---

## 3. The Claims Batch

The app loads with **5 pre-built claims** for TechCorp Solutions under policy `PLUM_GHI_2024` (ICICI Lombard). Each claim is designed to test a different scenario:

| Claim ID | Member | Scenario |
|----------|--------|----------|
| CLM-2024-001 | Rajesh Kumar | ✅ Clean approval — everything valid |
| CLM-2024-002 | Vikram Joshi | ⏳ Waiting period violation (diabetes) |
| CLM-2024-003 | Priya Singh | ⚡ Partial approval — dental exclusion (whitening) |
| CLM-2024-004 | Ravi Menon | 🛡 Fraud flag — 4 same-day claims |
| CLM-2024-005 | Sneha Reddy | ❌ Document problem — duplicate prescription |

You can see all 5 claims in the table on the **Overview** page and in the **Claims System** view.

---

## 4. Running the 5-Agent Pipeline

> **Important:** Agents must be run in order — 1 → 2 → 3 → 4 → 5. Each agent depends on the output of the one before it.

### How to run an agent

**From the Overview page:**
- Scroll down to the "Processing Pipeline" section
- Click **Run Agent →** on the agent you want to run
- The button is greyed out until the previous agent is complete

**From an individual agent page:**
- Click the agent in the sidebar (e.g. "Ingest Agent")
- Click **Run Agent →** at the top of the page

---

### Agent 1 — Ingest Agent

**What it does:** Validates that all required documents are present, checks for duplicates or wrong document types, verifies the member exists in the enrollment system.

**What to expect when you run it:**
- A terminal log overlay appears, showing real-time ingest logs for each claim
- Each claim is processed one at a time with animated log lines
- The terminal closes automatically when done

**Results after running:**
- Click any claim row to expand it and see the result
- **CLM-2024-001**: ✅ READY — all documents present, member found
- **CLM-2024-002**: ✅ READY — documents fine (waiting period issue comes later)
- **CLM-2024-003**: ✅ READY — hospital bill present
- **CLM-2024-004**: ✅ READY — documents fine
- **CLM-2024-005**: ❌ NEEDS RESUBMISSION — two prescriptions uploaded (duplicate), one should be a hospital bill

**For CLM-2024-005 (document problem):**
- Expand the claim row
- Read the reason card — it explains exactly what went wrong
- Click **Send Resubmission Request** to notify the member
- If Gemini is configured: an AI-written explanation appears below the rule-based text (with an ✦ AI badge)

---

### Agent 2 — Extraction Agent

**What it does:** Simulates LLM-powered OCR extraction — pulls structured fields from each prescription and hospital bill with confidence scores.

**What to expect:**
- Run button becomes available once Agent 1 is done
- Brief processing animation, then results appear

**Results:**
- Each expanded claim shows a **split-pane view**: original document fields on the left, AI-extracted fields on the right with confidence percentages
- You can **click the ✏ pencil icon** on any extracted field to edit the value inline
- Claims that failed Agent 1 (CLM-2024-005) show as **SKIPPED**

**Things to try:**
- Click the **👁 Preview** button on a document to open the document preview modal (simulated prescription or hospital bill)
- Click **👁 Full Preview** in the extraction pane to see the original document alongside extracted values
- Edit a field value and click away to save it

---

### Agent 3 — Risk & Integrity

**What it does:** Scores each claim for fraud risk using rule-based signals — same-day claim count, submission timing, claimed amount vs thresholds, doctor registration format validity.

**What to expect:**
- Results show a checks table and a large fraud score number
- High-risk claims are flagged for manual review

**Results:**
- **CLM-2024-001**: ✅ RISK CLEARED — fraud score ~10%
- **CLM-2024-002**: ✅ RISK CLEARED — no fraud signals
- **CLM-2024-003**: ✅ RISK CLEARED — no fraud signals
- **CLM-2024-004**: 🔍 **MANUAL REVIEW** — Ravi Menon has 4 claims on the same day (limit is 2). Fraud score ~55%
- **CLM-2024-005**: ⏭ SKIPPED (failed Agent 1)

**For CLM-2024-004 (fraud flag):**
- The reason card explains the specific signals detected
- A HITL panel appears below asking you to validate or reject
- Select a reason code from the dropdown (e.g. `RISK_FRAUD_CONFIRMED` or `RISK_FALSE_POSITIVE`)
- Click **✓ Validate Claim** or **✗ Reject Claim**
- The decision is recorded and synced to all systems

---

### Agent 4 — Policy Engine

**What it does:** Applies the full PLUM_GHI_2024 policy rulebook — initial waiting periods, pre-existing condition waiting periods, annual OPD limits, per-claim caps, network discounts, co-pays, exclusions, and pre-authorization requirements.

**What to expect:**
- A detailed checks table showing every policy rule evaluated
- For dental claims: a line-item breakdown showing which procedures are covered vs excluded

**Results:**
- **CLM-2024-001**: ✅ APPROVED — ₹1,500 consultation, 10% co-pay applied (Apollo is network)
- **CLM-2024-002**: ❌ REJECTED — `WAITING_PERIOD_NOT_MET` — Vikram joined 2024-09-01, treating diabetes on 2024-10-15 = only 44 days elapsed, but diabetes requires 90 days
- **CLM-2024-003**: ⚡ PARTIAL — Root canal ₹8,000 covered, teeth whitening ₹4,000 excluded (cosmetic)
- **CLM-2024-004**: ⏭ SKIPPED — routed to manual review at Agent 3
- **CLM-2024-005**: ⏭ SKIPPED — failed Agent 1

**For CLM-2024-002 (rejection):**
- The reason card cites the exact policy clause
- Shows which date the member becomes eligible for diabetes claims
- Proof table shows the calculation with dates

**For CLM-2024-003 (partial):**
- Line-item breakdown shows each dental procedure with covered/excluded status
- Covered: Root Canal Treatment (₹8,000)
- Excluded: Teeth Whitening (₹4,000) — listed under cosmetic exclusions in policy

---

### Agent 5 — Adjudication

**What it does:** Produces the final decision with a full Explanation of Benefits (EOB) — calculation breakdown, plan pays amount, member liability, confidence score — and a HITL approval gate before any disbursement.

**What to expect:**
- Full claim details card at the top
- EOB tiles: Billed / Plan Pays / Member Liability
- Calculation breakdown table showing every deduction step
- Final reason card (approved / partial / rejected / manual review)
- HITL panel requiring ops sign-off before disbursement

**Results:**
- **CLM-2024-001**: ✅ APPROVED — Plan pays ₹1,350 (after 10% co-pay on ₹1,500)
- **CLM-2024-002**: ❌ REJECTED — ₹0 — waiting period
- **CLM-2024-003**: ⚡ PARTIAL — Plan pays ₹8,000 (root canal only)
- **CLM-2024-004**: 🔍 MANUAL REVIEW — fraud flag carried through
- **CLM-2024-005**: ❌ NEEDS RESUBMISSION — document problem

**HITL approval (CLM-2024-001 and CLM-2024-003):**
- A yellow HITL panel appears below the reason card
- Select **APPROVE — Confirm and disburse** or **DECLINE**
- Optionally type notes in the text field
- Click the submit button
- The decision syncs to Claims System, Membership Portal, and Enrollment System

---

## 5. Human-in-the-Loop (HITL) Actions

HITL actions appear in three places:

| Where | Trigger | Action |
|-------|---------|--------|
| Agent 1 result | Document problem | Send resubmission request to member |
| Agent 2 result | Low extraction confidence | Request clearer document from member |
| Agent 3 result | Fraud flag / manual review | Validate or reject with reason code |
| Agent 5 result | Approved or partial claim | Final ops approval before disbursement |

All HITL actions are immediately reflected in the **Sync Card** at the bottom of each result row, and in the **Claims System**, **Membership Portal**, and **Audit Log** views.

---

## 6. Exploring the System Views

These are in the **SYSTEMS** section of the sidebar and show data as it would look in connected downstream systems.

### Claims System
A register of all claims with live status, fraud scores, reason codes, approved amounts, and agent pipeline stage. Has a **↻ Sync** button that stamps the last sync time.

### Enrollment System
All 10 enrolled TechCorp employees with join dates, dependents, YTD claimed amounts, and enrollment status.

### Membership Portal
Member-facing view — shows each member's claim status and notification. Click a member card to expand it and see all their claims. Send resubmission notifications directly from here.

### Policy Engine
The full PLUM_GHI_2024 policy reference:
- **Coverage** tab: sum insured, OPD sub-limits per category, co-pay and discount rates
- **Waiting Periods** tab: initial 30-day period + pre-existing condition periods (diabetes 90 days, joint replacement 730 days, etc.)
- **Exclusions** tab: full list of excluded conditions and procedures

---

## 7. Audit Log

Found under **Configuration → Audit Log**.

Every agent run, claim result, policy failure, fraud flag, and HITL action is recorded here with a timestamp, level, agent name, claim ID, amount, and message.

**Features:**
- Filter by agent, log level (INFO / SUCCESS / WARN / ERROR), claim ID, or free-text search
- Colour-coded level badges
- Click any row to expand the full message
- **Export .txt** button downloads the full log as a plain text file

The log is empty until you start running agents — populates in real time as you process claims.

---

## 8. Settings & Prompt Configuration

### Settings page
Found at **Configuration → Settings**.

- **System Connections**: shows the three integrated systems (Claims, Enrollment, Membership Portal) with endpoint, auth method, and sync frequency
- **Gemini AI Integration**: shows configured key count, per-key health status (OK / failures), and a warning if no keys are set
- **Agent Configuration**: editable numeric parameters (confidence threshold, fraud cutoff, submission deadline, etc.)

### Prompt Configuration page
Found at **Configuration → Prompt Config**.

This is where you can see and edit the exact prompt Gemini uses for each agent.

**How to use it:**
1. Click a tab to select an agent (e.g. Agent 3 — Risk & Integrity)
2. The current prompt appears in the text editor
3. Edit any text — changes are saved automatically as you type
4. The placeholder `{{CONTEXT}}` is replaced at runtime with a JSON object containing the live claim data, agent results, and policy summary
5. Click **↺ Reset to Default** to restore the original prompt
6. Re-run the agent to see your updated prompt in action

**Tips for writing prompts:**
- Keep `{{CONTEXT}}` in the prompt — it's what injects the real claim data
- Instruct the model to write in plain prose (no bullet points) for clean card rendering
- Tell it to be factual and cite only what's in the context — prevents hallucination
- Shorter prompts (under 400 words) stay within the free-tier token limits comfortably

---

## 9. AI-Powered Reason Cards

When Gemini is configured and successfully responds, reason cards get an additional AI-generated paragraph below the rule-engine text.

**Visual indicators:**
- **✦ AI** badge in the top-right of the reason card header → Gemini enrichment is present
- **Spinner + "Gemini is analysing…"** → LLM call is in progress (fires immediately after the agent run)
- **No badge, no spinner** → Either Gemini is not configured, or it failed and the fallback is active

**What "fallback active" means:**
- The reason card shows exactly the same text as it did before Gemini was added
- Nothing is broken, nothing is missing
- You can verify key status under Settings or Prompt Config

---

## 10. What Each Claim Tests

Use this as a reference when demoing or exploring specific scenarios:

| Claim | Key feature to demo |
|-------|---------------------|
| CLM-2024-001 | Happy path — full approval with co-pay and network discount. HITL final approval. |
| CLM-2024-002 | Waiting period rejection — shows date math, eligibility date, proof table |
| CLM-2024-003 | Partial dental approval — line-item covered/excluded breakdown |
| CLM-2024-004 | Fraud flag → manual review → HITL validation at Agent 3. Bypasses Agents 4 & 5. |
| CLM-2024-005 | Document ingest failure — wrong doc type. Resubmission request flow. |

---

*For technical setup, environment variables, and deployment — see [README.md](./README.md).*
