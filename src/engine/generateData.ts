import {
  BUNDLES,
  DIAGNOSIS_PROCEDURES,
  GENERIC_PROCEDURES,
  PROCEDURE_MEAN,
  SEED,
  UNMAPPED_DIAGNOSES,
} from "./config";
import { addDays, isoFromEpochDay, isWeekend, toEpochDay } from "./dates";
import { Rng } from "./rng";
import type { Claim, ClaimType, Label, RuleName } from "./types";

const YEAR_START = "2024-01-01";
const YEAR_DAYS = 366; // 2024 is a leap year
const PHANTOM_PROVIDER = "PR-01";
const PHANTOM_DATE = "2024-06-17";

const MAPPED_DIAGNOSES = Object.keys(DIAGNOSIS_PROCEDURES);
const BUNDLE_CODES = Object.keys(BUNDLES);
const SURGICAL_CODES = ["S-001", "S-002", "S-003", "S-004", "S-005"];
const UPCODING_CODES = ["P-D01", "P-H01", "P-A01", "P-B01", "P-G01", "P-U01", "P-F01"];

const HOSPITAL_NAMES = [
  "St. Mary's Medical Center", "Riverside General Hospital", "Lakeview Clinic",
  "Summit Health Partners", "Cedar Grove Hospital", "Harbor Point Medical",
  "Northgate Family Practice", "Pine Ridge Surgical Center", "Bayside Community Hospital",
  "Oakwood Health System", "Franklin Street Clinic", "Highland Park Medical Group",
  "Westfield Regional Hospital", "Meadowbrook Care Center", "Concord General",
  "Silver Lake Medical", "Grandview Hospital", "Maple Avenue Clinic",
  "Fairmont Health Center", "Kingsley Memorial Hospital",
];

interface Draft {
  claim: Omit<Claim, "claim_id">;
  patterns: RuleName[];
}

function providerName(id: string): string {
  const idx = Number(id.slice(3)) - 1;
  const base = HOSPITAL_NAMES[idx % HOSPITAL_NAMES.length];
  return idx < HOSPITAL_NAMES.length ? base : `${base} (Site ${Math.floor(idx / HOSPITAL_NAMES.length) + 1})`;
}

function amountFor(codes: string[], rng: Rng, tailProb = 0.02): number {
  let total = 0;
  for (const c of codes) {
    const mean = PROCEDURE_MEAN[c] ?? 1000;
    total += Math.max(rng.gauss(mean, mean * 0.15), mean * 0.4);
  }
  // Mild, occasional elevation -> a realistic sprinkle of borderline claims, not extreme outliers.
  if (rng.bool(tailProb)) total *= 1.15 + rng.next() * 0.3;
  return Math.round(Math.max(total, 50));
}

function randomWeekday(rng: Rng): string {
  for (let i = 0; i < 20; i += 1) {
    const iso = addDays(YEAR_START, rng.int(0, YEAR_DAYS - 1));
    if (!isWeekend(iso) || rng.bool(0.05)) return iso;
  }
  return addDays(YEAR_START, rng.int(0, YEAR_DAYS - 1));
}

function makeClaim(
  rng: Rng,
  over: Partial<Omit<Claim, "claim_id">>,
): Omit<Claim, "claim_id"> {
  const provider_id = over.provider_id ?? `PR-${String(rng.int(1, 50)).padStart(2, "0")}`;
  const claim_date = over.claim_date ?? randomWeekday(rng);
  const base: Omit<Claim, "claim_id"> = {
    member_id: over.member_id ?? `M-${String(rng.int(1, 500)).padStart(4, "0")}`,
    provider_id,
    provider_name: providerName(provider_id),
    claim_date,
    claim_type: over.claim_type ?? "OUTPATIENT",
    diagnosis_code: over.diagnosis_code ?? rng.pick(MAPPED_DIAGNOSES),
    procedure_codes: over.procedure_codes ?? [rng.pick(GENERIC_PROCEDURES)],
    submitted_amount: over.submitted_amount ?? 0,
    is_weekend: isWeekend(claim_date),
  };
  if (!over.submitted_amount) base.submitted_amount = amountFor(base.procedure_codes, rng);
  return { ...base, ...over, is_weekend: isWeekend(base.claim_date) };
}

