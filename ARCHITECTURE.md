# Plum OPS — System Architecture Document

## Overview

Plum OPS is an AI-powered, multi-agent claims processing workbench for Group Health Insurance (GHI) OPD claims. It replaces the manual review workflow with a sequential five-agent pipeline that validates documents, extracts structured data, scores fraud risk, evaluates policy eligibility, and produces an explainable adjudication decision — with Human-in-the-Loop (HITL) intervention points at each critical stage.

The system is designed to process claims for the `PLUM_GHI_2024` policy issued by ICICI Lombard General Insurance for TechCorp Solutions Pvt Ltd, covering 10 enrolled members.

---

## System Components

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Plum OPS Platform                             │
│                                                                      │
│  ┌─────────────┐   ┌────────────┐   ┌─────────────┐                │
│  │  Membership │──▶│  Claims    │──▶│  Enrollment │                │
│  │  Portal     │   │  System    │   │  System     │                │
│  └─────────────┘   └────────────┘   └─────────────┘                │
│         │                │                  │                        │
│         └────────────────┼──────────────────┘                       │
│                          ▼                                           │
│         ┌────────────────────────────────────┐                      │
│         │         Agent Orchestrator          │                      │
│         │  (sequential pipeline, in-browser)  │                      │
│         └────────────────────────────────────┘                      │
│               │        │       │       │       │                     │
│               ▼        ▼       ▼       ▼       ▼                    │
│           Agent 1  Agent 2  Agent 3  Agent 4  Agent 5               │
│           Ingest   Extract   Risk    Policy   Adjudicate             │
└──────────────────────────────────────────────────────────────────────┘
```

### Connected Systems

| System | Role | Sync Frequency |
|---|---|---|
| Membership Portal | Claim submission, document upload, member notifications | Real-time |
| Claims System (SYS-CPE-01) | System of record for decisions, reason codes, plan payment amounts | Real-time |
| Enrollment System (SYS-ENR-02) | Member roster, join dates, dependent lists, YTD usage | Every 15 min |

---

## Agent Architecture

The pipeline is strictly sequential. Each agent receives the output of all prior agents as context. A failed agent marks downstream agents as `SKIPPED` rather than crashing.

### Agent 1 — Ingest Agent

**Responsibility:** Document validation and member lookup before any claim processing occurs.

**Logic:**
1. Resolves the `member_id` against the enrollment roster.
2. Checks that all document types required for the claim category are present (from `POLICY.document_requirements`).
3. Detects duplicate document types — if a required type is missing and a duplicate of another type is present, raises `WRONG_DOCUMENT_TYPE` (TC001).
4. Checks individual document quality; raises `UNREADABLE_DOCUMENT` if quality is `UNREADABLE` (TC002).
5. Cross-checks patient names across all uploaded documents; raises `PATIENT_MISMATCH` if names differ (TC003).
6. Produces a real-time terminal ingest log for every claim.

**Output:** `READY` or `NEEDS_RESUBMISSION` per claim. Issues include error code, human-readable detail, and an actionable instruction for the member.

**HITL point:** Ops can trigger a resubmission request to the member directly from this panel.

---

### Agent 2 — Extraction Agent

**Responsibility:** Structured field extraction from uploaded documents using LLM-powered OCR.

**Logic:**
1. For each `PRESCRIPTION`, extracts: doctor name, registration number (with format validation against `STATE/XXXXX/YYYY`), patient name, date, diagnosis, medicines.
2. For each `HOSPITAL_BILL`, extracts: hospital name, patient name, date, line items with amounts, total, GSTIN.
3. Assigns a per-field confidence score (0.0–1.0).
4. Computes average confidence across all fields.
5. If average confidence < 0.70 or more than 2 fields have confidence < 0.75, marks the claim `UNCLEAR_DOCUMENT`.

**Output:** Per-document extraction results with confidence scores. Low-confidence fields are flagged individually.

**HITL point:** Ops can edit any extracted field inline (pencil icon in split-pane view). If unclear, ops can request a clearer document from the member.

---

### Agent 3 — Risk & Integrity Agent

**Responsibility:** Fraud scoring and anomaly detection.

**Checks (with signal weights):**

| Check | Signal Weight | Trigger |
|---|---|---|
| Minimum claim amount | +0.10 | Amount < ₹500 |
| Late submission | +0.20 | Submitted > 30 days after treatment |
| Same-day claims count | +0.45 | More than 2 claims on the same date |
| High-value claim | +0.15 | Amount > ₹25,000 |
| Invalid doctor registration format | +0.20 | Reg not matching `STATE/XXXXX/YYYY` |

Fraud score is capped at 0.99. If score > 0.80 **or** the same-day claims check fails, the claim is routed to `MANUAL_REVIEW`.

**Output:** Fraud score (0–1), list of triggered signal flags, per-check pass/fail, evidence table for each flag.

**HITL point:** Ops must validate or reject manual review claims with a reason code before the pipeline continues.

---

### Agent 4 — Policy Engine

**Responsibility:** Full policy eligibility and coverage adjudication.

**Checks (in order):**

1. **Member enrollment** — member ID must exist in the roster.
2. **Initial 30-day waiting period** — days since join date must be ≥ 30.
3. **Condition-specific waiting periods** — diabetes (90 days), hypertension (90 days), etc. Eligible-from date is calculated and shown in rejection.
4. **Policy exclusions** — checks diagnosis and bill line items against the exclusions list (bariatric, cosmetic, obesity, etc.).
5. **Annual OPD limit** — YTD claimed must not exceed ₹50,000.
6. **Per-claim limit** — claimed amount must not exceed ₹5,000.
7. **Pre-authorization check** (DIAGNOSTIC category only) — MRI, CT Scan, PET Scan above ₹10,000 require a pre-auth reference.
8. **Network discount** — if hospital is on the network list, discount is applied first (before co-pay).
9. **Co-pay** — applied after network discount.
10. **Dental line-item split** — for DENTAL claims, each line item is matched against `covered_procedures` and `excluded_procedures` independently.

**Calculation order (TC010):**
```
Billed Amount
  - Network Discount (%)   ← applied FIRST
  = Discounted Amount
  - Co-pay (%)             ← applied SECOND, on discounted amount
  = Approved Amount
