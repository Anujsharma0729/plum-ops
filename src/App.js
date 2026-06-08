import { useState, useCallback, useEffect, useRef } from "react";
/* ═══════════════════════════════════════════════════════════════
   PLUM OPS PLATFORM v2 — Enterprise Claims Workbench
   Updated: Separate Claims/Enrollment, Membership Portal,
   Terminal Ingest Logs, Document Preview, Reason Cards,
   HITL Actions, Sync Cards, Split-pane Extraction, HITL Adjudication
   ═══════════════════════════════════════════════════════════════ */

const POLICY = {
  policy_id: "PLUM_GHI_2024",
  policy_name: "Group Health Insurance — Standard Plan",
  insurer: "ICICI Lombard General Insurance",
  policy_holder: { company_name: "TechCorp Solutions Pvt Ltd", policy_start_date: "2024-04-01", policy_end_date: "2025-03-31", renewal_status: "ACTIVE" },
  coverage: { sum_insured_per_employee: 500000, annual_opd_limit: 50000, per_claim_limit: 5000, family_floater: { enabled: true, combined_limit: 150000 } },
  opd_categories: {
    CONSULTATION:        { sub_limit: 2000,  copay_percent: 10, network_discount_percent: 20, covered: true },
    DIAGNOSTIC:          { sub_limit: 10000, copay_percent: 0,  network_discount_percent: 10, covered: true, high_value_tests: ["MRI","CT Scan","PET Scan"], pre_auth_threshold: 10000 },
    PHARMACY:            { sub_limit: 15000, copay_percent: 0,  branded_drug_copay_percent: 30, generic_mandatory: true, covered: true },
    DENTAL:              { sub_limit: 10000, copay_percent: 0,  covered: true, covered_procedures: ["Root Canal Treatment","Tooth Extraction","Dental Filling","Scaling and Polishing","Dental X-Ray","Crown Placement","Gum Treatment"], excluded_procedures: ["Teeth Whitening","Veneers","Orthodontic Treatment","Cosmetic Implants","Bleaching"] },
    VISION:              { sub_limit: 5000,  copay_percent: 0,  covered: true, covered_items: ["Glasses","Contact Lenses","Eye Examination","Cataract Surgery"], excluded_items: ["LASIK Surgery","Cosmetic Eye Surgery","Refractive Surgery"] },
    ALTERNATIVE_MEDICINE:{ sub_limit: 8000,  copay_percent: 0,  covered: true, max_sessions: 20, covered_systems: ["Ayurveda","Homeopathy","Unani","Siddha","Naturopathy"] }
  },
  waiting_periods: {
    initial_days: 30,
    specific: { diabetes: 90, hypertension: 90, thyroid_disorders: 90, joint_replacement: 730, maternity: 270, mental_health: 180, obesity_treatment: 365, hernia: 365, cataract: 365 }
  },
  exclusions: ["Self-inflicted injuries","Substance abuse treatment","Experimental treatments","Infertility and assisted reproduction","Obesity and weight loss programs","Bariatric surgery","Cosmetic or aesthetic procedures","Vaccination (non-medically necessary)","Health supplements and tonics"],
  network_hospitals: ["Apollo Hospitals","Fortis Healthcare","Max Healthcare","Manipal Hospitals","Narayana Health","Medanta","Kokilaben Dhirubhai Ambani Hospital","Aster CMI Hospital","Columbia Asia","Sakra World Hospital"],
  document_requirements: {
    CONSULTATION:         { required: ["PRESCRIPTION","HOSPITAL_BILL"] },
    DIAGNOSTIC:           { required: ["PRESCRIPTION","LAB_REPORT","HOSPITAL_BILL"] },
    PHARMACY:             { required: ["PRESCRIPTION","PHARMACY_BILL"] },
    DENTAL:               { required: ["HOSPITAL_BILL"] },
    VISION:               { required: ["PRESCRIPTION","HOSPITAL_BILL"] },
    ALTERNATIVE_MEDICINE: { required: ["PRESCRIPTION","HOSPITAL_BILL"] }
  },
  fraud_thresholds: { same_day_claims_limit: 2, monthly_claims_limit: 6, auto_manual_review_above: 25000, fraud_score_manual_review_threshold: 0.80 },
  members: [
    { member_id: "EMP001", name: "Rajesh Kumar",  dob: "1985-03-15", gender: "M", relationship: "SELF", join_date: "2024-04-01", dependents: ["DEP001","DEP002"], email: "rajesh.kumar@techcorp.in", phone: "+91-9876543210" },
    { member_id: "EMP002", name: "Priya Singh",   dob: "1990-07-22", gender: "F", relationship: "SELF", join_date: "2024-04-01", dependents: [], email: "priya.singh@techcorp.in", phone: "+91-9876543211" },
    { member_id: "EMP003", name: "Amit Verma",    dob: "1988-11-05", gender: "M", relationship: "SELF", join_date: "2024-04-01", dependents: ["DEP003"], email: "amit.verma@techcorp.in", phone: "+91-9876543212" },
    { member_id: "EMP004", name: "Sneha Reddy",   dob: "1992-02-28", gender: "F", relationship: "SELF", join_date: "2024-04-01", dependents: [], email: "sneha.reddy@techcorp.in", phone: "+91-9876543213" },
    { member_id: "EMP005", name: "Vikram Joshi",  dob: "1979-09-10", gender: "M", relationship: "SELF", join_date: "2024-09-01", dependents: [], email: "vikram.joshi@techcorp.in", phone: "+91-9876543214" },
    { member_id: "EMP006", name: "Kavita Nair",   dob: "1983-06-18", gender: "F", relationship: "SELF", join_date: "2024-04-01", dependents: [], email: "kavita.nair@techcorp.in", phone: "+91-9876543215" },
    { member_id: "EMP007", name: "Suresh Patil",  dob: "1975-12-30", gender: "M", relationship: "SELF", join_date: "2024-04-01", dependents: ["DEP004","DEP005"], email: "suresh.patil@techcorp.in", phone: "+91-9876543216" },
    { member_id: "EMP008", name: "Ravi Menon",    dob: "1987-04-14", gender: "M", relationship: "SELF", join_date: "2024-04-01", dependents: [], email: "ravi.menon@techcorp.in", phone: "+91-9876543217" },
    { member_id: "EMP009", name: "Anita Desai",   dob: "1993-08-25", gender: "F", relationship: "SELF", join_date: "2024-04-01", dependents: [], email: "anita.desai@techcorp.in", phone: "+91-9876543218" },
    { member_id: "EMP010", name: "Deepak Shah",   dob: "1980-01-07", gender: "M", relationship: "SELF", join_date: "2024-04-01", dependents: ["DEP006"], email: "deepak.shah@techcorp.in", phone: "+91-9876543219" }
  ]
};

const INITIAL_CLAIMS = [
  { claim_id: "CLM-2024-001", member_id: "EMP001", member_name: "Rajesh Kumar", claim_type: "CONSULTATION", date_of_service: "2024-11-01", claimed_amount: 1500, hospital: "City Medical Centre, Bengaluru", diagnosis: "Viral Fever", status: "PENDING", submitted: "2024-11-05", documents: [{ file_id: "F001", name: "dr_sharma_rx.jpg", type: "PRESCRIPTION", quality: "GOOD", doctor: "Dr. Arun Sharma", reg: "KA/45678/2015", patient: "Rajesh Kumar", date: "2024-11-01", diagnosis: "Viral Fever", medicines: ["Paracetamol 650mg x5d","Vitamin C 500mg x7d"] },{ file_id: "F002", name: "city_clinic_bill.jpg", type: "HOSPITAL_BILL", quality: "GOOD", hospital: "City Medical Centre", patient: "Rajesh Kumar", date: "2024-11-01", items: [{ desc: "Consultation Fee", amt: 1000 },{ desc: "CBC Test", amt: 300 },{ desc: "Dengue NS1", amt: 200 }], total: 1500, gstin: "29AABCT1234X1ZX" }], ytd_used: 5000, scenario: "APPROVE" },
  { claim_id: "CLM-2024-002", member_id: "EMP005", member_name: "Vikram Joshi",  claim_type: "CONSULTATION", date_of_service: "2024-10-15", claimed_amount: 3000, hospital: "Apollo Hospitals, Ahmedabad", diagnosis: "Type 2 Diabetes Mellitus (T2DM)", status: "PENDING", submitted: "2024-11-01", documents: [{ file_id: "F009", name: "vikram_prescription.jpg", type: "PRESCRIPTION", quality: "GOOD", doctor: "Dr. Sunil Mehta", reg: "GJ/56789/2014", patient: "Vikram Joshi", date: "2024-10-15", diagnosis: "T2DM", medicines: ["Metformin 500mg","Glimepiride 1mg"] },{ file_id: "F010", name: "apollo_bill.jpg", type: "HOSPITAL_BILL", quality: "GOOD", hospital: "Apollo Hospitals", patient: "Vikram Joshi", date: "2024-10-15", items: [{ desc: "Consultation Fee", amt: 1500 },{ desc: "HbA1c Test", amt: 1500 }], total: 3000 }], ytd_used: 0, scenario: "WAITING_PERIOD" },
  { claim_id: "CLM-2024-003", member_id: "EMP002", member_name: "Priya Singh",   claim_type: "DENTAL",        date_of_service: "2024-10-20", claimed_amount: 12000, hospital: "Smile Dental Clinic, Mumbai", diagnosis: "Dental Caries + Aesthetic Enhancement", status: "PENDING", submitted: "2024-10-28", documents: [{ file_id: "F011", name: "smile_dental_bill.jpg", type: "HOSPITAL_BILL", quality: "GOOD", hospital: "Smile Dental Clinic", patient: "Priya Singh", date: "2024-10-20", items: [{ desc: "Root Canal Treatment", amt: 8000 },{ desc: "Teeth Whitening", amt: 4000 }], total: 12000 }], ytd_used: 3000, scenario: "PARTIAL" },
  { claim_id: "CLM-2024-004", member_id: "EMP008", member_name: "Ravi Menon",    claim_type: "CONSULTATION", date_of_service: "2024-10-30", claimed_amount: 4800, hospital: "MedQuick Clinic, Chennai", diagnosis: "Migraine", status: "PENDING", submitted: "2024-10-30", documents: [{ file_id: "F017", name: "ravi_rx.jpg", type: "PRESCRIPTION", quality: "GOOD", doctor: "Dr. S. Khan", reg: "TN/56789/2013", patient: "Ravi Menon", date: "2024-10-30", diagnosis: "Migraine", medicines: ["Sumatriptan 50mg","Propranolol 40mg"] },{ file_id: "F018", name: "medquick_bill.jpg", type: "HOSPITAL_BILL", quality: "GOOD", hospital: "MedQuick Clinic", patient: "Ravi Menon", date: "2024-10-30", items: [{ desc: "Consultation", amt: 1800 },{ desc: "Neurology Workup", amt: 3000 }], total: 4800 }], existing_claims_today: ["CLM_0081","CLM_0082","CLM_0083"], ytd_used: 18000, scenario: "FRAUD_FLAG" },
  { claim_id: "CLM-2024-005", member_id: "EMP004", member_name: "Sneha Reddy",   claim_type: "CONSULTATION", date_of_service: "2024-10-25", claimed_amount: 1800, hospital: "Fortis Healthcare, Hyderabad", diagnosis: "Gastroenteritis", status: "PENDING", submitted: "2024-11-02", documents: [{ file_id: "F003", name: "sneha_prescription.jpg", type: "PRESCRIPTION", quality: "GOOD", doctor: "Dr. P. Rao", reg: "AP/67890/2017", patient: "Sneha Reddy", date: "2024-10-25", diagnosis: "Gastroenteritis", medicines: ["ORS","Ondansetron 4mg","Metronidazole 400mg"] },{ file_id: "F003b", name: "sneha_prescription_dup.jpg", type: "PRESCRIPTION", quality: "GOOD", doctor: "Dr. P. Rao", reg: "AP/67890/2017", patient: "Sneha Reddy", date: "2024-10-25", diagnosis: "Gastroenteritis", medicines: ["ORS","Ondansetron 4mg"] }], ytd_used: 2000, scenario: "DOC_PROBLEM" }
];

/* ── HELPERS ──────────────────────────────────────────────────── */
const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const daysBetween = (d1, d2) => Math.floor((new Date(d2) - new Date(d1)) / 86400000);
const now = () => new Date().toISOString().replace("T"," ").split(".")[0];

/* ── DESIGN TOKENS ───────────────────────────────────────────── */
const T = {
  sidebar:"#0e1b45", sidebarDk:"#08122f", sidebarMd:"#14255a",
  sidebarText:"rgba(255,255,255,0.87)", sidebarMuted:"rgba(255,255,255,0.45)",
  sidebarHover:"rgba(255,255,255,0.08)", sidebarBorder:"rgba(255,255,255,0.10)",
  accent:"#7c3aed", accentDk:"#6d28d9", accentLt:"#ede9fe", accentBr:"#c4b5fd",
  accentMid:"#a78bfa", bg:"#f0f4f9", surface:"#ffffff", surface2:"#f4f7fb",
  ink100:"#0b1433", ink80:"#1e3065", ink70:"#3a4d7a", ink60:"#5c6d92",
  ink50:"#8190a8", ink40:"#a8b4c8", ink30:"#c8d0de", ink20:"#dde4ef",
  ink15:"#e8edf5", ink10:"#f2f5fa", success:"#1d4ed8", successBg:"#eff6ff",
  successBr:"#bfdbfe", warn:"#b45309", warnBg:"#fffbeb", warnBr:"#fcd34d",
  danger:"#991b1b", dangerBg:"#fef2f2", dangerBr:"#fca5a5",
  green:"#14532d", greenBg:"#f0fdf4", greenBr:"#86efac",
};

/* ── AGENT LOGIC ─────────────────────────────────────────────── */
function runAgent1(claims) {
  const results = {};
  for (const c of claims) {
    const required = POLICY.document_requirements[c.claim_type]?.required || [];
    const uploaded = c.documents.map(d => d.type);
    const typeCounts = {};
    for (const d of c.documents) { typeCounts[d.type] = (typeCounts[d.type] || 0) + 1; }
    const duplicates = Object.entries(typeCounts).filter(([,cnt]) => cnt > 1).map(([t]) => t);
    const missing = required.filter(r => !uploaded.includes(r));
    const issues = [];
    // TC002: Unreadable document quality check
    const unreadableDocs = c.documents.filter(d => d.quality === "UNREADABLE");
    if (unreadableDocs.length > 0) {
      issues.push({ type: "UNREADABLE_DOCUMENT", code: "ERR_DOC_UNREADABLE", detail: `Document(s) could not be read: ${unreadableDocs.map(d => `${d.name} [${d.type}]`).join(", ")}. The image is too blurry or of insufficient quality.`, action: "Please re-upload a clear, readable photo or scan of the document(s) listed above. Do not reject the claim — simply resubmit with a clearer image." });
    }
    // TC001: Wrong document type — uploaded a duplicate of one type where another was required
    const wrongTypeUploaded = [];
    if (missing.length > 0 && duplicates.length > 0) {
      for (const dup of duplicates) {
        for (const mis of missing) {
          wrongTypeUploaded.push({ uploaded: dup, needed: mis });
        }
      }
    }
    if (wrongTypeUploaded.length > 0) {
      wrongTypeUploaded.forEach(({ uploaded: up, needed }) => {
        issues.push({ type: "WRONG_DOCUMENT_TYPE", code: "ERR_DOC_WRONG_TYPE", detail: `You uploaded a ${up} where a ${needed} is required. You have submitted two ${up} files — one of these should be a ${needed} instead.`, action: `Remove the extra ${up} and upload a ${needed} in its place, then resubmit.` });
      });
    } else {
      if (missing.length > 0) issues.push({ type: "MISSING_DOCUMENT", code: "ERR_DOC_MISSING", detail: `Missing required document(s): ${missing.join(", ")}`, action: "Please upload the missing document(s) and resubmit." });
      if (duplicates.length > 0) issues.push({ type: "DUPLICATE_DOCUMENT", code: "ERR_DOC_DUPLICATE", detail: `Duplicate upload detected: ${duplicates.join(", ")} was uploaded twice.`, action: "Remove the duplicate and upload the correct document." });
    }
    // TC003: Cross-document patient name mismatch check
    const patientNames = c.documents.filter(d => d.patient).map(d => ({ name: d.name, patient: d.patient, type: d.type }));
    if (patientNames.length >= 2) {
      const uniquePatients = [...new Set(patientNames.map(p => p.patient.toLowerCase().trim()))];
      if (uniquePatients.length > 1) {
        const nameList = patientNames.map(p => `${p.type}: "${p.patient}"`).join(" vs ");
        issues.push({ type: "PATIENT_MISMATCH", code: "ERR_PATIENT_MISMATCH", detail: `Documents belong to different patients: ${nameList}. All documents must be for the same patient (the insured member).`, action: "Please ensure all uploaded documents belong to the insured member and resubmit." });
      }
    }
    const member = POLICY.members.find(m => m.member_id === c.member_id);
    const ingestLogs = [
      { ts: now(), level: "INFO",  msg: `Claim ${c.claim_id} received — member ${c.member_id}` },
      { ts: now(), level: "INFO",  msg: `Validating ${c.documents.length} document(s)…` },
      ...c.documents.map(d => ({ ts: now(), level: d.quality === "UNREADABLE" ? "WARN" : "INFO", msg: `  ↳ ${d.name} [${d.type}] — quality: ${d.quality || "GOOD"}` })),
      ...(missing.length > 0 ? [{ ts: now(), level: "ERROR", msg: `Missing required: ${missing.join(", ")}` }] : []),
      ...(duplicates.length > 0 ? [{ ts: now(), level: "WARN",  msg: `Duplicate document type(s): ${duplicates.join(", ")}` }] : []),
      ...issues.filter(iss => iss.type === "WRONG_DOCUMENT_TYPE").map(iss => ({ ts: now(), level: "ERROR", msg: `Wrong doc type — ${iss.detail}` })),
      ...issues.filter(iss => iss.type === "UNREADABLE_DOCUMENT").map(iss => ({ ts: now(), level: "WARN",  msg: `Unreadable doc — ${iss.detail}` })),
      ...issues.filter(iss => iss.type === "PATIENT_MISMATCH").map(iss => ({ ts: now(), level: "ERROR", msg: `Patient mismatch — ${iss.detail}` })),
      { ts: now(), level: member ? "INFO" : "ERROR", msg: `Member lookup: ${member ? `FOUND — ${member.name}` : `NOT FOUND — ${c.member_id}`}` },
      { ts: now(), level: issues.length > 0 ? "ERROR" : "SUCCESS", msg: issues.length > 0 ? `Ingest HALTED — ${issues.length} issue(s) detected` : `Ingest PASSED — proceeding to extraction` },
    ];
    results[c.claim_id] = { status: issues.length > 0 ? "NEEDS_RESUBMISSION" : "READY", issues, memberFound: !!member, documentsChecked: c.documents.length, requiredDocs: required, uploadedTypes: uploaded, duplicates, ingestLogs };
  }
  return results;
} 

