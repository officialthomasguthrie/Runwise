"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import SearchComponent from "@/components/ui/animated-glowing-search-bar";
import { useTheme } from "next-themes";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function IntegrationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Fix hydration mismatch for theme
  useEffect(() => {
    setMounted(true);
  }, []);
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
  const [comingSoonDialogOpen, setComingSoonDialogOpen] = useState<boolean>(false);
  const [selectedIntegrationName, setSelectedIntegrationName] = useState<string>("");

  // List of integration slugs that have black or very dark logos (should be inverted to white in dark mode)
  // NOTE: CSS filters (brightness-0 + invert) will make logos monochrome white, losing original colors
  // Only include logos that are actually black/dark and need to be white in dark mode
  const darkLogos = [
    'github',      // Black - will be white in dark mode (loses colors if multi-colored)
    'notion',      // Black - will be white in dark mode (loses colors if multi-colored)
    'x',           // Twitter/X - black - will be white in dark mode
    'openai',      // Dark gray/black (also needs to be black in light mode)
    'postgresql',  // Very dark blue (appears almost black) - will be white in dark mode
    'slack'        // Purple but should be white in dark mode (will lose original purple color)
  ];
  
  // Logos that should be black in light mode (but may be colored)
  // NOTE: brightness-0 makes logos black, losing original colors
  const lightModeBlackLogos = [
    'openai'       // Purple in light mode, should be black (loses original color)
  ];

  // Helper function to check if a logo uses Brandfetch
  const usesBrandfetch = (slug: string): boolean => {
  const brandfetchSlugs = [
      'googlesheets', 'slack', 'gmail', 'googlecalendar', 'postgresql', 'amazons3',
      'github', 'trello', 'notion', 'stripe', 'shopify', 'hubspot', 'discord',
      'twilio', 'sendgrid', 'zapier', 'dropbox', 'googledrive', 'airtable', 'x',
      'facebook', 'instagram', 'linkedin', 'youtube', 'spotify', 'figma', 'canva',
      'asana', 'mongodb', 'redis', 'salesforce', 'mailchimp', 'googleanalytics',
      'intercom', 'zendesk', 'openai', 'zoom', 'microsoftteams'
    ];
    return brandfetchSlugs.includes(slug);
  };

  // Helper function to get logo URL - uses Brandfetch for specific logos, Simple Icons for others
  const getLogoUrl = (slug: string): string => {
    const isDark = mounted && theme === 'dark';
    const clientId = '1dxbfHSJFAPEGdCLU4o5B';
    const clientId2 = '1bxid64Mup7aczewSAYMX';
    
    // Brandfetch logo mappings
    const brandfetchLogos: Record<string, { light?: string; dark?: string }> = {
      'googlesheets': { dark: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idKa2XnbFY.svg?c=${clientId}` },
      'slack': { dark: `https://cdn.brandfetch.io/idJ_HhtG0Z/w/400/h/400/theme/dark/icon.jpeg?c=${clientId}` },
      'gmail': { dark: `https://cdn.brandfetch.io/id5o3EIREg/theme/dark/symbol.svg?c=${clientId}` },
      'googlecalendar': { dark: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idMX2_OMSc.svg?c=${clientId}` },
      'postgresql': { dark: `https://cdn.brandfetch.io/idjSeCeMle/theme/dark/logo.svg?c=${clientId}` },
      'amazons3': { 
        light: `https://cdn.brandfetch.io/idVoqFQ-78/theme/dark/logo.svg?c=${clientId}`,
        dark: `https://cdn.brandfetch.io/idVoqFQ-78/theme/light/logo.svg?c=${clientId}`
      },
      'github': {
        light: `https://cdn.brandfetch.io/idZAyF9rlg/theme/dark/symbol.svg?c=${clientId}`,
        dark: `https://cdn.brandfetch.io/idZAyF9rlg/theme/light/symbol.svg?c=${clientId}`
      },
      'trello': { dark: `https://cdn.brandfetch.io/idToc8bDY1/theme/dark/symbol.svg?c=${clientId}` },
      'notion': { dark: `https://cdn.brandfetch.io/idPYUoikV7/theme/dark/symbol.svg?c=${clientId}` },
      'stripe': { dark: `https://cdn.brandfetch.io/idxAg10C0L/w/480/h/480/theme/dark/icon.jpeg?c=${clientId}` },
      'shopify': { dark: `https://cdn.brandfetch.io/idAgPm7IvG/theme/dark/symbol.svg?c=${clientId}` },
      'hubspot': { dark: `https://cdn.brandfetch.io/idRt0LuzRf/theme/dark/symbol.svg?c=${clientId}` },
      'discord': { dark: `https://cdn.brandfetch.io/idM8Hlme1a/theme/dark/symbol.svg?c=${clientId}` },
      'twilio': { dark: `https://cdn.brandfetch.io/idT7wVo_zL/theme/dark/symbol.svg?c=${clientId}` },
      'sendgrid': { dark: `https://cdn.brandfetch.io/idHHcfw5Qu/theme/dark/symbol.svg?c=${clientId}` },
      'zapier': { dark: `https://cdn.brandfetch.io/idNMs_nMA0/w/400/h/400/theme/dark/icon.jpeg?c=${clientId}` },
      'dropbox': { dark: `https://cdn.brandfetch.io/idY3kwH_Nx/theme/dark/symbol.svg?c=${clientId}` },
      'googledrive': { dark: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idncaAgFGT.svg?c=${clientId}` },
      'airtable': { dark: `https://cdn.brandfetch.io/iddsnRzkxS/theme/dark/symbol.svg?c=${clientId}` },
      'x': {
        light: `https://cdn.brandfetch.io/idS5WhqBbM/theme/dark/logo.svg?c=${clientId}`,
        dark: `https://cdn.brandfetch.io/idS5WhqBbM/theme/light/logo.svg?c=${clientId}`
      },
      'facebook': { dark: `https://cdn.brandfetch.io/idpKX136kp/w/2084/h/2084/theme/dark/logo.png?c=${clientId}` },
      'instagram': { dark: `https://cdn.brandfetch.io/ido5G85nya/theme/light/symbol.svg?c=${clientId}` },
      'linkedin': { dark: `https://cdn.brandfetch.io/idJFz6sAsl/theme/dark/symbol.svg?c=${clientId}` },
      'youtube': { dark: `https://cdn.brandfetch.io/idVfYwcuQz/theme/dark/symbol.svg?c=${clientId}` },
      'spotify': { dark: `https://cdn.brandfetch.io/id20mQyGeY/theme/dark/symbol.svg?c=${clientId}` },
      'figma': { dark: `https://cdn.brandfetch.io/idZHcZ_i7F/theme/dark/symbol.svg?c=${clientId}` },
      'canva': { dark: `https://cdn.brandfetch.io/id9mVQlyB1/w/400/h/400/theme/dark/icon.jpeg?c=${clientId}` },
      'zoom': { dark: `https://cdn.brandfetch.io/id3aO4Szj3/w/400/h/400/theme/dark/icon.jpeg?c=${clientId}` },
      'microsoftteams': { dark: `https://cdn.brandfetch.io/idchmboHEZ/theme/dark/symbol.svg?c=${clientId}` },
      'asana': { dark: `https://cdn.brandfetch.io/idxPi2Evsk/w/400/h/400/theme/dark/icon.jpeg?c=${clientId}` },
      'mongodb': { dark: `https://cdn.brandfetch.io/ideyyfT0Lp/theme/dark/idolyTWJJO.svg?c=${clientId}` },
      'redis': { dark: `https://cdn.brandfetch.io/idFEnp00Rl/w/400/h/400/theme/dark/icon.jpeg?c=${clientId}` },
      'salesforce': { dark: `https://cdn.brandfetch.io/idVE84WdIN/theme/dark/logo.svg?c=${clientId}` },
      'mailchimp': { dark: `https://cdn.brandfetch.io/idMvnv36a4/w/400/h/400/theme/dark/icon.jpeg?c=${clientId}` },
      'googleanalytics': { dark: `https://cdn.brandfetch.io/idYpJMnlBx/w/192/h/192/theme/dark/logo.png?c=${clientId}` },
      'intercom': {
        light: `https://cdn.brandfetch.io/idYJNDWF1m/theme/dark/symbol.svg?c=${clientId}`,
        dark: `https://cdn.brandfetch.io/idYJNDWF1m/theme/light/symbol.svg?c=${clientId}`
      },
      'zendesk': {
        light: `https://cdn.brandfetch.io/idNq8SRGPd/theme/dark/symbol.svg?c=${clientId}`,
        dark: `https://cdn.brandfetch.io/idNq8SRGPd/theme/dark/idhQUhn6jo.svg?c=${clientId}`
      },
      'openai': {
        light: `https://cdn.brandfetch.io/idR3duQxYl/theme/dark/symbol.svg?c=${clientId}`,
        dark: `https://cdn.brandfetch.io/idR3duQxYl/theme/light/symbol.svg?c=${clientId}`
      }
    };

    const logoConfig = brandfetchLogos[slug];
    if (logoConfig) {
      // If logo has theme-specific URLs, use appropriate one
      if (isDark && logoConfig.dark) {
        return logoConfig.dark;
      } else if (!isDark && logoConfig.light) {
        return logoConfig.light;
      } else if (logoConfig.dark) {
        // Fallback to dark if no light version
        return logoConfig.dark;
      }
    }
    
    // Default to Simple Icons for logos not in the mapping
    return `https://cdn.simpleicons.org/${slug}`;
  };


  // All available integrations (40 integrations for 4x10 grid)
  const allIntegrations = [
    { id: 'all-1', name: 'Google Sheets', description: 'Spreadsheet management', icon: FileSpreadsheet, slug: 'googlesheets', gradient: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-400', category: 'Productivity' },
    { id: 'all-2', name: 'Slack', description: 'Team communication', icon: Slack, slug: 'slack', gradient: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400', category: 'Communication' },
    { id: 'all-3', name: 'Gmail', description: 'Email service', icon: Mail, slug: 'gmail', gradient: 'from-red-500/20 to-orange-500/20', iconColor: 'text-red-400', category: 'Communication' },
    { id: 'all-4', name: 'Google Calendar', description: 'Calendar events', icon: Calendar, slug: 'googlecalendar', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Productivity' },
    { id: 'all-5', name: 'PostgreSQL', description: 'Database management', icon: Database, slug: 'postgresql', gradient: 'from-indigo-500/20 to-blue-500/20', iconColor: 'text-indigo-400', category: 'Database' },
    { id: 'all-6', name: 'AWS S3', description: 'Cloud storage', icon: Cloud, slug: 'amazons3', gradient: 'from-orange-500/20 to-yellow-500/20', iconColor: 'text-orange-400', category: 'Storage' },
    { id: 'all-8', name: 'GitHub', description: 'Code repositories', icon: Github, slug: 'github', gradient: 'from-gray-500/20 to-slate-500/20', iconColor: 'text-gray-400', category: 'Development' },
    { id: 'all-9', name: 'Trello', description: 'Project boards', icon: Trello, slug: 'trello', gradient: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-400', category: 'Productivity' },
    { id: 'all-10', name: 'Notion', description: 'Note taking', icon: FileText, slug: 'notion', gradient: 'from-gray-500/20 to-zinc-500/20', iconColor: 'text-gray-400', category: 'Productivity' },
    { id: 'all-11', name: 'Stripe', description: 'Payment processing', icon: DollarSign, slug: 'stripe', gradient: 'from-purple-500/20 to-violet-500/20', iconColor: 'text-purple-400', category: 'Finance' },
    { id: 'all-12', name: 'Shopify', description: 'E-commerce platform', icon: ShoppingCart, slug: 'shopify', gradient: 'from-green-500/20 to-lime-500/20', iconColor: 'text-green-400', category: 'E-commerce' },
    { id: 'all-13', name: 'HubSpot', description: 'CRM platform', icon: Users, slug: 'hubspot', gradient: 'from-orange-500/20 to-red-500/20', iconColor: 'text-orange-400', category: 'CRM' },
    { id: 'all-14', name: 'Discord', description: 'Community chat', icon: MessageSquare, slug: 'discord', gradient: 'from-indigo-500/20 to-purple-500/20', iconColor: 'text-indigo-400', category: 'Communication' },
    { id: 'all-15', name: 'Twilio', description: 'SMS & voice', icon: Phone, slug: 'twilio', gradient: 'from-red-500/20 to-pink-500/20', iconColor: 'text-red-400', category: 'Communication' },
    { id: 'all-16', name: 'SendGrid', description: 'Email delivery', icon: Mail, slug: 'sendgrid', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Communication' },
    { id: 'all-17', name: 'Zapier', description: 'Workflow automation', icon: Zap, slug: 'zapier', gradient: 'from-orange-500/20 to-amber-500/20', iconColor: 'text-orange-400', category: 'Automation' },
    { id: 'all-18', name: 'Dropbox', description: 'File storage', icon: Box, slug: 'dropbox', gradient: 'from-blue-500/20 to-sky-500/20', iconColor: 'text-blue-400', category: 'Storage' },
    { id: 'all-19', name: 'Google Drive', description: 'Cloud storage', icon: Cloud, slug: 'googledrive', gradient: 'from-yellow-500/20 to-green-500/20', iconColor: 'text-yellow-400', category: 'Storage' },
    { id: 'all-20', name: 'Airtable', description: 'Database tables', icon: Database, slug: 'airtable', gradient: 'from-yellow-500/20 to-orange-500/20', iconColor: 'text-yellow-400', category: 'Database' },
    { id: 'all-21', name: 'Twitter', description: 'Social media', icon: Twitter, slug: 'x', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Social' },
    { id: 'all-22', name: 'Facebook', description: 'Social network', icon: Facebook, slug: 'facebook', gradient: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-400', category: 'Social' },
    { id: 'all-23', name: 'Instagram', description: 'Photo sharing', icon: Instagram, slug: 'instagram', gradient: 'from-pink-500/20 to-purple-500/20', iconColor: 'text-pink-400', category: 'Social' },
    { id: 'all-24', name: 'LinkedIn', description: 'Professional network', icon: Linkedin, slug: 'linkedin', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Social' },
    { id: 'all-25', name: 'YouTube', description: 'Video platform', icon: Youtube, slug: 'youtube', gradient: 'from-red-500/20 to-orange-500/20', iconColor: 'text-red-400', category: 'Social' },
    { id: 'all-26', name: 'Spotify', description: 'Music streaming', icon: Music, slug: 'spotify', gradient: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-400', category: 'Media' },
    { id: 'all-27', name: 'Figma', description: 'Design tool', icon: Layers, slug: 'figma', gradient: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400', category: 'Design' },
    { id: 'all-28', name: 'Canva', description: 'Graphic design', icon: Image, slug: 'canva', gradient: 'from-cyan-500/20 to-blue-500/20', iconColor: 'text-cyan-400', category: 'Design' },
    { id: 'all-29', name: 'Zoom', description: 'Video conferencing', icon: Video, slug: 'zoom', gradient: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-400', category: 'Communication' },
    { id: 'all-30', name: 'Microsoft Teams', description: 'Team collaboration', icon: Users, slug: 'microsoftteams', gradient: 'from-purple-500/20 to-blue-500/20', iconColor: 'text-purple-400', category: 'Communication' },
    { id: 'all-31', name: 'Asana', description: 'Task management', icon: CheckSquare, slug: 'asana', gradient: 'from-pink-500/20 to-red-500/20', iconColor: 'text-pink-400', category: 'Productivity' },
    { id: 'all-32', name: 'Jira', description: 'Issue tracking', icon: Trello, slug: 'jira', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Development' },
    { id: 'all-33', name: 'MongoDB', description: 'NoSQL database', icon: Database, slug: 'mongodb', gradient: 'from-green-500/20 to-teal-500/20', iconColor: 'text-green-400', category: 'Database' },
    { id: 'all-34', name: 'Redis', description: 'Cache database', icon: Server, slug: 'redis', gradient: 'from-red-500/20 to-orange-500/20', iconColor: 'text-red-400', category: 'Database' },
    { id: 'all-35', name: 'Salesforce', description: 'CRM platform', icon: Cloud, slug: 'salesforce', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'CRM' },
    { id: 'all-36', name: 'Mailchimp', description: 'Email marketing', icon: Mail, slug: 'mailchimp', gradient: 'from-yellow-500/20 to-orange-500/20', iconColor: 'text-yellow-400', category: 'Marketing' },
    { id: 'all-37', name: 'Google Analytics', description: 'Website analytics', icon: BarChart3, slug: 'googleanalytics', gradient: 'from-orange-500/20 to-red-500/20', iconColor: 'text-orange-400', category: 'Analytics' },
    { id: 'all-38', name: 'Intercom', description: 'Customer messaging', icon: MessageSquare, slug: 'intercom', gradient: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-400', category: 'Support' },
    { id: 'all-39', name: 'Zendesk', description: 'Help desk software', icon: HelpCircle, slug: 'zendesk', gradient: 'from-green-500/20 to-teal-500/20', iconColor: 'text-green-400', category: 'Support' },
    { id: 'all-40', name: 'OpenAI', description: 'AI language models', icon: Zap, slug: 'openai', gradient: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400', category: 'AI' }
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
        <main className="flex h-full grow flex-col overflow-auto relative scrollbar-hide">
          <div className="relative pb-48">
            <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-4">
              <h1 className="text-4xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight mt-7">
                Integrations
              </h1>
            </div>

            {/* Configured Integrations - Only show if there are configured integrations */}
            {!integrationsLoading && configuredIntegrations.length > 0 && (
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
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {configuredIntegrations.map((integration) => {
                        const Icon = integration.icon;
                        return (
                          <div
                            key={integration.id}
                            className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-6 transition-all duration-300 text-foreground hover:shadow-lg"
                          >
                            <div className="flex items-start gap-4">
                              <div className="shrink-0">
                                {/* Since these are dynamic, we need to map them to slugs if we want logos, or store slug in DB. 
                                    For now, falling back to icon if no slug in DB data, but the DB data is empty currently. 
                                    If we had real data, we'd need slug there too. */}
                                <div className={`rounded-md bg-gradient-to-br ${integration.gradient} p-3`}>
                                  <Icon className={`h-6 w-6 ${integration.iconColor}`} />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
                                <p className="text-xs text-muted-foreground">{integration.description}</p>
                              </div>
                            </div>
                            
                            <div className="mt-4">
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setSelectedIntegrationName(integration.name);
                                  setComingSoonDialogOpen(true);
                                }}
                                className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
                              >
                                <Clock className="h-4 w-4" />
                                Coming Soon
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Discover Integrations */}
            <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-16">
              {/* Search bar - full width on mobile, positioned after header */}
              <div className="mb-6">
                <div className="hidden md:block mb-4">
                  <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">
                    Discover Integrations
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-2">
                    Popular integrations you can connect in seconds
                  </p>
                </div>
                <div className="w-full">
                  <SearchComponent value={searchQuery} onChange={setSearchQuery} placeholder="Search integrations..." />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredIntegrations.map((integration) => {
                  const Icon = integration.icon;
                  return (
                    <div
                      key={integration.id}
                      className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-6 transition-all duration-300 text-foreground hover:shadow-lg"
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                        {integration.slug ? (
                          <div className="p-2">
                            <img 
                              src={getLogoUrl(integration.slug)} 
                              alt={integration.name} 
                              className={`h-8 w-8 object-contain ${
                                !usesBrandfetch(integration.slug) && darkLogos.includes(integration.slug) ? 'dark:brightness-0 dark:invert' : ''
                              } ${
                                !usesBrandfetch(integration.slug) && lightModeBlackLogos.includes(integration.slug) ? 'brightness-0' : ''
                              }`} 
                            />
                          </div>
                        ) : (
                            <div className={`rounded-md bg-gradient-to-br ${integration.gradient} p-3`}>
                              <Icon className={`h-6 w-6 ${integration.iconColor}`} />
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
                          <p className="text-xs text-muted-foreground">{integration.description}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSelectedIntegrationName(integration.name);
                            setComingSoonDialogOpen(true);
                          }}
                          className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
                        >
                          <Clock className="h-4 w-4" />
                          Coming Soon
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Coming Soon Dialog */}
      <Dialog open={comingSoonDialogOpen} onOpenChange={setComingSoonDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Coming Soon</DialogTitle>
            <DialogDescription className="pt-2">
              {selectedIntegrationName ? (
                <>
                  This integration is coming soon. Our developers are working hard to integrate {selectedIntegrationName} into Runwise.
                </>
              ) : (
                <>
                  This integration is coming soon. Our developers are working hard to integrate it.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setComingSoonDialogOpen(false)}
              className="w-full sm:w-auto justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
            >
              Okay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
