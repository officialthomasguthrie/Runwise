import { cn } from "@/lib/utils";
import React from "react";
import { BentoGridNew, BentoGridItem } from "@/components/ui/bento-grid-new";
import FadeContent from "@/components/ui/FadeContent";

import { AlignRight, AlignLeft, ArrowUpRight, Activity, Clipboard, Columns2, PenLine } from "lucide-react";
export default function BentoGridDemo() {
  return (
    <section className="bg-background py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8" suppressHydrationWarning={true}>
      <div className="mx-auto max-w-7xl">
        <FadeContent delay={200} duration={800}>
          <div className="text-center mb-12 sm:mb-16 lg:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tighter leading-tight text-foreground font-geist mb-4">
              Advanced AI Capabilities
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> for Every Workflow</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl 2xl:text-lg max-w-2xl lg:max-w-3xl font-medium text-muted-foreground font-geist mx-auto">
              Discover the powerful features that make Runwise the ultimate AI workflow platform
            </p>
          </div>
        </FadeContent>
        
        <FadeContent delay={400} duration={1000}>
          <BentoGridNew className="max-w-5xl lg:max-w-6xl mx-auto">
            {items.map((item, i) => (
              <BentoGridItem
                key={i}
                title={item.title}
                description={item.description}
                header={item.header}
                icon={item.icon}
                className={i === 3 || i === 6 ? "md:col-span-2" : ""}
              />
            ))}
          </BentoGridNew>
        </FadeContent>
      </div>
    </section>
  );
}

const Skeleton = () => (
  <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-gray-700 to-gray-800"></div>
);

const items = [
  {
    title: "Natural Language Processing",
    description: "Transform complex instructions into executable workflows using advanced NLP.",
    header: <Skeleton />,
    icon: <Clipboard className="h-4 w-4 text-purple-400" />,
  },
  {
    title: "Intelligent Automation",
    description: "AI-powered workflow generation that adapts to your specific needs and context.",
    header: <Skeleton />,
    icon: <Activity className="h-4 w-4 text-purple-400" />,
  },
  {
    title: "Smart Integration",
    description: "Seamlessly connect with 100+ tools and services for comprehensive workflows.",
    header: <Skeleton />,
    icon: <PenLine className="h-4 w-4 text-purple-400" />,
  },
  {
    title: "Real-Time Execution",
    description: "Watch your workflows come to life with live progress tracking and instant feedback.",
    header: <Skeleton />,
    icon: <Columns2 className="h-4 w-4 text-purple-400" />,
  },
  {
    title: "Advanced Analytics",
    description: "Gain insights into workflow performance with detailed analytics and reporting.",
    header: <Skeleton />,
    icon: <ArrowUpRight className="h-4 w-4 text-purple-400" />,
  },
  {
    title: "Custom Templates",
    description: "Create and share reusable workflow templates for your team and organization.",
    header: <Skeleton />,
    icon: <AlignLeft className="h-4 w-4 text-purple-400" />,
  },
  {
    title: "Enterprise Security",
    description: "Bank-grade security with enterprise features for large-scale deployments.",
    header: <Skeleton />,
    icon: <AlignRight className="h-4 w-4 text-purple-400" />,
  },
];
