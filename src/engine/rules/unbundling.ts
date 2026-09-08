import { BUNDLES, PROCEDURE_MEAN, WEIGHTS } from "../config";
import type { Rule } from "../types";

/** Rule 4 — claim bills every component of a known bundle instead of the bundle code. */
export const unbundling: Rule = {
  name: "unbundling",
  severity: WEIGHTS.unbundling,
  run(claim, ctx) {
    const codes = new Set(claim.procedure_codes);
    if (codes.size === 0) return null;

    const matched: string[] = [];
    let componentTotal = 0;
    let bundleTotal = 0;

    for (const [bundle, components] of Object.entries(BUNDLES)) {
      if (codes.has(bundle)) continue;
      if (components.every((c) => codes.has(c))) {
        matched.push(`${bundle} (${components.join(" + ")})`);
        componentTotal += components.reduce((s, c) => s + (PROCEDURE_MEAN[c] ?? 0), 0);
        bundleTotal += PROCEDURE_MEAN[bundle] ?? 0;
      }
    }
    if (matched.length === 0) return null;

    const premium = componentTotal - bundleTotal;
    const premiumText =
      premium > 0
        ? ` Billed as components costs ~${Math.round(premium).toLocaleString("en-US")} more than the bundled rate.`
        : "";

    return {
      rule: this.name,
      severity: this.severity,
      evidence: `Claim bills the individual components of bundle(s) ${matched.join("; ")} rather than the bundled code.${premiumText}`,
    };
  },
};
