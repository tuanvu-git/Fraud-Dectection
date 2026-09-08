import { AUTO_APPROVAL_THRESHOLD, CLUSTERING_LOWER, WEIGHTS } from "../config";
import type { Rule } from "../types";

/** Rule 8 — amount within 5% below the 50,000 auto-approval threshold (47,500–49,999). */
export const amountClustering: Rule = {
  name: "amount_clustering",
  severity: WEIGHTS.amount_clustering,
  run(claim, _ctx) {
    const amt = claim.submitted_amount;
    if (amt < CLUSTERING_LOWER || amt >= AUTO_APPROVAL_THRESHOLD) return null;

    const pct = ((amt / AUTO_APPROVAL_THRESHOLD) * 100).toFixed(1);
    return {
      rule: this.name,
      severity: this.severity,
      evidence: `Amount ${Math.round(amt).toLocaleString("en-US")} is ${pct}% of the ${AUTO_APPROVAL_THRESHOLD.toLocaleString("en-US")} auto-approval threshold (within the ${CLUSTERING_LOWER.toLocaleString("en-US")}–49,999 clustering band).`,
    };
  },
};
