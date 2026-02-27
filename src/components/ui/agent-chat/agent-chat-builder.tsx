"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { MessageList } from "./message-list";
import { ChatInput, CHAT_INPUT_PLACEHOLDERS } from "./chat-input";
import type {
  ChatMessage,
  PipelinePhase,
  BuildStage,
  BuildStageStatus,
} from "@/lib/agents/chat-pipeline";
import type { DeployAgentPlan } from "@/lib/agents/types";
import type { QuestionnaireAnswer } from "@/lib/ai/types";

function genId() {
  return crypto.randomUUID?.() ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Extract flat conversation for API (user + assistant text only) */
function getConversationForApi(messages: ChatMessage[]): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((m): m is ChatMessage & { role: "user" | "assistant"; content: string } =>
      (m.role === "user" || m.role === "assistant") && "content" in m
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

/** Merge build_stage into stages array (update existing or append) */
function mergeBuildStage(stages: BuildStage[], stage: string, status: BuildStageStatus): BuildStage[] {
  const idx = stages.findIndex((s) => s.label === stage);
  const next = { label: stage, status };
  if (idx >= 0) {
    const out = [...stages];
    out[idx] = next;
    return out;
  }
  return [...stages, next];
}

const AGENT_CHAT_STORAGE_KEY = "agent-chat-builder-messages";
const AGENT_RETURN_URL = "/agents/new?resume=1";

const WELCOME_MESSAGE =
  "Hey! I'm your agent builder. Tell me what you'd like your agent to do — be as detailed or vague as you like.";

const EXAMPLE_CHIPS = [
  "Watch my Gmail for important emails",
  "Summarize my Slack channels daily",
  "Alert me when GitHub issues are assigned to me",
];

interface AgentChatBuilderProps {
  onComplete?: (agentId: string) => void;
}

export function AgentChatBuilder({ onComplete }: AgentChatBuilderProps) {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>("initial");
  const [pendingPlan, setPendingPlan] = useState<DeployAgentPlan | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [inputFillValue, setInputFillValue] = useState<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const hasInitializedRef = useRef(false);

  // Restore conversation when returning from OAuth (resume=1), or add welcome on first load
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const resume = searchParams.get("resume") === "1";
    if (resume) {
      try {
        const stored = typeof window !== "undefined" && sessionStorage.getItem(AGENT_CHAT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ChatMessage[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            setPipelinePhase("awaiting_integrations");
            sessionStorage.removeItem(AGENT_CHAT_STORAGE_KEY);
            return;
          }
        }
      } catch {
        /* ignore */
      }
    }

    setMessages([
      {
        id: genId(),
        role: "card",
        cardType: "welcome",
        content: WELCOME_MESSAGE,
        chips: EXAMPLE_CHIPS,
      },
    ]);
  }, [searchParams]);

  const saveMessagesBeforeOAuth = useCallback(() => {
    try {
      if (typeof window !== "undefined" && messagesRef.current.length > 0) {
        sessionStorage.setItem(AGENT_CHAT_STORAGE_KEY, JSON.stringify(messagesRef.current));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const placeholder =
    pipelinePhase === "awaiting_questionnaire"
      ? CHAT_INPUT_PLACEHOLDERS.questionnaire
      : pipelinePhase === "awaiting_confirmation" || pendingPlan
      ? CHAT_INPUT_PLACEHOLDERS.adjusting
      : CHAT_INPUT_PLACEHOLDERS.default;

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const appendAssistantText = useCallback((delta: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && "content" in last && last.isStreaming) {
        return [
          ...prev.slice(0, -1),
          { ...last, content: last.content + delta },
        ];
      }
      return [...prev, { id: genId(), role: "assistant", content: delta, isStreaming: true }];
    });
  }, []);

  const finishAssistantText = useCallback(() => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && "content" in last) {
        return [...prev.slice(0, -1), { ...last, isStreaming: false }];
      }
      return prev;
    });
  }, []);

  const updateBuildProgress = useCallback((stage: string, status: BuildStageStatus) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.role === "card" && "cardType" in m && m.cardType === "build_progress");
      if (idx < 0) {
        return [...prev, { id: genId(), role: "card", cardType: "build_progress", stages: [{ label: stage, status }] }];
      }
      const m = prev[idx];
      if (m.role !== "card" || m.cardType !== "build_progress") return prev;
      const stages = mergeBuildStage(m.stages, stage, status);
      const out = [...prev];
      out[idx] = { ...m, stages };
      return out;
    });
  }, []);

  const readSSEChat = useCallback(
    async (res: Response, options?: { pendingPlan?: DeployAgentPlan; answers?: QuestionnaireAnswer[]; integrationsConnected?: boolean; lastUserMessage?: string }) => {
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as { type: string; [k: string]: unknown };
            switch (event.type) {
              case "text_delta":
                appendAssistantText((event.delta as string) ?? "");
                break;
              case "text_done":
                finishAssistantText();
                break;
              case "integration_check":
                setPipelinePhase("awaiting_integrations");
                appendMessage({
                  id: genId(),
                  role: "card",
                  cardType: "integration_check",
                  data: event.integrations as any[],
                });
                break;
              case "questionnaire":
                setPipelinePhase("awaiting_questionnaire");
                appendMessage({
                  id: genId(),
                  role: "card",
                  cardType: "questionnaire",
                  data: event.questions as any[],
                });
                break;
              case "plan":
                setPendingPlan(event.plan as DeployAgentPlan);
                setPipelinePhase("awaiting_confirmation");
                appendMessage({
                  id: genId(),
                  role: "card",
                  cardType: "plan",
                  data: event.plan as DeployAgentPlan,
                });
                break;
              case "confirmation":
                appendMessage({ id: genId(), role: "card", cardType: "confirmation" });
                break;
              case "error":
                appendMessage({
                  id: genId(),
                  role: "card",
                  cardType: "error_retry",
                  message: "Something went wrong. Want to try again?",
                  lastUserMessage: options?.lastUserMessage,
                });
                break;
            }
          } catch {
            /* ignore parse errors */
          }
        }
      }
    },
    [appendAssistantText, finishAssistantText, appendMessage]
  );

  const sendMessage = useCallback(
    async (text: string, options?: { pendingPlan?: DeployAgentPlan; answers?: QuestionnaireAnswer[]; integrationsConnected?: boolean }) => {
      appendMessage({ id: genId(), role: "user", content: text });
      setIsStreaming(true);

      const conversation = getConversationForApi([
        ...messages,
        { id: "temp", role: "user", content: text },
      ]);

      try {
        const res = await fetch("/api/agents/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversation,
            answers: options?.answers,
            pendingPlan: options?.pendingPlan,
            integrationsConnected: options?.integrationsConnected,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          appendMessage({
            id: genId(),
            role: "card",
            cardType: "error_retry",
            message: "Something went wrong. Want to try again?",
            lastUserMessage: text,
          });
          return;
        }

        await readSSEChat(res, { ...options, lastUserMessage: text });
      } catch (e: any) {
        appendMessage({
          id: genId(),
          role: "card",
          cardType: "error_retry",
          message: "Something went wrong. Want to try again?",
          lastUserMessage: text,
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, appendMessage, readSSEChat]
  );

  const resumeAfterIntegrations = useCallback(async () => {
    const conversation = getConversationForApi(messages);
    if (conversation.length === 0) return;
    setIsStreaming(true);
    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversation,
          integrationsConnected: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        appendMessage({ id: genId(), role: "assistant", content: (err.error as string) ?? "Something went wrong." });
        return;
      }
      await readSSEChat(res);
    } catch (e: any) {
      appendMessage({ id: genId(), role: "assistant", content: e?.message ?? "Network error." });
    } finally {
      setIsStreaming(false);
    }
  }, [messages, appendMessage, readSSEChat]);

  const submitAnswers = useCallback(
    (answers: QuestionnaireAnswer[]) => {
      const conversation = getConversationForApi(messages);
      const lastUser = conversation.filter((m) => m.role === "user").pop()?.content ?? "";
      sendMessage(lastUser, { answers });
    },
    [messages, sendMessage]
  );

  const startBuild = useCallback(
    async (plan: DeployAgentPlan, description: string) => {
      setPipelinePhase("building");
      setIsStreaming(true);

      try {
        const res = await fetch("/api/agents/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, plan }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setMessages((prev) => [
            ...prev,
            { id: genId(), role: "assistant", content: (err.error as string) ?? "Build failed." },
          ]);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as { type: string; stage?: string; status?: string; agentId?: string; summary?: string };
              if (event.type === "build_stage" && event.stage && event.status) {
                updateBuildProgress(event.stage, event.status as BuildStageStatus);
              }
              if (event.type === "build_complete") {
                setPipelinePhase("complete");
                setAgentId(event.agentId ?? null);
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  {
                    id: genId(),
                    role: "card",
                    cardType: "completion",
                    agentId: event.agentId ?? "",
                    summary: event.summary ?? "",
                  },
                ]);
                onComplete?.(event.agentId ?? "");
              }
              if (event.type === "error") {
                setMessages((prev) => [
                  ...prev,
                  { id: genId(), role: "assistant", content: (event as any).message ?? "Build failed." },
                ]);
              }
            } catch {
              /* ignore */
            }
          }
        }
      } catch (e: any) {
        setMessages((prev) => [
          ...prev,
          { id: genId(), role: "assistant", content: e?.message ?? "Build failed." },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [updateBuildProgress, onComplete]
  );

  const startAdjust = useCallback((plan: DeployAgentPlan) => {
    setPendingPlan(plan);
    appendMessage({
      id: genId(),
      role: "assistant",
      content: "Of course. What would you like to change?",
    });
    setPipelinePhase("initial");
  }, [appendMessage]);

  const handlePlanBuild = useCallback(
    (plan: DeployAgentPlan) => {
      const lastUser = getConversationForApi(messages).filter((m) => m.role === "user").pop()?.content ?? "";
      startBuild(plan, lastUser);
    },
    [messages, startBuild]
  );

  const handlePlanAdjust = useCallback((plan: DeployAgentPlan) => startAdjust(plan), [startAdjust]);

  const handleExampleClick = useCallback((text: string) => {
    setInputFillValue(text);
  }, []);

  const handleRetry = useCallback(
    (lastUserMessage: string | undefined) => {
      if (!lastUserMessage?.trim()) return;
      const plan = pendingPlan;
      if (plan) {
        setPendingPlan(null);
        sendMessage(lastUserMessage, { pendingPlan: plan });
      } else {
        sendMessage(lastUserMessage);
      }
    },
    [pendingPlan, sendMessage]
  );

  const handleSend = useCallback(
    (text: string) => {
      const plan = pendingPlan;
      if (plan) {
        setPendingPlan(null);
        sendMessage(text, { pendingPlan: plan });
      } else {
        sendMessage(text);
      }
    },
    [pendingPlan, sendMessage]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scrollbar-hide px-1">
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          onIntegrationCheckAllConnected={resumeAfterIntegrations}
          onQuestionnaireSubmit={submitAnswers}
          onPlanBuild={handlePlanBuild}
          onPlanAdjust={handlePlanAdjust}
          integrationReturnUrl={AGENT_RETURN_URL}
          onBeforeOAuthRedirect={saveMessagesBeforeOAuth}
          onExampleClick={handleExampleClick}
          onRetry={handleRetry}
        />
      </div>
      <div className="flex-shrink-0 pt-4">
        <ChatInput
          placeholder={placeholder}
          disabled={pipelinePhase === "building" || pipelinePhase === "complete"}
          isStreaming={isStreaming}
          onSend={handleSend}
          fillValue={inputFillValue}
          onFillApplied={() => setInputFillValue(null)}
          autoFocus
        />
      </div>
    </div>
  );
}
