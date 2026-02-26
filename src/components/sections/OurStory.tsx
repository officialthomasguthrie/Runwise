"use client"

import { Lightbulb, Users, Zap } from "lucide-react";
import * as React from "react"
import { cn } from "@/lib/utils"

import FadeContent from "@/components/ui/FadeContent"

interface OurStoryProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const OurStory = React.forwardRef<HTMLDivElement, OurStoryProps>(
  ({ className, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn("w-full bg-background py-8 sm:py-12", className)}
        {...props}
        suppressHydrationWarning={true}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
               <div className="mx-auto max-w-4xl">
                 {/* Section Header */}
                 <FadeContent delay={100} duration={800}>
                   <div className="text-center mb-16">
                     <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tighter leading-tight text-foreground font-geist mb-4">
                       Our Story
                     </h2>
                     <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto rounded-full"></div>
                   </div>
                 </FadeContent>

                 {/* Main Story Content */}
                 <div className="space-y-8">
                   {/* Story Text */}
                   <FadeContent delay={200} duration={1000}>
                     <div className="space-y-6 max-w-4xl mx-auto text-center">
                       <div className="space-y-4">
                         <p className="text-lg text-muted-foreground font-geist leading-relaxed">
                           Runwise started from a simple idea: <span className="text-foreground font-semibold">what if anyone could automate their work just by describing what they wanted?</span> No code, no setup, no complex logic — just natural language and intelligent automation.
                         </p>
                         
                         <p className="text-lg text-muted-foreground font-geist leading-relaxed">
                           We saw how teams wasted hours building workflows manually, and decided to build an AI that could do it for them. Today, Runwise helps individuals and organizations turn their ideas into actions, instantly.
                         </p>
                       </div>
                     </div>
                   </FadeContent>

                   {/* Key Points */}
                   <FadeContent delay={300} duration={1000}>
                     <div className="grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
                       <div className="flex flex-col items-center text-center gap-4">
                         <div className="flex-shrink-0 w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                           <Lightbulb className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                         </div>
                         <div>
                           <h3 className="font-semibold text-foreground font-geist mb-2">Simple Vision</h3>
                           <p className="text-sm text-muted-foreground font-geist">Make automation accessible to everyone through natural language</p>
                         </div>
                       </div>

                       <div className="flex flex-col items-center text-center gap-4">
                         <div className="flex-shrink-0 w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                           <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                         </div>
                         <div>
                           <h3 className="font-semibold text-foreground font-geist mb-2">Real Problem</h3>
                           <p className="text-sm text-muted-foreground font-geist">Teams wasting hours on manual workflow creation</p>
                         </div>
                       </div>

                       <div className="flex flex-col items-center text-center gap-4">
                         <div className="flex-shrink-0 w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                           <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                         </div>
                         <div>
                           <h3 className="font-semibold text-foreground font-geist mb-2">AI Solution</h3>
                           <p className="text-sm text-muted-foreground font-geist">Intelligent automation that turns ideas into actions instantly</p>
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
OurStory.displayName = "OurStory"

export default OurStory
