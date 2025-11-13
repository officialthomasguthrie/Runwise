"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Phone, Mail, Twitter, Instagram, Youtube, Linkedin } from "lucide-react"
import FadeContent from "@/components/ui/FadeContent"

interface ContactInfoProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const ContactInfo = React.forwardRef<HTMLDivElement, ContactInfoProps>(
  ({ className, ...props }, ref) => {
    const contactInfo = [
      {
        icon: Phone,
        label: "Phone",
        value: "+1 (555) 123-4567",
        href: "tel:+15551234567",
        color: "from-green-400 to-emerald-400"
      },
      {
        icon: Mail,
        label: "Email",
        value: "hello@runwise.ai",
        href: "mailto:hello@runwise.ai",
        color: "from-blue-400 to-cyan-400"
      },
      {
        icon: Linkedin,
        label: "LinkedIn",
        value: "linkedin.com/company/runwise",
        href: "https://linkedin.com/company/runwise",
        color: "from-blue-500 to-blue-700"
      }
    ]

    const socialLinks = [
      {
        icon: Twitter,
        label: "Twitter",
        href: "https://twitter.com/runwise",
        color: "from-blue-400 to-blue-600"
      },
      {
        icon: Instagram,
        label: "Instagram",
        href: "https://instagram.com/runwise",
        color: "from-pink-400 to-purple-400"
      },
      {
        icon: Youtube,
        label: "YouTube",
        href: "https://youtube.com/@runwise",
        color: "from-red-400 to-red-600"
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
                  Other ways to reach us
                </h2>
                <p className="text-lg text-muted-foreground font-geist max-w-2xl mx-auto">
                  Connect with us through your preferred channel
                </p>
                <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto rounded-full mt-6"></div>
              </div>
            </FadeContent>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Information */}
              <FadeContent delay={200} duration={1000}>
                <div className="space-y-8">
                <h3 className="text-2xl font-semibold text-foreground font-geist mb-6">
                  Contact Information
                </h3>
                <div className="space-y-4">
                  {contactInfo.map((contact, index) => {
                    const IconComponent = contact.icon
                    return (
                      <a
                        key={contact.label}
                        href={contact.href}
                        className="group flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:scale-105"
                      >
                        <div className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                          "from-pink-400 to-purple-400"
                        )}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-semibold text-foreground font-geist group-hover:text-purple-400 transition-colors">
                            {contact.label}
                          </p>
                          <p className="text-sm text-muted-foreground font-geist">
                            {contact.value}
                          </p>
                        </div>
                      </a>
                    )
                  })}
                </div>
                </div>
              </FadeContent>

              {/* Social Media */}
              <FadeContent delay={300} duration={1000}>
                <div className="space-y-8">
                <h3 className="text-2xl font-semibold text-foreground font-geist mb-6">
                  Follow Us
                </h3>
                <div className="space-y-4">
                  {socialLinks.map((social, index) => {
                    const IconComponent = social.icon
                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:scale-105"
                      >
                        <div className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                          "from-pink-400 to-purple-400"
                        )}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-semibold text-foreground font-geist group-hover:text-purple-400 transition-colors">
                            {social.label}
                          </p>
                          <p className="text-sm text-muted-foreground font-geist">
                            Follow us for updates and news
                          </p>
                        </div>
                      </a>
                    )
                  })}
                </div>
                </div>
              </FadeContent>
            </div>

            {/* Bottom Message */}
            <FadeContent delay={400} duration={800}>
              <div className="mt-16 text-center">
              <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl p-8 border border-border/50">
                <h3 className="text-xl font-semibold text-foreground font-geist mb-3">
                  We're here to help
                </h3>
                <p className="text-muted-foreground font-geist max-w-2xl mx-auto">
                  Whether you have questions about our platform, need technical support, or want to discuss partnership opportunities, 
                  our team is ready to assist you. We typically respond within 24 hours.
                </p>
              </div>
            </div>
            </FadeContent>
          </div>
        </div>
      </section>
    )
  },
)
ContactInfo.displayName = "ContactInfo"

export default ContactInfo