function generateHonest(rng: Rng): Draft[] {
  const providerIds = Array.from({ length: 50 }, (_, i) => `PR-${String(i + 1).padStart(2, "0")}`);
  const providerWeights = providerIds.map((_, i) => (i < 3 ? 8 : i < 10 ? 3 : 1));
  const memberIds = Array.from({ length: 500 }, (_, i) => `M-${String(i + 1).padStart(4, "0")}`);
  const memberWeights = memberIds.map((_, i) => (i < 40 ? 6 : 1));
  const claimTypes: ClaimType[] = ["OUTPATIENT", "INPATIENT", "DENTAL"];

  const drafts: Draft[] = [];
  for (let i = 0; i < 1800; i += 1) {
    const provider_id = rng.weighted(providerIds, providerWeights);
    const member_id = rng.weighted(memberIds, memberWeights);
    const claim_type = rng.weighted(claimTypes, [58, 27, 15]);
    const mapped = rng.bool(0.85);
    const diagnosis_code = mapped ? rng.pick(MAPPED_DIAGNOSES) : rng.pick(UNMAPPED_DIAGNOSES);

    let procedure_codes: string[];
    if (rng.bool(0.08)) {
      procedure_codes = [rng.pick(BUNDLE_CODES)]; // billed correctly as a bundle
    } else if (mapped) {
      const valid = DIAGNOSIS_PROCEDURES[diagnosis_code];
      procedure_codes = rng.bool(0.2) && valid.length > 1 ? valid.slice(0, 2) : [rng.pick(valid)];
    } else {
      procedure_codes = [rng.pick(GENERIC_PROCEDURES)];
    }
    if (claim_type === "INPATIENT" && rng.bool(0.45)) procedure_codes = [...procedure_codes, rng.pick(SURGICAL_CODES)];

    const claim_date = randomWeekday(rng);
    drafts.push({
      claim: {
        member_id,
        provider_id,
        provider_name: providerName(provider_id),
        claim_date,
        claim_type,
        diagnosis_code,
        procedure_codes,
        submitted_amount: amountFor(procedure_codes, rng),
        is_weekend: isWeekend(claim_date),
      },
      patterns: [],
    });
  }

  // Reserve a provider-day so the phantom-billing episode clears 30 real claims.
  const p1 = drafts.filter((d) => d.claim.provider_id === PHANTOM_PROVIDER).slice(0, 10);
  for (const d of p1) {
    d.claim.claim_date = PHANTOM_DATE;
    d.claim.is_weekend = isWeekend(PHANTOM_DATE);
  }
  return drafts;
}

function lowWeekendProviders(honest: Draft[]): string[] {
  const stats = new Map<string, { total: number; weekend: number }>();
  for (const d of honest) {
    const s = stats.get(d.claim.provider_id) ?? { total: 0, weekend: 0 };
    s.total += 1;
    if (d.claim.is_weekend) s.weekend += 1;
    stats.set(d.claim.provider_id, s);
  }
  return [...stats.entries()]
    .filter(([id, s]) => id !== PHANTOM_PROVIDER && s.total >= 20 && s.weekend / s.total < 0.04)
    .sort((a, b) => a[1].weekend / a[1].total - b[1].weekend / b[1].total)
    .map(([id]) => id);
}

function weekendDates(rng: Rng, n: number): string[] {
  const all: string[] = [];
  for (let i = 0; i < YEAR_DAYS; i += 1) {
    const iso = isoFromEpochDay(toEpochDay(YEAR_START) + i);
    if (isWeekend(iso)) all.push(iso);
  }
  return Array.from({ length: n }, () => rng.pick(all));
}

