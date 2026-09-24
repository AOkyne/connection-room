import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildWeeklyPairs, cityOf, pairKey, weekStartOf, type PairingCandidate } from "@/lib/pairing/match";
import { hasSmtpConfig, sendWeeklyPairingEmail, logEmailSend } from "@/lib/email/send";

// Pairs opted-in members once a week (migration 100). Like weekly-prompts
// and space-digest-emails, this isn't in vercel.json (Hobby plan's 2-cron
// cap is already used) -- it's meant to be hit once daily by an external
// scheduler (e.g. cron-job.org) with the CRON_SECRET bearer token. Safe to
// run any number of times: the first run in a given week (Monday-based,
// UTC) does the pairing, every later run that week sees rows already
// exist for this week_start and skips. A missed Monday just means the
// pairing happens on the next day the job runs.
export const maxDuration = 60;

const DEFAULT_PROMPT = "What's something you're looking forward to right now?";
// Pairs processed concurrently -- same reasoning as the broadcast send
// route's batching fix: fully sequential work per pair (several DB writes
// plus two emails) could exceed maxDuration on a larger community.
const PAIR_BATCH_SIZE = 5;

interface EligibleMember {
  userId: string;
  displayName: string;
  photoPath: string | null;
  notificationsOff: boolean;
  candidate: PairingCandidate;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com";

  const now = new Date();
  const weekStart = weekStartOf(now);
  const lastWeek = new Date(now);
  lastWeek.setUTCDate(lastWeek.getUTCDate() - 7);
  const lastWeekStart = weekStartOf(lastWeek);

  const { count: alreadyPaired, error: existingError } = await supabase
    .from("weekly_pairings")
    .select("id", { count: "exact", head: true })
    .eq("week_start", weekStart);
  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if ((alreadyPaired || 0) > 0) {
    return NextResponse.json({ skipped: "already paired this week", weekStart });
  }

  // 1. Who opted in.
  const { data: optIns, error: optInError } = await supabase
    .from("connection_preferences")
    .select("user_id")
    .eq("weekly_pairing_opt_in", true);
  if (optInError) {
    return NextResponse.json({ error: optInError.message }, { status: 500 });
  }
  const optedInIds = (optIns || []).map((r) => r.user_id as string);
  if (optedInIds.length < 2) {
    return NextResponse.json({ skipped: "fewer than two members opted in", weekStart, optedIn: optedInIds.length });
  }

  // 2. Of those, who's actually eligible -- same exclusions as the
  // directory: onboarded, not suspended/deactivated, and still open to
  // being discovered at all (turning off "Open to meeting other members"
  // must also stop weekly pairing, not just hide them from the directory).
  const [profilesResult, visibilityResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, display_name, profile_photo_path, interests, location, spaces_joined, suspended, suspended_at, deactivated_at, completed_onboarding, notification_frequency")
      .in("user_id", optedInIds),
    supabase.from("public_profiles").select("user_id, show_in_discovery").in("user_id", optedInIds),
  ]);
  if (profilesResult.error) {
    return NextResponse.json({ error: profilesResult.error.message }, { status: 500 });
  }
  if (visibilityResult.error) {
    return NextResponse.json({ error: visibilityResult.error.message }, { status: 500 });
  }
  const discoverable = new Set(
    (visibilityResult.data || []).filter((v) => v.show_in_discovery !== false).map((v) => v.user_id as string)
  );

  // 3. Last week's history -- anyone opted in without a pairing last week
  // goes to the front of the line this time.
  const { data: lastWeekRows } = await supabase
    .from("weekly_pairings")
    .select("user_id")
    .eq("week_start", lastWeekStart);
  const pairedLastWeek = new Set((lastWeekRows || []).map((r) => r.user_id as string));

  const members: EligibleMember[] = (profilesResult.data || [])
    .filter(
      (p) =>
        p.completed_onboarding &&
        !p.suspended &&
        !p.suspended_at &&
        !p.deactivated_at &&
        discoverable.has(p.user_id)
    )
    .map((p) => ({
      userId: p.user_id,
      displayName: p.display_name || "A member",
      photoPath: p.profile_photo_path || null,
      notificationsOff: p.notification_frequency === "off",
      candidate: {
        userId: p.user_id,
        interests: Array.isArray(p.interests) ? p.interests : [],
        city: cityOf(p.location),
        spaces: Array.isArray(p.spaces_joined) ? p.spaces_joined : [],
        satOutLastWeek: !pairedLastWeek.has(p.user_id),
      },
    }));

  if (members.length < 2) {
    return NextResponse.json({ skipped: "fewer than two eligible members", weekStart });
  }

  const memberIds = members.map((m) => m.userId);
  const memberById = new Map(members.map((m) => [m.userId, m]));

  // 4. Never pair anyone already connected in any way (existing chat,
  // past pairing, declined/ended connection) or blocked in either direction.
  const [asUser, asPartner, blocks] = await Promise.all([
    supabase.from("connections").select("user_id, partner_id").in("user_id", memberIds),
    supabase.from("connections").select("user_id, partner_id").in("partner_id", memberIds),
    supabase.from("connection_blocks").select("blocker_id, blocked_id").in("blocker_id", memberIds),
  ]);
  if (asUser.error || asPartner.error || blocks.error) {
    return NextResponse.json(
      { error: (asUser.error || asPartner.error || blocks.error)!.message },
      { status: 500 }
    );
  }
  const excludedPairs = new Set<string>();
  for (const c of [...(asUser.data || []), ...(asPartner.data || [])]) {
    excludedPairs.add(pairKey(c.user_id, c.partner_id));
  }
  for (const b of blocks.data || []) {
    excludedPairs.add(pairKey(b.blocker_id, b.blocked_id));
  }
  // Filtering blocks on blocker_id alone is enough: a block only matters
  // if BOTH people are in this week's pool, and then the blocker is too.

  const { pairs, unpaired } = buildWeeklyPairs(
    members.map((m) => m.candidate),
    excludedPairs
  );

  // 5. Prompts -- a random active prompt neither member has had before,
  // falling back to any active prompt, then to a built-in default.
  const [promptsResult, promptHistoryResult] = await Promise.all([
    supabase.from("pairing_prompts").select("id, prompt_text").eq("is_active", true),
    supabase.from("weekly_pairings").select("user_id, prompt_id").in("user_id", memberIds),
  ]);
  const prompts = promptsResult.data || [];
  const promptsSeenByUser = new Map<string, Set<string>>();
  for (const row of promptHistoryResult.data || []) {
    if (!row.prompt_id) continue;
    const seen = promptsSeenByUser.get(row.user_id) || new Set<string>();
    seen.add(row.prompt_id);
    promptsSeenByUser.set(row.user_id, seen);
  }

  const pickPrompt = (a: string, b: string): { id: string | null; text: string } => {
    if (prompts.length === 0) return { id: null, text: DEFAULT_PROMPT };
    const seenA = promptsSeenByUser.get(a) || new Set();
    const seenB = promptsSeenByUser.get(b) || new Set();
    const fresh = prompts.filter((p) => !seenA.has(p.id) && !seenB.has(p.id));
    const pool = fresh.length > 0 ? fresh : prompts;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    return { id: chosen.id, text: chosen.prompt_text };
  };

  const canEmail = hasSmtpConfig();
  const results: Array<{ pair: [string, string]; ok: boolean; error?: string }> = [];

  for (let i = 0; i < pairs.length; i += PAIR_BATCH_SIZE) {
    const batch = pairs.slice(i, i + PAIR_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async ([a, b]) => {
        try {
          const prompt = pickPrompt(a, b);
          await createPairing(supabase, {
            weekStart,
            memberA: memberById.get(a)!,
            memberB: memberById.get(b)!,
            prompt,
            appUrl,
            canEmail,
          });
          return { pair: [a, b] as [string, string], ok: true };
        } catch (err) {
          return {
            pair: [a, b] as [string, string],
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      })
    );
    results.push(...batchResults);
  }

  return NextResponse.json({
    weekStart,
    eligible: members.length,
    pairsCreated: results.filter((r) => r.ok).length,
    pairsFailed: results.filter((r) => !r.ok),
    unpaired: unpaired.length,
  });
}

