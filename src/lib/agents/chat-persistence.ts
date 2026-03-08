/**
 * Agent Builder Chat Persistence
 * Saves and loads agent builder chats from Supabase
 */

import { createClient } from "@/lib/supabase-client";
import type { ChatMessage } from "./chat-pipeline";
import type { DeployAgentPlan } from "./types";
import type { QuestionnaireAnswer } from "@/lib/ai/types";
import type { PipelinePhase } from "./chat-pipeline";

export interface AgentBuilderChatRow {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  pipeline_phase: PipelinePhase;
  pending_plan: DeployAgentPlan | null;
  accumulated_questionnaire_answers: QuestionnaireAnswer[];
  agent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentBuilderChatData {
  messages: ChatMessage[];
  pipelinePhase: PipelinePhase;
  pendingPlan: DeployAgentPlan | null;
  accumulatedQuestionnaireAnswers: QuestionnaireAnswer[];
  agentId: string | null;
}

type AgentBuilderChatSelect = {
  id: string;
  messages?: unknown;
  pipeline_phase?: string;
  pending_plan?: unknown;
  accumulated_questionnaire_answers?: unknown;
  agent_id?: string | null;
};

/**
 * Load a specific agent builder chat by ID.
 * Used when resuming from a reload (chat id in URL).
 * Returns null if not found or not owned by user.
 */
export async function loadAgentBuilderChatById(
  userId: string,
  chatId: string
): Promise<{ id: string; data: AgentBuilderChatData } | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agent_builder_chats")
    .select("id, messages, pipeline_phase, pending_plan, accumulated_questionnaire_answers, agent_id")
    .eq("id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      return null;
    }
    console.error("[agent-chat-persistence] load by id error:", error);
    return null;
  }

  if (!data) return null;

  const row = data as AgentBuilderChatSelect;
  const messages = (row.messages as ChatMessage[]) ?? [];
  const pipelinePhase = (row.pipeline_phase as PipelinePhase) ?? "initial";
  const pendingPlan = (row.pending_plan as DeployAgentPlan | null) ?? null;
  const accumulatedQuestionnaireAnswers =
    (row.accumulated_questionnaire_answers as QuestionnaireAnswer[]) ?? [];

  return {
    id: row.id,
    data: {
      messages,
      pipelinePhase,
      pendingPlan,
      accumulatedQuestionnaireAnswers,
      agentId: row.agent_id ?? null,
    },
  };
}

/**
 * Load the most recent agent builder chat for the user.
 * Returns null if none exists or user not authenticated.
 */
export async function loadAgentBuilderChat(
  userId: string
): Promise<{ id: string; data: AgentBuilderChatData } | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agent_builder_chats")
    .select("id, messages, pipeline_phase, pending_plan, accumulated_questionnaire_answers, agent_id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      return null;
    }
    console.error("[agent-chat-persistence] load error:", error);
    return null;
  }

  if (!data) return null;

  const row = data as AgentBuilderChatSelect;
  const messages = (row.messages as ChatMessage[]) ?? [];
  const pipelinePhase = (row.pipeline_phase as PipelinePhase) ?? "initial";
  const pendingPlan = (row.pending_plan as DeployAgentPlan | null) ?? null;
  const accumulatedQuestionnaireAnswers =
    (row.accumulated_questionnaire_answers as QuestionnaireAnswer[]) ?? [];

  return {
    id: row.id,
    data: {
      messages,
      pipelinePhase,
      pendingPlan,
      accumulatedQuestionnaireAnswers,
      agentId: row.agent_id ?? null,
    },
  };
}

/**
 * Save agent builder chat state to Supabase.
 * Creates a new chat if id is null.
 */
export async function saveAgentBuilderChat(
  userId: string,
  data: AgentBuilderChatData,
  chatId?: string | null
): Promise<{ id: string; error?: string }> {
  const supabase = createClient();

  const row: Record<string, unknown> = {
    user_id: userId,
    messages: data.messages,
    pipeline_phase: data.pipelinePhase,
    pending_plan: data.pendingPlan,
    accumulated_questionnaire_answers: data.accumulatedQuestionnaireAnswers,
    agent_id: data.agentId ?? null,
  };

  if (chatId) {
    const { data: updated, error } = await supabase
      .from("agent_builder_chats")
      .update(row as never)
      .eq("id", chatId)
      .eq("user_id", userId)
      .select("id")
      .single();

    if (error) {
      console.error("[agent-chat-persistence] update error:", error);
      return { id: chatId, error: error.message };
    }
    const upd = updated as { id?: string } | null;
    return { id: upd?.id ?? chatId };
  }

  const { data: inserted, error } = await supabase
    .from("agent_builder_chats")
    .insert(row as never)
    .select("id")
    .single();

  if (error) {
    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      return { id: "", error: "Table not found" };
    }
    console.error("[agent-chat-persistence] insert error:", error);
    return { id: "", error: error.message };
  }

  const ins = inserted as { id?: string } | null;
  return { id: ins?.id ?? "" };
}
