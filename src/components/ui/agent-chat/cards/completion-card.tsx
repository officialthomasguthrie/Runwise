"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrationCheckItem } from "@/lib/agents/chat-pipeline";

const AGENT_RETURN_URL = "/agents/new?resume=1";

const BRANDFETCH_CLIENT = "1dxbfHSJFAPEGdCLU4o5B";
const INTEGRATION_LOGOS: Record<string, string> = {
  "google-gmail": `https://cdn.brandfetch.io/id5o3EIREg/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  "google-sheets": `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idKa2XnbFY.svg?c=${BRANDFETCH_CLIENT}`,
  "google-drive": `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idncaAgFGT.svg?c=${BRANDFETCH_CLIENT}`,
  "google-forms": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Google_Forms_logo_%282014-2020%29.svg/120px-Google_Forms_logo_%282014-2020%29.svg.png",
  "google-calendar": `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idMX2_OMSc.svg?c=${BRANDFETCH_CLIENT}`,
  slack: `https://cdn.brandfetch.io/idJ_HhtG0Z/w/400/h/400/theme/dark/icon.jpeg?c=${BRANDFETCH_CLIENT}`,
  discord: `https://cdn.brandfetch.io/idM8Hlme1a/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  github: `https://cdn.brandfetch.io/idZAyF9rlg/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  notion: `https://cdn.brandfetch.io/idPYUoikV7/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  airtable: `https://cdn.brandfetch.io/iddsnRzkxS/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  openai: `https://cdn.brandfetch.io/idR3duQxYl/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  twilio: `https://cdn.brandfetch.io/idT7wVo_zL/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
};

function getLogoUrl(service: string): string | null {
  return INTEGRATION_LOGOS[service] ?? null;
}

function isServiceConnected(
  serviceId: string,
  connectedServices: string[]
): boolean {
  return connectedServices.some(
    (cs) =>
      cs === serviceId ||
      (serviceId.startsWith("google-") && cs.startsWith("google-")) ||
      (cs.startsWith("google-") && serviceId.startsWith("google-"))
  );
}

interface CompletionCardProps {
  agentId: string;
  summary: string;
  /** Required integrations to connect before showing View Agent. When present and any disconnected, gate is shown. */
  requiredIntegrations?: IntegrationCheckItem[];
  /** When provided, switches to Agent tab instead of navigating to /agents/[id] */
  onViewAgent?: () => void;
  returnUrl?: string;
  onBeforeOAuthRedirect?: () => void;
}

/**
 * Completion UI: integration gate (if needed) + View Agent button.
 * When requiredIntegrations exists and any are disconnected, shows "Connect these integrations to continue"
 * with Connect/Disconnect buttons. View Agent appears only when all are connected.
 */
