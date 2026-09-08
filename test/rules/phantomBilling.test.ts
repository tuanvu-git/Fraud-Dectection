import { describe, expect, it } from "vitest";
import { phantomBilling } from "../../src/engine/rules";
import { claim, ctx } from "../helpers";

const dayClaims = (n: number, provider = "PR-9", date = "2024-07-10") =>
  Array.from({ length: n }, (_, i) => claim({ claim_id: `CLM-${i}`, provider_id: provider, claim_date: date }));

describe("phantom_billing", () => {
  it("flags every claim on a provider-day above 30 and reports the count", () => {
    const claims = dayClaims(35);
    const f = phantomBilling.run(claims[0], ctx(claims));
    expect(f?.evidence).toContain("35 claims");
    expect(f?.severity).toBe(5);
  });

  it("flags at exactly 31 claims", () => {
    const claims = dayClaims(31);
    expect(phantomBilling.run(claims[0], ctx(claims))).not.toBeNull();
  });

  it("does not flag at exactly 30 claims", () => {
    const claims = dayClaims(30);
    expect(phantomBilling.run(claims[0], ctx(claims))).toBeNull();
  });

  it("does not flag when the volume is spread across two days", () => {
    const claims = [...dayClaims(20, "PR-9", "2024-07-10"), ...dayClaims(20, "PR-9", "2024-07-11")];
    expect(phantomBilling.run(claims[0], ctx(claims))).toBeNull();
  });
});
