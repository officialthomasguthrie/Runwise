"use client"

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import * as React from "react"
import { cn } from "@/lib/utils"
import FadeContent from "@/components/ui/FadeContent"

interface FeaturesHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: {
    regular: string
    gradient: string
  }
  description?: string
}

const FeaturesHero = React.forwardRef<HTMLDivElement, FeaturesHeroProps>(
  (
    {
      className,
      title = "Features",
      subtitle = {
        regular: "Powerful AI capabilities for ",
        gradient: "every workflow.",
      },
      description = "Discover the comprehensive suite of features that make Runwise the ultimate AI workflow platform. From natural language processing to seamless integrations, we've built everything you need to automate your work.",
      ...props
    },
    ref,
  ) => {
    return (
      <div className={cn("relative bg-background", className)} ref={ref} {...props}>
        <section className="relative max-w-full mx-auto z-1">
          <div className="max-w-screen-xl z-10 mx-auto px-4 py-16 gap-12 md:px-8">
            <div className="space-y-5 max-w-4xl leading-0 lg:leading-5 mx-auto text-center">
              <FadeContent delay={100} duration={800}>
                <h1 className="text-sm text-muted-foreground group font-geist mx-auto px-5 py-2 bg-gradient-to-tr from-muted/20 via-muted-foreground/20 to-transparent border-[2px] border-border rounded-3xl w-fit">
                  {title}
                  <HugeiconsIcon icon={ArrowRight01Icon} className="inline w-4 h-4 ml-2 group-hover:translate-x-1 duration-300" />
                </h1>
              </FadeContent>
              <FadeContent delay={200} duration={1000}>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl tracking-tighter leading-tight font-geist text-foreground mx-auto">
                  {subtitle.regular}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    {subtitle.gradient}
                  </span>
                </h2>
              </FadeContent>
              <FadeContent delay={300} duration={800}>
                <p className="max-w-3xl mx-auto text-lg text-muted-foreground font-geist leading-relaxed">
                  {description}
                </p>
              </FadeContent>
            </div>
          </div>
        </section>
      </div>
    )
  },
)
FeaturesHero.displayName = "FeaturesHero"

export default FeaturesHero
