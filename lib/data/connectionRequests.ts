// Connection requests data access layer -- backed by the real
// connection_requests Supabase table (migration 010), which already had
// correct RLS (sender can insert, either party can select, only the
// recipient can update to accept/decline) but was never actually used by
// the app: this file previously stored everything in a single, unscoped
// localStorage key, so a request never reached the recipient's own
// browser/device at all.

import { supabase } from "@/lib/supabase/client";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto: string;
  toUserId: string;
  createdAt: Date;
  status: "pending" | "accepted" | "declined";
  fromUserInterests: string[];
  sharedPrompt?: string;
}

function mapRequest(row: any): ConnectionRequest {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    fromUserName: row.from_user_name,
    fromUserPhoto: row.from_user_photo || "",
    toUserId: row.to_user_id,
    createdAt: new Date(row.created_at),
    status: row.status,
    fromUserInterests: row.from_user_interests || [],
    sharedPrompt: row.shared_prompt || undefined,
  };
}

export async function sendConnectionRequest(
  fromUserId: string,
  fromUserName: string,
  fromUserPhoto: string,
  toUserId: string,
  fromUserInterests: string[] = [],
  sharedPrompt?: string
): Promise<ConnectionRequest | null> {
  if (!supabase) return null;
  const client = supabase;

  try {
    const { data, error } = await demoSafeWrite(
      () =>
        client
          .from("connection_requests")
          .insert({
            from_user_id: fromUserId,
            from_user_name: fromUserName,
            from_user_photo: fromUserPhoto || null,
            to_user_id: toUserId,
            from_user_interests: fromUserInterests,
            shared_prompt: sharedPrompt || null,
          })
          .select()
          .single(),
      { context: "sendConnectionRequest" }
    );

    if (error) {
      console.error("Error sending connection request:", error);
      return null;
    }

    return mapRequest(data);
  } catch (err) {
    console.error("Error sending connection request:", err);
    return null;
  }
}

export async function getIncomingRequests(toUserId: string): Promise<ConnectionRequest[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("connection_requests")
      .select("*")
      .eq("to_user_id", toUserId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching incoming requests:", error);
      return [];
    }

    return (data || []).map(mapRequest);
  } catch (err) {
    console.error("Error fetching incoming requests:", err);
    return [];
  }
}

export async function getSentRequests(fromUserId: string): Promise<ConnectionRequest[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("connection_requests")
      .select("*")
      .eq("from_user_id", fromUserId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sent requests:", error);
      return [];
    }

    return (data || []).map(mapRequest);
  } catch (err) {
    console.error("Error fetching sent requests:", err);
    return [];
  }
}

export async function acceptConnectionRequest(
  requestId: string,
  userId: string
): Promise<ConnectionRequest | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("connection_requests")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("to_user_id", userId)
      .select()
      .single();

    if (error || !data) {
      console.error("Error accepting connection request:", error);
      return null;
    }

    return mapRequest(data);
  } catch (err) {
    console.error("Error accepting connection request:", err);
    return null;
  }
}

export async function declineConnectionRequest(requestId: string, userId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("connection_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("to_user_id", userId);

    if (error) {
      console.error("Error declining connection request:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error declining connection request:", err);
    return false;
  }
}

export async function hasRequestSent(fromUserId: string, toUserId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from("connection_requests")
      .select("id")
      .eq("from_user_id", fromUserId)
      .eq("to_user_id", toUserId)
      .eq("status", "pending")
      .maybeSingle();

    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}
