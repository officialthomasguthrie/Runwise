import Image from "next/image";

import { cn } from "@/lib/utils";

const BRANDFETCH_CLIENT = "1dxbfHSJFAPEGdCLU4o5B";

type OrbitBrand = {
  src: string;
  alt: string;
  logoSize?: number;
};

/* ── Inner ring brands (same as bento IntegrationOrbit) ── */
const INNER_BRANDS: OrbitBrand[] = [
  {
    src: `https://cdn.brandfetch.io/idJ_HhtG0Z/w/400/h/400/theme/dark/icon.jpeg?c=${BRANDFETCH_CLIENT}`,
    alt: "Slack",
  },
  {
    src: `https://cdn.brandfetch.io/idRt0LuzRf/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
    alt: "HubSpot",
  },
  {
    src: `https://cdn.brandfetch.io/id5o3EIREg/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
    alt: "Gmail",
    logoSize: 22,
  },
  {
    src: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idKa2XnbFY.svg?c=${BRANDFETCH_CLIENT}`,
    alt: "Google Sheets",
    logoSize: 22,
  },
  {
    src: `https://cdn.brandfetch.io/idPYUoikV7/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
    alt: "Notion",
    logoSize: 22,
  },
  {
    src: `https://cdn.brandfetch.io/idY3kwH_Nx/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
    alt: "Dropbox",
    logoSize: 34,
  },
];

/* ── Outer ring brands ── */
const OUTER_BRANDS: OrbitBrand[] = [
  {
    src: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idMX2_OMSc.svg?c=${BRANDFETCH_CLIENT}`,
    alt: "Google Calendar",
    logoSize: 24,
  },
  {
    src: `https://cdn.brandfetch.io/idxAg10C0L/w/480/h/480/theme/dark/icon.jpeg?c=${BRANDFETCH_CLIENT}`,
    alt: "Stripe",
    logoSize: 24,
  },
  {
    src: `https://cdn.brandfetch.io/idAgPm7IvG/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
    alt: "Shopify",
    logoSize: 24,
  },
  {
    src: `https://cdn.brandfetch.io/idM8Hlme1a/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
    alt: "Discord",
    logoSize: 24,
  },
  {
    src: `https://cdn.brandfetch.io/idS5WhqBbM/theme/dark/logo.svg?c=${BRANDFETCH_CLIENT}`,
    alt: "X",
    logoSize: 18,
  },
  {
    src: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idncaAgFGT.svg?c=${BRANDFETCH_CLIENT}`,
    alt: "Google Drive",
    logoSize: 24,
  },
  {
    src: `https://cdn.brandfetch.io/id68S6e-Gp/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
    alt: "Telegram",
    logoSize: 22,
  },
  {
    src: `https://cdn.brandfetch.io/idY3kwH_Nx/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
    alt: "Dropbox",
    logoSize: 36,
  },
];

const BADGE_PX = 42;
const LOGO_PX = 28;

const OUTER_SIZE_PX = 330;
const INNER_SIZE_PX = 180;
const OUTER_TRACK_INSET = 3;
const INNER_TRACK_INSET = 3;
const OUTER_RADIUS = OUTER_SIZE_PX / 2 - OUTER_TRACK_INSET;
const INNER_RADIUS = INNER_SIZE_PX / 2 - INNER_TRACK_INSET;

/** Dotted ring: same visual as Landing Page `text-black/22` + currentColor */
const ORBIT_RING_STROKE = "rgba(0, 0, 0, 0.22)";

const GLASS_ORBIT_BADGE =
  "relative isolate overflow-hidden rounded-full border border-white/75 bg-white/[0.94] shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.05)] ring-1 ring-white/55 backdrop-blur-md backdrop-saturate-125 before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-full before:content-[''] before:bg-[linear-gradient(145deg,rgba(255,255,255,0.55)_0%,transparent_48%,rgba(255,255,255,0.15)_100%)] before:opacity-90";

function OrbitRing({
  variant,
  size,
  radius,
  brands,
}: {
  variant: "inner" | "outer";
  size: number;
  radius: number;
  brands: OrbitBrand[];
}) {
  const n = brands.length;
  return (
    /* Centering wrapper — translate only, no animation */
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
    >
      {/* Spinning container — class names must be literals so Tailwind keeps @layer rules in globals.css */}
      <div
        className={
          variant === "outer"
            ? "integration-orbit-outer-spin"
            : "integration-orbit-spin"
        }
        style={{ width: size, height: size, transformOrigin: "50% 50%" }}
      >
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ORBIT_RING_STROKE}
            strokeWidth="1.25"
            strokeDasharray="4 6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {brands.map((brand, i) => {
          const deg = (360 / n) * i;
          const logoPx = brand.logoSize ?? LOGO_PX;
          return (
            <div
              key={brand.alt}
              className="absolute left-1/2 top-1/2 z-10 flex items-center justify-center"
              style={{
                transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-${radius}px) rotate(-${deg}deg)`,
              }}
            >
              <div
                className={cn(
                  variant === "outer"
                    ? "integration-orbit-outer-counter"
                    : "integration-orbit-counter",
                  GLASS_ORBIT_BADGE,
                  "z-10 flex shrink-0 items-center justify-center",
                )}
                style={{
                  transformOrigin: "50% 50%",
                  width: BADGE_PX,
                  height: BADGE_PX,
                }}
              >
                <span className="relative z-[1] flex shrink-0 items-center justify-center [transform-origin:center]">
                  <Image
                    src={brand.src}
                    alt=""
                    width={logoPx}
                    height={logoPx}
                    className="object-contain"
                    style={{ width: logoPx, height: logoPx, maxWidth: logoPx, maxHeight: logoPx }}
                    unoptimized
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ConnectToolsOrbit() {
  return (
    <div
      className="pointer-events-none relative mx-auto shrink-0 select-none"
      style={{ width: OUTER_SIZE_PX, height: OUTER_SIZE_PX }}
    >
      {/* Outer ring — spins reverse, slower */}
      <OrbitRing
        variant="outer"
        size={OUTER_SIZE_PX}
        radius={OUTER_RADIUS}
        brands={OUTER_BRANDS}
      />

      {/* Inner ring */}
      <OrbitRing
        variant="inner"
        size={INNER_SIZE_PX}
        radius={INNER_RADIUS}
        brands={INNER_BRANDS}
      />

      {/* Center Runwise icon */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
        <Image
          src="/runwise-icon.png"
          alt="Runwise"
          width={36}
          height={36}
          className="h-9 w-9 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
        />
      </div>
    </div>
  );
}
