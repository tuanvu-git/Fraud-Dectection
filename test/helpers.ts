import { buildAggregates } from "../src/engine/aggregates";
import { isWeekend } from "../src/engine/dates";
import type { Claim, RuleContext } from "../src/engine/types";

let seq = 0;

export function claim(over: Partial<Claim> = {}): Claim {
  seq += 1;
  const claim_date = over.claim_date ?? "2024-03-04"; // a Monday
  return {
    claim_id: over.claim_id ?? `CLM-${String(seq).padStart(5, "0")}`,
    // unique per call by default, so two default claims are not accidental duplicates;
    // tests that need a shared member pass member_id explicitly
    member_id: over.member_id ?? `M-${String(seq).padStart(4, "0")}`,
    provider_id: over.provider_id ?? "PR-01",
    provider_name: over.provider_name ?? "Test Hospital",
    claim_date,
    claim_type: over.claim_type ?? "OUTPATIENT",
    diagnosis_code: over.diagnosis_code ?? "E11.9",
    procedure_codes: over.procedure_codes ?? ["P-D01"],
    submitted_amount: over.submitted_amount ?? 1000,
    is_weekend: over.is_weekend ?? isWeekend(claim_date),
  };
}

export function ctx(claims: Claim[]): RuleContext {
  return { agg: buildAggregates(claims) };
}
