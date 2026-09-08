import { describe, expect, it } from "vitest";
import { rapidResubmission } from "../../src/engine/rules";
import { claim, ctx } from "../helpers";

describe("rapid_resubmission", () => {
  const base = { member_id: "M-1", diagnosis_code: "J45.909" };

  it("flags a claim 3 days after an earlier same-diagnosis claim", () => {
    const first = claim({ claim_id: "CLM-1", ...base, claim_date: "2024-02-01", provider_id: "PR-1" });
    const second = claim({ claim_id: "CLM-2", ...base, claim_date: "2024-02-04", provider_id: "PR-2" });
    const f = rapidResubmission.run(second, ctx([first, second]));
    expect(f?.evidence).toContain("CLM-1");
    expect(f?.evidence).toContain("3 day");
  });

  it("flags exactly at the 7-day boundary", () => {
    const first = claim({ claim_id: "CLM-1", ...base, claim_date: "2024-02-01" });
    const second = claim({ claim_id: "CLM-2", ...base, claim_date: "2024-02-08" });
    expect(rapidResubmission.run(second, ctx([first, second]))).not.toBeNull();
  });

  it("does not flag at 8 days apart", () => {
    const first = claim({ claim_id: "CLM-1", ...base, claim_date: "2024-02-01" });
    const second = claim({ claim_id: "CLM-2", ...base, claim_date: "2024-02-09" });
    expect(rapidResubmission.run(second, ctx([first, second]))).toBeNull();
  });

  it("does not flag when the diagnosis differs", () => {
    const first = claim({ claim_id: "CLM-1", member_id: "M-1", diagnosis_code: "J45.909", claim_date: "2024-02-01" });
    const second = claim({ claim_id: "CLM-2", member_id: "M-1", diagnosis_code: "I10", claim_date: "2024-02-03" });
    expect(rapidResubmission.run(second, ctx([first, second]))).toBeNull();
  });

  it("does not flag a same-day (0-day gap) claim — that is a duplicate, not a re-submission", () => {
    const first = claim({ claim_id: "CLM-1", ...base, claim_date: "2024-02-01" });
    const second = claim({ claim_id: "CLM-2", ...base, claim_date: "2024-02-01" });
    expect(rapidResubmission.run(second, ctx([first, second]))).toBeNull();
  });

  it("does not flag the earliest claim in a burst", () => {
    const first = claim({ claim_id: "CLM-1", ...base, claim_date: "2024-02-01" });
    const second = claim({ claim_id: "CLM-2", ...base, claim_date: "2024-02-03" });
    expect(rapidResubmission.run(first, ctx([first, second]))).toBeNull();
  });
});
