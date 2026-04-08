"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MessageList } from "./message-list";
import { ChatInput, CHAT_INPUT_PLACEHOLDERS } from "./chat-input";
import type {
  ChatMessage,
  PipelinePhase,
  BuildStage,
  BuildStageStatus,
  IntegrationCheckItem,
} from "@/lib/agents/chat-pipeline";
import {
  loadAgentBuilderChatByAgentId,
  loadAgentBuilderChatById,
  saveAgentBuilderChat,
} from "@/lib/agents/chat-persistence";
import { cn } from "@/lib/utils";
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
function mergeBuildStage(stages: BuildStage[], stage: string, status: BuildStageStatus, detail?: string): BuildStage[] {
  const idx = stages.findIndex((s) => s.label === stage);
  const next: BuildStage = { label: stage, status, ...(detail != null && { detail }) };
  if (idx >= 0) {
    const out = [...stages];
    out[idx] = next;
    return out;
  }
  return [...stages, next];
}

const AGENT_CHAT_STORAGE_KEY = "agent-chat-builder-messages";
const AGENT_CHAT_ID_STORAGE_KEY = "agent-chat-builder-chat-id";
const AGENT_ID_STORAGE_KEY = "agent-chat-builder-agent-id";
const AGENT_RETURN_URL = "/agents/new?resume=1";

const EXAMPLE_CHIPS = [
  "Find and qualify partnership opportunities, then reach out and book calls.",
  "Monitor competitors and alert me when they launch new features or campaigns.",
  "Follow up with warm leads until they convert or go cold.",
];

interface AgentChatBuilderProps {
  userId?: string | null;
  onComplete?: (agentId: string) => void;
  /** Called when user clicks View Agent — use to switch to Agent tab instead of navigating */
  onViewAgent?: () => void;
  /** Top padding for scroll content so first message can scroll fully into view below overlay headers */
  scrollTopOffset?: string;
}

const SAVE_DEBOUNCE_MS = 1500;

const CHAT_URL_PARAM = "chat";
const AGENT_ID_URL_PARAM = "agentId";

/** agentId query value for an existing agent (not the literal "new"). */
function isPersistedAgentBuilderAgentId(agentId: string | null): agentId is string {
  if (!agentId || agentId === "new") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
}

function mergeAgentsNewSearch(
  router: { replace: (href: string, opts?: { scroll?: boolean }) => void },
  current: URLSearchParams,
  updates: Record<string, string | null | undefined>
) {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  }
  const q = next.toString();
  router.replace(q ? `/agents/new?${q}` : "/agents/new", { scroll: false });
}

