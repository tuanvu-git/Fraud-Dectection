import { UPCODING_MIN_SAMPLE, UPCODING_SD, WEIGHTS } from "../config";
import type { Rule } from "../types";

/**
 * Rule 3 — submitted amount > mean + 2·sd for the procedure code.
 *
 * submitted_amount is claim-level. The per-procedure distribution is built from
 * single-procedure claims only (see aggregates.ts), so the rule likewise only
 * evaluates single-procedure claims — the case where "amount for that procedure" is
 * unambiguous.
 */
export const upcoding: Rule = {
  name: "upcoding",
  severity: WEIGHTS.upcoding,
  run(claim, ctx) {
    if (claim.procedure_codes.length !== 1) return null;
    const code = claim.procedure_codes[0];
    const stat = ctx.agg.procedureStats.get(code);
    if (!stat || stat.count < UPCODING_MIN_SAMPLE || stat.std <= 0) return null;

    const z = (claim.submitted_amount - stat.mean) / stat.std;
    if (z <= UPCODING_SD) return null;
    const worst = { code, z, mean: stat.mean, count: stat.count };

    return {
      rule: this.name,
      severity: this.severity,
      evidence: `Submitted amount ${Math.round(claim.submitted_amount).toLocaleString("en-US")} for procedure ${worst.code} is ${worst.z.toFixed(1)} standard deviations above the mean of ${Math.round(worst.mean).toLocaleString("en-US")} (n=${worst.count}).`,
    };
  },
};
