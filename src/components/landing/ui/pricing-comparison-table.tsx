import Image from "next/image";

type Cell = boolean;

const rows: { label: string; personal: Cell; professional: Cell; enterprise: Cell }[] = [
  {
    label: "AI workflow builder & generation",
    personal: true,
    professional: true,
    enterprise: true,
  },
  {
    label: "Priority support",
    personal: false,
    professional: true,
    enterprise: true,
  },
  {
    label: "Expert consultations",
    personal: false,
    professional: true,
    enterprise: true,
  },
  {
    label: "Dedicated infrastructure",
    personal: false,
    professional: false,
    enterprise: true,
  },
  {
    label: "SLAs & compliance options",
    personal: false,
    professional: false,
    enterprise: true,
  },
  {
    label: "Team collaboration features",
    personal: false,
    professional: false,
    enterprise: true,
  },
  {
    label: "Custom usage limits & scale",
    personal: false,
    professional: false,
    enterprise: true,
  },
];

function Tick() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center bg-black/[0.05]">
      <Image
        src="/assets/icons/tikmark.svg"
        alt=""
        width={14}
        height={14}
        className="h-[14px] w-[14px] object-contain brightness-0 opacity-65"
      />
    </span>
  );
}

function Cross() {
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center text-[#1a1a1a]/18"
      aria-hidden
    >
      <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" aria-hidden>
        <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
      </svg>
    </span>
  );
}

function BoolCell({ included }: { included: boolean }) {
  return (
    <td
      className="px-2 py-3 text-center align-middle"
      aria-label={included ? "Included" : "Not included"}
    >
      <div className="flex justify-center">{included ? <Tick /> : <Cross />}</div>
    </td>
  );
}

const shell =
  "border border-white/60 bg-white/35 ring-1 ring-black/[0.04] backdrop-blur-xl backdrop-saturate-150";

export function PricingComparisonTable() {
  return (
    <div className={`w-full ${shell}`}>
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <caption className="sr-only">
            Feature comparison across Personal, Professional, and Enterprise plans
          </caption>
          <thead>
            <tr className="border-b border-black/[0.06] bg-black/[0.025]">
              <th
                scope="col"
                className="px-4 py-3 text-[11px] font-medium tracking-wide text-[#1a1a1a]/45 sm:px-5 sm:text-xs"
              >
                Feature
              </th>
              <th
                scope="col"
                className="px-2 py-3 text-center text-[11px] font-medium tracking-wide text-[#1a1a1a]/70 sm:text-xs"
              >
                Personal
              </th>
              <th
                scope="col"
                className="px-2 py-3 text-center text-[11px] font-medium tracking-wide text-[#1a1a1a]/70 sm:text-xs"
              >
                Professional
              </th>
              <th
                scope="col"
                className="px-2 py-3 text-center text-[11px] font-medium tracking-wide text-[#1a1a1a]/70 sm:px-4 sm:text-xs"
              >
                Enterprises
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-black/[0.05] last:border-b-0 [&:nth-child(even)]:bg-black/[0.015]"
              >
                <th
                  scope="row"
                  className="max-w-[200px] px-4 py-3 text-[13px] font-normal leading-snug text-[#1a1a1a]/85 sm:max-w-none sm:px-5 sm:text-[14px]"
                >
                  {row.label}
                </th>
                <BoolCell included={row.personal} />
                <BoolCell included={row.professional} />
                <BoolCell included={row.enterprise} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
