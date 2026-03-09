"use client";

/**
 * Lightweight OAuth return page.
 * Used as return_url when connecting integrations via popup.
 * When loaded in a popup (window.opener exists), notifies opener and closes.
 */
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function OAuthReturnContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const service = searchParams.get("service");
    const error = searchParams.get("error");

    if (window.opener) {
      if (error) {
        window.opener.postMessage(
          { type: "integration-connection-cancelled", service: service ?? undefined },
          window.location.origin
        );
      } else if (service) {
        window.opener.postMessage(
          { type: "integration-connected", service },
          window.location.origin
        );
      }
      window.close();
    } else {
      // Opener closed or not in popup — redirect to integrations
      window.location.href = "/settings?tab=integrations";
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Completing connection…</p>
    </div>
  );
}

export default function OAuthReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    }>
      <OAuthReturnContent />
    </Suspense>
  );
}
