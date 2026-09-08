import { describe, expect, it } from "vitest";
import { duplicateClaim } from "../../src/engine/rules";
import { claim, ctx } from "../helpers";

describe("duplicate_claim", () => {
  const key = { member_id: "M-1", provider_id: "PR-1", claim_date: "2024-05-06", diagnosis_code: "I10" };

  it("flags both claims of an exact duplicate pair and names the other claim", () => {
    const a = claim({ claim_id: "CLM-A", ...key, submitted_amount: 900 });
    const b = claim({ claim_id: "CLM-B", ...key, submitted_amount: 1200 });
    const c = ctx([a, b]);
    const fa = duplicateClaim.run(a, c);
    const fb = duplicateClaim.run(b, c);
    expect(fa?.evidence).toContain("CLM-B");
    expect(fb?.evidence).toContain("CLM-A");
    expect(fa?.severity).toBe(5);
  });

  it("does not flag when the provider differs", () => {
    const a = claim({ claim_id: "CLM-A", ...key });
    const b = claim({ claim_id: "CLM-B", ...key, provider_id: "PR-2" });
    expect(duplicateClaim.run(a, ctx([a, b]))).toBeNull();
  });

  it("does not flag a claim with a different date", () => {
    const a = claim({ claim_id: "CLM-A", ...key });
    const b = claim({ claim_id: "CLM-B", ...key, claim_date: "2024-05-07" });
    expect(duplicateClaim.run(a, ctx([a, b]))).toBeNull();
  });

  it("lists both siblings for a triplicate", () => {
    const cs = ["A", "B", "C"].map((id) => claim({ claim_id: `CLM-${id}`, ...key }));
    const f = duplicateClaim.run(cs[0], ctx(cs));
    expect(f?.evidence).toContain("CLM-B");
    expect(f?.evidence).toContain("CLM-C");
  });
});
