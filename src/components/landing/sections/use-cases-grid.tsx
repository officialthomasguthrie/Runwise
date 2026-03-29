const cardShell =
  "flex flex-col rounded-[22px] border border-white/60 bg-white/35 p-5 shadow-[0_4px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150 sm:p-6 md:p-7";

const cases = [
  {
    title: "Sales & CRM",
    body: "Qualify leads, update records, and trigger follow-ups across your CRM—so reps spend time selling, not copying data between tools.",
  },
  {
    title: "Customer support",
    body: "Route tickets, draft first-pass replies, and escalate with context. Keep SLAs visible and customers moving without manual triage.",
  },
  {
    title: "Marketing operations",
    body: "Connect campaigns to your stack: sync audiences, notify Slack, and hand warm leads to sales the moment they engage.",
  },
  {
    title: "Finance & admin",
    body: "Chase approvals, reconcile updates across spreadsheets and accounting tools, and nudge owners before deadlines slip.",
  },
  {
    title: "HR & people",
    body: "Onboarding checklists, interview scheduling, and internal announcements—repeatable flows your team can trust every week.",
  },
  {
    title: "Product & engineering",
    body: "Triage feedback, open issues, and post status updates from one described outcome—less context switching, clearer ownership.",
  },
] as const;

export function UseCasesGrid() {
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
      {cases.map((item) => (
        <article key={item.title} className={cardShell}>
          <h3 className="text-left font-sans text-sm font-medium leading-snug tracking-tight text-[#1a1a1a] sm:text-base">
            {item.title}
          </h3>
          <p className="mt-2 max-w-prose text-left text-[12px] leading-relaxed text-[#1a1a1a]/55 sm:mt-3 sm:text-[13px]">
            {item.body}
          </p>
        </article>
      ))}
    </div>
  );
}
