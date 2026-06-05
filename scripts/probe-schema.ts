import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Iteratively discover columns by adding one at a time and noting the first failure
async function tryInsert(payload: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await supabase
    .from("training_plan")
    .insert(payload as any)
    .select();
  if (data?.[0]) {
    await supabase.from("training_plan").delete().eq("day_key", "__probe__");
    return null; // success
  }
  return error?.message ?? "unknown error";
}

async function probe() {
  // Try all the original column names first
  const candidates = [
    { day_key: "__probe__", week_number: 1 },
    { day_key: "__probe__", week_number: 1, dow: "Mon" },
    { day_key: "__probe__", week_number: 1, dow: "Mon", date: "Jun 1" },
    { day_key: "__probe__", week_number: 1, dow: "Mon", date: "Jun 1", type: "run" },
    { day_key: "__probe__", week_number: 1, dow: "Mon", date: "Jun 1", type: "run", type_label: "Run" },
    { day_key: "__probe__", week_number: 1, dow: "Mon", date: "Jun 1", type: "run", type_label: "Run", session: "Test" },
    { day_key: "__probe__", week_number: 1, dow: "Mon", date: "Jun 1", type: "run", type_label: "Run", session_name: "Test" },
    { day_key: "__probe__", week_number: 1, dow: "Mon", date: "Jun 1", type: "run", type_label: "Run", session_title: "Test" },
    { day_key: "__probe__", week_number: 1, dow: "Mon", date: "Jun 1", type: "run", type_label: "Run", workout: "Test" },
    { day_key: "__probe__", week_number: 1, dow: "Mon", date: "Jun 1", type: "run", type_label: "Run", title: "Test" },
    { day_key: "__probe__", week_number: 1, dow: "Mon", date: "Jun 1", type: "run", type_label: "Run", name: "Test" },
  ];

  for (const payload of candidates) {
    const err = await tryInsert(payload);
    const keys = Object.keys(payload);
    if (!err) {
      console.log(`✓ Succeeded with: ${keys.join(", ")}`);

      // Now probe for description
      const full = { ...payload, description: "test desc" };
      const err2 = await tryInsert({ ...full, day_key: "__probe2__" } as any);
      if (!err2) {
        console.log("✓ 'description' column exists");
        const { data: final } = await supabase.from("training_plan")
          .insert({ ...full, day_key: "__probe_final__" } as any).select();
        if (final?.[0]) {
          console.log("\nFull column list:", Object.keys(final[0]));
          await supabase.from("training_plan").delete().eq("day_key", "__probe_final__");
        }
      } else {
        console.log("'description' error:", err2);
      }
      return;
    }
    console.log(`✗ Failed at keys=[${keys.join(", ")}]: ${err}`);
  }
}

probe().catch(console.error);