export function AgentChatBuilder({ userId, onComplete, onViewAgent, scrollTopOffset }: AgentChatBuilderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>("initial");
  const [pendingPlan, setPendingPlan] = useState<DeployAgentPlan | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [inputFillValue, setInputFillValue] = useState<string | null>(null);
  const [accumulatedQuestionnaireAnswers, setAccumulatedQuestionnaireAnswers] = useState<QuestionnaireAnswer[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore conversation: OAuth return (sessionStorage) > Supabase (chat id or agent id) > empty
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const resume = searchParams.get("resume") === "1";
      if (resume && typeof window !== "undefined") {
        try {
          const stored = sessionStorage.getItem(AGENT_CHAT_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as ChatMessage[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (cancelled) return;
              setMessages(parsed);
              setPipelinePhase("awaiting_integrations");
              sessionStorage.removeItem(AGENT_CHAT_STORAGE_KEY);
              const storedChatId = sessionStorage.getItem(AGENT_CHAT_ID_STORAGE_KEY);
              if (storedChatId) {
                setChatId(storedChatId);
                sessionStorage.removeItem(AGENT_CHAT_ID_STORAGE_KEY);
                mergeAgentsNewSearch(router, searchParams, {
                  [CHAT_URL_PARAM]: storedChatId,
                  resume: null,
                });
              } else {
                mergeAgentsNewSearch(router, searchParams, { resume: null });
              }
              const storedAgentId = sessionStorage.getItem(AGENT_ID_STORAGE_KEY);
              if (storedAgentId) {
                setAgentId(storedAgentId);
                sessionStorage.removeItem(AGENT_ID_STORAGE_KEY);
                onComplete?.(storedAgentId);
              }
              setIsLoadingChat(false);
              return;
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (!userId) {
        if (!cancelled) {
          setMessages([]);
          setIsLoadingChat(false);
        }
        return;
      }

      const urlChatId = searchParams.get(CHAT_URL_PARAM);
      const urlAgentId = searchParams.get(AGENT_ID_URL_PARAM);

      if (urlChatId) {
        const chat = await loadAgentBuilderChatById(userId, urlChatId);
        if (cancelled) return;
        if (!chat) {
          setMessages([]);
          setChatId(null);
          mergeAgentsNewSearch(router, searchParams, { [CHAT_URL_PARAM]: null });
        } else {
          setMessages(chat.data.messages ?? []);
          setPipelinePhase(chat.data.pipelinePhase ?? "initial");
          setPendingPlan(chat.data.pendingPlan ?? null);
          setAccumulatedQuestionnaireAnswers(chat.data.accumulatedQuestionnaireAnswers ?? []);
          if (chat.data.agentId) {
            setAgentId(chat.data.agentId);
            onComplete?.(chat.data.agentId);
          }
          setChatId(chat.id);
        }
        setIsLoadingChat(false);
        return;
      }

      if (isPersistedAgentBuilderAgentId(urlAgentId)) {
        const chat = await loadAgentBuilderChatByAgentId(userId, urlAgentId);
        if (cancelled) return;
        if (chat) {
          setMessages(chat.data.messages ?? []);
          setPipelinePhase(chat.data.pipelinePhase ?? "initial");
          setPendingPlan(chat.data.pendingPlan ?? null);
          setAccumulatedQuestionnaireAnswers(chat.data.accumulatedQuestionnaireAnswers ?? []);
          if (chat.data.agentId) {
            setAgentId(chat.data.agentId);
            onComplete?.(chat.data.agentId);
          }
          setChatId(chat.id);
          mergeAgentsNewSearch(router, searchParams, {
            [CHAT_URL_PARAM]: chat.id,
            [AGENT_ID_URL_PARAM]: chat.data.agentId ?? urlAgentId,
          });
        } else {
          setMessages([]);
          setAgentId(urlAgentId);
          onComplete?.(urlAgentId);
          setChatId(null);
        }
        setIsLoadingChat(false);
        return;
      }

      if (!cancelled) {
        setMessages([]);
        setIsLoadingChat(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [searchParams, userId, onComplete, router]);

  // Debounced save to Supabase (only when we have content to preserve)
  const hasContentToSave = messages.length > 0 || pipelinePhase !== "initial" || !!pendingPlan || accumulatedQuestionnaireAnswers.length > 0 || !!agentId;
  useEffect(() => {
    if (!userId || isLoadingChat || !hasContentToSave) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveAgentBuilderChat(userId, {
        messages: messagesRef.current,
        pipelinePhase,
        pendingPlan,
        accumulatedQuestionnaireAnswers,
        agentId,
      }, chatId).then(({ id, error }) => {
        if (!error && id && !chatId) {
          setChatId(id);
          mergeAgentsNewSearch(router, searchParams, { [CHAT_URL_PARAM]: id });
        }
      });
      saveTimeoutRef.current = null;
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    userId,
    messages,
    pipelinePhase,
    pendingPlan,
    accumulatedQuestionnaireAnswers,
    agentId,
    chatId,
    isLoadingChat,
    hasContentToSave,
    router,
    searchParams,
  ]);

  const saveMessagesBeforeOAuth = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        if (messagesRef.current.length > 0) {
          sessionStorage.setItem(AGENT_CHAT_STORAGE_KEY, JSON.stringify(messagesRef.current));
        }
        if (agentId) {
          sessionStorage.setItem(AGENT_ID_STORAGE_KEY, agentId);
        }
      }
      if (userId) {
        saveAgentBuilderChat(userId, {
          messages: messagesRef.current,
          pipelinePhase,
          pendingPlan,
          accumulatedQuestionnaireAnswers,
          agentId,
        }, chatId).then(({ id }) => {
          if (id) {
            if (!chatId) setChatId(id);
            sessionStorage.setItem(AGENT_CHAT_ID_STORAGE_KEY, id);
          }
        });
      }
    } catch {
      /* ignore */
    }
  }, [userId, pipelinePhase, pendingPlan, accumulatedQuestionnaireAnswers, agentId, chatId, router]);

  const placeholder =
    pipelinePhase === "awaiting_questionnaire"
      ? CHAT_INPUT_PLACEHOLDERS.questionnaire
      : pipelinePhase === "awaiting_confirmation" || pendingPlan
      ? CHAT_INPUT_PLACEHOLDERS.adjusting
      : CHAT_INPUT_PLACEHOLDERS.default;

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const stripThinkingAssistant = useCallback((prev: ChatMessage[]) => {
    return prev.filter(
      (m) => !(m.role === "assistant" && "content" in m && m.content === "Thinking...")
    );
  }, []);

  const appendAssistantText = useCallback((delta: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      // Replace "Thinking..." with actual content when real reply arrives (check first)
      if (
        last?.role === "assistant" &&
        "content" in last &&
        last.content === "Thinking..."
      ) {
        return [
          ...prev.slice(0, -1),
          { ...last, content: delta, isStreaming: true },
        ];
      }
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

  const updateBuildProgress = useCallback((stage: string, status: BuildStageStatus, removeThinking = false, detail?: string) => {
    setMessages((prev) => {
      let working = prev;
      if (removeThinking) {
        working = prev.filter(
          (m) => !(m.role === "assistant" && "content" in m && m.content === "Thinking...")
        );
      }
      const idx = working.findIndex((m) => m.role === "card" && "cardType" in m && m.cardType === "build_progress");
      if (idx < 0) {
        return [...working, { id: genId(), role: "card", cardType: "build_progress", stages: [{ label: stage, status, ...(detail != null && { detail }) }] }];
      }
      const m = working[idx];
      if (m.role !== "card" || m.cardType !== "build_progress") return working;
      const stages = mergeBuildStage(m.stages, stage, status, detail);
      const out = [...working];
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
                setAccumulatedQuestionnaireAnswers([]);
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
              case "error": {
                const rawMsg = event.message;
                const errText =
                  typeof rawMsg === "string" && rawMsg.trim()
                    ? rawMsg.trim()
                    : "Something went wrong. Want to try again?";
                setMessages((prev) => [
                  ...stripThinkingAssistant(prev),
                  {
                    id: genId(),
                    role: "card",
                    cardType: "error_retry",
                    message: errText,
                    lastUserMessage: options?.lastUserMessage,
                  },
                ]);
                break;
              }
            }
          } catch {
            /* ignore parse errors */
          }
        }
      }
    },
    [appendAssistantText, finishAssistantText, appendMessage, stripThinkingAssistant]
  );

  const sendMessage = useCallback(
    async (
      text: string,
      options?: {
        pendingPlan?: DeployAgentPlan;
        answers?: QuestionnaireAnswer[];
        integrationsConnected?: boolean;
        conversationOverride?: Array<{ role: "user" | "assistant"; content: string }>;
        skipAppend?: boolean;
      }
    ) => {
      if (!options?.answers) {
        setAccumulatedQuestionnaireAnswers([]);
      }
      if (!options?.skipAppend) {
        appendMessage({ id: genId(), role: "user", content: text });
      }
      setIsStreaming(true);

      const conversation =
        options?.conversationOverride ??
        getConversationForApi([
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
            agentId: agentId ?? undefined,
          }),
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          const detail =
            typeof err.error === "string" && err.error.trim()
              ? err.error
              : "Something went wrong. Want to try again?";
          setMessages((prev) => [
            ...stripThinkingAssistant(prev),
            {
              id: genId(),
              role: "card",
              cardType: "error_retry",
              message: detail,
              lastUserMessage: text,
            },
          ]);
          return;
        }

        await readSSEChat(res, { ...options, lastUserMessage: text });
      } catch (e: any) {
        setMessages((prev) => [
          ...stripThinkingAssistant(prev),
          {
            id: genId(),
            role: "card",
            cardType: "error_retry",
            message: "Something went wrong. Want to try again?",
            lastUserMessage: text,
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, appendMessage, readSSEChat, agentId, stripThinkingAssistant]
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
      const allAnswers = [...accumulatedQuestionnaireAnswers, ...answers];
      setAccumulatedQuestionnaireAnswers(allAnswers);

      const formatted = answers
        .map(
          (a) =>
            `${a.question}${a.question.trim().endsWith("?") ? "" : "?"} - ${Array.isArray(a.answer) ? a.answer.join(", ") : a.answer}`
        )
        .join("\n");

      const conversation = getConversationForApi(messages);
      const conversationWithFormatted = [
        ...conversation,
        { role: "user" as const, content: formatted },
      ];

      setMessages((prev) => {
        const withoutQuestionnaire = prev.filter(
          (m) =>
            !(
              m.role === "card" &&
              "cardType" in m &&
              m.cardType === "questionnaire"
            )
        );
        return [...withoutQuestionnaire, { id: genId(), role: "user", content: formatted }];
      });

      sendMessage(formatted, {
        answers: allAnswers,
        conversationOverride: conversationWithFormatted,
        skipAppend: true,
      });
    },
    [messages, sendMessage, accumulatedQuestionnaireAnswers]
  );

  const startBuild = useCallback(
    async (plan: DeployAgentPlan, description: string) => {
      setPipelinePhase("building");
      setIsStreaming(true);
      appendMessage({ id: genId(), role: "assistant", content: "Thinking...", isStreaming: true });

      try {
        const res = await fetch("/api/agents/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, plan }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setMessages((prev) => {
            const withoutThinking = prev.filter(
              (m) => !(m.role === "assistant" && "content" in m && m.content === "Thinking...")
            );
            return [...withoutThinking, { id: genId(), role: "assistant", content: (err.error as string) ?? "Build failed." }];
          });
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
              const event = JSON.parse(line.slice(6)) as { type: string; delta?: string; stage?: string; status?: string; detail?: string; agentId?: string; summary?: string };
              if (event.type === "build_stage" && event.stage && event.status) {
                updateBuildProgress(event.stage, event.status as BuildStageStatus, true, event.detail);
              }
              if (event.type === "text_delta" && typeof event.delta === "string") {
                const delta = event.delta;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant" && last.isStreaming && "content" in last) {
                    return [...prev.slice(0, -1), { ...last, content: (last.content ?? "") + delta }];
                  }
                  return [...prev, { id: genId(), role: "assistant", content: delta, isStreaming: true }];
                });
              }
              if (event.type === "text_done") {
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return [...prev.slice(0, -1), { ...last, isStreaming: false }];
                  }
                  return prev;
                });
              }
              if (event.type === "build_complete") {
                setAccumulatedQuestionnaireAnswers([]);
                setPipelinePhase("complete");
                setAgentId(event.agentId ?? null);
                setMessages((prev) => {
                  const completionCard = {
                    id: genId(),
                    role: "card" as const,
                    cardType: "completion" as const,
                    agentId: event.agentId ?? "",
                    summary: "",
                    requiredIntegrations: (event as { requiredIntegrations?: IntegrationCheckItem[] }).requiredIntegrations,
                  };
                  const next = [...prev, completionCard];
                  // Persist immediately so pipeline + completion survive reload
                  if (userId) {
                    saveAgentBuilderChat(userId, {
                      messages: next,
                      pipelinePhase: "complete",
                      pendingPlan: null,
                      accumulatedQuestionnaireAnswers: [],
                      agentId: event.agentId ?? null,
                    }, chatId).then(({ id, error }) => {
                      if (!error && id && !chatId) {
                        setChatId(id);
                        mergeAgentsNewSearch(router, searchParams, { [CHAT_URL_PARAM]: id });
                      }
                    });
                  }
                  return next;
                });
                onComplete?.(event.agentId ?? "");
              }
              if (event.type === "error") {
                setMessages((prev) => {
                  const withoutThinking = prev.filter(
                    (m) => !(m.role === "assistant" && "content" in m && m.content === "Thinking...")
                  );
                  return [...withoutThinking, { id: genId(), role: "assistant", content: (event as any).message ?? "Build failed." }];
                });
              }
            } catch {
              /* ignore */
            }
          }
        }
      } catch (e: any) {
        setMessages((prev) => {
          const withoutThinking = prev.filter(
            (m) => !(m.role === "assistant" && "content" in m && m.content === "Thinking...")
          );
          return [...withoutThinking, { id: genId(), role: "assistant", content: e?.message ?? "Build failed." }];
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [updateBuildProgress, onComplete, userId, chatId, router, searchParams, appendMessage]
  );

  const startAdjust = useCallback(
    async (plan: DeployAgentPlan) => {
      setPendingPlan(plan);
      setPipelinePhase("initial");
      setMessages((prev) =>
        prev.filter(
          (m) =>
            !(
              m.role === "card" &&
              "cardType" in m &&
              m.cardType === "plan"
            )
        )
      );
      setIsStreaming(true);
      try {
        const res = await fetch("/api/agents/chat/adjust-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (res.ok) {
          await readSSEChat(res);
        } else {
          appendMessage({
            id: genId(),
            role: "assistant",
            content: "Of course. What would you like to change?",
          });
        }
      } catch {
        appendMessage({
          id: genId(),
          role: "assistant",
          content: "Of course. What would you like to change?",
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [appendMessage, readSSEChat]
  );

  const handlePlanBuild = useCallback(
    (plan: DeployAgentPlan) => {
      appendMessage({ id: genId(), role: "user", content: "Build it." });
      const lastUser = getConversationForApi(messages).filter((m) => m.role === "user").pop()?.content ?? "";
      startBuild(plan, lastUser);
    },
    [messages, startBuild, appendMessage]
  );

  const handlePlanAdjust = useCallback(
    (plan: DeployAgentPlan) => {
      const lastUserContent = [...messages].reverse().find((m) => m.role === "user")?.content?.trim() ?? "";
      const alreadySent = /^let me adjust something\.?$/i.test(lastUserContent);
      if (!alreadySent) {
        appendMessage({ id: genId(), role: "user", content: "Let me adjust something." });
      }
      startAdjust(plan);
    },
    [startAdjust, messages, appendMessage]
  );

  const handlePlanUpdate = useCallback(
    async (plan: DeployAgentPlan) => {
      if (!agentId) return;
      appendMessage({ id: genId(), role: "user", content: "Update agent." });
      setIsStreaming(true);
      try {
        const res = await fetch(`/api/agents/${agentId}/update-from-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          appendMessage({
            id: genId(),
            role: "assistant",
            content: (err.error as string) ?? "Failed to update agent.",
          });
          return;
        }
        setPendingPlan(null);
        setPipelinePhase("complete");
        appendMessage({
          id: genId(),
          role: "assistant",
          content: "Your agent has been updated.",
        });
      } catch (e: any) {
        appendMessage({
          id: genId(),
          role: "assistant",
          content: e?.message ?? "Failed to update agent.",
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [agentId, appendMessage]
  );

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

  const hasMessages = messages.length > 0;

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

  if (isLoadingChat) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-48 rounded-lg bg-white/40 dark:bg-zinc-900/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={scrollTopOffset && !hasMessages ? { paddingTop: scrollTopOffset } : undefined}
    >
      {!hasMessages && (
        <div className="flex-shrink-0 pt-2 pb-4 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight">
            Deploy an Agent
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-xl">
            Hey! I'm your agent builder. Tell me what you'd like your agent to do — be as detailed or vague as you like.
          </p>
        </div>
      )}
      <div className="flex-1 flex flex-col items-center min-h-0 overflow-hidden">
        <div className="w-full max-w-[66.666%] min-w-[280px] flex flex-col flex-1 min-h-0 px-2">
          <div
            className={cn(
              "flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col",
              hasMessages ? "pb-2" : "pt-2 pb-2"
            )}
            style={scrollTopOffset && hasMessages ? { paddingTop: scrollTopOffset } : undefined}
          >
            <MessageList
              messages={messages}
              isStreaming={isStreaming}
              onIntegrationCheckAllConnected={resumeAfterIntegrations}
              onQuestionnaireSubmit={submitAnswers}
              onPlanBuild={handlePlanBuild}
              onPlanAdjust={handlePlanAdjust}
              onPlanUpdate={handlePlanUpdate}
              agentId={agentId}
              onViewAgent={onViewAgent}
              integrationReturnUrl={AGENT_RETURN_URL}
              onBeforeOAuthRedirect={saveMessagesBeforeOAuth}
              onExampleClick={handleExampleClick}
              onRetry={handleRetry}
            />
          </div>
          <div className="flex-shrink-0 pt-2 flex flex-col gap-2">
            {!hasMessages && pipelinePhase === "initial" && (
              <div className="flex flex-col items-start gap-2">
                <button
                  type="button"
                  onClick={() => handleExampleClick(EXAMPLE_CHIPS[0])}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    "bg-stone-100 text-muted-foreground dark:bg-white/[0.08]",
                    "hover:text-black dark:hover:text-white"
                  )}
                >
                  {EXAMPLE_CHIPS[0]}
                </button>
                <div className="flex flex-wrap justify-start gap-2">
                  {EXAMPLE_CHIPS.slice(1).map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleExampleClick(chip)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        "bg-stone-100 text-muted-foreground dark:bg-white/[0.08]",
                        "hover:text-black dark:hover:text-white"
                      )}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ChatInput
              placeholder={placeholder}
              disabled={pipelinePhase === "building"}
              sendDisabled={pipelinePhase === "building"}
              isStreaming={isStreaming}
              onEnterAction={
                pipelinePhase === "awaiting_confirmation" && pendingPlan
                  ? () =>
                      agentId
                        ? handlePlanUpdate(pendingPlan)
                        : handlePlanBuild(pendingPlan)
                  : undefined
              }
              onSend={handleSend}
              fillValue={inputFillValue}
              onFillApplied={() => setInputFillValue(null)}
              autoFocus
            />
            <p className="mt-1 text-[11px] text-muted-foreground/70 text-center">
              Runwise can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
