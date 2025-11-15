"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import FadeContent from "@/components/ui/FadeContent"

interface PricingComparisonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const PricingComparison = React.forwardRef<HTMLDivElement, PricingComparisonProps>(
  ({ className, ...props }, ref) => {
    const planColumns = [
      {
        id: "personal",
        name: "Personal",
        price: "$9 / month",
        caption: "Solo builders",
      },
      {
        id: "professional",
        name: "Professional",
        price: "$29 / month",
        caption: "Growing teams",
      },
      {
        id: "advanced",
        name: "Advanced",
        price: "$99 / month",
        caption: "Ops-heavy orgs",
      },
      {
        id: "custom",
        name: "Custom",
        price: "Contact sales",
        caption: "Enterprise scale",
      },
    ] as const

    type PlanId = (typeof planColumns)[number]["id"]

    const features: {
      category: string
      items: {
        name: string
        values: Record<PlanId, string>
      }[]
    }[] = [
      {
        category: "Automation capacity",
        items: [
          {
            name: "Workflow executions",
            values: {
              personal: "2.5k / month",
              professional: "10k / month",
              advanced: "40k / month",
              custom: "Custom limits",
            },
          },
          {
            name: "Credits",
            values: {
              personal: "100",
              professional: "300",
              advanced: "Unlimited",
              custom: "Unlimited",
            },
          },
          {
            name: "Live workflows",
            values: {
              personal: "5",
              professional: "20",
              advanced: "Unlimited",
              custom: "Unlimited",
            },
          },
        ]
      },
      {
        category: "Platform",
        items: [
          {
            name: "Integrations",
            values: {
              personal: "100+",
              professional: "100+",
              advanced: "100+",
              custom: "Custom library",
            },
          },
          {
            name: "Webhook + API triggers",
            values: {
              personal: "Included",
              professional: "Included",
              advanced: "Included",
              custom: "Advanced",
            },
          },
          {
            name: "Workflow templates",
            values: {
              personal: "Core templates",
              professional: "Full library",
              advanced: "Full library",
              custom: "Custom playbooks",
            },
          },
          {
            name: "Analytics",
            values: {
              personal: "Basic",
              professional: "Advanced",
              advanced: "Advanced",
              custom: "Custom dashboards",
            },
          },
          {
            name: "Execution logs",
            values: {
              personal: "Yes",
              professional: "Yes",
              advanced: "Yes",
              custom: "Full export",
            },
          },
        ]
      },
      {
        category: "Support & success",
        items: [
          {
            name: "Support level",
            values: {
              personal: "Email support",
              professional: "Semi-priority chat",
              advanced: "Priority chat",
              custom: "Dedicated partner",
            },
          },
          {
            name: "Dedicated solution engineer",
            values: {
              personal: "—",
              professional: "Add-on",
              advanced: "Included",
              custom: "Embedded team",
            },
          },
          {
            name: "Customization",
            values: {
              personal: "Pre-built",
              professional: "Guided setup",
              advanced: "White-glove",
              custom: "You choose",
            },
          },
        ]
      },
      {
        category: "Reliability & monitoring",
        items: [
          {
            name: "Observability suite",
            values: {
              personal: "Basic",
              professional: "Advanced",
              advanced: "Advanced",
              custom: "Custom stack",
            },
          },
          {
            name: "Real-time monitoring",
            values: {
              personal: "Limited",
              professional: "Full",
              advanced: "Full",
              custom: "Org-wide",
            },
          },
          {
            name: "Audit + compliance",
            values: {
              personal: "Logs only",
              professional: "Data retention",
              advanced: "SOC2-ready",
              custom: "Enterprise controls",
            },
          },
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
              </div>
            </FadeContent>

            {/* Comparison Table */}
            <FadeContent delay={200} duration={1000}>
              <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Header Row */}
                <div className="grid grid-cols-5 gap-4 mb-8">
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-foreground font-geist">Features</h3>
                  </div>
                  {planColumns.map((plan) => (
                    <div key={plan.id} className="text-center">
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-semibold text-foreground font-geist">{plan.name}</h4>
                        <p className="text-sm text-muted-foreground font-geist">{plan.price}</p>
                        <p className="text-xs text-muted-foreground font-geist mt-1">{plan.caption}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feature Categories */}
                {features.map((category, categoryIndex) => (
                  <div key={category.category} className="mb-8">
                    <h4 className="text-lg font-semibold text-foreground font-geist mb-4 pb-2 border-b border-border">
                      {category.category}
                    </h4>
                    
                    {category.items.map((item, itemIndex) => (
                      <div key={item.name} className="grid grid-cols-5 gap-4 py-3 border-b border-border/50">
                        <div className="text-sm text-muted-foreground font-geist">
                          {item.name}
                        </div>
                        {planColumns.map((plan) => (
                          <div key={plan.id} className="text-center">
                            <span className="text-sm text-foreground font-geist">
                              {item.values[plan.id]}
                            </span>
                          </div>
                        ))}
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
