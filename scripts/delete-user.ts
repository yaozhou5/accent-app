// Deletes one user's account: their log-images storage files, then the
// auth.users row itself. The auth.users delete cascades to profiles,
// drafts, content_plans, log_entries, weekly_dumps, voice_patterns,
// voice_profile_learned, pro_interest, voice_coach_cache, and
// review_cache (all ON DELETE CASCADE, confirmed against pg_constraint —
// see the /privacy audit). ai_usage_log and ai_generation_failures rows
// are kept with user_id set to null, by design.
//
// Storage isn't touched by the cascade at all — nothing links
// storage.objects to auth.users — so the file removal below has to
// happen as an explicit step, and has to happen first: once the user
// is gone, there's no user_id left to look their files up by.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/delete-user.ts someone@example.com
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
// environment (.env.local, gitignored — never commit the key, never log
// it, never pass it as a CLI argument where it could end up in shell
// history).

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx --env-file=.env.local scripts/delete-user.ts <email>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail: string) {
  const normalized = targetEmail.trim().toLowerCase();
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Failed to list users: ${error.message}`);
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match;
    if (data.users.length < 200) return null;
    page++;
  }
}

async function main() {
  console.log(`Looking up user for ${email}...`);
  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`No user found for ${email}. Nothing deleted.`);
    process.exit(1);
  }
  console.log(`Found user ${user.id}, created ${user.created_at}.`);

  console.log("Listing log-images files...");
  const { data: files, error: listError } = await supabase.storage.from("log-images").list(user.id);
  if (listError) {
    console.error(`Failed to list storage files: ${listError.message}`);
    process.exit(1);
  }

  if (files && files.length > 0) {
    const paths = files.map((f) => `${user.id}/${f.name}`);
    const { error: removeError } = await supabase.storage.from("log-images").remove(paths);
    if (removeError) {
      console.error(`Failed to remove storage files: ${removeError.message}`);
      process.exit(1);
    }
    console.log(`Deleted ${paths.length} file(s) from log-images:`);
    paths.forEach((p) => console.log(`  ${p}`));
  } else {
    console.log("No log-images files found for this user.");
  }

  console.log(`Deleting auth user ${user.id}...`);
  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error(`Failed to delete user: ${deleteError.message}`);
    process.exit(1);
  }

  console.log(`Deleted user ${user.id} (${email}) and every row linked to them via ON DELETE CASCADE.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
