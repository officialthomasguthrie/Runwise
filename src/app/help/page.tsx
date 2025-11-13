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
        <main className="flex h-full grow flex-col overflow-auto relative">
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
                  <Card className="group relative bg-card border border-border rounded-lg p-6 hover:border-pink-400/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-sm">Getting Started</h3>
                        <p className="text-xs text-muted-foreground">Learn the basics of using Runwise</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <span>Read Guide</span>
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="group relative bg-card border border-border rounded-lg p-6 hover:border-pink-400/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Video className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-sm">Video Tutorials</h3>
                        <p className="text-xs text-muted-foreground">Watch step-by-step tutorials</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <span>Watch Videos</span>
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="group relative bg-card border border-border rounded-lg p-6 hover:border-pink-400/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <MessageCircle className="w-6 h-6 text-purple-400" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-sm">Live Chat</h3>
                        <p className="text-xs text-muted-foreground">Chat with our support team</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <span>Start Chat</span>
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </Card>
                </div>
              </section>

              {/* Documentation Section */}
              <section className="relative z-10 pb-16">
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">Documentation</h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-2">Comprehensive guides and API documentation</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="group relative bg-card border border-border rounded-lg p-6 hover:border-pink-400/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <FileText className="w-6 h-6 text-orange-400" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-sm">User Guide</h3>
                        <p className="text-xs text-muted-foreground">Complete user manual</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <span>Read Guide</span>
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="group relative bg-card border border-border rounded-lg p-6 hover:border-pink-400/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <HelpCircle className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-sm">FAQ</h3>
                        <p className="text-xs text-muted-foreground">Frequently asked questions</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <span>Browse FAQ</span>
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="group relative bg-card border border-border rounded-lg p-6 hover:border-pink-400/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-500/20 to-green-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Search className="w-6 h-6 text-teal-400" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-sm">Search Docs</h3>
                        <p className="text-xs text-muted-foreground">Find specific information</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <span>Search</span>
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </Card>
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