```

**Output:** `APPROVED`, `PARTIAL`, or `REJECTED` with approved amount, per-check pass/fail table, rejection reason code, and proof table linking to policy clauses.

---

### Agent 5 — Adjudication Agent

**Responsibility:** Final decision synthesis and Explanation of Benefits (EOB) generation.

**Logic:**
1. If Agent 3 flagged `MANUAL_REVIEW`, routes directly to `MANUAL_REVIEW` without a financial decision.
2. If any upstream agent produced `SKIPPED`, decision is `NEEDS_RESUBMISSION`.
3. Otherwise, reads Agent 4's decision and produces the EOB: billed amount, network saving, co-pay deduction, plan payment, member liability.
4. Assigns a confidence score: `APPROVED` = 0.92, `PARTIAL` = 0.88, `REJECTED` = 0.95.
5. If `simulate_component_failure` flag is set (TC011), confidence is reduced by 0.30 (floor 0.55) and a degradation banner is shown.
6. Syncs the final decision to all three connected systems via the Sync Card.

**HITL point:** Ops must approve or decline every `APPROVED` or `PARTIAL` decision before disbursement is triggered.

---

## Data Flow

```
Claim Submission
      │
      ▼
Agent 1 (Ingest)
   ├── NEEDS_RESUBMISSION → Stop. Notify member. HITL: Send resubmission request.
   └── READY ──────────────────────────────────────────────────────────▶ Agent 2
                                                                              │
Agent 2 (Extraction)                                                          │
   ├── UNCLEAR_DOCUMENT → HITL: Request clearer doc / edit fields inline.     │
   └── EXTRACTED ────────────────────────────────────────────────────▶ Agent 3
                                                                              │
Agent 3 (Risk)                                                                │
   ├── MANUAL_REVIEW → HITL: Ops validate or reject with reason code.        │
   └── RISK_CLEARED ─────────────────────────────────────────────────▶ Agent 4
                                                                              │
Agent 4 (Policy Engine)                                                       │
   ├── REJECTED → Reason card with policy reference. No further action.      │
   ├── PARTIAL  ──────────────────────────────────────────────────────▶ Agent 5
   └── APPROVED ─────────────────────────────────────────────────────▶ Agent 5
                                                                              │
