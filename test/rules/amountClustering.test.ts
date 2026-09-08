import { describe, expect, it } from "vitest";
import { amountClustering } from "../../src/engine/rules";
import { claim, ctx } from "../helpers";

const run = (amount: number) => {
  const a = claim({ submitted_amount: amount });
  return amountClustering.run(a, ctx([a]));
};

describe("amount_clustering", () => {
  it("flags an amount inside the 47,500–49,999 band with a percentage", () => {
    const f = run(49_500);
    expect(f?.evidence).toContain("99.0%");
    expect(f?.severity).toBe(4);
  });

  it("flags the lower boundary 47,500", () => {
    expect(run(47_500)).not.toBeNull();
  });

  it("does not flag 47,499", () => {
    expect(run(47_499)).toBeNull();
  });

  it("flags 49,999", () => {
    expect(run(49_999)).not.toBeNull();
  });

  it("does not flag exactly 50,000", () => {
    expect(run(50_000)).toBeNull();
  });

  it("does not flag an amount well below the band", () => {
    expect(run(20_000)).toBeNull();
  });
});