export function CompletionCard({
  agentId,
  onViewAgent,
  requiredIntegrations,
  returnUrl = AGENT_RETURN_URL,
  onBeforeOAuthRedirect,
}: CompletionCardProps) {
  const router = useRouter();
  const [connectedMap, setConnectedMap] = useState<Record<string, boolean>>(
    () =>
      requiredIntegrations
        ? Object.fromEntries(requiredIntegrations.map((i) => [i.service, i.connected]))
        : {}
  );
  const [disconnectingService, setDisconnectingService] = useState<string | null>(null);
  const integrations = requiredIntegrations ?? [];

  const allConnected = integrations.length === 0 || integrations.every((i) => connectedMap[i.service]);

  // Only show integrations that were not connected at build time. Once user connects them during this session, show with Disconnect. When all connected, hide section.
  const displayedIntegrations = integrations.filter((item) => !item.connected);
  const showIntegrationSection = displayedIntegrations.length > 0 && !allConnected;

  // Poll /api/integrations/status and listen for credential popup success
  useEffect(() => {
    if (integrations.length === 0) return;

    const poll = async () => {
      try {
        const res = await fetch("/api/integrations/status", { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        const services: string[] = (json.integrations ?? []).map(
          (x: { service: string }) => x.service
        );

        setConnectedMap((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const item of integrations) {
            const nowConnected = isServiceConnected(item.service, services);
            if (prev[item.service] !== nowConnected) {
              next[item.service] = nowConnected;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      } catch {
        /* ignore */
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "integration-connected" && event.data?.service) {
        poll(); // Immediate refresh when credential popup completes
      }
    };

    poll();
    window.addEventListener("message", handleMessage);
    const id = setInterval(poll, 3000);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(id);
    };
  }, [integrations]);

  const handleViewAgent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onViewAgent) {
      onViewAgent();
    } else {
      router.push(`/agents/new?agentId=${agentId}`);
    }
  };

  const handleConnect = (item: IntegrationCheckItem) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (item.connectionMethod === "oauth") {
      let url = item.connectUrl.startsWith("http") ? item.connectUrl : `${origin}${item.connectUrl}`;
      if (returnUrl) {
        const fullReturnUrl = returnUrl.startsWith("http") ? returnUrl : `${origin}${returnUrl}`;
        const sep = url.includes("?") ? "&" : "?";
        url += `${sep}returnUrl=${encodeURIComponent(fullReturnUrl)}`;
      }
      onBeforeOAuthRedirect?.();
      window.location.href = url;
    } else {
      const connectUrl = item.connectUrl.startsWith("http") ? item.connectUrl : `${origin}${item.connectUrl}`;
      const w = 600;
      const h = 700;
      const left = Math.round((window.screen.width - w) / 2);
      const top = Math.round((window.screen.height - h) / 2);
      window.open(
        connectUrl,
        "ConnectIntegration",
        `width=${w},height=${h},left=${left},top=${top}`
      );
    }
  };

  const handleDisconnect = async (serviceName: string) => {
    setDisconnectingService(serviceName);
    try {
      const res = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disconnect");
      setConnectedMap((prev) => ({ ...prev, [serviceName]: false }));
    } catch {
      /* ignore - polling will correct state */
    } finally {
      setDisconnectingService(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* Integration gate — only when there are disconnected integrations; hide when all connected */}
      {showIntegrationSection && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-black dark:text-white leading-relaxed">
            Connect these integrations to continue:
          </p>
          <div className="flex flex-col gap-2">
            {displayedIntegrations.map((item) => {
              const connected = connectedMap[item.service] ?? item.connected;
              const logoUrl = getLogoUrl(item.service);

              return (
                <div
                  key={item.service}
                  className="flex items-center gap-3"
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt=""
                      className="h-5 w-5 flex-shrink-0 rounded object-contain"
                    />
                  ) : (
                    <span className="text-base leading-none w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </span>
                  )}
                  <span className="text-sm text-black dark:text-white">
                    {item.label}
                  </span>
                  {connected ? (
                    <button
                      type="button"
                      onClick={() => handleDisconnect(item.service)}
                      disabled={disconnectingService === item.service}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                        "border border-stone-200 dark:border-stone-600",
                        "text-muted-foreground hover:text-foreground",
                        "hover:bg-stone-100 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-500",
                        "disabled:opacity-50 disabled:pointer-events-none"
                      )}
                    >
                      {disconnectingService === item.service ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Disconnecting
                        </>
                      ) : (
                        "Disconnect"
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(item)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                        "border border-stone-300 dark:border-stone-500",
                        "bg-stone-50 dark:bg-stone-800/50",
                        "text-foreground hover:bg-stone-100 dark:hover:bg-stone-700/80",
                        "hover:border-stone-400 dark:hover:border-stone-400"
                      )}
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Agent — always visible */}
      <button
        type="button"
        onClick={handleViewAgent}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200 w-fit",
          "bg-stone-200/40 dark:bg-white/[0.06] backdrop-blur-xl",
          "border border-stone-300/50 dark:border-white/[0.08]",
          "text-stone-600 dark:text-stone-300",
          "hover:bg-stone-200/60 dark:hover:bg-white/[0.1] hover:border-stone-300/70 dark:hover:border-white/15",
          "shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
        )}
      >
        View Agent
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