function generateFraud(rng: Rng, honest: Draft[]): Draft[] {
  const out: Draft[] = [];
  const sample = (n: number) => {
    const pool = [...honest];
    const picked: Draft[] = [];
    for (let i = 0; i < n && pool.length; i += 1) picked.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    return picked;
  };

  // 1. duplicate_claim x30 — clone key fields of an existing claim
  for (const src of sample(30)) {
    out.push({
      claim: makeClaim(rng, {
        member_id: src.claim.member_id,
        provider_id: src.claim.provider_id,
        claim_date: src.claim.claim_date,
        claim_type: src.claim.claim_type,
        diagnosis_code: src.claim.diagnosis_code,
        procedure_codes: [...src.claim.procedure_codes],
        submitted_amount: Math.round(src.claim.submitted_amount * (0.98 + rng.next() * 0.04)),
      }),
      patterns: ["duplicate_claim"],
    });
  }

  // 2. rapid_resubmission x30 — same member + diagnosis 1–7 days later, different provider
  for (const src of sample(30)) {
    // keep the follow-up strictly 1–7 days after the source and inside 2024
    const maxDay = toEpochDay("2024-12-31");
    const gap = rng.int(1, 7);
    const day = Math.min(toEpochDay(src.claim.claim_date) + gap, maxDay);
    const date = day > toEpochDay(src.claim.claim_date) ? isoFromEpochDay(day) : addDays(src.claim.claim_date, -gap);
    const valid = DIAGNOSIS_PROCEDURES[src.claim.diagnosis_code] ?? GENERIC_PROCEDURES;
    out.push({
      claim: makeClaim(rng, {
        member_id: src.claim.member_id,
        diagnosis_code: src.claim.diagnosis_code,
        claim_date: date,
        procedure_codes: [rng.pick(valid)],
      }),
      patterns: ["rapid_resubmission"],
    });
  }

  // 3. upcoding x30 — a single common procedure billed far above its mean
  for (let i = 0; i < 30; i += 1) {
    const code = rng.pick(UPCODING_CODES);
    const diagnosis = MAPPED_DIAGNOSES.find((d) => DIAGNOSIS_PROCEDURES[d].includes(code))!;
    out.push({
      claim: makeClaim(rng, {
        diagnosis_code: diagnosis,
        procedure_codes: [code],
        submitted_amount: Math.round(PROCEDURE_MEAN[code] * (2.5 + rng.next() * 1.5)),
      }),
      patterns: ["upcoding"],
    });
  }

  // 4. unbundling x25 — every component of a bundle billed separately
  for (let i = 0; i < 25; i += 1) {
    const bundle = rng.pick(BUNDLE_CODES);
    const components = BUNDLES[bundle];
    out.push({
      claim: makeClaim(rng, {
        diagnosis_code: rng.pick(UNMAPPED_DIAGNOSES),
        procedure_codes: [...components],
        submitted_amount: Math.round(
          components.reduce((s, c) => s + PROCEDURE_MEAN[c], 0) * (1 + rng.next() * 0.15),
        ),
      }),
      patterns: ["unbundling"],
    });
  }

  // 5. phantom_billing x25 — one provider, one day
  for (let i = 0; i < 25; i += 1) {
    const diagnosis = rng.pick(MAPPED_DIAGNOSES);
    out.push({
      claim: makeClaim(rng, {
        provider_id: PHANTOM_PROVIDER,
        claim_date: PHANTOM_DATE,
        diagnosis_code: diagnosis,
        procedure_codes: [rng.pick(DIAGNOSIS_PROCEDURES[diagnosis])],
      }),
      patterns: ["phantom_billing"],
    });
  }

  // 6. weekend_anomaly x20 — surgical, weekend, weekday-only provider (one per provider,
  //    so the historical weekend rate stays well below 5% even after injection)
  const providers = lowWeekendProviders(honest);
  if (providers.length < 20) {
    throw new Error(`only ${providers.length} low-weekend providers available for injection`);
  }
  const dates = weekendDates(rng, 20);
  for (let i = 0; i < 20; i += 1) {
    const provider_id = providers[i];
    out.push({
      claim: makeClaim(rng, {
        provider_id,
        claim_date: dates[i],
        claim_type: "INPATIENT",
        diagnosis_code: rng.pick(UNMAPPED_DIAGNOSES),
        procedure_codes: [rng.pick(SURGICAL_CODES)],
      }),
      patterns: ["weekend_anomaly"],
    });
  }

  // 7. diagnosis_procedure_mismatch x20 — procedures from an unrelated diagnosis
  for (let i = 0; i < 20; i += 1) {
    const dx = rng.pick(MAPPED_DIAGNOSES);
    let otherDx = rng.pick(MAPPED_DIAGNOSES);
    while (otherDx === dx) otherDx = rng.pick(MAPPED_DIAGNOSES);
    out.push({
      claim: makeClaim(rng, {
        diagnosis_code: dx,
        procedure_codes: [rng.pick(DIAGNOSIS_PROCEDURES[otherDx])],
      }),
      patterns: ["diagnosis_procedure_mismatch"],
    });
  }

  // 8. amount_clustering x20 — just below the 50,000 auto-approval line
  for (let i = 0; i < 20; i += 1) {
    const code = rng.pick(["S-002", "S-003", "S-005"]); // high-mean code so it is not also an upcode
    out.push({
      claim: makeClaim(rng, {
        claim_type: "INPATIENT",
        diagnosis_code: rng.pick(UNMAPPED_DIAGNOSES),
        procedure_codes: [code],
        claim_date: randomWeekday(rng),
        submitted_amount: rng.int(47_500, 49_999),
      }),
      patterns: ["amount_clustering"],
    });
  }

  return out;
}

export function generateDataset(seed = SEED): { claims: Claim[]; labels: Label[] } {
  const rng = new Rng(seed);
  const honest = generateHonest(rng);
  const fraud = generateFraud(rng, honest);
  const drafts = [...honest, ...fraud];

  // Deterministic Fisher–Yates shuffle, then assign sequential claim ids.
  for (let i = drafts.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [drafts[i], drafts[j]] = [drafts[j], drafts[i]];
  }

  const claims: Claim[] = [];
  const labels: Label[] = [];
  drafts.forEach((d, i) => {
    const claim_id = `CLM-${String(i + 1).padStart(5, "0")}`;
    claims.push({ claim_id, ...d.claim });
    labels.push({
      claim_id,
      is_fraud: d.patterns.length > 0,
      fraud_patterns: d.patterns,
    });
  });

  return { claims, labels };
}
