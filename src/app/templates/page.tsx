"use client";

import { useState } from "react";
import { Calendar, Mail, BarChart3, FileText, Users, Receipt, Headphones, HelpCircle, MessageSquare, Search } from "lucide-react";
import SearchComponent from "@/components/ui/animated-glowing-search-bar";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";

export default function TemplatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Extended template data with more templates
  const templates = [
    {
      id: 1,
      name: "Social Media Scheduler",
      description: "Auto-create & post weekly content.",
      icon: Calendar,
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-400",
      category: "Marketing"
    },
    {
      id: 2,
      name: "Email Auto-Responder",
      description: "Smart replies for new customer emails.",
      icon: Mail,
      gradient: "from-blue-500/20 to-purple-500/20",
      iconColor: "text-blue-400",
      category: "Customer Service"
    },
    {
      id: 3,
      name: "Daily Business Report",
      description: "Summarize sales & site stats each morning.",
      icon: BarChart3,
      gradient: "from-green-500/20 to-blue-500/20",
      iconColor: "text-green-400",
      category: "Analytics"
    },
    {
      id: 4,
      name: "Blog Post Publisher",
      description: "Generate and publish SEO blog posts.",
      icon: FileText,
      gradient: "from-orange-500/20 to-red-500/20",
      iconColor: "text-orange-400",
      category: "Content"
    },
    {
      id: 5,
      name: "Lead Follow-Up",
      description: "Save leads and send follow-up emails.",
      icon: Users,
      gradient: "from-teal-500/20 to-green-500/20",
      iconColor: "text-teal-400",
      category: "Sales"
    },
    {
      id: 6,
      name: "Invoice Reminder",
      description: "Auto-send invoices & payment reminders.",
      icon: Receipt,
      gradient: "from-indigo-500/20 to-purple-500/20",
      iconColor: "text-indigo-400",
      category: "Finance"
    },
    {
      id: 7,
      name: "Podcast Summarizer",
      description: "Turn audio into quotes & highlights.",
      icon: Headphones,
      gradient: "from-rose-500/20 to-pink-500/20",
      iconColor: "text-rose-400",
      category: "Content"
    },
    {
      id: 8,
      name: "Knowledge Base Builder",
      description: "Create FAQs from support emails.",
      icon: HelpCircle,
      gradient: "from-cyan-500/20 to-blue-500/20",
      iconColor: "text-cyan-400",
      category: "Support"
    },
    {
      id: 9,
      name: "Slack Digest",
      description: "Summarize daily messages & key tasks.",
      icon: MessageSquare,
      gradient: "from-violet-500/20 to-purple-500/20",
      iconColor: "text-violet-400",
      category: "Communication"
    },
    // Additional templates
    {
      id: 10,
      name: "Customer Onboarding",
      description: "Welcome new customers with automated sequences.",
      icon: Users,
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-400",
      category: "Customer Service"
    },
    {
      id: 11,
      name: "Inventory Tracker",
      description: "Monitor stock levels and send alerts.",
      icon: BarChart3,
      gradient: "from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-400",
      category: "Operations"
    },
    {
      id: 12,
      name: "Meeting Scheduler",
      description: "Automatically schedule meetings based on availability.",
      icon: Calendar,
      gradient: "from-sky-500/20 to-blue-500/20",
      iconColor: "text-sky-400",
      category: "Productivity"
    }
  ];

  // Filter templates based on search query
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                Templates
              </h1>
            </div>

            <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-16">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">
                    Browse Templates
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-2">
                    Search through {templates.length} available templates
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <SearchComponent value={searchQuery} onChange={setSearchQuery} placeholder="Search templates..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => {
                  const IconComponent = template.icon;
                  return (
                    <div
                      key={template.id}
                      className="group relative bg-card border border-border rounded-lg p-6 hover:border-pink-400/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                    >
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div
                          className={`w-12 h-12 bg-gradient-to-br ${template.gradient} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                        >
                          <IconComponent className={`w-6 h-6 ${template.iconColor}`} />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-semibold text-foreground text-sm">{template.name}</h3>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </div>
                        <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-md hover:from-purple-600 hover:to-pink-600 transition-all duration-200">
                          Use Template
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}