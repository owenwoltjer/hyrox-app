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
import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TrainingPlanRow {
  day_key: string;
  phase: number;
  week: number;
  dow: string;
  date: string;
  type: string;
  type_label: string;
  session: string;
  desc: string;
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
    const batch = plan.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(plan.length / BATCH_SIZE);

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
