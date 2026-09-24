import { supabase } from "@/lib/supabase/client";

export type PairingPromptCategory = "thoughtful" | "funny" | "controversial" | "playful" | "deep";

export const PAIRING_PROMPT_CATEGORIES: PairingPromptCategory[] = [
  "thoughtful",
  "funny",
  "controversial",
  "playful",
  "deep",
];

export interface PairingPrompt {
  id: string;
  category: PairingPromptCategory;
  prompt_text: string;
  is_active: boolean;
  created_at: string;
}

async function getAuthHeader(): Promise<Record<string, string> | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(method: string, body?: unknown): Promise<{ data?: T; error?: string }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) return { error: "Not signed in with a real admin account." };

  const response = await fetch("/api/admin/pairing-prompts", {
    method,
    headers: { "Content-Type": "application/json", ...authHeader },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) return { error: data.error || "Request failed" };
  return { data };
}

export async function listPairingPrompts(): Promise<{ prompts: PairingPrompt[]; error?: string }> {
  const result = await request<{ prompts: PairingPrompt[] }>("GET");
  return { prompts: result.data?.prompts || [], error: result.error };
}

export async function createPairingPrompt(
  category: PairingPromptCategory,
  promptText: string
): Promise<{ prompt?: PairingPrompt; error?: string }> {
  const result = await request<{ prompt: PairingPrompt }>("POST", { category, promptText });
  return { prompt: result.data?.prompt, error: result.error };
}

export async function updatePairingPrompt(
  id: string,
  updates: { isActive?: boolean; promptText?: string; category?: PairingPromptCategory }
): Promise<{ prompt?: PairingPrompt; error?: string }> {
  const result = await request<{ prompt: PairingPrompt }>("PATCH", { id, ...updates });
  return { prompt: result.data?.prompt, error: result.error };
}
