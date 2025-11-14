'use client';

import { Check, MoveRight, PhoneCall } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProCheckoutButton } from "@/components/billing/pro-checkout-button";

function Pricing() {
  return (
    <div className="w-full py-8 sm:py-12 bg-background" suppressHydrationWarning={true}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8" suppressHydrationWarning={true}>
          {/* Section Header */}
          <div className="mx-auto mb-12 sm:mb-16 lg:mb-20 max-w-4xl text-center" suppressHydrationWarning={true}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tighter leading-tight text-foreground font-geist">
              Pricing
            </h2>
            <p className="mt-4 text-base sm:text-lg lg:text-xl 2xl:text-lg text-muted-foreground font-geist">
              Choose the perfect plan for your AI workflow needs
            </p>
          </div>
          
          <div className="flex text-center justify-center items-center gap-4 flex-col" suppressHydrationWarning={true}>
            <div className="grid text-left grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto gap-6 sm:gap-8" suppressHydrationWarning={true}>
            <Card className="w-full rounded-md bg-card border-border" suppressHydrationWarning={true}>
              <CardHeader suppressHydrationWarning={true}>
                <CardTitle className="text-card-foreground font-geist">
                  <span className="flex flex-row gap-4 items-center font-normal">
                    Free
                  </span>
                </CardTitle>
                <CardDescription className="text-muted-foreground font-geist">
                  Perfect for individuals and small teams getting started with AI workflows.
                </CardDescription>
              </CardHeader>
              <CardContent suppressHydrationWarning={true}>
                <div className="flex flex-col gap-8 justify-start">
                      <p className="flex flex-row items-center gap-2 text-xl text-card-foreground">
                        <span className="text-4xl font-geist">$0</span>
                        <span className="text-sm text-muted-foreground font-geist">
                      / month
                    </span>
                  </p>
                  <div className="flex flex-col gap-4 justify-start">
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-purple-400" />
                      <div className="flex flex-col">
                            <p className="text-card-foreground font-geist">Up to 10 workflows</p>
                            <p className="text-muted-foreground text-sm font-geist">
                          Create and manage up to 10 AI workflows
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-purple-400" />
                      <div className="flex flex-col">
                        <p className="text-card-foreground font-geist">Basic integrations</p>
                        <p className="text-muted-foreground text-sm font-geist">
                          Connect with 10+ popular tools and services
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-purple-400" />
                      <div className="flex flex-col">
                        <p className="text-card-foreground font-geist">Community support</p>
                        <p className="text-muted-foreground text-sm font-geist">
                          Get help from our community and documentation
                        </p>
                      </div>
                    </div>
                  </div>
                      <Button variant="outline" className="gap-4 border-border text-foreground bg-transparent hover:bg-accent hover:text-accent-foreground font-geist">
                    Get started <MoveRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="w-full shadow-2xl rounded-md bg-card border-primary ring-2 ring-primary/20 transform scale-105 sm:scale-110 relative z-10 -mt-4 sm:-mt-8 md:col-span-2 lg:col-span-1" suppressHydrationWarning={true}>
              <CardHeader suppressHydrationWarning={true}>
                <CardTitle className="text-card-foreground font-geist">
                  <span className="flex flex-row gap-4 items-center font-normal">
                    Professional
                  </span>
                </CardTitle>
                <CardDescription className="text-muted-foreground font-geist">
                  Ideal for growing teams that need advanced AI workflow capabilities.
                </CardDescription>
              </CardHeader>
              <CardContent suppressHydrationWarning={true}>
                <div className="flex flex-col gap-8 justify-start">
                  <p className="flex flex-row items-center gap-2 text-xl text-card-foreground">
                    <span className="text-4xl font-geist">$29</span>
                    <span className="text-sm text-muted-foreground font-geist">
                      / month
                    </span>
                  </p>
                  <div className="flex flex-col gap-4 justify-start">
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-purple-400" />
                      <div className="flex flex-col">
                        <p className="text-card-foreground font-geist">Unlimited workflows</p>
                        <p className="text-muted-foreground text-sm font-geist">
                          Create as many AI workflows as you need
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-purple-400" />
                      <div className="flex flex-col">
                        <p className="text-card-foreground font-geist">Advanced integrations</p>
                        <p className="text-muted-foreground text-sm font-geist">
                          Access to 100+ integrations and custom APIs
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-purple-400" />
                      <div className="flex flex-col">
                        <p className="text-card-foreground font-geist">Priority support</p>
                        <p className="text-muted-foreground text-sm font-geist">
                          Get faster response times with priority support
                        </p>
                      </div>
                    </div>
                  </div>
                  <ProCheckoutButton
                    variant="outline"
                    className="w-full gap-4 border-border text-foreground bg-transparent hover:bg-accent hover:text-accent-foreground font-geist justify-center"
                    buttonText="Buy Runwise Pro"
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="w-full rounded-md bg-card border-border" suppressHydrationWarning={true}>
              <CardHeader suppressHydrationWarning={true}>
                <CardTitle className="text-card-foreground font-geist">
                  <span className="flex flex-row gap-4 items-center font-normal">
                    Enterprise
                  </span>
                </CardTitle>
                <CardDescription className="text-muted-foreground font-geist">
                  Custom solutions for large organizations with specific requirements.
                </CardDescription>
              </CardHeader>
              <CardContent suppressHydrationWarning={true}>
                <div className="flex flex-col gap-8 justify-start">
                  <p className="flex flex-row items-center gap-2 text-xl text-card-foreground">
                    <span className="text-4xl font-geist">Custom</span>
                    <span className="text-sm text-muted-foreground font-geist">
                      pricing
                    </span>
                  </p>
                  <div className="flex flex-col gap-4 justify-start">
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-purple-400" />
                      <div className="flex flex-col">
                        <p className="text-card-foreground font-geist">Everything in Professional</p>
                        <p className="text-muted-foreground text-sm font-geist">
                          All features plus enterprise-grade security
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-purple-400" />
                      <div className="flex flex-col">
                        <p className="text-card-foreground font-geist">Custom integrations</p>
                        <p className="text-muted-foreground text-sm font-geist">
                          Build custom integrations for your specific needs
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-4 h-4 mt-2 text-purple-400" />
                      <div className="flex flex-col">
                        <p className="text-card-foreground font-geist">Dedicated support</p>
                        <p className="text-muted-foreground text-sm font-geist">
                          Get a dedicated success manager and 24/7 support
                        </p>
                      </div>
                    </div>
                  </div>
                      <Button variant="outline" className="gap-4 border-border text-foreground bg-transparent hover:bg-accent hover:text-accent-foreground font-geist">
                    Contact sales <PhoneCall className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Pricing };
