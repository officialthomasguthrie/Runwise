"use client";

import { useEffect, useRef } from "react";
import { UserBubble } from "./bubbles/user-bubble";
import { AssistantBubble } from "./bubbles/assistant-bubble";
import { IntegrationCheckCard } from "./cards/integration-check-card";
import { QuestionnaireCard } from "./cards/questionnaire-card";
import { WelcomeCard } from "./cards/welcome-card";
import { ErrorRetryCard } from "./cards/error-retry-card";
import { PlanPreviewCard } from "./cards/plan-preview-card";
import { BuildProgressCard } from "./cards/build-progress-card";
import { CompletionCard } from "./cards/completion-card";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/agents/chat-pipeline";
import type { DeployAgentPlan } from "@/lib/agents/types";
import type { QuestionnaireAnswer } from "@/lib/ai/types";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  className?: string;
  onIntegrationCheckAllConnected?: () => void;
  onQuestionnaireSubmit?: (answers: QuestionnaireAnswer[]) => void;
  onPlanBuild?: (plan: DeployAgentPlan) => void;
  onPlanAdjust?: (plan: DeployAgentPlan) => void;
  /** OAuth return URL for integration check card (e.g. /agents/new?resume=1) */
  integrationReturnUrl?: string;
  /** Called before OAuth redirect so parent can persist conversation state */
  onBeforeOAuthRedirect?: () => void;
  /** Called when user clicks an example chip (fills the input) */
  onExampleClick?: (text: string) => void;
  /** Called when user clicks Retry on an error card */
  onRetry?: (lastUserMessage?: string) => void;
}

/**
 * Placeholder for card components not yet implemented.
 */
function CardPlaceholder({ message }: { message: ChatMessage }) {
  if (message.role !== "card") return null;

  const label =
    message.cardType === "confirmation" ? "Ready to build?" : "Card";

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-muted-foreground">
      [Card: {label}]
    </div>
  );
}

export function MessageList({
  messages,
  isStreaming = false,
  className,
  onIntegrationCheckAllConnected,
  onQuestionnaireSubmit,
  onPlanBuild,
  onPlanAdjust,
  integrationReturnUrl,
  onBeforeOAuthRedirect,
  onExampleClick,
  onRetry,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 overflow-y-auto scrollbar-hide pb-4",
        className
      )}
    >
      {messages.map((msg) => {
        if (msg.role === "user") {
          return (
            <div key={msg.id} className="animate-message-in">
              <UserBubble content={msg.content} />
            </div>
          );
        }
        if (msg.role === "assistant") {
          return (
            <div key={msg.id} className="animate-message-in">
              <AssistantBubble
                content={msg.content}
                isStreaming={isStreaming && msg.isStreaming}
              />
            </div>
          );
        }
        if (msg.role === "card") {
          if (msg.cardType === "welcome") {
            return (
              <div key={msg.id} className="animate-message-in">
                <WelcomeCard
                  content={msg.content}
                  chips={msg.chips}
                  onChipClick={onExampleClick ?? (() => {})}
                />
              </div>
            );
          }
          if (msg.cardType === "error_retry") {
            return (
              <div key={msg.id} className="animate-message-in">
                <ErrorRetryCard
                  message={msg.message}
                  onRetry={
                    msg.lastUserMessage
                      ? () => onRetry?.(msg.lastUserMessage)
                      : undefined
                  }
                />
              </div>
            );
          }
          if (msg.cardType === "integration_check") {
            return (
              <div key={msg.id} className="animate-message-in">
                <IntegrationCheckCard
                  integrations={msg.data}
                  onAllConnected={onIntegrationCheckAllConnected ?? (() => {})}
                  returnUrl={integrationReturnUrl}
                  onBeforeOAuthRedirect={onBeforeOAuthRedirect}
                />
              </div>
            );
          }
          if (msg.cardType === "questionnaire") {
            return (
              <div key={msg.id} className="animate-message-in">
                <QuestionnaireCard
                  questions={msg.data}
                  onSubmit={onQuestionnaireSubmit ?? (() => {})}
                />
              </div>
            );
          }
          if (msg.cardType === "plan") {
            return (
              <div key={msg.id} className="animate-message-in">
                <PlanPreviewCard
                  plan={msg.data}
                  onBuild={() => onPlanBuild?.(msg.data)}
                  onAdjust={() => onPlanAdjust?.(msg.data)}
                />
              </div>
            );
          }
          if (msg.cardType === "build_progress") {
            return (
              <div key={msg.id} className="animate-message-in">
                <BuildProgressCard stages={msg.stages} />
              </div>
            );
          }
          if (msg.cardType === "completion") {
            return (
              <div key={msg.id} className="animate-message-in">
                <CompletionCard
                  agentId={msg.agentId}
                  summary={msg.summary}
                />
              </div>
            );
          }
          return (
            <div key={msg.id} className="animate-message-in">
              <CardPlaceholder message={msg} />
            </div>
          );
        }
        return null;
      })}
      <div ref={bottomRef} />
    </div>
  );
}
