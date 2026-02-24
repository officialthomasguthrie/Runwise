"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Mail, Linkedin, Twitter, Github } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import FadeContent from "@/components/ui/FadeContent"

interface OurTeamProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const OurTeam = React.forwardRef<HTMLDivElement, OurTeamProps>(
  ({ className, ...props }, ref) => {
    const teamMembers = [
      {
        name: "Alex Chen",
        role: "Founder & CEO",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
        bio: "Visionary leader passionate about making AI accessible to everyone. Former tech executive with 10+ years building automation platforms.",
        social: {
          linkedin: "#",
          twitter: "#",
          email: "alex@runwise.ai"
        }
      },
      {
        name: "Sarah Johnson",
        role: "AI Architect",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
        bio: "AI researcher and engineer focused on natural language processing. PhD in Computer Science from Stanford, previously at Google AI.",
        social: {
          linkedin: "#",
          github: "#",
          email: "sarah@runwise.ai"
        }
      },
      {
        name: "Marcus Rodriguez",
        role: "Lead Developer",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
        bio: "Full-stack developer and automation expert. Loves building scalable systems that just work. Open source contributor and tech mentor.",
        social: {
          linkedin: "#",
          github: "#",
          email: "marcus@runwise.ai"
        }
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
                  Our Team
                </h2>
                <p className="text-lg text-muted-foreground font-geist max-w-2xl mx-auto">
                  Meet the passionate people behind Runwise
                </p>
                <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto rounded-full mt-6"></div>
              </div>
            </FadeContent>

            {/* Team Grid */}
            <FadeContent delay={200} duration={1000}>
              <div className="grid gap-8 md:grid-cols-3 mb-16">
              {teamMembers.map((member, index) => (
                <div
                  key={member.name}
                  className="group relative"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Team Member Card */}
                  <div className="relative bg-gradient-to-br from-card to-card/50 rounded-2xl p-6 border border-border/50 hover:border-border hover:shadow-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5 rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400"></div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 text-center">
                      {/* Avatar */}
                      <div className="relative mb-6">
                        <Avatar className="w-24 h-24 mx-auto border-4 border-border/20 group-hover:border-purple-400/50 transition-colors duration-300">
                          <AvatarImage src={member.image} alt={member.name} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-semibold text-xl">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Floating Elements */}
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-300 animate-pulse"></div>
                        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-300 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                      </div>

                      {/* Name & Role */}
                      <h3 className="text-xl font-semibold text-foreground font-geist mb-1">
                        {member.name}
                      </h3>
                      <p className="text-purple-600 dark:text-purple-400 font-medium font-geist mb-4">
                        {member.role}
                      </p>

                      {/* Bio */}
                      <p className="text-sm text-muted-foreground font-geist leading-relaxed mb-6">
                        {member.bio}
                      </p>

                      {/* Social Links */}
                      <div className="flex justify-center gap-3">
                        {member.social.linkedin && (
                          <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-border hover:border-purple-400 hover:text-purple-400 transition-colors duration-300">
                            <Linkedin className="w-4 h-4" />
                          </Button>
                        )}
                        {member.social.github && (
                          <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-border hover:border-purple-400 hover:text-purple-400 transition-colors duration-300">
                            <Github className="w-4 h-4" />
                          </Button>
                        )}
                        {member.social.twitter && (
                          <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-border hover:border-purple-400 hover:text-purple-400 transition-colors duration-300">
                            <Twitter className="w-4 h-4" />
                          </Button>
                        )}
                        {member.social.email && (
                          <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-border hover:border-purple-400 hover:text-purple-400 transition-colors duration-300">
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Hover Effect */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-5 transition-opacity duration-300 bg-gradient-to-br from-purple-400 to-pink-400"></div>
                  </div>
                </div>
              ))}
              </div>
            </FadeContent>

          </div>
        </div>
      </section>
    )
  },
)
OurTeam.displayName = "OurTeam"

export default OurTeam