function runAgent2(claims, a1R) {
  const results = {};
  for (const c of claims) {
    const a1 = a1R[c.claim_id];
    if (!a1 || a1.status !== "READY") { results[c.claim_id] = { status: "SKIPPED", skippedReason: "Did not pass Agent 1 — document ingest failed" }; continue; }
    const extractedFields = [];
    for (const doc of c.documents) {
      if (doc.type === "PRESCRIPTION") {
        extractedFields.push({ doc: doc.name, docId: doc.file_id, type: "PRESCRIPTION", fields: [
          { field: "Doctor Name", value: doc.doctor, confidence: 0.97 },
          { field: "Registration No.", value: doc.reg, confidence: 0.95, validated: /^[A-Z]{2}\/\d{5}\/\d{4}$/.test(doc.reg) },
          { field: "Patient Name", value: doc.patient, confidence: 0.96 },
          { field: "Date", value: doc.date, confidence: 0.99 },
          { field: "Diagnosis", value: doc.diagnosis, confidence: 0.93 },
          { field: "Medicines", value: (doc.medicines || []).join("; "), confidence: 0.91 }
        ]});
      }
      if (doc.type === "HOSPITAL_BILL") {
        const items = doc.items || [];
        extractedFields.push({ doc: doc.name, docId: doc.file_id, type: "HOSPITAL_BILL", fields: [
          { field: "Hospital", value: doc.hospital, confidence: 0.98 },
          { field: "Patient Name", value: doc.patient, confidence: 0.97 },
          { field: "Date", value: doc.date, confidence: 0.99 },
          { field: "Line Items", value: items.map(it => `${it.desc}: ${fmt(it.amt)}`).join("; "), confidence: 0.95 },
          { field: "Total Amount", value: fmt(doc.total), confidence: 0.99 },
          { field: "GSTIN", value: doc.gstin || "Not present", confidence: doc.gstin ? 0.98 : 0.60 }
        ]});
      }
    }
    const allFields = extractedFields.flatMap(ef => ef.fields);
    const avgConf = allFields.reduce((a,b)=>a+b.confidence,0) / Math.max(1, allFields.length);
    const lowConfFields = allFields.filter(f => f.confidence < 0.75);
    const unclear = avgConf < 0.70 || lowConfFields.length > 2;
    results[c.claim_id] = { status: unclear ? "UNCLEAR_DOCUMENT" : "EXTRACTED", confidence: avgConf, extractedFields, lowConfFields, unclearReason: unclear ? `Average extraction confidence is ${Math.round(avgConf*100)}%. ${lowConfFields.length} field(s) have low confidence.` : null };
  }
  return results;
}

function runAgent3(claims, a1R, a2R) {
  const results = {};
  for (const c of claims) {
    const a1 = a1R[c.claim_id], a2 = a2R[c.claim_id];
    if (!a1 || a1.status !== "READY" || !a2 || a2.status === "SKIPPED") { results[c.claim_id] = { status: "SKIPPED", skippedReason: "Upstream agent did not pass" }; continue; }
    const checks = []; let fraudScore = 0.1; const flags = [], proof = [];
    checks.push({ label: "Minimum claim amount", value: fmt(c.claimed_amount), threshold: "≥ ₹500", result: c.claimed_amount >= 500 ? "PASS" : "FAIL" });
    if (c.claimed_amount < 500) { fraudScore += 0.1; flags.push("Below minimum claim threshold"); proof.push({ evidence: "Claimed amount", found: fmt(c.claimed_amount), expected: "≥ ₹500" }); }
    const daysSince = daysBetween(c.date_of_service, c.submitted);
    checks.push({ label: "Submission within 30 days", value: `${daysSince} days`, threshold: "≤ 30 days", result: daysSince <= 30 ? "PASS" : "FAIL" });
    if (daysSince > 30) { fraudScore += 0.2; flags.push("Late submission"); proof.push({ evidence: "Submission delay", found: `${daysSince} days`, expected: "≤ 30 days", impact: "Late submission increases fraud signal weight (+0.20)" }); }
    const sameDayCount = (c.existing_claims_today || []).length + 1;
    const sameDayResult = sameDayCount > POLICY.fraud_thresholds.same_day_claims_limit ? "FAIL" : "PASS";
    checks.push({ label: "Same-day claims count", value: `${sameDayCount} claims today`, threshold: `≤ ${POLICY.fraud_thresholds.same_day_claims_limit}`, result: sameDayResult });
    if (sameDayResult === "FAIL") { fraudScore += 0.45; flags.push(`${sameDayCount} claims on same day (limit: ${POLICY.fraud_thresholds.same_day_claims_limit})`); proof.push({ evidence: "Same-day claim count", found: `${sameDayCount} claims`, expected: `≤ ${POLICY.fraud_thresholds.same_day_claims_limit}`, impact: "High-risk pattern — major fraud signal (+0.45)", relatedClaims: c.existing_claims_today }); }
    const highValue = c.claimed_amount > POLICY.fraud_thresholds.auto_manual_review_above;
    checks.push({ label: "High-value claim flag", value: fmt(c.claimed_amount), threshold: `> ${fmt(POLICY.fraud_thresholds.auto_manual_review_above)} triggers review`, result: highValue ? "FLAG" : "PASS" });
    if (highValue) { fraudScore += 0.15; flags.push("Exceeds auto-review threshold"); proof.push({ evidence: "Claim value", found: fmt(c.claimed_amount), expected: `≤ ${fmt(POLICY.fraud_thresholds.auto_manual_review_above)} for auto-processing`, impact: "+0.15 to fraud score" }); }
    const rxDocs = c.documents.filter(d => d.type === "PRESCRIPTION");
    const regValid = rxDocs.every(d => /^[A-Z]{2}\/\d{5}\/\d{4}$/.test(d.reg || ""));
    checks.push({ label: "Doctor registration format", value: rxDocs.map(d=>d.reg).join(", ") || "N/A", threshold: "State/XXXXX/YYYY", result: regValid ? "PASS" : rxDocs.length === 0 ? "PASS" : "FAIL" });
    if (!regValid && rxDocs.length > 0) { fraudScore += 0.2; flags.push("Invalid doctor registration format"); proof.push({ evidence: "Registration number", found: rxDocs.map(d=>d.reg).join(", "), expected: "Format: KA/12345/2015", impact: "+0.20 fraud signal" }); }
    fraudScore = Math.min(0.99, fraudScore);
    const manualTrigger = fraudScore > POLICY.fraud_thresholds.fraud_score_manual_review_threshold || sameDayResult === "FAIL";
    results[c.claim_id] = { status: manualTrigger ? "MANUAL_REVIEW" : "RISK_CLEARED", fraudScore, flags, checks, proof, manualTrigger, manualReason: manualTrigger ? (sameDayResult === "FAIL" ? `Same-day claim pattern exceeded policy limit. ${sameDayCount} claims detected on ${c.date_of_service}.` : `Fraud risk score ${Math.round(fraudScore*100)}% exceeds automatic threshold of ${Math.round(POLICY.fraud_thresholds.fraud_score_manual_review_threshold*100)}%.`) : null };
  }
  return results;
}

function runAgent4(claims, a1R, a2R, a3R) {
  const results = {};
  for (const c of claims) {
    const a3 = a3R[c.claim_id];
    if (!a3 || a3.status === "SKIPPED" || a3.status === "MANUAL_REVIEW") {
      results[c.claim_id] = { status: "SKIPPED", skippedReason: a3?.status === "MANUAL_REVIEW" ? "Routed to manual review — awaiting ops validation" : "Upstream agent did not pass" }; continue;
    }

    // TC011: Graceful degradation — if simulate_component_failure flag is set, mark degraded but continue
    const componentFailed = !!(c.simulate_component_failure);
    let degradedNote = null;
    if (componentFailed) {
      degradedNote = "⚠ Risk scoring component failed and was skipped. Decision confidence is reduced. Manual review is recommended to compensate for incomplete processing.";
    }
    const member = POLICY.members.find(m => m.member_id === c.member_id);
    const checks = [], failures = [], proofLines = [];
    checks.push({ label: "Member in enrollment", value: c.member_id, threshold: "Valid member ID", result: member ? "PASS" : "FAIL" });
    if (!member) { results[c.claim_id] = { status: "REJECTED", approvedAmount: 0, failures: ["Member not found in enrollment system"], checks, rejectionReasonCode: "MEMBER_NOT_FOUND", rejectionDetail: `Member ID ${c.member_id} does not exist in the enrollment database. Please verify the member ID and resubmit.`, proofLines: [{ label: "Member ID Checked", value: c.member_id, outcome: "NOT FOUND in PLUM_GHI_2024 enrollment" }] }; continue; }
    const daysAfterJoin = daysBetween(member.join_date, c.date_of_service);
    checks.push({ label: "Initial 30-day waiting period", value: `${daysAfterJoin} days post-join`, threshold: "≥ 30 days", result: daysAfterJoin >= 30 ? "PASS" : "FAIL" });
    if (daysAfterJoin < 30) { failures.push(`Initial waiting period not met (${daysAfterJoin}/30 days)`); proofLines.push({ label: "Join Date", value: member.join_date, outcome: `Only ${daysAfterJoin} days elapsed before treatment — minimum 30 required` }); }
    const diag = c.diagnosis.toLowerCase();
    if (["diabetes","t2dm","metformin","glimepiride"].some(k => diag.includes(k))) {
      const wp = POLICY.waiting_periods.specific.diabetes;
      const eligible = daysAfterJoin >= wp;
      const eligFrom = new Date(new Date(member.join_date).getTime() + wp * 86400000).toISOString().split("T")[0];
      checks.push({ label: "Pre-existing: Diabetes waiting period", value: `${daysAfterJoin} days`, threshold: `≥ ${wp} days (eligible from ${eligFrom})`, result: eligible ? "PASS" : "FAIL", note: eligible ? "" : `Eligible from ${eligFrom}` });
      if (!eligible) { failures.push(`Diabetes waiting period not met. Eligible from ${eligFrom}`); proofLines.push({ label: "Diabetes Waiting Period", value: `${wp} days required`, outcome: `Treatment on ${c.date_of_service} — eligible from ${eligFrom}. ${wp - daysAfterJoin} days remaining.` }); }
    }
    ["whitening","cosmetic","bariatric","obesity"].forEach(kw => {
      const inDiag = diag.includes(kw);
      const inItems = c.documents.some(d => (d.items||[]).some(it => (it.desc||"").toLowerCase().includes(kw)));
      if (inDiag || inItems) {
        checks.push({ label: `Exclusion: ${kw}`, value: `Contains "${kw}"`, threshold: "Policy exclusions list", result: "FAIL" });
        failures.push(`Excluded procedure/condition: "${kw}"`);
        proofLines.push({ label: `Policy Exclusion — ${kw}`, value: inItems ? "Found in bill line items" : "Found in diagnosis", outcome: `Policy ref: Exclusions § "${kw[0].toUpperCase()+kw.slice(1)}"` });
      }
    });
    const cat = POLICY.opd_categories[c.claim_type] || {};
    checks.push({ label: "Annual OPD limit", value: `YTD used: ${fmt(c.ytd_used||0)}`, threshold: `≤ ${fmt(POLICY.coverage.annual_opd_limit)}`, result: (c.ytd_used||0) < POLICY.coverage.annual_opd_limit ? "PASS" : "FAIL" });
    if ((c.ytd_used||0) >= POLICY.coverage.annual_opd_limit) { failures.push(`Annual OPD limit of ${fmt(POLICY.coverage.annual_opd_limit)} already reached. YTD used: ${fmt(c.ytd_used||0)}.`); proofLines.push({ label: "Annual OPD Limit", value: fmt(c.ytd_used||0), outcome: `Limit of ${fmt(POLICY.coverage.annual_opd_limit)} reached — no further reimbursement this year.` }); }

    // TC008: Per-claim limit check — reject before discount/copay if claimed amount exceeds per-claim cap
    const perClaimLimit = POLICY.coverage.per_claim_limit;
    checks.push({ label: "Per-claim limit", value: fmt(c.claimed_amount), threshold: `≤ ${fmt(perClaimLimit)}`, result: c.claimed_amount <= perClaimLimit ? "PASS" : "FAIL" });
    if (c.claimed_amount > perClaimLimit) {
      failures.push(`Claimed amount ${fmt(c.claimed_amount)} exceeds per-claim limit of ${fmt(perClaimLimit)}. Only ${fmt(perClaimLimit)} can be reimbursed per claim.`);
      proofLines.push({ label: "Per-Claim Limit", value: fmt(c.claimed_amount), outcome: `Exceeds per-claim cap of ${fmt(perClaimLimit)}. Claim rejected — please split or resubmit within limit.` });
    }

    // TC007: Pre-authorization check for high-value diagnostic tests
    if (c.claim_type === "DIAGNOSTIC" && cat.pre_auth_threshold) {
      const highValueTests = cat.high_value_tests || [];
      const billItems = c.documents.flatMap(d => d.items || []);
      const requiresPreAuth = c.claimed_amount >= cat.pre_auth_threshold ||
        billItems.some(it => highValueTests.some(hvt => it.desc.toLowerCase().includes(hvt.toLowerCase())));
      const hasPreAuth = !!(c.pre_auth_ref || c.pre_authorization_ref);
      checks.push({ label: "Pre-authorization for high-value diagnostic", value: requiresPreAuth ? "Required" : "Not required", threshold: `Mandatory for ${highValueTests.join(", ")} or claims ≥ ${fmt(cat.pre_auth_threshold)}`, result: !requiresPreAuth ? "PASS" : hasPreAuth ? "PASS" : "FAIL" });
      if (requiresPreAuth && !hasPreAuth) {
        const matchedTests = billItems.filter(it => highValueTests.some(hvt => it.desc.toLowerCase().includes(hvt.toLowerCase()))).map(it => it.desc);
        failures.push(`Pre-authorization required for ${matchedTests.length > 0 ? matchedTests.join(", ") : "this diagnostic test"} (claim value ≥ ${fmt(cat.pre_auth_threshold)}) but was not obtained. To resubmit, obtain a pre-authorization reference from ICICI Lombard before the procedure, then include the reference number with your claim.`);
        proofLines.push({ label: "Pre-Authorization", value: "NOT OBTAINED", outcome: `Policy mandates pre-auth for ${highValueTests.join("/")} and claims ≥ ${fmt(cat.pre_auth_threshold)}. Claim rejected — PRE_AUTH_MISSING.` });
      }
    }

    const isNetwork = POLICY.network_hospitals.some(h => (c.hospital||"").toLowerCase().includes(h.toLowerCase()));
    const networkDiscount = isNetwork ? (cat.network_discount_percent||0) : 0;
    // TC010: Network discount must be applied BEFORE co-pay (correct order already)
    const afterNetwork = c.claimed_amount * (1 - networkDiscount / 100);
    const copayAmt = afterNetwork * ((cat.copay_percent||0) / 100);
    const afterCopay = afterNetwork - copayAmt;
    const subLimit = cat.sub_limit || perClaimLimit;
    let dentalPartial = null;
    if (c.claim_type === "DENTAL") {
      let coveredAmt = 0, excludedAmt = 0; const lineDetails = [];
      for (const doc of c.documents) {
        for (const item of doc.items || []) {
          const isCov = (cat.covered_procedures||[]).some(p => item.desc.toLowerCase().includes(p.toLowerCase()));
          const isExcl = (cat.excluded_procedures||[]).some(p => item.desc.toLowerCase().includes(p.toLowerCase()));
          if (isExcl) { excludedAmt += item.amt; lineDetails.push({ ...item, status: "EXCLUDED", reason: "Cosmetic dental procedure — not covered under PLUM_GHI_2024" }); }
          else { coveredAmt += item.amt; lineDetails.push({ ...item, status: "COVERED", reason: "Medically necessary dental procedure — covered" }); }
        }
      }
      dentalPartial = { coveredAmt, excludedAmt, lineDetails };
    }
    // TC006: Dental approved amount uses sub_limit, not global per_claim_limit
    const dentalApprovedBase = dentalPartial ? Math.min(dentalPartial.coveredAmt, subLimit) : null;
    const approvedBase = dentalPartial ? dentalApprovedBase : Math.min(afterCopay, subLimit);
    // Do NOT apply per_claim_limit again — sub_limit already represents the category cap
    const finalApproved = approvedBase;
    if (isNetwork && networkDiscount > 0) proofLines.push({ label: "Network Discount", value: `${networkDiscount}% applied`, outcome: `${c.hospital} is a registered network provider — ${networkDiscount}% discount = ${fmt(c.claimed_amount * networkDiscount / 100)}` });
    if (cat.copay_percent > 0) proofLines.push({ label: "Co-pay", value: `${cat.copay_percent}% of ${fmt(afterNetwork)}`, outcome: `Member co-pay = ${fmt(copayAmt)} (applied after network discount)` });
    const hasPartial = dentalPartial?.excludedAmt > 0;
    const finalStatus = failures.length > 0 ? "REJECTED" : hasPartial ? "PARTIAL" : "APPROVED";
    const rejCode = failures.length > 0 ? (failures.some(f=>f.includes("waiting")||f.includes("Waiting")) ? "WAITING_PERIOD_NOT_MET" : failures.some(f=>f.includes("xcluded")) ? "POLICY_EXCLUSION" : failures.some(f=>f.includes("Pre-authorization")||f.includes("pre-auth")) ? "PRE_AUTH_MISSING" : failures.some(f=>f.includes("per-claim limit")||f.includes("Per-Claim")) ? "PER_CLAIM_EXCEEDED" : "POLICY_VIOLATION") : null;
    results[c.claim_id] = { status: finalStatus, approvedAmount: failures.length > 0 ? 0 : finalApproved, copayAmount: copayAmt, networkDiscount: c.claimed_amount * networkDiscount / 100, isNetwork, dentalPartial, failures, checks, proofLines, rejectionReasonCode: rejCode, rejectionDetail: failures.length > 0 ? `This claim was rejected for the following policy reason(s):\n${failures.map(f=>`• ${f}`).join("\n")}` : null, componentFailed, degradedNote };
  }
  return results;
}

