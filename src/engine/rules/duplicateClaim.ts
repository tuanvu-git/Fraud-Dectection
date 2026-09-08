import { WEIGHTS } from "../config";
import { compositeKey } from "../key";
import type { Rule } from "../types";

/** Rule 1 — same member + provider + date + diagnosis as another claim. */
export const duplicateClaim: Rule = {
  name: "duplicate_claim",
  severity: WEIGHTS.duplicate_claim,
  run(claim, ctx) {
    const key = compositeKey(
      claim.member_id,
      claim.provider_id,
      claim.claim_date,
      claim.diagnosis_code,
    );
    const group = ctx.agg.duplicateGroups.get(key) ?? [];
    const others = group.filter((c) => c.claim_id !== claim.claim_id);
    if (others.length === 0) return null;

    const ids = others.map((c) => c.claim_id).join(", ");
    return {
      rule: this.name,
      severity: this.severity,
      evidence: `Claim shares member ${claim.member_id}, provider ${claim.provider_id}, date ${claim.claim_date} and diagnosis ${claim.diagnosis_code} with ${others.length} other claim(s): ${ids}.`,
    };
  },
};
