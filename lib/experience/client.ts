// Browser-side calls to the "Your Experience Wanted" member API routes.

import { supabase } from "@/lib/supabase/client";
import type { PublicQuestion, MyInvitation } from "./member-service";

export type { PublicQuestion, MyInvitation };

export interface TopicOption {
  slug: string;
  label: string;
  sensitive: boolean;
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id || null;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<{ data?: T; error?: string; status: number }> {
  if (!supabase) return { error: "Not available right now.", status: 0 };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "Please sign in again.", status: 401 };
  try {
    const response = await fetch(path, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    // Read as text first: a platform error page isn't JSON (Safari's
    // "string did not match the expected pattern").
    const raw = await response.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // handled below
    }
    if (!response.ok) return { error: parsed?.error || `Something went wrong (${response.status}).`, data: parsed, status: response.status };
    return { data: parsed as T, status: response.status };
  } catch {
    return { error: "Couldn't reach the server. Check your connection and try again.", status: 0 };
  }
}

export const experienceApi = {
  overview: () =>
    call<{ questions: PublicQuestion[]; invitations: MyInvitation[]; topics: TopicOption[] }>("GET", "/api/experience/questions"),
  question: (id: string) =>
    call<{ question: (PublicQuestion & { myAnonymousCommentIds: string[] }) | null }>("GET", `/api/experience/questions/${id}`),
  submit: (input: { text: string; topic: string; context: string; anonymous: boolean; emailPermission: boolean }) =>
    call<{ questionId: string }>("POST", "/api/experience/questions", input),
  updateOwn: (id: string, patch: { emailPermission?: boolean; text?: string; context?: string; remove?: boolean }) =>
    call<{ ok: true }>("PATCH", `/api/experience/questions/${id}`, patch),
  postFollowup: (questionId: string, body: string, parentCommentId?: string) =>
    call<{ commentId: string }>("POST", `/api/experience/questions/${questionId}/followups`, { body, parentCommentId }),
  editFollowup: (commentId: string, body: string) => call<{ ok: true }>("PATCH", `/api/experience/followups/${commentId}`, { body }),
  deleteFollowup: (commentId: string) => call<{ ok: true }>("DELETE", `/api/experience/followups/${commentId}`),
  report: (input: { postId: string; commentId?: string; reason: string }) => call<{ ok: true }>("POST", "/api/experience/report", input),
  preferences: () =>
    call<{
      prefs: { optedOut: boolean; paused: boolean; topics: string[] | null; timezone: string | null };
      topics: TopicOption[];
      notificationsOff: boolean;
    }>("GET", "/api/experience/preferences"),
  savePreferences: (prefs: { optedOut: boolean; paused: boolean; topics: string[] | null; timezone: string | null }) =>
    call<{ ok: true }>("PUT", "/api/experience/preferences", prefs),
};
