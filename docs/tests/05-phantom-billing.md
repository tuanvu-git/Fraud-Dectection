# Rule 5 — phantom_billing

**Fires when:** the claim's `provider_id` has **> 30 claims** on the claim's `claim_date`.
**Severity weight:** 5
**Evidence must name:** the provider, the date, and the count of claims that day.

## Open decision

- Flag **every** claim from that provider on that day, or just mark the day? (proposed:
  flag every claim on that provider-day, since each is part of the inflated batch)

## Proposed test cases

| # | Case | Setup | Expected result | Notes |
|---|---|---|---|---|
| 1 | 40 claims in one day | Provider PR1, 40 claims all dated Jan 15 | all 40 flagged; evidence "PR1 submitted 40 claims on 2024-01-15" | |
| 2 | Exactly 31 claims | PR1, 31 claims on Jan 15 | flagged (> 30) | boundary |
| 3 | Exactly 30 claims | PR1, 30 claims on Jan 15 | no flag | boundary — strict `>` |
| 4 | 40 claims spread over 2 days | PR1, 20 on Jan 15 + 20 on Jan 16 | no flag | per-day, not per-provider |
| 5 | High annual volume, low daily | PR1 has 300 claims/year but max 10 on any day | no flag | large hospital baseline |
| 6 | Two providers same day | PR1 35 on Jan 15, PR2 5 on Jan 15 | only PR1's claims flagged | |
