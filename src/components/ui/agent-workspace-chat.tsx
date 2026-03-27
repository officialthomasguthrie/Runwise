"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Bot } from "lucide-react";
import { UserBubble } from "./agent-chat/bubbles/user-bubble";
import { AssistantBubble } from "./agent-chat/bubbles/assistant-bubble";
import { ChatInput } from "./agent-chat/chat-input";
import { loadAgentChat, saveAgentChat, type AgentChatMessage } from "@/lib/agents/agent-chat-persistence";
import { cn } from "@/lib/utils";

const SAVE_DEBOUNCE_MS = 1500;

function genId() {
  return crypto.randomUUID?.() ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function conversationPreviewFromMessages(messages: { content: string }[]): string | null {
  if (messages.length === 0) return null;
  const last = messages[messages.length - 1];
  const singleLine = last.content.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  if (!singleLine) return null;
  const max = 72;
  return singleLine.length > max ? `${singleLine.slice(0, max)}…` : singleLine;
}

interface AgentWorkspaceChatProps {
  agentId: string;
  userId: string | null;
  agentName?: string;
  className?: string;
  /** Dense layout: keeps header + messages + input visible in a fixed-height sidebar */
  compact?: boolean;
  /** Latest message one-liner for a compact header (e.g. sidebar) */
  onConversationPreviewChange?: (preview: string | null) => void;
}

export function AgentWorkspaceChat({
  agentId,
  userId,
  agentName,
  className,
  compact = false,
  onConversationPreviewChange,
}: AgentWorkspaceChatProps) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<AgentChatMessage[]>([]);
  messagesRef.current = messages;
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load chat on mount
  useEffect(() => {
    if (!agentId || !userId) {
      setIsLoading(false);
      return;
    }
    loadAgentChat(agentId, userId).then((msgs) => {
      setMessages(msgs);
      setIsLoading(false);
    });
  }, [agentId, userId]);

  useEffect(() => {
    if (isLoading) return;
    onConversationPreviewChange?.(conversationPreviewFromMessages(messages));
  }, [messages, isLoading, onConversationPreviewChange]);

  // Debounced save whenever messages change
  useEffect(() => {
    if (!agentId || !userId || isLoading || messages.length === 0) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveAgentChat(agentId, userId, messagesRef.current);
      saveTimeoutRef.current = null;
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [agentId, userId, messages, isLoading]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const appendAssistantText = useCallback((delta: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") {
        return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
      }
      return [...prev, { id: genId(), role: "assistant", content: delta }];
    });
  }, []);

  const finishAssistantText = useCallback(() => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") {
        return [...prev];
      }
      return prev;
    });
  }, []);

  const saveAfterResponse = useCallback(
    async (updated: AgentChatMessage[]) => {
      if (!agentId || !userId) return;
      await saveAgentChat(agentId, userId, updated);
    },
    [agentId, userId]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!userId) return;

      const userMsg: AgentChatMessage = { id: genId(), role: "user", content: text };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setIsStreaming(true);

      try {
        const res = await fetch(`/api/agents/${agentId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const errContent = err?.error ?? "Something went wrong. Please try again.";
          const errMsg: AgentChatMessage = { id: genId(), role: "assistant", content: errContent };
          setMessages((prev) => {
            const full = [...prev, errMsg];
            saveAfterResponse(full);
            return full;
          });
          setIsStreaming(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setIsStreaming(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedText = "";
        let streamError: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as { type: string; delta?: string; message?: string };
              switch (event.type) {
                case "text_delta":
                  accumulatedText += (event.delta as string) ?? "";
                  appendAssistantText((event.delta as string) ?? "");
                  break;
                case "text_done":
                  finishAssistantText();
                  break;
                case "error":
                  streamError = event.message ?? "Something went wrong.";
                  appendAssistantText(streamError);
                  finishAssistantText();
                  break;
              }
            } catch {
              /* ignore parse errors */
            }
          }
        }

        const assistantContent = streamError ?? (accumulatedText || "No response.");
        const assistantMsg: AgentChatMessage = {
          id: genId(),
          role: "assistant",
          content: assistantContent,
        };
        const fullConversation = [...nextMessages, assistantMsg];
        setMessages(fullConversation);
        saveAfterResponse(fullConversation);
      } catch (e) {
        console.error("[AgentWorkspaceChat] send error:", e);
        const errMsg: AgentChatMessage = {
          id: genId(),
          role: "assistant",
          content: "Could not send. Please try again.",
        };
        setMessages((prev) => {
          const full = [...prev, errMsg];
          saveAfterResponse(full);
          return full;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [agentId, userId, messages, appendAssistantText, finishAssistantText, saveAfterResponse]
  );

  if (!userId) return null;

  if (isLoading) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <p className="text-sm text-muted-foreground">Loading chat…</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-1 flex-col min-h-0", className)}>
      <div
        className={cn(
          "flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col",
          compact ? "px-3 py-3 gap-3" : "px-4 py-6 gap-4"
        )}
      >
        {messages.length === 0 ? (
          <div
            className={cn(
              "flex flex-1 items-center justify-center",
              "flex-col text-center",
              compact ? "gap-2 px-2" : "gap-3 px-2"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center",
                "h-10 w-10 rounded-full",
                "bg-stone-200/40 dark:bg-white/[0.06]",
                "border border-stone-300/50 dark:border-white/[0.08]"
              )}
              aria-hidden
            >
              <Bot className="h-5 w-5 text-stone-600 dark:text-stone-300" />
            </div>
            <p className={cn("text-muted-foreground", compact ? "text-xs leading-relaxed" : "text-sm")}>
              Chat with {agentName ?? "this agent"}. Ask questions, get help, or discuss what it does.
            </p>
          </div>
        ) : (
          messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="animate-message-in">
                <UserBubble content={msg.content} />
              </div>
            ) : (
              <div key={msg.id} className="animate-message-in">
                <AssistantBubble
                  content={msg.content}
                  isStreaming={isStreaming && messages[messages.length - 1]?.id === msg.id}
                />
              </div>
            )
          )
        )}
        <div ref={bottomRef} />
      </div>
      <div className={cn("flex-shrink-0", compact ? "px-3 pb-3 pt-0" : "px-4 pb-6")}>
        <ChatInput
          placeholder={`Message ${agentName ?? "agent"}…`}
          onSend={sendMessage}
          isStreaming={isStreaming}
          compact={compact}
        />
      </div>
    </div>
  );
}