function runAgent5(claims, a1R, a2R, a3R, a4R) {
  const results = {};
  for (const c of claims) {
    const a3 = a3R[c.claim_id], a4 = a4R[c.claim_id];
    if (a3?.status === "MANUAL_REVIEW") {
      results[c.claim_id] = { decision: "MANUAL_REVIEW", approved: 0, copay: 0, planPays: 0, confidence: 0.62, fraudScore: a3?.fraudScore, flags: a3?.flags, manualReason: a3?.manualReason };
      continue;
    }
    if (!a4 || a4.status === "SKIPPED") {
      results[c.claim_id] = { decision: "NEEDS_RESUBMISSION", approved: 0, copay: 0, planPays: 0, confidence: 0 }; continue;
    }
    const decision = a4.status;
    const approved = a4.approvedAmount || 0;
    const copay = a4.copayAmount || 0;
    // FIX: planPays = approved (copay is member liability, already deducted from approved for non-dental)
    // For dental partial: approved = covered procedures only; planPays = approved (no copay on dental)
    const planPays = approved;
    const networkSaving = a4.networkDiscount || 0;
    // TC011: Reduce confidence if a component failed
    const componentFailed = !!(a4.componentFailed);
    const baseConfidence = decision === "APPROVED" ? 0.92 : decision === "PARTIAL" ? 0.88 : 0.95;
    const confidence = componentFailed ? Math.max(0.55, baseConfidence - 0.30) : baseConfidence;
    const eobLines = [];
    const catCfg = POLICY.opd_categories[c.claim_type] || {};
    if (networkSaving > 0) eobLines.push({ label: `Network discount (${catCfg.network_discount_percent||0}%)`, value: `-${fmt(networkSaving)}`, type: "discount" });
    if (copay > 0) eobLines.push({ label: `Co-pay (${catCfg.copay_percent||0}% ${c.claim_type.toLowerCase()})`, value: `-${fmt(copay)}`, type: "copay" });
    if (a4.dentalPartial?.excludedAmt > 0) eobLines.push({ label: "Excluded cosmetic procedures", value: `-${fmt(a4.dentalPartial.excludedAmt)}`, type: "exclusion" });
    results[c.claim_id] = { decision, approved, copay, planPays, networkSaving, confidence, componentFailed, degradedNote: a4.degradedNote, dentalPartial: a4.dentalPartial, failures: a4.failures, isNetwork: a4.isNetwork, rejectionReasonCode: a4.rejectionReasonCode, rejectionDetail: a4.rejectionDetail, proofLines: a4.proofLines, eobLines, calculationSteps: [
      { label: "Billed amount", value: fmt(c.claimed_amount), type: "base" },
      ...(networkSaving > 0 ? [{ label: `Network discount (${catCfg.network_discount_percent||0}%)`, value: `-${fmt(networkSaving)}`, type: "deduct" }] : []),
      ...(copay > 0 ? [{ label: `Co-pay deducted`, value: `-${fmt(copay)}`, type: "deduct" }] : []),
      ...(a4.dentalPartial?.excludedAmt > 0 ? [{ label: "Excluded (cosmetic)", value: `-${fmt(a4.dentalPartial.excludedAmt)}`, type: "deduct" }] : []),
      { label: "Approved amount", value: fmt(approved), type: "total" },
      { label: "Plan pays", value: fmt(Math.max(0,planPays)), type: "planpays" },
      { label: "Member liability", value: fmt(copay + (a4.dentalPartial?.excludedAmt||0)), type: "member" },
    ] };
  }
  return results;
}

/* ── SYNC HELPER ─────────────────────────────────────────────── */
function buildSyncRecord(claim, agentResults, hitlActions) {
  const a5 = agentResults[4]?.[claim.claim_id];
  const a3 = agentResults[2]?.[claim.claim_id];
  const a1 = agentResults[0]?.[claim.claim_id];
  const hitl = hitlActions[claim.claim_id] || {};
  const finalDecision = hitl.adjDecision || (a5?.decision) || claim.status;
  const agentStage = a5 ? "Adjudication" : agentResults[3]?.[claim.claim_id] ? "Policy Engine" : a3 ? "Risk & Integrity" : agentResults[1]?.[claim.claim_id] ? "Extraction" : a1 ? "Ingest" : "Not started";
  return {
    claimsSystem: {
      claim_id: claim.claim_id, member_id: claim.member_id, member_name: claim.member_name,
      billed: fmt(claim.claimed_amount), approved: a5 ? fmt(a5.approved) : "—",
      plan_pays: a5 ? fmt(Math.max(0,a5.planPays)) : "—",
      fraud_score: a3 ? `${Math.round((a3.fraudScore||0)*100)}%` : "—",
      status: finalDecision, reason_code: a5?.rejectionReasonCode || hitl.riskReasonCode || "—",
      agent_stage: agentStage, last_updated: now(),
    },
    memberPortal: {
      member_name: claim.member_name, claim_id: claim.claim_id, status: finalDecision,
      notification: hitl.resubmitSent ? "Resubmission request sent to member" : hitl.adjDecision ? `Claim ${hitl.adjDecision === "APPROVE" ? "approved" : "declined"} by Ops` : finalDecision === "NEEDS_RESUBMISSION" ? "Action required — missing documents" : finalDecision === "MANUAL_REVIEW" ? "Under review — our team will respond in 2 business days" : finalDecision === "APPROVED" ? "Your claim has been approved" : finalDecision === "PARTIAL" ? "Your claim has been partially approved" : finalDecision === "REJECTED" ? "Your claim has been rejected" : "Claim received",
      reason_code: hitl.riskReasonCode || a5?.rejectionReasonCode || "—",
      amount_approved: a5 ? fmt(a5.approved) : "—", last_updated: now(),
    },
    enrollmentSystem: {
      member_id: claim.member_id, member_name: claim.member_name,
      ytd_claimed: fmt(claim.ytd_used + claim.claimed_amount),
      active_claims: 1, join_date: POLICY.members.find(m=>m.member_id===claim.member_id)?.join_date || "—",
      enrollment_status: "ACTIVE", last_sync: now(),
    }
  };
}

