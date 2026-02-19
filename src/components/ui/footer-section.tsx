"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Facebook, Instagram, Linkedin, Moon, Send, Sun, Twitter } from "lucide-react"

function FooterSection() {
  const [isDarkMode, setIsDarkMode] = React.useState(true) // Start with true to default to dark mode
  const [isHydrated, setIsHydrated] = React.useState(false)

  React.useEffect(() => {
    // Mark as hydrated
    setIsHydrated(true)
    
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme')
    const hasDarkClass = document.documentElement.classList.contains("dark")
    
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark')
    } else {
      // Default to dark mode if no saved preference
      setIsDarkMode(true)
    }
  }, [])

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  return (
    <footer className="relative border-t border-border bg-background text-foreground transition-colors duration-300" suppressHydrationWarning={true}>
      <div className="container mx-auto px-4 pt-48 pb-10 md:px-6 lg:px-8" suppressHydrationWarning={true}>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 mt-16">
          <div className="relative">
            <h2 className="mb-3 text-xl font-bold tracking-tight text-foreground font-geist">Stay Connected</h2>
            <p className="mb-5 text-xs text-muted-foreground font-geist">
              Join our newsletter for the latest AI workflow updates and exclusive offers.
            </p>
            <form className="relative" suppressHydrationWarning={true}>
              <Input
                type="email"
                placeholder="Enter your email"
                className="pr-12 backdrop-blur-sm bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Subscribe</span>
              </Button>
            </form>
            <div className="absolute -right-4 top-0 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl" />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground font-geist">Quick Links</h3>
            <nav className="space-y-1.5 text-xs">
              <a href="/" className="block transition-colors hover:text-primary text-muted-foreground font-geist">
                Home
              </a>
              <a href="#" className="block transition-colors hover:text-primary text-muted-foreground font-geist">
                Documentation
              </a>
            </nav>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground font-geist">Contact Us</h3>
            <address className="space-y-1.5 text-xs not-italic text-muted-foreground font-geist">
              <p>AI Innovation Hub</p>
              <p>San Francisco, CA 94105</p>
              <p>Phone: (555) 123-4567</p>
              <p>Email: hello@runwise.ai</p>
            </address>
          </div>
          <div className="relative">
            <h3 className="mb-3 text-sm font-semibold text-foreground font-geist">Follow Us</h3>
            <div className="mb-5 flex space-x-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full border-border text-foreground hover:bg-accent">
                      <Facebook className="h-4 w-4" />
                      <span className="sr-only">Facebook</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on Facebook</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full border-border text-foreground hover:bg-accent">
                      <Twitter className="h-4 w-4" />
                      <span className="sr-only">Twitter</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on Twitter</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full border-border text-foreground hover:bg-accent">
                      <Instagram className="h-4 w-4" />
                      <span className="sr-only">Instagram</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on Instagram</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full border-border text-foreground hover:bg-accent" asChild>
                      <a href="https://discord.gg/YdAq6TEZv7" target="_blank" rel="noopener noreferrer">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.052a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                        <span className="sr-only">Discord</span>
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Join our Discord</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full border-border text-foreground hover:bg-accent">
                      <Linkedin className="h-4 w-4" />
                      <span className="sr-only">LinkedIn</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Connect with us on LinkedIn</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center space-x-2" suppressHydrationWarning>
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Switch
                id="dark-mode"
                checked={isDarkMode}
                onCheckedChange={setIsDarkMode}
              />
              <Moon className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="dark-mode" className="sr-only">
                Toggle dark mode
              </Label>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-center md:flex-row" suppressHydrationWarning>
          <p className="text-xs text-muted-foreground font-geist">
            © 2024 Runwise AI. All rights reserved.
          </p>
          <nav className="flex gap-4 text-xs">
            <a href="#" className="transition-colors hover:text-primary text-muted-foreground font-geist">
              Privacy Policy
            </a>
            <a href="#" className="transition-colors hover:text-primary text-muted-foreground font-geist">
              Terms of Service
            </a>
            <a href="#" className="transition-colors hover:text-primary text-muted-foreground font-geist">
              Cookie Settings
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export { FooterSection }
