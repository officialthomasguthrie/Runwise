"use client";

import { cn } from "@/lib/utils";
import { Layers, Search, Zap } from "lucide-react";
import type React from "react";

// The main props for the HowItWorks component
interface HowItWorksProps extends React.HTMLAttributes<HTMLElement> {}

// The props for a single step card
interface StepCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
}

/**
 * A single step card within the "How It Works" section.
 * It displays an icon, title, description, and a list of benefits.
 */
const StepCard: React.FC<StepCardProps> = ({
  icon,
  title,
  description,
  benefits,
}) => (
  <div
    className={cn(
      "relative rounded-2xl border border-border bg-card p-4 sm:p-6 text-card-foreground transition-all duration-300 ease-in-out",
      "hover:scale-105 hover:shadow-lg hover:border-pink-400 hover:bg-accent"
    )}
    suppressHydrationWarning={true}
  >
    {/* Icon */}
    <div className="mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-gradient-to-br from-pink-400 to-purple-400 text-white">
      {icon}
    </div>
    {/* Title and Description */}
    <h3 className="mb-2 text-lg sm:text-xl font-semibold font-geist text-card-foreground">{title}</h3>
    <p className="mb-6 text-sm sm:text-base text-muted-foreground font-geist">{description}</p>
    {/* Benefits List */}
    <ul className="space-y-3">
      {benefits.map((benefit, index) => (
        <li key={index} className="flex items-center gap-3">
          <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400/20 to-purple-400/20">
            <div className="h-2 w-2 rounded-full bg-gradient-to-br from-pink-400 to-purple-400"></div>
          </div>
          <span className="text-muted-foreground font-geist">{benefit}</span>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * A responsive "How It Works" section that displays a 3-step process.
 * Customized for Runwise AI platform with dark mode styling.
 */
export const HowItWorks: React.FC<HowItWorksProps> = ({
  className,
  ...props
}) => {
  const stepsData = [
    {
      icon: <Search className="h-6 w-6" />,
      title: "Describe Your Workflow",
      description:
        "Simply tell Runwise what you want to accomplish using natural language. Our AI understands context and intent.",
      benefits: [
        "Natural language processing for any complexity",
        "Context-aware understanding",
        "Support for multiple languages",
      ],
    },
    {
      icon: <Layers className="h-6 w-6" />,
      title: "AI Generates Your Workflow",
      description:
        "Our advanced AI analyzes your request and creates a fully functional workflow with all necessary integrations.",
      benefits: [
        "Automatic tool and service integration",
        "Error handling and validation",
        "Optimized workflow structure",
      ],
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Execute & Monitor",
      description:
        "Deploy your workflow instantly and monitor its execution in real-time with detailed analytics and insights.",
      benefits: [
        "Real-time execution monitoring",
        "Performance analytics and insights",
        "Automatic scaling and optimization",
      ],
    },
  ];

  return (
    <section
      id="how-it-works"
      className={cn("w-full bg-background py-12 sm:py-16 lg:py-20", className)}
      {...props}
      suppressHydrationWarning={true}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-12 sm:mb-16 lg:mb-20 max-w-4xl text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tighter leading-tight text-foreground font-geist">
            How it works
          </h2>
          <p className="mt-4 text-base sm:text-lg lg:text-xl 2xl:text-lg text-muted-foreground font-geist">
            Transform your ideas into functional workflows in three simple steps with Runwise AI
          </p>
        </div>

        {/* Step Indicators with Connecting Line */}
        <div className="relative mx-auto mb-8 w-full max-w-4xl">
          <div
            aria-hidden="true"
            className="absolute left-[16.6667%] top-1/2 h-0.5 w-[66.6667%] -translate-y-1/2 bg-gray-600"
          ></div>
          {/* Use grid to align numbers with the card grid below */}
          <div className="relative grid grid-cols-3">
            {stepsData.map((_, index) => (
              <div
                key={index}
                // Center the number within its grid column
                className="flex h-10 w-10 items-center justify-center justify-self-center rounded-full bg-card font-semibold text-card-foreground ring-4 ring-background text-lg"
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Steps Grid */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {stepsData.map((step, index) => (
            <StepCard
              key={index}
              icon={step.icon}
              title={step.title}
              description={step.description}
              benefits={step.benefits}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
