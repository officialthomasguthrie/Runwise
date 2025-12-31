"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase-client";
import {
  Slack, FileSpreadsheet, Mail, Calendar, Database, Cloud, Check, Edit2, Webhook, Github,
  Trello, FileText, DollarSign, ShoppingCart, Users, MessageSquare, Bell, Zap,
  Box, Droplet, Twitter, Facebook, Instagram, Linkedin, Youtube, Music,
  Camera, Image, Video, Mic, Phone, Clock, MapPin, Compass,
  CreditCard, ShieldCheck, Lock, Key, Server, HardDrive, Wifi, Globe,
  Code, Terminal, Package, Layers, CheckSquare, BarChart3, HelpCircle, Search, Plug, X, Loader2
} from "lucide-react";
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
import SearchComponent from "@/components/ui/animated-glowing-search-bar";

export function IntegrationsSettings() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [comingSoonDialogOpen, setComingSoonDialogOpen] = useState<boolean>(false);
  const [selectedIntegrationName, setSelectedIntegrationName] = useState<string>("");
  const [configuredIntegrations, setConfiguredIntegrations] = useState<Array<{
  id: string;
  name: string;
  description: string;
    icon: any;
    slug?: string;
    gradient: string;
    iconColor: string;
    status: string;
    serviceName?: string; // Internal service name (e.g., 'google', 'slack')
  }>>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState<boolean>(true);
  const [disconnectingService, setDisconnectingService] = useState<string | null>(null);
  const [credentialDialogOpen, setCredentialDialogOpen] = useState<boolean>(false);
  const [selectedServiceForCredentials, setSelectedServiceForCredentials] = useState<string | null>(null);
  const [credentialInput, setCredentialInput] = useState<string>('');
  const [credentialInput2, setCredentialInput2] = useState<string>('');
  const [savingCredential, setSavingCredential] = useState<boolean>(false);
  const [credentialError, setCredentialError] = useState<string | null>(null);

  // Fix hydration mismatch for theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // List of integration slugs that have black or very dark logos (should be inverted to white in dark mode)
  const darkLogos = [
    'github',
    'notion',
    'x',
    'openai',
    'postgresql',
    'slack'
  ];
  
  const lightModeBlackLogos = [
    'openai'
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

  // Helper function to get logo URL
  const getLogoUrl = (slug: string): string => {
    const isDark = mounted && theme === 'dark';
    const clientId = '1dxbfHSJFAPEGdCLU4o5B';
    
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
      if (isDark && logoConfig.dark) {
        return logoConfig.dark;
      } else if (!isDark && logoConfig.light) {
        return logoConfig.light;
      } else if (logoConfig.dark) {
        return logoConfig.dark;
      }
    }
    
    return `https://cdn.simpleicons.org/${slug}`;
  };

  // Service name mapping (internal service name -> integration display name)
  const serviceNameMap: Record<string, string> = {
    'google': 'Google Sheets',
    'slack': 'Slack',
    'github': 'GitHub',
    'notion': 'Notion',
    'airtable': 'Airtable',
    'trello': 'Trello',
    'openai': 'OpenAI',
    'sendgrid': 'SendGrid',
    'twilio': 'Twilio',
    'stripe': 'Stripe',
    'discord': 'Discord',
    'twitter': 'Twitter/X',
  };

  // All available integrations (with serviceName field added to some)
  const allIntegrations: Array<{
    id: string;
    name: string;
    description: string;
    icon: any;
    slug?: string;
    gradient: string;
    iconColor: string;
    category: string;
    serviceName?: string;
  }> = [
    { id: 'all-1', name: 'Google Sheets', description: 'Spreadsheet management', icon: FileSpreadsheet, slug: 'googlesheets', gradient: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-400', category: 'Productivity', serviceName: 'google' },
    { id: 'all-2', name: 'Slack', description: 'Team communication', icon: Slack, slug: 'slack', gradient: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400', category: 'Communication', serviceName: 'slack' },
    { id: 'all-3', name: 'Gmail', description: 'Email service', icon: Mail, slug: 'gmail', gradient: 'from-red-500/20 to-orange-500/20', iconColor: 'text-red-400', category: 'Communication', serviceName: 'google' },
    { id: 'all-4', name: 'Google Calendar', description: 'Calendar events', icon: Calendar, slug: 'googlecalendar', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Productivity', serviceName: 'google' },
    { id: 'all-5', name: 'PostgreSQL', description: 'Database management', icon: Database, slug: 'postgresql', gradient: 'from-indigo-500/20 to-blue-500/20', iconColor: 'text-indigo-400', category: 'Database' },
    { id: 'all-6', name: 'AWS S3', description: 'Cloud storage', icon: Cloud, slug: 'amazons3', gradient: 'from-orange-500/20 to-yellow-500/20', iconColor: 'text-orange-400', category: 'Storage' },
    { id: 'all-8', name: 'GitHub', description: 'Code repositories', icon: Github, slug: 'github', gradient: 'from-gray-500/20 to-slate-500/20', iconColor: 'text-gray-400', category: 'Development', serviceName: 'github' },
    { id: 'all-9', name: 'Trello', description: 'Project boards', icon: Trello, slug: 'trello', gradient: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-400', category: 'Productivity', serviceName: 'trello' },
    { id: 'all-10', name: 'Notion', description: 'Note taking', icon: FileText, slug: 'notion', gradient: 'from-gray-500/20 to-zinc-500/20', iconColor: 'text-gray-400', category: 'Productivity', serviceName: 'notion' },
    { id: 'all-11', name: 'Stripe', description: 'Payment processing', icon: DollarSign, slug: 'stripe', gradient: 'from-purple-500/20 to-violet-500/20', iconColor: 'text-purple-400', category: 'Finance', serviceName: 'stripe' },
    { id: 'all-12', name: 'Shopify', description: 'E-commerce platform', icon: ShoppingCart, slug: 'shopify', gradient: 'from-green-500/20 to-lime-500/20', iconColor: 'text-green-400', category: 'E-commerce' },
    { id: 'all-13', name: 'HubSpot', description: 'CRM platform', icon: Users, slug: 'hubspot', gradient: 'from-orange-500/20 to-red-500/20', iconColor: 'text-orange-400', category: 'CRM' },
    { id: 'all-14', name: 'Discord', description: 'Community chat', icon: MessageSquare, slug: 'discord', gradient: 'from-indigo-500/20 to-purple-500/20', iconColor: 'text-indigo-400', category: 'Communication', serviceName: 'discord' },
    { id: 'all-15', name: 'Twilio', description: 'SMS & voice', icon: Phone, slug: 'twilio', gradient: 'from-red-500/20 to-pink-500/20', iconColor: 'text-red-400', category: 'Communication', serviceName: 'twilio' },
    { id: 'all-16', name: 'SendGrid', description: 'Email delivery', icon: Mail, slug: 'sendgrid', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', category: 'Communication', serviceName: 'sendgrid' },
    { id: 'all-17', name: 'Zapier', description: 'Workflow automation', icon: Zap, slug: 'zapier', gradient: 'from-orange-500/20 to-amber-500/20', iconColor: 'text-orange-400', category: 'Automation' },
    { id: 'all-18', name: 'Dropbox', description: 'File storage', icon: Box, slug: 'dropbox', gradient: 'from-blue-500/20 to-sky-500/20', iconColor: 'text-blue-400', category: 'Storage' },
    { id: 'all-19', name: 'Google Drive', description: 'Cloud storage', icon: Cloud, slug: 'googledrive', gradient: 'from-yellow-500/20 to-green-500/20', iconColor: 'text-yellow-400', category: 'Storage', serviceName: 'google' },
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
    { id: 'all-40', name: 'OpenAI', description: 'AI language models', icon: Zap, slug: 'openai', gradient: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400', category: 'AI', serviceName: 'openai' }
  ];

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
          .filter((integration: any) => integration.connected)
          .map((integration: any) => {
            const serviceName = integration.service;
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
              name: serviceNameMap[serviceName] || serviceName.charAt(0).toUpperCase() + serviceName.slice(1),
              description: 'Connected integration',
              icon: Plug,
              gradient: 'from-gray-500/20 to-slate-500/20',
              iconColor: 'text-gray-400',
              status: 'active',
              serviceName: serviceName
            };
          });
          
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

  // Check if an integration is connected
  const isIntegrationConnected = (serviceName?: string): boolean => {
    if (!serviceName) return false;
    return configuredIntegrations.some(int => int.serviceName === serviceName);
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

  // Handle connect
  const handleConnect = (serviceName: string) => {
    // OAuth services redirect to OAuth flow
    const oauthServices = ['google', 'slack', 'github'];
    if (oauthServices.includes(serviceName)) {
      window.location.href = `/api/auth/connect/${serviceName}`;
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

  return (
    <>
      {/* Configured Integrations Section */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Configured Integrations
            </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your active integrations and connections
            </p>
        </div>

        {integrationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading integrations...</div>
          </div>
        ) : configuredIntegrations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {configuredIntegrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <div
                  key={integration.id}
                  className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-4 transition-all duration-300 text-foreground hover:shadow-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      {integration.slug ? (
                        <div className="p-1.5">
                          <img 
                            src={getLogoUrl(integration.slug)} 
                            alt={integration.name} 
                            className={`h-6 w-6 object-contain ${
                              !usesBrandfetch(integration.slug) && darkLogos.includes(integration.slug) ? 'dark:brightness-0 dark:invert' : ''
                            } ${
                              !usesBrandfetch(integration.slug) && lightModeBlackLogos.includes(integration.slug) ? 'brightness-0' : ''
                            }`} 
                          />
                        </div>
                      ) : (
                        <div className={`rounded-md bg-gradient-to-br ${integration.gradient} p-2`}>
                          <Icon className={`h-5 w-5 ${integration.iconColor}`} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{integration.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{integration.description}</p>
        </div>
      </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                      <Check className="h-3 w-3" />
                      <span>Connected</span>
                </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => integration.serviceName && handleDisconnect(integration.serviceName)}
                      disabled={disconnectingService === integration.serviceName}
                      className="h-7 px-2 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      {disconnectingService === integration.serviceName ? (
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
      </div>

      <div className="mb-6 flex items-center justify-between">
      <div>
          <h2 className="text-xl font-semibold text-foreground">
            Discover Integrations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Popular integrations you can connect in seconds
          </p>
        </div>
        <div className="flex-shrink-0">
          <SearchComponent value={searchQuery} onChange={setSearchQuery} placeholder="Search integrations..." />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {availableIntegrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <div
              key={integration.id}
              className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-4 transition-all duration-300 text-foreground hover:shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  {integration.slug ? (
                    <div className="p-1.5">
                      <img 
                        src={getLogoUrl(integration.slug)} 
                        alt={integration.name} 
                        className={`h-6 w-6 object-contain ${
                          !usesBrandfetch(integration.slug) && darkLogos.includes(integration.slug) ? 'dark:brightness-0 dark:invert' : ''
                        } ${
                          !usesBrandfetch(integration.slug) && lightModeBlackLogos.includes(integration.slug) ? 'brightness-0' : ''
                        }`} 
                      />
                  </div>
                  ) : (
                    <div className={`rounded-md bg-gradient-to-br ${integration.gradient} p-2`}>
                      <Icon className={`h-5 w-5 ${integration.iconColor}`} />
                  </div>
                  )}
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{integration.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{integration.description}</p>
                </div>
              </div>
              
              <div className="mt-3">
                {integration.serviceName && isIntegrationConnected(integration.serviceName) ? (
                  <Button
                    variant="ghost"
                    disabled
                    className="w-full justify-center backdrop-blur-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400 text-xs py-1.5 h-auto cursor-not-allowed"
                  >
                    <Check className="h-3 w-3 mr-1.5" />
                    Connected
                  </Button>
                ) : integration.serviceName ? (
                <Button
                    variant="ghost"
                    onClick={() => integration.serviceName && handleConnect(integration.serviceName)}
                    className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground text-xs py-1.5 h-auto"
                  >
                    <Plug className="h-3 w-3 mr-1.5" />
                    Connect
                </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedIntegrationName(integration.name);
                      setComingSoonDialogOpen(true);
                    }}
                    className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground text-xs py-1.5 h-auto"
                  >
                    <Clock className="h-3 w-3 mr-1.5" />
                    Coming Soon
                  </Button>
                )}
              </div>
            </div>
          );
        })}
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
    </>
  );
}
