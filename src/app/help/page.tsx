"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, MessageCircle, Video, FileText, HelpCircle, Search, ChevronRight, ExternalLink } from "lucide-react";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";

export default function HelpCenterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen bg-background">
      <CollapsibleSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <BlankHeader />
        <main className="flex h-full grow flex-col overflow-auto relative scrollbar-hide">
          <div className="relative pb-12">
            <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-4">
              <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight mt-7">
                Help Center
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-2">
                Find answers, guides, and support resources
              </p>
            </div>

            <div className="mt-8 space-y-8 px-4 sm:px-6 lg:px-8">
              {/* Help Center Content */}
              {/* Quick Help Section */}
              <section className="relative z-10 pb-16">
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">Quick Help</h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-2">Get started quickly with these common topics</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-6 transition-all duration-300 text-foreground hover:shadow-lg">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-sm">Getting Started</h3>
                        <p className="text-xs text-muted-foreground">Learn the basics of using Runwise</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
                      >
                        <span>Read Guide</span>
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>

                  <div className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-6 transition-all duration-300 text-foreground hover:shadow-lg">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-sm">Video Tutorials</h3>
                        <p className="text-xs text-muted-foreground">Watch step-by-step tutorials</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
                      >
                        <span>Watch Videos</span>
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>

                  <div className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-6 transition-all duration-300 text-foreground hover:shadow-lg">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-sm">Live Chat</h3>
                        <p className="text-xs text-muted-foreground">Chat with our support team</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
                      >
                        <span>Start Chat</span>
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Documentation Section */}
              <section className="relative z-10 pb-16">
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">Documentation</h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-2">Comprehensive guides and API documentation</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-6 transition-all duration-300 text-foreground hover:shadow-lg">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-sm">User Guide</h3>
                        <p className="text-xs text-muted-foreground">Complete user manual</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
                      >
                        <span>Read Guide</span>
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>

                  <div className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-6 transition-all duration-300 text-foreground hover:shadow-lg">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-sm">FAQ</h3>
                        <p className="text-xs text-muted-foreground">Frequently asked questions</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
                      >
                        <span>Browse FAQ</span>
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>

                  <div className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-6 transition-all duration-300 text-foreground hover:shadow-lg">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-sm">Search Docs</h3>
                        <p className="text-xs text-muted-foreground">Find specific information</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
                      >
                        <span>Search</span>
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Support Options */}
              <section className="relative z-10 pb-16">
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">Support Options</h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-2">Multiple ways to get help when you need it</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-foreground">Contact Support</CardTitle>
                      <CardDescription>
                        Get personalized help from our support team
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Button variant="outline" className="w-full justify-start">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Live Chat Support
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <FileText className="w-4 h-4 mr-2" />
                          Email Support
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Video className="w-4 h-4 mr-2" />
                          Schedule a Call
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-foreground">Community</CardTitle>
                      <CardDescription>
                        Connect with other users and get community help
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Button variant="outline" className="w-full justify-start">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Community Forum
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Discord Server
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <FileText className="w-4 h-4 mr-2" />
                          Feature Requests
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
