"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"
import FadeContent from "@/components/ui/FadeContent"

interface ContactFormProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const ContactForm = React.forwardRef<HTMLDivElement, ContactFormProps>(
  ({ className, ...props }, ref) => {
    const [formData, setFormData] = React.useState({
      name: '',
      email: '',
      company: '',
      subject: '',
      message: ''
    })

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      // Handle form submission here
      console.log('Form submitted:', formData)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      })
    }

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
                <h2 className="text-3xl font-semibold leading-tight sm:text-4xl sm:leading-tight text-foreground font-geist mb-4">
                  Send us a message
                </h2>
                <p className="text-lg text-muted-foreground font-geist max-w-2xl mx-auto">
                  Fill out the form below and we'll get back to you within 24 hours
                </p>
                <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto rounded-full mt-6"></div>
              </div>
            </FadeContent>

            {/* Contact Form */}
            <FadeContent delay={200} duration={1000}>
              <div className="bg-muted/30 dark:bg-muted/20 rounded-2xl p-8 lg:p-12 border border-border shadow-lg">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name and Email Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground font-geist font-medium">
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="bg-muted/50 dark:bg-muted/30 border-border text-foreground placeholder:text-muted-foreground focus:border-purple-400 focus:ring-purple-400/20"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground font-geist font-medium">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="bg-muted/50 dark:bg-muted/30 border-border text-foreground placeholder:text-muted-foreground focus:border-purple-400 focus:ring-purple-400/20"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                {/* Company and Subject Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-foreground font-geist font-medium">
                      Company
                    </Label>
                    <Input
                      id="company"
                      name="company"
                      type="text"
                      value={formData.company}
                      onChange={handleChange}
                      className="bg-muted/50 dark:bg-muted/30 border-border text-foreground placeholder:text-muted-foreground focus:border-purple-400 focus:ring-purple-400/20"
                      placeholder="Your company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-foreground font-geist font-medium">
                      Subject *
                    </Label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="bg-muted/50 dark:bg-muted/30 border-border text-foreground placeholder:text-muted-foreground focus:border-purple-400 focus:ring-purple-400/20"
                      placeholder="What's this about?"
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-foreground font-geist font-medium">
                    Message *
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="bg-muted/50 dark:bg-muted/30 border-border text-foreground placeholder:text-muted-foreground focus:border-purple-400 focus:ring-purple-400/20 resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-4">
                  <Button
                    type="submit"
                    className="gap-3 bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white font-geist px-8 py-3 text-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    Send Message
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </form>
              </div>
            </FadeContent>
          </div>
        </div>
      </section>
    )
  },
)
ContactForm.displayName = "ContactForm"

export default ContactForm
