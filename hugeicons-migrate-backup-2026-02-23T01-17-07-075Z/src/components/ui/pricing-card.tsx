"use client";

import * as React from "react";
import NumberFlow from "@number-flow/react";
import { ArrowRight, BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface PricingTier {
  id?: string;
  name: string;
  price: Record<string, number | string>;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  popular?: boolean;
  ctaSlot?: React.ReactNode;
  ctaButtonProps?: ButtonProps;
}

interface PricingCardProps {
  tier: PricingTier;
  paymentFrequency: string;
}

export function PricingCard({ tier, paymentFrequency }: PricingCardProps) {
  const price = tier.price[paymentFrequency];
  const isHighlighted = tier.highlighted;
  const isPopular = tier.popular;

  const defaultButton = (
    <Button
      variant={isHighlighted ? "secondary" : "default"}
      className="w-full"
      {...tier.ctaButtonProps}
    >
      {tier.cta}
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <Card
      className={cn(
        "relative flex flex-col gap-8 overflow-hidden p-6 min-h-[28rem]",
        isHighlighted
          ? "bg-white text-black dark:bg-black dark:text-white border border-black/10 dark:border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.12)] dark:shadow-[0_0_40px_rgba(0,0,0,0.45)]"
          : "bg-background text-foreground",
        isPopular && "ring-2 ring-primary"
      )}
    >
      {isHighlighted && <HighlightedBackground />}
      {isPopular && <PopularBackground />}

      <h2 className="flex items-center gap-3 text-xl font-medium capitalize">
        {tier.name}
      </h2>

      <div className="relative h-12 -mt-1 mb-1">
        {typeof price === "number" ? (
          <>
            <NumberFlow
              format={{
                style: "currency",
                currency: "USD",
                trailingZeroDisplay: "stripIfInteger",
              }}
              value={price}
              className="text-4xl font-medium"
            />
            <p className="-mt-2 text-xs text-muted-foreground">Per month/user</p>
          </>
        ) : (
          <h1 className="text-4xl font-medium">{price}</h1>
        )}
      </div>

      <div className="flex-1 space-y-2">
        <h3 className="text-sm font-medium">{tier.description}</h3>
        <ul className="space-y-3">
          {tier.features.map((feature, index) => (
            <li
              key={index}
              className={cn(
                "flex items-center gap-2 text-sm font-medium",
                isHighlighted
                  ? "text-black/70 dark:text-white/80"
                  : "text-muted-foreground"
              )}
            >
              <BadgeCheck className="h-4 w-4" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10">
        {tier.ctaSlot ? tier.ctaSlot : defaultButton}
      </div>
    </Card>
  );
}

const HighlightedBackground = () => (
  <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:45px_45px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
);

const PopularBackground = () => (
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
);