Agent 5 (Adjudication)                                                        │
   ├── REJECTED → EOB issued. Member notified.                                │
   ├── PARTIAL  → EOB issued. HITL: Ops approve before disbursement.         │
   └── APPROVED → EOB issued. HITL: Ops approve before disbursement.         │
                                                                              │
                          ◀─────── Sync to all 3 connected systems ──────────┘
```

---

## Observability

Every agent run appends structured entries to the Audit Log:

- `AGENT_START` / `AGENT_COMPLETE` — pipeline-level events
- `CLAIM_RESULT` — per-claim decision per agent
- `ISSUE` — ingest errors (wrong doc, patient mismatch, unreadable)
- `POLICY_FAIL` — policy rejection reasons
- `FRAUD_FLAG` — risk signals triggered
- `HITL_ACTION` — ops decisions recorded with reason codes

The Audit Log is filterable by agent, log level, claim ID, and free-text search. It is exportable as `.txt`.

---

## Failure Handling

| Failure | System Behavior |
|---|---|
| Component failure (TC011) | Pipeline continues. `componentFailed` flag set. Confidence reduced by 0.30. Degradation banner shown. Manual review recommended. |
| Member not found | Agent 4 immediately rejects with `MEMBER_NOT_FOUND`. |
| Upstream agent `SKIPPED` | All downstream agents return `SKIPPED` with a reason. No crash. |
| Unreadable document | Agent 1 raises `UNREADABLE_DOCUMENT`. Claim halted. Member asked to resubmit. Claim is NOT rejected. |
| LLM extraction uncertainty | Agent 2 marks fields as low-confidence. Ops can correct inline. |

---

## Policy Configuration

All policy rules are read from `POLICY` (equivalent to `policy_terms.json`). No logic is hardcoded in agent functions — all thresholds (limits, waiting periods, exclusions, fraud thresholds, document requirements, network hospitals) are read from the config at runtime.

**Key policy parameters:**

| Parameter | Value |
|---|---|
| Policy ID | PLUM_GHI_2024 |
| Insurer | ICICI Lombard General Insurance |
| Sum insured per employee | ₹5,00,000 |
| Annual OPD limit | ₹50,000 |
| Per-claim limit | ₹5,000 |
| Initial waiting period | 30 days |
| Diabetes waiting period | 90 days |
| Fraud score manual review threshold | 0.80 |
| Same-day claims limit | 2 |
| High-value auto-review threshold | ₹25,000 |

---

## Trade-off Log

### Why a sequential pipeline, not a parallel agent mesh?

Claims adjudication has hard dependencies: extraction cannot run on a document that failed ingest; policy evaluation cannot run before extraction produces structured data. A parallel mesh would require synchronization barriers that add complexity without benefit. Sequential is simpler, easier to trace, and correct.

### Why in-browser rule execution rather than a backend service?

For this assignment scope, keeping all agent logic in the React app eliminates infrastructure overhead and makes the system immediately runnable without a server. The trade-off is that it cannot scale horizontally. At 10x load (see below), this would be replaced with a Python microservice per agent.

### Why HITL at every agent, not just at the end?

Early HITL intervention (at ingest, extraction, risk) prevents wasted computation downstream. A patient mismatch caught at Agent 1 saves Agents 2–5 from running. This also maps to real ops workflows where document problems are resolved before any adjudication is attempted.

### What was rejected?

- **LangGraph / CrewAI**: Considered for agent orchestration but added dependency overhead not justified at this scale. Direct function composition is transparent and testable.
- **Async streaming decisions**: Considered streaming partial results per agent, but rejected because the UI benefits from a complete agent result to render the full reason card and proof table.

---

## Scalability — At 10x Load (750,000+ claims/year)

| Bottleneck | Solution |
|---|---|
| In-browser agent execution | Decompose into Python microservices (FastAPI) per agent, deployed on Kubernetes |
| Synchronous LLM calls (Agent 2) | Async batch processing with a message queue (SQS or Kafka) |
| Policy rules in memory | Move `POLICY` config to a managed rules engine (e.g. Open Policy Agent) |
| Single-tenant UI | Multi-tenant SaaS with per-org policy config namespacing |
| Audit log in React state | Append-only log store (e.g. ClickHouse or BigQuery) for analytics |
| HITL via UI buttons | Dedicated ops console with SLA tracking and assignment workflows |

The agent interface contracts (see `CONTRACTS.md`) are designed to be backend-agnostic — each agent is a pure function of its inputs, making the migration to microservices straightforward.
