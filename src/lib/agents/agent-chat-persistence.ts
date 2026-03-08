/**
 * Agent Chat Persistence (per-agent workspace)
 * Saves and loads chat messages for each agent.
 */

import { createClient } from "@/lib/supabase-client";

export type AgentChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export async function loadAgentChat(
  agentId: string,
  userId: string
): Promise<AgentChatMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agent_chats")
    .select("messages")
    .eq("agent_id", agentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      return [];
    }
    console.error("[agent-chat-persistence] load error:", error);
    return [];
  }

  const raw = data as { messages?: AgentChatMessage[] } | null;
  const messages = (raw?.messages as AgentChatMessage[] | null) ?? [];
  return Array.isArray(messages) ? messages : [];
}

export async function saveAgentChat(
  agentId: string,
  userId: string,
  messages: AgentChatMessage[]
): Promise<{ error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("agent_chats")
    .upsert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { agent_id: agentId, user_id: userId, messages } as any,
      {
        onConflict: "agent_id,user_id",
      }
    );

  if (error) {
    console.error("[agent-chat-persistence] save error:", error);
    return { error: error.message };
  }
  return {};
}
