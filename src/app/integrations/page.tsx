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
  Code, Terminal, Package, Layers, CheckSquare, BarChart3, HelpCircle, Search, Plug, X, Loader2
} from "lucide-react";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [integrationsLoading, setIntegrationsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [comingSoonDialogOpen, setComingSoonDialogOpen] = useState<boolean>(false);
  const [selectedIntegrationName, setSelectedIntegrationName] = useState<string>("");
  const [credentialDialogOpen, setCredentialDialogOpen] = useState<boolean>(false);
  const [selectedServiceForCredentials, setSelectedServiceForCredentials] = useState<string | null>(null);
  const [credentialInput, setCredentialInput] = useState<string>('');
  const [credentialInput2, setCredentialInput2] = useState<string>('');
  const [savingCredential, setSavingCredential] = useState<boolean>(false);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [disconnectingService, setDisconnectingService] = useState<string | null>(null);

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
    { id: 'all-1', name: 'Google Sheets', description: 'Spreadsheet management', icon: FileSpreadsheet, slug: 'googlesheets', gradient: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-400', category: 'Productivity', serviceName: 'google' },
    { id: 'all-2', name: 'Slack', description: 'Team communication', icon: Slack, slug: 'slack', gradient: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400', category: 'Communication', serviceName: 'slack' },
    { id: 'all-3', name: 'Gmail', description: 'Email service', icon: Mail, slug: 'gmail', gradient: 'from-red-500/20 to-orange-500/20', iconColor: 'text-red-400', category: 'Communication', serviceName: 'google' },
    { id: 'all-4', name: 'Google Calendar', description: 'Calendar events', icon: Calendar, slug: 'googlecalendar', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Productivity', serviceName: 'google' },
    { id: 'all-5', name: 'PostgreSQL', description: 'Database management', icon: Database, slug: 'postgresql', gradient: 'from-indigo-500/20 to-blue-500/20', iconColor: 'text-indigo-400', category: 'Database' },
    { id: 'all-6', name: 'AWS S3', description: 'Cloud storage', icon: Cloud, slug: 'amazons3', gradient: 'from-orange-500/20 to-yellow-500/20', iconColor: 'text-orange-400', category: 'Storage' },
    { id: 'all-8', name: 'GitHub', description: 'Code repositories', icon: Github, slug: 'github', gradient: 'from-gray-500/20 to-slate-500/20', iconColor: 'text-gray-400', category: 'Development', serviceName: 'github' },
    { id: 'all-9', name: 'Trello', description: 'Project boards', icon: Trello, slug: 'trello', gradient: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-400', category: 'Productivity', serviceName: 'trello' },
    { id: 'all-10', name: 'Notion', description: 'Note taking', icon: FileText, slug: 'notion', gradient: 'from-gray-500/20 to-zinc-500/20', iconColor: 'text-gray-400', category: 'Productivity', serviceName: 'notion' },
    { id: 'all-11', name: 'Stripe', description: 'Payment processing', icon: DollarSign, slug: 'stripe', gradient: 'from-purple-500/20 to-violet-500/20', iconColor: 'text-purple-400', category: 'Finance' },
    { id: 'all-12', name: 'Shopify', description: 'E-commerce platform', icon: ShoppingCart, slug: 'shopify', gradient: 'from-green-500/20 to-lime-500/20', iconColor: 'text-green-400', category: 'E-commerce' },
    { id: 'all-13', name: 'HubSpot', description: 'CRM platform', icon: Users, slug: 'hubspot', gradient: 'from-orange-500/20 to-red-500/20', iconColor: 'text-orange-400', category: 'CRM' },
    { id: 'all-14', name: 'Discord', description: 'Community chat', icon: MessageSquare, slug: 'discord', gradient: 'from-indigo-500/20 to-purple-500/20', iconColor: 'text-indigo-400', category: 'Communication' },
    { id: 'all-15', name: 'Twilio', description: 'SMS & voice', icon: Phone, slug: 'twilio', gradient: 'from-red-500/20 to-pink-500/20', iconColor: 'text-red-400', category: 'Communication' },
    { id: 'all-16', name: 'SendGrid', description: 'Email delivery', icon: Mail, slug: 'sendgrid', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Communication' },
    { id: 'all-17', name: 'Zapier', description: 'Workflow automation', icon: Zap, slug: 'zapier', gradient: 'from-orange-500/20 to-amber-500/20', iconColor: 'text-orange-400', category: 'Automation' },
    { id: 'all-18', name: 'Dropbox', description: 'File storage', icon: Box, slug: 'dropbox', gradient: 'from-blue-500/20 to-sky-500/20', iconColor: 'text-blue-400', category: 'Storage' },
    { id: 'all-19', name: 'Google Drive', description: 'Cloud storage', icon: Cloud, slug: 'googledrive', gradient: 'from-yellow-500/20 to-green-500/20', iconColor: 'text-yellow-400', category: 'Storage', serviceName: 'google' },
    { id: 'all-20', name: 'Airtable', description: 'Database tables', icon: Database, slug: 'airtable', gradient: 'from-yellow-500/20 to-orange-500/20', iconColor: 'text-yellow-400', category: 'Database', serviceName: 'airtable' },
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
    { id: 'all-40', name: 'OpenAI', description: 'AI language models', icon: Zap, slug: 'openai', gradient: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400', category: 'AI', serviceName: 'openai' }
  ];

  // Check if an integration is connected
  const isIntegrationConnected = (serviceName?: string): boolean => {
    if (!serviceName) return false;
    return configuredIntegrations.some(int => (int as any).serviceName === serviceName);
  };

  // Filter integrations based on search query
  const filteredIntegrations = allIntegrations.filter(integration =>
    integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    integration.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    integration.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter out connected integrations from the "Discover Integrations" list
  const availableIntegrations = filteredIntegrations
    .filter(integration => 
      !integration.serviceName || !isIntegrationConnected(integration.serviceName)
    )
    // Sort: integrations with serviceName (ready to connect) first, then "Coming Soon" ones
    .sort((a, b) => {
      const aHasService = !!a.serviceName;
      const bHasService = !!b.serviceName;
      if (aHasService && !bHasService) return -1; // a comes first
      if (!aHasService && bHasService) return 1;  // b comes first
      return 0; // keep original order if both have or both don't have serviceName
    });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load configured integrations from API
  useEffect(() => {
    // Don't load if auth is still loading
    if (loading) return;
    
    // If no user, set loading to false immediately
    if (!user) {
      setIntegrationsLoading(false);
      setConfiguredIntegrations([]);
      return;
    }

    let cancelled = false;

    const loadIntegrations = async () => {
      setIntegrationsLoading(true);
      try {
        const response = await fetch('/api/integrations/status');
        if (cancelled) return;

        if (!response.ok) {
          console.error('Failed to fetch integrations:', response.statusText);
          setConfiguredIntegrations([]);
          return;
        }

        const data = await response.json();
        const connectedServices = data.integrations || [];

        // Map service names to integration objects
        const mappedIntegrations = connectedServices
          .filter((integration: any) => integration.connected && integration.service)
          .map((integration: any) => {
            const serviceName = integration.service;
            if (!serviceName) {
              console.warn('Integration missing service name:', integration);
              return null;
            }
            
            // Find matching integration by serviceName
            const matchingIntegration = allIntegrations.find(
              (int) => int.serviceName === serviceName
            );
            
            if (matchingIntegration) {
              return {
                id: `connected-${serviceName}`,
                name: matchingIntegration.name,
                description: matchingIntegration.description,
                icon: matchingIntegration.icon,
                slug: matchingIntegration.slug,
                gradient: matchingIntegration.gradient,
                iconColor: matchingIntegration.iconColor,
                status: 'active',
                serviceName: serviceName
              };
            }
            
            // Fallback if no match found
            return {
              id: `connected-${serviceName}`,
              name: serviceNameMap[serviceName] || (serviceName ? serviceName.charAt(0).toUpperCase() + serviceName.slice(1) : 'Unknown'),
              description: 'Connected integration',
              icon: Plug,
              gradient: 'from-gray-500/20 to-slate-500/20',
              iconColor: 'text-gray-400',
              status: 'active',
              serviceName: serviceName
            };
          })
          .filter((item: any) => item !== null); // Remove null entries
          
        if (!cancelled) {
          setConfiguredIntegrations(mappedIntegrations);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Unexpected error fetching integrations:', e);
          setConfiguredIntegrations([]);
        }
      } finally {
        if (!cancelled) {
          setIntegrationsLoading(false);
        }
      }
    };

    loadIntegrations();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  // Refresh integrations when returning from OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('integration_connected') || urlParams.get('success')) {
      // Reload integrations after a short delay
      setTimeout(() => {
        const loadIntegrations = async () => {
          try {
            const response = await fetch('/api/integrations/status');
            if (!response.ok) return;
            
            const data = await response.json();
            const connectedServices = data.integrations || [];
            
            const mappedIntegrations = connectedServices
              .filter((integration: any) => integration.connected && integration.service)
              .map((integration: any) => {
                const serviceName = integration.service;
                if (!serviceName) {
                  console.warn('Integration missing service name:', integration);
                  return null;
                }
                
                const matchingIntegration = allIntegrations.find(
                  (int) => int.serviceName === serviceName
                );
                
                if (matchingIntegration) {
                  return {
                    id: `connected-${serviceName}`,
                    name: matchingIntegration.name,
                    description: matchingIntegration.description,
                    icon: matchingIntegration.icon,
                    slug: matchingIntegration.slug,
                    gradient: matchingIntegration.gradient,
                    iconColor: matchingIntegration.iconColor,
                    status: 'active',
                    serviceName: serviceName
                  };
                }
                
                return {
                  id: `connected-${serviceName}`,
                  name: serviceNameMap[serviceName] || (serviceName ? serviceName.charAt(0).toUpperCase() + serviceName.slice(1) : 'Unknown'),
                  description: 'Connected integration',
                  icon: Plug,
                  gradient: 'from-gray-500/20 to-slate-500/20',
                  iconColor: 'text-gray-400',
                  status: 'active',
                  serviceName: serviceName
                };
              })
              .filter((item: any) => item !== null); // Remove null entries
            
            setConfiguredIntegrations(mappedIntegrations);
            
            // Clear the parameter from URL
            urlParams.delete('integration_connected');
            urlParams.delete('success');
            window.history.replaceState({}, '', window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : ''));
          } catch (error) {
            console.error('Error refreshing integrations:', error);
          }
        };
        
        loadIntegrations();
      }, 1000);
    }
  }, []);

  // Service name mapping (internal service name -> integration display name)
  const serviceNameMap: Record<string, string> = {
    'google': 'Google Sheets',
    'slack': 'Slack',
    'github': 'GitHub',
    'notion': 'Notion',
    'airtable': 'Airtable',
    'trello': 'Trello',
    'openai': 'OpenAI',
  };

  // Handle connect
  const handleConnect = (serviceName: string) => {
    // OAuth services redirect to OAuth flow
    const oauthServices = ['google', 'slack', 'github', 'discord', 'twitter', 'paypal'];
    if (oauthServices.includes(serviceName)) {
      // Get current URL to return to after OAuth
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `/api/auth/connect/${serviceName}?returnUrl=${returnUrl}`;
    } else {
      // Credential-based services open dialog
      setSelectedServiceForCredentials(serviceName);
      setCredentialDialogOpen(true);
      setCredentialInput('');
      setCredentialInput2('');
      setCredentialError(null);
    }
  };

  // Handle save credential
  const handleSaveCredential = async () => {
    if (!selectedServiceForCredentials) return;

    setSavingCredential(true);
    setCredentialError(null);

    try {
      if (selectedServiceForCredentials === 'trello') {
        // Trello needs both API key and token
        if (!credentialInput.trim() || !credentialInput2.trim()) {
          setCredentialError('Both API key and token are required');
          setSavingCredential(false);
          return;
        }

        // Save API key
        const keyResponse = await fetch('/api/integrations/store-credential', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceName: 'trello',
            credentialType: 'api_key',
            credentialValue: credentialInput.trim()
          })
        });

        if (!keyResponse.ok) {
          const error = await keyResponse.json();
          throw new Error(error.error || 'Failed to save API key');
        }

        // Save token
        const tokenResponse = await fetch('/api/integrations/store-credential', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceName: 'trello',
            credentialType: 'token',
            credentialValue: credentialInput2.trim()
          })
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.json();
          throw new Error(error.error || 'Failed to save token');
        }
      } else {
        // Notion, Airtable use API token, OpenAI uses API key
        if (!credentialInput.trim()) {
          setCredentialError(selectedServiceForCredentials === 'openai' ? 'API key is required' : 'Token is required');
          setSavingCredential(false);
          return;
        }

        const credentialType = selectedServiceForCredentials === 'openai' ? 'api_key' : 'api_token';
        const response = await fetch('/api/integrations/store-credential', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceName: selectedServiceForCredentials,
            credentialType: credentialType,
            credentialValue: credentialInput.trim()
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save token');
        }
      }

      // Close dialog and reload integrations
      setCredentialDialogOpen(false);
      setSelectedServiceForCredentials(null);
      
      // Reload integrations
      const statusResponse = await fetch('/api/integrations/status');
      if (statusResponse.ok) {
        const data = await statusResponse.json();
        const connectedServices = data.integrations || [];
        const mappedIntegrations = connectedServices
          .filter((integration: any) => integration.connected)
          .map((integration: any) => {
            const service = integration.service;
            const matchingIntegration = allIntegrations.find(
              (int) => int.serviceName === service
            );
            
            if (matchingIntegration) {
              return {
                id: `connected-${service}`,
                name: matchingIntegration.name,
                description: matchingIntegration.description,
                icon: matchingIntegration.icon,
                slug: matchingIntegration.slug,
                gradient: matchingIntegration.gradient,
                iconColor: matchingIntegration.iconColor,
                status: 'active',
                serviceName: service
              };
            }
            
            return {
              id: `connected-${service}`,
              name: serviceNameMap[service] || service.charAt(0).toUpperCase() + service.slice(1),
              description: 'Connected integration',
              icon: Plug,
              gradient: 'from-gray-500/20 to-slate-500/20',
              iconColor: 'text-gray-400',
              status: 'active',
              serviceName: service
            };
          });
        setConfiguredIntegrations(mappedIntegrations);
      }
    } catch (error: any) {
      console.error('Error saving credential:', error);
      setCredentialError(error.message || 'Failed to save credentials');
    } finally {
      setSavingCredential(false);
    }
  };

  const getCredentialPlaceholder = () => {
    if (selectedServiceForCredentials === 'notion') {
      return 'secret_... or ntn_...';
    } else if (selectedServiceForCredentials === 'airtable') {
      return 'pat...';
    } else if (selectedServiceForCredentials === 'trello') {
      return 'API Key';
    } else if (selectedServiceForCredentials === 'openai') {
      return 'sk-...';
    }
    return 'Enter your API token';
  };

  const getCredentialLabel = () => {
    if (selectedServiceForCredentials === 'notion') {
      return 'Notion API Token';
    } else if (selectedServiceForCredentials === 'airtable') {
      return 'Airtable Personal Access Token';
    } else if (selectedServiceForCredentials === 'trello') {
      return 'Trello API Key';
    } else if (selectedServiceForCredentials === 'openai') {
      return 'OpenAI API Key';
    }
    return 'API Token';
  };

  // Handle disconnect
  const handleDisconnect = async (serviceName: string) => {
    if (!serviceName) return;
    
    setDisconnectingService(serviceName);
    try {
      const response = await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect');
      }

      // Reload integrations
      const statusResponse = await fetch('/api/integrations/status');
      if (statusResponse.ok) {
        const data = await statusResponse.json();
        const connectedServices = data.integrations || [];
        const mappedIntegrations = connectedServices
          .filter((integration: any) => integration.connected)
          .map((integration: any) => {
            const service = integration.service;
            const matchingIntegration = allIntegrations.find(
              (int) => int.serviceName === service
            );
            
            if (matchingIntegration) {
              return {
                id: `connected-${service}`,
                name: matchingIntegration.name,
                description: matchingIntegration.description,
                icon: matchingIntegration.icon,
                slug: matchingIntegration.slug,
                gradient: matchingIntegration.gradient,
                iconColor: matchingIntegration.iconColor,
                status: 'active',
                serviceName: service
              };
            }
            
            return {
              id: `connected-${service}`,
              name: serviceNameMap[service] || service.charAt(0).toUpperCase() + service.slice(1),
              description: 'Connected integration',
              icon: Plug,
              gradient: 'from-gray-500/20 to-slate-500/20',
              iconColor: 'text-gray-400',
              status: 'active',
              serviceName: service
            };
          });
        setConfiguredIntegrations(mappedIntegrations);
      }
    } catch (error: any) {
      console.error('Error disconnecting integration:', error);
      alert(error.message || 'Failed to disconnect integration');
    } finally {
      setDisconnectingService(null);
    }
  };

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
                        const serviceName = (integration as any).serviceName;
                        return (
                          <div
                            key={integration.id}
                            className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-6 transition-all duration-300 text-foreground hover:shadow-lg"
                          >
                            <div className="flex items-start gap-4">
                              <div className="shrink-0">
                                {(integration as any).slug ? (
                                  <div className="p-2">
                                    <img 
                                      src={getLogoUrl((integration as any).slug)} 
                                      alt={integration.name} 
                                      className={`h-8 w-8 object-contain ${
                                        !usesBrandfetch((integration as any).slug) && darkLogos.includes((integration as any).slug) ? 'dark:brightness-0 dark:invert' : ''
                                      } ${
                                        !usesBrandfetch((integration as any).slug) && lightModeBlackLogos.includes((integration as any).slug) ? 'brightness-0' : ''
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
                            
                            <div className="mt-4 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                                <Check className="h-3 w-3" />
                                <span>Connected</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => serviceName && handleDisconnect(serviceName)}
                                disabled={disconnectingService === serviceName}
                                className="h-7 px-2 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                {disconnectingService === serviceName ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Disconnecting...
                                  </>
                                ) : (
                                  <>
                                    <X className="h-3 w-3 mr-1" />
                                    Disconnect
                                  </>
                                )}
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
                {availableIntegrations.map((integration) => {
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
                        {integration.serviceName && isIntegrationConnected(integration.serviceName) ? (
                          <Button
                            variant="ghost"
                            disabled
                            className="w-full justify-center backdrop-blur-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400 cursor-not-allowed"
                          >
                            <Check className="h-4 w-4 mr-1.5" />
                            Connected
                          </Button>
                        ) : integration.serviceName ? (
                          <Button
                            variant="ghost"
                            onClick={() => handleConnect(integration.serviceName!)}
                            className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
                          >
                            <Plug className="h-4 w-4 mr-1.5" />
                            Connect
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedIntegrationName(integration.name);
                              setComingSoonDialogOpen(true);
                            }}
                            className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
                          >
                            <Clock className="h-4 w-4 mr-1.5" />
                            Coming Soon
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Credential Input Dialog */}
      <Dialog open={credentialDialogOpen} onOpenChange={setCredentialDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {selectedServiceForCredentials && serviceNameMap[selectedServiceForCredentials] ? serviceNameMap[selectedServiceForCredentials] : selectedServiceForCredentials}</DialogTitle>
            <DialogDescription className="pt-2">
              Enter your {getCredentialLabel()} to connect this integration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedServiceForCredentials === 'trello' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Trello API Key
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your Trello API Key"
                    value={credentialInput}
                    onChange={(e) => setCredentialInput(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Trello Token
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your Trello Token"
                    value={credentialInput2}
                    onChange={(e) => setCredentialInput2(e.target.value)}
                    className="w-full"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {getCredentialLabel()}
                </label>
                <Input
                  type="text"
                  placeholder={getCredentialPlaceholder()}
                  value={credentialInput}
                  onChange={(e) => setCredentialInput(e.target.value)}
                  className="w-full"
                />
              </div>
            )}
            {credentialError && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {credentialError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCredentialDialogOpen(false);
                setSelectedServiceForCredentials(null);
                setCredentialInput('');
                setCredentialInput2('');
                setCredentialError(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCredential}
              disabled={savingCredential}
              className="w-full sm:w-auto"
            >
              {savingCredential ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
