import { supabase } from "@/lib/supabase/client";

async function getAuthHeader(): Promise<Record<string, string> | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export interface CreatedPollOption {
  id: string;
  label: string;
}

// Backed by /api/admin/polls -- writes directly via the service-role
// client rather than the member-facing create_poll_with_options() RPC
// (that RPC is auth.uid()-keyed, which is NULL for a service-role
// caller). Used by the Broadcast composer's "Insert Poll" button.
export async function createBroadcastPoll(
  question: string,
  options: string[],
  spaceId?: string,
  allowMultiple = false
): Promise<{ pollId: string; options: CreatedPollOption[]; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { pollId: "", options: [], error: "Not signed in with a real admin account." };
  }

  const response = await fetch("/api/admin/polls", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify({ question, options, spaceId, allowMultiple }),
  });
  const data = await response.json();
  if (!response.ok) {
    return { pollId: "", options: [], error: data.error || "Could not create the poll." };
  }
  return { pollId: data.pollId, options: data.options || [] };
}
