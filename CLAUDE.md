# Fraud Detection Scoring Engine — Project Reference

Rule-based fraud scoring engine for insurance claims (AI Challenge 10). Analyzes 2,000
synthetic claims, assigns each a risk score 0–100 with itemized evidence, and reports
precision / recall / FPR against planted ground truth.

## Tech stack

- **TypeScript** on Node 20+ (ESM), no framework
- **tsx** runs the CLI scripts directly
- **Vitest** for unit tests
- **seedrandom** — deterministic, reproducible dataset generation
- All engine logic lives under `src/engine/`; `scripts/` are thin CLI wrappers.

## Scoring formula

```
raw        = Σ severity_weight(triggered rules)
risk_score = round( min(raw / DENOM, 1) * 100 )
is_flagged = risk_score >= THRESHOLD
```

- `DENOM` and `THRESHOLD` are the **only** tunable constants — both in `src/engine/config.ts`.
- Start with `DENOM = 8`; tune `THRESHOLD` via the sweep to hit metric targets.
- Final output = every claim ranked by `risk_score` descending.

## Severity weights

| Rule | Weight | Rationale |
|---|---|---|
| duplicate_claim | 5 | Near-zero legitimate explanation; direct double-billing |
| phantom_billing | 5 | Physically implausible volume; provider-level; high $ impact |
| upcoding | 4 | Strong $ impact + intent; complex cases can be genuinely expensive |
| amount_clustering | 4 | Deliberate threshold-gaming; bounded per-claim loss |
| unbundling | 3 | Clear billing tactic; procedures are sometimes genuinely separate |
| weekend_anomaly | 3 | Behavioral break; needs provider-history context to be meaningful |
| diagnosis_procedure_mismatch | 2 | Often a coding / data-entry error; mapping incomplete by design |
| rapid_resubmission | 2 | Legitimate follow-up / staged care looks identical |

Low-weight rules are weak alone but meaningful **in combination** — the weighted composite
is the whole point.

## Metrics targets

Against `data/labels.json` (binary `is_fraud`): **recall ≥ 70%**, **FPR ≤ 20%**.

```
recall    = TP / (TP + FN)      # of real frauds, how many caught
FPR       = FP / (FP + TN)      # of honest claims, how many wrongly flagged
precision = TP / (TP + FP)      # of flagged claims, how many were real
```

`output/metrics_report.md` must include:
- final precision / recall / FPR at the chosen threshold
- a threshold-sweep table with the chosen row marked
- per-rule recall (e.g. caught 28/30 duplicates)
- the weight + threshold justification paragraph

## Dataset generation rules

- 2,000 claims. Columns per spec: `claim_id, member_id, provider_id, provider_name,
  claim_date, claim_type, diagnosis_code, procedure_codes[], submitted_amount, is_weekend`.
- **~500 members**, skewed: most 1–3 claims, a few high-utilizers (10–20).
- **~50 providers**, skewed: a few high-volume hospitals (100–200 claims) used to seed
  phantom-billing days.
- Plant **exactly** 200 fraudulent claims (~10%):

  | Pattern | Count |
  |---|---|
  | duplicate_claim | 30 |
  | rapid_resubmission | 30 |
  | upcoding | 30 |
  | unbundling | 25 |
  | phantom_billing | 25 |
  | weekend_anomaly | 20 |
  | diagnosis_procedure_mismatch | 20 |
  | amount_clustering | 20 |

- Ground truth (`data/labels.json`): `{ claim_id, is_fraud: boolean, fraud_patterns: string[] }`.
  `is_fraud` reflects **injected intent**, not rules fired.
- The honest 1,800 get realistic noise (fat-tailed amounts, random dates) so ~5–15%
  naturally trip a low-weight rule — those are real false positives, not injected.
- Rules must detect patterns **generically** (stats, group counts, date math) and must
  never read the planted labels.
- Fixed `seedrandom` seed → identical dataset every run.

## The 8 rules (thresholds fixed by spec)

1. **duplicate_claim** — same member + provider + claim_date + diagnosis_code
2. **rapid_resubmission** — same member + same diagnosis within 7 days of a prior claim
3. **upcoding** — submitted_amount > mean + 2·stddev for that procedure code
4. **unbundling** — claim's procedure set fully covers a known bundle (≥5 bundles in config)
5. **phantom_billing** — provider has > 30 claims on a single date
6. **weekend_anomaly** — surgical procedure on a weekend from a provider with < 5%
   historical weekend volume
7. **diagnosis_procedure_mismatch** — none of the claim's procedures are clinically
   associated with the diagnosis (≥10 valid diagnosis–procedure pairs in config)
8. **amount_clustering** — submitted_amount in 47,500–49,999 (5% below the 50,000
   auto-approval threshold)

Each rule returns `null` or `{ rule, severity, evidence }`. `evidence` must be a specific
sentence with real numbers — e.g. *"Submitted amount 85,000 for procedure P-1234 is 2.8
standard deviations above the mean of 32,000."*

## Layout

```
src/engine/
  config.ts        # weights, DENOM, THRESHOLD, bundle map, dx-procedure map, seed
  types.ts         # Claim, Flag, ScoredClaim, Label, Aggregates
  dates.ts         # epoch-day / weekend helpers
  key.ts           # collision-proof composite map keys
  rng.ts           # seeded RNG (weighted pick, gaussian)
  aggregates.ts    # one-pass precompute: per-procedure mean/stddev (single-proc claims),
                   #   provider-day counts, provider weekend history, dup / member-dx groups
  score.ts         # run all rules -> raw -> risk_score
  metrics.ts       # precision / recall / FPR + threshold sweep + per-rule recall
  generateData.ts  # build 2,000 claims + plant 200 fraud + emit labels
  rules/
    duplicateClaim.ts  rapidResubmission.ts  upcoding.ts  unbundling.ts
    phantomBilling.ts   weekendAnomaly.ts     diagnosisProcedureMismatch.ts
    amountClustering.ts  index.ts   # RULES array
scripts/
  generate.ts      # -> data/claims.json, data/labels.json
  run.ts           # -> output/scored_output.json, output/metrics_report.md
test/              # Vitest suites, built from docs/tests/ specs
data/  output/  docs/tests/
```

## Commands

```
npm run generate   # data/claims.json + data/labels.json
npm run score      # output/scored_output.json + output/metrics_report.md  (< 30s)
npm test           # vitest — 15+ tests, >= 1 per rule
```

## Workflow notes

- Test specs live in `docs/tests/` as annotate-first Markdown tables. The user reviews and
  fills in expected assertions **before** any test code is written.
- Implementation order after docs approval: `config`+`types` → `generateData`+`generate` →
  `aggregates` → 8 rules → `score` → `metrics`+`run` → Vitest → git init + push.
