import { supabase } from "@/lib/supabase/client";

export interface Message {
  id: string;
  connectionId: string;
  fromUserId: string;
  fromUserName: string;
  text: string;
  createdAt: Date;
}

// Get all messages for a connection
export async function getConnectionMessages(connectionId: string): Promise<Message[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("connection_messages")
      .select("*")
      .eq("connection_id", connectionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }

    return (data || []).map((msg: any) => ({
      id: msg.id,
      connectionId: msg.connection_id,
      fromUserId: msg.from_user_id,
      fromUserName: msg.from_user_name,
      text: msg.text,
      createdAt: new Date(msg.created_at),
    }));
  } catch (err) {
    console.error("Error fetching messages:", err);
    return [];
  }
}

// Send a message
export async function sendMessage(
  connectionId: string,
  fromUserId: string,
  fromUserName: string,
  text: string
): Promise<Message | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("connection_messages")
      .insert({
        connection_id: connectionId,
        from_user_id: fromUserId,
        from_user_name: fromUserName,
        text,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return null;
    }

    return {
      id: data.id,
      connectionId: data.connection_id,
      fromUserId: data.from_user_id,
      fromUserName: data.from_user_name,
      text: data.text,
      createdAt: new Date(data.created_at),
    };
  } catch (err) {
    console.error("Error sending message:", err);
    return null;
  }
}

// Fallback: Store messages in localStorage for demo/offline
const MESSAGES_STORAGE_KEY = "connection-room:messages";

export function getLocalMessages(connectionId: string): Message[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(`${MESSAGES_STORAGE_KEY}:${connectionId}`);
  return stored ? JSON.parse(stored) : [];
}

export function saveLocalMessage(
  connectionId: string,
  fromUserId: string,
  fromUserName: string,
  text: string
): Message {
  if (typeof window === "undefined") throw new Error("Browser environment required");

  const message: Message = {
    id: `msg-${Date.now()}-${Math.random()}`,
    connectionId,
    fromUserId,
    fromUserName,
    text,
    createdAt: new Date(),
  };

  const messages = getLocalMessages(connectionId);
  messages.push(message);
  localStorage.setItem(`${MESSAGES_STORAGE_KEY}:${connectionId}`, JSON.stringify(messages));

  return message;
}
