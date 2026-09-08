export type ClaimType = "OUTPATIENT" | "INPATIENT" | "DENTAL";

export interface Claim {
  claim_id: string;
  member_id: string;
  provider_id: string;
  provider_name: string;
  /** ISO date, YYYY-MM-DD */
  claim_date: string;
  claim_type: ClaimType;
  diagnosis_code: string;
  procedure_codes: string[];
  submitted_amount: number;
  is_weekend: boolean;
}

export type RuleName =
  | "duplicate_claim"
  | "rapid_resubmission"
  | "upcoding"
  | "unbundling"
  | "phantom_billing"
  | "weekend_anomaly"
  | "diagnosis_procedure_mismatch"
  | "amount_clustering";

export interface Flag {
  rule: RuleName;
  severity: number;
  evidence: string;
}

export interface ScoredClaim {
  claim_id: string;
  risk_score: number;
  flags: Flag[];
}

export interface Label {
  claim_id: string;
  is_fraud: boolean;
  /** primary + incidental fraud pattern names (== RuleName for planted claims) */
  fraud_patterns: RuleName[];
}

export interface ProcedureStat {
  mean: number;
  std: number;
  count: number;
}

export interface Aggregates {
  /** procedure code -> distribution of claim submitted_amount for claims containing that code */
  procedureStats: Map<string, ProcedureStat>;
  /** `${provider_id}|${claim_date}` -> number of claims */
  providerDayCounts: Map<string, number>;
  /** provider_id -> { total, weekend } historical claim counts */
  providerWeekend: Map<string, { total: number; weekend: number }>;
  /** `${member_id}|${diagnosis_code}` -> claims, ascending by date */
  byMemberDiagnosis: Map<string, Claim[]>;
  /** `${member_id}|${provider_id}|${claim_date}|${diagnosis_code}` -> claims */
  duplicateGroups: Map<string, Claim[]>;
  /** provider_id -> display name */
  providerNames: Map<string, string>;
}

export interface RuleContext {
  agg: Aggregates;
}

export interface Rule {
  name: RuleName;
  severity: number;
  run: (claim: Claim, ctx: RuleContext) => Flag | null;
}
