"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { PricingCard, type PricingTier } from "@/components/ui/pricing-card";
import { Tab } from "@/components/ui/pricing-tab";

interface PricingSectionProps {
  title: string;
  subtitle: string;
  tiers: PricingTier[];
  frequencies: string[];
  headerClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export function PricingSection({
  title,
  subtitle,
  tiers,
  frequencies,
  headerClassName,
  titleClassName,
  subtitleClassName,
}: PricingSectionProps) {
  const [selectedFrequency, setSelectedFrequency] = React.useState(
    frequencies[0]
  );

  return (
    <section className="flex flex-col items-center gap-10 py-6">
      <div
        className={cn(
          "space-y-7 text-center max-w-4xl mx-auto",
          headerClassName
        )}
      >
        <div className="space-y-4">
          <h1
            className={cn(
              "text-4xl font-medium md:text-5xl",
              titleClassName
            )}
          >
            {title}
          </h1>
          <p className={cn("text-muted-foreground", subtitleClassName)}>
            {subtitle}
          </p>
        </div>
        {frequencies.length > 1 && (
          <div className="mx-auto flex w-fit rounded-full bg-muted p-1">
            {frequencies.map((freq) => (
              <Tab
                key={freq}
                text={freq}
                selected={selectedFrequency === freq}
                setSelected={setSelectedFrequency}
                discount={freq.toLowerCase() === "yearly"}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid w-full max-w-6xl gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier) => (
          <PricingCard
            key={tier.id ?? tier.name}
            tier={tier}
            paymentFrequency={selectedFrequency}
          />
        ))}
      </div>
    </section>
  );
}


