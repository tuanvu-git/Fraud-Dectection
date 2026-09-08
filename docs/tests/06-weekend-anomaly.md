# Rule 6 — weekend_anomaly

**Fires when:** the claim is a **surgical** procedure, on a **weekend** (`is_weekend` /
derived from `claim_date`), from a provider whose **historical weekend volume is < 5%** of
their total claims.
**Severity weight:** 3
**Evidence must name:** the provider, the date/weekday, the surgical procedure code, and
the provider's historical weekend rate (e.g. "1.2% of PR1's 250 claims").

## Open decisions

- What marks a procedure as "surgical"? (proposed: a `SURGICAL_PROCEDURE_CODES` set in
  config, or a code prefix like `S-`)
- Is the provider's weekend history computed including or excluding this claim? (proposed:
  excluding the claim under test)
- Minimum provider claim count before the rule applies? (proposed: ≥ 20)

## Proposed test cases

| # | Case | Setup | Expected result | Notes |
|---|---|---|---|---|
| 1 | Weekday-only surgeon operates Saturday | PR1: 200 claims, 0 on weekends; test claim = surgical, Saturday | flag; evidence "0% historical weekend volume" | |
| 2 | Provider at 4% weekend | PR1: 100 claims, 4 on weekends; test surgical Saturday | flag (< 5%) | boundary |
| 3 | Provider at 5% weekend | PR1: 100 claims, 5 on weekends; test surgical Saturday | no flag | boundary — strict `<` |
| 4 | Non-surgical weekend claim | PR1 0% weekend history; test claim = OUTPATIENT consult, Sunday | no flag | not surgical |
| 5 | Surgical on a weekday | PR1 0% weekend; test surgical, Tuesday | no flag | not a weekend |
| 6 | Regular weekend operator | PR1: 100 claims, 30 on weekends; test surgical Saturday | no flag | 30% weekend is normal for them |
| 7 | New / low-volume provider | PR1 has 5 claims total | no flag | insufficient history; confirm threshold |
