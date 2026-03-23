"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

const GA_MEASUREMENT_ID = "G-CG1RZ7ESM1";

/**
 * GA4 often only sends the initial `page_view` for the first load.
 * This calls `gtag('config', ...)` on subsequent client-side navigations.
 */
export function GoogleAnalyticsRouteTracker() {
  const pathname = usePathname();
  const hasSkippedInitialRef = useRef(false);

  useEffect(() => {
    if (!window.gtag) return;

    // The inline GA snippet already calls `gtag('config', ...)` once on first page load.
    // Skip the first effect run to avoid double-counting the initial view.
    if (!hasSkippedInitialRef.current) {
      hasSkippedInitialRef.current = true;
      return;
    }

    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: pathname,
      page_location: window.location.href,
    });
  }, [pathname]);

  return null;
}

