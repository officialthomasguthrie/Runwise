/**
 * Integration Connection Schemas
 * Defines field configurations for each integration's connection modal
 */

import type { IntegrationConnectionConfig } from '@/components/ui/connect-integration-modal';

// Helper to get logo URL for an integration
const getLogoUrl = (slug: string, isDark: boolean = false): string => {
  const clientId = '1dxbfHSJFAPEGdCLU4o5B';
  const brandfetchLogos: Record<string, { light?: string; dark?: string }> = {
    'openai': {
      light: `https://cdn.brandfetch.io/idR3duQxYl/theme/dark/symbol.svg?c=${clientId}`,
      dark: `https://cdn.brandfetch.io/idR3duQxYl/w/800/h/800/theme/light/symbol.png?c=${clientId}`
    },
    'sendgrid': {
      dark: `https://cdn.brandfetch.io/idHHcfw5Qu/theme/dark/symbol.svg?c=${clientId}`
    },
    'twilio': {
      dark: `https://cdn.brandfetch.io/idT7wVo_zL/theme/dark/symbol.svg?c=${clientId}`
    },
    'discord': {
      dark: `https://cdn.brandfetch.io/idM8Hlme1a/theme/dark/symbol.svg?c=${clientId}`
    },
    'stripe': {
      dark: `https://cdn.brandfetch.io/idxAg10C0L/w/480/h/480/theme/dark/icon.jpeg?c=${clientId}`
    },
    'twitter': {
      light: `https://cdn.brandfetch.io/idS5WhqBbM/theme/dark/logo.svg?c=${clientId}`,
      dark: `https://cdn.brandfetch.io/idS5WhqBbM/theme/light/logo.svg?c=${clientId}`
    }
  };
  
  const logoConfig = brandfetchLogos[slug];
  if (logoConfig) {
    if (isDark && logoConfig.dark) return logoConfig.dark;
    if (!isDark && logoConfig.light) return logoConfig.light;
    if (logoConfig.dark) return logoConfig.dark;
  }
  return '';
};

export function getOpenAIConnectionConfig(
  onConnect: (values: Record<string, string>) => Promise<void>,
  onCancel?: () => void
): Omit<IntegrationConnectionConfig, 'logoUrl'> {
  return {
    integrationName: 'openai',
    integrationDisplayName: 'ChatGPT (OpenAI)',
    description: 'Create an API key and paste the key below (keys start with sk-). If you get an error, you may have reached your OpenAI usage limits. To view your usage, check your [OpenAI billing settings](https://platform.openai.com/account/billing).',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        helperText: 'Create an API key and paste the key below (keys start with sk-). If you get an error, you may have reached your OpenAI usage limits. To view your usage, check your [OpenAI billing settings](https://platform.openai.com/account/billing).'
      },
      {
        key: 'organizationId',
        label: 'Organization ID',
        type: 'text',
        required: false,
        placeholder: 'Optional',
        helperText: 'If your OpenAI account belongs to multiple organizations, optionally add the Organization ID that this connection should use. If left blank, your default organization will be used. Learn more about [Organization ID](https://platform.openai.com/docs/api-reference/organizations-optional).'
      },
      {
        key: 'region',
        label: 'Region',
        type: 'select',
        required: true,
        options: [
          { value: 'global', label: 'Global (Default)' },
          { value: 'us', label: 'US' },
          { value: 'eu', label: 'EU' }
        ],
        defaultValue: 'global',
        helperText: 'Select your OpenAI data residency region. Choose "Global" for standard OpenAI accounts. If your organization has [data residency requirements](https://platform.openai.com/docs/guides/data-residency), select the appropriate region (US or EU). This will use region-specific endpoints like us.api.openai.com or eu.api.openai.com.'
      }
    ],
    onConnect,
    onCancel
  };
}

export function getSendGridConnectionConfig(
  onConnect: (values: Record<string, string>) => Promise<void>,
  onCancel?: () => void
): Omit<IntegrationConnectionConfig, 'logoUrl'> {
  return {
    integrationName: 'sendgrid',
    integrationDisplayName: 'SendGrid',
    description: 'Enter your SendGrid API key to connect your account. API keys start with SG. and can be created in your [SendGrid API Keys settings](https://app.sendgrid.com/settings/api_keys).',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'SG....',
        helperText: 'Enter your SendGrid API key. Create one in your [SendGrid API Keys settings](https://app.sendgrid.com/settings/api_keys).'
      }
    ],
    onConnect,
    onCancel
  };
}

