"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import SearchComponent from "@/components/ui/animated-glowing-search-bar";
import {
  Slack, FileSpreadsheet, Mail, Calendar, Database, Cloud, Check, Edit2, Webhook, Github,
  Trello, FileText, DollarSign, ShoppingCart, Users, MessageSquare, Bell, Zap,
  Box, Droplet, Twitter, Facebook, Instagram, Linkedin, Youtube, Music,
  Camera, Image, Video, Mic, Phone, Clock, MapPin, Compass,
  CreditCard, ShieldCheck, Lock, Key, Server, HardDrive, Wifi, Globe,
  Code, Terminal, Package, Layers, CheckSquare, BarChart3, HelpCircle, Search
} from "lucide-react";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";

export default function IntegrationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [configuredIntegrations, setConfiguredIntegrations] = useState<Array<{
    id: string;
    name: string;
    description: string;
    icon: any;
    gradient: string;
    iconColor: string;
    status: string;
  }>>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Demo integrations (will be shown since no real integrations exist yet)
  const demoIntegrations = [
    {
      id: 'demo-1',
      name: 'Google Sheets',
      description: 'Read and write spreadsheet data',
      icon: FileSpreadsheet,
      gradient: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-400',
      status: 'configured'
    },
    {
      id: 'demo-2',
      name: 'Slack',
      description: 'Send messages to channels',
      icon: Slack,
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400',
      status: 'configured'
    },
    {
      id: 'demo-3',
      name: 'Gmail',
      description: 'Send and receive emails',
      icon: Mail,
      gradient: 'from-red-500/20 to-orange-500/20',
      iconColor: 'text-red-400',
      status: 'configured'
    },
    {
      id: 'demo-4',
      name: 'Google Calendar',
      description: 'Manage calendar events',
      icon: Calendar,
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400',
      status: 'configured'
    },
    {
      id: 'demo-5',
      name: 'PostgreSQL',
      description: 'Connect to databases',
      icon: Database,
      gradient: 'from-indigo-500/20 to-blue-500/20',
      iconColor: 'text-indigo-400',
      status: 'configured'
    },
    {
      id: 'demo-6',
      name: 'AWS S3',
      description: 'Store and retrieve files',
      icon: Cloud,
      gradient: 'from-orange-500/20 to-yellow-500/20',
      iconColor: 'text-orange-400',
      status: 'configured'
    },
    {
      id: 'demo-7',
      name: 'Webhooks',
      description: 'Send HTTP requests to endpoints',
      icon: Webhook,
      gradient: 'from-teal-500/20 to-cyan-500/20',
      iconColor: 'text-teal-400',
      status: 'configured'
    },
    {
      id: 'demo-8',
      name: 'GitHub',
      description: 'Access repositories and issues',
      icon: Github,
      gradient: 'from-gray-500/20 to-slate-500/20',
      iconColor: 'text-gray-400',
      status: 'configured'
    }
  ];

  // All available integrations (40 integrations for 4x10 grid)
  const allIntegrations = [
    { id: 'all-1', name: 'Google Sheets', description: 'Spreadsheet management', icon: FileSpreadsheet, gradient: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-400', category: 'Productivity' },
    { id: 'all-2', name: 'Slack', description: 'Team communication', icon: Slack, gradient: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400', category: 'Communication' },
    { id: 'all-3', name: 'Gmail', description: 'Email service', icon: Mail, gradient: 'from-red-500/20 to-orange-500/20', iconColor: 'text-red-400', category: 'Communication' },
    { id: 'all-4', name: 'Google Calendar', description: 'Calendar events', icon: Calendar, gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Productivity' },
    { id: 'all-5', name: 'PostgreSQL', description: 'Database management', icon: Database, gradient: 'from-indigo-500/20 to-blue-500/20', iconColor: 'text-indigo-400', category: 'Database' },
    { id: 'all-6', name: 'AWS S3', description: 'Cloud storage', icon: Cloud, gradient: 'from-orange-500/20 to-yellow-500/20', iconColor: 'text-orange-400', category: 'Storage' },
    { id: 'all-7', name: 'Webhooks', description: 'HTTP requests', icon: Webhook, gradient: 'from-teal-500/20 to-cyan-500/20', iconColor: 'text-teal-400', category: 'API' },
    { id: 'all-8', name: 'GitHub', description: 'Code repositories', icon: Github, gradient: 'from-gray-500/20 to-slate-500/20', iconColor: 'text-gray-400', category: 'Development' },
    { id: 'all-9', name: 'Trello', description: 'Project boards', icon: Trello, gradient: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-400', category: 'Productivity' },
    { id: 'all-10', name: 'Notion', description: 'Note taking', icon: FileText, gradient: 'from-gray-500/20 to-zinc-500/20', iconColor: 'text-gray-400', category: 'Productivity' },
    { id: 'all-11', name: 'Stripe', description: 'Payment processing', icon: DollarSign, gradient: 'from-purple-500/20 to-violet-500/20', iconColor: 'text-purple-400', category: 'Finance' },
    { id: 'all-12', name: 'Shopify', description: 'E-commerce platform', icon: ShoppingCart, gradient: 'from-green-500/20 to-lime-500/20', iconColor: 'text-green-400', category: 'E-commerce' },
    { id: 'all-13', name: 'HubSpot', description: 'CRM platform', icon: Users, gradient: 'from-orange-500/20 to-red-500/20', iconColor: 'text-orange-400', category: 'CRM' },
    { id: 'all-14', name: 'Discord', description: 'Community chat', icon: MessageSquare, gradient: 'from-indigo-500/20 to-purple-500/20', iconColor: 'text-indigo-400', category: 'Communication' },
    { id: 'all-15', name: 'Twilio', description: 'SMS & voice', icon: Phone, gradient: 'from-red-500/20 to-pink-500/20', iconColor: 'text-red-400', category: 'Communication' },
    { id: 'all-16', name: 'SendGrid', description: 'Email delivery', icon: Mail, gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Communication' },
    { id: 'all-17', name: 'Zapier', description: 'Workflow automation', icon: Zap, gradient: 'from-orange-500/20 to-amber-500/20', iconColor: 'text-orange-400', category: 'Automation' },
    { id: 'all-18', name: 'Dropbox', description: 'File storage', icon: Box, gradient: 'from-blue-500/20 to-sky-500/20', iconColor: 'text-blue-400', category: 'Storage' },
    { id: 'all-19', name: 'Google Drive', description: 'Cloud storage', icon: Cloud, gradient: 'from-yellow-500/20 to-green-500/20', iconColor: 'text-yellow-400', category: 'Storage' },
    { id: 'all-20', name: 'Airtable', description: 'Database tables', icon: Database, gradient: 'from-yellow-500/20 to-orange-500/20', iconColor: 'text-yellow-400', category: 'Database' },
    { id: 'all-21', name: 'Twitter', description: 'Social media', icon: Twitter, gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Social' },
    { id: 'all-22', name: 'Facebook', description: 'Social network', icon: Facebook, gradient: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-400', category: 'Social' },
    { id: 'all-23', name: 'Instagram', description: 'Photo sharing', icon: Instagram, gradient: 'from-pink-500/20 to-purple-500/20', iconColor: 'text-pink-400', category: 'Social' },
    { id: 'all-24', name: 'LinkedIn', description: 'Professional network', icon: Linkedin, gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Social' },
    { id: 'all-25', name: 'YouTube', description: 'Video platform', icon: Youtube, gradient: 'from-red-500/20 to-orange-500/20', iconColor: 'text-red-400', category: 'Social' },
    { id: 'all-26', name: 'Spotify', description: 'Music streaming', icon: Music, gradient: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-400', category: 'Media' },
    { id: 'all-27', name: 'Figma', description: 'Design tool', icon: Layers, gradient: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400', category: 'Design' },
    { id: 'all-28', name: 'Canva', description: 'Graphic design', icon: Image, gradient: 'from-cyan-500/20 to-blue-500/20', iconColor: 'text-cyan-400', category: 'Design' },
    { id: 'all-29', name: 'Zoom', description: 'Video conferencing', icon: Video, gradient: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-400', category: 'Communication' },
    { id: 'all-30', name: 'Microsoft Teams', description: 'Team collaboration', icon: Users, gradient: 'from-purple-500/20 to-blue-500/20', iconColor: 'text-purple-400', category: 'Communication' },
    { id: 'all-31', name: 'Asana', description: 'Task management', icon: CheckSquare, gradient: 'from-pink-500/20 to-red-500/20', iconColor: 'text-pink-400', category: 'Productivity' },
    { id: 'all-32', name: 'Jira', description: 'Issue tracking', icon: Trello, gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Development' },
    { id: 'all-33', name: 'MongoDB', description: 'NoSQL database', icon: Database, gradient: 'from-green-500/20 to-teal-500/20', iconColor: 'text-green-400', category: 'Database' },
    { id: 'all-34', name: 'Redis', description: 'Cache database', icon: Server, gradient: 'from-red-500/20 to-orange-500/20', iconColor: 'text-red-400', category: 'Database' },
    { id: 'all-35', name: 'Salesforce', description: 'CRM platform', icon: Cloud, gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'CRM' },
    { id: 'all-36', name: 'Mailchimp', description: 'Email marketing', icon: Mail, gradient: 'from-yellow-500/20 to-orange-500/20', iconColor: 'text-yellow-400', category: 'Marketing' },
    { id: 'all-37', name: 'Google Analytics', description: 'Website analytics', icon: BarChart3, gradient: 'from-orange-500/20 to-red-500/20', iconColor: 'text-orange-400', category: 'Analytics' },
    { id: 'all-38', name: 'Intercom', description: 'Customer messaging', icon: MessageSquare, gradient: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-400', category: 'Support' },
    { id: 'all-39', name: 'Zendesk', description: 'Help desk software', icon: HelpCircle, gradient: 'from-green-500/20 to-teal-500/20', iconColor: 'text-green-400', category: 'Support' },
    { id: 'all-40', name: 'OpenAI', description: 'AI language models', icon: Zap, gradient: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400', category: 'AI' }
  ];

  // Filter integrations based on search query
  const filteredIntegrations = allIntegrations.filter(integration =>
    integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    integration.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    integration.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load configured integrations from database
  useEffect(() => {
    const loadIntegrations = async () => {
      if (loading || !user) return;
      
      setIntegrationsLoading(true);
      try {
        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();
        
        if (!authData.user) {
          setConfiguredIntegrations([]);
          setIntegrationsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_integrations')
          .select('id, name, config, is_active, created_at')
          .eq('user_id', authData.user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch integrations:', error);
          setConfiguredIntegrations([]);
        } else {
          // Since no real integrations exist, this will be empty
          // We'll use demo data instead
          setConfiguredIntegrations(data ?? []);
        }
      } catch (e) {
        console.error('Unexpected error fetching integrations:', e);
        setConfiguredIntegrations([]);
      } finally {
        setIntegrationsLoading(false);
      }
    };

    loadIntegrations();
  }, [user, loading]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen bg-background">
      <CollapsibleSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <BlankHeader />
        <main className="flex h-full grow flex-col overflow-auto relative">
          <div className="relative pb-48">
            <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-4">
              <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight mt-7">
                Integrations
              </h1>
            </div>

            {/* Configured Integrations */}
            <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-16">
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">
                  Configured Integrations
                </h2>
                <p className="text-sm md:text-base text-muted-foreground mt-2">
                  Your active integrations and connections
                </p>
              </div>

              <div>
                {integrationsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-sm text-muted-foreground">Loading integrations...</div>
                  </div>
                ) : configuredIntegrations.length === 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {demoIntegrations.map((integration) => (
                      <div
                        key={integration.id}
                        className="group relative rounded-lg border border-border bg-card p-6 transition-colors hover:border-pink-400/50 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className={`rounded-md bg-gradient-to-br ${integration.gradient} p-3`}>{integration.icon}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex h-2 w-2 rounded-full bg-green-500" aria-hidden />
                            Active
                          </div>
                        </div>
                        <div className="mt-6 space-y-2">
                          <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
                          <p className="text-xs text-muted-foreground">{integration.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {configuredIntegrations.map((integration) => (
                      <div
                        key={integration.id}
                        className="group relative rounded-lg border border-border bg-card p-6 transition-colors hover:border-pink-400/50 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className={`rounded-md bg-gradient-to-br ${integration.gradient} p-3`}>
                            {integration.icon}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex h-2 w-2 rounded-full bg-green-500" aria-hidden />
                            Active
                          </div>
                        </div>
                        <div className="mt-6 space-y-2">
                          <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
                          <p className="text-xs text-muted-foreground">{integration.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Discover Integrations */}
            <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-16">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">
                    Discover Integrations
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-2">
                    Popular integrations you can connect in seconds
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <SearchComponent value={searchQuery} onChange={setSearchQuery} placeholder="Search integrations..." />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredIntegrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="group relative rounded-lg border border-border bg-card p-6 transition-colors hover:border-pink-400/50 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className={`rounded-md bg-gradient-to-br ${integration.gradient} p-3`}>
                        {integration.icon}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" aria-hidden />
                        {integration.category}
                      </div>
                    </div>
                    <div className="mt-6 space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
                      <p className="text-xs text-muted-foreground">{integration.description}</p>
                    </div>
                    <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Updated recently</span>
                      <button className="text-pink-400 hover:text-pink-300 transition-colors">
                        Connect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
