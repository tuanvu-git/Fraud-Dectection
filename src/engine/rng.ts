import seedrandom from "seedrandom";

export class Rng {
  private prng: seedrandom.PRNG;

  constructor(seed: string) {
    this.prng = seedrandom(seed);
  }

  next(): number {
    return this.prng();
  }

  int(minInclusive: number, maxInclusive: number): number {
    return minInclusive + Math.floor(this.prng() * (maxInclusive - minInclusive + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  /** Weighted pick. `weights[i]` corresponds to `items[i]`. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = this.prng() * total;
    for (let i = 0; i < items.length; i += 1) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /** Box–Muller normal sample. */
  gauss(mean: number, std: number): number {
    const u = Math.max(this.prng(), 1e-12);
    const v = this.prng();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  bool(pTrue: number): boolean {
    return this.prng() < pTrue;
  }
}
