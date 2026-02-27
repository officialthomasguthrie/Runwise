"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Bot,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeployAgentPlan } from "@/lib/agents/types";

// ── Example prompts ───────────────────────────────────────────────────────────

const EXAMPLES = [
  "Monitor my Gmail and reply to sales inquiries automatically. Log all new leads to my Google Sheet and send me a daily summary on Slack at 9am.",
  "Watch my Slack #support channel. When a customer asks a question, draft a helpful reply and post it. Remember repeat customers.",
  "Scan my Gmail every hour. If I receive an email from a new domain, reply professionally introducing yourself, then remember who they are.",
  "Send me a good morning Slack message every weekday at 8am with a summary of my unread emails and any calendar events for today.",
  "Monitor my Discord server for questions about our product. Answer using what you know, and remember any FAQs that come up.",
];

// ── Trigger → integration mapping for warnings ────────────────────────────────

const TRIGGER_INTEGRATION: Record<string, string> = {
  "new-email-received": "google-gmail",
  "new-message-in-slack": "slack",
  "new-discord-message": "discord",
  "new-row-in-google-sheet": "google-sheets",
  "new-github-issue": "github",
  "file-uploaded": "google-drive",
  "new-form-submission": "google-forms",
};

const INTEGRATION_LABELS: Record<string, string> = {
  "google-gmail": "Gmail",
  slack: "Slack",
  discord: "Discord",
  "google-sheets": "Google Sheets",
  github: "GitHub",
  "google-drive": "Google Drive",
  "google-forms": "Google Forms",
};

const BEHAVIOUR_ICONS: Record<string, string> = {
  "new-email-received": "📧",
  "new-message-in-slack": "💬",
  "new-discord-message": "💬",
  "new-row-in-google-sheet": "📊",
  "new-github-issue": "🐛",
  "file-uploaded": "📁",
  "new-form-submission": "📋",
  heartbeat: "📅",
  schedule: "⏰",
};

// ── Planning animation messages ───────────────────────────────────────────────

const PLANNING_MESSAGES = [
  "Analysing your request…",
  "Planning behaviours…",
  "Crafting instructions…",
  "Setting up memory…",
  "Almost ready…",
];

// ── Slide animation variants ──────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -40 : 40,
    opacity: 0,
  }),
};

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════

