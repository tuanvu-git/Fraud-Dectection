import { buildAggregates } from "./aggregates";
import { DENOM } from "./config";
import { RULES } from "./rules";
import type { Aggregates, Claim, RuleContext, ScoredClaim } from "./types";

export function scoreClaim(claim: Claim, ctx: RuleContext): ScoredClaim {
  const flags = RULES.map((r) => r.run(claim, ctx)).filter((f): f is NonNullable<typeof f> => f !== null);
  const raw = flags.reduce((s, f) => s + f.severity, 0);
  const risk_score = Math.round(Math.min(raw / DENOM, 1) * 100);
  return { claim_id: claim.claim_id, risk_score, flags };
}

/** Score every claim and return them ranked by risk_score (descending). */
export function scoreAll(claims: Claim[], agg?: Aggregates): ScoredClaim[] {
  const ctx: RuleContext = { agg: agg ?? buildAggregates(claims) };
  return claims
    .map((c) => scoreClaim(c, ctx))
    .sort((a, b) => b.risk_score - a.risk_score || a.claim_id.localeCompare(b.claim_id));
}
