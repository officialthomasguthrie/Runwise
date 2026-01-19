"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function IntegrationsPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
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
      'googlesheets', 'googleforms', 'slack', 'gmail', 'googlecalendar', 'postgresql', 'amazons3',
      'github', 'trello', 'notion', 'stripe', 'shopify', 'hubspot', 'discord',
      'twilio', 'sendgrid', 'zapier', 'dropbox', 'googledrive', 'airtable', 'x',
      'facebook', 'instagram', 'linkedin', 'youtube', 'spotify', 'figma', 'canva',
      'asana', 'mongodb', 'redis', 'salesforce', 'mailchimp', 'googleanalytics',
      'intercom', 'zendesk', 'openai', 'zoom', 'microsoftteams', 'paypal'
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
        light: `https://cdn.brandfetch.io/idZAyF9rlg/theme/light/symbol.svg?c=${clientId}`,
        dark: `https://cdn.brandfetch.io/idZAyF9rlg/w/800/h/784/theme/light/symbol.png?c=${clientId}`
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
      // Google Forms uses a custom logo URL provided by user
      'googleforms': { dark: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Google_Forms_logo_%282014-2020%29.svg/1489px-Google_Forms_logo_%282014-2020%29.svg.png' },
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
        dark: `https://cdn.brandfetch.io/idR3duQxYl/w/800/h/800/theme/light/symbol.png?c=${clientId}`
      },
      'paypal': { dark: `https://cdn.brandfetch.io/id-Wd4a4TS/theme/dark/symbol.svg?c=${clientId}` }
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
    { id: 'all-1', name: 'Google Sheets', description: 'Spreadsheet management', icon: FileSpreadsheet, slug: 'googlesheets', gradient: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-400', category: 'Productivity', serviceName: 'google-sheets' },
    { id: 'all-1b', name: 'Google Forms', description: 'Form submissions', icon: FileText, slug: 'googleforms', gradient: 'from-purple-500/20 to-violet-500/20', iconColor: 'text-purple-400', category: 'Productivity', serviceName: 'google-forms' },
    { id: 'all-2', name: 'Slack', description: 'Team communication', icon: Slack, slug: 'slack', gradient: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400', category: 'Communication', serviceName: 'slack' },
    { id: 'all-3', name: 'Gmail', description: 'Email service', icon: Mail, slug: 'gmail', gradient: 'from-red-500/20 to-orange-500/20', iconColor: 'text-red-400', category: 'Communication', serviceName: 'google-gmail' },
    { id: 'all-4', name: 'Google Calendar', description: 'Calendar events', icon: Calendar, slug: 'googlecalendar', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Productivity', serviceName: 'google-calendar' },
    { id: 'all-5', name: 'PostgreSQL', description: 'Database management', icon: Database, slug: 'postgresql', gradient: 'from-indigo-500/20 to-blue-500/20', iconColor: 'text-indigo-400', category: 'Database' },
    { id: 'all-6', name: 'AWS S3', description: 'Cloud storage', icon: Cloud, slug: 'amazons3', gradient: 'from-orange-500/20 to-yellow-500/20', iconColor: 'text-orange-400', category: 'Storage' },
    { id: 'all-8', name: 'GitHub', description: 'Code repositories', icon: Github, slug: 'github', gradient: 'from-gray-500/20 to-slate-500/20', iconColor: 'text-gray-400', category: 'Development', serviceName: 'github' },
    { id: 'all-9', name: 'Trello', description: 'Project boards', icon: Trello, slug: 'trello', gradient: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-400', category: 'Productivity', serviceName: 'trello' },
    { id: 'all-10', name: 'Notion', description: 'Note taking', icon: FileText, slug: 'notion', gradient: 'from-gray-500/20 to-zinc-500/20', iconColor: 'text-gray-400', category: 'Productivity', serviceName: 'notion' },
    { id: 'all-11', name: 'Stripe', description: 'Payment processing', icon: DollarSign, slug: 'stripe', gradient: 'from-purple-500/20 to-violet-500/20', iconColor: 'text-purple-400', category: 'Payment' },
    { id: 'all-12', name: 'Shopify', description: 'E-commerce platform', icon: ShoppingCart, slug: 'shopify', gradient: 'from-green-500/20 to-lime-500/20', iconColor: 'text-green-400', category: 'E-commerce' },
    { id: 'all-13', name: 'HubSpot', description: 'CRM platform', icon: Users, slug: 'hubspot', gradient: 'from-orange-500/20 to-red-500/20', iconColor: 'text-orange-400', category: 'CRM' },
    { id: 'all-14', name: 'Discord', description: 'Community chat', icon: MessageSquare, slug: 'discord', gradient: 'from-indigo-500/20 to-purple-500/20', iconColor: 'text-indigo-400', category: 'Communication' },
    { id: 'all-15', name: 'Twilio', description: 'SMS & voice', icon: Phone, slug: 'twilio', gradient: 'from-red-500/20 to-pink-500/20', iconColor: 'text-red-400', category: 'Communication' },
    { id: 'all-16', name: 'SendGrid', description: 'Email delivery', icon: Mail, slug: 'sendgrid', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Communication' },
    { id: 'all-17', name: 'Zapier', description: 'Workflow automation', icon: Zap, slug: 'zapier', gradient: 'from-orange-500/20 to-amber-500/20', iconColor: 'text-orange-400', category: 'Automation' },
    { id: 'all-18', name: 'Dropbox', description: 'File storage', icon: Box, slug: 'dropbox', gradient: 'from-blue-500/20 to-sky-500/20', iconColor: 'text-blue-400', category: 'Storage' },
    { id: 'all-19', name: 'Google Drive', description: 'Cloud storage', icon: Cloud, slug: 'googledrive', gradient: 'from-yellow-500/20 to-green-500/20', iconColor: 'text-yellow-400', category: 'Storage', serviceName: 'google-drive' },
    { id: 'all-20', name: 'Airtable', description: 'Database tables', icon: Database, slug: 'airtable', gradient: 'from-yellow-500/20 to-orange-500/20', iconColor: 'text-yellow-400', category: 'Database', serviceName: 'airtable' },
    { id: 'all-21', name: 'Twitter', description: 'Social media', icon: Twitter, slug: 'x', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Social', serviceName: 'twitter' },
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
    { id: 'all-40', name: 'OpenAI', description: 'AI language models', icon: Zap, slug: 'openai', gradient: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400', category: 'AI', serviceName: 'openai' },
    { id: 'all-41', name: 'PayPal', description: 'Payment processing', icon: CreditCard, slug: 'paypal', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Payment' }
  ];

  // Check if an integration is connected
  const isIntegrationConnected = (serviceName?: string): boolean => {
    if (!serviceName) return false;
    // For Shopify, check if any shopify-{shop} integration exists
    if (serviceName === 'shopify') {
      return configuredIntegrations.some(int => (int as any).serviceName?.startsWith('shopify-'));
    }
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

  // Helper function to safely parse JSON from response
  const safeParseJSON = async (response: Response): Promise<any> => {
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    // If response is empty, return error
    if (!text || text.trim().length === 0) {
      return { error: 'Empty response from server' };
    }
    
    // If response is not JSON, return error object with text
    if (!contentType || !contentType.includes('application/json')) {
      return { error: text || 'Invalid response format' };
    }
    
    // Try to parse as JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      // If parsing fails, return the text as error
      return { error: text || 'Failed to parse response' };
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load configured integrations from API
  const loadIntegrations = async () => {
    setIntegrationsLoading(true);
    try {
      console.log('[IntegrationsPage] Loading integrations...');
      const response = await fetch('/api/integrations/status');

      if (!response.ok) {
        console.error('[IntegrationsPage] Failed to fetch integrations:', response.statusText);
        setConfiguredIntegrations([]);
        return;
      }

      const data = await safeParseJSON(response);
      if (data.error) {
        throw new Error(data.error);
      }
      console.log('[IntegrationsPage] Integrations response:', data);
      const connectedServices = data.integrations || [];

      // Deduplicate by service name (keep first occurrence)
      const seenServices = new Set<string>();
      const uniqueServices = connectedServices.filter((integration: any) => {
        if (!integration.connected || !integration.service) return false;
        if (seenServices.has(integration.service)) {
          console.log('[IntegrationsPage] Duplicate service found, skipping:', integration.service);
          return false;
        }
        seenServices.add(integration.service);
        return true;
      });

      // Map service names to integration objects
      const mappedIntegrations = uniqueServices
        .map((integration: any) => {
          const serviceName = integration.service;
          if (!serviceName) return null; // Skip if service name is missing
          
          // For Shopify, normalize serviceName (shopify-{shop} -> shopify)
          const normalizedServiceName = serviceName.startsWith('shopify-') ? 'shopify' : serviceName;
          
          // Find matching integration by serviceName
          const matchingIntegration = allIntegrations.find(
            (int) => int.serviceName === normalizedServiceName
          );
          
          if (matchingIntegration) {
              return {
                id: `connected-${normalizedServiceName}`,
                name: matchingIntegration.name,
                description: matchingIntegration.description,
                icon: matchingIntegration.icon,
                slug: matchingIntegration.slug,
                gradient: matchingIntegration.gradient,
                iconColor: matchingIntegration.iconColor,
                status: 'active',
                serviceName: normalizedServiceName // Use normalized name for display
              };
          }
          
          // Fallback if no match found
          return {
            id: `connected-${normalizedServiceName}`,
            name: serviceNameMap[normalizedServiceName] || (normalizedServiceName ? normalizedServiceName.charAt(0).toUpperCase() + normalizedServiceName.slice(1) : 'Unknown Integration'),
            description: 'Connected integration',
            icon: Plug,
            gradient: 'from-gray-500/20 to-slate-500/20',
            iconColor: 'text-gray-400',
            status: 'active',
              serviceName: normalizedServiceName
          };
        })
        .filter((integration: any) => integration !== null);
        
      console.log('[IntegrationsPage] Mapped integrations:', mappedIntegrations);
      setConfiguredIntegrations(mappedIntegrations);
    } catch (e) {
      console.error('[IntegrationsPage] Unexpected error fetching integrations:', e);
      setConfiguredIntegrations([]);
    } finally {
      setIntegrationsLoading(false);
    }
  };

  useEffect(() => {
    // Don't load if auth is still loading
    if (loading) return;
    
    // If no user, set loading to false immediately
    if (!user) {
      setIntegrationsLoading(false);
      setConfiguredIntegrations([]);
      return;
    }

    loadIntegrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  // Handle OAuth callback URL parameters
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success || error) {
      console.log('[IntegrationsPage] OAuth callback detected:', { success, error });
      
      // Reload integrations after OAuth callback
      if (user && !loading) {
        loadIntegrations();
      }
      
      // Show user feedback
      if (success) {
        // Handle both old format (google_connected) and new format (sheets_connected, gmail_connected, etc.)
        let serviceName = success.replace('_connected', '');
        
        // If it's a Google service without the prefix, add it
        if (['sheets', 'gmail', 'calendar', 'drive'].includes(serviceName)) {
          serviceName = `google-${serviceName}`;
        }
        
        const displayName = serviceNameMap[serviceName] || serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
        alert(`Successfully connected ${displayName}!`);
      } else if (error) {
        const errorMessages: Record<string, string> = {
          'oauth_error': 'OAuth authentication failed',
          'missing_code': 'OAuth callback missing authorization code',
          'invalid_state': 'OAuth state validation failed (possible CSRF attack)',
          'no_user': 'User not found in OAuth callback',
          'unauthorized': 'Unauthorized access',
          'token_exchange_failed': 'Failed to exchange OAuth code for tokens',
          'callback_error': 'An error occurred during OAuth callback'
        };
        const message = errorMessages[error] || `Connection failed: ${error}`;
        alert(`Error: ${message}`);
      }
      
      // Clear URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('success');
      newUrl.searchParams.delete('error');
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, user, loading, router]);

  // Service name mapping (internal service name -> integration display name)
  const serviceNameMap: Record<string, string> = {
    'google-sheets': 'Google Sheets',
    'google-gmail': 'Gmail',
    'google-calendar': 'Google Calendar',
    'google-drive': 'Google Drive',
    'google': 'Google', // Legacy fallback
    'slack': 'Slack',
    'github': 'GitHub',
    'notion': 'Notion',
    'airtable': 'Airtable',
    'trello': 'Trello',
    'openai': 'OpenAI',
    'twitter': 'Twitter/X',
  };

  // Handle connect
  const handleConnect = (serviceName: string) => {
    // OAuth services redirect to OAuth flow
    // Check if it's a Google service (google-sheets, google-gmail, etc.)
    const isGoogleService = serviceName.startsWith('google-');
    const baseService = isGoogleService ? 'google' : serviceName;
    const oauthServices = ['google', 'slack', 'github', 'notion', 'airtable', 'trello', 'shopify', 'hubspot', 'asana', 'jira'];
    
    if (oauthServices.includes(baseService)) {
      // Shopify requires shop parameter - prompt user for shop domain
      if (baseService === 'shopify') {
        const shop = prompt('Enter your Shopify shop domain (e.g., "mystore" or "mystore.myshopify.com"):');
        if (!shop || !shop.trim()) {
          return; // User cancelled or didn't enter shop
        }
        const url = `/api/auth/connect/${baseService}?shop=${encodeURIComponent(shop.trim())}`;
        window.location.href = url;
        return;
      }
      
      // For Google services, pass the specific service name as a query parameter
      const url = isGoogleService 
        ? `/api/auth/connect/${baseService}?service=${encodeURIComponent(serviceName)}`
        : `/api/auth/connect/${serviceName}`;
      window.location.href = url;
    } else {
      // Credential-based services open new window popup
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      const popup = window.open(
        `/integrations/connect?service=${encodeURIComponent(serviceName)}`,
        'ConnectIntegration',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
      
      // Listen for connection success
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'integration-connected' && event.data.service === serviceName) {
      // Reload integrations
          loadIntegrations();
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'integration-connection-cancelled') {
          window.removeEventListener('message', handleMessage);
    }
  };

      window.addEventListener('message', handleMessage);
    }
  };


  // Handle disconnect
  const handleDisconnect = async (serviceName: string) => {
    if (!serviceName) return;
    
    console.log('[IntegrationsPage] Disconnecting:', serviceName);
    setDisconnectingService(serviceName);
    try {
      const response = await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName })
      });

      if (!response.ok) {
        const error = await safeParseJSON(response);
        console.error('[IntegrationsPage] Disconnect error:', error);
        throw new Error(error.error || error.message || 'Failed to disconnect');
      }

      console.log('[IntegrationsPage] Disconnect successful, reloading integrations...');
      
      // Reload integrations by calling loadIntegrations
      await loadIntegrations();
      
      console.log('[IntegrationsPage] Integrations reloaded after disconnect');
    } catch (error: any) {
      console.error('[IntegrationsPage] Error disconnecting integration:', error);
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

            {/* Configured Integrations - Always show, even if empty */}
            <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-16">
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">
                  Configured Integrations
                </h2>
                <p className="text-sm md:text-base text-muted-foreground mt-2">
                  Your active integrations and connections
                </p>
              </div>

              {integrationsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-md bg-gray-300 dark:bg-[#303030] animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-28 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                          <div className="h-3 w-full bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                          <div className="h-3 w-4/5 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-center">
                        <div className="h-8 w-full bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : configuredIntegrations.length > 0 ? (
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
                                  className={`${(integration as any).slug === 'openai' ? 'h-10 w-10' : 'h-8 w-8'} object-contain ${
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
                        
                        <div className="mt-4 flex items-center justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => serviceName && handleDisconnect(serviceName)}
                            disabled={disconnectingService === serviceName}
                            className="w-full h-8 text-xs border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 dark:hover:border-red-800/50"
                          >
                            {disconnectingService === serviceName ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Disconnecting...
                              </>
                            ) : (
                              'Disconnect'
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-stone-200 dark:border-white/20 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl p-8">
                  <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-muted/50 dark:bg-gray-500/20">
                      <Plug className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">No configured integrations</h3>
                      <p className="text-xs text-muted-foreground">
                        Connect your first integration below to get started
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Discover Integrations */}
            <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-16">
              <div className="mb-6">
                <div className="mb-4">
                  <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">
                    Discover Integrations
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-2">
                    Popular integrations you can connect in seconds
                  </p>
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
                              className={`${integration.slug === 'openai' ? 'h-10 w-10' : 'h-8 w-8'} object-contain ${
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

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen bg-background">
        <CollapsibleSidebar />
        <div className="flex-1 flex-col overflow-hidden">
          <BlankHeader />
          <main className="flex h-full grow flex-col overflow-auto relative scrollbar-hide">
            <div className="relative pb-12">
              <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-4">
                <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight mt-7 mb-8">
                  Integrations
                </h1>
                <div className="text-sm text-muted-foreground">Loading...</div>
              </div>
            </div>
          </main>
        </div>
      </div>
    }>
      <IntegrationsPageContent />
    </Suspense>
  );
}
