"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      // Heavier, low-gravity feel:
      // lerp controls inertia — lower = more lag/float (0.05–0.1 = dreamy)
      lerp: 0.12,
      // How much the wheel moves per tick
      wheelMultiplier: 1.0,
      // Touch devices
      touchMultiplier: 1.2,
      // Smooth even when using keyboard arrow keys
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