export function AgentDeployWizard() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dir, setDir] = useState(1); // animation direction
  const [description, setDescription] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const [plan, setPlan] = useState<DeployAgentPlan | null>(null);
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);
  const [planError, setPlanError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cycle planning messages while on step 2
  useEffect(() => {
    if (step !== 2) return;
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % PLANNING_MESSAGES.length);
    }, 900);
    return () => clearInterval(id);
  }, [step]);

  // Auto-focus textarea on step 1
  useEffect(() => {
    if (step === 1) textareaRef.current?.focus();
  }, [step]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function goTo(next: 1 | 2 | 3) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  async function handleGeneratePlan() {
    if (!description.trim()) return;
    setPlanError(null);
    setMsgIndex(0);
    goTo(2);

    try {
      const res = await fetch("/api/agents/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setPlanError(json.error ?? "Failed to generate plan");
        goTo(1);
        return;
      }

      setPlan(json.plan);
      setConnectedIntegrations(json.connectedIntegrations ?? []);
      goTo(3);
    } catch (err: any) {
      setPlanError(err?.message ?? "Network error");
      goTo(1);
    }
  }

  async function handleDeploy() {
    if (!plan) return;
    setDeploying(true);
    setDeployError(null);

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), plan }),
      });

      const json = await res.json();

      if (!res.ok) {
        setDeployError(json.error ?? "Failed to deploy agent");
        setDeploying(false);
        return;
      }

      router.push(`/agents/${json.agent.id}`);
    } catch (err: any) {
      setDeployError(err?.message ?? "Network error");
      setDeploying(false);
    }
  }

  function handleStartOver() {
    setPlan(null);
    setPlanError(null);
    setDeployError(null);
    setDir(-1);
    setStep(1);
  }

  // ── Missing integrations check ───────────────────────────────────────────────

  const missingIntegrations: string[] = [];
  if (plan) {
    for (const behaviour of plan.behaviours) {
      if (behaviour.behaviourType === "polling" && behaviour.triggerType) {
        const required = TRIGGER_INTEGRATION[behaviour.triggerType];
        if (
          required &&
          !connectedIntegrations.some(
            (ci) =>
              ci === required ||
              (required.startsWith("google-") && ci.startsWith("google-")) ||
              (ci.startsWith("google-") && required.startsWith("google-"))
          ) &&
          !missingIntegrations.includes(INTEGRATION_LABELS[required] ?? required)
        ) {
          missingIntegrations.push(INTEGRATION_LABELS[required] ?? required);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              s === step
                ? "bg-pink-400 flex-[2]"
                : s < step
                ? "bg-white/20 flex-1"
                : "bg-white/10 flex-1"
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="relative overflow-hidden min-h-[340px]">
        <AnimatePresence mode="wait" custom={dir}>
          {step === 1 && (
            <motion.div
              key="step1"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="absolute inset-0 flex flex-col gap-5"
            >
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  What should your agent do?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Describe it in plain English. Be as specific or vague as you like.
                </p>
              </div>

              <textarea
                ref={textareaRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monitor my Gmail and reply to sales inquiries automatically. Log everything to my Google Sheet and send me a daily summary on Slack at 9am."
                className="w-full min-h-[160px] rounded-md border border-stone-200 dark:border-white/10 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (description.trim()) handleGeneratePlan();
                  }
                }}
              />

              {planError && (
                <p className="text-sm text-red-400">{planError}</p>
              )}

              {/* Examples */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowExamples((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  {showExamples ? "Hide examples" : "Show example prompts"}
                </button>

                <AnimatePresence>
                  {showExamples && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-1.5 mt-3">
                        {EXAMPLES.map((ex, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setDescription(ex);
                              setShowExamples(false);
                              textareaRef.current?.focus();
                            }}
                            className="text-left text-xs text-muted-foreground hover:text-foreground border border-white/5 hover:border-white/20 rounded-md px-3 py-2 transition-colors bg-white/[0.02] hover:bg-white/[0.05]"
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleGeneratePlan}
                disabled={!description.trim()}
                className="ml-auto inline-flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-2 text-sm font-medium text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generate plan
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-8"
            >
              {/* Pulsing bot icon */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-24 h-24 rounded-full bg-pink-500/10 animate-ping" />
                <div className="absolute w-16 h-16 rounded-full bg-pink-500/15 animate-pulse" />
                <div className="relative w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Bot className="w-7 h-7 text-pink-400" />
                </div>
              </div>

              {/* Cycling planning message */}
              <div className="text-center min-h-[48px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={msgIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="text-base text-muted-foreground"
                  >
                    {PLANNING_MESSAGES[msgIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>

              <p className="text-xs text-muted-foreground/50">This takes about 5–10 seconds</p>
            </motion.div>
          )}

          {step === 3 && plan && (
            <motion.div
              key="step3"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="absolute inset-0 flex flex-col gap-4 overflow-y-auto pr-1"
            >
              {/* Agent identity */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl flex-shrink-0">
                  {plan.avatarEmoji}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground tracking-tight">
                    Meet {plan.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{plan.persona}</p>
                </div>
              </div>

              {/* Behaviours */}
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Will watch & act on
                </p>
                {plan.behaviours.map((b, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="flex-shrink-0 mt-0.5">
                      {BEHAVIOUR_ICONS[b.triggerType ?? b.behaviourType] ?? "⚡"}
                    </span>
                    <span>{b.description}</span>
                  </div>
                ))}
              </div>

              {/* Initial memories */}
              {plan.initialMemories.length > 0 && (
                <div className="rounded-md border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Starting knowledge
                  </p>
                  {plan.initialMemories.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="flex-shrink-0 text-xs mt-0.5 text-white/30">•</span>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Missing integrations warning */}
              {missingIntegrations.length > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-400">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Connect <strong>{missingIntegrations.join(", ")}</strong> in Integrations so this agent can work.
                  </span>
                </div>
              )}

              {deployError && (
                <p className="text-sm text-red-400">{deployError}</p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Start over
                </button>

                <button
                  onClick={handleDeploy}
                  disabled={deploying}
                  className="inline-flex items-center gap-2 rounded-md bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 px-5 py-2 text-sm font-medium text-pink-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deploying ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </motion.div>
                      Deploying…
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4" />
                      Deploy {plan.name}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Back button (step 3 only) */}
      {step === 3 && (
        <button
          type="button"
          onClick={() => goTo(1)}
          className="self-start text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Edit description
        </button>
      )}
    </div>
  );
}
