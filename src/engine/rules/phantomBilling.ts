import { PHANTOM_BILLING_DAILY_LIMIT, WEIGHTS } from "../config";
import { compositeKey } from "../key";
import type { Rule } from "../types";

/** Rule 5 — provider submits more than 30 claims on a single date. */
export const phantomBilling: Rule = {
  name: "phantom_billing",
  severity: WEIGHTS.phantom_billing,
  run(claim, ctx) {
    const count =
      ctx.agg.providerDayCounts.get(compositeKey(claim.provider_id, claim.claim_date)) ?? 0;
    if (count <= PHANTOM_BILLING_DAILY_LIMIT) return null;

    return {
      rule: this.name,
      severity: this.severity,
      evidence: `Provider ${claim.provider_name} (${claim.provider_id}) submitted ${count} claims on ${claim.claim_date}, exceeding the ${PHANTOM_BILLING_DAILY_LIMIT}-claims-per-day threshold.`,
    };
  },
};
