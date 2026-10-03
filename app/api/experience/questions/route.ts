import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { listMyInvitations, listPublicQuestions } from "@/lib/experience/member-service";
import { findSimilarQuestion, normalizeQuestionText } from "@/lib/experience/normalize";
import { ANONYMOUS_QUESTION_AUTHOR_NAME, EXPERIENCE_SPACE_ID } from "@/lib/experience/threads";

export const dynamic = "force-dynamic";

const QUESTION_MIN = 10;
const QUESTION_MAX = 300;
const CONTEXT_MAX = 600;

// GET: current conversations + the viewer's own invitations.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const [questions, invitations, topics] = await Promise.all([
    listPublicQuestions(auth.supabase, auth.userId),
    listMyInvitations(auth.supabase, auth.userId),
    auth.supabase.from("experience_topics").select("slug, label, sensitive").order("sort_order"),
  ]);
  return NextResponse.json({ questions, invitations, topics: topics.data || [] });
}

// POST: a member asks a question. It's posted in the app right away (like
// any post). Email circulation needs the author's explicit permission
// (default off) AND a moderator's approval of that exact text.
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, userId } = auth;

  let body: { text?: unknown; topic?: unknown; context?: unknown; anonymous?: unknown; emailPermission?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim().replace(/\s+/g, " ") : "";
  const context = typeof body.context === "string" ? body.context.trim() : "";
  const topic = typeof body.topic === "string" ? body.topic : "";
  const anonymous = body.anonymous !== false; // default: anonymous
  const emailPermission = body.emailPermission === true; // default: off

  if (text.length < QUESTION_MIN || text.length > QUESTION_MAX) {
    return NextResponse.json({ error: `Your question needs ${QUESTION_MIN}-${QUESTION_MAX} characters.` }, { status: 400 });
  }
  if (context.length > CONTEXT_MAX) {
    return NextResponse.json({ error: `Context can be up to ${CONTEXT_MAX} characters.` }, { status: 400 });
  }
  const { data: topicRow } = await supabase.from("experience_topics").select("slug").eq("slug", topic).maybeSingle();
  if (!topicRow) return NextResponse.json({ error: "Choose a topic." }, { status: 400 });

  const [{ data: profile }, { data: settings }, { data: existing }] = await Promise.all([
    supabase.from("profiles").select("display_name, suspended, deactivated_at").eq("user_id", userId).maybeSingle(),
    supabase.from("experience_settings").select("system_author_id").eq("id", 1).single(),
    supabase.from("experience_questions").select("id, text, normalized_text, status"),
  ]);
  if (!profile || profile.suspended || profile.deactivated_at) {
    return NextResponse.json({ error: "Your account can't post right now." }, { status: 403 });
  }

  const normalized = normalizeQuestionText(text);
  const duplicate = (existing || []).find((q) => q.normalized_text === normalized);
  if (duplicate) {
    return NextResponse.json(
      { error: "That question is already here -- you can join that conversation instead.", questionId: duplicate.id },
      { status: 409 }
    );
  }
  const similar = findSimilarQuestion(text, (existing || []).filter((q) => q.status !== "removed"));

  if (anonymous && !settings?.system_author_id) {
    return NextResponse.json({ error: "Anonymous questions aren't available yet. Please try again later." }, { status: 503 });
  }

  // Anonymous: the post is stored under the system account, so no
  // member-readable row links it to the author.
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      user_id: anonymous ? settings!.system_author_id : userId,
      space_id: EXPERIENCE_SPACE_ID,
      prompt_id: "experience:member",
      title: null,
      body: text,
      author_name: anonymous ? ANONYMOUS_QUESTION_AUTHOR_NAME : profile.display_name || "A member",
    })
    .select("id")
    .single();
  if (postError || !post) {
    return NextResponse.json({ error: "Couldn't post your question. Please try again." }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { data: question, error: qError } = await supabase
    .from("experience_questions")
    .insert({
      source: "member",
      author_id: userId,
      anonymous,
      text,
      normalized_text: normalized,
      context: context || null,
      topic,
      email_permission: emailPermission,
      email_review: emailPermission ? "pending" : "not_requested",
      similar_to_question_id: similar?.id || null,
      thread_post_id: post.id,
      first_activated_at: now,
    })
    .select("id")
    .single();
  if (qError || !question) {
    await supabase.from("posts").delete().eq("id", post.id);
    return NextResponse.json({ error: "Couldn't post your question. Please try again." }, { status: 500 });
  }

  await Promise.all([
    supabase.from("posts").update({ prompt_id: `experience:${question.id}` }).eq("id", post.id),
    supabase.from("experience_audit").insert({
      actor_id: userId,
      action: "member_question_submitted",
      question_id: question.id,
      detail: { anonymous, emailPermission, similarTo: similar?.id || null },
    }),
  ]);

  return NextResponse.json({ questionId: question.id });
}