export function getTwilioConnectionConfig(
  onConnect: (values: Record<string, string>) => Promise<void>,
  onCancel?: () => void
): Omit<IntegrationConnectionConfig, 'logoUrl'> {
  return {
    integrationName: 'twilio',
    integrationDisplayName: 'Twilio',
    description: 'Enter your Twilio Account SID and Auth Token to connect your account. You can find these in your [Twilio Console](https://console.twilio.com/).',
    fields: [
      {
        key: 'accountSid',
        label: 'Account SID',
        type: 'text',
        required: true,
        placeholder: 'AC...',
        helperText: 'Your Twilio Account SID (starts with AC). Find it in your [Twilio Console](https://console.twilio.com/).'
      },
      {
        key: 'authToken',
        label: 'Auth Token',
        type: 'password',
        required: true,
        placeholder: 'Enter your Auth Token',
        helperText: 'Your Twilio Auth Token. Find it in your [Twilio Console](https://console.twilio.com/). Click "Show" to reveal it.'
      }
    ],
    onConnect,
    onCancel
  };
}

export function getDiscordConnectionConfig(
  onConnect: (values: Record<string, string>) => Promise<void>,
  onCancel?: () => void
): Omit<IntegrationConnectionConfig, 'logoUrl'> {
  return {
    integrationName: 'discord',
    integrationDisplayName: 'Discord',
    description: 'Enter your Discord bot token to connect your account. Create a bot and get your token in the [Discord Developer Portal](https://discord.com/developers/applications).',
    fields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        required: true,
        placeholder: 'MTIzNDU2Nzg5MDEyMzQ1Njc4OTA.Xxxxxx...',
        helperText: 'Your Discord bot token. Create a bot in the [Discord Developer Portal](https://discord.com/developers/applications) and copy the token from the Bot section.'
      }
    ],
    onConnect,
    onCancel
  };
}

export function getStripeConnectionConfig(
  onConnect: (values: Record<string, string>) => Promise<void>,
  onCancel?: () => void
): Omit<IntegrationConnectionConfig, 'logoUrl'> {
  return {
    integrationName: 'stripe',
    integrationDisplayName: 'Stripe',
    description: 'Enter your Stripe Secret Key to connect your account. You can find your API keys in your [Stripe Dashboard](https://dashboard.stripe.com/apikeys).',
    fields: [
      {
        key: 'secretKey',
        label: 'Secret Key',
        type: 'password',
        required: true,
        placeholder: 'sk_live_... or sk_test_...',
        helperText: 'Your Stripe Secret Key (starts with sk_live_ or sk_test_). Find it in your [Stripe Dashboard](https://dashboard.stripe.com/apikeys).'
      }
    ],
    onConnect,
    onCancel
  };
}

export function getTwitterConnectionConfig(
  onConnect: (values: Record<string, string>) => Promise<void>,
  onCancel?: () => void
): Omit<IntegrationConnectionConfig, 'logoUrl'> {
  return {
    integrationName: 'twitter',
    integrationDisplayName: 'Twitter (X)',
    description: 'Enter your Twitter Bearer Token to connect your account. Create one in the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard).',
    fields: [
      {
        key: 'bearerToken',
        label: 'Bearer Token',
        type: 'password',
        required: true,
        placeholder: 'AAAAAAAAAAAAAAAAAAAAA...',
        helperText: 'Your Twitter Bearer Token. Create one in the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard).'
      }
    ],
    onConnect,
    onCancel
  };
}

// Helper to get full config with logo
export function getConnectionConfig(
  serviceName: string,
  onConnect: (values: Record<string, string>) => Promise<void>,
  onCancel?: () => void,
  isDark: boolean = false
): IntegrationConnectionConfig | null {
  let baseConfig: Omit<IntegrationConnectionConfig, 'logoUrl'> | null = null;
  
  switch (serviceName) {
    case 'openai':
      baseConfig = getOpenAIConnectionConfig(onConnect, onCancel);
      break;
    case 'sendgrid':
      baseConfig = getSendGridConnectionConfig(onConnect, onCancel);
      break;
    case 'twilio':
      baseConfig = getTwilioConnectionConfig(onConnect, onCancel);
      break;
    case 'discord':
      baseConfig = getDiscordConnectionConfig(onConnect, onCancel);
      break;
    case 'stripe':
      baseConfig = getStripeConnectionConfig(onConnect, onCancel);
      break;
    case 'twitter':
      baseConfig = getTwitterConnectionConfig(onConnect, onCancel);
      break;
    default:
      return null;
  }
  
  if (!baseConfig) return null;
  
  return {
    ...baseConfig,
    logoUrl: getLogoUrl(serviceName, isDark)
  };
}

