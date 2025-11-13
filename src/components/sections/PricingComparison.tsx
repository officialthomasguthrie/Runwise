"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, X } from "lucide-react"
import FadeContent from "@/components/ui/FadeContent"

interface PricingComparisonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const PricingComparison = React.forwardRef<HTMLDivElement, PricingComparisonProps>(
  ({ className, ...props }, ref) => {
    const features = [
      {
        category: "Workflows",
        items: [
          { name: "Number of workflows", free: "Up to 10", professional: "Unlimited", enterprise: "Unlimited" },
          { name: "Workflow complexity", free: "Basic", professional: "Advanced", enterprise: "Enterprise" },
          { name: "Custom templates", free: "No", professional: "Yes", enterprise: "Yes" },
        ]
      },
      {
        category: "Integrations",
        items: [
          { name: "Available integrations", free: "10+", professional: "100+", enterprise: "100+" },
          { name: "Custom integrations", free: "No", professional: "Limited", enterprise: "Full support" },
          { name: "API access", free: "No", professional: "Basic", enterprise: "Full" },
        ]
      },
      {
        category: "Support & Security",
        items: [
          { name: "Support level", free: "Community", professional: "Priority", enterprise: "Dedicated" },
          { name: "Response time", free: "Community", professional: "< 24 hours", enterprise: "< 4 hours" },
          { name: "SLA guarantee", free: "No", professional: "No", enterprise: "99.9%" },
          { name: "Data encryption", free: "Basic", professional: "Advanced", enterprise: "Enterprise" },
        ]
      },
      {
        category: "Analytics & Monitoring",
        items: [
          { name: "Basic analytics", free: "Yes", professional: "Yes", enterprise: "Yes" },
          { name: "Advanced analytics", free: "No", professional: "Yes", enterprise: "Yes" },
          { name: "Real-time monitoring", free: "No", professional: "Yes", enterprise: "Yes" },
          { name: "Custom dashboards", free: "No", professional: "No", enterprise: "Yes" },
        ]
      }
    ]

    return (
      <section
        ref={ref}
        className={cn("w-full bg-background py-8 sm:py-12", className)}
        {...props}
        suppressHydrationWarning={true}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            {/* Section Header */}
            <FadeContent delay={100} duration={800}>
              <div className="text-center mb-16">
                <h2 className="text-3xl font-semibold leading-tight sm:text-4xl sm:leading-tight text-foreground font-geist mb-4">
                  Compare Plans
                </h2>
                <p className="text-lg text-muted-foreground font-geist max-w-2xl mx-auto">
                  See exactly what's included in each plan to make the right choice for your needs
                </p>
                <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto rounded-full mt-6"></div>
              </div>
            </FadeContent>

            {/* Comparison Table */}
            <FadeContent delay={200} duration={1000}>
              <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Header Row */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-foreground font-geist">Features</h3>
                  </div>
                  <div className="text-center">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-semibold text-foreground font-geist">Free</h4>
                      <p className="text-sm text-muted-foreground font-geist">$0/month</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-semibold text-foreground font-geist">Professional</h4>
                      <p className="text-sm text-muted-foreground font-geist">$29/month</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-semibold text-foreground font-geist">Enterprise</h4>
                      <p className="text-sm text-muted-foreground font-geist">Custom</p>
                    </div>
                  </div>
                </div>

                {/* Feature Categories */}
                {features.map((category, categoryIndex) => (
                  <div key={category.category} className="mb-8">
                    <h4 className="text-lg font-semibold text-foreground font-geist mb-4 pb-2 border-b border-border">
                      {category.category}
                    </h4>
                    
                    {category.items.map((item, itemIndex) => (
                      <div key={item.name} className="grid grid-cols-4 gap-4 py-3 border-b border-border/50">
                        <div className="text-sm text-muted-foreground font-geist">
                          {item.name}
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-foreground font-geist">{item.free}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-foreground font-geist">{item.professional}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-foreground font-geist">{item.enterprise}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            </FadeContent>

            {/* Bottom CTA */}
            <FadeContent delay={300} duration={1000}>
              <div className="text-center mt-12">
              <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl p-8 border border-border/50">
                <h3 className="text-xl font-semibold text-foreground font-geist mb-4">
                  Still not sure which plan is right for you?
                </h3>
                <p className="text-muted-foreground font-geist mb-6">
                  Our team is here to help you choose the perfect plan for your workflow needs.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="#contact"
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-geist"
                  >
                    Contact Sales
                  </a>
                  <a
                    href="#demo"
                    className="inline-flex items-center justify-center px-6 py-3 border border-border text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors font-geist"
                  >
                    Schedule Demo
                  </a>
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
PricingComparison.displayName = "PricingComparison"

export default PricingComparison
