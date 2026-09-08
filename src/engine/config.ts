import type { RuleName } from "./types";

/** Fixed RNG seed — dataset generation is fully reproducible. */
export const SEED = "fraud-detection-challenge-10";

/**
 * Severity weight per rule (1–5). Rationale lives in CLAUDE.md and is reproduced
 * in the generated metrics report.
 */
export const WEIGHTS: Record<RuleName, number> = {
  duplicate_claim: 5,
  phantom_billing: 5,
  upcoding: 4,
  amount_clustering: 4,
  unbundling: 3,
  weekend_anomaly: 3,
  diagnosis_procedure_mismatch: 2,
  rapid_resubmission: 2,
};

/**
 * Why each rule has the weight it does — how strongly a trigger implies *deliberate*
 * fraud (vs. coincidence or a clerical error), scaled by financial impact. Rendered
 * into the metrics report so the weights are justified per rule, not in the aggregate.
 */
export const WEIGHT_RATIONALE: Record<RuleName, string> = {
  duplicate_claim:
    "An identical member+provider+date+diagnosis claim has almost no innocent explanation — it is direct double-billing.",
  phantom_billing:
    ">30 claims in one day from a provider that averages a handful is physically implausible and inflates payouts at scale.",
  upcoding:
    "A charge >2 SD above the norm for the procedure is a strong money+intent signal, but genuinely complex cases can be expensive — so 4, not 5.",
  amount_clustering:
    "Landing just under the 50,000 auto-approval line is hard to explain as chance, but each such claim's loss is capped by that line — so 4, not 5.",
  unbundling:
    "Billing components instead of the bundle is a known padding tactic, but procedures are sometimes legitimately separate encounters.",
  weekend_anomaly:
    "A weekday-only provider suddenly operating on a weekend is a behavioural break, but weekends do happen — it needs corroboration.",
  diagnosis_procedure_mismatch:
    "Often a coding or data-entry error rather than fraud, and the reference mapping is deliberately incomplete — weak on its own.",
  rapid_resubmission:
    "Legitimate follow-up visits and staged treatment look identical; only meaningful when stacked with other flags.",
};

/**
 * Scoring: risk_score = round(min(rawWeightSum / DENOM, 1) * 100).
 * DENOM 8 ≈ "two of the heaviest rules stacked" -> 100. Only DENOM and THRESHOLD
 * are tunable; every rule threshold below is fixed by the challenge spec.
 */
export const DENOM = 8;

/** A claim counts as flagged (for precision/recall) when risk_score >= THRESHOLD. */
export const THRESHOLD = 25;

/** Thresholds swept in the metrics report. */
/** Distinct score levels worth inspecting (weights/DENOM land on ~12.5 multiples). */
export const SWEEP_THRESHOLDS = [13, 20, 25, 26, 38, 50, 63];

// --- Rule constants (fixed by spec) --------------------------------------------

export const AUTO_APPROVAL_THRESHOLD = 50_000;
export const CLUSTERING_LOWER = 47_500;

export const RAPID_RESUBMISSION_DAYS = 7;
export const PHANTOM_BILLING_DAILY_LIMIT = 30;
export const UPCODING_SD = 2;
/** Skip procedure codes with too few observations to have a meaningful mean/sd. */
export const UPCODING_MIN_SAMPLE = 5;
export const WEEKEND_MAX_RATE = 0.05;
/** Providers below this lifetime volume have too little history for the weekend rule. */
export const WEEKEND_MIN_HISTORY = 20;

// --- Reference mappings -------------------------------------------------------

/** Bundle code -> component procedure codes that should be billed together. */
export const BUNDLES: Record<string, string[]> = {
  "B-100": ["P-101", "P-102", "P-103"],
  "B-200": ["P-201", "P-202"],
  "B-300": ["P-301", "P-302", "P-303"],
  "B-400": ["P-401", "P-402"],
  "B-500": ["P-501", "P-502", "P-503", "P-504"],
};

/** Valid diagnosis -> clinically associated procedure codes (>= 10 pairs). */
export const DIAGNOSIS_PROCEDURES: Record<string, string[]> = {
  "E11.9": ["P-D01", "P-D02"], // type 2 diabetes
  I10: ["P-H01", "P-H02"], // hypertension
  "J45.909": ["P-A01", "P-A02"], // asthma
  "M54.5": ["P-B01", "P-B02", "P-B03"], // low back pain
  "K21.9": ["P-G01", "P-G02"], // GERD
  "N39.0": ["P-U01", "P-U02"], // UTI
  "J02.9": ["P-P01"], // pharyngitis
  "S93.4": ["P-S01", "P-S02"], // ankle sprain
  "H66.9": ["P-O01"], // otitis media
  "F41.9": ["P-F01", "P-F02"], // anxiety
};

/** Diagnosis codes with no mapping — the mismatch rule stays silent on these. */
export const UNMAPPED_DIAGNOSES = ["Z00.00", "R51", "M25.50", "R10.9", "R05"];

/** Procedure codes considered surgical (used by the weekend anomaly rule). */
export const SURGICAL_PROCEDURE_CODES = new Set([
  "S-001",
  "S-002",
  "S-003",
  "S-004",
  "S-005",
]);

/** Baseline mean submitted amount per procedure code; sd modelled as 15% of mean. */
export const PROCEDURE_MEAN: Record<string, number> = {
  "P-D01": 1200, "P-D02": 900,
  "P-H01": 800, "P-H02": 1500,
  "P-A01": 1100, "P-A02": 1300,
  "P-B01": 950, "P-B02": 1800, "P-B03": 2200,
  "P-G01": 1000, "P-G02": 1400,
  "P-U01": 700, "P-U02": 1100,
  "P-P01": 600,
  "P-S01": 2500, "P-S02": 3000,
  "P-O01": 850,
  "P-F01": 1600, "P-F02": 2000,
  "P-101": 4000, "P-102": 3500, "P-103": 5000,
  "P-201": 6000, "P-202": 7000,
  "P-301": 3000, "P-302": 3200, "P-303": 4100,
  "P-401": 8000, "P-402": 9000,
  "P-501": 2500, "P-502": 2700, "P-503": 3100, "P-504": 3300,
  "B-100": 10000, "B-200": 11000, "B-300": 8500, "B-400": 15000, "B-500": 10000,
  "S-001": 32000, "S-002": 38000, "S-003": 41000, "S-004": 35000, "S-005": 44000,
  "P-X01": 900, "P-X02": 1300, "P-X03": 1700,
};

export const GENERIC_PROCEDURES = ["P-X01", "P-X02", "P-X03"];