async function createPairing(
  supabase: SupabaseClient,
  params: {
    weekStart: string;
    memberA: EligibleMember;
    memberB: EligibleMember;
    prompt: { id: string | null; text: string };
    appUrl: string;
    canEmail: boolean;
  }
) {
  const { weekStart, memberA, memberB, prompt, appUrl, canEmail } = params;

  // Claim both members for this week FIRST -- UNIQUE (week_start, user_id)
  // means an overlapping second run of this job fails here, before any
  // connection gets created, instead of producing a duplicate chat.
  const { data: claimed, error: claimError } = await supabase
    .from("weekly_pairings")
    .insert([
      { week_start: weekStart, user_id: memberA.userId, partner_id: memberB.userId, prompt_id: prompt.id },
      { week_start: weekStart, user_id: memberB.userId, partner_id: memberA.userId, prompt_id: prompt.id },
    ])
    .select("id");
  if (claimError) throw claimError;

  // An ordinary 'direct' connection (migration 096) -- active immediately,
  // since both members explicitly opted in to being paired. The icebreaker
  // rides on shared_prompt and is shown as a banner in the conversation.
  const { data: connection, error: connectionError } = await supabase
    .from("connections")
    .insert({
      user_id: memberA.userId,
      partner_id: memberB.userId,
      partner_name: memberB.displayName,
      partner_photo: memberB.photoPath,
      status: "active",
      connection_type: "direct",
      activated_at: new Date().toISOString(),
      shared_prompt: prompt.text,
      metadata: { weekly_pairing: weekStart },
    })
    .select("id")
    .single();
  if (connectionError) throw connectionError;

  const { error: participantsError } = await supabase.from("connection_participants").insert([
    { connection_id: connection.id, user_id: memberA.userId, invitation_status: "accepted", accepted_at: new Date().toISOString() },
    { connection_id: connection.id, user_id: memberB.userId, invitation_status: "accepted", accepted_at: new Date().toISOString() },
  ]);
  if (participantsError) throw participantsError;

  await supabase
    .from("weekly_pairings")
    .update({ connection_id: connection.id })
    .in("id", (claimed || []).map((r) => r.id));

  if (!canEmail) return;

  const conversationUrl = `${appUrl}/app/connections/${connection.id}`;
  await Promise.all(
    [
      { me: memberA, partner: memberB },
      { me: memberB, partner: memberA },
    ].map(async ({ me, partner }) => {
      // Pairing still happens for someone who turned notifications off --
      // they'll find it in the app -- they just don't get the email.
      if (me.notificationsOff) return;
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(me.userId);
        const email = userData?.user?.email;
        if (!email) return;
        await sendWeeklyPairingEmail({ to: email, partnerName: partner.displayName, prompt: prompt.text, conversationUrl });
        await logEmailSend(supabase, {
          category: "weekly_pairing",
          to: email,
          subject: `Meet your pair this week: ${partner.displayName}`,
          recipientUserId: me.userId,
        });
      } catch (err) {
        // An email failure must never undo a pairing that's already real.
        console.warn("[weekly-pairings] email failed:", err);
      }
    })
  );
}
