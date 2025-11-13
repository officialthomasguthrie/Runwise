"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Brain, Zap, ArrowRight, Cpu, Network, Sparkles } from "lucide-react"
import FadeContent from "@/components/ui/FadeContent"

interface WhatWeAreBuildingProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const WhatWeAreBuilding = React.forwardRef<HTMLDivElement, WhatWeAreBuildingProps>(
  ({ className, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn("w-full bg-background py-16 sm:py-20", className)}
        {...props}
        suppressHydrationWarning={true}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            {/* Section Header */}
            <FadeContent delay={100} duration={800}>
              <div className="text-center mb-16">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tighter leading-tight text-foreground font-geist mb-4">
                  What We're Building
                </h2>
                <p className="text-lg text-muted-foreground font-geist max-w-2xl mx-auto">
                  Clarifying what makes Runwise unique and visionary in the world of automation
                </p>
                <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto rounded-full mt-6"></div>
              </div>
            </FadeContent>

            {/* Main Content */}
            <div className="space-y-12">
              {/* Vision Points */}
              <FadeContent delay={200} duration={1000}>
                <div className="space-y-8 max-w-4xl mx-auto">
                {/* Vision Point 1 */}
                <div className="group">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold text-foreground font-geist mb-3">
                        AI that understands intent
                      </h3>
                      <p className="text-lg text-muted-foreground font-geist leading-relaxed">
                        Our AI doesn't just follow commands—it understands what you're trying to achieve and builds workflows automatically, adapting to your specific needs and context.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vision Point 2 */}
                <div className="group">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Network className="w-8 h-8 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold text-foreground font-geist mb-3">
                        Self-improving processes
                      </h3>
                      <p className="text-lg text-muted-foreground font-geist leading-relaxed">
                        A platform where processes learn, improve, and optimize themselves over time. Every workflow gets smarter with each execution.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vision Point 3 */}
                <div className="group">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold text-foreground font-geist mb-3">
                        Bridge between creativity and execution
                      </h3>
                      <p className="text-lg text-muted-foreground font-geist leading-relaxed">
                        A seamless bridge between human creativity and digital execution, turning your wildest ideas into reality with the power of AI.
                      </p>
                    </div>
                  </div>
                </div>
                </div>
              </FadeContent>
            </div>
          </div>
        </div>
      </section>
    )
  },
)
WhatWeAreBuilding.displayName = "WhatWeAreBuilding"

export default WhatWeAreBuilding
