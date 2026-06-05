/**
 * seed-all-phases.ts
 *
 * Reads data/training-plan-complete.json and upserts every row into the
 * training_plan table in Supabase using the service role key (bypasses RLS).
 *
 * Usage:
 *   npx tsx scripts/seed-all-phases.ts
 *
 * Required env vars (add to .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env.local so the script works without any extra setup
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TrainingPlanRow {
  day_key: string;
  phase: number;   // not a DB column — stripped
  week: number;    // DB column is week_number
  dow: string;
  date: string;
  type: string;
  type_label: string;
  session: string; // DB column is session_name
  desc: string;    // DB column is description
  is_rest?: boolean; // not a DB column — stripped
}

// Shape sent to Supabase
interface DbRow {
  day_key: string;
  week_number: number;
  dow: string;
  date: string;
  type: string;
  type_label: string;
  session_name: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Env validation
// ---------------------------------------------------------------------------
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "\n❌  Missing environment variables.\n" +
    "    Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local\n" +
    "    then run:  npx tsx scripts/seed-all-phases.ts\n"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Supabase client — service role bypasses RLS so upserts always succeed
// ---------------------------------------------------------------------------
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Load plan
// ---------------------------------------------------------------------------
const jsonPath = resolve(process.cwd(), "data/training-plan-complete.json");
let plan: TrainingPlanRow[];

try {
  plan = JSON.parse(readFileSync(jsonPath, "utf8"));
} catch (err) {
  console.error("❌  Could not read data/training-plan-complete.json:", err);
  process.exit(1);
}

console.log(`\n📋  Loaded ${plan.length} rows from data/training-plan-complete.json`);

// ---------------------------------------------------------------------------
// Upsert in batches of 50
// ---------------------------------------------------------------------------
const BATCH_SIZE = 50;

async function seed() {
  let upserted = 0;
  let failed = 0;

  for (let i = 0; i < plan.length; i += BATCH_SIZE) {
    const rawBatch = plan.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(plan.length / BATCH_SIZE);

    // Map JSON fields → DB column names; strip phase and is_rest (not DB columns)
    const batch: DbRow[] = rawBatch.map((row) => ({
      day_key: row.day_key,
      week_number: row.week,
      dow: row.dow,
      date: row.date,
      type: row.type,
      type_label: row.type_label,
      session_name: row.session,
      description: row.desc,
    }));

    process.stdout.write(
      `  Batch ${batchNum}/${totalBatches} — rows ${i + 1}–${Math.min(i + BATCH_SIZE, plan.length)} ... `
    );

    const { data, error } = await supabase
      .from("training_plan")
      .upsert(batch, { onConflict: "day_key" })
      .select("day_key");

    if (error) {
      console.error(`\n  ❌  Error in batch ${batchNum}:`, error.message);
      failed += batch.length;
    } else {
      console.log(`✓ (${data?.length ?? batch.length} rows)`);
      upserted += data?.length ?? batch.length;
    }
  }

  console.log(
    `\n✅  Done — ${upserted} rows upserted, ${failed} failed.\n`
  );

  if (failed > 0) process.exit(1);
}

seed().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
