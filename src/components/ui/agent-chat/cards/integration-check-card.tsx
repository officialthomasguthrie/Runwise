"use client";

import { useEffect, useState, useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrationCheckItem } from "@/lib/agents/chat-pipeline";

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

interface IntegrationCheckCardProps {
  integrations: IntegrationCheckItem[];
  onAllConnected: () => void;
  /** When provided, OAuth connect URLs will redirect back here after completion (e.g. /agents/new?resume=1) */
  returnUrl?: string;
  /** Called before OAuth redirect so the parent can persist conversation state */
  onBeforeOAuthRedirect?: () => void;
}

export function IntegrationCheckCard({
  integrations,
  onAllConnected,
  returnUrl,
  onBeforeOAuthRedirect,
}: IntegrationCheckCardProps) {
  const [connectedMap, setConnectedMap] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(integrations.map((i) => [i.service, i.connected]))
  );
  const [allConnectedShown, setAllConnectedShown] = useState(false);
  const onAllConnectedRef = useRef(onAllConnected);
  onAllConnectedRef.current = onAllConnected;

  const allConnected = integrations.every((i) => connectedMap[i.service]);

  // Poll /api/integrations/status and listen for credential popup success
  useEffect(() => {
    if (allConnected) return;

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
            if (item.connectionMethod === "platform") continue;
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
  }, [integrations, allConnected]);

  // When all connected: show "All integrations connected ✓" briefly, then call parent
  useEffect(() => {
    if (!allConnected) return;

    setAllConnectedShown(true);
    const t = setTimeout(() => {
      onAllConnectedRef.current();
    }, 1200);

    return () => clearTimeout(t);
  }, [allConnected]);

  if (allConnectedShown) {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
        <Check className="h-4 w-4 flex-shrink-0" />
        All integrations connected ✓
      </div>
    );
  }

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Required integrations
        </h3>
      </div>
      <div className="divide-y divide-white/5">
        {integrations.map((item) => {
          const connected = connectedMap[item.service] ?? item.connected;

          return (
            <div
              key={item.service}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </span>

              {connected ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  {item.connectionMethod === "platform" ? "Included" : "Connected"}
                </span>
              ) : item.connectionMethod === "platform" ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  Included
                </span>
              ) : (
                <ConnectButton
                  item={item}
                  returnUrl={returnUrl}
                  onBeforeOAuthRedirect={onBeforeOAuthRedirect}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConnectButton({
  item,
  returnUrl,
  onBeforeOAuthRedirect,
}: {
  item: IntegrationCheckItem;
  returnUrl?: string;
  onBeforeOAuthRedirect?: () => void;
}) {
  if (item.connectionMethod === "platform") {
    return null;
  }
  const handleClick = () => {
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

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium rounded-md px-2.5 py-1 border transition-colors",
        "border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
      )}
    >
      Connect {item.label} →
    </button>
  );
}
