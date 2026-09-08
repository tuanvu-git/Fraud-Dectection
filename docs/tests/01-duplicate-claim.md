# Rule 1 — duplicate_claim

**Fires when:** another claim exists with the same `member_id` + `provider_id` +
`claim_date` + `diagnosis_code`.
**Severity weight:** 5
**Evidence must name:** the matching `claim_id`(s), and the shared member / provider /
date / diagnosis.

## Proposed test cases

| # | Case | Setup | Expected result | Notes |
|---|---|---|---|---|
| 1 | Exact duplicate pair | Two claims, identical member+provider+date+diagnosis, different `claim_id` and amount | Both flagged; evidence names the other `claim_id` and the shared key | Confirm: do we flag both claims or only the later one? |
| 2 | Triplicate | Three claims sharing the key | All three flagged; evidence lists the other two `claim_id`s | |
| 3 | Same key, different provider | Same member+date+diagnosis, provider differs | no flag | |
| 4 | Same key, different date | Same member+provider+diagnosis, date differs by 1 day | no flag | rapid_resubmission may catch this instead |
| 5 | Same key, different diagnosis | member+provider+date equal, diagnosis differs | no flag | |
| 6 | Unique claim | No other claim shares any of the four fields | no flag | |
| 7 | Case / whitespace in diagnosis code | Two claims, diagnosis `"E11.9"` vs `"e11.9 "` | Confirm expected — flag (normalize) or no flag (exact match)? | decide normalization policy |
