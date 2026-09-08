import { DIAGNOSIS_PROCEDURES, WEIGHTS } from "../config";
import type { Rule } from "../types";

/**
 * Rule 7 — the diagnosis is in the reference mapping but none of the billed
 * procedures are clinically associated with it. Unknown diagnoses are skipped
 * (the mapping is intentionally incomplete).
 */
export const diagnosisProcedureMismatch: Rule = {
  name: "diagnosis_procedure_mismatch",
  severity: WEIGHTS.diagnosis_procedure_mismatch,
  run(claim, ctx) {
    const valid = DIAGNOSIS_PROCEDURES[claim.diagnosis_code];
    if (!valid) return null;
    if (claim.procedure_codes.length === 0) return null;
    if (claim.procedure_codes.some((c) => valid.includes(c))) return null;

    return {
      rule: this.name,
      severity: this.severity,
      evidence: `Diagnosis ${claim.diagnosis_code} is not clinically associated with billed procedure(s) ${claim.procedure_codes.join(", ")}. Expected one of: ${valid.join(", ")}.`,
    };
  },
};
