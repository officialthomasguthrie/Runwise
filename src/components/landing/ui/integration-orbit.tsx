import Image from "next/image";

/** Same Brandfetch client + URLs as Runwise `agent-tab-content.tsx` integration logos */
const BRANDFETCH_CLIENT = "1dxbfHSJFAPEGdCLU4o5B";

type OrbitBrand = {
  src: string;
  alt: string;
  /** Logo box inside the fixed badge; omit to use `LOGO_PX` */
  logoSize?: number;
};

const ORBIT_BRANDS: OrbitBrand[] = [
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

const BADGE_PX = 38;
const LOGO_PX = 26;

const SIZE_PX = 152;
/** Match SVG circle radius so icon centers sit on the stroke */
const TRACK_INSET = 3;
const RADIUS_PX = SIZE_PX / 2 - TRACK_INSET;

/** Dotted ring: same visual as Landing Page `text-black/22` + currentColor (explicit rgba avoids TW v3/v4 + inherit differences). */
const ORBIT_RING_STROKE = "rgba(0, 0, 0, 0.22)";

/** Strong liquid glass — circular integration badges (opaque fill hides dotted orbit behind) */
const GLASS_ORBIT_BADGE =
  "relative isolate overflow-hidden rounded-full border border-white/75 bg-white/[0.94] shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.05)] ring-1 ring-white/55 backdrop-blur-md backdrop-saturate-125 before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-full before:content-[''] before:bg-[linear-gradient(145deg,rgba(255,255,255,0.55)_0%,transparent_48%,rgba(255,255,255,0.15)_100%)] before:opacity-90";

export function IntegrationOrbit() {
  const n = ORBIT_BRANDS.length;

  return (
    <div
      className="relative mx-auto shrink-0"
      style={{ width: SIZE_PX, height: SIZE_PX }}
    >
      <div
        className="integration-orbit-spin absolute inset-0"
        style={{ transformOrigin: "50% 50%" }}
      >
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          viewBox={`0 0 ${SIZE_PX} ${SIZE_PX}`}
          aria-hidden
        >
          <circle
            cx={SIZE_PX / 2}
            cy={SIZE_PX / 2}
            r={RADIUS_PX}
            fill="none"
            stroke={ORBIT_RING_STROKE}
            strokeWidth="1.25"
            strokeDasharray="4 6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {ORBIT_BRANDS.map((brand, i) => {
          const deg = (360 / n) * i;
          const logoPx = brand.logoSize ?? LOGO_PX;
          return (
            <div
              key={brand.alt}
              className="absolute left-1/2 top-1/2 z-10 flex items-center justify-center"
              style={{
                transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-${RADIUS_PX}px) rotate(-${deg}deg)`,
              }}
            >
              <div
                className={`integration-orbit-counter ${GLASS_ORBIT_BADGE} z-10 flex shrink-0 items-center justify-center`}
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

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
        <Image
          src="/runwise-icon.png"
          alt="Runwise"
          width={36}
          height={36}
          className="h-8 w-8 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
        />
      </div>
    </div>
  );
}
