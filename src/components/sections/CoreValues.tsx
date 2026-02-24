"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { 
  Zap,
  Heart,
  Brain,
  Shield,
  Eye,
  Users,
} from "lucide-react"
import FadeContent from "@/components/ui/FadeContent"

interface CoreValuesProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const CoreValues = React.forwardRef<HTMLDivElement, CoreValuesProps>(
  ({ className, ...props }, ref) => {
    const values = [
      {
        icon: Zap,
        title: "Simplicity",
        description: "Complex things made easy.",
        color: "from-purple-400 to-purple-600",
        bgColor: "from-card to-card/80 dark:from-card dark:to-card/80",
        iconColor: "text-purple-600 dark:text-purple-400"
      },
      {
        icon: Users,
        title: "Empowerment",
        description: "Give people tools that save time and amplify focus.",
        color: "from-pink-400 to-pink-600",
        bgColor: "from-card to-card/80 dark:from-card dark:to-card/80",
        iconColor: "text-pink-600 dark:text-pink-400"
      },
      {
        icon: Brain,
        title: "Intelligence",
        description: "Every interaction should feel smart and intuitive.",
        color: "from-purple-400 to-pink-400",
        bgColor: "from-card to-card/80 dark:from-card dark:to-card/80",
        iconColor: "text-purple-600 dark:text-purple-400"
      },
      {
        icon: Shield,
        title: "Accessibility",
        description: "Automation for everyone, not just engineers.",
        color: "from-pink-400 to-purple-400",
        bgColor: "from-card to-card/80 dark:from-card dark:to-card/80",
        iconColor: "text-pink-600 dark:text-pink-400"
      },
      {
        icon: Eye,
        title: "Transparency",
        description: "Clear, ethical AI that users can trust.",
        color: "from-purple-500 to-pink-500",
        bgColor: "from-card to-card/80 dark:from-card dark:to-card/80",
        iconColor: "text-purple-600 dark:text-purple-400"
      }
    ]

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
                  Core Values
                </h2>
                <p className="text-lg text-muted-foreground font-geist max-w-2xl mx-auto">
                  The principles that guide everything we do at Runwise
                </p>
                <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto rounded-full mt-6"></div>
              </div>
            </FadeContent>

            {/* Values List */}
            <FadeContent delay={200} duration={1000}>
              <div className="space-y-6 max-w-4xl mx-auto">
              {values.map((value, index) => {
                const IconComponent = value.icon
                return (
                  <div
                    key={value.title}
                    className="group relative"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Value Item */}
                    <div className={cn(
                      "relative bg-gradient-to-br rounded-2xl p-6 border border-border/50",
                      "hover:border-border hover:shadow-lg transition-all duration-300",
                      "hover:scale-[1.02] hover:-translate-y-1",
                      value.bgColor
                    )}>
                      {/* Background Pattern */}
                      <div className="absolute inset-0 opacity-5 rounded-2xl overflow-hidden">
                        <div className={cn(
                          "absolute inset-0 bg-gradient-to-br",
                          value.color
                        )}></div>
                      </div>

                      {/* Content */}
                      <div className="relative z-10 flex items-start gap-6">
                        {/* Icon */}
                        <div className={cn(
                          "w-16 h-16 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0",
                          "group-hover:scale-110 transition-transform duration-300",
                          "from-muted to-muted/80 dark:from-muted dark:to-muted/80"
                        )}>
                          <IconComponent className={cn("w-8 h-8", value.iconColor)} />
                        </div>

                        {/* Text Content */}
                        <div className="flex-1">
                          {/* Title */}
                          <h3 className="text-2xl font-semibold text-foreground font-geist mb-3">
                            {value.title}
                          </h3>

                          {/* Description */}
                          <p className="text-lg text-muted-foreground font-geist leading-relaxed">
                            {value.description}
                          </p>
                        </div>
                      </div>

                      {/* Hover Effect */}
                      <div className={cn(
                        "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300",
                        "bg-gradient-to-br",
                        value.color
                      )}></div>
                    </div>

                    {/* Floating Accent */}
                    <div className={cn(
                      "absolute -top-2 -right-2 w-4 h-4 rounded-full opacity-0 group-hover:opacity-60 transition-all duration-300",
                      "bg-gradient-to-r animate-pulse",
                      value.color
                    )}></div>
                  </div>
                )
              })}
              </div>
            </FadeContent>

            {/* Bottom Quote */}
            <FadeContent delay={300} duration={1000}>
              <div className="mt-16 text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-2xl blur-xl"></div>
                <div className="relative bg-gradient-to-br from-muted/50 to-muted/30 dark:from-muted/20 dark:to-muted/10 rounded-2xl p-8 border border-border/50">
                  <div className="flex items-center justify-center mb-4">
                    <Heart className="w-6 h-6 text-pink-500 mr-2" />
                    <Zap className="w-5 h-5 text-purple-500 mr-2" />
                    <Heart className="w-5 h-5 text-green-500" />
                  </div>
                  <blockquote className="text-lg font-medium text-foreground font-geist italic mb-2">
                    "These values aren't just words on a wall—they're the foundation of every decision we make."
                  </blockquote>
                  <p className="text-sm text-muted-foreground font-geist">
                    — The Runwise Team
                  </p>
                </div>
              </div>
            </div>
            </FadeContent>
          </div>
        </div>
      </section>
    )
  },
)
CoreValues.displayName = "CoreValues"

export default CoreValues
