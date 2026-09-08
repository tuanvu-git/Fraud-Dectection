import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateDataset } from "../src/engine/generateData";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");

const { claims, labels } = generateDataset();

mkdirSync(dataDir, { recursive: true });
writeFileSync(join(dataDir, "claims.json"), `${JSON.stringify(claims, null, 2)}\n`);
writeFileSync(join(dataDir, "labels.json"), `${JSON.stringify(labels, null, 2)}\n`);

const fraud = labels.filter((l) => l.is_fraud);
const byPattern = new Map<string, number>();
for (const l of fraud) for (const p of l.fraud_patterns) byPattern.set(p, (byPattern.get(p) ?? 0) + 1);

console.log(`Wrote ${claims.length} claims to data/claims.json`);
console.log(`Wrote ${labels.length} labels to data/labels.json (${fraud.length} fraudulent)`);
for (const [p, n] of [...byPattern].sort()) console.log(`  ${p}: ${n}`);