/* ══════════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════════ */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Fraunces:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { font-family: 'DM Sans', system-ui, sans-serif; background: #f0f4f9; color: #0b1433; font-size: 13.5px; line-height: 1.5; -webkit-font-smoothing: antialiased; }

  .plum-shell { display: flex; height: 100vh; overflow: hidden; }
  .plum-sidebar { width: 220px; min-width: 220px; background: #0e1b45; display: flex; flex-direction: column; overflow-y: auto; overflow-x: hidden; border-right: 1px solid rgba(255,255,255,0.08); }
  .plum-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  .plum-brand { padding: 20px 16px 16px; border-bottom: 1px solid rgba(255,255,255,0.10); }
  .plum-brand-mark { display: flex; align-items: center; gap: 10px; }
  .plum-brand-logo { width: 32px; height: 32px; background: #7c3aed; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: #fff; font-family:'Fraunces',serif; flex-shrink:0; }
  .plum-brand-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.92); letter-spacing: 0.02em; }
  .plum-brand-sub { font-size: 10px; color: rgba(255,255,255,0.38); text-transform: uppercase; letter-spacing: 0.12em; margin-top: 1px; }

  .plum-nav-section { padding: 14px 10px 4px; }
  .plum-nav-label { font-size: 9.5px; font-weight: 700; color: rgba(255,255,255,0.30); text-transform: uppercase; letter-spacing: 0.14em; padding: 0 6px; margin-bottom: 4px; }
  .plum-nav-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 7px 8px; border-radius: 6px; background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.70); transition: all 0.12s; margin-bottom: 1px; text-align: left; }
  .plum-nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.92); }
  .plum-nav-item.active { background: rgba(124,58,237,0.30); color: #fff; }
  .nav-icon-wrap { font-size: 14px; flex-shrink: 0; width: 18px; text-align: center; }
  .plum-nav-sub { display: block; font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 1px; }
  .plum-nav-footer { margin-top: auto; padding: 14px 16px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 10.5px; color: rgba(255,255,255,0.35); }
  .plum-status-dot-live { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: rgba(255,255,255,0.55); }
  .plum-status-dot-live::before { content:''; width:6px;height:6px;border-radius:50%;background:#60a5fa;box-shadow:0 0 0 2px rgba(96,165,250,0.25); }

  .plum-topbar { height: 52px; background: #0e1b45; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; position: sticky; top: 0; z-index: 50; box-shadow: 0 2px 10px rgba(8,18,47,0.18); }
  .plum-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12.5px; }
  .crumb-root { color: rgba(255,255,255,0.45); }
  .crumb-sep  { color: rgba(255,255,255,0.28); font-size: 14px; }
  .crumb-page { color: rgba(255,255,255,0.92); font-weight: 500; }
  .plum-topbar-right { display: flex; align-items: center; gap: 14px; }
  .sys-status-chip { display:flex;align-items:center;gap:5px;font-size:11.5px;color:rgba(255,255,255,0.55);background:rgba(255,255,255,0.07);padding:4px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.12); }
  .sys-status-chip::before { content:'';width:5px;height:5px;border-radius:50%;background:#60a5fa;box-shadow:0 0 0 2px rgba(96,165,250,0.22); }
  .plum-policy-badge { font-size:11px;color:rgba(255,255,255,0.45);font-family:'JetBrains Mono',monospace; }
  .plum-content { padding: 32px; flex: 1; overflow-y: auto; }

  .card { background:#fff;border:1px solid #dde4ef;border-radius:10px;overflow:hidden; }
  .card-header { display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #e8edf5;background:#f8fafc; }
  .card-title { font-size:13px;font-weight:600;color:#0b1433; }
  .card-meta  { font-size:11.5px;color:#8190a8; }
  .card-body  { padding:20px; }

  .eyebrow { display:inline-flex;align-items:center;gap:8px;font-size:10.5px;letter-spacing:0.12em;text-transform:uppercase;color:#6d28d9;font-weight:600; }
  .eyebrow::before { content:'';width:14px;height:1.5px;background:#7c3aed; }

  .badge { display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;letter-spacing:0.04em;white-space:nowrap; }
  .badge-approved { background:#f0fdf4;color:#14532d; }
  .badge-partial  { background:#fffbeb;color:#78350f; }
  .badge-rejected { background:#fef2f2;color:#991b1b; }
  .badge-manual   { background:#eff6ff;color:#1e3a8a; }
  .badge-pending  { background:#f2f5fa;color:#3a4d7a; }
  .badge-ready    { background:#f0fdf4;color:#14532d; }
  .badge-resubmit { background:#fef2f2;color:#991b1b; }
  .badge-skipped  { background:#f2f5fa;color:#8190a8; }
  .badge-extracted{ background:#eff6ff;color:#1e40af; }
  .badge-risk     { background:#f0fdf4;color:#14532d; }
  .badge-unclear  { background:#fffbeb;color:#92400e; }

  .kpi-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px; }
  .kpi-card { background:#fff;border:1px solid #dde4ef;border-radius:8px;padding:16px; }
  .kpi-label { font-size:11px;color:#8190a8;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:6px; }
  .kpi-value { font-size:26px;font-weight:300;color:#0b1433;font-family:'Fraunces',serif;letter-spacing:-0.02em;line-height:1.1; }
  .kpi-delta { font-size:11.5px;color:#8190a8;margin-top:4px; }

  .data-table { width:100%;border-collapse:collapse;font-size:12.5px; }
  .data-table thead tr { background:#f8fafc; }
  .data-table th { padding:8px 12px;text-align:left;font-size:11px;color:#8190a8;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid #e8edf5;white-space:nowrap; }
  .data-table td { padding:9px 12px;border-bottom:1px solid #f2f5fa;color:#1e3065; }
  .data-table tbody tr:hover { background:#f8fafc; }
  .data-table tbody tr:last-child td { border-bottom:none; }
  .data-table .mono { font-family:'JetBrains Mono',monospace;font-size:11px;color:#5c6d92; }

  .agent-panel { background:#fff;border:1px solid #dde4ef;border-radius:10px;margin-bottom:12px;overflow:hidden;transition:border-color 0.2s ease; }
  .agent-panel.done { border-color:#c4b5fd; }
  .agent-panel-header { display:flex;align-items:center;justify-content:space-between;padding:16px 20px;cursor:default; }
  .agent-panel-left { display:flex;align-items:center;gap:14px; }
  .agent-step-num { width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;transition:all 0.3s ease; }
  .agent-step-num.idle { background:#f2f5fa;color:#a8b4c8; }
  .agent-step-num.done { background:#7c3aed;color:#fff; }
  .agent-step-num.run  { background:#ede9fe;color:#7c3aed;animation:pulse 1s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.6} }
  .agent-name { font-size:14px;font-weight:600;color:#0b1433; }
  .agent-desc { font-size:11.5px;color:#8190a8;margin-top:2px; }

  .btn { padding:8px 18px;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;border:none;transition:all 0.15s; }
  .btn-primary  { background:#7c3aed;color:#fff; }
  .btn-primary:hover  { background:#6d28d9; }
  .btn-primary:disabled { background:#f2f5fa;color:#a8b4c8;cursor:not-allowed; }
  .btn-success  { background:#f0fdf4;color:#14532d;border:1px solid #86efac; }
  .btn-danger   { background:#fef2f2;color:#991b1b;border:1px solid #fca5a5; }
  .btn-danger:hover { background:#fee2e2; }
  .btn-info     { background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe; }
  .btn-ghost    { background:#f2f5fa;color:#3a4d7a; }
  .btn-ghost:hover { background:#e8edf5; }
  .btn-sm { padding:5px 12px;font-size:11.5px; }

  .result-row { border:1px solid #e8edf5;border-radius:8px;margin-bottom:6px;overflow:hidden; }
  .result-row-header { display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;background:#fafbfc;transition:background 0.12s; }
  .result-row-header:hover { background:#f2f5fa; }
  .result-row-left { display:flex;align-items:center;gap:10px; }
  .result-row-body { padding:16px;border-top:1px solid #f2f5fa;background:#fff; }

  .check-table { width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px; }
  .check-table th { padding:5px 8px;text-align:left;font-size:10.5px;color:#8190a8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;background:#f8fafc;border-bottom:1px solid #e8edf5; }
  .check-table td { padding:6px 8px;border-bottom:1px solid #f2f5fa; }
  .check-table tbody tr:last-child td { border-bottom:none; }
  .check-label { color:#5c6d92; }
  .check-note  { font-size:10.5px;color:#8190a8;margin-left:6px; }

  .result-box { border-radius:6px;padding:12px 14px; }
  .result-box.ok   { background:#f0fdf4;border:1px solid #86efac; }
  .result-box.warn { background:#fffbeb;border:1px solid #fcd34d; }
  .result-box.err  { background:#fef2f2;border:1px solid #fca5a5; }
  .result-box.info { background:#eff6ff;border:1px solid #bfdbfe; }
  .result-box-title { font-size:12px;font-weight:600;margin-bottom:5px; }
  .result-box.ok   .result-box-title { color:#14532d; }
  .result-box.warn .result-box-title { color:#78350f; }
  .result-box.err  .result-box-title { color:#991b1b; }
  .result-box.info .result-box-title { color:#1e3a8a; }
  .result-box p { font-size:12px;margin:2px 0; }
  .result-box.ok   p { color:#166534; }
  .result-box.warn p { color:#92400e; }
  .result-box.err  p { color:#b91c1c; }
  .result-box.info p { color:#1d4ed8; }

  /* REASON CARD */
  .reason-card { border-radius:8px;padding:14px 16px;margin-top:12px; }
  .reason-card.fail   { background:#fef2f2;border:1.5px solid #fca5a5; }
  .reason-card.warn   { background:#fffbeb;border:1.5px solid #f59e0b; }
  .reason-card.pass   { background:#f0fdf4;border:1.5px solid #86efac; }
  .reason-card.manual { background:#eff6ff;border:1.5px solid #93c5fd; }
  .reason-card-header { display:flex;align-items:center;gap:8px;margin-bottom:10px; }
  .reason-card-icon { font-size:16px; }
  .reason-card-title { font-size:13px;font-weight:700; }
  .reason-card.fail   .reason-card-title { color:#991b1b; }
  .reason-card.warn   .reason-card-title { color:#92400e; }
  .reason-card.pass   .reason-card-title { color:#14532d; }
  .reason-card.manual .reason-card-title { color:#1e3a8a; }
  .reason-code-chip { font-family:'JetBrains Mono',monospace;font-size:10px;background:rgba(0,0,0,0.06);padding:2px 7px;border-radius:4px;margin-left:auto; }
  .reason-card-body { font-size:12px;line-height:1.6;white-space:pre-line; }
  .reason-card.fail   .reason-card-body { color:#991b1b; }
  .reason-card.warn   .reason-card-body { color:#92400e; }
  .reason-card.pass   .reason-card-body { color:#166534; }
  .reason-card.manual .reason-card-body { color:#1d4ed8; }
  .proof-table { width:100%;border-collapse:collapse;font-size:11.5px;margin-top:10px; }
  .proof-table th { background:#00000008;padding:5px 8px;text-align:left;font-size:10px;color:#8190a8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid rgba(0,0,0,0.08); }
  .proof-table td { padding:6px 8px;border-bottom:1px solid rgba(0,0,0,0.05); }

  /* TERMINAL LOG */
  .terminal-overlay { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(8,18,47,0.82);z-index:200;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease; }
  @keyframes fadeIn { from{opacity:0}to{opacity:1} }
  .terminal-box { background:#0d1117;border:1px solid rgba(255,255,255,0.12);border-radius:12px;width:700px;max-height:480px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.5); }
  .terminal-header { display:flex;align-items:center;padding:12px 16px;background:#161b22;border-bottom:1px solid rgba(255,255,255,0.08);gap:10px; }
  .terminal-dots { display:flex;gap:5px; }
  .terminal-dot { width:10px;height:10px;border-radius:50%; }
  .terminal-title { font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,0.4);flex:1;text-align:center; }
  .terminal-body { flex:1;overflow-y:auto;padding:16px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.7; }
  .log-line { display:flex;gap:12px;margin-bottom:2px;animation:logIn 0.12s ease; }
  @keyframes logIn { from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)} }
  .log-ts   { color:rgba(255,255,255,0.22);flex-shrink:0; }
  .log-INFO    { color:#60a5fa; }
  .log-WARN    { color:#fbbf24; }
  .log-ERROR   { color:#f87171; }
  .log-SUCCESS { color:#4ade80; }
  .terminal-footer { padding:10px 16px;background:#161b22;border-top:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center; }

  /* DOCUMENT PREVIEW */
  .doc-preview-modal { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(8,18,47,0.85);z-index:300;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease; }
  .doc-preview-box { background:#fff;border-radius:12px;width:680px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.4); }
  .doc-preview-header { display:flex;align-items:center;padding:16px 20px;border-bottom:1px solid #e8edf5;background:#f8fafc; }
  .doc-preview-body { flex:1;overflow-y:auto;padding:24px;background:#fff; }
  .doc-preview-paper { background:#fff;border:1px solid #dde4ef;border-radius:6px;padding:24px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.8;color:#0b1433;box-shadow:inset 0 1px 3px rgba(0,0,0,0.04); }
  .doc-section-divider { border:none;border-top:1px dashed #c8d0de;margin:12px 0; }
  .doc-field-row { display:grid;grid-template-columns:140px 1fr;gap:8px;padding:4px 0;border-bottom:1px solid #f2f5fa; }
  .doc-field-label { font-size:10.5px;color:#8190a8;text-transform:uppercase;letter-spacing:0.06em;font-weight:600; }
  .doc-field-value { font-size:12px;color:#0b1433; }

  /* SPLIT PANE (Extraction) */
  .split-pane { display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px; }
  .split-left-label { font-size:10.5px;font-weight:600;color:#8190a8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px; }
  .extraction-field-edit { display:flex;align-items:center;gap:6px; }
  .edit-input { border:1px solid #7c3aed;border-radius:4px;padding:3px 7px;font-size:12px;color:#0b1433;font-family:'DM Sans',sans-serif;outline:none;width:100%; }

  /* SYNC CARD */
  .sync-card { border:1px solid #c4b5fd;border-radius:8px;background:#faf9ff;margin-top:14px;overflow:hidden; }
  .sync-card-header { display:flex;align-items:center;gap:8px;padding:10px 14px;background:#ede9fe;border-bottom:1px solid #c4b5fd; }
  .sync-card-title { font-size:11px;font-weight:700;color:#5b21b6;text-transform:uppercase;letter-spacing:0.08em; }
  .sync-card-body { padding:12px 14px; }
  .sync-row { display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px; }
  .sync-system { }
  .sync-system-name { font-size:10.5px;font-weight:700;color:#5c6d92;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:7px;padding-bottom:5px;border-bottom:1px solid #e8edf5; }
  .sync-field { display:flex;justify-content:space-between;font-size:11.5px;padding:3px 0; }
  .sync-field-key { color:#8190a8; }
  .sync-field-val { color:#0b1433;font-weight:500;font-family:'JetBrains Mono',monospace;font-size:11px; }

  /* HITL */
  .hitl-panel { background:#fffbeb;border:1.5px solid #fcd34d;border-radius:8px;padding:14px 16px;margin-top:12px; }
  .hitl-title { font-size:11.5px;font-weight:700;color:#78350f;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;display:flex;align-items:center;gap:6px; }
  .hitl-actions { display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px; }
  .reason-select { border:1px solid #dde4ef;border-radius:6px;padding:6px 10px;font-size:12px;color:#0b1433;background:#fff;outline:none;font-family:'DM Sans',sans-serif; }
  .hitl-done { background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 14px;margin-top:12px; }

  /* EOB */
  .eob-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px; }
  .eob-tile { background:#f8fafc;border:1px solid #e8edf5;border-radius:6px;padding:10px 14px; }
  .eob-tile.highlight { background:#f0fdf4;border-color:#86efac; }
  .eob-tile-label { font-size:11px;color:#8190a8;margin-bottom:4px; }
  .eob-tile-value { font-size:20px;font-weight:500;color:#0b1433;font-family:'Fraunces',serif; }
  .eob-tile.highlight .eob-tile-value { color:#14532d; }

  .calc-table { width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:12px; }
  .calc-table td { padding:7px 10px;border-bottom:1px solid #f2f5fa; }
  .calc-table tr:last-child td { border-bottom:none; }

  /* ARCH */
  .arch-diagram { display:flex;align-items:center;gap:0;padding:16px 0;overflow-x:auto; }
  .arch-node { flex:1;min-width:110px;border-radius:8px;padding:12px 14px;border:1.5px solid transparent; }
  .arch-node-title { font-size:12px;font-weight:600;margin-bottom:3px; }
  .arch-node-sub   { font-size:11px;line-height:1.4; }
  .arch-arrow { padding:0 6px;color:#c8d0de;font-size:18px;flex-shrink:0; }

  .settings-grid { display:grid;grid-template-columns:1fr 1fr;gap:20px; }
  .sys-connection { border:1px solid #e8edf5;border-radius:8px;padding:14px 16px;margin-bottom:10px; }
  .form-label { font-size:11.5px;color:#5c6d92;display:block;margin-bottom:5px; }
  .form-input { width:100%;padding:7px 10px;border:1px solid #dde4ef;border-radius:6px;font-size:13px;color:#0b1433;background:#fff;outline:none;font-family:'JetBrains Mono',monospace;transition:border-color 0.15s; }
  .form-input:focus { border-color:#7c3aed; }

  .manual-banner { background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;margin-bottom:20px; }
  .manual-banner-title { font-size:11px;font-weight:600;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;display:flex;align-items:center;gap:6px; }
  .manual-item { background:#fff;border:1px solid #dde4ef;border-radius:6px;padding:10px 14px;margin-bottom:6px;display:flex;align-items:center;gap:14px;font-size:12.5px; }

  .coverage-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px; }
  .cov-tile { background:#fff;border:1px solid #dde4ef;border-radius:8px;padding:14px; }
  .cov-tile-name { font-size:11.5px;font-weight:600;color:#0b1433;margin-bottom:4px; }
  .cov-tile-limit { font-size:18px;font-weight:500;color:#7c3aed;font-family:'Fraunces',serif; }
  .cov-tile-detail { font-size:11px;color:#8190a8;margin-top:2px; }

  .spinner { width:12px;height:12px;border:1.5px solid #e8edf5;border-top-color:#7c3aed;border-radius:50%;animation:spin 0.65s linear infinite;display:inline-block;margin-right:6px;vertical-align:middle; }
  @keyframes spin { to{transform:rotate(360deg)} }
  .scan-bar { height:2px;background:#e8edf5;border-radius:999px;overflow:hidden;margin-top:8px; }
  .scan-bar::after { content:"";display:block;height:100%;width:35%;background:linear-gradient(90deg,transparent 0%,#7c3aed 50%,transparent 100%);animation:scan 1.3s ease-in-out infinite; }
  @keyframes scan { 0%{transform:translateX(-200%)}100%{transform:translateX(500%)} }

  .divider { height:1px;background:#e8edf5;margin:16px 0; }
  .section-label { font-size:10.5px;font-weight:600;color:#8190a8;text-transform:uppercase;letter-spacing:0.10em;margin-bottom:12px; }
  .confidence-bar-wrap { display:flex;align-items:center;gap:8px; }
  .confidence-bar { flex:1;height:4px;background:#e8edf5;border-radius:999px;overflow:hidden; }
  .confidence-bar-fill { height:100%;border-radius:999px; }
  .conf-high { background:#7c3aed; }
  .conf-mid  { background:#f59e0b; }
  .conf-low  { background:#ef4444; }

  .workflow-graph { display:grid;grid-template-columns:repeat(5,1fr);gap:10px; }
  .workflow-node { background:#fff;border:1px solid #dde4ef;border-radius:8px;padding:14px 12px;position:relative;transition:border-color 0.15s; }
  .workflow-node.done { border-color:#c4b5fd; }
  .workflow-node-num { width:22px;height:22px;border-radius:50%;background:#ede9fe;color:#6d28d9;display:grid;place-items:center;font-size:11px;font-weight:700;margin-bottom:8px;font-family:'JetBrains Mono',monospace; }
  .workflow-node.done .workflow-node-num { background:#7c3aed;color:#fff; }
  .workflow-node-title { font-size:12.5px;font-weight:600;color:#0b1433;margin-bottom:3px; }
  .workflow-node-desc  { font-size:11px;color:#8190a8; }
  .workflow-node:not(:last-child)::after { content:"›";position:absolute;right:-8px;top:50%;transform:translateY(-50%);color:#c8d0de;font-size:16px;font-weight:600; }

  .reference-grid { display:grid;grid-template-columns:repeat(2,1fr);gap:20px; }

  /* Notification dot */
  .notif-dot { width:6px;height:6px;border-radius:50%;background:#ef4444;display:inline-block;margin-left:4px;vertical-align:middle;flex-shrink:0; }

  /* Resubmit button */
  .resubmit-btn { display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#ede9fe;color:#5b21b6;border:1px solid #c4b5fd;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s; }
  .resubmit-btn:hover { background:#ddd6fe; }
`;

/* ── NAV ─────────────────────────────────────────────────────── */
const NAV = [
  { label: "WORKSPACE", items: [
    { id: "overview", label: "Module Overview", sub: "Stats & pipeline", icon: "🏠" },
  ]},
  { label: "SYSTEMS", items: [
    { id: "claims-sys",    label: "Claims System",     sub: "SYS-CPE-01 · Live data",  icon: "📋" },
    { id: "enrollment",    label: "Enrollment System",  sub: "Member & dependent data", icon: "📁" },
    { id: "membership",    label: "Membership Portal",  sub: "TechCorp Solutions",       icon: "👥" },
    { id: "policy",        label: "Policy Engine",      sub: "PLUM_GHI_2024",           icon: "📄" },
  ]},
  { label: "AGENTS", items: [
    { id: "agent-ingest",   label: "Ingest Agent",      sub: "Agent 01 · Document validation", icon: "📥" },
    { id: "agent-extract",  label: "Extraction Agent",  sub: "Agent 02 · LLM data extraction", icon: "🔍" },
    { id: "agent-risk",     label: "Risk & Integrity",  sub: "Agent 03 · Fraud scoring",       icon: "🛡" },
    { id: "agent-policy",   label: "Policy Engine",     sub: "Agent 04 · Eligibility check",   icon: "⚖️" },
    { id: "agent-decision", label: "Adjudication",      sub: "Agent 05 · Final decision",      icon: "✅" },
  ]},
  { label: "CONFIGURATION", items: [
    { id: "settings",   label: "Settings",   sub: "System connections", icon: "⚙️" },
    { id: "audit-log",  label: "Audit Log",  sub: "Full pipeline trace", icon: "🗂️" },
  ]},
];

/* ── BADGE ───────────────────────────────────────────────────── */
function Badge({ status }) {
  const map = {
    APPROVED:            { cls:"badge-approved",  label:"APPROVED" },
    PARTIAL:             { cls:"badge-partial",   label:"PARTIAL" },
    REJECTED:            { cls:"badge-rejected",  label:"REJECTED" },
    MANUAL_REVIEW:       { cls:"badge-manual",    label:"MANUAL REVIEW" },
    PENDING:             { cls:"badge-pending",   label:"PENDING" },
    READY:               { cls:"badge-ready",     label:"READY" },
    NEEDS_RESUBMISSION:  { cls:"badge-resubmit",  label:"NEEDS RESUBMISSION" },
    SKIPPED:             { cls:"badge-skipped",   label:"SKIPPED" },
    EXTRACTED:           { cls:"badge-extracted", label:"EXTRACTED" },
    UNCLEAR_DOCUMENT:    { cls:"badge-unclear",   label:"UNCLEAR DOC" },
    RISK_CLEARED:        { cls:"badge-risk",      label:"RISK CLEARED" },
    PASS:                { cls:"badge-approved",  label:"PASS" },
    FAIL:                { cls:"badge-rejected",  label:"FAIL" },
    FLAG:                { cls:"badge-partial",   label:"FLAG" },
  };
  const s = map[status] || map.PENDING;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

/* ── CHECK ROW ───────────────────────────────────────────────── */
function CheckRow({ label, value, threshold, result, note }) {
  const color = result==="PASS"?"#14532d":result==="FAIL"?"#991b1b":"#78350f";
  const bg    = result==="PASS"?"#f0fdf4":result==="FAIL"?"#fef2f2":"#fffbeb";
  const br    = result==="PASS"?"#86efac":result==="FAIL"?"#fca5a5":"#fcd34d";
  return (
    <tr>
      <td className="check-label">{label}</td>
      <td style={{fontSize:12,color:"#1e3065"}}>{value}</td>
      <td style={{fontSize:11.5,color:"#8190a8"}}>{threshold||"—"}</td>
      <td>
        <span style={{background:bg,color,border:`1px solid ${br}`,padding:"1px 7px",borderRadius:4,fontSize:11,fontWeight:700}}>{result}</span>
        {note && <span className="check-note">{note}</span>}
      </td>
    </tr>
  );
}

/* ── DOCUMENT PREVIEW MODAL ──────────────────────────────────── */
function DocPreviewModal({ doc, onClose }) {
  if (!doc) return null;
  const renderContent = () => {
    if (doc.type === "PRESCRIPTION") return (
      <div className="doc-preview-paper">
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:14}}>{doc.doctor || "Dr. [Name]"}</div>
          <div style={{fontSize:11,color:"#5c6d92"}}>Reg. No: {doc.reg || "—"}</div>
          <div style={{fontSize:11,color:"#5c6d92"}}>Medical Practitioner</div>
        </div>
        <hr className="doc-section-divider"/>
        <div className="doc-field-row"><span className="doc-field-label">Patient</span><span className="doc-field-value">{doc.patient||"—"}</span></div>
        <div className="doc-field-row"><span className="doc-field-label">Date</span><span className="doc-field-value">{doc.date||"—"}</span></div>
        <div className="doc-field-row"><span className="doc-field-label">Diagnosis</span><span className="doc-field-value">{doc.diagnosis||"—"}</span></div>
        <hr className="doc-section-divider"/>
        <div style={{fontWeight:600,fontSize:12,marginBottom:6}}>Rx:</div>
        {(doc.medicines||[]).map((m,i)=><div key={i} style={{fontSize:12,padding:"3px 0",color:"#0b1433"}}>{i+1}. {m}</div>)}
        <hr className="doc-section-divider"/>
        <div style={{fontSize:10,color:"#8190a8",textAlign:"right"}}>[Doctor's Signature]</div>
      </div>
    );
    if (doc.type === "HOSPITAL_BILL") return (
      <div className="doc-preview-paper">
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:14}}>{doc.hospital||"Hospital/Clinic"}</div>
          <div style={{fontSize:11,color:"#5c6d92"}}>GSTIN: {doc.gstin||"N/A"}</div>
        </div>
        <hr className="doc-section-divider"/>
        <div style={{fontWeight:700,fontSize:12,letterSpacing:1,textAlign:"center",marginBottom:12}}>BILL / RECEIPT</div>
        <div className="doc-field-row"><span className="doc-field-label">Patient</span><span className="doc-field-value">{doc.patient||"—"}</span></div>
        <div className="doc-field-row"><span className="doc-field-label">Date</span><span className="doc-field-value">{doc.date||"—"}</span></div>
        <hr className="doc-section-divider"/>
        <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse"}}>
          <thead><tr><th style={{textAlign:"left",padding:"4px 0",borderBottom:"1px solid #dde4ef",fontSize:10.5,color:"#8190a8"}}>Description</th><th style={{textAlign:"right",padding:"4px 0",borderBottom:"1px solid #dde4ef",fontSize:10.5,color:"#8190a8"}}>Amount</th></tr></thead>
          <tbody>{(doc.items||[]).map((it,i)=><tr key={i}><td style={{padding:"4px 0",borderBottom:"1px solid #f2f5fa"}}>{it.desc}</td><td style={{textAlign:"right",padding:"4px 0",borderBottom:"1px solid #f2f5fa"}}>{fmt(it.amt)}</td></tr>)}</tbody>
        </table>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontWeight:700,fontSize:13}}><span>Total</span><span>{fmt(doc.total||0)}</span></div>
      </div>
    );
    return <div className="doc-preview-paper" style={{color:"#8190a8"}}>Document preview not available for type: {doc.type}</div>;
  };
  return (
    <div className="doc-preview-modal" onClick={onClose}>
      <div className="doc-preview-box" onClick={e=>e.stopPropagation()}>
        <div className="doc-preview-header">
          <div>
            <div style={{fontWeight:600,fontSize:13,color:"#0b1433"}}>{doc.name}</div>
            <div style={{fontSize:11,color:"#8190a8",marginTop:2}}>{doc.type} · File ID: {doc.file_id}</div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{marginLeft:"auto"}} onClick={onClose}>✕ Close</button>
        </div>
        <div className="doc-preview-body">{renderContent()}</div>
      </div>
    </div>
  );
}

/* ── TERMINAL LOG OVERLAY ────────────────────────────────────── */
function TerminalOverlay({ logs, claimId, onDone }) {
  const bodyRef = useRef(null);
  const [visibleLogs, setVisibleLogs] = useState([]);
  const [finished, setFinished] = useState(false);
  // Normalize logs once so every entry is guaranteed to have ts, level, msg
  const safeLogs = (logs || []).filter(Boolean).map(l => ({
    ts: l.ts || new Date().toISOString().replace("T"," ").split(".")[0],
    level: l.level || "INFO",
    msg: l.msg || "",
  }));

  useEffect(() => {
    setVisibleLogs([]);
    setFinished(false);
    if (safeLogs.length === 0) {
      setTimeout(() => { setFinished(true); setTimeout(onDone, 600); }, 300);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      if (i < safeLogs.length) {
        const entry = safeLogs[i];
        setVisibleLogs(prev => [...prev, entry]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => { setFinished(true); setTimeout(onDone, 800); }, 400);
      }
    }, 180);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [visibleLogs]);

  return (
    <div className="terminal-overlay">
      <div className="terminal-box">
        <div className="terminal-header">
          <div className="terminal-dots">
            <div className="terminal-dot" style={{background:"#ff5f57"}}/>
            <div className="terminal-dot" style={{background:"#febc2e"}}/>
            <div className="terminal-dot" style={{background:"#28c840"}}/>
          </div>
          <div className="terminal-title">plum-ingest · {claimId}</div>
        </div>
        <div className="terminal-body" ref={bodyRef}>
          {visibleLogs.map((l,i)=>(
            <div key={i} className="log-line">
              <span className="log-ts">{(l.ts||"").split(" ")[1]||"—"}</span>
              <span className={`log-${l.level}`}>[{l.level}]</span>
              <span style={{color:"rgba(255,255,255,0.82)"}}>{l.msg}</span>
            </div>
          ))}
          {!finished && <div className="log-line"><span className="log-ts">—</span><span style={{color:"rgba(255,255,255,0.25)"}}>█</span></div>}
          {finished && <div className="log-line"><span className="log-ts">—</span><span style={{color:"#4ade80"}}>[DONE] Ingest complete</span></div>}
        </div>
        <div className="terminal-footer">
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"rgba(255,255,255,0.35)"}}>Plum Ingest Agent v2.0</span>
          {finished && <span style={{fontSize:11,color:"#4ade80",fontFamily:"'JetBrains Mono',monospace"}}>✓ Complete</span>}
        </div>
      </div>
    </div>
  );
}

/* ── SYNC CARD ───────────────────────────────────────────────── */
function SyncCard({ claim, agentResults, hitlActions }) {
  const [open, setOpen] = useState(false);
  const sync = buildSyncRecord(claim, agentResults, hitlActions);
  return (
    <div className="sync-card">
      <div className="sync-card-header" style={{cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <span style={{fontSize:14}}>🔄</span>
        <span className="sync-card-title">Sync Record — {claim.claim_id}</span>
        <span style={{marginLeft:"auto",fontSize:11,color:"#7c3aed",fontWeight:600}}>{open?"▲ Hide":"▼ Show"} sync data</span>
      </div>
      {open && (
        <div className="sync-card-body">
          <div className="sync-row">
            {[
              { name:"Claims System",     data: sync.claimsSystem },
              { name:"Membership Portal", data: sync.memberPortal },
              { name:"Enrollment System", data: sync.enrollmentSystem },
            ].map(sys=>(
              <div key={sys.name} className="sync-system">
                <div className="sync-system-name">{sys.name}</div>
                {Object.entries(sys.data).map(([k,v])=>(
                  <div key={k} className="sync-field">
                    <span className="sync-field-key">{k.replace(/_/g," ")}</span>
                    <span className="sync-field-val">{String(v).length>22?String(v).slice(0,22)+"…":String(v)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{marginTop:10,fontSize:11,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>✓ Synced at {now()}</div>
        </div>
      )}
    </div>
  );
}

/* ── AGENT RESULT CONTENT ────────────────────────────────────── */
function AgentResultContent({ claim, result, agentIdx, hitlActions, setHitlActions, agentResults }) {
  const [previewDoc, setPreviewDoc] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [hitlReason, setHitlReason] = useState("");
  const [riskAction, setRiskAction] = useState(null);
  const [adjAction, setAdjAction] = useState(null);

  const hitl = hitlActions?.[claim.claim_id] || {};

  if (result.status === "SKIPPED") {
    return <div className="result-box" style={{background:"#f8fafc",border:"1px solid #e8edf5"}}><p style={{color:"#8190a8",fontSize:12}}>Skipped — {result.skippedReason || "upstream agent did not pass"}</p></div>;
  }

  /* ── AGENT 1: INGEST ─────────────────────────────────────── */
  if (agentIdx === 0) {
    const { issues=[], memberFound, documentsChecked, requiredDocs=[], uploadedTypes=[], duplicates=[] } = result;
    const hasIssue = issues.length > 0;
    return (
      <div>
        {/* Document list with preview */}
        <div style={{marginBottom:14}}>
          <div className="section-label">Uploaded Documents</div>
          {claim.documents.map(doc=>(
            <div key={doc.file_id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:"#f8fafc",border:"1px solid #e8edf5",borderRadius:6,marginBottom:5}}>
              <span style={{fontSize:13}}>📄</span>
              <span style={{fontSize:12.5,color:"#0b1433",fontWeight:500,flex:1}}>{doc.name}</span>
              <span style={{fontSize:11,background:"#ede9fe",color:"#5b21b6",padding:"1px 7px",borderRadius:4,fontWeight:600}}>{doc.type}</span>
              <span style={{fontSize:11,color:doc.quality==="UNREADABLE"?"#991b1b":"#14532d",fontWeight:600}}>{doc.quality||"GOOD"}</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setPreviewDoc(doc)}>👁 Preview</button>
            </div>
          ))}
        </div>
        <table className="check-table">
          <thead><tr><th>Check</th><th>Value</th><th>Expected</th><th>Result</th></tr></thead>
          <tbody>
            <CheckRow label="Member in enrollment" value={claim.member_id} threshold="Valid member ID" result={memberFound?"PASS":"FAIL"} />
            <CheckRow label="Documents uploaded" value={`${documentsChecked} files`} threshold={`Min ${requiredDocs.length}`} result={documentsChecked>=requiredDocs.length?"PASS":"FAIL"} />
            {requiredDocs.map(r=>(
              <CheckRow key={r} label={`Required: ${r}`} value={uploadedTypes.includes(r)?"Found":"NOT FOUND"} threshold={r} result={uploadedTypes.includes(r)?"PASS":"FAIL"} />
            ))}
            {duplicates.map(d=>(
              <CheckRow key={d} label={`Duplicate: ${d}`} value="Uploaded 2×" threshold="Exactly 1" result="FAIL" note="Replace with correct document" />
            ))}
          </tbody>
        </table>

        {hasIssue && (
          <div className="reason-card fail">
            <div className="reason-card-header">
              <span className="reason-card-icon">❌</span>
              <span className="reason-card-title">Ingest Failed — Action Required</span>
              <span className="reason-code-chip">ERR_INGEST_FAIL</span>
            </div>
            {issues.map((iss,i)=>(
              <div key={i} style={{marginBottom:8,padding:"8px 10px",background:"rgba(0,0,0,0.04)",borderRadius:5}}>
                <div style={{fontSize:11.5,fontWeight:700,color:"#991b1b",marginBottom:3}}>{iss.code} — {iss.type.replace(/_/g," ")}</div>
                <div className="reason-card-body">{iss.detail}</div>
                <div style={{fontSize:11.5,color:"#7c3aed",marginTop:4,fontWeight:600}}>👉 {iss.action}</div>
              </div>
            ))}
            <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #fca5a5"}}>
              <div style={{fontSize:11.5,color:"#991b1b",fontWeight:600,marginBottom:6}}>Send Resubmission Request to Member</div>
              {hitl.resubmitSent ? (
                <div style={{fontSize:12,color:"#14532d",fontWeight:600}}>✓ Resubmission request sent to {POLICY.members.find(m=>m.member_id===claim.member_id)?.email || "member"}</div>
              ) : (
                <button className="resubmit-btn" onClick={()=>setHitlActions(p=>({...p,[claim.claim_id]:{...p[claim.claim_id],resubmitSent:true}}))}>
                  📤 Send Resubmission Request
                </button>
              )}
            </div>
          </div>
        )}

        {!hasIssue && (
          <div className="result-box ok">
            <p className="result-box-title">✓ Document Check Passed</p>
            <p>All required documents present. Member verified. Claim ingested — proceeding to extraction.</p>
          </div>
        )}

        <SyncCard claim={claim} agentResults={agentResults} hitlActions={hitlActions} />
        {previewDoc && <DocPreviewModal doc={previewDoc} onClose={()=>setPreviewDoc(null)} />}
      </div>
    );
  }

  /* ── AGENT 2: EXTRACTION ─────────────────────────────────── */
  if (agentIdx === 1) {
    const { extractedFields=[], confidence=0, unclearReason } = result;
    const confPct = Math.round(confidence*100);
    const confCls = confPct>=90?"conf-high":confPct>=75?"conf-mid":"conf-low";
    const isUnclear = result.status === "UNCLEAR_DOCUMENT";
    return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <span style={{fontSize:11.5,color:"#8190a8"}}>Avg confidence</span>
          <div className="confidence-bar-wrap" style={{flex:1}}>
            <div className="confidence-bar"><div className={`confidence-bar-fill ${confCls}`} style={{width:`${confPct}%`}}/></div>
          </div>
          <span style={{fontSize:13,fontWeight:600,color:confPct>=90?"#14532d":confPct>=75?"#92400e":"#991b1b"}}>{confPct}%</span>
        </div>

        {/* Split pane: original doc on left, extracted fields on right */}
        {extractedFields.map((ef,i)=>(
          <div key={i} className="split-pane" style={{marginBottom:20}}>
            <div>
              <div className="split-left-label">Original Document — {ef.doc}</div>
              <div style={{border:"1px solid #e8edf5",borderRadius:8,overflow:"hidden",height:"100%"}}>
                <div style={{background:"#f8fafc",padding:"8px 12px",borderBottom:"1px solid #e8edf5",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11.5,fontWeight:600,color:"#0b1433"}}>{ef.type}</span>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setPreviewDoc(claim.documents.find(d=>d.file_id===ef.docId))}>👁 Full Preview</button>
                </div>
                <div style={{padding:12}}>
                  {ef.fields.map((f,j)=>(
                    <div key={j} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f2f5fa",fontSize:12}}>
                      <span style={{color:"#8190a8",minWidth:100}}>{f.field}</span>
                      <span style={{color:"#0b1433",textAlign:"right",maxWidth:180,wordBreak:"break-word"}}>{f.value||"—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="split-left-label" style={{color:"#5b21b6"}}>Extracted Fields — {ef.type}</div>
              <div style={{border:"1px solid #c4b5fd",borderRadius:8,overflow:"hidden"}}>
                <div style={{background:"#ede9fe",padding:"8px 12px",borderBottom:"1px solid #c4b5fd",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11.5,fontWeight:600,color:"#5b21b6"}}>AI Extraction</span>
                  <span style={{fontSize:11,color:"#8190a8"}}>Click ✏ to edit</span>
                </div>
                <table className="check-table" style={{margin:0}}>
                  <thead><tr><th>Field</th><th>Value</th><th>Confidence</th><th></th></tr></thead>
                  <tbody>
                    {ef.fields.map((f,j)=>{
                      const key=`${ef.docId}_${f.field}`;
                      const fc=Math.round(f.confidence*100);
                      const isEditing=editingField===key;
                      return (
                        <tr key={j}>
                          <td className="check-label">{f.field}</td>
                          <td style={{fontSize:12}}>
                            {isEditing ? (
                              <input className="edit-input" defaultValue={editedValues[key]||f.value||""} onBlur={e=>{setEditedValues(p=>({...p,[key]:e.target.value}));setEditingField(null);}} autoFocus/>
                            ) : (
                              <span>{editedValues[key]||f.value||"—"}</span>
                            )}
                            {f.validated===false && <span style={{fontSize:10,color:"#991b1b",marginLeft:6,fontWeight:700}}>FORMAT ERR</span>}
                          </td>
                          <td><span style={{color:fc>90?"#14532d":fc>75?"#92400e":"#991b1b",fontWeight:600,fontSize:12}}>{fc}%</span></td>
                          <td><button style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#7c3aed"}} onClick={()=>setEditingField(isEditing?null:key)}>✏</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

        {isUnclear && (
          <div className="reason-card warn">
            <div className="reason-card-header">
              <span className="reason-card-icon">⚠️</span>
              <span className="reason-card-title">Document Unclear — HITL Action Required</span>
              <span className="reason-code-chip">ERR_LOW_CONFIDENCE</span>
            </div>
            <div className="reason-card-body">{unclearReason}</div>
            <div className="hitl-actions" style={{marginTop:10}}>
              <button className="resubmit-btn" onClick={()=>setHitlActions(p=>({...p,[claim.claim_id]:{...p[claim.claim_id],resubmitSent:true}}))}>
                📤 Request Clearer Document from Member
              </button>
            </div>
          </div>
        )}

        {!isUnclear && <div className="result-box ok"><p>Extraction complete. Average confidence: <strong>{confPct}%</strong>. Proceeding to risk check.</p></div>}

        <SyncCard claim={claim} agentResults={agentResults} hitlActions={hitlActions} />
        {previewDoc && <DocPreviewModal doc={previewDoc} onClose={()=>setPreviewDoc(null)} />}
      </div>
    );
  }

  /* ── AGENT 3: RISK ───────────────────────────────────────── */
  if (agentIdx === 2) {
    const { fraudScore=0, flags=[], checks=[], proof=[], manualTrigger, manualReason } = result;
    const scorePct = Math.round(fraudScore*100);
    const scoreColor = scorePct>80?"#991b1b":scorePct>50?"#92400e":"#14532d";
    const scoreBg    = scorePct>80?"#fef2f2":scorePct>50?"#fffbeb":"#f0fdf4";
    const scoreBr    = scorePct>80?"#fca5a5":scorePct>50?"#fcd34d":"#86efac";
    const savedAction = hitlActions?.[claim.claim_id]?.riskAction;
    const savedCode   = hitlActions?.[claim.claim_id]?.riskReasonCode;

    return (
      <div>
        <table className="check-table">
          <thead><tr><th>Check</th><th>Value</th><th>Threshold</th><th>Result</th></tr></thead>
          <tbody>{checks.map((ch,i)=><CheckRow key={i} {...ch}/>)}</tbody>
        </table>

        <div style={{display:"flex",alignItems:"flex-start",gap:16,padding:"12px 14px",background:scoreBg,border:`1px solid ${scoreBr}`,borderRadius:6,marginTop:10,marginBottom:12}}>
          <div>
            <div style={{fontSize:10.5,color:"#8190a8",marginBottom:2,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Fraud Risk Score</div>
            <div style={{fontSize:28,fontWeight:400,color:scoreColor,fontFamily:"'Fraunces',serif",lineHeight:1.1}}>{scorePct}%</div>
          </div>
          {flags.length>0 && (
            <div style={{flex:1}}>
              <div style={{fontSize:10.5,color:"#8190a8",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Signals Detected</div>
              {flags.map((f,i)=><div key={i} style={{fontSize:12,color:"#3a4d7a",marginBottom:3}}>· {f}</div>)}
            </div>
          )}
          {manualTrigger && <Badge status="MANUAL_REVIEW"/>}
        </div>

        {/* Reason card with proof */}
        <div className={`reason-card ${manualTrigger?"manual":scorePct<40?"pass":"warn"}`}>
          <div className="reason-card-header">
            <span className="reason-card-icon">{manualTrigger?"🔍":scorePct<40?"✅":"⚠️"}</span>
            <span className="reason-card-title">{manualTrigger?"Manual Review Required":scorePct<40?"Risk Check Cleared":"Elevated Risk — Review Recommended"}</span>
            <span className="reason-code-chip">{manualTrigger?"RISK_MANUAL_FLAG":scorePct<40?"RISK_CLEAR":"RISK_ELEVATED"}</span>
          </div>
          <div className="reason-card-body">{manualReason||`Fraud score: ${scorePct}%. ${flags.length>0?"Signals: "+flags.join("; ")+".":"No significant risk signals."} ${scorePct<40?"All checks passed — proceeding to policy evaluation.":""}`}</div>
          {proof.length>0 && (
            <table className="proof-table">
              <thead><tr><th>Evidence</th><th>Found</th><th>Expected / Impact</th></tr></thead>
              <tbody>
                {proof.map((p,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:600,color:"#5c6d92"}}>{p.evidence}</td>
                    <td style={{color:"#991b1b"}}>{p.found}</td>
                    <td style={{color:"#78350f"}}>{p.impact||p.expected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* HITL for manual review */}
        {manualTrigger && !savedAction && (
          <div className="hitl-panel">
            <div className="hitl-title">⚡ HITL Action Required — Ops Validation</div>
            <div style={{fontSize:12.5,color:"#78350f",marginBottom:10}}>This claim requires manual review. Please validate or reject with a reason code.</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
              <select className="reason-select" value={hitlReason} onChange={e=>setHitlReason(e.target.value)}>
                <option value="">Select reason code…</option>
                <option value="RISK_FRAUD_CONFIRMED">RISK_FRAUD_CONFIRMED — Fraud confirmed by ops</option>
                <option value="RISK_FALSE_POSITIVE">RISK_FALSE_POSITIVE — False positive, approved</option>
                <option value="RISK_PATTERN_KNOWN">RISK_PATTERN_KNOWN — Known pattern, low risk</option>
                <option value="RISK_NEEDS_MORE_INFO">RISK_NEEDS_MORE_INFO — More info needed from member</option>
              </select>
            </div>
            <div className="hitl-actions">
              <button className="btn btn-success btn-sm" disabled={!hitlReason} onClick={()=>setHitlActions(p=>({...p,[claim.claim_id]:{...p[claim.claim_id],riskAction:"VALIDATE",riskReasonCode:hitlReason}}))}>✓ Validate Claim</button>
              <button className="btn btn-danger  btn-sm" disabled={!hitlReason} onClick={()=>setHitlActions(p=>({...p,[claim.claim_id]:{...p[claim.claim_id],riskAction:"REJECT",riskReasonCode:hitlReason}}))}>✗ Reject Claim</button>
            </div>
          </div>
        )}
        {savedAction && (
          <div className="hitl-done">
            <div style={{fontWeight:700,fontSize:12,color:savedAction==="VALIDATE"?"#14532d":"#991b1b",marginBottom:4}}>
              {savedAction==="VALIDATE"?"✓ Ops Validated — Claim Approved for processing":"✗ Ops Rejected — Claim Closed"}
            </div>
            <div style={{fontSize:11.5,color:"#5c6d92"}}>Reason Code: <strong>{savedCode}</strong> · Updated in Member Portal and Claims System</div>
          </div>
        )}

        <SyncCard claim={claim} agentResults={agentResults} hitlActions={hitlActions} />
      </div>
    );
  }

  /* ── AGENT 4: POLICY ENGINE ──────────────────────────────── */
  if (agentIdx === 3) {
    const { checks=[], failures=[], approvedAmount=0, dentalPartial, rejectionReasonCode, rejectionDetail, proofLines=[] } = result;
    if (result.status === "SKIPPED") return <div className="result-box" style={{background:"#f8fafc",border:"1px solid #e8edf5"}}><p style={{color:"#8190a8",fontSize:12}}>{result.skippedReason}</p></div>;
    const isRejected = failures.length > 0;
    return (
      <div>
        <table className="check-table">
          <thead><tr><th>Rule</th><th>Input</th><th>Policy Key / Threshold</th><th>Result</th></tr></thead>
          <tbody>{checks.map((ch,i)=><CheckRow key={i} {...ch}/>)}</tbody>
        </table>
        {dentalPartial?.excludedAmt>0 && (
          <div style={{margin:"10px 0"}}>
            <div className="section-label">Line Item Breakdown (Dental)</div>
            {dentalPartial.lineDetails.map((l,i)=>(
              <div key={i} style={{padding:"8px 10px",borderBottom:"1px solid #f2f5fa",fontSize:12,background:l.status==="EXCLUDED"?"#fff5f5":"#f0fdf4",marginBottom:3,borderRadius:4,border:`1px solid ${l.status==="EXCLUDED"?"#fca5a5":"#86efac"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{color:"#3a4d7a",fontWeight:500}}>{l.desc}</span>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <span>{fmt(l.amt)}</span>
                    <Badge status={l.status==="COVERED"?"APPROVED":"REJECTED"}/>
                  </div>
                </div>
                <div style={{fontSize:11,color:l.status==="EXCLUDED"?"#991b1b":"#14532d",marginTop:3}}>{l.reason}</div>
              </div>
            ))}
          </div>
        )}

        {/* Reason card for rejection */}
        {isRejected && (
          <div className="reason-card fail">
            <div className="reason-card-header">
              <span className="reason-card-icon">🚫</span>
              <span className="reason-card-title">Policy Rejection — Detailed Reason</span>
              <span className="reason-code-chip">{rejectionReasonCode||"POLICY_FAIL"}</span>
            </div>
            <div className="reason-card-body">{rejectionDetail}</div>
            {proofLines.length>0 && (
              <table className="proof-table">
                <thead><tr><th>Policy Reference</th><th>Evidence / Value</th><th>Outcome</th></tr></thead>
                <tbody>
                  {proofLines.map((p,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:600,color:"#991b1b"}}>{p.label}</td>
                      <td style={{color:"#78350f"}}>{p.value}</td>
                      <td style={{color:"#5c6d92"}}>{p.outcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!isRejected && (
          <div className="reason-card pass">
            <div className="reason-card-header">
              <span className="reason-card-icon">✅</span>
              <span className="reason-card-title">All Policy Checks Passed</span>
              <span className="reason-code-chip">POLICY_APPROVED</span>
            </div>
            <div className="reason-card-body">All eligibility rules satisfied. Approved base amount: {fmt(approvedAmount)}. Proceeding to adjudication.</div>
            {proofLines.length>0 && (
              <table className="proof-table">
                <thead><tr><th>Calculation</th><th>Detail</th><th>Outcome</th></tr></thead>
                <tbody>
                  {proofLines.map((p,i)=>(
                    <tr key={i}><td style={{fontWeight:600,color:"#14532d"}}>{p.label}</td><td>{p.value}</td><td>{p.outcome}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <SyncCard claim={claim} agentResults={agentResults} hitlActions={hitlActions} />
      </div>
    );
  }

  /* ── AGENT 5: ADJUDICATION ───────────────────────────────── */
  if (agentIdx === 4) {
    const { decision, approved=0, copay=0, planPays=0, networkSaving=0, confidence=0, flags=[], fraudScore=0, dentalPartial, rejectionReasonCode, rejectionDetail, proofLines=[], calculationSteps=[], eobLines=[], componentFailed, degradedNote } = result;
    const confPct = Math.round(confidence*100);
    const savedAdj = hitlActions?.[claim.claim_id]?.adjDecision;
    const savedAdjReason = hitlActions?.[claim.claim_id]?.adjReason;

    if (decision === "MANUAL_REVIEW") {
      return (
        <div>
          <div className="reason-card manual">
            <div className="reason-card-header">
              <span className="reason-card-icon">🔍</span>
              <span className="reason-card-title">Routed to Manual Review Queue</span>
              <span className="reason-code-chip">ADJUD_MANUAL</span>
            </div>
            <div className="reason-card-body">Fraud risk score: {Math.round(fraudScore*100)}%{"\n"}Signals: {flags.join("; ") || "High-risk pattern detected"}{"\n\n"}A claims ops specialist will review within 2 business days.</div>
          </div>
          <SyncCard claim={claim} agentResults={agentResults} hitlActions={hitlActions} />
        </div>
      );
    }
    if (decision === "NEEDS_RESUBMISSION") {
      return (
        <div>
          <div className="reason-card fail">
            <div className="reason-card-header"><span className="reason-card-icon">❌</span><span className="reason-card-title">Document Problem — Claim Halted</span><span className="reason-code-chip">ERR_INGEST_FAIL</span></div>
            <div className="reason-card-body">Document problem detected at Agent 1. Please re-upload with the correct documents.</div>
          </div>
          <SyncCard claim={claim} agentResults={agentResults} hitlActions={hitlActions} />
        </div>
      );
    }

    return (
      <div>
        {/* Full claim details */}
        <div className="card" style={{marginBottom:14}}>
          <div className="card-header"><span className="card-title">Full Claim Details</span><Badge status={savedAdj??(decision)}/></div>
          <div className="card-body">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 20px",fontSize:12.5,marginBottom:12}}>
              {[["Claim ID",claim.claim_id],["Member",claim.member_name],["Claim Type",claim.claim_type],["Date of Service",claim.date_of_service],["Hospital",claim.hospital],["Diagnosis",claim.diagnosis],["Submitted",claim.submitted]].map(([k,v])=>(
                <div key={k} style={{display:"flex",gap:8,borderBottom:"1px solid #f2f5fa",padding:"4px 0"}}>
                  <span style={{color:"#8190a8",minWidth:120}}>{k}</span>
                  <span style={{color:"#0b1433",fontWeight:500}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TC011: Component failure degradation banner */}
        {componentFailed && (
          <div style={{background:"#fffbeb",border:"1.5px solid #f59e0b",borderRadius:8,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"flex-start",gap:10}}>
            <span style={{fontSize:16}}>⚠️</span>
            <div>
              <div style={{fontWeight:700,fontSize:12,color:"#78350f",marginBottom:3}}>Component Failure — Reduced Confidence</div>
              <div style={{fontSize:12,color:"#92400e",lineHeight:1.6}}>{degradedNote}</div>
            </div>
          </div>
        )}

        {/* EOB tiles */}
        <div className="eob-grid">
          <div className="eob-tile"><div className="eob-tile-label">Billed Amount</div><div className="eob-tile-value">{fmt(claim.claimed_amount)}</div></div>
          <div className="eob-tile highlight"><div className="eob-tile-label">Plan Pays</div><div className="eob-tile-value">{fmt(Math.max(0,planPays))}</div></div>
          <div className="eob-tile"><div className="eob-tile-label">Member Liability</div><div className="eob-tile-value">{fmt(copay+(dentalPartial?.excludedAmt||0))}</div></div>
        </div>

        {/* Calculation breakdown */}
        <div style={{border:"1px solid #e8edf5",borderRadius:8,overflow:"hidden",marginBottom:12}}>
          <div style={{background:"#f8fafc",padding:"10px 14px",borderBottom:"1px solid #e8edf5",fontSize:11,fontWeight:700,color:"#5c6d92",textTransform:"uppercase",letterSpacing:"0.08em"}}>Calculation Breakdown</div>
          <table className="calc-table">
            <tbody>
              {calculationSteps.map((step,i)=>(
                <tr key={i} style={{background:step.type==="total"?"#f8fafc":step.type==="planpays"?"#f0fdf4":"#fff",fontWeight:step.type==="total"||step.type==="planpays"||step.type==="member"?600:400}}>
                  <td style={{color:step.type==="deduct"?"#b45309":"#3a4d7a"}}>{step.label}</td>
                  <td style={{textAlign:"right",color:step.type==="deduct"?"#b45309":step.type==="planpays"?"#14532d":"#0b1433",fontFamily:"'Fraunces',serif",fontSize:step.type==="total"||step.type==="planpays"?16:14}}>{step.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{padding:"8px 14px",background:"#f8fafc",borderTop:"1px solid #e8edf5",fontSize:11,color:"#8190a8"}}>Confidence score: {confPct}%</div>
        </div>

        {/* Reason card */}
        {decision==="REJECTED" ? (
          <div className="reason-card fail">
            <div className="reason-card-header">
              <span className="reason-card-icon">🚫</span>
              <span className="reason-card-title">Claim Rejected</span>
              <span className="reason-code-chip">{rejectionReasonCode||"REJECTED"}</span>
            </div>
            <div className="reason-card-body">{rejectionDetail||"Claim rejected by policy engine."}</div>
            {proofLines?.length>0 && (
              <table className="proof-table">
                <thead><tr><th>Policy Reference</th><th>Evidence</th><th>Outcome</th></tr></thead>
                <tbody>{proofLines.map((p,i)=><tr key={i}><td style={{fontWeight:600,color:"#991b1b"}}>{p.label}</td><td>{p.value}</td><td>{p.outcome}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        ) : decision==="PARTIAL" ? (
          <div className="reason-card warn">
            <div className="reason-card-header"><span className="reason-card-icon">⚡</span><span className="reason-card-title">Partial Approval</span><span className="reason-code-chip">PARTIAL_APPROVED</span></div>
            <div className="reason-card-body">{`Covered procedures approved: ${fmt(approved)}\nExcluded (cosmetic): ${fmt(dentalPartial?.excludedAmt||0)}\nCosmetic dental procedures are excluded under PLUM_GHI_2024 policy.`}</div>
          </div>
        ) : (
          <div className="reason-card pass">
            <div className="reason-card-header"><span className="reason-card-icon">✅</span><span className="reason-card-title">Claim Approved</span><span className="reason-code-chip">APPROVED</span></div>
            <div className="reason-card-body">{`All policy checks passed. Plan pays ${fmt(Math.max(0,planPays))} (after ${eobLines.length>0?"deductions applied":"no deductions"}).\nMember co-pay / liability: ${fmt(copay+(dentalPartial?.excludedAmt||0))}`}</div>
          </div>
        )}

        {/* HITL for adjudication */}
        {(decision==="APPROVED"||decision==="PARTIAL") && !savedAdj && (
          <div className="hitl-panel">
            <div className="hitl-title">⚡ HITL — Ops Approval Required Before Disbursement</div>
            <div style={{fontSize:12.5,color:"#78350f",marginBottom:10}}>Review the calculation above and approve or decline this claim before it is finalized.</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
              <select className="reason-select" value={adjAction||""} onChange={e=>setAdjAction(e.target.value)}>
                <option value="">Select action…</option>
                <option value="APPROVE">APPROVE — Confirm and disburse</option>
                <option value="DECLINE">DECLINE — Reject at adjudication</option>
              </select>
              <input className="edit-input" style={{maxWidth:260}} placeholder="Optional reason / notes for ops record…" onBlur={e=>setHitlActions(p=>({...p,[claim.claim_id]:{...p[claim.claim_id],adjNotes:e.target.value}}))} />
            </div>
            <div className="hitl-actions">
              <button className="btn btn-success btn-sm" disabled={!adjAction} onClick={()=>setHitlActions(p=>({...p,[claim.claim_id]:{...p[claim.claim_id],adjDecision:adjAction,adjReason:adjAction==="APPROVE"?"OPS_APPROVED":"OPS_DECLINED"}}))}>
                {adjAction==="APPROVE"?"✓ Approve & Disburse":adjAction==="DECLINE"?"✗ Decline Claim":"Submit Decision"}
              </button>
            </div>
          </div>
        )}
        {savedAdj && (
          <div className="hitl-done">
            <div style={{fontWeight:700,fontSize:12,color:savedAdj==="APPROVE"?"#14532d":"#991b1b",marginBottom:4}}>
              {savedAdj==="APPROVE"?"✓ Ops Approved — Disbursement initiated":"✗ Ops Declined — Claim closed without disbursement"}
            </div>
            <div style={{fontSize:11.5,color:"#5c6d92"}}>Reason Code: <strong>{savedAdjReason}</strong> · Member Portal, Claims System, and Enrollment System updated</div>
          </div>
        )}

        <SyncCard claim={claim} agentResults={agentResults} hitlActions={hitlActions} />
      </div>
    );
  }

  return null;
}

/* ── RESULT ROW (Accordion) ──────────────────────────────────── */
function ResultRow({ claim, agentResult, agentIdx, hitlActions, setHitlActions, agentResults }) {
  const [open, setOpen] = useState(false);
  if (!agentResult) return null;
  const statusToShow = agentResult.status || (agentIdx===4?agentResult.decision:"PENDING");
  return (
    <div className="result-row">
      <div className="result-row-header" onClick={()=>setOpen(!open)}>
        <div className="result-row-left">
          <span className="mono" style={{fontSize:11}}>{claim.claim_id}</span>
          <span style={{fontSize:13,fontWeight:500,color:"#0b1433"}}>{claim.member_name}</span>
          <span style={{fontSize:12,color:"#8190a8"}}>{claim.claim_type} · {fmt(claim.claimed_amount)}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Badge status={statusToShow}/>
          <span style={{color:"#c8d0de",fontSize:12}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open && (
        <div className="result-row-body">
          <AgentResultContent claim={claim} result={agentResult} agentIdx={agentIdx} hitlActions={hitlActions} setHitlActions={setHitlActions} agentResults={agentResults} />
        </div>
      )}
    </div>
  );
}

/* ── INDIVIDUAL AGENT PAGE ───────────────────────────────────── */
function AgentPage({ agentIdx, claims, agentResults, agentRunning, agentDone, runAgent, hitlActions, setHitlActions }) {
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalClaim, setTerminalClaim] = useState(null);
  const [terminalQueue, setTerminalQueue] = useState([]);
  const [terminalIdx, setTerminalIdx] = useState(0);
  const [allDone, setAllDone] = useState(false);

  const AGENTS = [
    { idx:0, name:"Ingest Agent",       desc:"Validates uploaded documents, checks member enrollment, and identifies missing or duplicate files. Terminal log shows real-time ingest progress for each claim.", sub:"Agent 01 · Document Validation" },
    { idx:1, name:"Extraction Agent",   desc:"Uses LLM-powered OCR and structured extraction to pull key fields from prescriptions, hospital bills, and lab reports. Split-pane view shows original vs extracted. Edit any field inline.", sub:"Agent 02 · LLM Data Extraction" },
    { idx:2, name:"Risk & Integrity",   desc:"Scores each claim for fraud risk using rule-based signals. Provides detailed reason cards with supporting proof. Manual review cases routed to HITL ops validation.", sub:"Agent 03 · Fraud Scoring" },
    { idx:3, name:"Policy Engine",      desc:"Applies full policy rules: waiting periods, annual limits, per-claim caps, co-pays, network discounts, and categorical exclusions. Reason cards include policy references and proof.", sub:"Agent 04 · Eligibility & Adjudication" },
    { idx:4, name:"Adjudication Agent", desc:"Produces the final decision with full calculation breakdown. HITL action required before disbursement. All decisions sync to Claims System, Membership Portal, and Enrollment System.", sub:"Agent 05 · Final Decision" },
  ];
  const agent = AGENTS[agentIdx];
  const done = agentDone[agentIdx];
  const running = agentRunning[agentIdx];
  const prevDone = agentIdx===0||agentDone[agentIdx-1];

  const handleRun = async () => {
    if (agentIdx === 0) {
      // Show terminal for each claim sequentially
      const a1results = runAgent1(claims);
      setTerminalQueue(claims.map(c=>({claim:c, logs:a1results[c.claim_id].ingestLogs})));
      setTerminalIdx(0);
      setAllDone(false);
      setShowTerminal(true);
    }
    runAgent(agentIdx);
  };

  const handleTerminalDone = () => {
    setTerminalIdx(prev => {
      const nextIdx = prev + 1;
      if (nextIdx >= terminalQueue.length) {
        setShowTerminal(false);
        return prev;
      }
      return nextIdx;
    });
  };

  const currentTerminal = terminalQueue[terminalIdx];

  return (
    <div>
      {showTerminal && currentTerminal && (
        <TerminalOverlay logs={currentTerminal.logs} claimId={currentTerminal.claim.claim_id} onDone={handleTerminalDone} />
      )}

      <div style={{marginBottom:24}}>
        <div className="eyebrow" style={{marginBottom:10}}>{agent.sub}</div>
        <h1 style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",letterSpacing:"-0.015em",color:"#0b1433",marginBottom:8}}>{agent.name}</h1>
        <p style={{fontSize:13.5,color:"#5c6d92",maxWidth:700,lineHeight:1.65}}>{agent.desc}</p>
      </div>

      <div style={{display:"flex",gap:12,marginBottom:24}}>
        <button className={`btn ${done?"btn-success":prevDone&&!running?"btn-primary":"btn-ghost"}`} onClick={handleRun} disabled={running||!prevDone}>
          {running?<><span className="spinner"/>Running Agent…</>:done?"Re-run Agent":"Run Agent →"}
        </button>
        {!prevDone&&<span style={{fontSize:12.5,color:"#8190a8",alignSelf:"center"}}>Complete Agent {agentIdx} first</span>}
      </div>

      {running && (
        <div className="card" style={{marginBottom:16}}>
          <div className="card-body" style={{padding:20}}>
            <div className="section-label">Processing {claims.length} claims…</div>
            <div className="scan-bar" style={{marginTop:12}}/>
          </div>
        </div>
      )}

      {done && (
        <div>
          <div className="section-label" style={{marginBottom:12}}>Results — {claims.length} Claims</div>
          {claims.map(c=>(
            <ResultRow key={c.claim_id} claim={c} agentResult={agentResults[agentIdx]?.[c.claim_id]} agentIdx={agentIdx} hitlActions={hitlActions} setHitlActions={setHitlActions} agentResults={agentResults} />
          ))}
        </div>
      )}

      {!done&&!running&&(
        <div style={{background:"#f8fafc",border:"1px dashed #c8d0de",borderRadius:10,padding:40,textAlign:"center"}}>
          <div style={{fontSize:13,color:"#8190a8"}}>{prevDone?"Ready to run — click the button above to process all claims through this agent.":`Complete Agent ${agentIdx} before running this agent.`}</div>
        </div>
      )}
    </div>
  );
}

/* ── OVERVIEW PAGE ───────────────────────────────────────────── */
function OverviewPage({ claims, agentResults, agentRunning, agentDone, runAgent, hitlActions, setHitlActions }) {
  const totalClaimed = claims.reduce((s,c)=>s+c.claimed_amount,0);
  const totalProcessed = Object.values(agentResults[4]||{}).filter(r=>r.decision&&r.decision!=="NEEDS_RESUBMISSION").length;
  const manualReview = claims.filter(c=>agentResults[2]?.[c.claim_id]?.status==="MANUAL_REVIEW");
  const agentsRun = Object.values(agentDone).filter(Boolean).length;

  const AGENTS = [
    { idx:0, name:"Ingest Agent",       desc:"Document validation & member lookup",    color:"#1565C0" },
    { idx:1, name:"Extraction Agent",   desc:"LLM-powered structured data extraction", color:"#6A1B9A" },
    { idx:2, name:"Risk & Integrity",   desc:"Fraud scoring & anomaly detection",       color:"#7c3aed" },
    { idx:3, name:"Policy Engine",      desc:"Eligibility & coverage adjudication",     color:"#14532d" },
    { idx:4, name:"Adjudication Agent", desc:"Final decision & member communication",   color:"#1e3a8a" },
  ];

  return (
    <div>
      <div style={{marginBottom:28}}>
        <div className="eyebrow" style={{marginBottom:10}}>PLUM_GHI_2024 · TechCorp Solutions Pvt Ltd</div>
        <h1 style={{fontSize:30,fontWeight:400,fontFamily:"'Fraunces',serif",letterSpacing:"-0.02em",color:"#0b1433",marginBottom:6}}>AI-Powered Claims Processing</h1>
        <p style={{fontSize:14,color:"#5c6d92",lineHeight:1.6}}>End-to-end automation for Group Health Insurance OPD claims. Run each agent in sequence to process the claim batch.</p>
      </div>

      <div className="kpi-grid">
        {[
          { label:"Claims in Batch", value:claims.length, delta:"PLUM_GHI_2024" },
          { label:"Total Claimed", value:fmt(totalClaimed), delta:"This batch" },
          { label:"Agents Completed", value:`${agentsRun} / 5`, delta:"Pipeline progress" },
          { label:"Manual Review", value:manualReview.length, delta:manualReview.length>0?"Requires attention":"No flags" },
        ].map((k,i)=>(
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginBottom:20}}>
        <div className="card-header"><span className="card-title">System Architecture</span><span className="card-meta">Connected systems</span></div>
        <div className="card-body">
          <div className="arch-diagram">
            {[
              { label:"Membership Portal", sub:"Claim submission\nDocument upload", bg:"#eff6ff", border:"#bfdbfe", text:"#1e40af" },
              null,
              { label:"Claims System",     sub:"System of record\nDecision storage", bg:"#ede9fe", border:"#c4b5fd", text:"#5b21b6" },
              null,
              { label:"Enrollment System", sub:"Member & dependent\neligibility data", bg:"#fffbeb", border:"#fcd34d", text:"#78350f" },
              null,
              { label:"Plum OPS Tool",     sub:"Agent orchestration\nDecision engine", bg:"#f0fdf4", border:"#86efac", text:"#14532d" },
            ].map((s,i)=>s===null
              ? <div key={i} className="arch-arrow">→</div>
              : <div key={i} className="arch-node" style={{background:s.bg,borderColor:s.border}}>
                  <div className="arch-node-title" style={{color:s.text}}>{s.label}</div>
                  <div className="arch-node-sub" style={{color:s.text,opacity:0.75,whiteSpace:"pre-line"}}>{s.sub}</div>
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:20}}>
        <div className="card-header"><span className="card-title">Claim Batch — {claims.length} Claims</span><span className="card-meta">ICICI Lombard General Insurance</span></div>
        <div style={{overflowX:"auto"}}>
          <table className="data-table">
            <thead><tr>{["Claim ID","Member","Type","Date of Service","Amount","Hospital","Status"].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {claims.map(c=>{
                const final=agentResults[4]?.[c.claim_id];
                const displayStatus=final?final.decision:c.status;
                return (
                  <tr key={c.claim_id}>
                    <td className="mono">{c.claim_id}</td>
                    <td style={{fontWeight:500}}>{c.member_name}</td>
                    <td>{c.claim_type}</td>
                    <td style={{color:"#8190a8"}}>{c.date_of_service}</td>
                    <td style={{fontWeight:500}}>{fmt(c.claimed_amount)}</td>
                    <td style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#5c6d92"}}>{c.hospital}</td>
                    <td><Badge status={displayStatus}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {manualReview.length>0 && (
        <div className="manual-banner">
          <div className="manual-banner-title">⚠ Manual Review Queue — {manualReview.length} claim(s)</div>
          {manualReview.map(c=>{
            const a3=agentResults[2]?.[c.claim_id];
            return (
              <div key={c.claim_id} className="manual-item">
                <span className="mono">{c.claim_id}</span>
                <span style={{fontWeight:500}}>{c.member_name}</span>
                <span>{fmt(c.claimed_amount)}</span>
                <span style={{color:"#1e40af"}}>Fraud score: {Math.round((a3?.fraudScore||0)*100)}%</span>
                <div style={{flex:1}}>{(a3?.flags||[]).map((f,i)=><span key={i} style={{fontSize:11.5,color:"#1d4ed8",marginLeft:6}}>· {f}</span>)}</div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <div style={{marginBottom:16}}>
          <div className="section-label">Processing Pipeline</div>
          <div className="workflow-graph">
            {AGENTS.map(agent=>(
              <div key={agent.idx} className={`workflow-node ${agentDone[agent.idx]?"done":""}`}>
                <div className="workflow-node-num">{agentDone[agent.idx]?"✓":String(agent.idx+1).padStart(2,"0")}</div>
                <div className="workflow-node-title">{agent.name}</div>
                <div className="workflow-node-desc">{agent.desc}</div>
              </div>
            ))}
          </div>
        </div>
        {AGENTS.map(agent=>{
          const done=agentDone[agent.idx],running=agentRunning[agent.idx],prevDone=agent.idx===0||agentDone[agent.idx-1];
          return (
            <div key={agent.idx} className={`agent-panel ${done?"done":""}`}>
              <div className="agent-panel-header">
                <div className="agent-panel-left">
                  <div className={`agent-step-num ${running?"run":done?"done":"idle"}`}>
                    {running?<span className="spinner" style={{margin:0}}/>:done?"✓":agent.idx+1}
                  </div>
                  <div>
                    <div className="agent-name">{agent.name}</div>
                    <div className="agent-desc">{agent.desc}</div>
                    {running&&<div className="scan-bar"/>}
                  </div>
                </div>
                <button className={`btn btn-sm ${done?"btn-success":prevDone&&!running?"btn-primary":"btn-ghost"}`} onClick={()=>runAgent(agent.idx)} disabled={running||!prevDone}>
                  {running?"Running…":done?"Re-run":"Run Agent →"}
                </button>
              </div>
              {done&&(
                <div style={{padding:"0 20px 16px"}}>
                  {claims.map(c=>(
                    <ResultRow key={c.claim_id} claim={c} agentResult={agentResults[agent.idx]?.[c.claim_id]} agentIdx={agent.idx} hitlActions={hitlActions} setHitlActions={setHitlActions} agentResults={agentResults}/>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── CLAIMS SYSTEM PAGE (separate) ──────────────────────────── */
function ClaimsSystemPage({ claims, agentResults, hitlActions }) {
  const [syncTime, setSyncTime] = useState(null);
  const handleSync = () => setSyncTime(now());
  return (
    <div>
      <div style={{marginBottom:24}}>
        <div className="eyebrow" style={{marginBottom:10}}>SYS-CPE-01 · Claims Processing Engine</div>
        <h1 style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",letterSpacing:"-0.015em",color:"#0b1433",marginBottom:6}}>Claims System</h1>
        <p style={{fontSize:13.5,color:"#5c6d92"}}>System of record for all claim decisions. Real-time sync with the Plum OPS processing pipeline.</p>
        {syncTime&&<div style={{fontSize:11.5,color:"#14532d",marginTop:4}}>✓ Last synced: {syncTime}</div>}
      </div>

      <div className="card" style={{marginBottom:20}}>
        <div className="card-header">
          <span className="card-title">Claims Register</span>
          <button className="btn btn-ghost btn-sm" onClick={handleSync}>↻ Sync</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table className="data-table">
            <thead><tr>{["Claim ID","Member","Type","Billed","Allowed","Co-pay","Plan Pays","Fraud Score","Reason Code","Status","Agent Stage"].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {claims.map(c=>{
                const a5=agentResults[4]?.[c.claim_id],a3=agentResults[2]?.[c.claim_id];
                const hitl=hitlActions?.[c.claim_id]||{};
                const finalStatus=hitl.adjDecision?(hitl.adjDecision==="APPROVE"?"APPROVED":"REJECTED"):(a5?.decision||c.status);
                const reasonCode=hitl.adjReason||hitl.riskReasonCode||a5?.rejectionReasonCode||"—";
                const agentStage=a5?"Agent 5 ✓":agentResults[3]?.[c.claim_id]?"Agent 4":a3?"Agent 3":agentResults[1]?.[c.claim_id]?"Agent 2":agentResults[0]?.[c.claim_id]?"Agent 1":"Not started";
                return (
                  <tr key={c.claim_id}>
                    <td className="mono">{c.claim_id}</td>
                    <td style={{fontWeight:500}}>{c.member_name}</td>
                    <td>{c.claim_type}</td>
                    <td>{fmt(c.claimed_amount)}</td>
                    <td>{a5?fmt(a5.approved):"—"}</td>
                    <td>{a5?fmt(a5.copay):"—"}</td>
                    <td style={{fontWeight:500}}>{a5?fmt(Math.max(0,a5.planPays)):"—"}</td>
                    <td>{a3?<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:600,color:(a3.fraudScore||0)>0.8?"#991b1b":(a3.fraudScore||0)>0.5?"#78350f":"#14532d"}}>{Math.round((a3.fraudScore||0)*100)}%</span>:"—"}</td>
                    <td><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"#5c6d92"}}>{reasonCode}</span></td>
                    <td><Badge status={finalStatus}/></td>
                    <td style={{fontSize:11.5,color:"#8190a8"}}>{agentStage}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Network Hospitals</span><span className="card-meta">{POLICY.network_hospitals.length} registered</span></div>
        <div className="card-body">
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"4px 20px"}}>
            {POLICY.network_hospitals.map((h,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #f2f5fa",fontSize:13}}>
                <span style={{width:16,height:16,borderRadius:"50%",background:"#f0fdf4",border:"1px solid #86efac",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#14532d",flexShrink:0}}>✓</span>
                <span style={{color:"#1e3065"}}>{h}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ENROLLMENT SYSTEM PAGE (separate) ──────────────────────── */
function EnrollmentSystemPage({ claims, agentResults }) {
  const [syncTime, setSyncTime] = useState(null);
  return (
    <div>
      <div style={{marginBottom:24}}>
        <div className="eyebrow" style={{marginBottom:10}}>SYS-ENR-02 · Enrollment Engine</div>
        <h1 style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",color:"#0b1433",marginBottom:6}}>Enrollment System</h1>
        <p style={{fontSize:13.5,color:"#5c6d92"}}>Member enrollment data, policy associations, and dependent management for TechCorp Solutions.</p>
        {syncTime&&<div style={{fontSize:11.5,color:"#14532d",marginTop:4}}>✓ Synced: {syncTime}</div>}
      </div>
      <div className="kpi-grid" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
        {[
          { label:"Total Members", value:POLICY.members.length, delta:"Active enrollment" },
          { label:"Policy Status", value:POLICY.policy_holder.renewal_status, delta:`${POLICY.policy_holder.policy_start_date} — ${POLICY.policy_holder.policy_end_date}` },
          { label:"Sum Insured", value:fmt(POLICY.coverage.sum_insured_per_employee), delta:"Per employee" },
        ].map((k,i)=><div key={i} className="kpi-card"><div className="kpi-label">{k.label}</div><div className="kpi-value">{k.value}</div><div className="kpi-delta">{k.delta}</div></div>)}
      </div>
      <div className="card" style={{marginBottom:20}}>
        <div className="card-header">
          <span className="card-title">Enrolled Members</span>
          <button className="btn btn-ghost btn-sm" onClick={()=>setSyncTime(now())}>↻ Sync</button>
        </div>
        <table className="data-table">
          <thead><tr>{["Member ID","Name","DOB","Gender","Join Date","Dependents","YTD Claimed","Status"].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {POLICY.members.map(m=>{
              const memberClaims=claims.filter(c=>c.member_id===m.member_id);
              const ytd=memberClaims.reduce((s,c)=>s+c.ytd_used,0);
              return (
                <tr key={m.member_id}>
                  <td className="mono">{m.member_id}</td>
                  <td style={{fontWeight:500}}>{m.name}</td>
                  <td style={{color:"#8190a8"}}>{m.dob}</td>
                  <td>{m.gender==="M"?"Male":"Female"}</td>
                  <td style={{color:"#8190a8"}}>{m.join_date}</td>
                  <td><span style={{fontSize:11.5,fontWeight:600,color:m.dependents.length>0?"#7c3aed":"#c8d0de"}}>{m.dependents.length}</span></td>
                  <td style={{fontWeight:500}}>{ytd>0?fmt(ytd):"—"}</td>
                  <td><span style={{background:"#f0fdf4",color:"#14532d",padding:"1px 8px",borderRadius:4,fontSize:11,fontWeight:600}}>ACTIVE</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── MEMBERSHIP PORTAL PAGE ──────────────────────────────────── */
function MembershipPortalPage({ claims, agentResults, hitlActions, setHitlActions }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [notifSent, setNotifSent] = useState({});

  const getMemberStatus = (memberId) => {
    const memberClaims = claims.filter(c=>c.member_id===memberId);
    return memberClaims.map(c=>{
      const a5=agentResults[4]?.[c.claim_id];
      const a1=agentResults[0]?.[c.claim_id];
      const hitl=hitlActions?.[c.claim_id]||{};
      const finalStatus=hitl.adjDecision?(hitl.adjDecision==="APPROVE"?"APPROVED":"REJECTED"):(a5?.decision||c.status);
      const notification = hitl.resubmitSent?"Resubmission requested — please upload missing documents":
        hitl.adjDecision?(hitl.adjDecision==="APPROVE"?"✓ Your claim has been approved":"✗ Your claim has been declined"):
        finalStatus==="APPROVED"?"✓ Your claim has been approved":
        finalStatus==="PARTIAL"?"Your claim has been partially approved":
        finalStatus==="REJECTED"?"Your claim has been rejected":
        finalStatus==="MANUAL_REVIEW"?"Under review — expect a response in 2 business days":
        finalStatus==="NEEDS_RESUBMISSION"?"Action required — please resubmit with correct documents":
        "Claim received — processing in progress";
      const reasonCode=hitl.adjReason||hitl.riskReasonCode||a5?.rejectionReasonCode||null;
      return { ...c, finalStatus, notification, reasonCode, a5 };
    });
  };

  return (
    <div>
      <div style={{marginBottom:24}}>
        <div className="eyebrow" style={{marginBottom:10}}>TechCorp Solutions Pvt Ltd</div>
        <h1 style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",color:"#0b1433",marginBottom:6}}>Membership Portal</h1>
        <p style={{fontSize:13.5,color:"#5c6d92"}}>{POLICY.members.length} employees enrolled. View claim status, send notifications, and manage resubmission requests.</p>
      </div>

      {/* Member cards grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16,marginBottom:20}}>
        {POLICY.members.map(m=>{
          const memberClaims=getMemberStatus(m.member_id);
          const activeClaims=memberClaims.filter(c=>c.finalStatus!=="PENDING");
          const hasAction=memberClaims.some(c=>c.finalStatus==="NEEDS_RESUBMISSION"||c.finalStatus==="MANUAL_REVIEW");
          return (
            <div key={m.member_id} className="card" style={{cursor:"pointer",border:selectedMember===m.member_id?"1.5px solid #7c3aed":"1px solid #dde4ef"}} onClick={()=>setSelectedMember(selectedMember===m.member_id?null:m.member_id)}>
              <div style={{padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:"#ede9fe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"#5b21b6",flexShrink:0}}>
                    {m.name.charAt(0)}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13.5,color:"#0b1433"}}>{m.name}</div>
                    <div style={{fontSize:11,color:"#8190a8"}}>{m.member_id} · {m.email}</div>
                  </div>
                  {hasAction&&<div className="notif-dot"/>}
                  <span style={{fontSize:11,color:"#7c3aed",fontWeight:600}}>{activeClaims.length} claim{activeClaims.length!==1?"s":""}</span>
                </div>
                {/* Mini claim status list */}
                {activeClaims.slice(0,2).map(c=>(
                  <div key={c.claim_id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",background:"#f8fafc",borderRadius:5,marginBottom:4,fontSize:12}}>
                    <span className="mono" style={{fontSize:10.5}}>{c.claim_id}</span>
                    <span style={{flex:1,color:"#5c6d92",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.notification}</span>
                    <Badge status={c.finalStatus}/>
                  </div>
                ))}
              </div>
              {/* Expanded member detail */}
              {selectedMember===m.member_id && (
                <div style={{borderTop:"1px solid #e8edf5",padding:"14px 16px",background:"#f8fafc"}}>
                  <div className="section-label" style={{marginBottom:10}}>All Claims & Notifications</div>
                  {memberClaims.length===0 && <div style={{fontSize:12.5,color:"#8190a8"}}>No claims submitted yet.</div>}
                  {memberClaims.map(c=>(
                    <div key={c.claim_id} style={{border:"1px solid #e8edf5",borderRadius:7,padding:"12px 14px",marginBottom:8,background:"#fff"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                        <span className="mono" style={{fontSize:11}}>{c.claim_id}</span>
                        <span style={{flex:1,fontSize:12.5,fontWeight:500,color:"#0b1433"}}>{c.claim_type} · {fmt(c.claimed_amount)}</span>
                        <Badge status={c.finalStatus}/>
                      </div>
                      <div style={{fontSize:12,color:"#5c6d92",marginBottom:6}}>{c.notification}</div>
                      {c.reasonCode && <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",background:"#f2f5fa",padding:"3px 8px",borderRadius:4,display:"inline-block",color:"#5c6d92",marginBottom:6}}>Code: {c.reasonCode}</div>}
                      {c.a5 && c.finalStatus==="APPROVED" && (
                        <div style={{fontSize:12,color:"#14532d",fontWeight:500}}>Plan pays: {fmt(Math.max(0,c.a5.planPays))} · Member co-pay: {fmt(c.a5.copay)}</div>
                      )}
                      {(c.finalStatus==="NEEDS_RESUBMISSION"||c.finalStatus==="PENDING") && (
                        <div style={{marginTop:8}}>
                          {notifSent[c.claim_id] ? (
                            <div style={{fontSize:12,color:"#14532d",fontWeight:600}}>✓ Notification sent to {m.email}</div>
                          ) : (
                            <button className="resubmit-btn" onClick={e=>{e.stopPropagation();setNotifSent(p=>({...p,[c.claim_id]:true}));}}>
                              📤 Send Resubmission Notification
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── POLICY PAGE ─────────────────────────────────────────────── */
function PolicyPage() {
  const [activeSection, setActiveSection] = useState("coverage");
  const sections = ["coverage","waiting","exclusions"];
  return (
    <div>
      <div style={{marginBottom:24}}>
        <div className="eyebrow" style={{marginBottom:10}}>PLUM_GHI_2024 · ICICI Lombard</div>
        <h1 style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",letterSpacing:"-0.015em",color:"#0b1433",marginBottom:6}}>{POLICY.policy_name}</h1>
        <div style={{display:"flex",gap:16,fontSize:13,color:"#5c6d92"}}>
          <span>Insurer: <strong style={{color:"#0b1433"}}>{POLICY.insurer}</strong></span>
          <span>·</span>
          <span>Policy: <strong style={{color:"#0b1433"}}>{POLICY.policy_holder.company_name}</strong></span>
          <span>·</span>
          <span style={{background:"#f0fdf4",color:"#14532d",border:"1px solid #86efac",padding:"1px 8px",borderRadius:4,fontSize:11,fontWeight:600}}>{POLICY.policy_holder.renewal_status}</span>
        </div>
      </div>
      <div style={{display:"flex",gap:2,borderBottom:"1px solid #dde4ef",marginBottom:24}}>
        {sections.map(s=>(
          <button key={s} onClick={()=>setActiveSection(s)} style={{padding:"8px 16px",fontSize:13,color:activeSection===s?"#7c3aed":"#8190a8",background:"none",border:"none",borderBottom:`2px solid ${activeSection===s?"#7c3aed":"transparent"}`,fontWeight:activeSection===s?600:400,cursor:"pointer",textTransform:"capitalize"}}>
            {s==="waiting"?"Waiting Periods":s}
          </button>
        ))}
      </div>
      {activeSection==="coverage" && (
        <div>
          <div className="kpi-grid" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
            {[
              { label:"Sum Insured / Employee", value:fmt(POLICY.coverage.sum_insured_per_employee) },
              { label:"Annual OPD Limit", value:fmt(POLICY.coverage.annual_opd_limit) },
              { label:"Per Claim Limit", value:fmt(POLICY.coverage.per_claim_limit) },
            ].map((k,i)=><div key={i} className="kpi-card"><div className="kpi-label">{k.label}</div><div className="kpi-value">{k.value}</div></div>)}
          </div>
          <div className="section-label" style={{marginBottom:12}}>OPD Category Sub-limits</div>
          <div className="coverage-grid">
            {Object.entries(POLICY.opd_categories).map(([cat,cfg])=>(
              <div key={cat} className="cov-tile">
                <div className="cov-tile-name">{cat.replace(/_/g," ")}</div>
                <div className="cov-tile-limit">{fmt(cfg.sub_limit)}</div>
                <div className="cov-tile-detail">{cfg.copay_percent>0?`${cfg.copay_percent}% co-pay`:"No co-pay"}{cfg.network_discount_percent?` · ${cfg.network_discount_percent}% network discount`:""}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeSection==="waiting" && (
        <div className="reference-grid">
          <div className="card">
            <div className="card-header"><span className="card-title">Initial Waiting Period</span></div>
            <div className="card-body">
              <div style={{fontSize:28,fontWeight:400,fontFamily:"'Fraunces',serif",color:"#7c3aed",marginBottom:4}}>{POLICY.waiting_periods.initial_days} days</div>
              <div style={{fontSize:12.5,color:"#5c6d92"}}>All new members must wait {POLICY.waiting_periods.initial_days} days from join date before filing any OPD claim.</div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Pre-existing Condition Waiting Periods</span></div>
            <div className="card-body">
              {Object.entries(POLICY.waiting_periods.specific).map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f2f5fa",fontSize:12.5}}>
                  <span style={{color:"#5c6d92",textTransform:"capitalize"}}>{k.replace(/_/g," ")}</span>
                  <span style={{fontWeight:600,color:"#0b1433"}}>{v} days</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {activeSection==="exclusions" && (
        <div className="card">
          <div className="card-header"><span className="card-title">Policy Exclusions</span><span className="card-meta">{POLICY.exclusions.length} conditions</span></div>
          <div className="card-body">
            {POLICY.exclusions.map((e,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid #f2f5fa",fontSize:13}}>
                <span style={{width:16,height:16,borderRadius:"50%",background:"#fef2f2",border:"1px solid #fca5a5",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#991b1b",flexShrink:0}}>✗</span>
                <span style={{color:"#1e3065"}}>{e}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── AUDIT LOG PAGE ──────────────────────────────────────────── */
function AuditLogPage({ auditLog, hitlActions, claims, agentDone }) {
  const [filterAgent, setFilterAgent]   = useState("ALL");
  const [filterLevel, setFilterLevel]   = useState("ALL");
  const [filterClaim, setFilterClaim]   = useState("ALL");
  const [search, setSearch]             = useState("");
  const [expandedIdx, setExpandedIdx]   = useState(null);
  const bottomRef = useRef(null);

  const agentNames = ["ALL","Ingest Agent","Extraction Agent","Risk & Integrity","Policy Engine","Adjudication Agent"];
  const levels     = ["ALL","INFO","SUCCESS","WARN","ERROR"];
  const claimIds   = ["ALL", ...claims.map(c => c.claim_id)];

  // Derive HITL action log entries from hitlActions state
  const hitlEntries = Object.entries(hitlActions).flatMap(([claimId, actions]) => {
    const claim = claims.find(c => c.claim_id === claimId);
    const entries = [];
    const ts = () => new Date().toISOString().replace("T"," ").split(".")[0];
    if (actions.resubmitSent)   entries.push({ ts: ts(), level:"INFO",    agent:"Ingest Agent",      event:"HITL_ACTION", claimId, member: claim?.member_name||"—", claimType: claim?.claim_type||"—", amount: claim?.claimed_amount||0, msg:`HITL — Resubmission request sent to ${claim?.member_name||claimId}` });
    if (actions.riskAction)     entries.push({ ts: ts(), level: actions.riskAction==="VALIDATE"?"SUCCESS":"WARN", agent:"Risk & Integrity", event:"HITL_ACTION", claimId, member: claim?.member_name||"—", claimType: claim?.claim_type||"—", amount: claim?.claimed_amount||0, msg:`HITL — Risk ${actions.riskAction}: ${actions.riskReasonCode||"—"}` });
    if (actions.adjDecision)    entries.push({ ts: ts(), level: actions.adjDecision==="APPROVE"?"SUCCESS":"WARN", agent:"Adjudication Agent", event:"HITL_ACTION", claimId, member: claim?.member_name||"—", claimType: claim?.claim_type||"—", amount: claim?.claimed_amount||0, msg:`HITL — Adjudication ${actions.adjDecision}: ${actions.adjReason||"—"}` });
    return entries;
  });

  const allEntries = [...auditLog, ...hitlEntries];

  const filtered = allEntries.filter(e => {
    if (filterAgent !== "ALL" && e.agent !== filterAgent) return false;
    if (filterLevel !== "ALL" && e.level !== filterLevel) return false;
    if (filterClaim !== "ALL" && e.claimId !== filterClaim) return false;
    if (search && !`${e.msg} ${e.claimId||""} ${e.member||""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const levelColor = { INFO:"#3b82f6", SUCCESS:"#16a34a", WARN:"#d97706", ERROR:"#dc2626" };
  const levelBg    = { INFO:"#eff6ff", SUCCESS:"#f0fdf4", WARN:"#fffbeb", ERROR:"#fef2f2" };
  const levelBr    = { INFO:"#bfdbfe", SUCCESS:"#86efac", WARN:"#fcd34d", ERROR:"#fca5a5" };
  const eventIcon  = { AGENT_START:"▶", AGENT_COMPLETE:"✓", CLAIM_RESULT:"📋", ISSUE:"❌", POLICY_FAIL:"⚠", FRAUD_FLAG:"🛡", HITL_ACTION:"👤" };

  const agentsRun = Object.values(agentDone).filter(Boolean).length;
  const errorCount   = allEntries.filter(e => e.level === "ERROR").length;
  const warnCount    = allEntries.filter(e => e.level === "WARN").length;
  const hitlCount    = allEntries.filter(e => e.event === "HITL_ACTION").length;

  const handleExport = () => {
    const lines = allEntries.map(e =>
      `[${e.ts}] [${e.level.padEnd(7)}] [${(e.agent||"System").padEnd(20)}] ${e.claimId ? `[${e.claimId}] ` : ""}${e.msg}`
    ).join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `plum_audit_log_${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <div className="eyebrow" style={{marginBottom:10}}>CONFIGURATION · PLUM OPS PLATFORM</div>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16}}>
          <div>
            <h1 style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",color:"#0b1433",marginBottom:6}}>Audit Log</h1>
            <p style={{fontSize:13.5,color:"#5c6d92",maxWidth:600}}>Complete trace of all agent executions, claim decisions, policy checks, fraud signals, and HITL actions. Run agents from the pipeline to populate entries.</p>
          </div>
          <button className="btn btn-ghost" onClick={handleExport} style={{flexShrink:0,display:"flex",alignItems:"center",gap:6}}>
            <span>⬇</span> Export .txt
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          { label:"Total Events",    value:allEntries.length,  color:"#0b1433" },
          { label:"Agents Executed", value:`${agentsRun} / 5`, color:"#7c3aed" },
          { label:"Errors / Issues", value:errorCount,          color: errorCount>0?"#dc2626":"#14532d" },
          { label:"Warnings",        value:warnCount,           color: warnCount>0?"#d97706":"#14532d" },
        ].map((k,i)=>(
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{fontSize:22,color:k.color}}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search logs…"
          style={{border:"1px solid #dde4ef",borderRadius:6,padding:"6px 12px",fontSize:12.5,color:"#0b1433",outline:"none",fontFamily:"'DM Sans',sans-serif",flex:"1 1 180px",minWidth:140}}
        />
        {[
          { label:"Agent", value:filterAgent,  set:setFilterAgent,  opts:agentNames },
          { label:"Level", value:filterLevel,  set:setFilterLevel,  opts:levels },
          { label:"Claim", value:filterClaim,  set:setFilterClaim,  opts:claimIds },
        ].map(({label,value,set,opts})=>(
          <select key={label} value={value} onChange={e=>set(e.target.value)} className="reason-select" style={{fontSize:12}}>
            {opts.map(o=><option key={o} value={o}>{label}: {o==="ALL"?"All":o}</option>)}
          </select>
        ))}
        <span style={{fontSize:11.5,color:"#8190a8",marginLeft:"auto",whiteSpace:"nowrap"}}>{filtered.length} of {allEntries.length} entries</span>
        {(filterAgent!=="ALL"||filterLevel!=="ALL"||filterClaim!=="ALL"||search) && (
          <button className="btn btn-ghost btn-sm" onClick={()=>{setFilterAgent("ALL");setFilterLevel("ALL");setFilterClaim("ALL");setSearch("");}}>✕ Clear</button>
        )}
      </div>

      {/* Log table */}
      {allEntries.length === 0 ? (
        <div style={{background:"#f8fafc",border:"1px dashed #c8d0de",borderRadius:10,padding:60,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:12}}>🗂️</div>
          <div style={{fontSize:14,fontWeight:600,color:"#3a4d7a",marginBottom:6}}>No audit entries yet</div>
          <div style={{fontSize:13,color:"#8190a8"}}>Run agents from the pipeline to start capturing log events here.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{background:"#f8fafc",border:"1px dashed #c8d0de",borderRadius:8,padding:40,textAlign:"center"}}>
          <div style={{fontSize:13,color:"#8190a8"}}>No entries match your current filters.</div>
        </div>
      ) : (
        <div style={{border:"1px solid #dde4ef",borderRadius:10,overflow:"hidden"}}>
          {/* Table header */}
          <div style={{display:"grid",gridTemplateColumns:"160px 70px 160px 100px 90px 1fr",gap:"0 12px",padding:"8px 16px",background:"#f8fafc",borderBottom:"1px solid #e8edf5",fontSize:10.5,fontWeight:700,color:"#8190a8",textTransform:"uppercase",letterSpacing:"0.08em"}}>
            <span>Timestamp</span><span>Level</span><span>Agent</span><span>Claim ID</span><span>Amount</span><span>Message</span>
          </div>
          {/* Rows */}
          <div style={{maxHeight:560,overflowY:"auto",background:"#fff"}}>
            {filtered.map((e,i)=>{
              const isExpanded = expandedIdx === i;
              const isDivider  = e.event === "AGENT_START" || e.event === "AGENT_COMPLETE";
              return (
                <div key={i}
                  onClick={()=>setExpandedIdx(isExpanded?null:i)}
                  style={{
                    display:"grid", gridTemplateColumns:"160px 70px 160px 100px 90px 1fr", gap:"0 12px",
                    padding: isDivider?"10px 16px":"7px 16px",
                    borderBottom:"1px solid #f2f5fa",
                    background: isDivider?"#f4f7fb": isExpanded?"#faf9ff":"#fff",
                    cursor:"pointer", transition:"background 0.1s",
                    borderLeft: isDivider ? `3px solid ${e.event==="AGENT_COMPLETE"?"#7c3aed":"#c4b5fd"}` : `3px solid ${levelColor[e.level]||"#e8edf5"}`,
                    alignItems:"center",
                  }}
                >
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"#8190a8",whiteSpace:"nowrap"}}>{(e.ts||"").split(" ")[1]||e.ts||"—"}</span>
                  <span>
                    <span style={{background:levelBg[e.level]||"#f2f5fa",color:levelColor[e.level]||"#5c6d92",border:`1px solid ${levelBr[e.level]||"#e8edf5"}`,padding:"1px 6px",borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.04em"}}>{e.level}</span>
                  </span>
                  <span style={{fontSize:11.5,color:"#3a4d7a",fontWeight: isDivider?600:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.agent||"System"}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color: e.claimId?"#6d28d9":"#c8d0de"}}>{e.claimId||"—"}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"#5c6d92"}}>{e.amount?`₹${Number(e.amount).toLocaleString("en-IN")}`:"—"}</span>
                  <span style={{fontSize:12,color: isDivider?"#0b1433":"#3a4d7a",fontWeight: isDivider?600:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace: isExpanded?"normal":"nowrap",fontFamily: e.msg?.startsWith("  ↳")?"'JetBrains Mono',monospace":"inherit",lineHeight:1.5}}>
                    <span style={{marginRight:5,opacity:0.6}}>{eventIcon[e.event]||""}</span>{e.msg}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef}/>
          </div>
        </div>
      )}

      {/* Legend */}
      {allEntries.length > 0 && (
        <div style={{marginTop:14,display:"flex",gap:16,flexWrap:"wrap",fontSize:11.5,color:"#8190a8",alignItems:"center"}}>
          <span style={{fontWeight:600,color:"#5c6d92"}}>Level key:</span>
          {levels.filter(l=>l!=="ALL").map(l=>(
            <span key={l} style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{background:levelBg[l],color:levelColor[l],border:`1px solid ${levelBr[l]}`,padding:"1px 6px",borderRadius:3,fontSize:10,fontWeight:700}}>{l}</span>
            </span>
          ))}
          <span style={{marginLeft:"auto"}}>Click any row to expand · ↑ entries are newest at bottom</span>
        </div>
      )}
    </div>
  );
}

/* ── SETTINGS PAGE ───────────────────────────────────────────── */
function SettingsPage({ settings, setSettings }) {
  const connections = [
    { name:"Membership Portal",  url:"https://portal.plum.com/api/v1",          auth:"OAuth 2.0", status:"CONNECTED", sync:"Every 5 min" },
    { name:"Claims System",      url:"https://claims.icici-lombard.com/api",      auth:"API Key",   status:"CONNECTED", sync:"Real-time" },
    { name:"Enrollment System",  url:"https://enrollment.plum.com/api/v2",        auth:"JWT Bearer",status:"CONNECTED", sync:"Every 15 min" },
  ];
  const fields = [
    { key:"confidence_threshold", label:"Confidence threshold for auto-adjudication" },
    { key:"fraud_cutoff", label:"Fraud score cutoff for manual review" },
    { key:"submission_deadline", label:"Submission deadline (days from treatment)" },
    { key:"min_claim_amount", label:"Minimum claim amount (INR)" },
    { key:"high_value_threshold", label:"High-value claim threshold (INR)" },
    { key:"same_day_limit", label:"Same-day claims limit" },
    { key:"monthly_limit", label:"Monthly claims limit" },
  ];
  return (
    <div>
      <div style={{marginBottom:24}}>
        <div className="eyebrow" style={{marginBottom:10}}>PLUM OPS PLATFORM</div>
        <h1 style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",color:"#0b1433",marginBottom:6}}>Settings & Configuration</h1>
        <p style={{fontSize:13.5,color:"#5c6d92"}}>System connections and agent configuration parameters.</p>
      </div>
      <div className="settings-grid">
        <div>
          <div className="section-label">System Connections</div>
          {connections.map(sys=>(
            <div key={sys.name} className="sys-connection">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontWeight:600,fontSize:13.5,color:"#0b1433"}}>{sys.name}</span>
                <span style={{background:"#f0fdf4",color:"#14532d",border:"1px solid #86efac",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600}}>{sys.status}</span>
              </div>
              {[["Endpoint",sys.url],["Auth Method",sys.auth],["Sync",sys.sync]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#5c6d92",padding:"2px 0"}}>
                  <span>{k}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#3a4d7a"}}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div>
          <div className="section-label">Agent Configuration</div>
          <div className="card">
            <div className="card-body">
              {fields.map(f=>(
                <div key={f.key} style={{marginBottom:14}}>
                  <label className="form-label">{f.label}</label>
                  <input type="number" className="form-input" value={settings[f.key]} onChange={e=>setSettings(p=>({...p,[f.key]:parseFloat(e.target.value)}))} />
                </div>
              ))}
              <button className="btn btn-primary" style={{width:"100%",marginTop:4}}>Save Configuration</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── SIDEBAR ─────────────────────────────────────────────────── */
function Sidebar({ active, onNav }) {
  return (
    <aside className="plum-sidebar">
      <div className="plum-brand">
        <div className="plum-brand-mark">
          <div className="plum-brand-logo">P</div>
          <div>
            <div className="plum-brand-title">Plum</div>
            <div className="plum-brand-sub">OPS Platform</div>
          </div>
        </div>
      </div>
      {NAV.map(group=>(
        <div key={group.label} className="plum-nav-section">
          <div className="plum-nav-label">{group.label}</div>
          {group.items.map(item=>(
            <button key={item.id} className={`plum-nav-item ${active===item.id?"active":""}`} onClick={()=>onNav(item.id)}>
              <div className="nav-icon-wrap">{item.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:500,lineHeight:1.3}}>{item.label}</div>
                {item.sub&&<span className="plum-nav-sub">{item.sub}</span>}
              </div>
            </button>
          ))}
        </div>
      ))}
      <div className="plum-nav-footer">
        <div className="plum-status-dot-live">Agent Active</div>
        <div style={{marginTop:6,fontSize:10.5}}>PLUM_GHI_2024 · ICICI Lombard</div>
      </div>
    </aside>
  );
}

/* ── TOPBAR ──────────────────────────────────────────────────── */
function Topbar({ active }) {
  const crumbs = {
    overview:"Module Overview", "claims-sys":"Claims System", enrollment:"Enrollment System",
    membership:"Membership Portal", policy:"Policy Engine",
    "agent-ingest":"Ingest Agent", "agent-extract":"Extraction Agent",
    "agent-risk":"Risk & Integrity", "agent-policy":"Policy Engine",
    "agent-decision":"Adjudication Agent", settings:"Settings", "audit-log":"Audit Log",
  };
  return (
    <header className="plum-topbar">
      <div className="plum-breadcrumb">
        <span className="crumb-root">Plum OPS</span>
        <span className="crumb-sep">›</span>
        <span className="crumb-page">{crumbs[active]||active}</span>
      </div>
      <div className="plum-topbar-right">
        <span className="sys-status-chip">All systems operational</span>
        <span className="plum-policy-badge">PLUM_GHI_2024</span>
      </div>
    </header>
  );
}

/* ── ROOT APP ────────────────────────────────────────────────── */
export default function App() {
  const [active, setActive] = useState("overview");
  const [claims] = useState(INITIAL_CLAIMS);
  const [agentResults, setAgentResults] = useState({ 0:{}, 1:{}, 2:{}, 3:{}, 4:{} });
  const [agentRunning, setAgentRunning] = useState({});
  const [agentDone, setAgentDone] = useState({});
  const [hitlActions, setHitlActions] = useState({});
  const [auditLog, setAuditLog] = useState([]);
  const [settings, setSettings] = useState({
    confidence_threshold:0.75, fraud_cutoff:0.80, submission_deadline:30,
    min_claim_amount:500, high_value_threshold:25000, same_day_limit:2, monthly_limit:6
  });

  const appendAuditLog = useCallback((entries) => {
    setAuditLog(prev => [...prev, ...entries]);
  }, []);

  const runAgent = useCallback(async (agentIdx) => {
    const agentNames = ["Ingest Agent","Extraction Agent","Risk & Integrity","Policy Engine","Adjudication Agent"];
    const ts = () => new Date().toISOString().replace("T"," ").split(".")[0];
    appendAuditLog([{ ts: ts(), level:"INFO", agent: agentNames[agentIdx], event:"AGENT_START", msg:`Agent ${agentIdx+1} (${agentNames[agentIdx]}) started — processing ${claims.length} claims` }]);
    setAgentRunning(p=>({...p,[agentIdx]:true}));
    await new Promise(r=>setTimeout(r,1400));
    setAgentResults(prev=>{
      const a0=prev[0],a1=prev[1],a2=prev[2],a3=prev[3];
      let newResults;
      if (agentIdx===0) newResults=runAgent1(claims);
      else if (agentIdx===1) newResults=runAgent2(claims,a0);
      else if (agentIdx===2) newResults=runAgent3(claims,a0,a1);
      else if (agentIdx===3) newResults=runAgent4(claims,a0,a1,a2);
      else newResults=runAgent5(claims,a0,a1,a2,a3);
      // Build per-claim audit entries from results
      const claimEntries = claims.flatMap(c => {
        const r = newResults[c.claim_id];
        if (!r) return [];
        const status = r.status || r.decision || "UNKNOWN";
        const level = ["REJECTED","MANUAL_REVIEW","NEEDS_RESUBMISSION"].includes(status) ? "WARN"
          : status === "SKIPPED" ? "INFO" : "SUCCESS";
        const entries = [{ ts: ts(), level, agent: agentNames[agentIdx], event:"CLAIM_RESULT", claimId: c.claim_id, member: c.member_name, claimType: c.claim_type, amount: c.claimed_amount, msg:`${c.claim_id} (${c.member_name}) → ${status}` }];
        // Surface issues / failures / flags as individual log lines
        if (r.issues?.length) r.issues.forEach(iss => entries.push({ ts: ts(), level:"ERROR", agent: agentNames[agentIdx], event:"ISSUE", claimId: c.claim_id, member: c.member_name, claimType: c.claim_type, amount: c.claimed_amount, msg:`  ↳ [${iss.code}] ${iss.detail}` }));
        if (r.failures?.length) r.failures.forEach(f => entries.push({ ts: ts(), level:"WARN", agent: agentNames[agentIdx], event:"POLICY_FAIL", claimId: c.claim_id, member: c.member_name, claimType: c.claim_type, amount: c.claimed_amount, msg:`  ↳ Policy failure: ${f}` }));
        if (r.flags?.length) r.flags.forEach(f => entries.push({ ts: ts(), level:"WARN", agent: agentNames[agentIdx], event:"FRAUD_FLAG", claimId: c.claim_id, member: c.member_name, claimType: c.claim_type, amount: c.claimed_amount, msg:`  ↳ Risk flag: ${f}` }));
        return entries;
      });
      appendAuditLog([
        ...claimEntries,
        { ts: ts(), level:"INFO", agent: agentNames[agentIdx], event:"AGENT_COMPLETE", msg:`Agent ${agentIdx+1} (${agentNames[agentIdx]}) completed — ${claims.length} claims processed` },
      ]);
      return {...prev,[agentIdx]:newResults};
    });
    setAgentRunning(p=>({...p,[agentIdx]:false}));
    setAgentDone(p=>({...p,[agentIdx]:true}));
  }, [claims, appendAuditLog]);

  const agentIdxMap = { "agent-ingest":0, "agent-extract":1, "agent-risk":2, "agent-policy":3, "agent-decision":4 };
  const isAgentPage = active in agentIdxMap;
  const agentIdx = agentIdxMap[active];

  const sharedProps = { claims, agentResults, hitlActions, setHitlActions };

  const page =
    active==="overview"     ? <OverviewPage {...sharedProps} agentRunning={agentRunning} agentDone={agentDone} runAgent={runAgent} /> :
    active==="claims-sys"   ? <ClaimsSystemPage {...sharedProps} /> :
    active==="enrollment"   ? <EnrollmentSystemPage {...sharedProps} /> :
    active==="membership"   ? <MembershipPortalPage {...sharedProps} /> :
    active==="policy"       ? <PolicyPage /> :
    active==="settings"     ? <SettingsPage settings={settings} setSettings={setSettings} /> :
    active==="audit-log"    ? <AuditLogPage auditLog={auditLog} hitlActions={hitlActions} claims={claims} agentDone={agentDone} /> :
    isAgentPage             ? <AgentPage agentIdx={agentIdx} {...sharedProps} agentRunning={agentRunning} agentDone={agentDone} runAgent={runAgent} /> :
    null;

  
 return (
  <>
    <style>{css}</style>
    <div className="plum-shell">
      <Sidebar active={active} onNav={setActive}/>
      <div className="plum-main">
        <Topbar active={active}/>
        <div className="plum-content">{page}</div>
      </div>
    </div>
  </>
);
}
