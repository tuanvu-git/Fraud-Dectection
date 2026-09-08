# Fraud Detection Scoring Engine

A rule-based fraud scoring engine for insurance claims. It analyzes a dataset of 2,000
synthetic claims, applies **8 detection rules**, and assigns every claim a **risk score
from 0 to 100** together with an itemized list of flags — each flag carrying specific,
actionable evidence (real amounts, counts, and dates, not just "rule 3 fired"). It then
measures its own **precision, recall, and false-positive rate** against a known set of
planted fraudulent claims.

Plain **TypeScript** on Node (ESM), no framework. Run with `tsx`; tested with Vitest.

## How it works

```
generate  ─►  data/claims.json + data/labels.json      (2,000 claims, 200 planted frauds)
              │
score     ─►  precompute aggregates                    (per-procedure mean/stddev,
              │                                          provider-per-day counts,
              │                                          provider weekend history)
              ├─ run 8 rules per claim  ─► flags with evidence
              ├─ weighted composite     ─► risk_score 0–100
              ├─ rank by risk_score
              └─►  output/scored_output.json + output/metrics_report.md
```

## The 8 rules

| Rule | Triggers when | Weight |
|---|---|---|
| duplicate_claim | Same member + provider + date + diagnosis as another claim | 5 |
| phantom_billing | Provider submits > 30 claims on a single day | 5 |
| upcoding | Amount > mean + 2·stddev for that procedure code | 4 |
| amount_clustering | Amount between 47,500 and 49,999 (just below the 50,000 auto-approval line) | 4 |
| unbundling | Claim bills separate procedures that a known bundle code covers | 3 |
| weekend_anomaly | Surgical procedure on a weekend from a provider who almost never works weekends (< 5%) | 3 |
| diagnosis_procedure_mismatch | No procedure on the claim is clinically associated with the diagnosis | 2 |
| rapid_resubmission | Same member + same diagnosis within 7 days of an earlier claim | 2 |

## Scoring

```
raw        = sum of the severity weights of every rule that fired
risk_score = round( min(raw / DENOM, 1) * 100 )
flagged    = risk_score >= THRESHOLD
```

`DENOM` and `THRESHOLD` are the only tunable knobs and live in
[`src/engine/config.ts`](src/engine/config.ts). Weights are set so that near-certain fraud
(duplicates, phantom billing) dominates, while softer signals (mismatch, rapid
resubmission) only push a claim over the line when they stack up together. Full rationale
is in [`CLAUDE.md`](CLAUDE.md) and reproduced in the metrics report.

## Assumptions & deliberate deviations from the spec

The spec leaves several points under-specified. The choices made here are listed so a
reviewer can see them as decisions rather than oversights:

- **Rule 3 (upcoding) — single-procedure claims only.** `submitted_amount` is claim-level,
  not per procedure line. Attributing a whole multi-procedure claim total to each of its
  codes pollutes the per-procedure mean/std. So only single-procedure claims feed the
  per-procedure distribution and only single-procedure claims are evaluated.
- **Rule 3 — minimum sample of 5.** A procedure code with fewer than 5 observations has no
  meaningful mean/std (n=1 → std 0 → divide-by-zero). Configurable via
  `UPCODING_MIN_SAMPLE`.
- **Rule 6 (weekend anomaly) — minimum history of 20 claims** before a provider's weekend
  rate is trusted, and the rate is computed **excluding the claim under test**
  (leave-one-out), since that claim is by definition a weekend claim. Configurable via
  `WEEKEND_MIN_HISTORY`.
- **Rule 2 (rapid re-submission) — a 0-day gap does not count.** Same member, same
  diagnosis, same day is a duplicate (rule 1's job), not a re-submission, so the two rules
  don't double-count one event.
- **Rule 7 (diagnosis–procedure mismatch) — "not clinically associated" is read as *no*
  clinical link at all.** The claim is flagged only when *none* of its billed procedures
  match the diagnosis, not when *any one* is unlisted. With an intentionally small 10-pair
  mapping, the stricter "any unlisted" reading would flag almost every legitimate
  multi-procedure claim (evaluation codes, labs, and supplies are never in such a table).
  The 20 planted mismatch claims are single-procedure, so recall is unaffected by this
  choice.
- **Rule 4 (unbundling) — within a single claim only.** Components split across separate
  claims are not detected. The bundle map is illustrative (synthetic codes priced so the
  components exceed the bundled rate); a production system would load CMS NCCI edits.
- **Rule 5 (phantom billing) — the `> 30 claims/day` threshold is the spec's fixed number**
  and is realistic here only because the synthetic providers average ~40 claims per *year*.
  At real facility level a per-provider baseline (like rule 3's) would be the right design.

## Metrics

Target: **recall ≥ 70%** with **false-positive rate ≤ 20%**, measured against
`data/labels.json`. `output/metrics_report.md` contains the final numbers, a
threshold-sweep table showing how recall and FPR trade off, per-rule recall, and the
justification for the chosen weights and threshold.

## Getting started

Prerequisites: **Node.js 20+**.

```bash
npm install

npm run generate   # writes data/claims.json (2,000) and data/labels.json (ground truth)
npm run score      # writes output/scored_output.json and output/metrics_report.md  (runs in < 30s)
npm test           # runs the Vitest suite (15+ tests, at least one per rule)
```

`output/scored_output.json` is every claim ranked by risk score with its flags and
evidence; `output/metrics_report.md` is the human-readable summary.

## Project structure

```
src/engine/
  config.ts        weights, DENOM, THRESHOLD, bundle map, diagnosis–procedure map, RNG seed
  types.ts         shared types
  dates.ts         date helpers   key.ts  composite map keys   rng.ts  seeded RNG
  aggregates.ts    one-pass precompute used by several rules
  score.ts         run rules + compute risk_score
  metrics.ts       precision / recall / FPR + threshold sweep + per-rule recall
  generateData.ts  synthetic dataset + planted fraud
  rules/           one file per rule + index.ts
scripts/
  generate.ts      CLI: build the dataset
  run.ts           CLI: score the dataset + write the report
data/              generated dataset (committed)
output/            scored output + metrics report (committed)
docs/tests/        per-rule test-case specifications
test/              Vitest suites
```

## Deliverables

- Dataset: `data/claims.json`, `data/labels.json`
- Scored output: `output/scored_output.json` (ranked)
- Metrics report: `output/metrics_report.md`
- Tests: `test/`

## Timeline estimate

~4–6 hours:

| Phase | Time |
|---|---|
| Dataset generation + ground truth | ~1h |
| 8 rules + aggregates | ~2h |
| Scoring + metrics + threshold tuning | ~1h |
| Unit tests (from `docs/tests/` specs) | ~1h |
| README / metrics report / assumptions writeup | ~1h |
