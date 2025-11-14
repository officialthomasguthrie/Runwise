"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { MoveRight, PhoneCall, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import FadeContent from "@/components/ui/FadeContent"
import { ProCheckoutButton } from "@/components/billing/pro-checkout-button"

interface AboutCTAProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const AboutCTA = React.forwardRef<HTMLDivElement, AboutCTAProps>(
  ({ className, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn("w-full bg-background py-16 sm:py-20", className)}
        {...props}
        suppressHydrationWarning={true}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
               <div className="mx-auto max-w-4xl">
                 {/* Main CTA Container */}
                 <FadeContent delay={100} duration={1000}>
                   <div className="relative bg-gradient-to-br from-muted/30 to-muted/10 rounded-3xl p-8 lg:p-12 border border-border/50 overflow-hidden">
                     {/* Background Pattern */}
                     <div className="absolute inset-0 opacity-5">
                       <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-400 to-pink-400"></div>
                     </div>

                     {/* Floating Elements */}
                     <div className="absolute top-8 right-8 w-16 h-16 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-xl"></div>
                     <div className="absolute bottom-8 left-8 w-12 h-12 bg-gradient-to-r from-pink-400/20 to-purple-400/20 rounded-full blur-xl"></div>

                     {/* Content */}
                     <div className="relative z-10 text-center">
                       {/* Badge */}
                       <div className="mb-6">
                         <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 px-4 py-2 text-sm font-medium">
                           Ready to get started?
                         </Badge>
                       </div>

                       {/* Headline */}
                       <h2 className="text-3xl font-semibold leading-tight sm:text-4xl sm:leading-tight text-foreground font-geist mb-4">
                         Join the automation revolution
                       </h2>

                       {/* Description */}
                       <p className="text-lg text-muted-foreground font-geist leading-relaxed mb-8 max-w-2xl mx-auto">
                         Experience the power of AI-driven workflows. Turn your ideas into actions with Runwise's intelligent automation platform.
                       </p>

                       {/* CTA Buttons */}
                       <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                         <ProCheckoutButton
                           variant="outline"
                           className="gap-4 border-border text-foreground bg-transparent hover:bg-accent hover:text-accent-foreground font-geist"
                         >
                           Buy Runwise Pro <MoveRight className="w-4 h-4" />
                         </ProCheckoutButton>

                         <Button 
                           variant="outline" 
                           className="gap-4 border-border text-foreground bg-transparent hover:bg-accent hover:text-accent-foreground font-geist"
                         >
                           Schedule a demo <PhoneCall className="w-4 h-4" />
                         </Button>
                       </div>

                     </div>
                   </div>
                 </FadeContent>

                 {/* Bottom Quote */}
                 <FadeContent delay={200} duration={800}>
                   <div className="mt-12 text-center">
                     <div className="inline-flex items-center gap-2 text-muted-foreground font-geist">
                       <ArrowRight className="w-4 h-4" />
                       <span>Ready to transform your workflows?</span>
                       <ArrowRight className="w-4 h-4" />
                     </div>
                   </div>
                 </FadeContent>
               </div>
        </div>
      </section>
    )
  },
)
AboutCTA.displayName = "AboutCTA"

export default AboutCTA
